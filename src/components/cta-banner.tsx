import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBanner({ onConnect }: { onConnect: () => void }) {
  return (
    <section className="px-5 py-20 sm:px-6">
      <div className="cta-panel on-scroll relative mx-auto max-w-6xl overflow-hidden rounded-[28px] px-6 py-16 text-center shadow-[0_0_0_1px_rgb(255_255_255/0.07)] sm:px-12 sm:py-24">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 mx-auto h-px max-w-md bg-gradient-to-r from-transparent via-primary/70 to-transparent"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 32 32"
          className="pointer-events-none absolute -bottom-24 left-1/2 size-[420px] -translate-x-1/2 text-primary/[0.04]"
        >
          <path
            fill="currentColor"
            d="M16 5c5 7.4 9 11 9 16.4A9 9 0 1 1 7 21.4C7 16 11 12.4 16 5z"
          />
        </svg>

        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Open the cleaner. Leave the Stock Tokens where they are.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">
            Review every line and sign only what you choose.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="group">
              <Link to="/clean">
                Open cleaner
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={onConnect}>
              Connect wallet
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
