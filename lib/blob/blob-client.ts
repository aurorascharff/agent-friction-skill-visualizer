import "server-only";

/**
 * Low-level Vercel Blob primitives shared across feature folders.
 *
 * Layout:
 *   drafts/<id>.json                — agent-posted drafts, 10-min TTL
 *   reports/<yyyy-mm>/<id>.md       — promoted reports, durable
 *
 * All blobs are written with `access: "private"` so they are NOT readable
 * via direct URL. Reads go through the @vercel/blob `get()` API which
 * authenticates with BLOB_READ_WRITE_TOKEN.
 *
 * INGEST_SECRET is used to HMAC-sign draft ids so `?draft=…` URLs can't
 * be forged by clients.
 */

import { put, get, del, list } from "@vercel/blob";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const DRAFT_TTL_MS = 10 * 60 * 1000;

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

export async function readPrivateText(pathname: string): Promise<string | null> {
  const result = await get(pathname, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream).text();
}

export async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  const text = await readPrivateText(pathname);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function putPrivate(
  pathname: string,
  body: string,
  contentType: string,
): Promise<string> {
  const { url } = await put(pathname, body, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return url;
}

export async function delQuiet(pathname: string): Promise<void> {
  try {
    await del(pathname);
  } catch {
    /* already gone */
  }
}

export async function listAll(prefix: string) {
  const blobs: Array<{ pathname: string; uploadedAt: Date; size: number }> = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    for (const blob of page.blobs) {
      blobs.push({
        pathname: blob.pathname,
        uploadedAt:
          blob.uploadedAt instanceof Date
            ? blob.uploadedAt
            : new Date(String(blob.uploadedAt)),
        size: blob.size,
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

export function newReportId(): string {
  return randomBytes(12).toString("base64url");
}
