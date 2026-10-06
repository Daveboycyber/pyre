import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { creditsEarnedFromClean } from "./credits.ts";

describe("creditsEarnedFromClean", () => {
  it("awards one credit when any ETH was recovered", () => {
    assert.equal(creditsEarnedFromClean(1n), 1);
    assert.equal(creditsEarnedFromClean(10n ** 15n), 1);
  });

  it("awards nothing when recovery is zero", () => {
    assert.equal(creditsEarnedFromClean(0n), 0);
  });
});
