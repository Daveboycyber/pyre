import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ArrowUpRight, FileText, MessageCircle, Plus, ShieldCheck } from "lucide-react";
import { formatFeeEth, PROTOCOL_FEE_WEI } from "@/lib/web3/fees";

const inlineLink =
  "text-foreground underline underline-offset-4 transition-colors hover:text-primary";

const FAQS: { q: string; a: ReactNode }[] = [
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
    q: "What data does Pyre keep?",
    a: (
      <>
        No accounts and no tracking. Your hidden-asset list and fee credits stay in your own
        browser. See the{" "}
        <Link to="/privacy" className={inlineLink}>
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link to="/terms" className={inlineLink}>
          Terms
        </Link>{" "}
        for the details.
      </>
    ),
  },
  {
    q: "Are you affiliated with Robinhood?",
    a: "No. Pyre is an independent interface for the public Robinhood Chain.",
  },
];

const HELP_LINKS = [
  {
    icon: MessageCircle,
    label: "Ask on GitHub",
    href: "https://github.com/Daveboycyber/pyre/issues",
    external: true,
  },
  { icon: ShieldCheck, label: "Privacy Policy", href: "/privacy" },
  { icon: FileText, label: "Terms of Use", href: "/terms" },
] as const;

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">FAQ</p>
          <h2 className="on-scroll mt-3 font-display text-3xl tracking-tight sm:text-4xl">
            Straight answers.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            What Pyre touches, what it never touches, and what it costs.
          </p>

          <div className="mt-8 max-w-sm rounded-2xl bg-card/60 p-5 shadow-[var(--shadow-border)]">
            <p className="text-sm font-medium">Still have questions?</p>
            <ul className="mt-3 divide-y divide-border">
              {HELP_LINKS.map(({ icon: Icon, label, href, ...rest }) => {
                const inner = (
                  <>
                    <Icon className="size-4 text-primary" strokeWidth={1.75} />
                    <span className="flex-1">{label}</span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                  </>
                );
                const cls =
                  "group flex items-center gap-3 py-3 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground";
                return (
                  <li key={label}>
                    {"external" in rest ? (
                      <a href={href} target="_blank" rel="noreferrer" className={cls}>
                        {inner}
                      </a>
                    ) : (
                      <Link to={href} className={cls}>
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <AccordionPrimitive.Root
          type="single"
          collapsible
          defaultValue="faq-0"
          className="flex flex-col gap-3"
        >
          {FAQS.map((item, index) => (
            <AccordionPrimitive.Item
              key={item.q}
              value={`faq-${index}`}
              className="group/faq rounded-2xl bg-card/40 shadow-[var(--shadow-border)] transition-[background-color,box-shadow] duration-300 hover:bg-card/70 data-[state=open]:bg-card data-[state=open]:shadow-[var(--shadow-border-hover),0_16px_40px_-24px_rgb(204_255_0/0.35)]"
            >
              <AccordionPrimitive.Header className="flex">
                <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-4 rounded-2xl px-5 py-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-6 sm:py-5">
                  <span className="w-6 shrink-0 font-display text-lg text-primary italic">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[15px] font-medium sm:text-base">{item.q}</span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-muted-foreground shadow-[var(--shadow-border)] transition-all duration-300 ease-[var(--ease-smooth-out)] group-data-[state=open]/faq:rotate-45 group-data-[state=open]/faq:bg-primary group-data-[state=open]/faq:text-primary-foreground">
                    <Plus className="size-4" />
                  </span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="pr-6 pb-5 pl-[3.75rem] text-sm leading-relaxed text-muted-foreground sm:pr-16 sm:pl-[4.25rem]">
                  {item.a}
                </p>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </div>
    </section>
  );
}
