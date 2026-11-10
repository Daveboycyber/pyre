import { Eye, EyeOff } from "lucide-react";
import { confirmDialog } from "@/lib/dialogs";
import { formatFeeEth } from "@/lib/web3/fees";
import { WIF_FEE_LABEL } from "@/lib/web3/wif";
import { notify } from "@/lib/notify";
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

function FeeHint({
  feeWei,
  credits,
  canPayWif,
}: Readonly<{ feeWei: bigint; credits: number; canPayWif: boolean }>) {
  if (feeWei > 0n && credits >= 1) {
    return <>One credit will waive the batch fee for this clean.</>;
  }
  if (feeWei > 0n && canPayWif) {
    return (
      <>
        The batch fee is {WIF_FEE_LABEL}, sent once to the Pyre treasury before any line runs. Gas
        stays in ETH.
      </>
    );
  }
  if (feeWei > 0n) {
    return (
      <>
        The batch fee is {WIF_FEE_LABEL}. This wallet holds less than that, so this clean pays{" "}
        {formatFeeEth(feeWei)} instead. Top up $WIF and rescan to pay in $WIF.
      </>
    );
  }
  return (
    <>
      One action stays free. Select two or more and a flat {WIF_FEE_LABEL} batch fee applies.
    </>
  );
}

/** The "ready" step: pick a mode, adjust the list, then sign. */
export function ReviewPanel() {
  const {
    assets,
    mode,
    demo,
    credits,
    canPayWif,
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
    notify.success(`${name} hidden`, {
      description: "It will stay out of future scans.",
      action: { label: "Undo", onClick: () => restoreDismissed(id) },
    });
  };
  const restoreAsset = (id: string) => {
    const name = nameOf(id);
    restoreDismissed(id);
    notify.success(`${name} restored`, { description: "Rescanning so it shows up again." });
  };
  const isEmpty = reviewable.length + dust.length + locked.length + dismissedAssets.length === 0;
  const willWaiveFee = summary.feeWei > 0n && credits >= 1;

  const confirmAndSign = async () => {
    const n = summary.actions;
    let fee = "Free";
    if (willWaiveFee) fee = "Waived (1 credit)";
    else if (summary.feeWei > 0n) {
      fee = canPayWif
        ? WIF_FEE_LABEL
        : `${formatFeeEth(summary.feeWei)} (under ${WIF_FEE_LABEL} held)`;
    }
    const ok = await confirmDialog({
      tone: "warning",
      title: `Sign ${n} action${n === 1 ? "" : "s"}?`,
      description: demo
        ? "Demo run. Nothing is signed or sent."
        : "Burns and revokes cannot be undone. Your wallet will ask you to approve each line.",
      details: [
        { label: "Mode", value: mode[0].toUpperCase() + mode.slice(1) },
        { label: "Actions", value: String(n) },
        { label: "Batch fee", value: fee },
      ],
      confirmLabel: "Start signing",
      cancelLabel: "Not yet",
    });
    if (ok) void clean();
  };

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
        {MODE_HINTS[mode]} <FeeHint feeWei={summary.feeWei} credits={credits} canPayWif={canPayWif} />
      </p>

      <SignBar
        actions={summary.actions}
        feeWei={summary.feeWei}
        waived={willWaiveFee}
        preferWif={!willWaiveFee && summary.feeWei > 0n && canPayWif}
        onSign={() => void confirmAndSign()}
      />
    </section>
  );
}
