import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CtaBanner } from "@/components/landing/cta-banner";
import { FaqSection } from "@/components/landing/faq-section";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { HeroPreview } from "@/components/landing/hero-preview";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WalletDialog } from "@/components/wallet/wallet-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFeeEth, PROTOCOL_FEE_WEI } from "@/lib/web3/fees";

const FLOW = [
  {
    n: "01",
    title: "Connect",
    body: "Robinhood Wallet, MetaMask, Rabby, or Ledger. Keys never leave the wallet.",
  },
  {
    n: "02",
    title: "Scan",
    body: "Pyre reads ERC-20s, NFTs, and leftover allowances on chain 4663.",
  },
  {
    n: "03",
    title: "Review",
    body: "Spam is pre-selected. Stock Tokens and stables stay locked.",
  },
  {
    n: "04",
    title: "Sign",
    body: "Each burn or revoke is its own transaction. You approve every line.",
  },
];

export function LandingPage() {
  return (
    <div id="top" className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteHeader />
      <WalletDialog />

      <main id="main">
        <section className="hero-glow overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-24">
            <div className="reveal max-w-2xl">
              <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
                Robinhood Chain wallet cleaner
              </p>
              <h1 className="mt-4 font-display text-4xl leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
                Burn the spam. Keep the Stock Tokens.
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
                A four-step cleaner for chain 4663. Scan, review, then sign each burn and revoke.
                Safe mode cannot touch protected holdings.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/clean">
                    Open cleaner
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/clean">Preview the flow</Link>
                </Button>
              </div>
            </div>
            <HeroPreview className="mx-auto w-full max-w-md lg:mr-0" />
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-border">
          <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((step) => (
              <article
                key={step.n}
                className="group bg-background px-5 py-8 transition-colors duration-300 hover:bg-surface/40 sm:px-6"
              >
                <p className="font-display text-3xl italic text-primary transition-transform duration-300 ease-[var(--ease-smooth-out)] group-hover:-translate-y-0.5">
                  {step.n}
                </p>
                <h2 className="mt-3 text-lg font-medium">{step.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="modes"
          className="scroll-mt-20 mx-auto grid max-w-6xl gap-6 px-5 py-20 sm:px-6 lg:grid-cols-3"
        >
          <article className="lift on-scroll rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
            <Badge>Default</Badge>
            <h2 className="mt-4 font-display text-3xl tracking-tight">Safe</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Burns unsolicited spam and revokes leftover approvals. Stock Tokens cannot be
              selected.
            </p>
          </article>
          <article className="lift on-scroll rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
            <Badge>Phase 2</Badge>
            <h2 className="mt-4 font-display text-3xl tracking-tight">Sweep</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Sells spam with a real ETH route via 1inch on chain 4663. Pyre keeps 1.25% of ETH
              received. No route means burn, same as Safe. Stock Tokens are never swept as spam.
            </p>
          </article>
          <article className="lift on-scroll rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
            <Badge variant="outline">Advanced</Badge>
            <h2 className="mt-4 font-display text-3xl tracking-tight">Review</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tick extra tokens and NFTs. Locked holdings stay locked. Burns cannot be reversed.
            </p>
          </article>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Why Pyre</p>
            <h2 className="on-scroll mt-3 max-w-lg font-display text-3xl tracking-tight sm:text-4xl">
              Built to clean a wallet without drama.
            </h2>
            <FeatureGrid />
          </div>
        </section>

        <section id="fees" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Pricing</p>
            <h2 className="on-scroll mt-3 max-w-lg font-display text-3xl tracking-tight sm:text-4xl">
              Gas in ETH. A flat fee only when you batch.
            </h2>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="py-3 pr-4 font-medium">Action</th>
                    <th className="py-3 pr-4 font-medium">What happens</th>
                    <th className="py-3 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <tr className="border-b border-border transition-colors duration-200 hover:bg-surface/30">
                    <td className="py-4 pr-4">One burn or revoke</td>
                    <td className="py-4 pr-4">Signed as a single transaction</td>
                    <td className="py-4">Network gas only</td>
                  </tr>
                  <tr className="border-b border-border transition-colors duration-200 hover:bg-surface/30">
                    <td className="py-4 pr-4">Sweep (quoted spam)</td>
                    <td className="py-4 pr-4">
                      Swap to ETH when the quote clears. 1.25% of ETH received goes to treasury.
                    </td>
                    <td className="py-4">1.25% of ETH + gas</td>
                  </tr>
                  <tr className="border-b border-border transition-colors duration-200 hover:bg-surface/30">
                    <td className="py-4 pr-4">Batch Clean (2+ lines)</td>
                    <td className="py-4 pr-4">
                      Fee collected first, then each line. One failed line does not unwind the rest.
                    </td>
                    <td className="py-4">{formatFeeEth(PROTOCOL_FEE_WEI)} once + gas</td>
                  </tr>
                  <tr className="transition-colors duration-200 hover:bg-surface/30">
                    <td className="py-4 pr-4">Stock Tokens / stables</td>
                    <td className="py-4 pr-4">Locked. Never selected, never burned.</td>
                    <td className="py-4">Not for sale here</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-6 max-w-xl text-sm text-muted-foreground">
              If the batch fee transaction reverts, Pyre does not start the burns. You never pay the
              fee for a batch that never runs. The amount is a configurable ETH constant, not a cut
              of what you hold.
            </p>
          </div>
        </section>

        <FaqSection />

        <CtaBanner />
      </main>

      <SiteFooter />
    </div>
  );
}
