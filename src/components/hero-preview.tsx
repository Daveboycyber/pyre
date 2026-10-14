import { Check, Flame, Lock, ShieldCheck } from "lucide-react";
import { formatFeeEth, PROTOCOL_FEE_WEI } from "@/lib/web3/fees";
import { cn } from "@/lib/utils";

type Row = {
  symbol: string;
  name: string;
  note: string;
  action: "Burn" | "Revoke" | "Locked";
};

const ROWS: Row[] = [
  { symbol: "CL", name: "CLAIM-ETH.io", note: "Unsolicited airdrop", action: "Burn" },
  { symbol: "MV", name: "Mystery Voucher #882", note: "Bait NFT", action: "Burn" },
  {
    symbol: "P2",
    name: "Permit2 · unknown spender",
    note: "Unlimited allowance",
    action: "Revoke",
  },
  { symbol: "TS", name: "TSLA", note: "Stock Token", action: "Locked" },
  { symbol: "UG", name: "USDG", note: "Stablecoin", action: "Locked" },
];

const selected = ROWS.filter((r) => r.action !== "Locked").length;

/** Static, decorative mock of the cleaner's review step for the landing hero. */
export function HeroPreview({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("hero-preview relative select-none", className)}>
      <div className="absolute -inset-10 -z-10 rounded-full bg-primary/10 blur-3xl" />
      <div className="overflow-hidden rounded-2xl bg-card/80 shadow-[var(--shadow-border),0_30px_80px_-20px_rgb(0_0_0/0.7)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary lime-pulse" />
            <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Review · Safe mode
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">0x4f…c91a</span>
        </div>

        <div className="relative">
          <div className="preview-scan pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
          <ul className="divide-y divide-border">
            {ROWS.map((row, i) => {
              const locked = row.action === "Locked";
              return (
                <li
                  key={row.name}
                  className="preview-row flex items-center gap-3 px-5 py-3"
                  style={{ animationDelay: `${300 + i * 110}ms` }}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-[5px]",
                      locked
                        ? "bg-background text-muted-foreground shadow-[var(--shadow-border)]"
                        : "preview-check bg-primary text-primary-foreground",
                    )}
                    style={locked ? undefined : { animationDelay: `${700 + i * 110}ms` }}
                  >
                    {locked ? (
                      <Lock className="size-3" />
                    ) : (
                      <Check className="size-3.5" strokeWidth={3} />
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-[10px]",
                      locked
                        ? "bg-background text-foreground"
                        : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {row.symbol}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        locked ? "text-foreground" : "text-foreground/90",
                      )}
                    >
                      {row.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">{row.note}</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 text-[11px] font-medium",
                      locked
                        ? "text-muted-foreground shadow-[var(--shadow-border)]"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {row.action}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-background/40 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm">{selected} actions selected</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              {formatFeeEth(PROTOCOL_FEE_WEI)} batch fee · simulated
            </p>
          </div>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground">
            <Flame className="size-4" />
            Clean
          </span>
        </div>
      </div>
    </div>
  );
}
