"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";

type Status = "idle" | "submitting" | "ok" | "error";

export function SubmitButton({ draftId }: { draftId: string }) {
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

  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
        <Check className="w-3.5 h-3.5" />
        Submitted — you can close this tab.
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === "error" && errMessage ? (
        <span className="text-xs text-red-400">Failed: {errMessage}</span>
      ) : null}
      <button
        onClick={onClick}
        disabled={status === "submitting"}
        className="group inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_8px_-2px_rgba(255,255,255,0.15)]"
      >
        {status === "submitting" ? "Submitting…" : "Submit"}
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}

