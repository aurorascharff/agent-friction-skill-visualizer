/**
 * Convert a structured friction `Report` into the same markdown format
 * the active `friction-log` skill produces. This is the shape stored
 * in Blob (and recognized by /view#log=…), so a human can open the
 * blob directly and read it without any tooling.
 */

import type { Report } from "./payload";

const SEVERITY_EMOJI: Record<"red" | "yellow" | "green", string> = {
  red: "🔴",
  yellow: "🟡",
  green: "🟢",
};

const BUCKET_HEADING: Record<"docs" | "framework" | "research", string> = {
  docs: "Docs",
  framework: "Framework",
  research: "DX / Research",
};

const BUCKET_ICON: Record<"docs" | "framework" | "research", string> = {
  docs: "🔧",
  framework: "🔧",
  research: "🔍",
};

export function reportToMarkdown(report: Report, receivedAt: string): string {
  const lines: string[] = [];

  lines.push("# Friction Report");
  lines.push("");
  lines.push(`**Received:** ${receivedAt}`);
  lines.push(
    `**Stack:** ${report.framework} ${report.framework_version}`,
  );
  if (report.model) lines.push(`**Model:** ${report.model}`);
  if (report.harness) lines.push(`**Harness:** ${report.harness}`);
  if (report.scaffold_flags && report.scaffold_flags.length > 0) {
    lines.push(`**Scaffold flags:** \`${report.scaffold_flags.join(" ")}\``);
  }
  if (report.build_count !== undefined) {
    const totalS =
      report.cumulative_build_ms !== undefined
        ? ` (${Math.round(report.cumulative_build_ms / 100) / 10}s total)`
        : "";
    lines.push(`**Builds:** ${report.build_count}${totalS}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(report.summary);
  lines.push("");
  lines.push("## Action Items");
  lines.push("");

  for (const bucket of ["docs", "framework", "research"] as const) {
    const items = report.action_items.filter((a) => a.bucket === bucket);
    if (items.length === 0) continue;
    lines.push(`### ${BUCKET_HEADING[bucket]}`);
    lines.push("");
    for (const item of items) {
      lines.push(`- ${BUCKET_ICON[bucket]} ${item.title}`);
      lines.push(`  - Context: ${item.context}`);
    }
    lines.push("");
  }

  lines.push("## Log");
  lines.push("");
  for (const fp of report.friction_points) {
    lines.push(`- ${SEVERITY_EMOJI[fp.severity]} ${fp.title}`);
    if (fp.expected) lines.push(`  - **Expected:** ${fp.expected}`);
    if (fp.actual) lines.push(`  - **Actual:** ${fp.actual}`);
    if (fp.resolution) lines.push(`  - **Resolution:** ${fp.resolution}`);
    if (fp.redacted_snippet) {
      lines.push("  - Snippet:");
      lines.push("    ```");
      lines.push(`    ${fp.redacted_snippet}`);
      lines.push("    ```");
    }
    if (fp.file_kind) lines.push(`  - Near: \`${fp.file_kind}\``);
    lines.push(`  - Source: [${fp.source_tag}]`);
  }
  lines.push("");

  return lines.join("\n");
}
