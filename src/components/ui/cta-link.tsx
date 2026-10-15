import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  md: { root: "h-12 gap-2.5 pl-6 pr-1.5 text-[15px]", knob: "size-9" },
  lg: { root: "h-14 gap-3 pl-7 pr-2 text-base", knob: "size-10" },
} as const;

/**
 * Pyre's primary call to action: a glowing lime pill with a sheen sweep and
 * an arrow knob that swaps arrows on hover. Styles live in .cta-button.
 */
export function CtaLink({
  to,
  children,
  size = "lg",
  className,
}: {
  to: "/clean" | "/fees";
  children: React.ReactNode;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <Link
      to={to}
      className={cn(
        "cta-button group relative inline-flex items-center overflow-hidden rounded-full bg-primary font-medium text-primary-foreground",
        "transition-[transform,box-shadow] duration-300 ease-[var(--ease-smooth-out)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        s.root,
        className,
      )}
    >
      <span className="relative z-10">{children}</span>
      <span
        className={cn(
          "relative z-10 flex items-center justify-center overflow-hidden rounded-full bg-primary-foreground text-primary transition-transform duration-300 ease-[var(--ease-smooth-out)] group-hover:scale-105",
          s.knob,
        )}
      >
        <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-smooth-out)] group-hover:translate-x-6" />
        <ArrowRight className="absolute size-4 -translate-x-6 transition-transform duration-300 ease-[var(--ease-smooth-out)] group-hover:translate-x-0" />
      </span>
    </Link>
  );
}
