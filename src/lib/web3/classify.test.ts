import assert from "node:assert/strict";
import { test } from "node:test";
import { isProtectedHolding, isStockToken } from "./classify.ts";
import { STOCK_BY_ADDRESS, STOCK_TOKENS } from "./stock-tokens.ts";

test("registry has published Robinhood tickers by address", () => {
  assert.ok(STOCK_TOKENS.length >= 180);
  const nvda = STOCK_BY_ADDRESS.get(
    "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec",
  );
  assert.equal(nvda?.symbol, "NVDA");
});

test("canonical address is protected even if the symbol is spoofed", () => {
  assert.equal(
    isStockToken("FAKE", "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC"),
    true,
  );
});

test("unknown address with a stock ticker still locks (fail closed)", () => {
  assert.equal(
    isProtectedHolding("META", "0x1111111111111111111111111111111111111111"),
    true,
  );
});

test("random meme is not a stock token", () => {
  assert.equal(
    isStockToken("ROSIE", "0x4444444444444444444444444444444444444444"),
    false,
  );
});
