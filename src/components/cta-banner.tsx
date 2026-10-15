import { Link } from "@tanstack/react-router";
import { ArrowRight, Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRUST = [
  { icon: Fingerprint, label: "Non-custodial" },
  { icon: ShieldCheck, label: "Simulated before you sign" },
  { icon: Lock, label: "Stock Tokens locked" },
];

// Fixed positions so server and client render the same markup.
const EMBERS = [
  { left: "18%", delay: "0s", size: 4, dur: "5.2s" },
  { left: "30%", delay: "1.6s", size: 3, dur: "4.6s" },
  { left: "42%", delay: "0.8s", size: 5, dur: "6s" },
  { left: "55%", delay: "2.4s", size: 3, dur: "4.8s" },
  { left: "64%", delay: "0.3s", size: 4, dur: "5.6s" },
  { left: "74%", delay: "3.1s", size: 3, dur: "5s" },
  { left: "84%", delay: "1.2s", size: 4, dur: "6.2s" },
];

function FlameEmblem() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden size-64 sm:block lg:size-72">
      <span className="cta-ring absolute inset-0 rounded-full border border-primary/25" />
      <span
        className="cta-ring absolute inset-0 rounded-full border border-primary/25"
        style={{ animationDelay: "1.5s" }}
      />
      <svg viewBox="0 0 100 100" className="cta-orbit absolute inset-6 text-primary/40" fill="none">
        <circle
          cx="50"
          cy="50"
          r="48"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeDasharray="2 4"
        />
        <circle cx="50" cy="2" r="1.6" fill="currentColor" className="text-primary" />
      </svg>
      <span className="absolute inset-16 rounded-full bg-primary/20 blur-2xl" />
      <span className="absolute inset-[4.5rem] flex items-center justify-center rounded-[28px] bg-gradient-to-b from-[#262626] to-[#141414] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_0_1px_rgb(204_255_0/0.3),0_20px_60px_-10px_rgb(204_255_0/0.35)]">
        <svg viewBox="0 0 32 32" className="cta-flame size-14">
          <defs>
            <linearGradient id="cta-flame-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e6ff66" />
              <stop offset="1" stopColor="#ccff00" />
            </linearGradient>
          </defs>
          <path
            fill="url(#cta-flame-fill)"
            d="M16 5c5 7.4 9 11 9 16.4A9 9 0 1 1 7 21.4C7 16 11 12.4 16 5z"
          />
        </svg>
      </span>
      {EMBERS.map((e) => (
        <span
          key={e.left}
          className="cta-ember absolute bottom-16 rounded-full bg-primary"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            animationDelay: e.delay,
            animationDuration: e.dur,
          }}
        />
      ))}
    </div>
  );
}

export function CtaBanner({ onConnect }: { onConnect: () => void }) {
  return (
    <section className="px-5 py-20 sm:px-6">
      <div className="cta-panel on-scroll relative mx-auto max-w-6xl overflow-hidden rounded-[28px] shadow-[0_0_0_1px_rgb(204_255_0/0.18),0_40px_120px_-40px_rgb(204_255_0/0.25)]">
        <div className="relative grid items-center gap-10 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 text-xs text-muted-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.08)] backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/70" />
                <span className="relative size-2 rounded-full bg-primary" />
              </span>
              Live on Robinhood Chain · 4663
            </span>
            <h2 className="mt-6 max-w-xl font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Open the cleaner. <span className="text-primary">Leave the Stock Tokens</span> where
              they are.
            </h2>
            <p className="mt-5 max-w-md text-base text-muted-foreground">
              Scan in seconds, review every line, and sign only what you choose. Spam goes. Holdings
              stay.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="group shadow-[0_10px_30px_-10px_rgb(204_255_0/0.6)]"
              >
                <Link to="/clean">
                  Open cleaner
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-background/40 backdrop-blur"
                onClick={onConnect}
              >
                Connect wallet
              </Button>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/[0.06] pt-6">
              {TRUST.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4 text-primary" strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <FlameEmblem />
        </div>
      </div>
    </section>
  );
}
