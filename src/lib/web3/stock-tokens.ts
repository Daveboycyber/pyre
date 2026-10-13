/**
 * Robinhood Stock Token registry (chain 4663).
 *
 * Browser calls to api.robinhood.com fail CORS from the Vercel origin.
 * We seed from a same-origin snapshot at /stock-tokens.json (in public/),
 * then best-effort refresh from the live Robinhood API.
 */

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
 * Populate the Stock Token map. Prefer same-origin snapshot (CORS-safe),
 * then try live Robinhood. Throws only if both leave the map empty.
 */
export async function ensureStockRegistry(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    let lastError: unknown;

    try {
      await loadSnapshot();
    } catch (err) {
      lastError = err;
      console.warn("[pyre] stock token snapshot failed", err);
    }

    for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
      try {
        await fetchStockRegistry();
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[pyre] live stock registry fetch failed (attempt ${attempt}/${FETCH_ATTEMPTS})`,
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
