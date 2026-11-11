import { CircleAlert, CircleCheck, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { AssetRow } from "@/components/cleaner/asset-row";
import {
  cleanOutcome,
  failureSummary,
  succeededCount,
  type CleanOutcome,
} from "@/components/cleaner/outcome";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { explorerTxUrl } from "@/lib/web3/blockscout";
import { formatFeeEth } from "@/lib/web3/fees";
import type { LastClean } from "@/lib/web3/types";
import { WIF_FEE_LABEL } from "@/lib/web3/wif";
import { useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

const HEADER: Record<CleanOutcome, { icon: typeof CircleCheck; tone: string; ring: string }> = {
  success: {
    icon: CircleCheck,
    tone: "bg-primary/15 text-primary",
    ring: "shadow-[var(--shadow-border-hover),0_20px_60px_-30px_rgb(204_255_0/0.45)]",
  },
  partial: {
    icon: TriangleAlert,
    tone: "bg-amber-400/15 text-amber-300",
    ring: "shadow-[0_0_0_1px_rgb(251_191_36/0.3)]",
  },
  failed: {
    icon: CircleAlert,
    tone: "bg-destructive/15 text-destructive",
    ring: "shadow-[0_0_0_1px_rgb(255_107_74/0.35)]",
  },
};

function headline(outcome: CleanOutcome, result: LastClean) {
  const ok = succeededCount(result);
  const total = ok + result.failed;
  if (outcome === "success") {
    return {
      title: "Wallet cleaned",
      body:
        `${ok} action${ok === 1 ? "" : "s"} confirmed on Robinhood Chain.` +
        (result.recoveredWei > 0n ? ` ${formatFeeEth(result.recoveredWei)} recovered.` : ""),
    };
  }
  if (outcome === "partial") {
    return {
      title: `${ok} of ${total} done`,
      body: "Some lines did not go through. Nothing else moved. Retry them, or hide the ones that keep failing.",
    };
  }
  return { title: "Nothing was cleaned", body: failureSummary(result) };
}

function feeText(result: LastClean) {
  if (result.feeWaived) return "waived";
  if (result.feeWei === 0n && !result.feePaidWithWif) return "free";
  if (result.feePaidWithWif) return result.feeWifLabel ?? WIF_FEE_LABEL;
  return result.feePaid ? formatFeeEth(result.feeWei) : "not charged";
}

function Stat({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}

/** The "done" step: what happened, why anything failed, and what to do next. */
export function ResultPanel({ result }: { readonly result: LastClean }) {
  const { assets, mode, demo, retryFailed, runScan, disconnect } = useWalletCleaner();
  const outcome = cleanOutcome(result);
  const { title, body } = headline(outcome, result);
  const { icon: Icon, tone, ring } = HEADER[outcome];
  const failedLines = assets.filter((a) => a.txStatus === "failed");
  const showReason = result.error && !failedLines.some((a) => a.txError === result.error);

  return (
    <output
      role={outcome === "failed" ? "alert" : undefined}
      className={cn(
        "reveal flex flex-col gap-5 rounded-2xl bg-card p-5 transition-shadow duration-500",
        ring,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", tone)}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
        </div>
      </div>

      {showReason ? (
        <p className="rounded-lg bg-destructive/[0.08] px-3 py-2 text-sm text-destructive">
          {result.error}
        </p>
      ) : null}

      {failedLines.length > 0 ? (
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Did not go through
          </p>
          <ul className="mt-2 flex flex-col rounded-xl bg-background/40">
            {failedLines.map((asset) => (
              <li key={asset.id}>
                <AssetRow asset={asset} mode={mode} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.creditsEarned ? (
        <p className="flex items-center gap-2 rounded-lg bg-primary/[0.08] px-3 py-2 text-sm">
          <Sparkles className="size-4 shrink-0 text-primary" />
          You earned {result.creditsEarned} credit{result.creditsEarned === 1 ? "" : "s"}. It waives
          your next batch fee.
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-background/40 p-3 text-sm">
        <Stat label="Tokens burned" value={result.tokens} />
        <Stat label="NFTs burned" value={result.nfts} />
        <Stat label="Approvals revoked" value={result.approvals} />
        <Stat label="Swept" value={result.swept} />
        <Stat label="Dust swaps" value={result.dustSwaps} />
        <Stat label="Failed" value={result.failed} />
        <Stat label="Recovered" value={formatFeeEth(result.recoveredWei)} />
        <Stat label="Batch fee" value={feeText(result)} />
      </dl>

      {result.txs && result.txs.length > 0 ? (
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Receipts</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {result.txs.map((tx) => (
              <li key={tx.hash} className="flex justify-between gap-2">
                <span>{tx.label}</span>
                <a
                  className="font-mono text-xs text-primary hover:underline"
                  href={explorerTxUrl(tx.hash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {tx.hash.slice(0, 10)}…
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {demo ? (
        <p className="text-xs text-muted-foreground">Demo run. Nothing was signed or sent.</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {failedLines.length > 0 ? (
          <Button size="lg" onClick={retryFailed}>
            <RotateCcw />
            Retry {failedLines.length} failed
          </Button>
        ) : null}
        <Button
          size="lg"
          variant={failedLines.length > 0 ? "outline" : "default"}
          onClick={() => void runScan()}
        >
          Scan again
        </Button>
        <Button size="lg" variant="ghost" onClick={() => void disconnect()}>
          {demo ? "Exit demo" : "Disconnect"}
        </Button>
      </div>
    </output>
  );
}
