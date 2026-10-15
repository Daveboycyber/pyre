import { X } from "lucide-react";
import { TONES, type FeedbackTone } from "@/components/feedback/tones";
import { cn } from "@/lib/utils";

export type ToastAction = { label: string; onClick: () => void };

export type PyreToastProps = {
  tone: FeedbackTone;
  title: string;
  description?: string;
  action?: ToastAction;
  /** ms until auto-close; drives the countdown bar. Infinity hides it. */
  duration: number;
  onClose: () => void;
};

/** Pyre-styled toast body rendered inside sonner's container. */
export function PyreToast({ tone, title, description, action, duration, onClose }: PyreToastProps) {
  const { icon: Icon, tile, ring, bar, glow } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "group pyre-toast relative w-[min(92vw,380px)] overflow-hidden rounded-2xl bg-[#202020]/95 p-3.5 pr-10 text-foreground backdrop-blur-xl",
        "shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]",
        ring,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute -top-8 -left-8 size-20 rounded-full blur-2xl", glow)}
      />
      <div className="relative flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tile)}>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm leading-snug font-medium">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
          {action ? (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={cn(
                "mt-2.5 inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                tone === "error"
                  ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                  : "bg-primary text-primary-foreground hover:opacity-90",
              )}
            >
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
      {Number.isFinite(duration) ? (
        <span
          aria-hidden="true"
          className={cn(
            "pyre-toast-bar absolute bottom-0 left-0 h-0.5 w-full origin-left opacity-70",
            bar,
          )}
          style={{ animationDuration: `${duration}ms` }}
        />
      ) : null}
    </div>
  );
}
