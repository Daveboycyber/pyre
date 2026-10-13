/**
 * Robinhood Stock Token registry (chain 4663).
 * Address map is filled from https://api.robinhood.com/rhj/assets at scan time.
 * Symbol set is a fail-closed fallback so lookalike tickers stay locked offline.
 */

export type StockToken = {
  symbol: string;
  address: `0x${string}`;
  name: string;
};

/** Popular tickers always treated as stock even before the network list loads. */
const FALLBACK_SYMBOLS = [
  "NVDA", "AAPL", "GOOGL", "GOOG", "AMZN", "META", "TSLA", "MSFT", "QQQ", "SPY",
  "AMD", "AVGO", "COIN", "COST", "CRM", "CRWD", "DIS", "HOOD", "INTC", "NFLX",
  "ORCL", "PLTR", "SHOP", "UBER", "V", "XOM", "BABA", "BA", "JPM", "GS",
];

export const STOCK_BY_ADDRESS = new Map<string, StockToken>();
export const STOCK_SYMBOLS = new Set(FALLBACK_SYMBOLS);

let loadPromise: Promise<void> | null = null;
let loaded = false;

export function stockRegistryReady() {
  return loaded;
}

const FETCH_ATTEMPTS = 3;

/**
 * Load the live Stock Token list. Throws if every attempt fails: the 30
 * fallback tickers are not enough to protect a real wallet, so callers must
 * not offer cleaning on a failed load. A later call retries.
 */
export async function ensureStockRegistry(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
      try {
        await fetchStockRegistry();
        loaded = true;
        return;
      } catch (err) {
        lastError = err;
        console.error(
          `[pyre] stock registry fetch failed (attempt ${attempt}/${FETCH_ATTEMPTS})`,
          err,
        );
        if (attempt < FETCH_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    }
    throw new Error(
      "Could not load the Robinhood Stock Token list, so Stock Tokens cannot be protected. Try scanning again.",
      { cause: lastError },
    );
  })().finally(() => {
    loadPromise = null;
  });
  return loadPromise;
}

async function fetchStockRegistry() {
  const res = await fetch("https://api.robinhood.com/rhj/assets", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`assets ${res.status}`);
  const data = (await res.json()) as {
    assets?: Array<{
      tokenSymbol?: string;
      tokenName?: string;
      deployments?: Array<{ chainId?: number; contractAddress?: string }>;
    }>;
  };
  let onChain = 0;
  for (const a of data.assets ?? []) {
    const symbol = (a.tokenSymbol ?? "").trim();
    if (!symbol) continue;
    STOCK_SYMBOLS.add(symbol.toUpperCase());
    for (const d of a.deployments ?? []) {
      if (Number(d.chainId) !== 4663 || !d.contractAddress) continue;
      const address = d.contractAddress as `0x${string}`;
      const entry: StockToken = {
        symbol,
        address,
        name: (a.tokenName ?? symbol).trim(),
      };
      STOCK_BY_ADDRESS.set(address.toLowerCase(), entry);
      onChain += 1;
    }
  }
  // An OK response with no chain 4663 deployments protects nothing.
  if (onChain === 0) throw new Error("assets list has no chain 4663 tokens");
}

export const STOCK_TOKENS: readonly StockToken[] = [];
