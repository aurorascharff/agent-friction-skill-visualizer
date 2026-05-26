/**
 * Vercel Blob storage helpers for friction reports.
 *
 * Layout:
 *   drafts/<id>.json                — agent-posted draft awaiting human approval (random access by id)
 *   reports/<yyyy-mm>/<id>.json     — promoted report, partitioned by month
 *
 * Drafts are short-lived (10 min TTL, checked on read). Promoted reports
 * are append-only; deletion is a manual operation against the Blob store.
 *
 * The only credential is BLOB_READ_WRITE_TOKEN, set as a Vercel env var.
 * INGEST_SECRET is used to HMAC-sign draft ids so that `?draft=…` URLs
 * can't be forged by clients.
 */

import { put, head, del } from "@vercel/blob";
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
      access: "public",
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
  let blob;
  try {
    blob = await head(`drafts/${rawId}.json`);
  } catch {
    return null;
  }
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  const envelope = (await res.json()) as DraftEnvelope;
  if (Date.now() - envelope.created_at > DRAFT_TTL_MS) {
    // Best-effort cleanup; ignore failure.
    void del(blob.url);
    return null;
  }
  return envelope.report;
}

export async function deleteDraft(signedId: string): Promise<void> {
  const rawId = verifyDraftId(signedId);
  if (!rawId) return;
  try {
    const blob = await head(`drafts/${rawId}.json`);
    await del(blob.url);
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
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
    },
  );
  return url;
}
