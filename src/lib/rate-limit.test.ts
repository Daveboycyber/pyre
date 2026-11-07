import assert from "node:assert/strict";
import { test } from "node:test";
import { apiRule, clientKey, isPagePath, isProbePath, RateLimiter } from "./rate-limit.ts";

const RULE = { limit: 3, windowMs: 1_000 };

test("allows up to the limit, then blocks with a retry time", () => {
  const rl = new RateLimiter();
  assert.equal(rl.check("a", RULE, 0).ok, true);
  assert.equal(rl.check("a", RULE, 100).ok, true);
  const third = rl.check("a", RULE, 200);
  assert.equal(third.ok, true);
  assert.equal(third.remaining, 0);
  const blocked = rl.check("a", RULE, 300);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterSec, 1);
});

test("the window slides: old hits stop counting", () => {
  const rl = new RateLimiter();
  for (const t of [0, 10, 20]) rl.check("a", RULE, t);
  assert.equal(rl.check("a", RULE, 500).ok, false);
  assert.equal(rl.check("a", RULE, 1_001).ok, true);
});

test("blocked requests do not extend the ban", () => {
  const rl = new RateLimiter();
  for (const t of [0, 1, 2]) rl.check("a", RULE, t);
  for (let t = 3; t < 900; t += 50) assert.equal(rl.check("a", RULE, t).ok, false);
  assert.equal(rl.check("a", RULE, 1_001).ok, true);
});

test("clients are counted separately", () => {
  const rl = new RateLimiter();
  for (const t of [0, 1, 2]) rl.check("a", RULE, t);
  assert.equal(rl.check("a", RULE, 3).ok, false);
  assert.equal(rl.check("b", RULE, 3).ok, true);
});

test("memory stays bounded by evicting the least recently seen clients", () => {
  const rl = new RateLimiter(100);
  for (let i = 0; i < 1_000; i++) rl.check(`ip-${i}`, RULE, i);
  assert.equal(rl.size, 100);
});

test("apiRule covers the public API and leaves auth alone", () => {
  assert.equal(apiRule("/api/analytics/wallet")?.limit, 20);
  assert.equal(apiRule("/api/analytics")?.limit, 60);
  assert.equal(apiRule("/api/stock-tokens")?.limit, 30);
  assert.equal(apiRule("/api/auth/get-session"), null);
  assert.equal(apiRule("/stats"), null);
});

test("clientKey prefers the platform's client IP headers", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  assert.equal(
    clientKey(h({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "9.9.9.9" })),
    "1.1.1.1",
  );
  assert.equal(clientKey(h({ "x-real-ip": "2.2.2.2" })), "2.2.2.2");
  assert.equal(clientKey(h({ "x-forwarded-for": "3.3.3.3, 10.0.0.1" })), "3.3.3.3");
  assert.equal(clientKey(h({}), "4.4.4.4"), "4.4.4.4");
  assert.equal(clientKey(h({})), "unknown");
});

test("isPagePath limits rendered pages, not assets, API or platform routes", () => {
  for (const path of ["/", "/stats", "/clean", "/fees", "/privacy"])
    assert.equal(isPagePath(path), true, path);
  for (const path of [
    "/assets/index-abc.js",
    "/favicon.svg",
    "/stock-tokens.json",
    "/api/analytics",
    "/api/auth/get-session",
    "/_serverFn/abc",
    "/__grok/manifest.webmanifest",
    "/auth/popup",
  ]) {
    assert.equal(isPagePath(path), false, path);
  }
});

test("isProbePath catches scanner probes and spares real routes", () => {
  for (const path of [
    "/.env",
    "/.env.production",
    "/.git/config",
    "/wp-admin/",
    "/wp-login.php",
    "/xmlrpc.php",
    "/phpmyadmin/index.php",
    "/backup.sql",
    "/admin/config.php",
    "/.aws/credentials",
  ]) {
    assert.equal(isProbePath(path), true, path);
  }
  for (const path of [
    "/",
    "/stats",
    "/clean",
    "/assets/app-123.js",
    "/stock-tokens.json",
    "/api/analytics",
  ]) {
    assert.equal(isProbePath(path), false, path);
  }
});
