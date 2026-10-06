/**
 * Credits v0 — local rebate ledger (per wallet, browser only).
 *
 * Earn 1 credit when a clean recovers any ETH (sweep / dust-swap).
 * Spend 1 credit to waive the next batch fee (2+ actions).
 * Not on-chain. Clearing site data resets the balance.
 */

const STORAGE_KEY = "pyre.credits.v0";

type Ledger = Record<string, number>;

function normalize(address: string | null | undefined): string | null {
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return null;
  }
  return address.toLowerCase();
}

function readLedger(): Ledger {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Ledger;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeLedger(ledger: Ledger) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    // quota / private mode — ignore
  }
}

/** Current credit balance for a wallet (0 if unknown / offline). */
export function getCredits(address: string | null | undefined): number {
  const key = normalize(address);
  if (!key) return 0;
  const n = readLedger()[key] ?? 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Add credits; returns the new balance. */
export function addCredits(
  address: string | null | undefined,
  amount: number,
): number {
  const key = normalize(address);
  if (!key || amount <= 0) return getCredits(address);
  const ledger = readLedger();
  const next = (ledger[key] ?? 0) + Math.floor(amount);
  ledger[key] = next;
  writeLedger(ledger);
  return next;
}

/**
 * Spend one credit if available. Returns true when a credit was consumed.
 */
export function spendCredit(address: string | null | undefined): boolean {
  const key = normalize(address);
  if (!key) return false;
  const ledger = readLedger();
  const current = ledger[key] ?? 0;
  if (current < 1) return false;
  ledger[key] = current - 1;
  writeLedger(ledger);
  return true;
}

/**
 * Credits earned from a finished clean.
 * v0: one credit whenever any ETH was recovered via sweep/dust-swap.
 */
export function creditsEarnedFromClean(recoveredWei: bigint): number {
  return recoveredWei > 0n ? 1 : 0;
}
