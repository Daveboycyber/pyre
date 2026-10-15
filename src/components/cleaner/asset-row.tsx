import { EyeOff, Lock, X } from "lucide-react";
import { TxStatusIcon } from "@/components/cleaner/tx-status-icon";
import { cn } from "@/lib/utils";
import { formatFeeEth } from "@/lib/web3/fees";
import { selectedAction, sweepNetWei } from "@/lib/web3/sweep";
import type { Mode, WalletAsset } from "@/lib/web3/types";

function actionLabel(asset: WalletAsset, mode: Mode) {
  const action = selectedAction(asset, mode);
  if (action === "dust-swap") return "Swap dust";
  if (action === "sweep") return "Sweep";
  if (asset.kind === "approval") return "Revoke";
  if (asset.kind === "nft") return "Burn NFT";
  return "Burn";
}

function detail(asset: WalletAsset) {
  if (asset.protected && !asset.dust) return "locked";
  if (asset.dust && !asset.sweepable) return "below gas";
  if (asset.quoteWei) return `${formatFeeEth(sweepNetWei(asset.quoteWei))} net`;
  return asset.amount;
}

function canSelect(asset: WalletAsset) {
  return !asset.protected || Boolean(asset.dust && asset.sweepable);
}

function LeadingIcon({
  asset,
  interactive,
  dismissed,
  active,
  onToggle,
}: {
  readonly asset: WalletAsset;
  readonly interactive?: boolean;
  readonly dismissed?: boolean;
  readonly active?: boolean;
  readonly onToggle?: () => void;
}) {
  if (dismissed) return <EyeOff className="size-4 shrink-0 text-muted-foreground" />;
  if (interactive && canSelect(asset)) {
    return (
      <input
        type="checkbox"
        className="size-4 accent-primary"
        aria-label={`Select ${asset.name}`}
        checked={asset.selected}
        onChange={onToggle}
      />
    );
  }
  if (asset.txStatus || active) return <TxStatusIcon status={asset.txStatus} active={active} />;
  if (asset.protected) return <Lock className="size-4 shrink-0 text-muted-foreground" />;
  return <TxStatusIcon />;
}

export function AssetRow({
  asset,
  mode,
  interactive,
  dismissed,
  active,
  onToggle,
  onDismiss,
  onRestore,
}: {
  readonly asset: WalletAsset;
  readonly mode: Mode;
  readonly interactive?: boolean;
  readonly dismissed?: boolean;
  readonly active?: boolean;
  readonly onToggle?: () => void;
  readonly onDismiss?: () => void;
  readonly onRestore?: () => void;
}) {
  const failed = asset.txStatus === "failed";
  const subtitle = dismissed
    ? `hidden · ${asset.symbol}`
    : `${actionLabel(asset, mode)} · ${asset.symbol} · ${detail(asset)}`;

  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md px-3 py-2 transition-colors duration-200",
        active && "lime-pulse bg-background",
        failed && "bg-destructive/6",
        (asset.protected || dismissed) && "opacity-60",
        !asset.protected && !dismissed && interactive && "hover:bg-background",
      )}
    >
      <LeadingIcon
        asset={asset}
        interactive={interactive}
        dismissed={dismissed}
        active={active}
        onToggle={onToggle}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{asset.name}</span>
        <span className="block truncate font-mono text-xs text-muted-foreground">{subtitle}</span>
        {failed && asset.txError ? (
          <span className="mt-0.5 block text-xs text-destructive">{asset.txError}</span>
        ) : null}
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
          aria-label={`Hide ${asset.name} from scans`}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
