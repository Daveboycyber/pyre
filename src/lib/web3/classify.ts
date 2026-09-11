const STABLE_SYMBOLS = new Set([
  "ETH",
  "WETH",
  "USDC",
  "USDT",
  "USDG",
  "USDE",
  "DAI",
]);

const STOCK_SYMBOLS = new Set([
  "NVDA",
  "AAPL",
  "GOOGL",
  "GOOG",
  "AMZN",
  "META",
  "TSLA",
  "MSFT",
  "QQQ",
  "SPY",
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

export function isStockToken(symbol: string | null | undefined) {
  if (!symbol) return false;
  return STOCK_SYMBOLS.has(symbol.toUpperCase());
}

export function isProtectedSymbol(symbol: string | null | undefined) {
  if (!symbol) return false;
  const upper = symbol.toUpperCase();
  return STABLE_SYMBOLS.has(upper) || STOCK_SYMBOLS.has(upper);
}

export function looksLikeSpam(name: string | null, symbol: string | null) {
  const haystack = `${name ?? ""} ${symbol ?? ""}`;
  return SPAM_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function parseDisplayAmount(amount: string) {
  const n = Number(amount.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
