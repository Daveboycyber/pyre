import { TxStatusIcon, type TxStatus } from "@/components/cleaner/tx-status-icon";
import { cn } from "@/lib/utils";

export function FeeRow({
  active,
  status,
  paidWithWif,
  wifFeeLabel,
}: Readonly<{
  active?: boolean;
  status?: TxStatus;
  paidWithWif?: boolean;
  wifFeeLabel: string;
}>) {
  const subtitle =
    status === "failed"
      ? "Not paid · no burns started"
      : paidWithWif
        ? `${wifFeeLabel} · burned + treasury`
        : "Flat batch fee · treasury";

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
        <span className="block font-mono text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </div>
  );
}
