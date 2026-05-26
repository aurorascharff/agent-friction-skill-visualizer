import "server-only";

/**
 * Draft queries.
 *
 * Drafts are short-lived (10-minute TTL) and uniquely-addressed by a
 * signed id. They are NOT cached with `'use cache'` because:
 *   1. There's no concurrent re-read across a single request.
 *   2. The TTL check needs the current wall clock.
 *   3. Successful submission deletes the draft; caching would risk
 *      serving a stale "deleted draft" envelope.
 *
 * `cache()` is still used for per-request dedup (e.g. a layout + page
 * both calling `getDraftById`).
 */

import { cache } from "react";
import {
  DRAFT_TTL_MS,
  delQuiet,
  newSignedDraftId,
  putPrivate,
  readPrivateJson,
  verifyDraftId,
} from "@/lib/blob/blob-client";
import type { Report } from "@/lib/payload";

type DraftEnvelope = {
  created_at: number;
  report: Report;
};

export type Draft = {
  id: string;
  report: Report;
  createdAt: number;
};

function pathFor(rawId: string): string {
  return `drafts/${rawId}.json`;
}

/** Read a draft by its signed id; returns null if missing/expired/forged. */
export const getDraftById = cache(
  async (signedId: string): Promise<Draft | null> => {
    const rawId = verifyDraftId(signedId);
    if (!rawId) return null;
    const envelope = await readPrivateJson<DraftEnvelope>(pathFor(rawId));
    if (!envelope) return null;
    if (Date.now() - envelope.created_at > DRAFT_TTL_MS) {
      void delQuiet(pathFor(rawId));
      return null;
    }
    return {
      id: signedId,
      report: envelope.report,
      createdAt: envelope.created_at,
    };
  },
);

/**
 * Create a draft. Returns the new signed id.
 * Called from the unauthenticated /api/draft ingest endpoint.
 */
export async function createDraft(report: Report): Promise<string> {
  const signedId = newSignedDraftId();
  const rawId = verifyDraftId(signedId);
  if (!rawId) throw new Error("internal: just-minted draft id failed verify");
  const envelope: DraftEnvelope = {
    created_at: Date.now(),
    report,
  };
  await putPrivate(
    pathFor(rawId),
    JSON.stringify(envelope),
    "application/json",
  );
  return signedId;
}

/** Delete a draft. Best-effort. */
export async function deleteDraftById(signedId: string): Promise<void> {
  const rawId = verifyDraftId(signedId);
  if (!rawId) return;
  await delQuiet(pathFor(rawId));
}
