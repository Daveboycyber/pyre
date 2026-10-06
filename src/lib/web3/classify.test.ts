import assert from "node:assert/strict";
import { test } from "node:test";
import { isProtectedHolding, isStockToken } from "./classify.ts";
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
