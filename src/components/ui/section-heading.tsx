import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/** Eyebrow + display heading (+ optional lede) used to open a page section. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Heading = "h2",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading
        className={cn(
          "on-scroll font-display tracking-tight",
          Heading === "h1" ? "mt-4 text-4xl sm:text-5xl" : "mt-3 max-w-lg text-3xl sm:text-4xl",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className="mt-4 max-w-xl text-base text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
