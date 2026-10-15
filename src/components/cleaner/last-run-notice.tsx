import { History, X } from "lucide-react";
import { cleanOutcome, succeededCount } from "@/components/cleaner/outcome";
import { explorerTxUrl } from "@/lib/web3/blockscout";
import { formatFeeEth } from "@/lib/web3/fees";
import type { SavedClean } from "@/lib/web3/last-clean";

function timeAgo(at: number) {
  const mins = Math.round((Date.now() - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
}

/** Recap of the previous clean in this tab, so a reload does not lose it. */
export function LastRunNotice({ saved, onDismiss }: { saved: SavedClean; onDismiss: () => void }) {
  const { result, failedLines } = saved;
  const ok = succeededCount(result);
  const outcome = cleanOutcome(result);
  const summary =
    outcome === "success"
      ? `${ok} action${ok === 1 ? "" : "s"} confirmed`
      : outcome === "partial"
        ? `${ok} of ${ok + result.failed} done`
        : "Nothing went through";

  return (
    <section className="rounded-2xl bg-card/60 p-4 text-sm shadow-[var(--shadow-border)]">
      <div className="flex items-start gap-3">
        <History className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            Last clean · <span className="text-muted-foreground">{timeAgo(saved.at)}</span>
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {summary}
            {result.recoveredWei > 0n ? ` · ${formatFeeEth(result.recoveredWei)} recovered` : ""}
          </p>
          {failedLines.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs">
              {failedLines.map((line) => (
                <li key={line.id} className="text-destructive">
                  {line.name}
                  {line.reason ? ` — ${line.reason}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {result.txs && result.txs.length > 0 ? (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {result.txs.map((tx) => (
                <a
                  key={tx.hash}
                  href={explorerTxUrl(tx.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {tx.label} ↗
                </a>
              ))}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss last clean"
          className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </section>
  );
}
