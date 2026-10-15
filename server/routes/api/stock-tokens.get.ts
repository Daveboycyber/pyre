/**
 * Same-origin Stock Token list for chain 4663.
 * Fetches api.robinhood.com on the server so the browser is not blocked by CORS.
 */
import { createError, defineEventHandler, setHeader } from "h3";

const UPSTREAM = "https://api.robinhood.com/rhj/assets";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type Row = { symbol: string; name: string; address: string };

let cache: { at: number; rows: Row[] } | null = null;

async function loadRows(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.rows;
  }

  const res = await fetch(UPSTREAM, {
    headers: {
      accept: "application/json",
      "user-agent": "Pyre/1.0 (+https://pyre-mu.vercel.app)",
    },
  });
  if (!res.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Robinhood assets upstream ${res.status}`,
    });
  }

  const data = (await res.json()) as {
    assets?: Array<{
      tokenSymbol?: string;
      tokenName?: string;
      deployments?: Array<{ chainId?: number; contractAddress?: string }>;
    }>;
  };

  const rows: Row[] = [];
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
    }
  }

  if (rows.length === 0) {
    throw createError({
      statusCode: 502,
      statusMessage: "Robinhood assets list has no chain 4663 tokens",
    });
  }

  cache = { at: Date.now(), rows };
  return rows;
}

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "public, max-age=300");
  setHeader(event, "content-type", "application/json; charset=utf-8");
  const rows = await loadRows();
  return rows;
});
