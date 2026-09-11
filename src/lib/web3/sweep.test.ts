import assert from "node:assert/strict";
import { test } from "node:test";

const SWEEP_CUT_BPS = 125n;
const GAS_BUFFER_WEI = 100_000_000_000_000n;

function sweepCutWei(grossWei: bigint) {
  return (grossWei * SWEEP_CUT_BPS) / 10_000n;
}

function quoteClears(grossWei: bigint, feeWei: bigint) {
  return grossWei > feeWei + GAS_BUFFER_WEI;
}

test("cut is 1.25 percent", () => {
  const gross = 10_000n;
  assert.equal(sweepCutWei(gross), 125n);
  assert.equal(gross - sweepCutWei(gross), 9875n);
});

test("negative-value quotes are not listed", () => {
  const fee = 500_000_000_000_000n;
  assert.equal(quoteClears(0n, fee), false);
  assert.equal(quoteClears(fee, fee), false);
  assert.equal(quoteClears(fee + GAS_BUFFER_WEI, fee), false);
  assert.equal(quoteClears(fee + GAS_BUFFER_WEI + 1n, fee), true);
});
