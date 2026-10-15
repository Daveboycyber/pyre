import { cn } from "@/lib/utils";

/** Small uppercase label that sits above a heading. */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs tracking-[0.2em] text-muted-foreground uppercase", className)}
      {...props}
    />
  );
}
