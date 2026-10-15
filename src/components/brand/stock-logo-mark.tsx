import { cn } from "@/lib/utils";
import { STOCK_LOGOS } from "@/lib/brand/stock-logos";

/** Round brand coin for a Stock Token ticker; falls back to its first letters. */
export function StockLogoMark({
  ticker,
  className,
}: {
  readonly ticker: string;
  readonly className?: string;
}) {
  const logo = STOCK_LOGOS.find((l) => l.ticker === ticker);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full shadow-[0_0_0_1px_rgb(255_255_255/0.1)]",
        className,
      )}
      style={logo ? { background: logo.bg, color: logo.fg } : undefined}
    >
      {logo ? (
        <svg viewBox="0 0 24 24" className="size-[55%]" fill="currentColor" aria-hidden="true">
          <path d={logo.d} />
        </svg>
      ) : (
        <span className="font-mono text-[10px] font-semibold">{ticker.slice(0, 2)}</span>
      )}
    </span>
  );
}
