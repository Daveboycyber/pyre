/** One wallet's Pyre history, from the same on-chain data as /api/analytics. */
import { createError, defineEventHandler, getQuery, setHeader } from "h3";
import { isAddress } from "../../../../src/lib/web3/analytics.ts";
import { getWalletHistory } from "../../../lib/analytics-collector.ts";

export default defineEventHandler(async (event) => {
  const address = String(getQuery(event).address ?? "").trim();
  if (!isAddress(address)) {
    throw createError({ statusCode: 400, statusMessage: "Enter a valid 0x wallet address" });
  }
  setHeader(event, "content-type", "application/json; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=60, s-maxage=120, stale-while-revalidate=600");
  try {
    return JSON.stringify(await getWalletHistory(address));
  } catch (err) {
    console.error("[analytics] wallet lookup failed", err);
    throw createError({
      statusCode: 502,
      statusMessage: "Could not read Robinhood Chain right now",
    });
  }
});
