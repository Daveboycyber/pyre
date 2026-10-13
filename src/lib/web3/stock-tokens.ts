/**
 * Robinhood Stock Token registry (chain 4663).
 * Live list: https://api.robinhood.com/rhj/assets
 * Browser calls to that host fail CORS from Vercel, so we always seed from
 * `stock-token-snapshot.ts` and treat the live fetch as a best-effort refresh.
 */

import { STOCK_TOKEN_SNAPSHOT } from "./stock-token-snapshot";

export type StockToken = {
  symbol: string;
  address: `0x${string}`;
  name: string;
};

/** Popular tickers always treated as stock even before the list is ready. */
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

function ingest(
  entries: ReadonlyArray<{ symbol: string; name: string; address: string }>,
) {
  for (const e of entries) {
    const symbol = e.symbol.trim();
    if (!symbol || !e.address) continue;
    STOCK_SYMBOLS.add(symbol.toUpperCase());
    const address = e.address as `0x${string}`;
    STOCK_BY_ADDRESS.set(address.toLowerCase(), {
      symbol,
      address,
      name: (e.name || symbol).trim(),
    });
  }
}

const FETCH_ATTEMPTS = 3;

/**
 * Ensure the Stock Token map is populated. Seeds the committed snapshot first
 * (CORS-safe), then tries to refresh from Robinhood. Only throws if the map
 * is still empty after both paths — which should not happen with a snapshot.
 */
export async function ensureStockRegistry(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    ingest(STOCK_TOKEN_SNAPSHOT);

    let lastError: unknown;
    for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
      try {
        await fetchStockRegistry();
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[pyre] live stock registry fetch failed (attempt ${attempt}/${FETCH_ATTEMPTS}); snapshot still active`,
          err,
        );
        if (attempt < FETCH_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    if (STOCK_BY_ADDRESS.size === 0) {
      throw new Error(
        "Could not load the Robinhood Stock Token list, so Stock Tokens cannot be protected. Try scanning again.",
        { cause: lastError },
      );
    }
    loaded = true;
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
  const rows: Array<{ symbol: string; name: string; address: string }> = [];
  for (const a of data.assets ?? []) {
    const symbol = (a.tokenSymbol ?? "").trim();
    if (!symbol) continue;
    for (const d of a.deployments ?? []) {
      if (Number(d.chainId) !== 4663 || !d.contractAddress) continue;
      rows.push({
        symbol,
        name: (a.tokenName ?? symbol).trim(),
        address: d.contractAddress,
      });
      onChain += 1;
    }
  }
  if (onChain === 0) throw new Error("assets list has no chain 4663 tokens");
  ingest(rows);
}

export const STOCK_TOKENS: readonly StockToken[] = [];
