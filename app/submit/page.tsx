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
    <main className="relative">
      <Halo />

      <div className="flex flex-col items-center pt-10 sm:pt-14 pb-12">
        <div className="w-full max-w-2xl">
          <h1 className="text-center text-4xl sm:text-5xl font-semibold tracking-tight mb-3 text-foreground">
            Review report.
          </h1>
          <p className="text-center text-sm text-muted-foreground mb-8 [text-wrap:balance] max-w-md mx-auto">
            Your agent collected the report below. Nothing has been sent
            yet — click <strong className="text-foreground/90">Submit</strong>{" "}
            to share it with the framework team. Back button discards it.
          </p>

          <div className="rounded-xl border border-border bg-card/80 backdrop-blur shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-black/40">
              <div className="flex gap-1.5" aria-hidden>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
              <span className="ml-1 text-[11px] font-mono text-muted-foreground tabular-nums">
                friction-report.json
              </span>
            </div>

            <Suspense fallback={<LoadingDraft />}>
              <DraftView searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

function Halo() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-[-20%] h-[600px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,black,transparent_75%)]" />
    </div>
  );
}

function LoadingDraft() {
  return (
    <div className="px-5 py-8 text-sm text-muted-foreground">
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
      <div className="px-5 py-8">
        <h2 className="text-base font-semibold mb-1">
          Draft not found or expired
        </h2>
        <p className="text-sm text-muted-foreground">
          Drafts expire after 10 minutes. Re-run the friction-observe step
          in your agent to create a fresh draft.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="px-5 py-5 space-y-6">
        <HeaderSection report={report} />
        <SummarySection report={report} />
        <FrictionSection report={report} />
        <ActionItemsSection report={report} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-black/30 px-3 py-3">
        <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground pl-1">
          Severity
          <SeverityPill level={severityMax(report)} />
        </span>
        <SubmitButton draftId={draft} />
      </div>
    </>
  );
}

function HeaderSection({ report }: { report: Report }) {
  return (
    <section>
      <SectionTitle>Header</SectionTitle>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <Term>Framework</Term>
        <Defn>
          <Mono>
            {report.framework} {report.framework_version}
          </Mono>
        </Defn>
        {report.model ? (
          <>
            <Term>Model</Term>
            <Defn>
              <Mono>{report.model}</Mono>
            </Defn>
          </>
        ) : null}
        {report.harness ? (
          <>
            <Term>Harness</Term>
            <Defn>
              <Mono>{report.harness}</Mono>
            </Defn>
          </>
        ) : null}
        {report.build_count !== undefined ? (
          <>
            <Term>Builds</Term>
            <Defn>
              {report.build_count}
              {report.cumulative_build_ms !== undefined
                ? ` · ${Math.round(report.cumulative_build_ms / 100) / 10}s total`
                : null}
            </Defn>
          </>
        ) : null}
        {report.scaffold_flags && report.scaffold_flags.length > 0 ? (
          <>
            <Term>Scaffold flags</Term>
            <Defn>
              <Mono>{report.scaffold_flags.join(" ")}</Mono>
            </Defn>
          </>
        ) : null}
      </dl>
    </section>
  );
}

function SummarySection({ report }: { report: Report }) {
  return (
    <section>
      <SectionTitle>Summary</SectionTitle>
      <p className="text-sm leading-relaxed text-foreground/90">
        {report.summary}
      </p>
    </section>
  );
}

function FrictionSection({ report }: { report: Report }) {
  return (
    <section>
      <SectionTitle>
        Friction points
        <Count>{report.friction_points.length}</Count>
      </SectionTitle>
      <ul className="space-y-2.5">
        {report.friction_points.map((fp, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-background/40 px-3 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <FrictionDot level={fp.severity} />
              <span className="font-medium text-foreground/95">
                {fp.title}
              </span>
              <span className="ml-auto">
                <SourceTagPill tag={fp.source_tag} />
              </span>
            </div>
            <div className="space-y-0.5">
              {fp.expected ? (
                <Detail label="Expected" value={fp.expected} />
              ) : null}
              {fp.actual ? <Detail label="Actual" value={fp.actual} /> : null}
              {fp.resolution ? (
                <Detail label="Resolution" value={fp.resolution} />
              ) : null}
            </div>
            {fp.redacted_snippet ? (
              <pre className="mt-2 rounded bg-black/50 border border-border px-2 py-1.5 text-[11px] font-mono text-muted-foreground overflow-x-auto">
                {fp.redacted_snippet}
              </pre>
            ) : null}
            {fp.file_kind ? (
              <p className="mt-1.5 text-[10px] font-mono text-muted-foreground">
                near{" "}
                <span className="text-foreground/70">{fp.file_kind}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActionItemsSection({ report }: { report: Report }) {
  return (
    <section>
      <SectionTitle>
        Action items
        <Count>{report.action_items.length}</Count>
      </SectionTitle>
      <ul className="space-y-2">
        {report.action_items.map((item, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-background/40 px-3 py-2.5 text-sm"
          >
            <div className="flex items-baseline gap-2 mb-1">
              <BucketPill bucket={item.bucket} />
              <span className="font-medium text-foreground/95">
                {item.title}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {item.context}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* Atoms */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </h2>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded border border-border bg-background/40 px-1.5 py-0 text-[10px] tabular-nums text-foreground/70">
      {children}
    </span>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground self-center">
      {children}
    </dt>
  );
}

function Defn({ children }: { children: React.ReactNode }) {
  return <dd className="text-foreground/90">{children}</dd>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs">{children}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-muted-foreground leading-relaxed">
      <span className="text-foreground/70 font-medium">{label}:</span> {value}
    </p>
  );
}

const FRICTION_DOT_COLOR: Record<"red" | "yellow" | "green", string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
};

function FrictionDot({ level }: { level: "red" | "yellow" | "green" }) {
  return (
    <span
      aria-label={`${level} severity`}
      className={`inline-block w-2 h-2 rounded-full ${FRICTION_DOT_COLOR[level]} shadow-[0_0_0_2px_rgba(255,255,255,0.04)]`}
    />
  );
}

const SOURCE_TAG_STYLE: Record<string, string> = {
  "web search": "bg-blue-500/15 text-blue-400",
  docs: "bg-purple-500/15 text-purple-400",
  "training data": "bg-amber-500/15 text-amber-400",
  "agents.md": "bg-emerald-500/15 text-emerald-400",
  skill: "bg-cyan-500/15 text-cyan-400",
  url: "bg-indigo-500/15 text-indigo-400",
  sandbox: "bg-orange-500/15 text-orange-400",
  "error output": "bg-rose-500/15 text-rose-400",
};

function SourceTagPill({ tag }: { tag: string }) {
  const style = SOURCE_TAG_STYLE[tag] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${style}`}
    >
      {tag}
    </span>
  );
}

const BUCKET_STYLE: Record<string, string> = {
  docs: "bg-purple-500/15 text-purple-400",
  framework: "bg-emerald-500/15 text-emerald-400",
  research: "bg-cyan-500/15 text-cyan-400",
};

function BucketPill({
  bucket,
}: {
  bucket: "docs" | "framework" | "research";
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none uppercase tracking-wider ${BUCKET_STYLE[bucket]}`}
    >
      {bucket}
    </span>
  );
}

function SeverityPill({ level }: { level: "green" | "yellow" | "red" }) {
  const color =
    level === "red"
      ? "bg-red-500/15 text-red-400"
      : level === "yellow"
        ? "bg-yellow-500/15 text-yellow-400"
        : "bg-green-500/15 text-green-400";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none uppercase ${color}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${FRICTION_DOT_COLOR[level]}`}
      />
      {level}
    </span>
  );
}
