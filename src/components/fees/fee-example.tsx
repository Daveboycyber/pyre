import { formatFeeEth, PROTOCOL_FEE_WEI } from "@/lib/web3/fees";
import { sweepCutWei, sweepNetWei } from "@/lib/web3/sweep";

// A worked example, computed with the same helpers the cleaner uses.
const SWEEP_QUOTE_WEI = 10_000_000_000_000_000n; // 0.01 ETH

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-mono font-medium text-primary" : "font-mono"}>{value}</dd>
    </div>
  );
}

export function FeeExample() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-card/60 p-6 shadow-[var(--shadow-border)]">
        <p className="text-sm font-medium">Example: clean 7 spam lines</p>
        <p className="mt-1 text-xs text-muted-foreground">
          5 burns and 2 approval revokes in one clean.
        </p>
        <dl className="mt-4 divide-y divide-border text-sm">
          <Line label="Batch fee (once)" value={formatFeeEth(PROTOCOL_FEE_WEI)} />
          <Line label="Per-line fee" value="0 ETH" />
          <Line label="Network gas" value="paid to the chain" />
          <Line label="Pyre takes" value={formatFeeEth(PROTOCOL_FEE_WEI)} strong />
        </dl>
      </div>
      <div className="rounded-2xl bg-card/60 p-6 shadow-[var(--shadow-border)]">
        <p className="text-sm font-medium">Example: sweep one spam token</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The best route quotes {formatFeeEth(SWEEP_QUOTE_WEI)} for it.
        </p>
        <dl className="mt-4 divide-y divide-border text-sm">
          <Line label="ETH from the swap" value={formatFeeEth(SWEEP_QUOTE_WEI)} />
          <Line label="Sweep cut" value={formatFeeEth(sweepCutWei(SWEEP_QUOTE_WEI))} />
          <Line label="Network gas" value="paid to the chain" />
          <Line label="You receive" value={formatFeeEth(sweepNetWei(SWEEP_QUOTE_WEI))} strong />
        </dl>
      </div>
    </section>
  );
}
