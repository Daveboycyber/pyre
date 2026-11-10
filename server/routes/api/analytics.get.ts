/** Public, read-only Pyre usage stats built from on-chain events. */
import { createError, defineEventHandler, setHeader } from "h3";
import { getSnapshot } from "../../lib/analytics-collector.ts";

export default defineEventHandler(async (event) => {
  setHeader(event, "content-type", "application/json; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=60, s-maxage=120, stale-while-revalidate=600");
  try {
    return JSON.stringify(await getSnapshot());
  } catch (err) {
    console.error("[analytics] refresh failed", err);
    throw createError({
      statusCode: 502,
      statusMessage: "Could not read Robinhood Chain right now",
    });
  }
});
