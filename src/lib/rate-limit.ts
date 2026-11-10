/**
 * Small in-memory sliding-window rate limiter for the public API.
 *
 * It runs per server instance, so on serverless it is a first line of
 * defence, not a global quota: each instance keeps its own counts. Pair it
 * with platform rules (Vercel Firewall) for hard limits.
 *
 * Pure module (no imports) so Node's test runner can load it.
 */

export type RateRule = { limit: number; windowMs: number };

export type RateResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the oldest counted request leaves the window. */
  retryAfterSec: number;
};

const MINUTE = 60_000;

/**
 * Per-path limits for the public API. Wallet lookups are cheapest to abuse
 * (one cache miss per address), so they get the tightest budget.
 * Paths without a rule (e.g. /api/auth/*) are not touched.
 */
export function apiRule(pathname: string): RateRule | null {
  if (pathname === "/api/analytics/wallet") return { limit: 20, windowMs: MINUTE };
  if (pathname === "/api/analytics") return { limit: 60, windowMs: MINUTE };
  if (pathname === "/api/stock-tokens") return { limit: 30, windowMs: MINUTE };
  return null;
}

/**
 * Server-rendered page requests: generous, so shared IPs (mobile carriers,
 * offices) are never blocked by normal browsing, but a scraper looping on
 * SSR is. Assets (paths with a file extension), the API, server functions,
 * auth and platform routes are excluded.
 */
export const PAGE_RULE: RateRule = { limit: 300, windowMs: MINUTE };

export function isPagePath(pathname: string) {
  if (/\.[a-z0-9]{1,8}$/i.test(pathname)) return false;
  return !/^\/(api|_serverFn|_build|__grok|auth|assets)(\/|$)/.test(pathname);
}

/**
 * Paths only vulnerability scanners ask for. Answered with an empty 404
 * before any rendering, so bots cost nothing and learn nothing.
 */
const PROBE =
  /(^|\/)(\.env|\.git|\.svn|\.hg|\.aws|\.ssh|\.DS_Store|wp-admin|wp-login|wp-content|wp-includes|xmlrpc\.php|phpmyadmin|cgi-bin|server-status|\.well-known\/security\.txt\.bak)(\/|$|\.)|\.(php|asp|aspx|jsp|cgi|sql|bak|old|ini|log|sh)$/i;

export function isProbePath(pathname: string) {
  return PROBE.test(pathname);
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxKeys: number;

  // A plain field, not a parameter property: Node's type stripping rejects those.
  constructor(maxKeys = 10_000) {
    this.maxKeys = maxKeys;
  }

  get size() {
    return this.hits.size;
  }

  check(key: string, rule: RateRule, now = Date.now()): RateResult {
    const since = now - rule.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    const ok = recent.length < rule.limit;
    if (ok) recent.push(now);

    // Re-insert so the Map's order is least-recently-seen first.
    this.hits.delete(key);
    this.hits.set(key, recent);
    this.evict();

    const oldest = recent[0] ?? now;
    return {
      ok,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - recent.length),
      retryAfterSec: ok ? 0 : Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000)),
    };
  }

  /** Bound memory: drop the least recently seen clients past maxKeys. */
  private evict() {
    while (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest === undefined) break;
      this.hits.delete(oldest);
    }
  }
}

/**
 * Client IP as set by the platform. Vercel overwrites these headers at its
 * edge, so a client cannot spoof them there; elsewhere they are best-effort.
 */
export function clientKey(headers: { get(name: string): string | null }, fallback?: string) {
  const first = (value: string | null) => value?.split(",")[0]?.trim() || null;
  return (
    first(headers.get("x-vercel-forwarded-for")) ??
    first(headers.get("x-real-ip")) ??
    first(headers.get("x-forwarded-for")) ??
    fallback ??
    "unknown"
  );
}
