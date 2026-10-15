import type { ClassificationLabel } from "./types.ts";

const REASON_COPY: Record<string, string> = {
  address_in_stock_registry: "On the Stock Token list",
  symbol_in_stock_registry: "Matches a stock ticker",
  address_is_known_stable: "Known stable or wrapped ETH",
  symbol_is_known_stable: "Known stable symbol",
  no_positive_signals: "No stock or spam signal",
};

export function classificationTitle(label: ClassificationLabel) {
  switch (label) {
    case "stock":
      return "Stock";
    case "stable":
      return "Stable";
    case "spam":
      return "Spam";
    default:
      return "Unknown";
  }
}

/** First human-readable reason for a badge subtitle. */
export function classificationReason(codes: readonly string[] | undefined) {
  const code = codes?.[0];
  if (!code) return null;
  if (code.startsWith("spam_pattern:")) return "Looks like bait wording";
  return REASON_COPY[code] ?? null;
}
