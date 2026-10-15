import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AssetGroup } from "@/components/cleaner/asset-group";
import { AssetRow } from "@/components/cleaner/asset-row";
import { ModeTabs } from "@/components/cleaner/mode-tabs";
import { MODE_HINTS } from "@/components/cleaner/modes";
import { Notice } from "@/components/cleaner/notice";
import { SignBar } from "@/components/cleaner/sign-bar";
import { Button } from "@/components/ui/button";
import { estimate, useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

type CleanerState = ReturnType<typeof useWalletCleaner>;
type CleanerAsset = CleanerState["assets"][number];

function DismissedControl({
  count,
  shown,
  demo,
  onToggle,
}: Readonly<{
  count: number;
  shown: boolean;
  demo: boolean;
  onToggle: () => void;
}>) {
  if (count === 0 && !shown) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={shown ? "default" : "outline"}
        onClick={onToggle}
        disabled={demo}
      >
        {shown ? <Eye /> : <EyeOff />}
        {shown ? "Hide dismissed" : `Show dismissed (${count})`}
      </Button>
      {shown ? (
        <p className="text-xs text-muted-foreground">Restored tokens reappear on the next scan.</p>
      ) : null}
    </div>
  );
}

function EmptyState({ count }: { count: number }) {
  return count > 0 ? (
    <Notice tone="info" title="Nothing visible">
      {count} hidden item{count === 1 ? "" : "s"}. Show dismissed to restore them.
    </Notice>
  ) : (
    <Notice tone="success" title="This wallet looks clean">
      No spam, bait NFTs or leftover approvals were found.
    </Notice>
  );
}

function AssetGroups({
  reviewable,
  dust,
  locked,
  dismissedAssets,
  showDismissed,
  mode,
  demo,
  toggleAsset,
  dismiss,
  restoreDismissed,
}: Readonly<{
  reviewable: CleanerAsset[];
  dust: CleanerAsset[];
  locked: CleanerAsset[];
  dismissedAssets: CleanerAsset[];
  showDismissed: boolean;
  mode: CleanerState["mode"];
  demo: boolean;
  toggleAsset: CleanerState["toggleAsset"];
  dismiss: CleanerState["dismiss"];
  restoreDismissed: CleanerState["undismiss"];
}>) {
  return (
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
                onRestore={demo ? undefined : () => restoreDismissed(asset.id)}
              />
            </li>
          ))}
        </AssetGroup>
      ) : null}
    </div>
  );
}

function FeeHint({ feeWei, credits }: Readonly<{ feeWei: bigint; credits: number }>) {
  if (feeWei > 0n && credits >= 1) return <>One credit will waive the batch fee for this clean.</>;
  if (feeWei > 0n) return <>A flat batch fee is charged once in ETH before any line runs.</>;
  return <>One action stays free. Select two or more and a flat batch fee applies.</>;
}

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
    undismiss: restoreDismissed,
    toggleShowDismissed,
    clean,
  } = useWalletCleaner();

  const summary = estimate(assets, mode);
  const reviewable = assets.filter((a) => !a.protected && !isDismissed(a.id));
  const dust = assets.filter((a) => a.dust && !isDismissed(a.id));
  const locked = assets.filter((a) => a.protected && !a.dust && !isDismissed(a.id));
  const dismissedAssets = assets.filter((a) => isDismissed(a.id));

  const nameOf = (id: string) => assets.find((a) => a.id === id)?.name ?? "Item";
  const hideAsset = (id: string) => {
    const name = nameOf(id);
    dismiss(id);
    toast.success(`${name} hidden`, {
      description: "It will stay out of future scans.",
      action: { label: "Undo", onClick: () => restoreDismissed(id) },
    });
  };
  const restoreAsset = (id: string) => {
    const name = nameOf(id);
    restoreDismissed(id);
    toast.success(`${name} restored`, { description: "Rescanning so it shows up again." });
  };
  const isEmpty = reviewable.length + dust.length + locked.length + dismissedAssets.length === 0;
  const willWaiveFee = summary.feeWei > 0n && credits >= 1;

  return (
    <section className="flex flex-col gap-4">
      <ModeTabs mode={mode} onChange={setMode} />

      <DismissedControl
        count={dismissedCount}
        shown={showDismissed}
        demo={demo}
        onToggle={toggleShowDismissed}
      />

      {isEmpty ? (
        <EmptyState count={dismissedCount} />
      ) : (
        <AssetGroups
          reviewable={reviewable}
          dust={dust}
          locked={locked}
          dismissedAssets={dismissedAssets}
          showDismissed={showDismissed}
          mode={mode}
          demo={demo}
          toggleAsset={toggleAsset}
          dismiss={hideAsset}
          restoreDismissed={restoreAsset}
        />
      )}

      <p className="text-xs text-muted-foreground">
        {MODE_HINTS[mode]} <FeeHint feeWei={summary.feeWei} credits={credits} />
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
