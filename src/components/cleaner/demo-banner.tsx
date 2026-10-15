import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="flex gap-3 rounded-xl bg-primary/[0.06] px-4 py-3 text-xs text-muted-foreground shadow-[var(--shadow-border)]">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>
        <span className="font-medium text-foreground">Demo wallet.</span> Nothing is signed and no
        funds move. Switch to Review and tick “Unknown ERC-20” to see how a failed line is handled.
      </p>
    </div>
  );
}
