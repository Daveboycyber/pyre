import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyHolding,
  isProtectedHolding,
  isStockToken,
} from "./classify.ts";
import { STOCK_SYMBOLS } from "./stock-tokens.ts";

test("fallback symbols protect major Stock Token tickers", () => {
  assert.equal(STOCK_SYMBOLS.has("NVDA"), true);
  assert.equal(isStockToken("NVDA"), true);
  assert.equal(isProtectedHolding("AAPL"), true);
});

test("random meme is not a stock token", () => {
  assert.equal(
    isStockToken("ROSIE", "0x4444444444444444444444444444444444444444"),
    false,
  );
});

test("unknown address with a stock ticker still locks (fail closed)", () => {
  assert.equal(
    isProtectedHolding("META", "0x1111111111111111111111111111111111111111"),
    true,
  );
});

test("classifyHolding attaches reasons for stock symbol", () => {
  const c = classifyHolding({ symbol: "AAPL" });
  assert.equal(c.label, "stock");
  assert.equal(c.protected, true);
  assert.ok(c.confidence >= 0.8);
  assert.ok(c.reasons.includes("symbol_in_stock_registry"));
});

test("classifyHolding flags spam patterns with evidence", () => {
  const c = classifyHolding({
    name: "Claim free airdrop at www.scam.com",
    symbol: "FREE",
  });
  assert.equal(c.label, "spam");
  assert.equal(c.spam, true);
  assert.ok(c.reasons.some((r) => r.startsWith("spam_pattern:")));
});

test("stock symbol beats spam-looking name", () => {
  const c = classifyHolding({
    symbol: "AAPL",
    name: "visit claim.reward.app",
  });
  assert.equal(c.label, "stock");
  assert.equal(c.protected, true);
  assert.equal(c.spam, false);
});

test("unknown holding has low confidence", () => {
  const c = classifyHolding({
    symbol: "XYZ123",
    name: "Some token",
    address: "0x2222222222222222222222222222222222222222",
  });
  assert.equal(c.label, "unknown");
  assert.ok(c.confidence < 0.5);
  assert.ok(c.reasons.includes("no_positive_signals"));
});
