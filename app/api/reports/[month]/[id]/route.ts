/**
 * GET /api/reports/[month]/[id]
 *
 * Returns the markdown body of a single stored friction report.
 * Bearer-token gated, same shape as /api/reports.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getReportMarkdown } from "@/features/reports/reports-queries";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ month: string; id: string }> },
) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { month, id } = await params;
  const markdown = await getReportMarkdown(`${month}/${id}.md`);
  if (markdown === null) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
