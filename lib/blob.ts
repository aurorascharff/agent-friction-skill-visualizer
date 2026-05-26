/**
 * Vercel Blob storage helpers for friction reports.
 *
 * Layout:
 *   drafts/<id>.json                — agent-posted draft awaiting human approval (random access by id)
 *   reports/<yyyy-mm>/<id>.json     — promoted report, partitioned by month
 *
 * All blobs are written with `access: "private"` so they are NOT readable
 * via direct URL. Reads go through the @vercel/blob `get()` API which
 * authenticates with BLOB_READ_WRITE_TOKEN. This is what gives us the
 * "your code doesn't leak" governance story: even if a draft URL ends
 * up in a log, the underlying blob can't be fetched without the token.
 *
 * Drafts are short-lived (10 min TTL, checked on read). Promoted reports
 * are append-only; deletion is a manual operation against the Blob store.
 *
 * INGEST_SECRET is used to HMAC-sign draft ids so that `?draft=…` URLs
 * can't be forged by clients.
 */

import { put, get, del } from "@vercel/blob";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Report } from "./payload";

const DRAFT_TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.INGEST_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "INGEST_SECRET env var is missing or too short (need >= 16 chars).",
    );
  }
  return secret;
}

function signDraftId(rawId: string): string {
  const mac = createHmac("sha256", getSecret())
    .update(rawId)
    .digest("base64url")
    .slice(0, 16);
  return `${rawId}.${mac}`;
}

export function verifyDraftId(signedId: string): string | null {
  const dot = signedId.lastIndexOf(".");
  if (dot < 1) return null;
  const rawId = signedId.slice(0, dot);
  const provided = signedId.slice(dot + 1);
  const expected = createHmac("sha256", getSecret())
    .update(rawId)
    .digest("base64url")
    .slice(0, 16);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return rawId;
}

export function newSignedDraftId(): string {
  return signDraftId(randomBytes(12).toString("base64url"));
}

type DraftEnvelope = {
  created_at: number;
  report: Report;
};

async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeDraft(
  signedId: string,
  report: Report,
): Promise<string> {
  const rawId = verifyDraftId(signedId);
  if (!rawId) throw new Error("invalid draft id");
  const envelope: DraftEnvelope = {
    created_at: Date.now(),
    report,
  };
  const { url } = await put(
    `drafts/${rawId}.json`,
    JSON.stringify(envelope),
    {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
    },
  );
  return url;
}

export async function readDraft(signedId: string): Promise<Report | null> {
  const rawId = verifyDraftId(signedId);
  if (!rawId) return null;
  const envelope = await readPrivateJson<DraftEnvelope>(`drafts/${rawId}.json`);
  if (!envelope) return null;
  if (Date.now() - envelope.created_at > DRAFT_TTL_MS) {
    // Best-effort cleanup; ignore failure.
    void del(`drafts/${rawId}.json`);
    return null;
  }
  return envelope.report;
}

export async function deleteDraft(signedId: string): Promise<void> {
  const rawId = verifyDraftId(signedId);
  if (!rawId) return;
  try {
    await del(`drafts/${rawId}.json`);
  } catch {
    /* already gone */
  }
}

export async function promoteDraftToReport(report: Report): Promise<string> {
  const now = new Date();
  const yyyyMm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const reportId = randomBytes(12).toString("base64url");
  const { url } = await put(
    `reports/${yyyyMm}/${reportId}.json`,
    JSON.stringify({
      received_at: now.toISOString(),
      report,
    }),
    {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
    },
  );
  return url;
}
