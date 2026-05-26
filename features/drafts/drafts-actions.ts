"use server";

/**
 * Server actions for the human-gated submission flow.
 *
 * No auth check here in the traditional sense — the human's act of
 * opening /submit?draft=<id> in their browser, reviewing the report,
 * and clicking the button IS the authorization. The signed draft id
 * (verified by HMAC inside `getDraftById`) is the capability token.
 *
 * Server actions are reachable via POST anyway, so we still validate
 * the draft id at the boundary.
 */

import { deleteDraftById, getDraftById } from "./drafts-queries";
import { promoteDraftToReport } from "@/features/reports/reports-actions";

type SubmitResult =
  | { ok: true; reportUrl: string }
  | { ok: false; error: string };

export async function submitDraftAction(
  signedDraftId: string,
): Promise<SubmitResult> {
  if (typeof signedDraftId !== "string" || signedDraftId.length === 0) {
    return { ok: false, error: "missing_draft_id" };
  }

  const draft = await getDraftById(signedDraftId);
  if (!draft) {
    return { ok: false, error: "draft_not_found_or_expired" };
  }

  let reportUrl: string;
  try {
    reportUrl = await promoteDraftToReport(draft.report);
  } catch (err) {
    console.error("promote_failed", err);
    return { ok: false, error: "promote_failed" };
  }

  await deleteDraftById(signedDraftId);

  return { ok: true, reportUrl };
}

export async function discardDraftAction(
  signedDraftId: string,
): Promise<{ ok: true }> {
  if (typeof signedDraftId === "string" && signedDraftId.length > 0) {
    await deleteDraftById(signedDraftId);
  }
  return { ok: true };
}
