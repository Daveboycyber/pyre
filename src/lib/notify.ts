/**
 * Pyre toasts. One API for every success / error / info message:
 *
 *   notify.success("Wallet cleaned", { description: "7 actions confirmed" })
 *   notify.error("Scan failed", { action: { label: "Retry", onClick: rescan } })
 *   await notify.promise(task, { loading: "Saving…", success: "Saved", error: (e) => "…" })
 */
import { createElement } from "react";
import { toast } from "sonner";
import { PyreToast, type ToastAction } from "@/components/feedback/pyre-toast";
import type { FeedbackTone } from "@/components/feedback/tones";

type Options = {
  description?: string;
  action?: ToastAction;
  duration?: number;
  id?: string | number;
};

const DEFAULT_MS: Record<FeedbackTone, number> = {
  success: 4500,
  info: 4500,
  warning: 6000,
  error: 7000,
  loading: Number.POSITIVE_INFINITY,
};

function show(tone: FeedbackTone, title: string, opts: Options = {}) {
  const duration = opts.duration ?? DEFAULT_MS[tone];
  return toast.custom(
    (id) =>
      createElement(PyreToast, {
        tone,
        title,
        description: opts.description,
        action: opts.action,
        duration,
        onClose: () => toast.dismiss(id),
      }),
    { id: opts.id, duration },
  );
}

export const notify = {
  success: (title: string, opts?: Options) => show("success", title, opts),
  error: (title: string, opts?: Options) => show("error", title, opts),
  warning: (title: string, opts?: Options) => show("warning", title, opts),
  info: (title: string, opts?: Options) => show("info", title, opts),
  loading: (title: string, opts?: Options) => show("loading", title, opts),
  dismiss: (id?: string | number) => toast.dismiss(id),

  /** Loading toast that turns into success or error when the promise settles. */
  async promise<T>(
    task: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((v: T) => string);
      error: string | ((e: unknown) => string);
    },
  ): Promise<T> {
    const id = show("loading", msgs.loading);
    try {
      const value = await task;
      show("success", typeof msgs.success === "function" ? msgs.success(value) : msgs.success, {
        id,
      });
      return value;
    } catch (err) {
      show("error", typeof msgs.error === "function" ? msgs.error(err) : msgs.error, { id });
      throw err;
    }
  },
};
