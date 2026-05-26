import "server-only";

/**
 * Report queries.
 *
 * Reports are durable, append-only. Listing is cached with a tag so it
 * can be invalidated by `promoteDraftToReport`. Markdown bodies are also
 * cached — a stored report's contents never change.
 *
 * `cache()` wraps both for per-request dedup.
 */

import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { listAll, readPrivateText } from "@/lib/blob/blob-client";

export const REPORTS_TAG = "friction-reports";

export type ReportListItem = {
  /** Path-relative id, e.g. "2026-05/AbCdEfGh.md". */
  id: string;
  uploadedAt: string;
  size: number;
};

async function listReportsImpl(): Promise<ReportListItem[]> {
  "use cache";
  cacheTag(REPORTS_TAG);
  cacheLife({ stale: 30, revalidate: 60 });

  const blobs = await listAll("reports/");
  const items: ReportListItem[] = [];
  for (const blob of blobs) {
    if (!blob.pathname.endsWith(".md")) continue;
    items.push({
      id: blob.pathname.slice("reports/".length),
      uploadedAt: blob.uploadedAt.toISOString(),
      size: blob.size,
    });
  }
  items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  return items;
}

export const getReports = cache(listReportsImpl);

async function getReportMarkdownImpl(id: string): Promise<string | null> {
  "use cache";
  cacheTag(REPORTS_TAG);
  cacheLife({ stale: 60 * 60, revalidate: 24 * 60 * 60 });

  // Reject anything that doesn't match the layout we write.
  if (!/^[0-9]{4}-[0-9]{2}\/[A-Za-z0-9_-]+\.md$/.test(id)) return null;
  return readPrivateText(`reports/${id}`);
}

export const getReportMarkdown = cache(getReportMarkdownImpl);
