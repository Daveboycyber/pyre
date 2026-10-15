import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LastClean } from "../../lib/web3/types.ts";
import { cleanOutcome, failureSummary, feeCharged, succeededCount } from "./outcome.ts";

const base: LastClean = {
  tokens: 0,
  nfts: 0,
  approvals: 0,
  swept: 0,
  dustSwaps: 0,
  failed: 0,
  feeWei: 500n,
  feePaid: true,
  recoveredWei: 0n,
  cutWei: 0n,
};

describe("clean outcome", () => {
  it("is success when every line went through", () => {
    const r = { ...base, tokens: 2, approvals: 1 };
    assert.equal(succeededCount(r), 3);
    assert.equal(cleanOutcome(r), "success");
  });

  it("is partial when some lines failed", () => {
    assert.equal(cleanOutcome({ ...base, tokens: 1, failed: 1 }), "partial");
  });

  it("is failed when nothing went through", () => {
    assert.equal(cleanOutcome({ ...base, failed: 3 }), "failed");
  });
});

describe("fee and failure copy", () => {
  it("says the user was not charged when the fee itself failed", () => {
    const r = { ...base, failed: 2, feePaid: false };
    assert.equal(feeCharged(r), false);
    assert.match(failureSummary(r), /not charged/);
  });

  it("mentions the credit when the fee was paid but every line failed", () => {
    const r = { ...base, failed: 2, creditsEarned: 1 };
    assert.equal(feeCharged(r), true);
    assert.match(failureSummary(r), /credit/);
  });

  it("treats a waived fee as not charged", () => {
    assert.equal(feeCharged({ ...base, feeWaived: true }), false);
  });
});
