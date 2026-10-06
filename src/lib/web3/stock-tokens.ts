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

export async function ensureStockRegistry(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
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
        }
      }
      loaded = true;
    } catch (err) {
      console.error("[pyre] stock registry fetch failed; using fallback symbols", err);
      loaded = true;
    }
  })();
  return loadPromise;
}

export const STOCK_TOKENS: readonly StockToken[] = [];
