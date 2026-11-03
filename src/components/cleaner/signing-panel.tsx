import { AssetRow } from "@/components/cleaner/asset-row";
import { FeeRow } from "@/components/cleaner/fee-row";
import { PROTOCOL_FEE_ID } from "@/lib/web3/fees";
import { useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

/** Live progress while each line is confirmed in the wallet. */
export function SigningPanel() {
  const { assets, mode, demo, currentId, feeStatus, feePaidWithWif } =
    useWalletCleaner();

  // Lines in this run: still selected, or already touched by the signer.
  const lines = assets.filter(
    (a) => a.txStatus || (a.selected && (!a.protected || (a.dust && a.sweepable))),
  );
  const showFee = feeStatus !== "idle";
  const total = lines.length + (showFee ? 1 : 0);
  const finished =
    lines.filter((a) => a.txStatus === "done" || a.txStatus === "failed").length +
    (feeStatus === "done" || feeStatus === "failed" ? 1 : 0);
  const step = Math.min(finished + 1, total);
  const percent = total > 0 ? Math.round((finished / total) * 100) : 0;

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]"
    >
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">
            {demo ? "Running the demo" : "Confirm in your wallet"}
          </p>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {step} of {total}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {demo
            ? "Each line is approved automatically. Nothing is sent."
            : "Approve each prompt. Every line is simulated first, and a failed line does not stop the rest."}
        </p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-smooth-out)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <ul className="flex flex-col">
        {showFee ? (
          <li>
            <FeeRow
              active={currentId === PROTOCOL_FEE_ID}
              status={feeStatus}
              paidWithWif={feePaidWithWif}
            />
          </li>
        ) : null}
        {lines.map((asset) => (
          <li key={asset.id}>
            <AssetRow asset={asset} mode={mode} active={currentId === asset.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
