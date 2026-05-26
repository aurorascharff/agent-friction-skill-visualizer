/**
 * POST /api/submit
 *
 * Promotes a draft into a stored report. Called by the in-browser
 * Submit button on /submit?draft=<id> — never by the agent directly.
 *
 * Auth:
 *   - Same-origin check (Origin header must match this host). Blocks
 *     drive-by cross-site submits.
 *   - Signed draft id, verified server-side. Single-use: the draft is
 *     deleted on successful promotion.
 *   - No additional credentials — the human's act of opening /submit
 *     and clicking the button IS the authorization.
 */

import { NextResponse, type NextRequest } from "next/server";
import { deleteDraft, promoteDraftToReport, readDraft } from "@/lib/blob";

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { draft_id?: unknown };
  try {
    body = (await req.json()) as { draft_id?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const draftId = body.draft_id;
  if (typeof draftId !== "string" || draftId.length === 0) {
    return NextResponse.json({ error: "missing_draft_id" }, { status: 400 });
  }

  const report = await readDraft(draftId);
  if (!report) {
    return NextResponse.json(
      { error: "draft_not_found_or_expired" },
      { status: 404 },
    );
  }

  let storedUrl: string;
  try {
    storedUrl = await promoteDraftToReport(report);
  } catch (err) {
    console.error("promote_failed", err);
    return NextResponse.json({ error: "promote_failed" }, { status: 500 });
  }

  await deleteDraft(draftId);

  return NextResponse.json({ ok: true, stored: storedUrl });
}
