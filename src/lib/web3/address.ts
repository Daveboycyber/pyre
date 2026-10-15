/** Lower-cased wallet address, or null unless it is a 0x-prefixed 42-char string. */
export function normalizeWallet(address: string | null | undefined): string | null {
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return null;
  }
  return address.toLowerCase();
}

/** Case-insensitive address equality. */
export function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
