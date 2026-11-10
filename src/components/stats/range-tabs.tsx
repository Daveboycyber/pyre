import { RANGES, type RangeKey } from "@/lib/web3/analytics";
import { RANGE_LABEL } from "@/components/stats/format";
import { cn } from "@/lib/utils";

/** Segmented time-range control for the summary. */
export function RangeTabs({
  value,
  onChange,
}: {
  readonly value: RangeKey;
  readonly onChange: (next: RangeKey) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Time range"
      className="grid w-full grid-cols-4 rounded-2xl bg-primary/[0.07] p-1.5 shadow-[var(--shadow-border)] sm:w-auto"
    >
      {RANGES.map((range) => (
        <button
          key={range}
          type="button"
          role="radio"
          aria-checked={value === range}
          onClick={() => onChange(range)}
          className={cn(
            "rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors sm:px-6",
            value === range
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-primary/10",
          )}
        >
          {RANGE_LABEL[range]}
        </button>
      ))}
    </div>
  );
}
