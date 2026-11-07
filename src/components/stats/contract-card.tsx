import { useState } from "react";
import { Copy, ExternalLink, ScrollText } from "lucide-react";
import { notify } from "@/lib/notify";
import { explorerAddressUrl } from "@/lib/web3/blockscout";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/components/stats/format";

type Contract = { address: string; label: string; cleans: number };

/** Tabbed source-contract panel with a live block indicator and a big copy action. */
export function ContractCard({
  contracts,
  headBlock,
  generatedAt,
}: {
  readonly contracts: Contract[];
  readonly headBlock?: number;
  readonly generatedAt?: number;
}) {
  const [index, setIndex] = useState(0);
  const active = contracts[index] ?? contracts[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.address);
      notify.success("Address copied", {
        description: `${active.address.slice(0, 10)}…${active.address.slice(-6)}`,
      });
    } catch {
      notify.error("Could not copy", { description: "Select the address and copy it manually." });
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Contract" className="flex gap-1 pl-6">
        {contracts.map((c, i) => (
          <button
            key={c.address}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-t-2xl px-5 py-3 text-sm font-semibold transition-colors sm:px-7 sm:text-base",
              i === index
                ? "bg-black text-foreground"
                : "bg-primary/[0.12] text-primary hover:bg-primary/20",
            )}
          >
            {i === 0 ? "Mainnet" : "Retired"}
          </button>
        ))}
      </div>

      <div className="rounded-[28px] bg-black p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {active.label}
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <span className="relative flex size-1.5">
                  {headBlock ? (
                    <span className="absolute inline-flex size-full rounded-full bg-primary opacity-70 motion-safe:animate-ping" />
                  ) : null}
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                {active.cleans} batch {active.cleans === 1 ? "clean" : "cleans"}
              </span>
            </p>
            <p className="mt-2 font-mono text-sm break-all sm:text-lg">{active.address}</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <a
              href={explorerAddressUrl(active.address)}
              target="_blank"
              rel="noreferrer"
              aria-label="Open contract in the explorer"
              className="grid size-14 place-items-center rounded-2xl bg-card text-foreground transition-colors hover:bg-surface hover:text-primary"
            >
              <ExternalLink className="size-5" />
            </a>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 lg:w-64 lg:flex-none"
            >
              <Copy className="size-5" /> Copy
            </button>
          </div>
        </div>

        <output className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <ScrollText className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">Read from Robinhood Chain event logs</span>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground tabular-nums">
            {headBlock
              ? `Block ${headBlock.toLocaleString("en-US")} · ${timeAgo(generatedAt ? generatedAt / 1000 : null) || "now"}`
              : "Connecting…"}
          </span>
        </output>
      </div>
    </div>
  );
}
