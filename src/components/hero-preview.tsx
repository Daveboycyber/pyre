import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { STOCK_LOGOS } from "@/components/stock-logos";
import { cn } from "@/lib/utils";

type Mark = "usdg" | "weth" | "spam" | "nft" | "stock";

type Row = {
  symbol: string;
  context: string;
  mark: Mark;
  /** USD shown in the value column. */
  value: number;
  /** Burn/Revoke rows animate; Locked rows never change. */
  action: "Revoke" | "Burn" | "Locked";
  flag?: string;
};

const ROWS: Row[] = [
  {
    symbol: "USDG",
    context: "Permit2 · unknown spender",
    mark: "usdg",
    value: 1240,
    action: "Revoke",
    flag: "Unlimited",
  },
  { symbol: "WETH", context: "Unverified router", mark: "weth", value: 860.5, action: "Revoke" },
  {
    symbol: "CLAIM",
    context: "Unsolicited airdrop",
    mark: "spam",
    value: 0,
    action: "Burn",
    flag: "Spam",
  },
  {
    symbol: "VOUCHER",
    context: "Bait NFT #882",
    mark: "nft",
    value: 0,
    action: "Burn",
    flag: "Spam",
  },
  { symbol: "AAPL", context: "Stock Token", mark: "stock", value: 2315.4, action: "Locked" },
  { symbol: "AMZN", context: "Stock Token", mark: "stock", value: 1108.2, action: "Locked" },
];

const ACTIONABLE = ROWS.filter((r) => r.action !== "Locked");

// Revokes are what put value at risk; burns are junk with no value.
function riskAfter(done: number) {
  return ACTIONABLE.slice(done)
    .filter((r) => r.action === "Revoke")
    .reduce((sum, r) => sum + r.value, 0);
}

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Eases a number toward `target` so the risk total counts down smoothly. */
function useTween(target: number, ms = 600) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = origin + (target - origin) * eased;
      from.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function TokenMark({ mark, symbol }: { mark: Mark; symbol: string }) {
  const base = "relative flex size-7 shrink-0 items-center justify-center rounded-full";
  switch (mark) {
    case "usdg":
      return (
        <span className={cn(base, "bg-[#0f3d2e] text-[#5eead4]")}>
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M10.5 5.2c-.5-.7-1.4-1.1-2.5-1.1-1.5 0-2.5.8-2.5 1.9 0 2.6 5.2 1.4 5.2 4 0 1.1-1.1 1.9-2.7 1.9-1.1 0-2.1-.4-2.6-1.2M8 2.6v1.5m0 7.8v1.5" />
          </svg>
        </span>
      );
    case "weth":
      return (
        <span className={cn(base, "bg-[#2a2f4a] text-[#a5b4fc]")}>
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
            <path d="M8 1.5 3.8 8.3 8 10.7l4.2-2.4L8 1.5Z" opacity=".9" />
            <path d="M8 11.6 3.8 9.2 8 14.5l4.2-5.3L8 11.6Z" opacity=".6" />
          </svg>
        </span>
      );
    case "spam":
      // Unknown token: no verified logo, so show a question mark.
      return (
        <span
          className={cn(
            base,
            "border border-dashed border-destructive/50 bg-destructive/10 text-[12px] font-semibold text-destructive",
          )}
        >
          ?
        </span>
      );
    case "nft":
      return (
        <span
          className={cn(
            base,
            "rounded-md bg-gradient-to-br from-fuchsia-500/40 to-orange-400/30 text-[10px] font-semibold text-foreground",
          )}
        >
          ?
        </span>
      );
    case "stock": {
      const logo = STOCK_LOGOS.find((l) => l.ticker === symbol);
      return (
        <span
          className={cn(base, "shadow-[0_0_0_1px_rgb(255_255_255/0.1)]")}
          style={logo ? { background: logo.bg, color: logo.fg } : undefined}
        >
          {logo ? (
            <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
              <path d={logo.d} />
            </svg>
          ) : (
            <span className="font-mono text-[10px] font-semibold">{symbol.slice(0, 2)}</span>
          )}
          <span className="absolute -right-0.5 -bottom-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-[#151515]">
            <svg viewBox="0 0 8 8" className="size-1.5" fill="currentColor">
              <path d="M1 6 3 3.5 4.5 5 7 2v4H1Z" />
            </svg>
          </span>
        </span>
      );
    }
  }
}

/** Decorative, self-playing mock of a cleanup run for the landing hero. */
export function HeroPreview({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(0);
  const [signing, setSigning] = useState(false);
  const [fading, setFading] = useState(false);
  const [active, setActive] = useState(false);

  // Only play while on screen, and never for reduced-motion users.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      while (!cancelled) {
        await wait(1400);
        for (let i = 0; i < ACTIONABLE.length && !cancelled; i++) {
          setSigning(true);
          await wait(650);
          if (cancelled) return;
          setSigning(false);
          setDone(i + 1);
          await wait(700);
        }
        await wait(2600);
        if (cancelled) return;
        setFading(true);
        await wait(450);
        if (cancelled) return;
        setDone(0);
        setFading(false);
      }
    })();
    return () => {
      cancelled = true;
      setSigning(false);
    };
  }, [active]);

  const risk = useTween(riskAfter(done));
  const remaining = ACTIONABLE.length - done;
  const protectedNow = remaining === 0;

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={cn("hero-preview relative select-none", className)}
    >
      <div className="absolute -inset-10 -z-10 rounded-full bg-primary/[0.07] blur-3xl" />
      <div className="overflow-hidden rounded-[22px] bg-[#151515] shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_30px_80px_-24px_rgb(0_0_0/0.8)]">
        <div className="flex items-center justify-between px-5 pt-5">
          <p className="text-[17px] font-semibold tracking-tight">Cleanup</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
            <span className="size-2 rounded-full bg-primary" />
            Robinhood Chain
          </span>
        </div>

        <div className="flex gap-10 px-5 pt-4 pb-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Items to clean</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">
              <span
                key={remaining}
                className="inline-block animate-[rise_350ms_var(--ease-smooth-out)_both]"
              >
                {remaining}
              </span>
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Value at risk</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums transition-colors duration-500",
                  protectedNow ? "text-primary" : "text-foreground",
                )}
              >
                {usd(risk)}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary transition-all duration-500 ease-[var(--ease-smooth-out)]",
                  protectedNow
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-1 scale-90 opacity-0",
                )}
              >
                <Check className="size-3" strokeWidth={3} />
                Protected
              </span>
            </div>
          </div>
        </div>

        <ul className={cn("transition-opacity duration-400", fading && "opacity-0")}>
          {ROWS.map((row, i) => {
            const idx = ACTIONABLE.indexOf(row);
            const locked = idx === -1;
            const isDone = !locked && idx < done;
            const isSigning = !locked && signing && idx === done;
            return (
              <li
                key={row.symbol}
                className={cn(
                  "preview-row flex items-center gap-3 border-t border-white/[0.06] px-5 py-2.5 transition-[opacity,background-color] duration-500 ease-[var(--ease-smooth-out)]",
                  isDone && "opacity-45",
                  isSigning && "bg-primary/[0.05]",
                )}
                style={{ animationDelay: `${250 + i * 70}ms` }}
              >
                <TokenMark mark={row.mark} symbol={row.symbol} />
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="shrink-0 text-[13px] font-medium whitespace-nowrap">
                    {row.symbol}
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">{row.context}</span>
                  {row.flag && !isDone ? (
                    <span className="hidden shrink-0 rounded bg-destructive/15 px-1.5 py-px text-[10px] text-destructive sm:inline">
                      {row.flag}
                    </span>
                  ) : null}
                </span>
                <span className="hidden w-[72px] text-right text-[13px] text-muted-foreground tabular-nums sm:block">
                  {usd(row.value)}
                </span>
                <span className="flex w-[78px] justify-end">
                  {locked ? (
                    <span className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
                      <Lock className="size-3" />
                      Locked
                    </span>
                  ) : isDone ? (
                    <span className="inline-flex h-7 animate-[pop-in_300ms_var(--ease-smooth-out)_both] items-center rounded-md bg-primary/15 px-2 text-[11px] font-medium text-primary">
                      {row.action === "Burn" ? "Burned" : "Revoked"}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-md bg-white/[0.02] px-2.5 text-[11px] font-medium shadow-[0_0_0_1px_rgb(255_255_255/0.12)] transition-colors duration-300",
                        isSigning && "text-primary shadow-[0_0_0_1px_rgb(204_255_0/0.4)]",
                      )}
                    >
                      {isSigning ? <Loader2 className="size-3 animate-spin" /> : null}
                      {isSigning ? "Signing" : row.action}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
