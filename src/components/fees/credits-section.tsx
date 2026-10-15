import { Coins, Gift, RotateCcw } from "lucide-react";

const STEPS = [
  {
    icon: Gift,
    title: "Earn",
    body: "Get 1 credit when a clean recovers ETH through a sweep or dust swap.",
  },
  {
    icon: RotateCcw,
    title: "Get made whole",
    body: "Get 1 credit if you paid the batch fee but every line failed.",
  },
  {
    icon: Coins,
    title: "Spend",
    body: "Your next batch clean uses 1 credit automatically and the fee is waived.",
  },
];

export function CreditsSection() {
  return (
    <section
      id="credits"
      className="scroll-mt-24 overflow-hidden rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-3xl tracking-tight">Credits</h2>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
          1 credit = 1 free batch fee
        </span>
      </div>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        A small rebate system so a good clean pays you back, and a failed one does not cost you.
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="rounded-xl bg-background/50 p-4">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg text-primary italic">0{i + 1}</span>
              <Icon className="size-4 text-primary" />
              <span className="text-sm font-medium">{title}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs text-muted-foreground">
        Stored in this browser · Not a token · Not used in demo
      </p>
    </section>
  );
}
