"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

type Status = "idle" | "submitting" | "ok" | "error";

export function SubmitBar({ draftId }: { draftId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errMessage, setErrMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onClick() {
    setErrMessage(null);
    setStatus("submitting");
    startTransition(async () => {
      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draft_id: draftId }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrMessage(data.error ?? `HTTP ${res.status}`);
          setStatus("error");
          return;
        }
        setStatus("ok");
      } catch (err) {
        setErrMessage(err instanceof Error ? err.message : "unknown");
        setStatus("error");
      }
    });
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/80 backdrop-blur-md"
      role="region"
      aria-label="Submission actions"
    >
      <div className="mx-auto max-w-4xl px-6 sm:px-8 py-3 flex items-center gap-3">
        {status === "ok" ? (
          <SubmittedRow />
        ) : (
          <>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Discard
            </Link>
            <div className="ml-auto flex items-center gap-3">
              {status === "error" && errMessage ? (
                <span className="text-xs text-red-400">
                  Failed: {errMessage}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  Sends the report to the framework team
                </span>
              )}
              <button
                onClick={onClick}
                disabled={status === "submitting"}
                className="group inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3.5 py-1.5 text-xs font-medium hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_8px_-2px_rgba(255,255,255,0.15)]"
              >
                {status === "submitting" ? "Submitting…" : "Submit report"}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SubmittedRow() {
  return (
    <>
      <span className="inline-flex items-center gap-2 text-sm text-emerald-400 font-medium">
        <Check className="w-4 h-4" />
        Submitted
      </span>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Thanks — you can close this tab.
      </span>
      <Link
        href="/"
        className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        Back to viewer
      </Link>
    </>
  );
}
