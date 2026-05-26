import Link from "next/link";
import { Clock } from "lucide-react";
import { getDraftById } from "../drafts-queries";
import { reportToMarkdown } from "@/lib/report-to-markdown";
import { FrictionLogViewer } from "@/features/log/components/friction-log-viewer";
import { ReviewBanner } from "./review-banner";
import { SubmitBar } from "./submit-bar";

/**
 * Async server component that resolves a signed draft id into the
 * rendered review surface. Owns its own loading skeleton — see
 * `DraftReviewSkeleton` below.
 */
export async function DraftReview({ draftId }: { draftId: string }) {
  const draft = await getDraftById(draftId);
  if (!draft) return <DraftNotFound />;

  const markdown = reportToMarkdown(draft.report, new Date().toISOString());

  return (
    <>
      <ReviewBanner />
      <FrictionLogViewer markdown={markdown} />
      <SubmitBar draftId={draftId} />
    </>
  );
}

function DraftNotFound() {
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

/**
 * Skeleton matching the shape of a resolved draft: banner, card with
 * report viewer placeholder, and the fixed submit bar.
 */
export function DraftReviewSkeleton() {
  return (
    <>
      <div className="mb-5 rounded-lg border border-border bg-card/30 px-4 py-3 flex items-start gap-3">
        <div className="w-4 h-4 mt-0.5 rounded-sm bg-muted shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-44 bg-muted rounded" />
          <div className="h-3 w-full max-w-md bg-muted/70 rounded" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur p-5 sm:p-7 space-y-4">
        <div className="h-6 w-2/3 bg-muted rounded" />
        <div className="h-4 w-1/3 bg-muted/70 rounded" />
        <div className="pt-4 space-y-2">
          <div className="h-3 w-full bg-muted/70 rounded" />
          <div className="h-3 w-5/6 bg-muted/70 rounded" />
          <div className="h-3 w-4/6 bg-muted/70 rounded" />
        </div>
        <div className="pt-3 space-y-2">
          <div className="h-3 w-full bg-muted/70 rounded" />
          <div className="h-3 w-3/4 bg-muted/70 rounded" />
        </div>
      </div>
    </>
  );
}
