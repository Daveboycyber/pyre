import { USDG_ADDRESS, WETH_ADDRESS } from "./chain.ts";
import { STOCK_BY_ADDRESS, STOCK_SYMBOLS } from "./stock-tokens.ts";

const STABLE_SYMBOLS = new Set([
  "ETH",
  "WETH",
  "USDC",
  "USDT",
  "USDG",
  "USDE",
  "DAI",
]);

const STABLE_ADDRESSES = new Set([
  WETH_ADDRESS.toLowerCase(),
  USDG_ADDRESS.toLowerCase(),
]);

const SPAM_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "url_scheme", re: /https?:\/\//i },
  { id: "www_prefix", re: /www\./i },
  { id: "tld_in_name", re: /\.(com|org|net|xyz|io|app)\b/i },
  { id: "claim", re: /\bclaim\b/i },
  { id: "airdrop", re: /\bairdrop\b/i },
  { id: "visit", re: /\bvisit\b/i },
  { id: "reward", re: /\breward[s]?\b/i },
  { id: "cash_bonus", re: /\$\s*\d+[km]?\s*(free|bonus)/i },
];

export type ClassificationLabel = "stock" | "stable" | "spam" | "unknown";

export type Classification = {
  label: ClassificationLabel;
  /** 0–1 confidence in the label. */
  confidence: number;
  /** Machine-readable evidence codes for UI / debugging. */
  reasons: string[];
  protected: boolean;
  spam: boolean;
};

function asAddressKey(address: string | null | undefined) {
  if (!address || !address.startsWith("0x")) return null;
  return address.toLowerCase();
}

/**
 * Evidence-based classifier: every decision carries label + confidence + reasons.
 * Protected holdings (stock / stable) always win over spam heuristics.
 */
export function classifyHolding(opts: {
  symbol?: string | null;
  name?: string | null;
  address?: string | null;
}): Classification {
  const reasons: string[] = [];
  const key = asAddressKey(opts.address);
  const symbol = (opts.symbol ?? "").trim();
  const upper = symbol.toUpperCase();

  if (key && STOCK_BY_ADDRESS.has(key)) {
    reasons.push("address_in_stock_registry");
    return {
      label: "stock",
      confidence: 1,
      reasons,
      protected: true,
      spam: false,
    };
  }

  if (upper && STOCK_SYMBOLS.has(upper)) {
    reasons.push("symbol_in_stock_registry");
    return {
      label: "stock",
      confidence: 0.85,
      reasons,
      protected: true,
      spam: false,
    };
  }

  if (key && STABLE_ADDRESSES.has(key)) {
    reasons.push("address_is_known_stable");
    return {
      label: "stable",
      confidence: 1,
      reasons,
      protected: true,
      spam: false,
    };
  }

  if (upper && STABLE_SYMBOLS.has(upper)) {
    reasons.push("symbol_is_known_stable");
    return {
      label: "stable",
      confidence: 0.9,
      reasons,
      protected: true,
      spam: false,
    };
  }

  const haystack = `${opts.name ?? ""} ${symbol}`;
  for (const { id, re } of SPAM_PATTERNS) {
    if (re.test(haystack)) {
      reasons.push(`spam_pattern:${id}`);
      return {
        label: "spam",
        confidence: 0.7,
        reasons,
        protected: false,
        spam: true,
      };
    }
  }

  reasons.push("no_positive_signals");
  return {
    label: "unknown",
    confidence: 0.3,
    reasons,
    protected: false,
    spam: false,
  };
}

/** True if address is a canonical Stock Token, or symbol matches the registry. */
export function isStockToken(
  symbol: string | null | undefined,
  address?: string | null,
) {
  const c = classifyHolding({ symbol, address });
  return c.label === "stock";
}

export function isStableToken(
  symbol: string | null | undefined,
  address?: string | null,
) {
  const c = classifyHolding({ symbol, address });
  return c.label === "stable";
}

export function isProtectedHolding(
  symbol: string | null | undefined,
  address?: string | null,
) {
  return classifyHolding({ symbol, address }).protected;
}

/** Symbol-only helper kept for call sites that lack an address. */
export function isProtectedSymbol(symbol: string | null | undefined) {
  return isProtectedHolding(symbol);
}

export function looksLikeSpam(name: string | null, symbol: string | null) {
  return classifyHolding({ name, symbol }).spam;
}

export function parseDisplayAmount(amount: string) {
  const n = Number(amount.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
