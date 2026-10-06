import { USDG_ADDRESS, WETH_ADDRESS } from "./chain";
import { STOCK_BY_ADDRESS, STOCK_SYMBOLS } from "./stock-tokens";

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

const SPAM_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\.(com|org|net|xyz|io|app)\b/i,
  /\bclaim\b/i,
  /\bairdrop\b/i,
  /\bvisit\b/i,
  /\breward[s]?\b/i,
  /\$\s*\d+[km]?\s*(free|bonus)/i,
];

function asAddressKey(address: string | null | undefined) {
  if (!address || !address.startsWith("0x")) return null;
  return address.toLowerCase();
}

/** True if address is a canonical Stock Token, or symbol matches the registry (fail-closed). */
export function isStockToken(
  symbol: string | null | undefined,
  address?: string | null,
) {
  const key = asAddressKey(address);
  if (key && STOCK_BY_ADDRESS.has(key)) return true;
  if (!symbol) return false;
  return STOCK_SYMBOLS.has(symbol.toUpperCase());
}

export function isStableToken(
  symbol: string | null | undefined,
  address?: string | null,
) {
  const key = asAddressKey(address);
  if (key && STABLE_ADDRESSES.has(key)) return true;
  if (!symbol) return false;
  return STABLE_SYMBOLS.has(symbol.toUpperCase());
}

export function isProtectedHolding(
  symbol: string | null | undefined,
  address?: string | null,
) {
  return isStockToken(symbol, address) || isStableToken(symbol, address);
}

/** Symbol-only helper kept for call sites that lack an address. */
export function isProtectedSymbol(symbol: string | null | undefined) {
  return isProtectedHolding(symbol);
}

export function looksLikeSpam(name: string | null, symbol: string | null) {
  const haystack = `${name ?? ""} ${symbol ?? ""}`;
  return SPAM_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function parseDisplayAmount(amount: string) {
  const n = Number(amount.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
