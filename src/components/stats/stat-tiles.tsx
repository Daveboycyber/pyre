import type { Totals } from "@/lib/web3/analytics";
import { ethAmount, formatCount } from "@/components/stats/format";

const PANEL = "rounded-[28px] bg-primary/[0.07] p-6 shadow-[var(--shadow-border)] sm:p-8";

function Metric({
  label,
  value,
  hint,
  unit,
  big = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly unit?: string;
  readonly big?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3" title={hint}>
      <dt className="text-sm font-semibold">{label}</dt>
      <dd
        className={`font-semibold break-words tabular-nums ${big ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>
        ) : null}
      </dd>
    </div>
  );
}

/** Two summary panels: who is cleaning, and what the cleans did. */
export function StatTiles({ totals }: { readonly totals: Totals }) {
  const rows = [
    { label: "Wallets", value: formatCount(totals.wallets) },
    { label: "New wallets", value: formatCount(totals.newWallets) },
    {
      label: "Returning wallets",
      value: formatCount(totals.returningWallets),
    },
    {
      label: "Actions per clean",
      value: totals.actionsPerClean.toLocaleString("en-US"),
    },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-live="polite">
      <dl className={`${PANEL} grid gap-6 sm:grid-cols-[1fr_1.4fr]`}>
        <Metric
          label="Batch cleans"
          value={formatCount(totals.batchCleans)}
          hint="FeePaid events on PyreBatch"
          big
        />
        <div className="flex flex-col">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`flex items-center justify-between gap-4 py-2 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="font-semibold tabular-nums">{r.value}</dd>
            </div>
          ))}
        </div>
      </dl>
      <dl className={`${PANEL} grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3`}>
        <Metric
          label="Burned"
          value={formatCount(totals.burns)}
          hint="Burns and transfers to a burn address after a fee"
        />
        <Metric
          label="Swept"
          value={formatCount(totals.sweeps)}
          hint="Swaps to ETH through Uniswap after a fee"
        />
        <Metric
          label="Revoked"
          value={formatCount(totals.revokes)}
          hint="Allowances set to zero after a fee"
        />
        <Metric
          label="ETH recovered"
          value={ethAmount(totals.ethRecoveredWei)}
          unit="ETH"
          hint="ETH unwrapped to users by sweep swaps, before Pyre's 1.25% cut"
        />
        <Metric
          label="Fees paid"
          value={ethAmount(totals.feesWei)}
          unit="ETH"
          hint="Sum of FeePaid amounts on PyreBatch"
        />
        <Metric
          label="Stock dust"
          value={formatCount(totals.stockTokensSwept)}
          hint="Distinct Stock Tokens sold as dust"
        />
      </dl>
    </div>
  );
}
