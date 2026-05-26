import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Clock, ShieldCheck } from "lucide-react";
import { readDraft } from "@/lib/blob";
import { reportToMarkdown } from "@/lib/report-to-markdown";
import { FrictionLogViewer } from "@/app/_components/friction-log-viewer";
import { SubmitBar } from "./submit-bar";

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
    <main className="pb-24">
      <Suspense fallback={<LoadingDraft />}>
        <DraftView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function LoadingDraft() {
  return (
    <div className="text-sm text-muted-foreground py-12 text-center">
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
      <div className="mx-auto max-w-md mt-16 rounded-xl border border-border bg-card p-8 text-center">
        <Clock className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
        <h2 className="text-base font-semibold mb-2">
          Draft not found or expired
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Drafts expire after 10 minutes and can only be submitted once. Re-run
          the friction-observe step in your agent to create a fresh one.
        </p>
        <Link
          href="/"
          className="inline-block mt-5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to viewer
        </Link>
      </div>
    );
  }

  const markdown = reportToMarkdown(report, new Date().toISOString());

  return (
    <>
      <ReviewBanner />
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur p-5 sm:p-7">
        <FrictionLogViewer markdown={markdown} />
      </div>
      <SubmitBar draftId={draft} />
    </>
  );
}

function ReviewBanner() {
  return (
    <div className="mb-5 rounded-lg border border-border bg-card/30 px-4 py-3 flex items-start gap-3">
      <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
      <div className="text-xs text-muted-foreground leading-relaxed">
        <p className="text-foreground/90 font-medium mb-0.5">
          Nothing has been shared yet.
        </p>
        <p>
          Your agent prepared the report below. Review it, then click{" "}
          <span className="text-foreground/90 font-medium">Submit</span> to
          share it with the framework team. The draft auto-expires after 10
          minutes if you don&apos;t submit.
        </p>
      </div>
    </div>
  );
}
