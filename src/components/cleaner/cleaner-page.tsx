import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Eye,
  EyeOff,
  Flame,
  LoaderCircle,
  Shield,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { AssetRow, FeeRow } from "@/components/cleaner/asset-row";
import { stepIndex } from "@/components/cleaner/steps";
import { Stepper } from "@/components/cleaner/stepper";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WalletDialog } from "@/components/wallet/wallet-dialog";
import { cn } from "@/lib/utils";
import { explorerTxUrl } from "@/lib/web3/blockscout";
import { formatFeeEth, PROTOCOL_FEE_ID } from "@/lib/web3/fees";
import { estimate, shortAddress, useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

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
            <Logo />
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
            <Eyebrow>Robinhood Chain · 4663</Eyebrow>
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
