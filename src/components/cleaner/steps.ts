export const STEPS = ["Connect", "Scan", "Review", "Sign"] as const;

/** Which of the four cleanup steps is current for a cleaner status. */
export function stepIndex(status: string, connected: boolean) {
  if (!connected || status === "idle") return 0;
  if (status === "scanning") return 1;
  if (status === "ready") return 2;
  return 3;
}
