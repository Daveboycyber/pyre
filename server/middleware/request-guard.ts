/**
 * First stop for every request, before any page renders or handler runs.
 *
 * Scanner probes (/.env, /wp-admin, *.php, ...) get an empty 404: bots cost
 * nothing and learn nothing.
 *
 * Public API (/api/analytics*, /api/stock-tokens):
 * - Only GET and HEAD. Everything else gets 405.
 * - Oversized URLs get 414.
 * - Per-client rate limits (src/lib/rate-limit.ts) answer 429 + Retry-After.
 * - Strict headers: never sniffed, framed, indexed or loaded by other sites,
 *   and no CORS header is ever sent, so other origins cannot read it.
 *
 * Pages: a generous per-client rate limit against scrapers looping on SSR.
 * Page security headers are added by security-headers.ts.
 *
 * /api/auth/*, server functions, assets and platform routes are not touched.
 */
import type { H3Event } from "h3";
import {
  apiRule,
  clientKey,
  isPagePath,
  isProbePath,
  PAGE_RULE,
  RateLimiter,
} from "../../src/lib/rate-limit.ts";

const MAX_URL_LENGTH = 512;

const API_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

const limiter = new RateLimiter();

function reject(status: number, message: string | null, extra: Record<string, string> = {}) {
  const body = message === null ? null : JSON.stringify({ error: true, status, message });
  return new Response(body, {
    status,
    headers: {
      ...API_HEADERS,
      ...(body ? { "content-type": "application/json; charset=utf-8" } : {}),
      "cache-control": "no-store",
      ...extra,
    },
  });
}

function tooMany(retryAfterSec: number, limit: number) {
  return reject(429, "Too many requests. Slow down and try again shortly.", {
    "Retry-After": String(retryAfterSec),
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": "0",
  });
}

export default async function requestGuard(
  event: H3Event,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const url = event.url;
  const path = url.pathname;

  if (isProbePath(path)) return reject(404, null);

  const ip = clientKey(event.req.headers, (event.req as { ip?: string }).ip);
  const method = event.req.method.toUpperCase();

  const rule = apiRule(path);
  if (rule) {
    if (method !== "GET" && method !== "HEAD") {
      return reject(405, "Method not allowed", { Allow: "GET, HEAD" });
    }
    if (url.href.length > MAX_URL_LENGTH) return reject(414, "Request URL too long");

    const verdict = limiter.check(`${path}|${ip}`, rule);
    if (!verdict.ok) return tooMany(verdict.retryAfterSec, verdict.limit);

    for (const [name, value] of Object.entries(API_HEADERS)) event.res.headers.set(name, value);
    event.res.headers.set("RateLimit-Limit", String(verdict.limit));
    event.res.headers.set("RateLimit-Remaining", String(verdict.remaining));
    return next();
  }

  if ((method === "GET" || method === "HEAD") && isPagePath(path)) {
    const verdict = limiter.check(`page|${ip}`, PAGE_RULE);
    if (!verdict.ok) return tooMany(verdict.retryAfterSec, verdict.limit);
  }

  return next();
}
