import { AddressCard } from "@/components/fees/address-card";
import { CreditsSection } from "@/components/fees/credits-section";
import { FeeExample } from "@/components/fees/fee-example";
import { Guarantees } from "@/components/fees/guarantees";
import { PricingCards } from "@/components/fees/pricing-cards";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CtaLink } from "@/components/ui/cta-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WIF_ADDRESS } from "@/lib/web3/wif";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  PYRE_BATCH_ADDRESS,
  pyreBatchIsDeployed,
  TREASURY_ADDRESS,
  treasuryIsLive,
} from "@/lib/web3/fees";

export function FeesPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-16 px-5 py-14 sm:px-6 lg:py-20">
        <SectionHeading
          as="h1"
          eyebrow="Fees & treasury"
          title="Simple, flat and on-chain"
          description="Single burns and revokes are free besides network gas. A batch pays one flat fee in $WIF, and a sweep keeps a small cut of the ETH it recovers. That is all."
        />

        <PricingCards />

        <section className="flex flex-col gap-6">
          <div>
            <Eyebrow>How it adds up</Eyebrow>
            <h2 className="mt-3 font-display text-3xl tracking-tight">Two quick examples</h2>
          </div>
          <FeeExample />
        </section>

        <section className="flex flex-col gap-6">
          <div>
            <Eyebrow>Our promise</Eyebrow>
            <h2 className="mt-3 font-display text-3xl tracking-tight">
              What you will never be charged for
            </h2>
          </div>
          <Guarantees />
        </section>

        <CreditsSection />

        <section className="flex flex-col gap-6">
          <div>
            <Eyebrow>Where fees go</Eyebrow>
            <h2 className="mt-3 font-display text-3xl tracking-tight">Public by design</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AddressCard
              title="$WIF token"
              description="The token the batch fee is paid in, on chain 4663."
              address={WIF_ADDRESS}
            />
            <AddressCard
              title="Treasury"
              description="Receives the $WIF batch fee and the sweep cut."
              address={TREASURY_ADDRESS}
              status={
                treasuryIsLive()
                  ? { label: "Live", live: true }
                  : { label: "Placeholder · fees paused", live: false }
              }
            />
            {pyreBatchIsDeployed() ? (
              <AddressCard
                title="PyreBatch contract"
                description="Only used when a wallet holds under 50 $WIF. Collects the ETH fallback fee and forwards it to the treasury in the same transaction."
                address={PYRE_BATCH_ADDRESS}
                status={{ label: "Source matches repo", live: true }}
              />
            ) : null}
          </div>
        </section>

        <div className="flex flex-col items-start gap-4 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm text-muted-foreground">
            You see the exact fee before you sign, and nothing moves until you approve it.
          </p>
          <CtaLink to="/clean" size="md">
            Open cleaner
          </CtaLink>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
