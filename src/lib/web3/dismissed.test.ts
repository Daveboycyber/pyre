import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Pure shape checks — localStorage APIs are exercised in the browser.
describe("dismissed module exports", () => {
  it("exports the expected function names", async () => {
    const mod = await import("./dismissed.ts");
    assert.equal(typeof mod.getDismissedIds, "function");
    assert.equal(typeof mod.dismissAsset, "function");
    assert.equal(typeof mod.undismissAsset, "function");
    assert.equal(typeof mod.clearDismissed, "function");
    assert.equal(typeof mod.pruneDismissedToHeld, "function");
  });
});
