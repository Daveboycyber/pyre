import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Flame,
  KeyRound,
  Layers,
  Lock,
  ScanSearch,
  Shield,
  Wallet,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WalletDialog } from "@/components/wallet-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";
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

const FEATURES = [
  {
    icon: Wallet,
    title: "Burn the spam",
    body: "Memecoin airdrops, fake tickers, and bait NFTs leave the wallet. Real burn when the token supports it; otherwise a dead-address send.",
  },
  {
    icon: Shield,
    title: "Stock Tokens stay locked",
    body: "Known RWAs and majors cannot be selected. Safe mode will not burn a holding you meant to keep.",
  },
  {
    icon: KeyRound,
    title: "Non-custodial",
    body: "Pyre never sees a private key. Every action is a transaction you sign.",
  },
  {
    icon: Lock,
    title: "Revoke leftover approvals",
    body: "Unlimited allowances on Permit2 and known spenders get set back to zero.",
  },
  {
    icon: Flame,
    title: "Review before you sign",
    body: "The cleaner is a four-step flow, not a single hidden batch. You see the list, then sign line by line.",
  },
  {
    icon: Layers,
    title: "Built for this chain",
    body: "Robinhood Chain is an Arbitrum L2. Gas is ETH. Pyre talks ERC-20, ERC-721, and allowances.",
  },
];

const FAQS = [
  {
    q: "What is the flow?",
    a: "Connect a wallet, wait for the scan, review the list, then sign each action. Preview the flow first if you want to see it without a wallet.",
  },
  {
    q: "Will you burn my Stock Tokens?",
    a: "No. Known Stock Tokens and stables are locked. Safe mode cannot select them. Review-all still cannot select them.",
  },
  {
    q: "Is this custodial?",
    a: "No. Pyre builds transactions; your wallet signs them. Private keys never leave the wallet.",
  },
  {
    q: "What does Safe mode do?",
    a: "It pre-selects unsolicited spam and leftover approvals. You can uncheck a line before you sign. It does not sell tokens.",
  },
  {
    q: "What does Sweep do?",
    a: "Sweep checks 1inch on Robinhood Chain for a real route to ETH. If the quote clears gas plus the batch fee, Pyre sells that spam and sends you the ETH minus a 1.25% cut. Tokens with no viable route stay on the burn path. Stock Tokens are never treated as spam.",
  },
  {
    q: "What about leftover Stock Token dust?",
    a: "Tiny Stock Token balances can be swapped when the quote clears. If it does not, Pyre says so and leaves them. Dust is never burned. A later OTC buyback desk is not live — it needs real dust volume and a legal review first.",
  },
  {
    q: "How are fees charged?",
    a: `A single burn or revoke is free besides network gas. Two or more actions in one Clean is a batch and pays a flat ${formatFeeEth(PROTOCOL_FEE_WEI)} protocol fee, collected once before any burns run. If the fee payment fails, nothing is burned. Pyre never takes a cut of your tokens or Stock Tokens.`,
  },
  {
    q: "Are you affiliated with Robinhood?",
    a: "No. Pyre is an independent interface for the public Robinhood Chain.",
  },
];

export function LandingPage() {
  const { setOpen } = useWalletCleaner();

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
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-20">
          <div className="reveal max-w-2xl">
            <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
              Robinhood Chain wallet cleaner
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Burn the spam. Keep the Stock Tokens.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              A four-step cleaner for chain 4663. Scan, review, then sign each
              burn and revoke. Safe mode cannot touch protected holdings.
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
        </section>

        <section id="how" className="scroll-mt-20 border-y border-border">
          <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((step) => (
              <article key={step.n} className="bg-background px-5 py-8 sm:px-6">
                <p className="font-display text-3xl italic text-primary">
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
          <article className="rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
            <Badge>Default</Badge>
            <h2 className="mt-4 font-display text-3xl tracking-tight">
              Safe
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Burns unsolicited spam and revokes leftover approvals. Stock
              Tokens cannot be selected.
            </p>
          </article>
          <article className="rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
            <Badge>Phase 2</Badge>
            <h2 className="mt-4 font-display text-3xl tracking-tight">
              Sweep
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Sells spam with a real ETH route via 1inch on chain 4663. Pyre
              keeps 1.25% of ETH received. No route means burn, same as Safe.
              Stock Tokens are never swept as spam.
            </p>
          </article>
          <article className="rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8">
            <Badge variant="outline">Advanced</Badge>
            <h2 className="mt-4 font-display text-3xl tracking-tight">
              Review
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tick extra tokens and NFTs. Locked holdings stay locked. Burns
              cannot be reversed.
            </p>
          </article>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Why Pyre
            </p>
            <h2 className="mt-3 max-w-lg font-display text-3xl tracking-tight sm:text-4xl">
              Built to clean a wallet without drama.
            </h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl bg-card p-6 shadow-[var(--shadow-border)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-sm bg-background text-primary shadow-[var(--shadow-border)]">
                    <feature.icon className="size-4" />
                  </span>
                  <h3 className="mt-5 text-base font-medium">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fees" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Pricing
            </p>
            <h2 className="mt-3 max-w-lg font-display text-3xl tracking-tight sm:text-4xl">
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
                  <tr className="border-b border-border">
                    <td className="py-4 pr-4">One burn or revoke</td>
                    <td className="py-4 pr-4">Signed as a single transaction</td>
                    <td className="py-4">Network gas only</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 pr-4">Sweep (quoted spam)</td>
                    <td className="py-4 pr-4">
                      Swap to ETH when the quote clears. 1.25% of ETH received
                      goes to treasury.
                    </td>
                    <td className="py-4">1.25% of ETH + gas</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 pr-4">Batch Clean (2+ lines)</td>
                    <td className="py-4 pr-4">
                      Fee collected first, then each line. One failed line does
                      not unwind the rest.
                    </td>
                    <td className="py-4">
                      {formatFeeEth(PROTOCOL_FEE_WEI)} once + gas
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-4">Stock Tokens / stables</td>
                    <td className="py-4 pr-4">Locked. Never selected, never burned.</td>
                    <td className="py-4">Not for sale here</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-6 max-w-xl text-sm text-muted-foreground">
              If the batch fee transaction reverts, Pyre does not start the
              burns. You never pay the fee for a batch that never runs. The
              amount is a configurable ETH constant, not a cut of what you hold.
            </p>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                FAQ
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
                Straight answers.
              </h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((item, index) => (
                <AccordionItem key={item.q} value={`faq-${index}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-20 sm:px-6">
            <ScanSearch className="size-6 text-primary" />
            <h2 className="max-w-xl font-display text-3xl tracking-tight sm:text-4xl">
              Open the cleaner. Leave the Stock Tokens where they are.
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/clean">
                  Open cleaner
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => setOpen(true)}>
                Connect wallet
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
