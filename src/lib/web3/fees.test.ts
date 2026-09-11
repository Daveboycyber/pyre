import assert from "node:assert/strict";
import { test } from "node:test";
import { BATCH_THRESHOLD, isBatch, protocolFeeWei, TREASURY_ADDRESS, treasuryIsLive } from "./fees.ts";

test("single actions are free", () => {
  assert.equal(isBatch(0), false);
  assert.equal(isBatch(1), false);
  assert.equal(protocolFeeWei(0), 0n);
  assert.equal(protocolFeeWei(1), 0n);
});

test("two or more actions are a batch", () => {
  assert.equal(BATCH_THRESHOLD, 2);
  assert.equal(isBatch(2), true);
  assert.equal(isBatch(7), true);
  assert.ok(protocolFeeWei(2) > 0n);
  assert.equal(protocolFeeWei(2), protocolFeeWei(99));
});

test("treasury is the live payout address", () => {
  assert.equal(treasuryIsLive(), true);
  assert.equal(
    TREASURY_ADDRESS.toLowerCase(),
    "0xd456de00cb1b20f90d7f7f2a5a38f211f5bb88d6",
  );
});
