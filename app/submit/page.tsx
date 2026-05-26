import { notFound } from "next/navigation";
import { Suspense } from "react";
import { readDraft } from "@/lib/blob";
import { severityMax, type Report } from "@/lib/payload";
import { SubmitButton } from "./submit-button";

export const metadata = {
  title: "Review friction report",
};

type SearchParams = Promise<{ draft?: string }>;

export default function SubmitPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Review friction report
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your agent collected the report below. Nothing has been sent
          yet — review it, then click <strong>Submit</strong> to share it
          with the framework team. Clicking the back button discards it.
        </p>
      </header>

      <Suspense fallback={<LoadingDraft />}>
        <DraftView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function LoadingDraft() {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 text-sm text-muted-foreground">
      Loading draft…
    </div>
  );
}

async function DraftView({ searchParams }: { searchParams: SearchParams }) {
  const { draft } = await searchParams;
  if (!draft) notFound();

  const report = await readDraft(draft);
  if (!report) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold mb-2">
          Draft not found or expired
        </h2>
        <p className="text-sm text-muted-foreground">
          Drafts expire after 10 minutes. Re-run the friction-collect
          step in your agent to create a fresh draft.
        </p>
      </div>
    );
  }

  return (
    <>
      <ReportPreview report={report} />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton draftId={draft} />
        <span className="text-xs text-muted-foreground">
          Severity: <SeverityPill level={severityMax(report)} />
        </span>
      </div>
    </>
  );
}

function ReportPreview({ report }: { report: Report }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 space-y-5">
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Header
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Framework</dt>
          <dd>
            {report.framework} {report.framework_version}
          </dd>
          {report.model ? (
            <>
              <dt className="text-muted-foreground">Model</dt>
              <dd>{report.model}</dd>
            </>
          ) : null}
          {report.harness ? (
            <>
              <dt className="text-muted-foreground">Harness</dt>
              <dd>{report.harness}</dd>
            </>
          ) : null}
          {report.build_count !== undefined ? (
            <>
              <dt className="text-muted-foreground">Builds</dt>
              <dd>
                {report.build_count}
                {report.cumulative_build_ms !== undefined
                  ? ` · ${Math.round(report.cumulative_build_ms / 100) / 10}s total`
                  : null}
              </dd>
            </>
          ) : null}
          {report.scaffold_flags && report.scaffold_flags.length > 0 ? (
            <>
              <dt className="text-muted-foreground">Scaffold flags</dt>
              <dd className="font-mono text-xs">
                {report.scaffold_flags.join(" ")}
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Summary
        </h2>
        <p className="text-sm leading-relaxed">{report.summary}</p>
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Friction points ({report.friction_points.length})
        </h2>
        <ul className="space-y-3">
          {report.friction_points.map((fp, i) => (
            <li
              key={i}
              className="rounded-md border border-border bg-background/40 p-3 text-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <SeverityPill level={fp.severity} />
                <span className="font-medium">{fp.title}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  [{fp.source_tag}]
                </span>
              </div>
              {fp.expected ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    Expected:
                  </span>{" "}
                  {fp.expected}
                </p>
              ) : null}
              {fp.actual ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    Actual:
                  </span>{" "}
                  {fp.actual}
                </p>
              ) : null}
              {fp.resolution ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    Resolution:
                  </span>{" "}
                  {fp.resolution}
                </p>
              ) : null}
              {fp.redacted_snippet ? (
                <pre className="mt-1 rounded bg-black/40 px-2 py-1 text-[11px] font-mono text-muted-foreground overflow-x-auto">
                  {fp.redacted_snippet}
                </pre>
              ) : null}
              {fp.file_kind ? (
                <p className="mt-1 text-[10px] font-mono text-muted-foreground">
                  near {fp.file_kind}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Action items ({report.action_items.length})
        </h2>
        <ul className="space-y-2">
          {report.action_items.map((item, i) => (
            <li
              key={i}
              className="rounded-md border border-border bg-background/40 p-3 text-sm"
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">
                  {item.bucket}
                </span>
                <span className="font-medium">{item.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.context}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SeverityPill({ level }: { level: "green" | "yellow" | "red" }) {
  const color =
    level === "red"
      ? "bg-red-500/20 text-red-300"
      : level === "yellow"
        ? "bg-yellow-500/20 text-yellow-300"
        : "bg-green-500/20 text-green-300";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-mono uppercase ${color}`}
    >
      {level}
    </span>
  );
}
