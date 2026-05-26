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
import { listAll, readPrivateJson, readPrivateText } from "@/lib/blob/blob-client";
import type { Report } from "@/lib/payload";

export const REPORTS_TAG = "friction-reports";

export type ReportListItem = {
  /** Path-relative id, e.g. "2026-05/AbCdEfGh.md". */
  id: string;
  uploadedAt: string;
  size: number;
};

type ReportEnvelope = {
  received_at: string;
  report: Report;
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

/**
 * Rich per-report list item — joins the .md list with the .json envelope
 * so consumers don't have to fetch each report individually to show a
 * preview line.
 */
export type EnrichedReportListItem = ReportListItem & {
  summary?: string;
  framework?: string;
  frameworkVersion?: string;
  severityCounts: { red: number; yellow: number; green: number };
  pointCount: number;
};

async function listEnrichedReportsImpl(): Promise<EnrichedReportListItem[]> {
  "use cache";
  cacheTag(REPORTS_TAG);
  cacheLife({ stale: 30, revalidate: 60 });

  const blobs = await listAll("reports/");
  // Group by id (strip extension) so md + json pair up.
  const byId = new Map<
    string,
    { uploadedAt: string; size: number; hasJson: boolean }
  >();
  for (const blob of blobs) {
    const isMd = blob.pathname.endsWith(".md");
    const isJson = blob.pathname.endsWith(".json");
    if (!isMd && !isJson) continue;
    const idWithExt = blob.pathname.slice("reports/".length);
    const id = isMd ? idWithExt : idWithExt.replace(/\.json$/, ".md");
    const existing = byId.get(id);
    if (existing) {
      if (isJson) existing.hasJson = true;
      // prefer the .md's metadata for size and uploadedAt
      if (isMd) {
        existing.size = blob.size;
        existing.uploadedAt = blob.uploadedAt.toISOString();
      }
    } else {
      byId.set(id, {
        uploadedAt: blob.uploadedAt.toISOString(),
        size: blob.size,
        hasJson: isJson,
      });
    }
  }

  const ids = Array.from(byId.entries()).map(([id, meta]) => ({ id, ...meta }));

  // Fetch JSON envelopes in parallel for everything that has one.
  const envelopes = await Promise.all(
    ids.map(async (meta) => {
      if (!meta.hasJson) return { ...meta, env: null };
      const env = await getReportJsonImpl(
        meta.id.replace(/\.md$/, ""),
      );
      return { ...meta, env };
    }),
  );

  const items: EnrichedReportListItem[] = envelopes.map(
    ({ id, uploadedAt, size, env }) => {
      const counts = { red: 0, yellow: 0, green: 0 };
      if (env) {
        for (const fp of env.report.friction_points) counts[fp.severity]++;
      }
      return {
        id,
        uploadedAt,
        size,
        summary: env?.report.summary,
        framework: env?.report.framework,
        frameworkVersion: env?.report.framework_version,
        severityCounts: counts,
        pointCount: env?.report.friction_points.length ?? 0,
      };
    },
  );

  items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  return items;
}

export const getEnrichedReports = cache(listEnrichedReportsImpl);

async function getReportMarkdownImpl(id: string): Promise<string | null> {
  "use cache";
  cacheTag(REPORTS_TAG);
  cacheLife({ stale: 60 * 60, revalidate: 24 * 60 * 60 });

  // Reject anything that doesn't match the layout we write.
  if (!/^[0-9]{4}-[0-9]{2}\/[A-Za-z0-9_-]+\.md$/.test(id)) return null;
  return readPrivateText(`reports/${id}`);
}

export const getReportMarkdown = cache(getReportMarkdownImpl);

async function getReportJsonImpl(
  id: string,
): Promise<ReportEnvelope | null> {
  "use cache";
  cacheTag(REPORTS_TAG);
  cacheLife({ stale: 60 * 60, revalidate: 24 * 60 * 60 });

  // id matches "2026-05/<rest>" — no extension on input.
  if (!/^[0-9]{4}-[0-9]{2}\/[A-Za-z0-9_-]+$/.test(id)) return null;
  return readPrivateJson<ReportEnvelope>(`reports/${id}.json`);
}

export const getReportJson = cache(getReportJsonImpl);

/**
 * Aggregated friction points across every stored report. Used by triage
 * UIs that need a flat row-per-point view rather than per-report.
 *
 * One Blob list + N JSON reads. Cached with the REPORTS_TAG so it
 * invalidates on submission alongside the others.
 */
export type AggregatedPoint = {
  /** "<month>/<id>" — the slug used to link back to the report. */
  reportId: string;
  /** Index within the report's friction_points array. */
  index: number;
  /** ISO date string from the report envelope. */
  receivedAt: string;
  framework: string;
  frameworkVersion: string;
  severity: "red" | "yellow" | "green";
  title: string;
  expected?: string;
  actual?: string;
  resolution?: string;
  sourceTag: string;
  fileKind?: string;
};

async function getAggregatedPointsImpl(): Promise<AggregatedPoint[]> {
  "use cache";
  cacheTag(REPORTS_TAG);
  cacheLife({ stale: 30, revalidate: 60 });

  const blobs = await listAll("reports/");
  const jsonIds: string[] = [];
  for (const blob of blobs) {
    if (!blob.pathname.endsWith(".json")) continue;
    // strip "reports/" and ".json"
    const rest = blob.pathname.slice("reports/".length, -".json".length);
    jsonIds.push(rest);
  }

  const envelopes = await Promise.all(
    jsonIds.map(async (id) => ({ id, env: await getReportJsonImpl(id) })),
  );

  const points: AggregatedPoint[] = [];
  for (const { id, env } of envelopes) {
    if (!env) continue;
    env.report.friction_points.forEach((fp, index) => {
      points.push({
        reportId: id,
        index,
        receivedAt: env.received_at,
        framework: env.report.framework,
        frameworkVersion: env.report.framework_version,
        severity: fp.severity,
        title: fp.title,
        expected: fp.expected,
        actual: fp.actual,
        resolution: fp.resolution,
        sourceTag: fp.source_tag,
        fileKind: fp.file_kind,
      });
    });
  }

  // Severity first (red > yellow > green), then newest within.
  const severityRank: Record<"red" | "yellow" | "green", number> = {
    red: 0,
    yellow: 1,
    green: 2,
  };
  points.sort((a, b) => {
    const s = severityRank[a.severity] - severityRank[b.severity];
    if (s !== 0) return s;
    return a.receivedAt < b.receivedAt ? 1 : -1;
  });
  return points;
}

export const getAggregatedPoints = cache(getAggregatedPointsImpl);

