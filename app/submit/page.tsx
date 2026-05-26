import { notFound } from "next/navigation";
import { Suspense } from "react";
import { readDraft } from "@/lib/blob";
import { reportToMarkdown } from "@/lib/report-to-markdown";
import { FrictionLogViewer } from "@/app/_components/friction-log-viewer";
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
    <main>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground [text-wrap:balance] max-w-prose">
          Your agent collected the report below. Nothing has been sent
          yet — review it, then click <strong>Submit</strong> at the
          bottom to share it with the framework team. Closing this tab
          discards the draft.
        </p>
      </div>

      <Suspense fallback={<LoadingDraft />}>
        <DraftView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function LoadingDraft() {
  return (
    <div className="text-sm text-muted-foreground py-6">Loading draft…</div>
  );
}

async function DraftView({ searchParams }: { searchParams: SearchParams }) {
  const { draft } = await searchParams;
  if (!draft) notFound();

  const report = await readDraft(draft);
  if (!report) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-semibold mb-1">
          Draft not found or expired
        </h2>
        <p className="text-sm text-muted-foreground">
          Drafts expire after 10 minutes. Re-run the friction-observe
          step in your agent to create a fresh draft.
        </p>
      </div>
    );
  }

  const markdown = reportToMarkdown(report, new Date().toISOString());

  return (
    <>
      <FrictionLogViewer markdown={markdown} />
      <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
        <SubmitButton draftId={draft} />
      </div>
    </>
  );
}
