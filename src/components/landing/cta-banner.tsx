import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="px-5 py-20 sm:px-6">
      <div className="cta-panel on-scroll relative mx-auto max-w-6xl overflow-hidden rounded-[28px] px-6 py-16 text-center shadow-[var(--shadow-hairline)] sm:px-12 sm:py-24">
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
          <div className="mt-10 flex justify-center">
            <Link
              to="/clean"
              className="cta-button group relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full bg-primary pr-2 pl-7 text-base font-medium text-primary-foreground transition-[transform,box-shadow] duration-300 ease-[var(--ease-smooth-out)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.98]"
            >
              <span className="relative z-10">Open cleaner</span>
              <span className="relative z-10 flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary-foreground text-primary transition-transform duration-300 ease-[var(--ease-smooth-out)] group-hover:scale-105">
                <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-smooth-out)] group-hover:translate-x-6" />
                <ArrowRight className="absolute size-4 -translate-x-6 transition-transform duration-300 ease-[var(--ease-smooth-out)] group-hover:translate-x-0" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
