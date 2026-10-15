import type { ComponentType, ReactNode } from "react";
import {
  Blocks,
  Check,
  Fingerprint,
  Flame,
  ListChecks,
  Lock,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Feature = {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  visual: ReactNode;
  wide?: boolean;
};

const chip =
  "inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-[11px] shadow-[0_0_0_1px_rgb(255_255_255/0.07)]";

function BurnVisual() {
  return (
    <div className="flex h-full items-center justify-center gap-3">
      <div className="flex flex-col gap-1.5">
        {["CLAIM-ETH.io", "FREE $RHOOD", "Mystery Box #12"].map((t, i) => (
          <span
            key={t}
            className={cn(
              chip,
              "text-muted-foreground transition-all duration-500 ease-[var(--ease-smooth-out)] group-hover:translate-x-3 group-hover:opacity-40",
            )}
            style={{ transitionDelay: `${i * 70}ms` }}
          >
            <span className="size-1.5 rounded-full bg-destructive" />
            {t}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 60 12" className="h-3 w-14 text-primary/50" fill="none">
        <path
          d="M0 6h54m0 0-5-5m5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          className="feature-dash"
        />
      </svg>
      <span className="flex flex-col items-center gap-1.5">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_24px_-4px_rgb(204_255_0/0.5)] transition-transform duration-500 group-hover:scale-110">
          <Flame className="size-5" />
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">0x…dEaD</span>
      </span>
    </div>
  );
}

function LockedVisual() {
  return (
    <div className="flex h-full flex-wrap content-center items-center justify-center gap-1.5 px-4">
      {["AAPL", "AMZN", "NVDA", "USDG", "TSLA"].map((t, i) => (
        <span
          key={t}
          className={cn(
            chip,
            "font-mono text-foreground transition-shadow duration-500 group-hover:shadow-[0_0_0_1px_rgb(204_255_0/0.35)]",
          )}
          style={{ transitionDelay: `${i * 60}ms` }}
        >
          <Lock className="size-3 text-primary" />
          {t}
        </span>
      ))}
    </div>
  );
}

function SignVisual() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-44 rounded-xl bg-background/70 p-3 shadow-[0_0_0_1px_rgb(255_255_255/0.07)] transition-transform duration-500 ease-[var(--ease-smooth-out)] group-hover:-translate-y-1">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Your wallet</p>
        <p className="mt-1 text-xs">Confirm transaction</p>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-center text-[10px]">
          <span className="rounded-md py-1 text-muted-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.1)]">
            Reject
          </span>
          <span className="rounded-md bg-primary py-1 font-medium text-primary-foreground">
            Sign
          </span>
        </div>
      </div>
    </div>
  );
}

function RevokeVisual() {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-xs rounded-xl bg-background/70 p-3 shadow-[0_0_0_1px_rgb(255_255_255/0.07)]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Permit2 · unknown spender</span>
          <span className="font-mono text-muted-foreground">USDG</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2 font-mono text-sm">
          <span className="text-destructive line-through decoration-destructive/60 transition-opacity duration-500 group-hover:opacity-40">
            Unlimited
          </span>
          <svg viewBox="0 0 16 16" className="size-3.5 text-muted-foreground" fill="none">
            <path d="M2 8h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="text-primary">0</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 font-sans text-[10px] font-medium text-primary">
            <Check className="size-3" strokeWidth={3} />
            Revoked
          </span>
        </div>
      </div>
    </div>
  );
}

function ReviewVisual() {
  const lines = [
    { t: "Burn CLAIM-ETH.io", on: true },
    { t: "Revoke Permit2 allowance", on: true },
    { t: "Burn Mystery Box #12", on: false },
  ];
  return (
    <div className="flex h-full items-center justify-center px-4">
      <ul className="w-full max-w-xs space-y-1.5">
        {lines.map((l, i) => (
          <li
            key={l.t}
            className="flex items-center gap-2 rounded-lg bg-background/70 px-2.5 py-1.5 text-[11px] shadow-[0_0_0_1px_rgb(255_255_255/0.07)] transition-transform duration-500 ease-[var(--ease-smooth-out)] group-hover:translate-x-1"
            style={{ transitionDelay: `${i * 70}ms` }}
          >
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded-[4px]",
                l.on
                  ? "bg-primary text-primary-foreground"
                  : "shadow-[0_0_0_1px_rgb(255_255_255/0.2)]",
              )}
            >
              {l.on ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
            </span>
            <span className={l.on ? "text-foreground" : "text-muted-foreground"}>{l.t}</span>
            <span className="ml-auto text-muted-foreground">Line {i + 1}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChainVisual() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="font-display text-5xl leading-none tracking-tight text-primary transition-transform duration-500 group-hover:scale-105">
        4663
      </p>
      <div className="flex gap-1.5">
        {["ERC-20", "ERC-721", "ETH gas"].map((t) => (
          <span key={t} className={cn(chip, "font-mono text-muted-foreground")}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    icon: Flame,
    title: "Burn the spam",
    body: "Memecoin airdrops, fake tickers, and bait NFTs leave the wallet. Real burn when the token supports it; otherwise a dead-address send.",
    visual: <BurnVisual />,
    wide: true,
  },
  {
    icon: ShieldCheck,
    title: "Stock Tokens stay locked",
    body: "Known RWAs and majors cannot be selected. Safe mode will not burn a holding you meant to keep.",
    visual: <LockedVisual />,
  },
  {
    icon: Fingerprint,
    title: "Non-custodial",
    body: "Pyre never sees a private key. Every action is a transaction you sign.",
    visual: <SignVisual />,
  },
  {
    icon: Unlink,
    title: "Revoke leftover approvals",
    body: "Unlimited allowances on Permit2 and known spenders get set back to zero.",
    visual: <RevokeVisual />,
    wide: true,
  },
  {
    icon: ListChecks,
    title: "Review before you sign",
    body: "The cleaner is a four-step flow, not a single hidden batch. You see the list, then sign line by line.",
    visual: <ReviewVisual />,
    wide: true,
  },
  {
    icon: Blocks,
    title: "Built for this chain",
    body: "Robinhood Chain is an Arbitrum L2. Gas is ETH. Pyre talks ERC-20, ERC-721, and allowances.",
    visual: <ChainVisual />,
  },
];

export function FeatureGrid() {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-3">
      {FEATURES.map((f) => (
        <article
          key={f.title}
          className={cn(
            "group lift on-scroll relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-border)]",
            f.wide && "md:col-span-2",
          )}
        >
          <div
            aria-hidden="true"
            className="feature-stage relative h-40 border-b border-white/[0.05]"
          >
            {f.visual}
          </div>
          <div className="flex items-start gap-4 p-6">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-primary/25 to-primary/5 text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_0_1px_rgb(204_255_0/0.25)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_0_1px_rgb(204_255_0/0.5),0_0_20px_-4px_rgb(204_255_0/0.5)]">
              <f.icon className="size-[18px]" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-base font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
