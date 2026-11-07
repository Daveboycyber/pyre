import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, getAddress } from "viem";
import {
  buildErc20DeadTransfer,
  buildErc20Revoke,
  buildErc721DeadTransfer,
  buildErc721RevokeAll,
  erc20Abi,
  erc721Abi,
} from "./actions.ts";
import { DEAD_ADDRESS } from "./chain.ts";
import { hasPyreTag, PYRE_TAG, taggedCandidates, withPyreTag } from "./pyre-tag.ts";

const OWNER = getAddress("0x00000000000000000000000000000000000a11ce");
const SPENDER = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

test("the tag is appended after the ABI-encoded arguments", () => {
  const data = buildErc20DeadTransfer(123n);
  const tagged = withPyreTag(data);
  assert.equal(tagged, `${data}${PYRE_TAG.slice(2)}`);
  assert.equal(tagged.length, data.length + 10);
});

test("tagged calldata keeps every byte a contract reads unchanged", () => {
  const cases = [
    { abi: erc20Abi, data: buildErc20DeadTransfer(10n ** 18n), args: [DEAD_ADDRESS, 10n ** 18n] },
    { abi: erc20Abi, data: buildErc20Revoke(SPENDER), args: [SPENDER, 0n] },
    { abi: erc721Abi, data: buildErc721DeadTransfer(OWNER, 7n), args: [OWNER, DEAD_ADDRESS, 7n] },
    { abi: erc721Abi, data: buildErc721RevokeAll(SPENDER), args: [SPENDER, false] },
  ] as const;
  for (const { abi, data, args } of cases) {
    const tagged = withPyreTag(data);
    // Selector and argument words are identical; the tag only follows them.
    assert.ok(tagged.startsWith(data));
    assert.equal((tagged.length - data.length) / 2, 5);
    assert.deepEqual(decodeFunctionData({ abi, data }).args, args);
  }
});

test("hasPyreTag recognises tagged calldata and nothing else", () => {
  const data = buildErc20Revoke(SPENDER);
  assert.equal(hasPyreTag(withPyreTag(data)), true);
  assert.equal(hasPyreTag(withPyreTag(data).toUpperCase().replace("0X", "0x")), true);
  assert.equal(hasPyreTag(data), false);
  assert.equal(hasPyreTag("0x"), false);
  assert.equal(hasPyreTag(PYRE_TAG), false);
});

test("hasPyreTag ignores an argument that merely ends in the tag bytes", () => {
  // 0x…5059524501 as the last 5 bytes of a uint256 argument: word-aligned, so not a tag.
  const amount = BigInt(PYRE_TAG);
  const data = buildErc20DeadTransfer(amount);
  assert.ok(data.toLowerCase().endsWith(PYRE_TAG.slice(2)));
  assert.equal(hasPyreTag(data), false);
});

test("taggedCandidates tries each path tagged first, then untagged, in order", () => {
  const a = buildErc20DeadTransfer(1n);
  const b = buildErc20Revoke(SPENDER);
  assert.deepEqual(taggedCandidates([a, b]), [withPyreTag(a), a, withPyreTag(b), b]);
  assert.deepEqual(taggedCandidates([]), []);
});
