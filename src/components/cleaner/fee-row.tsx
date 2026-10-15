import { TxStatusIcon, type TxStatus } from "@/components/cleaner/tx-status-icon";
import { cn } from "@/lib/utils";

export function FeeRow({ active, status }: Readonly<{ active?: boolean; status?: TxStatus }>) {
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
          {status === "failed" ? "Not paid · no burns started" : "Flat batch fee · treasury"}
        </span>
      </span>
    </div>
  );
}
