/**
 * Pyre transaction tag.
 *
 * Burns and revokes are plain token calls from the user's own wallet, so
 * nothing on-chain says Pyre made them. Pyre appends these 5 bytes ("PYRE" +
 * version 1) to the end of that calldata so public stats can count them.
 *
 * ABI decoding reads arguments at fixed offsets and ignores trailing bytes,
 * so standard tokens behave exactly the same. A token that rejects longer
 * calldata fails simulation, and the cleaner then sends the untagged call
 * instead. The tag never changes which function runs or with what arguments.
 *
 * Pure helpers only (no network) so they run under Node's test runner.
 */

export const PYRE_TAG = "0x5059524501" as const;

const TAG_HEX = PYRE_TAG.slice(2);
const TAG_BYTES = TAG_HEX.length / 2;

export function withPyreTag(data: `0x${string}`): `0x${string}` {
  return `${data}${TAG_HEX}`;
}

/**
 * True for calldata Pyre tagged: a 4-byte selector, whole 32-byte words, then
 * the tag. The length check keeps an argument that merely ends in the same
 * bytes from counting.
 */
export function hasPyreTag(input: string) {
  const hex = input.toLowerCase().replace(/^0x/, "");
  if (hex.length % 2 !== 0 || !hex.endsWith(TAG_HEX)) return false;
  const bytes = hex.length / 2;
  return bytes >= 4 + TAG_BYTES && (bytes - 4 - TAG_BYTES) % 32 === 0;
}

/** Each candidate tagged first, then as-is, so simulation picks the tag when the token allows it. */
export function taggedCandidates(candidates: readonly `0x${string}`[]): `0x${string}`[] {
  return candidates.flatMap((data) => [withPyreTag(data), data]);
}
