/**
 * GET /api/reports
 *
 * Lists all stored friction reports (lightweight metadata only — no markdown
 * bodies). Service-to-service endpoint gated by a bearer token shared with
 * trusted callers (e.g. the DX Agent dashboard).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getReports } from "@/features/reports/reports-queries";

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
  // Constant-time compare against env value.
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
    const reports = await getReports();
    return NextResponse.json({ reports });
  } catch (err) {
    console.error("list_reports_failed", err);
    return NextResponse.json(
      { error: "list_reports_failed" },
      { status: 500 },
    );
  }
}
