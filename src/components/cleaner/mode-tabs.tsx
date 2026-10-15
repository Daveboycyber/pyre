import { MODES } from "@/components/cleaner/modes";
import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/web3/types";

export function ModeTabs({ mode, onChange }: Readonly<{ mode: Mode; onChange: (mode: Mode) => void }>) {
  return (
    <div className="flex gap-2" role="tablist" aria-label="Cleanup mode">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          onClick={() => onChange(id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors duration-200",
            mode === id
              ? "bg-primary text-primary-foreground"
              : "bg-card shadow-[var(--shadow-border)] hover:bg-surface",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
