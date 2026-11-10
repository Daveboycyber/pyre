import { X } from "lucide-react";
import { TONES, type FeedbackTone } from "@/components/feedback/tones";
import { cn } from "@/lib/utils";

export type ToastAction = { label: string; onClick: () => void };

export type PyreToastProps = {
  readonly tone: FeedbackTone;
  readonly title: string;
  readonly description?: string;
  readonly action?: ToastAction;
  /** ms until auto-close (sonner handles the timer). */
  readonly duration: number;
  readonly onClose: () => void;
};

/** Icon colour per tone, taken from the shared tone tile so modals stay in sync. */
const iconColor = (tone: FeedbackTone) =>
  TONES[tone].tile
    .split(" ")
    .filter((c) => c.startsWith("text-") || c.startsWith("[&_svg]"))
    .join(" ");

/** Simple Pyre toast: one card, a small icon, title and an optional line of detail. */
export function PyreToast({ tone, title, description, action, onClose }: PyreToastProps) {
  const { icon: Icon } = TONES[tone];
  return (
    <output
      role={tone === "error" ? "alert" : undefined}
      className="group pyre-toast flex w-[min(92vw,360px)] items-start gap-2.5 rounded-xl bg-card px-3.5 py-3 text-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_12px_32px_-12px_rgb(0_0_0/0.8)]"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconColor(tone))} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium">{title}</p>
        {description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className={cn(
              "mt-2 text-xs font-medium underline-offset-2 hover:underline",
              tone === "error" ? "text-destructive" : "text-primary",
            )}
          >
            {action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="-mt-0.5 -mr-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </output>
  );
}
