/**
 * Robinhood Stock Token registry (chain 4663).
 *
 * Live list: https://api.robinhood.com/rhj/assets
 * That host does not send Access-Control-Allow-Origin, so browser fetches
 * from the Vercel app origin fail. We still try:
 *   1) same-origin /stock-tokens.json snapshot (if present)
 *   2) live Robinhood API (works in non-browser contexts)
 * and always fall back to FALLBACK_SYMBOLS so scan is never hard-blocked.
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
  "ASML", "APP", "ARM", "SMCI", "MSTR", "HOOD", "NU", "SOFI", "RIVN", "LCID",
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

const FETCH_ATTEMPTS = 2;

/**
 * Populate the Stock Token map. Never blocks scan: symbol fallback always
 * remains. Address map is filled when snapshot or live API succeeds.
 */
export async function ensureStockRegistry(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      await loadSnapshot();
    } catch (err) {
      console.warn("[pyre] stock token snapshot unavailable", err);
    }

    for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
      try {
        await fetchStockRegistry();
        break;
      } catch (err) {
        console.warn(
          `[pyre] live stock registry fetch failed (attempt ${attempt}/${FETCH_ATTEMPTS})`,
          err,
        );
        if (attempt < FETCH_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
      }
    }

    // Always ready: FALLBACK_SYMBOLS protect major tickers even with no addresses.
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
