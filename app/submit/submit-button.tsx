"use client";

import { useState, useTransition } from "react";

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
      <p className="text-sm text-green-400">
        Submitted. Thanks — you can close this tab.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={status === "submitting"}
        className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40"
      >
        {status === "submitting" ? "Submitting…" : "Submit"}
      </button>
      {status === "error" && errMessage ? (
        <span className="text-sm text-red-400">Failed: {errMessage}</span>
      ) : null}
    </div>
  );
}
