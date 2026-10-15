import { Check, CircleAlert, LoaderCircle } from "lucide-react";

export type TxStatus = "idle" | "pending" | "done" | "failed";

/** Done / failed / in-flight marker for a signing line; an empty box when idle. */
export function TxStatusIcon({
  status,
  active,
}: Readonly<{ status?: TxStatus; active?: boolean }>) {
  if (status === "done") return <Check className="size-4 shrink-0 text-primary" />;
  if (status === "failed") return <CircleAlert className="size-4 shrink-0 text-destructive" />;
  if (status === "pending" || active) {
    return <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />;
  }
  return <span className="size-4 shrink-0 rounded-sm shadow-(--shadow-border)" />;
}
