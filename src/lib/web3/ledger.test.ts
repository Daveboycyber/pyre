import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { addCredits, getCredits, spendCredit } from "./credits.ts";
import {
  clearDismissed,
  dismissAsset,
  getDismissedIds,
  pruneDismissedToHeld,
  undismissAsset,
} from "./dismissed.ts";

const WALLET = "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01";

// Minimal in-memory localStorage so the ledgers run under node.
function installStorage() {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  };
  return store;
}

describe("credits ledger", () => {
  beforeEach(installStorage);

  it("adds, reads and spends per wallet, case-insensitively", () => {
    assert.equal(getCredits(WALLET), 0);
    assert.equal(addCredits(WALLET, 2), 2);
    assert.equal(getCredits(WALLET.toLowerCase()), 2);
    assert.equal(spendCredit(WALLET), true);
    assert.equal(getCredits(WALLET), 1);
  });

  it("refuses to spend below zero and ignores bad input", () => {
    assert.equal(spendCredit(WALLET), false);
    assert.equal(addCredits(WALLET, -3), 0);
    assert.equal(addCredits("0x123", 1), 0);
    assert.equal(getCredits(null), 0);
  });

  it("survives corrupt storage", () => {
    const store = installStorage();
    store.set("pyre.credits.v0", "{not json");
    assert.equal(getCredits(WALLET), 0);
  });
});

describe("dismissed ledger", () => {
  beforeEach(installStorage);

  it("dismisses, restores and clears ids", () => {
    dismissAsset(WALLET, "a");
    dismissAsset(WALLET, "b");
    assert.deepEqual([...getDismissedIds(WALLET)].sort(), ["a", "b"]);
    undismissAsset(WALLET, "a");
    assert.deepEqual([...getDismissedIds(WALLET)], ["b"]);
    clearDismissed(WALLET);
    assert.equal(getDismissedIds(WALLET).size, 0);
  });

  it("prunes ids no longer held", () => {
    dismissAsset(WALLET, "a");
    dismissAsset(WALLET, "b");
    assert.deepEqual([...pruneDismissedToHeld(WALLET, ["b", "c"])], ["b"]);
    assert.deepEqual([...getDismissedIds(WALLET)], ["b"]);
  });

  it("ignores invalid wallets", () => {
    assert.equal(dismissAsset("nope", "a").size, 0);
  });
});
