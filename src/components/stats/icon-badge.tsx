import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rounded lime-tinted square holding a section or metric icon. */
export function IconBadge({
  icon: Icon,
  size = "md",
  className,
}: {
  readonly icon: LucideIcon;
  readonly size?: "sm" | "md";
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center bg-primary/15 text-primary",
        size === "md" ? "size-10 rounded-xl" : "size-7 rounded-lg",
        className,
      )}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} strokeWidth={2} />
    </span>
  );
}
