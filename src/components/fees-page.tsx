import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { explorerAddressUrl } from "@/lib/web3/blockscout";
import {
  formatFeeEth,
  PROTOCOL_FEE_WEI,
  TREASURY_ADDRESS,
  treasuryIsLive,
  pyreBatchIsDeployed,
  PYRE_BATCH_ADDRESS,
} from "@/lib/web3/fees";
import { SWEEP_CUT_BPS } from "@/lib/web3/sweep";

const CUT_PCT = (Number(SWEEP_CUT_BPS) / 100).toFixed(2);

export function FeesPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 lg:py-20">
        <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
          Fees & treasury
        </p>
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
          What Pyre charges
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          Single burns and revokes stay free besides network gas. Batches and
          successful sweeps pay the protocol. Stock Tokens are never burned.
        </p>

        <section className="mt-12 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-3 pr-4 font-medium">Action</th>
                <th className="py-3 pr-4 font-medium">What happens</th>
                <th className="py-3 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-4 pr-4">One burn or revoke</td>
                <td className="py-4 pr-4">Signed as a single transaction</td>
                <td className="py-4">Network gas only</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-4 pr-4">Sweep (quoted spam)</td>
                <td className="py-4 pr-4">
                  Swap to ETH when the quote clears. {CUT_PCT}% of ETH received
                  goes to treasury.
                </td>
                <td className="py-4">{CUT_PCT}% of ETH + gas</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-4 pr-4">Batch Clean (2+ lines)</td>
                <td className="py-4 pr-4">
                  Fee collected first, then each line. One failed line does not
                  unwind the rest.
                </td>
                <td className="py-4">
                  {formatFeeEth(PROTOCOL_FEE_WEI)} once + gas
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-4 pr-4">Stock Tokens / stables</td>
                <td className="py-4 pr-4">
                  Locked by address and ticker (registry loads at scan).
                  Never selected for burn.
                </td>
                <td className="py-4">Not for sale here</td>
              </tr>
              <tr>
                <td className="py-4 pr-4">Credits (v0)</td>
                <td className="py-4 pr-4">
                  Earn 1 credit when a clean recovers any ETH. Spend 1 credit to
                  waive the next batch fee. Stored in this browser only.
                </td>
                <td className="py-4">Rebate · not transferable</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-12 rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
          <h2 className="font-display text-2xl tracking-tight">Treasury</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Batch fees and the {CUT_PCT}% sweep cut land here. Public on
            Robinhood Chain explorer.
          </p>
          <p className="mt-4 break-all font-mono text-sm">
            {TREASURY_ADDRESS}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <a
                href={explorerAddressUrl(TREASURY_ADDRESS)}
                target="_blank"
                rel="noreferrer"
              >
                View on explorer
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <span className="flex items-center text-xs text-muted-foreground">
              {treasuryIsLive() ? "Live treasury" : "Placeholder — fees paused"}
            </span>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            PyreBatch:{" "}
            {pyreBatchIsDeployed()
              ? PYRE_BATCH_ADDRESS
              : "not deployed — fee is a direct ETH transfer to treasury"}
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/clean">Open cleaner</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
