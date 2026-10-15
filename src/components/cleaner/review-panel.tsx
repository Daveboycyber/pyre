import { Eye, EyeOff } from "lucide-react";
import { AssetGroup } from "@/components/cleaner/asset-group";
import { AssetRow } from "@/components/cleaner/asset-row";
import { ModeTabs } from "@/components/cleaner/mode-tabs";
import { MODE_HINTS } from "@/components/cleaner/modes";
import { Notice } from "@/components/cleaner/notice";
import { SignBar } from "@/components/cleaner/sign-bar";
import { Button } from "@/components/ui/button";
import { estimate, useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

/** The "ready" step: pick a mode, adjust the list, then sign. */
export function ReviewPanel() {
  const {
    assets,
    mode,
    demo,
    credits,
    dismissedCount,
    showDismissed,
    isDismissed,
    setMode,
    toggleAsset,
    dismiss,
    undismiss,
    toggleShowDismissed,
    clean,
  } = useWalletCleaner();

  const summary = estimate(assets, mode);
  const reviewable = assets.filter((a) => !a.protected && !isDismissed(a.id));
  const dust = assets.filter((a) => a.dust && !isDismissed(a.id));
  const locked = assets.filter((a) => a.protected && !a.dust && !isDismissed(a.id));
  const dismissedAssets = assets.filter((a) => isDismissed(a.id));
  const isEmpty = reviewable.length + dust.length + locked.length + dismissedAssets.length === 0;
  const willWaiveFee = summary.feeWei > 0n && credits >= 1;

  let feeHint = "One action stays free. Select two or more and a flat batch fee applies.";
  if (willWaiveFee) feeHint = "One credit will waive the batch fee for this clean.";
  else if (summary.feeWei > 0n) {
    feeHint = "A flat batch fee is charged once in ETH before any line runs.";
  }

  return (
    <section className="flex flex-col gap-4">
      <ModeTabs mode={mode} onChange={setMode} />

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
            {showDismissed ? "Hide dismissed" : `Show dismissed (${dismissedCount})`}
          </Button>
          {showDismissed ? (
            <p className="text-xs text-muted-foreground">
              Restored tokens reappear on the next scan.
            </p>
          ) : null}
        </div>
      ) : null}

      {isEmpty ? (
        dismissedCount > 0 ? (
          <Notice tone="info" title="Nothing visible">
            {dismissedCount} hidden item{dismissedCount === 1 ? "" : "s"}. Show dismissed to restore
            them.
          </Notice>
        ) : (
          <Notice tone="success" title="This wallet looks clean">
            No spam, bait NFTs or leftover approvals were found.
          </Notice>
        )
      ) : (
        <div className="rounded-2xl bg-card p-2 shadow-[var(--shadow-border)]">
          {reviewable.length > 0 ? (
            <AssetGroup>
              {reviewable.map((asset) => (
                <li key={asset.id}>
                  <AssetRow
                    asset={asset}
                    mode={mode}
                    interactive
                    onToggle={() => toggleAsset(asset.id)}
                    onDismiss={demo ? undefined : () => dismiss(asset.id)}
                  />
                </li>
              ))}
            </AssetGroup>
          ) : null}
          {dust.length > 0 ? (
            <AssetGroup title="Stock Token dust — swap only, never burn">
              {dust.map((asset) => (
                <li key={asset.id}>
                  <AssetRow
                    asset={asset}
                    mode={mode}
                    interactive={Boolean(asset.sweepable)}
                    onToggle={() => toggleAsset(asset.id)}
                  />
                </li>
              ))}
            </AssetGroup>
          ) : null}
          {locked.length > 0 ? (
            <AssetGroup title="Locked">
              {locked.map((asset) => (
                <li key={asset.id}>
                  <AssetRow asset={asset} mode={mode} />
                </li>
              ))}
            </AssetGroup>
          ) : null}
          {showDismissed && dismissedAssets.length > 0 ? (
            <AssetGroup title="Dismissed">
              {dismissedAssets.map((asset) => (
                <li key={asset.id}>
                  <AssetRow
                    asset={asset}
                    mode={mode}
                    dismissed
                    onRestore={demo ? undefined : () => undismiss(asset.id)}
                  />
                </li>
              ))}
            </AssetGroup>
          ) : null}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {MODE_HINTS[mode]} {feeHint}
      </p>

      <SignBar
        actions={summary.actions}
        feeWei={summary.feeWei}
        waived={willWaiveFee}
        onSign={() => void clean()}
      />
    </section>
  );
}
