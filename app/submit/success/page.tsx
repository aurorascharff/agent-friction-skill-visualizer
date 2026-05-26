import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Report submitted",
};

export default function SubmitSuccessPage() {
  return (
    <main className="flex flex-col items-center pt-20 pb-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Report submitted
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Thanks — the friction report has been shared with the framework
          team. You can close this tab.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Back to viewer
        </Link>
      </div>
    </main>
  );
}
