import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Flame,
  LoaderCircle,
  Lock,
  Shield,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { WalletDialog } from "@/components/wallet-dialog";
import { cn } from "@/lib/utils";
import { explorerTxUrl } from "@/lib/web3/blockscout";
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
  const action = selectedAction(asset, mode);
  if (action === "dust-swap") return "Swap dust";
  if (action === "sweep") return "Sweep";
  if (asset.kind === "approval") return "Revoke";
  if (asset.kind === "nft") return "Burn NFT";
  return "Burn";
}

function FeeRow({
  active,
  status,
}: {
  active?: boolean;
  status?: "idle" | "pending" | "done" | "failed";
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
        <span className="block truncate text-sm">Protocol fee</span>
        <span className="block font-mono text-xs text-muted-foreground">
          Flat batch fee · treasury
        </span>
      </span>
    </div>
  );
}

function AssetRow({
  asset,
  interactive,
  onToggle,
  onDismiss,
  onRestore,
  dismissed,
  active,
  mode,
}: {
  asset: WalletAsset;
  interactive?: boolean;
  onToggle?: () => void;
  onDismiss?: () => void;
  onRestore?: () => void;
  dismissed?: boolean;
  active?: boolean;
  mode: Mode;
}) {
  const status = asset.txStatus;
  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md px-3 py-2",
        active && "lime-pulse bg-background",
        (asset.protected || dismissed) && "opacity-60",
        !asset.protected && !dismissed && interactive && "hover:bg-background",
      )}
    >
      {dismissed ? (
        <EyeOff className="size-4 shrink-0 text-muted-foreground" />
      ) : interactive && (!asset.protected || (asset.dust && asset.sweepable)) ? (
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={asset.selected}
          disabled={asset.protected && !(asset.dust && asset.sweepable)}
          onChange={onToggle}
        />
      ) : status === "done" ? (
        <Check className="size-4 shrink-0 text-primary" />
      ) : status === "failed" ? (
        <CircleAlert className="size-4 shrink-0 text-destructive" />
      ) : status === "pending" || active ? (
        <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
      ) : asset.protected ? (
        <Lock className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <span className="size-4 shrink-0 rounded-sm shadow-[var(--shadow-border)]" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{asset.name}</span>
        <span className="block font-mono text-xs text-muted-foreground">
          {dismissed
            ? `hidden · ${asset.symbol}`
            : `${actionLabel(asset, mode)} · ${asset.symbol}`}
          {!dismissed &&
            (asset.protected && !asset.dust
              ? " · locked"
              : asset.dust && !asset.sweepable
                ? " · below gas"
                : asset.quoteWei
                  ? ` · ${formatFeeEth(sweepNetWei(asset.quoteWei))} net`
                  : ` · ${asset.amount}`)}
        </span>
      </span>
      {dismissed && onRestore ? (
        <button
          type="button"
          onClick={onRestore}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-primary hover:bg-background"
        >
          Restore
        </button>
      ) : null}
      {!dismissed && onDismiss && !asset.protected ? (
        <button
          type="button"
          onClick={onDismiss}
          title="Hide from scans"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Cleanup steps">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={cn(
            "rounded-md px-2 py-1.5 text-center text-xs",
            i === current
              ? "bg-primary text-primary-foreground"
              : i < current
                ? "bg-card text-foreground shadow-[var(--shadow-border)]"
                : "text-muted-foreground",
          )}
        >
          {label}
        </li>
      ))}
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
    credits,
    demo,
    dismissedCount,
    isDismissed,
    showDismissed,
    setOpen,
    enterDemo,
    setMode,
    toggleAsset,
    dismiss,
    undismiss,
    toggleShowDismissed,
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
  const reviewable = assets.filter((a) => !a.protected && !isDismissed(a.id));
  const dismissedAssets = assets.filter((a) => isDismissed(a.id));
  const visibleDust = dustAssets.filter((a) => !isDismissed(a.id));
  const visibleLocked = lockedAssets.filter((a) => !isDismissed(a.id));
  const willWaiveFee = summary.feeWei > 0n && credits >= 1;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="text-sm font-medium">Pyre</span>
          </Link>
          {connected ? (
            <Button size="sm" variant="outline" onClick={() => void disconnect()}>
              {demo ? "Exit demo" : shortAddress(address)}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setOpen(true)}>
              Connect
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-5 px-5 py-6">
        <Stepper current={current} />

        {status === "idle" && !connected ? (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Robinhood Chain · 4663
            </p>
            <h1 className="text-2xl font-medium tracking-tight">
              Clean spam without touching Stock Tokens.
            </h1>
            <p className="text-sm text-muted-foreground">
              Connect a wallet, scan junk, and burn or sweep. Locked holdings stay
              protected. Nothing moves until you sign.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
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
          <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 shadow-[var(--shadow-border)]">
            <LoaderCircle className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Scanning wallet…</p>
          </section>
        ) : null}

        {scanError ? (
          <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
            <p className="text-sm text-destructive">{scanError}</p>
            <Button variant="ghost" className="mt-2" onClick={() => runScan()}>
              Try again
            </Button>
          </section>
        ) : null}

        {status === "ready" ? (
          <section className="flex flex-col gap-4">
            <div className="flex gap-2" role="tablist" aria-label="Cleanup mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "safe"}
                onClick={() => setMode("safe")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm",
                  mode === "safe"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card shadow-[var(--shadow-border)]",
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
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm",
                  mode === "sweep"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card shadow-[var(--shadow-border)]",
                )}
              >
                <ArrowLeftRight className="size-3.5" />
                Sweep
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "review"}
                onClick={() => setMode("review")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm",
                  mode === "review"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card shadow-[var(--shadow-border)]",
                )}
              >
                <ShieldAlert className="size-3.5" />
                Review
              </button>
            </div>

            {dismissedCount > 0 || showDismissed ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={showDismissed ? "default" : "outline"}
                  onClick={toggleShowDismissed}
                  disabled={demo}
                >
                  {showDismissed ? <Eye /> : <EyeOff />}
                  {showDismissed
                    ? "Hide dismissed"
                    : `Show dismissed${dismissedCount > 0 ? ` (${dismissedCount})` : ""}`}
                </Button>
                {showDismissed ? (
                  <p className="text-xs text-muted-foreground">
                    Restored tokens reappear on the next scan.
                  </p>
                ) : null}
              </div>
            ) : null}

            {reviewable.length === 0 &&
            visibleLocked.length === 0 &&
            visibleDust.length === 0 &&
            dismissedAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {dismissedCount > 0
                  ? `Nothing visible — ${dismissedCount} hidden. Show dismissed to restore.`
                  : "Nothing to clear. This wallet looks clean."}
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
                        onDismiss={
                          demo ? undefined : () => dismiss(asset.id)
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              {visibleDust.length > 0 ? (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
                    Stock Token dust — swap only, never burn
                  </p>
                  <ul>
                    {visibleDust.map((asset) => (
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
              {visibleLocked.length > 0 ? (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
                    Locked
                  </p>
                  <ul>
                    {visibleLocked.map((asset) => (
                      <li key={asset.id}>
                        <AssetRow asset={asset} mode={mode} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {showDismissed && dismissedAssets.length > 0 ? (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
                    Dismissed
                  </p>
                  <ul>
                    {dismissedAssets.map((asset) => (
                      <li key={asset.id}>
                        <AssetRow
                          asset={asset}
                          mode={mode}
                          dismissed
                          onRestore={
                            demo ? undefined : () => undismiss(asset.id)
                          }
                        />
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
              {willWaiveFee
                ? "One credit will waive the batch fee for this clean."
                : summary.feeWei > 0n
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
                {willWaiveFee
                  ? `Sign ${summary.actions} actions · fee waived`
                  : summary.feeWei > 0n
                    ? `Sign ${summary.actions} actions · ${formatFeeEth(summary.feeWei)}`
                    : `Sign ${summary.actions} free action`}
              </Button>
            </div>
          </section>
        ) : null}

        {status === "signing" ? (
          <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
            <p className="text-sm text-muted-foreground">Signing in wallet…</p>
            <ul className="flex flex-col">
              {(feeStatus === "pending" ||
                feeStatus === "done" ||
                feeStatus === "failed") &&
              (summary.feeWei > 0n || feeStatus !== "idle") ? (
                <li>
                  <FeeRow
                    active={currentId === PROTOCOL_FEE_ID}
                    status={feeStatus}
                  />
                </li>
              ) : null}
              {selected.map((asset) => (
                <li key={asset.id}>
                  <AssetRow
                    asset={asset}
                    mode={mode}
                    active={currentId === asset.id}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {status === "done" && lastClean ? (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
            <h2 className="text-lg font-medium">
              {lastClean.failed > 0 &&
              lastClean.tokens +
                lastClean.nfts +
                lastClean.approvals +
                lastClean.swept +
                lastClean.dustSwaps ===
                0
                ? "Clean failed."
                : lastClean.failed > 0
                  ? "Clean finished with errors."
                  : "Clean complete."}
            </h2>
            {lastClean.error ? (
              <p className="text-sm text-destructive">{lastClean.error}</p>
            ) : null}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Actions</dt>
                <dd className="font-mono tabular-nums">
                  {lastClean.tokens +
                    lastClean.nfts +
                    lastClean.approvals +
                    lastClean.swept +
                    lastClean.dustSwaps}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Tokens burned</dt>
                <dd className="font-mono tabular-nums">{lastClean.tokens}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Swept</dt>
                <dd className="font-mono tabular-nums">{lastClean.swept}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">NFTs</dt>
                <dd className="font-mono tabular-nums">{lastClean.nfts}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Dust swaps</dt>
                <dd className="font-mono tabular-nums">
                  {lastClean.dustSwaps}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Approvals</dt>
                <dd className="font-mono tabular-nums">
                  {lastClean.approvals}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Failed</dt>
                <dd className="font-mono tabular-nums">{lastClean.failed}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Recovered</dt>
                <dd className="font-mono tabular-nums">
                  {formatFeeEth(lastClean.recoveredWei)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Cut</dt>
                <dd className="font-mono tabular-nums">
                  {formatFeeEth(lastClean.cutWei)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Fee</dt>
                <dd className="font-mono tabular-nums">
                  {lastClean.feeWaived
                    ? "waived"
                    : lastClean.feeWei > 0n
                      ? lastClean.feePaid
                        ? formatFeeEth(lastClean.feeWei)
                        : "unpaid"
                      : "free"}
                </dd>
              </div>
            </dl>
            {lastClean.txs && lastClean.txs.length > 0 ? (
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Sweep receipts
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {lastClean.txs.map((tx) => (
                    <li key={tx.hash} className="flex justify-between gap-2">
                      <span>{tx.label}</span>
                      <a
                        className="font-mono text-xs text-primary"
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" onClick={() => runScan()}>
                Scan again
              </Button>
              <Button size="lg" variant="outline" onClick={() => void disconnect()}>
                Disconnect
              </Button>
            </div>
          </section>
        ) : null}

        <WalletDialog />
      </main>
    </div>
  );
}
