/**
 * Robinhood Stock Token registry (chain 4663).
 *
 * Load order:
 *   1) Same-origin /api/stock-tokens (Nitro proxies Robinhood — no CORS)
 *   2) Same-origin /stock-tokens.json snapshot if present
 *   3) FALLBACK_SYMBOLS so scan is never hard-blocked
 */

export type StockToken = {
  symbol: string;
  address: `0x${string}`;
  name: string;
};

/** Popular tickers always treated as stock. */
const FALLBACK_SYMBOLS = [
  "NVDA", "AAPL", "GOOGL", "GOOG", "AMZN", "META", "TSLA", "MSFT", "QQQ", "SPY",
  "AMD", "AVGO", "COIN", "COST", "CRM", "CRWD", "DIS", "HOOD", "INTC", "NFLX",
  "ORCL", "PLTR", "SHOP", "UBER", "V", "XOM", "BABA", "BA", "JPM", "GS",
  "ASML", "APP", "ARM", "SMCI", "MSTR", "NU", "SOFI", "RIVN", "LCID",
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

/**
 * Populate the Stock Token map. Prefers the app API (full address list).
 * Never blocks scan: symbol fallback always remains.
 */
export async function ensureStockRegistry(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      await loadFromAppApi();
    } catch (err) {
      console.warn("[pyre] /api/stock-tokens failed", err);
      try {
        await loadSnapshot();
      } catch (snapErr) {
        console.warn("[pyre] stock token snapshot unavailable", snapErr);
      }
    }

    // Always ready: FALLBACK_SYMBOLS protect major tickers even with no addresses.
    loaded = true;
  })().finally(() => {
    loadPromise = null;
  });
  return loadPromise;
}

async function loadFromAppApi() {
  const res = await fetch("/api/stock-tokens", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const data = (await res.json()) as Array<{
    symbol?: string;
    name?: string;
    address?: string;
  }>;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("api empty");
  }
  ingest(
    data.map((r) => ({
      symbol: r.symbol ?? "",
      name: r.name ?? r.symbol ?? "",
      address: r.address ?? "",
    })),
  );
}

async function loadSnapshot() {
  const res = await fetch("/stock-tokens.json", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`snapshot ${res.status}`);
  const data = (await res.json()) as Array<{
    symbol?: string;
    name?: string;
    address?: string;
  }>;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("snapshot empty");
  }
  ingest(
    data.map((r) => ({
      symbol: r.symbol ?? "",
      name: r.name ?? r.symbol ?? "",
      address: r.address ?? "",
    })),
  );
}

export const STOCK_TOKENS: readonly StockToken[] = [];
