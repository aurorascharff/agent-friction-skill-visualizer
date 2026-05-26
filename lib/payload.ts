/**
 * Friction-report payload schema.
 *
 * This is the contract the passive agent skill submits against. It is
 * intentionally narrow — there is no field for raw user prompts, no
 * field for absolute file paths, no field for code snippets longer
 * than a single line. If a future feature needs more context, it
 * should be added here explicitly so the privacy surface is auditable
 * from this one file.
 *
 * Zod is configured with `.strict()` at the top-level objects so an
 * accidental extra key from the skill is rejected, not silently
 * forwarded into Blob storage.
 */

import { z } from "zod";

export const SEVERITY = ["green", "yellow", "red"] as const;
export const SOURCE_TAG = [
  "agents.md",
  "docs",
  "url",
  "web search",
  "training data",
  "error output",
  "sandbox",
  "skill",
] as const;

export const FrictionPointSchema = z
  .object({
    severity: z.enum(SEVERITY),
    title: z.string().min(1).max(200),
    expected: z.string().max(500).optional(),
    actual: z.string().max(500).optional(),
    resolution: z.string().max(500).optional(),
    source_tag: z.enum(SOURCE_TAG),
    // A single redacted line of context (e.g. an error message). Not a
    // full snippet — passive collection does not ship code.
    redacted_snippet: z.string().max(200).optional(),
    // What kind of file the friction occurred near, NOT the path.
    // Examples: "next.config", "route handler", "middleware", "package.json".
    file_kind: z.string().max(60).optional(),
  })
  .strict();

export const ActionItemSchema = z
  .object({
    bucket: z.enum(["docs", "framework", "research"]),
    title: z.string().min(1).max(300),
    context: z.string().min(1).max(600),
  })
  .strict();

export const ReportSchema = z
  .object({
    schema_version: z.literal(1),
    framework: z.string().min(1).max(60),
    framework_version: z.string().min(1).max(60),
    scaffold_flags: z.array(z.string().max(40)).max(40).optional(),
    friction_points: z.array(FrictionPointSchema).max(50),
    action_items: z.array(ActionItemSchema).max(50),
    build_count: z.number().int().min(0).max(100).optional(),
    cumulative_build_ms: z.number().int().min(0).max(60 * 60 * 1000).optional(),
    summary: z.string().min(1).max(1000),
    // Free-form model/harness labels for grouping; no user identifier.
    model: z.string().max(60).optional(),
    harness: z.string().max(60).optional(),
  })
  .strict();

export type Report = z.infer<typeof ReportSchema>;
export type FrictionPoint = z.infer<typeof FrictionPointSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;

/** Highest severity present in the report — used for storage partitioning. */
export function severityMax(report: Report): "green" | "yellow" | "red" {
  let max: "green" | "yellow" | "red" = "green";
  for (const fp of report.friction_points) {
    if (fp.severity === "red") return "red";
    if (fp.severity === "yellow" && max === "green") max = "yellow";
  }
  return max;
}
