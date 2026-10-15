import { Check, CircleAlert, EyeOff, LoaderCircle, Lock, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatFeeEth } from "@/lib/web3/fees";
import { selectedAction, sweepNetWei } from "@/lib/web3/sweep";
import type { Mode } from "@/lib/web3/types";
import type { WalletAsset } from "@/lib/web3/use-wallet-cleaner";

type TxStatus = "idle" | "pending" | "done" | "failed";

// cspell:ignore sweepable

/** Done / failed / in-flight marker shared by fee and asset rows; empty box when idle. */
function TxStatusIcon({ status, active }: { readonly status?: TxStatus; readonly active?: boolean }) {
  if (status === "done") return <Check className="size-4 shrink-0 text-primary" />;
  if (status === "failed") return <CircleAlert className="size-4 shrink-0 text-destructive" />;
  if (status === "pending" || active) {
    return <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />;
  }
  return <span className="size-4 shrink-0 rounded-sm shadow-(--shadow-border)" />;
}

function actionLabel(asset: WalletAsset, mode: Mode) {
  const action = selectedAction(asset, mode);
  if (action === "dust-swap") return "Swap dust";
  if (action === "sweep") return "Sweep";
  if (asset.kind === "approval") return "Revoke";
  if (asset.kind === "nft") return "Burn NFT";
  return "Burn";
}

export function FeeRow({
  active,
  status,
}: {
  readonly active?: boolean;
  readonly status?: "idle" | "pending" | "done" | "failed";
}) {
  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md px-3 py-2",
        active && "lime-pulse bg-background",
      )}
    >
      <TxStatusIcon status={status} active={active} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">Protocol fee</span>
        <span className="block font-mono text-xs text-muted-foreground">
          Flat batch fee · treasury
        </span>
      </span>
    </div>
  );
}

export function AssetRow({
  asset,
  interactive,
  onToggle,
  onDismiss,
  onRestore,
  dismissed,
  active,
  mode,
}: {
  readonly asset: WalletAsset;
  readonly interactive?: boolean;
  readonly onToggle?: () => void;
  readonly onDismiss?: () => void;
  readonly onRestore?: () => void;
  readonly dismissed?: boolean;
  readonly active?: boolean;
  readonly mode: Mode;
}) {
  const status = asset.txStatus;
  let leadingIcon: ReactNode;
  if (dismissed) {
    leadingIcon = <EyeOff className="size-4 shrink-0 text-muted-foreground" />;
  } else if (interactive && (!asset.protected || (asset.dust && asset.sweepable))) {
    leadingIcon = (
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={asset.selected}
        disabled={asset.protected && !(asset.dust && asset.sweepable)}
        onChange={onToggle}
      />
    );
  } else if (status === "done" || status === "failed" || status === "pending" || active) {
    leadingIcon = <TxStatusIcon status={status} active={active} />;
  } else if (asset.protected) {
    leadingIcon = <Lock className="size-4 shrink-0 text-muted-foreground" />;
  } else {
    leadingIcon = <TxStatusIcon />;
  }

  let assetDetail = "";
  if (!dismissed) {
    if (asset.protected && !asset.dust) {
      assetDetail = " · locked";
    } else if (asset.dust && !asset.sweepable) {
      assetDetail = " · below gas";
    } else if (asset.quoteWei) {
      assetDetail = ` · ${formatFeeEth(sweepNetWei(asset.quoteWei))} net`;
    } else {
      assetDetail = ` · ${asset.amount}`;
    }
  }
  const subtitle = dismissed
    ? `hidden · ${asset.symbol}`
    : `${actionLabel(asset, mode)} · ${asset.symbol}${assetDetail}`;

  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md px-3 py-2",
        active && "lime-pulse bg-background",
        (asset.protected || dismissed) && "opacity-60",
        !asset.protected && !dismissed && interactive && "hover:bg-background",
      )}
    >
      {leadingIcon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{asset.name}</span>
        <span className="block font-mono text-xs text-muted-foreground">
          {subtitle}
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
