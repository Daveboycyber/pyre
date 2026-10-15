import { ArrowLeftRight, Flame, Layers } from "lucide-react";
import { formatFeeEth, PROTOCOL_FEE_WEI } from "@/lib/web3/fees";
import { SWEEP_CUT_BPS } from "@/lib/web3/sweep";
import { cn } from "@/lib/utils";

const CUT_PCT = (Number(SWEEP_CUT_BPS) / 100).toFixed(2);

const PLANS = [
  {
    icon: Flame,
    name: "Single action",
    price: "Free",
    unit: "network gas only",
    points: ["One burn or one revoke", "Signed as its own transaction", "No protocol fee, ever"],
  },
  {
    icon: Layers,
    name: "Batch clean",
    price: formatFeeEth(PROTOCOL_FEE_WEI),
    unit: "once per clean + gas",
    points: [
      "Two or more lines in one clean",
      "Fee is paid first, then each line runs",
      "One failed line does not undo the rest",
    ],
    featured: true,
  },
  {
    icon: ArrowLeftRight,
    name: "Sweep",
    price: `${CUT_PCT}%`,
    unit: "of ETH received + gas",
    points: [
      "Sells spam that has a real ETH route",
      "Only when the quote beats gas plus the batch fee",
      "No route means it burns instead",
    ],
  },
];

export function PricingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map(({ icon: Icon, name, price, unit, points, featured }) => (
        <article
          key={name}
          className={cn(
            "lift relative flex flex-col rounded-2xl p-6",
            featured
              ? "bg-card shadow-[var(--shadow-border-hover),0_24px_60px_-30px_rgb(204_255_0/0.4)]"
              : "bg-card/60 shadow-[var(--shadow-border)]",
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-b from-primary/25 to-primary/5 text-primary shadow-[0_0_0_1px_rgb(204_255_0/0.25)]">
            <Icon className="size-[18px]" strokeWidth={1.75} />
          </span>
          <h2 className="mt-5 text-sm text-muted-foreground">{name}</h2>
          <p className="mt-1 font-display text-4xl tracking-tight">{price}</p>
          <p className="text-xs text-muted-foreground">{unit}</p>
          <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
            {points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                {p}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
