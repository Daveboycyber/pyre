import assert from "node:assert/strict";
import { test } from "node:test";
import { tokenContractAddress } from "./token-address.ts";

test("reads Blockscout v2 address_hash", () => {
  assert.equal(
    tokenContractAddress({
      address_hash: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    }),
    "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  );
});

test("falls back to legacy address", () => {
  assert.equal(
    tokenContractAddress({
      address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    }),
    "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  );
});

test("skips missing or junk addresses", () => {
  assert.equal(tokenContractAddress(undefined), null);
  assert.equal(tokenContractAddress({}), null);
  assert.equal(tokenContractAddress({ address_hash: "not-an-address" }), null);
});
