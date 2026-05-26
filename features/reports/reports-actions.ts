import "server-only";

/**
 * Report write path. Called from `submitDraftAction` — not exposed
 * directly to clients.
 *
 * `'use server'` is intentionally omitted: these are server-only
 * helpers, not action endpoints. Marking them as actions would expose
 * them to direct POST without going through draft validation.
 */

import { updateTag } from "next/cache";
import {
  newReportId,
  putPrivate,
} from "@/lib/blob/blob-client";
import type { Report } from "@/lib/payload";
import { reportToMarkdown } from "@/lib/report-to-markdown";
import { REPORTS_TAG } from "./reports-queries";

export async function promoteDraftToReport(report: Report): Promise<string> {
  const now = new Date();
  const yyyyMm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const reportId = newReportId();
  const markdown = reportToMarkdown(report, now.toISOString());
  const url = await putPrivate(
    `reports/${yyyyMm}/${reportId}.md`,
    markdown,
    "text/markdown; charset=utf-8",
  );
  // Also write the structured payload so triage UIs don't have to parse
  // the markdown back. Markdown is for humans; JSON is for tools.
  await putPrivate(
    `reports/${yyyyMm}/${reportId}.json`,
    JSON.stringify({ received_at: now.toISOString(), report }),
    "application/json",
  );
  updateTag(REPORTS_TAG);
  return url;
}
