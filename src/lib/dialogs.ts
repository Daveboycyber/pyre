/**
 * Imperative Pyre modals, rendered by <DialogHost /> at the app root.
 *
 *   if (await confirmDialog({ tone: "warning", title: "Sign 7 actions?" })) { … }
 *   await alertDialog({ tone: "error", title: "Pyre stopped", description: "…" })
 */
import type { ReactNode } from "react";
import type { FeedbackTone } from "@/components/feedback/tones";

export type DialogRequest = {
  tone: Exclude<FeedbackTone, "loading">;
  title: string;
  description?: ReactNode;
  /** Optional key/value lines shown in a summary box. */
  details?: Array<{ label: string; value: string }>;
  confirmLabel?: string;
  /** Omit for a single-button alert. */
  cancelLabel?: string;
};

type Open = DialogRequest & { resolve: (ok: boolean) => void };

let current: Open | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const dialogStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => current,
  close(ok: boolean) {
    const open = current;
    current = null;
    emit();
    open?.resolve(ok);
  },
};

function openDialog(req: DialogRequest) {
  // A new dialog replaces any open one, which resolves as cancelled.
  current?.resolve(false);
  return new Promise<boolean>((resolve) => {
    current = { ...req, resolve };
    emit();
  });
}

/** Ask the user to confirm. Resolves true only when they press the confirm button. */
export function confirmDialog(req: Omit<DialogRequest, "cancelLabel"> & { cancelLabel?: string }) {
  return openDialog({ confirmLabel: "Continue", cancelLabel: "Cancel", ...req });
}

/** Show a message with a single acknowledge button. */
export async function alertDialog(req: Omit<DialogRequest, "cancelLabel">) {
  await openDialog({ confirmLabel: "Got it", ...req, cancelLabel: undefined });
}
