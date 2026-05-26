import { ShieldCheck } from "lucide-react";

export function ReviewBanner() {
  return (
    <div className="mb-6 rounded-lg border border-border bg-card/30 px-4 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
        <p className="text-sm text-foreground/90 font-medium">
          Nothing has been shared yet.
        </p>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-2 pl-7">
        <p>
          While your agent worked on a task, the{" "}
          <a
            href="https://github.com/aurorascharff/agent-friction-skill"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 underline decoration-border underline-offset-2 hover:decoration-foreground/40 hover:text-foreground transition-colors"
          >
            friction-observe
          </a>{" "}
          skill silently observed moments where something was confusing,
          missing, or slower than expected. It packaged those observations
          into the report below.
        </p>
        <p>
          <span className="text-foreground/80 font-medium">Review it</span>{" "}
          — if the observations look right, click{" "}
          <span className="text-foreground/80 font-medium">Submit</span> in
          the bar at the bottom to share it with the framework team. If
          anything looks wrong or irrelevant, click{" "}
          <span className="text-foreground/80 font-medium">Discard</span> to
          delete the draft. It auto-expires after 10 minutes either way.
        </p>
        <div className="flex items-center gap-3 pt-1 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Blocked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            Friction
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            Greens are not included — only friction that slowed the agent
            down.
          </span>
        </div>
      </div>
    </div>
  );
}
