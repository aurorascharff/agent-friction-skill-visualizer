import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import type { Metadata } from "next";
import {
  DraftReview,
  DraftReviewSkeleton,
} from "@/features/drafts/components/draft-review";

export const unstable_prefetch = "force-runtime";

export const metadata: Metadata = {
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
      <Suspense fallback={<DraftReviewSkeleton />}>
        <ViewTransition>
          {searchParams.then(({ draft }) => {
            if (!draft) notFound();
            return <DraftReview draftId={draft} />;
          })}
        </ViewTransition>
      </Suspense>
    </main>
  );
}
