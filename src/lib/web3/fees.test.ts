import assert from "node:assert/strict";
import { test } from "node:test";
import { BATCH_THRESHOLD, isBatch, protocolFeeWei, resolveBatchFee, TREASURY_ADDRESS, treasuryIsLive } from "./fees.ts";

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

test("on-chain fee at or below the quoted fee is what gets sent", () => {
  assert.equal(resolveBatchFee(500n, 500n), 500n);
  assert.equal(resolveBatchFee(500n, 300n), 300n);
  assert.equal(resolveBatchFee(500n, 0n), 0n);
});

test("on-chain fee above the quoted fee stops the clean", () => {
  assert.throws(() => resolveBatchFee(500n, 501n), /Rescan before cleaning/);
});
