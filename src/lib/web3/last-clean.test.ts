import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { clearLastClean, loadLastClean, saveLastClean } from "./last-clean.ts";
import type { LastClean } from "./types.ts";

const WALLET = "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01";
const OTHER = "0x1111111111111111111111111111111111111111";

const result: LastClean = {
  tokens: 2,
  nfts: 0,
  approvals: 1,
  swept: 1,
  dustSwaps: 0,
  failed: 1,
  feeWei: 500_000_000_000_000n,
  feePaid: true,
  recoveredWei: 12n,
  cutWei: 3n,
  error: "Token rejected the burn",
  txs: [{ label: "CATX", hash: "0xabc", recoveredWei: 12n, cutWei: 3n }],
};

function installSession() {
  const map = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    sessionStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  };
  return map;
}

describe("last clean (session)", () => {
  beforeEach(installSession);

  it("round-trips bigints, receipts and failed lines", () => {
    saveLastClean(WALLET, result, [{ id: "a", name: "Bad", symbol: "BAD", reason: "nope" }], 42);
    const saved = loadLastClean(WALLET.toLowerCase());
    assert.ok(saved);
    assert.equal(saved.at, 42);
    assert.equal(saved.result.feeWei, 500_000_000_000_000n);
    assert.equal(saved.result.txs?.[0].recoveredWei, 12n);
    assert.deepEqual(
      saved.failedLines.map((l) => l.id),
      ["a"],
    );
  });

  it("is scoped to the wallet that ran it", () => {
    saveLastClean(WALLET, result, []);
    assert.equal(loadLastClean(OTHER), null);
  });

  it("clears, and tolerates corrupt data", () => {
    saveLastClean(WALLET, result, []);
    clearLastClean();
    assert.equal(loadLastClean(WALLET), null);
    installSession().set("pyre.lastClean.v1", "{oops");
    assert.equal(loadLastClean(WALLET), null);
  });
});
