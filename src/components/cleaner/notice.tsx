import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info";

const TONES: Record<Tone, { icon: typeof Info; ring: string; iconClass: string }> = {
  error: {
    icon: CircleAlert,
    ring: "shadow-[0_0_0_1px_rgb(255_107_74/0.35)] bg-destructive/[0.06]",
    iconClass: "text-destructive",
  },
  success: {
    icon: CircleCheck,
    ring: "shadow-[var(--shadow-border-hover)] bg-primary/[0.05]",
    iconClass: "text-primary",
  },
  info: { icon: Info, ring: "shadow-[var(--shadow-border)] bg-card", iconClass: "text-primary" },
};

/** Inline status message with an icon, optional body and actions. */
export function Notice({
  tone,
  title,
  children,
  actions,
  className,
}: {
  tone: Tone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, ring, iconClass } = TONES[tone];
  return (
    <section
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-2xl p-4", ring, className)}
    >
      <div className="flex gap-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {children ? <div className="mt-1 text-sm text-muted-foreground">{children}</div> : null}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
