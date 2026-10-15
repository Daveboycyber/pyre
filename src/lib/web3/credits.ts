/**
 * Credits v0 — local rebate ledger (per wallet, browser only).
 *
 * Earn 1 credit when a clean recovers any ETH (sweep / dust-swap).
 * Earn 1 credit when a batch fee was paid but every burn/revoke line failed.
 * Spend 1 credit to waive the next batch fee (2+ actions).
 * Not on-chain. Clearing site data resets the balance.
 */

import { readJson, writeJson } from "../storage.ts";
import { normalizeWallet } from "./address.ts";

const STORAGE_KEY = "pyre.credits.v0";

type Ledger = Record<string, number>;

function readLedger(): Ledger {
  return readJson<Ledger>(STORAGE_KEY, {});
}

function writeLedger(ledger: Ledger) {
  writeJson(STORAGE_KEY, ledger);
}

/** Current credit balance for a wallet (0 if unknown / offline). */
export function getCredits(address: string | null | undefined): number {
  const key = normalizeWallet(address);
  if (!key) return 0;
  const n = readLedger()[key] ?? 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Add credits; returns the new balance. */
export function addCredits(
  address: string | null | undefined,
  amount: number,
): number {
  const key = normalizeWallet(address);
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
  const key = normalizeWallet(address);
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

/**
 * Consolation credit when the user paid the batch fee but every line failed
 * (wallet reject, simulation fail, sticky non-standard token, etc.).
 */
export function creditsForFeeWithoutSuccess(opts: {
  feePaid: boolean;
  feeWaived: boolean;
  successCount: number;
  failedCount: number;
}): number {
  if (!opts.feePaid || opts.feeWaived) return 0;
  if (opts.successCount > 0) return 0;
  if (opts.failedCount <= 0) return 0;
  return 1;
}
