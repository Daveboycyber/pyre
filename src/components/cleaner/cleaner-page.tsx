import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Check,
  CircleAlert,
  Flame,
  LoaderCircle,
  Lock,
  Shield,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { WalletDialog } from "@/components/wallet-dialog";
import { cn } from "@/lib/utils";
import { formatFeeEth, PROTOCOL_FEE_ID, treasuryIsLive } from "@/lib/web3/fees";
import { selectedAction, sweepNetWei } from "@/lib/web3/sweep";
import type { Mode } from "@/lib/web3/types";
import {
  estimate,
  shortAddress,
  useWalletCleaner,
  type WalletAsset,
} from "@/lib/web3/use-wallet-cleaner";

const STEPS = ["Connect", "Scan", "Review", "Sign"] as const;

function stepIndex(status: string, connected: boolean) {
  if (!connected || status === "idle") return 0;
  if (status === "scanning") return 1;
  if (status === "ready") return 2;
  return 3;
}

function actionLabel(asset: WalletAsset, mode: Mode) {
  if (asset.dust && !asset.sweepable) return "Not worth moving";
  if (asset.dust) return "Swap dust";
  if (asset.protected) return "Protected";
  const action = selectedAction(asset, mode);
  if (action === "sweep") return "Sweep for ETH";
  if (action === "revoke") return "Revoke";
  if (asset.kind === "nft") return "Burn NFT";
  return "Burn token";
}

function FeeRow({
  feeWei,
  status,
  active,
}: {
  feeWei: bigint;
  status?: "idle" | "pending" | "done" | "failed";
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md px-3 py-2",
        active && "lime-pulse bg-background",
      )}
    >
      {status === "done" ? (
        <Check className="size-4 text-primary" />
      ) : status === "failed" ? (
        <CircleAlert className="size-4 text-destructive" />
      ) : status === "pending" || active ? (
        <LoaderCircle className="size-4 animate-spin text-primary" />
      ) : (
        <span className="size-4 rounded-sm shadow-[var(--shadow-border)]" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">Protocol batch fee</span>
        <span className="block font-mono text-xs text-muted-foreground">
          Flat fee · {formatFeeEth(feeWei)}
        </span>
      </span>
    </div>
  );
}

function AssetRow({
  asset,
  interactive,
  onToggle,
  active,
  mode,
}: {
  asset: WalletAsset;
  interactive?: boolean;
  onToggle?: () => void;
  active?: boolean;
  mode: Mode;
}) {
  const status = asset.txStatus;
  return (
    <label
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md px-3 py-2",
        active && "lime-pulse bg-background",
        asset.protected && "opacity-60",
        !asset.protected && interactive && "hover:bg-background",
      )}
    >
      {interactive && (!asset.protected || (asset.dust && asset.sweepable)) ? (
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={asset.selected}
          disabled={asset.protected && !(asset.dust && asset.sweepable)}
          onChange={onToggle}
        />
      ) : status === "done" ? (
        <Check className="size-4 text-primary" />
      ) : status === "failed" ? (
        <CircleAlert className="size-4 text-destructive" />
      ) : status === "pending" || active ? (
        <LoaderCircle className="size-4 animate-spin text-primary" />
      ) : asset.protected ? (
        <Lock className="size-4 text-muted-foreground" />
      ) : (
        <span className="size-4 rounded-sm shadow-[var(--shadow-border)]" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{asset.name}</span>
        <span className="block font-mono text-xs text-muted-foreground">
          {actionLabel(asset, mode)} · {asset.symbol}
          {asset.protected && !asset.dust
            ? " · locked"
            : asset.dust && !asset.sweepable
              ? " · below gas"
              : asset.quoteWei
                ? ` · ${formatFeeEth(sweepNetWei(asset.quoteWei))} net`
                : ` · ${asset.amount}`}
        </span>
      </span>
    </label>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Cleanup steps">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex flex-col gap-2">
            <span
              className={cn(
                "h-1 rounded-full",
                done || active ? "bg-primary" : "bg-surface",
              )}
            />
            <span
              className={cn(
                "text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {index + 1} {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function CleanerPage() {
  const {
    connected,
    address,
    status,
    mode,
    assets,
    lastClean,
    scanError,
    currentId,
    feeStatus,
    demo,
    setOpen,
    enterDemo,
    setMode,
    toggleAsset,
    clean,
    runScan,
    disconnect,
  } = useWalletCleaner();

  const summary = estimate(assets, mode);
  const current = stepIndex(status, connected);
  const selected = assets.filter(
    (a) => a.selected && (!a.protected || (a.dust && a.sweepable)),
  );
  const lockedAssets = assets.filter((a) => a.protected && !a.dust);
  const dustAssets = assets.filter((a) => a.dust);
  const reviewable = assets.filter((a) => !a.protected);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <WalletDialog />
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/" aria-label="Pyre home" className="text-foreground">
            <Logo />
          </Link>
          {connected && address ? (
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              className="font-mono text-xs"
            >
              {demo ? "Demo" : ""} {shortAddress(address)}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setOpen(true)}>
              Connect
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-8">
        <Stepper current={current} />

        {status === "idle" && !connected ? (
          <section className="flex flex-1 flex-col justify-center gap-6 py-8">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Robinhood Chain · 4663
            </p>
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
              Connect, review, then sign.
            </h1>
            <p className="max-w-md text-muted-foreground">
              Pyre scans tokens, NFTs, and leftover approvals. Spam is selected
              for you. Stock Tokens stay locked. Nothing moves until you sign.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setOpen(true)}>
                <Wallet />
                Connect wallet
              </Button>
              <Button size="lg" variant="outline" onClick={enterDemo}>
                Preview the flow
              </Button>
            </div>
          </section>
        ) : null}

        {status === "scanning" ? (
          <section className="flex flex-1 flex-col items-start justify-center gap-4 py-16">
            <LoaderCircle className="size-6 animate-spin text-primary" />
            <h1 className="font-display text-3xl tracking-tight">
              Reading the wallet.
            </h1>
            <p className="scan-line text-sm text-muted-foreground">
              Tokens, NFTs, and allowances on Robinhood Chain…
            </p>
          </section>
        ) : null}

        {scanError ? (
          <div className="rounded-md bg-surface px-4 py-3 text-sm shadow-[var(--shadow-border)]">
            <p className="text-destructive">{scanError}</p>
            <Button variant="ghost" className="mt-2" onClick={() => runScan()}>
              Retry scan
            </Button>
          </div>
        ) : null}

        {status === "ready" ? (
          <section className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-3xl tracking-tight">
                {summary.actions} item{summary.actions === 1 ? "" : "s"} to
                clear.
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {summary.burns} burns · {summary.sweeps} sweeps ·{" "}
                {summary.approvals} revokes · {summary.dustSwaps} dust
              </p>
              {summary.recoveredWei > 0n ? (
                <p className="mt-1 font-mono text-sm tabular-nums text-primary">
                  Recover {formatFeeEth(summary.recoveredWei)} after a{" "}
                  {formatFeeEth(summary.cutWei)} cut
                </p>
              ) : null}
              <p className="mt-1 font-mono text-sm tabular-nums text-primary">
                {!demo && !treasuryIsLive() && summary.feeWei > 0n
                  ? "Batch fee paused — treasury not set"
                  : summary.feeWei > 0n
                    ? `Batch fee ${formatFeeEth(summary.feeWei)}`
                    : "No protocol fee — single action"}
              </p>
            </div>

            <div
              className="grid grid-cols-3 gap-1 rounded-md bg-surface p-1"
              role="tablist"
              aria-label="Cleanup mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "safe"}
                onClick={() => setMode("safe")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-sm text-sm transition-colors duration-150",
                  mode === "safe"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Shield className="size-3.5" />
                Safe
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "sweep"}
                onClick={() => setMode("sweep")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-sm text-sm transition-colors duration-150",
                  mode === "sweep"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ArrowLeftRight className="size-3.5" />
                Sweep
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "burn"}
                onClick={() => setMode("burn")}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-sm text-sm transition-colors duration-150",
                  mode === "burn"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ShieldAlert className="size-3.5" />
                Review
              </button>
            </div>

            {summary.actions === 0 && lockedAssets.length === 0 && dustAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing to clear. This wallet looks clean.
              </p>
            ) : null}

            <div className="rounded-2xl bg-card p-2 shadow-[var(--shadow-border)]">
              {reviewable.length > 0 ? (
                <ul className="flex flex-col">
                  {reviewable.map((asset) => (
                    <li key={asset.id}>
                      <AssetRow
                        asset={asset}
                        mode={mode}
                        interactive
                        onToggle={() => toggleAsset(asset.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              {dustAssets.length > 0 ? (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
                    Stock Token dust — swap only, never burn
                  </p>
                  <ul>
                    {dustAssets.map((asset) => (
                      <li key={asset.id}>
                        <AssetRow
                          asset={asset}
                          mode={mode}
                          interactive={Boolean(asset.sweepable)}
                          onToggle={() => toggleAsset(asset.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {lockedAssets.length > 0 ? (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
                    Locked
                  </p>
                  <ul>
                    {lockedAssets.map((asset) => (
                      <li key={asset.id}>
                        <AssetRow asset={asset} mode={mode} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              {mode === "safe"
                ? "Safe mode burns spam and revokes leftovers. It will not sweep or touch Stock Tokens."
                : mode === "sweep"
                  ? "Sweep sells spam with a real ETH route, takes 1.25%, and burns the rest. Dust Stock Tokens swap only when the quote clears gas plus the batch fee. They are never burned."
                  : "Review lets you tick extra tokens and NFTs. Locked holdings cannot be selected. Burns cannot be undone."}{" "}
              {summary.feeWei > 0n
                ? "A flat batch fee is charged once in ETH before any line runs."
                : "One action stays free. Select two or more and a flat batch fee applies."}
            </p>

            <div className="sticky bottom-0 -mx-5 border-t border-border bg-background px-5 py-4">
              <Button
                size="lg"
                className="w-full"
                onClick={clean}
                disabled={summary.actions <= 0}
              >
                <Flame />
                {summary.feeWei > 0n
                  ? `Sign ${summary.actions} actions · ${formatFeeEth(summary.feeWei)}`
                  : `Sign ${summary.actions} free action`}
              </Button>
            </div>
          </section>
        ) : null}

        {status === "signing" ? (
          <section className="flex flex-col gap-6">
            <h1 className="font-display text-3xl tracking-tight">
              {summary.feeWei > 0n
                ? "Pay the fee, then sign each action."
                : "Sign this action."}
            </h1>
            <p className="text-sm text-muted-foreground">
              {summary.feeWei > 0n
                ? "The batch fee is collected first. If that payment fails, nothing is burned."
                : "Single actions stay free. You only pay network gas."}
            </p>
            <div className="rounded-2xl bg-card p-2 shadow-[var(--shadow-border)]">
              <ul>
                {summary.feeWei > 0n ? (
                  <li>
                    <FeeRow
                      feeWei={summary.feeWei}
                      status={feeStatus}
                      active={currentId === PROTOCOL_FEE_ID}
                    />
                  </li>
                ) : null}
                {selected.map((asset) => (
                  <li key={asset.id}>
                    <AssetRow
                      asset={asset}
                      mode={mode}
                      active={asset.id === currentId}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {status === "done" && lastClean ? (
          <section className="flex flex-col gap-6">
            <h1 className="font-display text-3xl tracking-tight">
              Wallet cleaned.
            </h1>
            <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-border)]">
              <p className="font-mono text-4xl tabular-nums text-primary">
                {lastClean.tokens +
                  lastClean.nfts +
                  lastClean.approvals +
                  lastClean.swept +
                  lastClean.dustSwaps}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                actions confirmed
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Tokens burned</dt>
                  <dd className="font-mono tabular-nums">{lastClean.tokens}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Swept to ETH</dt>
                  <dd className="font-mono tabular-nums">{lastClean.swept}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">NFTs burned</dt>
                  <dd className="font-mono tabular-nums">{lastClean.nfts}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dust swapped</dt>
                  <dd className="font-mono tabular-nums">
                    {lastClean.dustSwaps}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Approvals revoked</dt>
                  <dd className="font-mono tabular-nums">
                    {lastClean.approvals}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Failed</dt>
                  <dd className="font-mono tabular-nums">{lastClean.failed}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ETH recovered</dt>
                  <dd className="font-mono tabular-nums">
                    {formatFeeEth(lastClean.recoveredWei)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Protocol cut</dt>
                  <dd className="font-mono tabular-nums">
                    {formatFeeEth(lastClean.cutWei)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Protocol fee</dt>
                  <dd className="font-mono tabular-nums">
                    {lastClean.feeWei > 0n
                      ? lastClean.feePaid
                        ? formatFeeEth(lastClean.feeWei)
                        : "Not paid — batch aborted"
                      : "None"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => runScan()}>
                Scan again
              </Button>
              <Button size="lg" variant="outline" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
