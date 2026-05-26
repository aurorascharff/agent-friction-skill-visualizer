import { ShieldCheck } from "lucide-react";

export function ReviewBanner() {
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
