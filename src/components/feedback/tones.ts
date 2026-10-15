import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";

export type FeedbackTone = "success" | "error" | "warning" | "info" | "loading";

/** Shared look for every Pyre toast and modal, keyed by tone. */
export const TONES: Record<
  FeedbackTone,
  { icon: typeof Info; tile: string; ring: string; bar: string; glow: string }
> = {
  success: {
    icon: CircleCheck,
    tile: "bg-primary/15 text-primary",
    ring: "shadow-[0_0_0_1px_rgb(204_255_0/0.28)]",
    bar: "bg-primary",
    glow: "bg-primary/20",
  },
  error: {
    icon: CircleAlert,
    tile: "bg-destructive/15 text-destructive",
    ring: "shadow-[0_0_0_1px_rgb(255_107_74/0.35)]",
    bar: "bg-destructive",
    glow: "bg-destructive/20",
  },
  warning: {
    icon: TriangleAlert,
    tile: "bg-amber-400/15 text-amber-300",
    ring: "shadow-[0_0_0_1px_rgb(251_191_36/0.3)]",
    bar: "bg-amber-300",
    glow: "bg-amber-400/20",
  },
  info: {
    icon: Info,
    tile: "bg-white/[0.06] text-foreground",
    ring: "shadow-[0_0_0_1px_rgb(255_255_255/0.1)]",
    bar: "bg-foreground/60",
    glow: "bg-white/10",
  },
  loading: {
    icon: LoaderCircle,
    tile: "bg-primary/10 text-primary [&_svg]:animate-spin",
    ring: "shadow-[0_0_0_1px_rgb(204_255_0/0.18)]",
    bar: "bg-primary",
    glow: "bg-primary/15",
  },
};
