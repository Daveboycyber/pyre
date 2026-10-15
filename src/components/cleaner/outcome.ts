import type { LastClean } from "../../lib/web3/types.ts";

export type CleanOutcome = "success" | "partial" | "failed";

export function succeededCount(result: LastClean) {
  return result.tokens + result.nfts + result.approvals + result.swept + result.dustSwaps;
}

/** How a finished clean went, from the user's point of view. */
export function cleanOutcome(result: LastClean): CleanOutcome {
  const ok = succeededCount(result);
  if (result.failed > 0 && ok === 0) return "failed";
  if (result.failed > 0) return "partial";
  return "success";
}

/** True when the batch fee left the wallet (not free, not waived). */
export function feeCharged(result: LastClean) {
  return result.feeWei > 0n && result.feePaid && !result.feeWaived;
}

/** One-line explanation for a clean where nothing went through. */
export function failureSummary(result: LastClean) {
  if (result.feeWei > 0n && !result.feePaid && !result.feeWaived) {
    return "The batch fee did not go through, so no burns started. You were not charged.";
  }
  if (feeCharged(result)) {
    return result.creditsEarned
      ? "Every line failed after the fee was paid. You earned a credit that waives your next batch fee."
      : "Every line failed after the fee was paid.";
  }
  return "No line went through. Nothing in your wallet changed.";
}
