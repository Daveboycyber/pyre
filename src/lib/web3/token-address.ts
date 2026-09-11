const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export type TokenAddressFields = {
  address?: string | null;
  address_hash?: string | null;
};

/** Blockscout v2 tokens use `address_hash`; older instances used `address`. */
export function tokenContractAddress(
  token: TokenAddressFields | null | undefined,
): `0x${string}` | null {
  const raw = token?.address_hash ?? token?.address;
  if (typeof raw !== "string" || !ADDRESS_RE.test(raw)) return null;
  return raw as `0x${string}`;
}
