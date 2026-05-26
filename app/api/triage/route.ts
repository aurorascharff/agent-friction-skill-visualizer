/**
 * GET /api/triage
 *
 * Returns the flat list of every friction point across every stored
 * report. Bearer-token gated, same shape as /api/reports. Consumed by
 * the DX Agent triage page.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAggregatedPoints } from "@/features/reports/reports-queries";

function getApiToken(): string {
  const t = process.env.REPORTS_API_TOKEN;
  if (!t || t.length < 16) {
    throw new Error(
      "REPORTS_API_TOKEN env var is missing or too short (need >= 16 chars).",
    );
  }
  return t;
}

function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization");
  if (!header) return false;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const provided = match[1]!;
  let expected: string;
  try {
    expected = getApiToken();
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const points = await getAggregatedPoints();
    return NextResponse.json({ points });
  } catch (err) {
    console.error("triage_list_failed", err);
    return NextResponse.json(
      { error: "triage_list_failed" },
      { status: 500 },
    );
  }
}
