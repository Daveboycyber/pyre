import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeAbiParameters, pad } from "viem";
import { assertReceiptSuccess, unwrappedWei } from "./receipt.ts";

const WETH = "0x1111111111111111111111111111111111111111" as const;
const ROUTER = "0x2222222222222222222222222222222222222222" as const;
const OTHER = "0x3333333333333333333333333333333333333333" as const;
// keccak256("Withdrawal(address,uint256)")
const WITHDRAWAL =
  "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65";

function withdrawal(address: `0x${string}`, src: `0x${string}`, wad: bigint) {
  return {
    address,
    topics: [WITHDRAWAL, pad(src)] as [`0x${string}`, `0x${string}`],
    data: encodeAbiParameters([{ type: "uint256" }], [wad]),
  };
}

test("a reverted receipt throws with its label", () => {
  assert.throws(
    () => assertReceiptSuccess({ status: "reverted" }, "Protocol fee"),
    /Protocol fee reverted on-chain/,
  );
  assert.doesNotThrow(() => assertReceiptSuccess({ status: "success" }, "x"));
});

test("unwrappedWei reads the router's WETH withdrawal", () => {
  const logs = [
    withdrawal(WETH, ROUTER, 1_000n),
    withdrawal(WETH, OTHER, 5n), // another account's unwrap
    withdrawal(OTHER, ROUTER, 7n), // not WETH
    { address: WETH, topics: [pad("0x01")] as [`0x${string}`], data: "0x" as const },
  ];
  assert.equal(unwrappedWei(logs, WETH, ROUTER), 1_000n);
});

test("unwrappedWei is null when no withdrawal is found", () => {
  assert.equal(unwrappedWei([], WETH, ROUTER), null);
});
