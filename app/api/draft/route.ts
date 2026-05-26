/**
 * POST /api/draft
 *
 * The passive friction-log skill calls this from the agent process at
 * end-of-task with a JSON-encoded `Report`. The route validates the
 * payload, allocates a signed draft id, writes it to Blob storage, and
 * returns the URL the agent should open in the headed agent-browser.
 *
 * No long-term credentials are returned to the caller — the signed
 * draft id is single-use and expires after 10 minutes.
 */

import { NextResponse, type NextRequest } from "next/server";
import { ReportSchema } from "@/lib/payload";
import { newSignedDraftId, writeDraft } from "@/lib/blob";

export const runtime = "nodejs";

// In-memory token bucket per remote IP. Resets on cold start; that's
// fine for v0 — burst protection only.
const BUCKET = new Map<string, { tokens: number; updatedAt: number }>();
const RATE = { capacity: 5, refillPerMs: 5 / (60 * 1000) }; // 5 drafts / min

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const prev = BUCKET.get(ip) ?? { tokens: RATE.capacity, updatedAt: now };
  const elapsed = now - prev.updatedAt;
  const tokens = Math.min(
    RATE.capacity,
    prev.tokens + elapsed * RATE.refillPerMs,
  );
  if (tokens < 1) {
    BUCKET.set(ip, { tokens, updatedAt: now });
    return false;
  }
  BUCKET.set(ip, { tokens: tokens - 1, updatedAt: now });
  return true;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: 60 },
      { status: 429 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "expected_application_json" },
      { status: 415 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        issues: parsed.error.issues.slice(0, 10),
      },
      { status: 400 },
    );
  }

  const draftId = newSignedDraftId();
  try {
    await writeDraft(draftId, parsed.data);
  } catch (err) {
    console.error("draft_write_failed", err);
    return NextResponse.json(
      { error: "draft_write_failed" },
      { status: 500 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    `https://${req.headers.get("host") ?? "agent-friction-skill.vercel.app"}`;

  return NextResponse.json({
    draft_id: draftId,
    review_url: `${origin}/submit?draft=${encodeURIComponent(draftId)}`,
    expires_in_seconds: 10 * 60,
  });
}
