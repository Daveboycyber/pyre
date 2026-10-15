/**
 * Dismissed assets v0 — per-wallet hide list (browser only).
 *
 * Used for scam tokens that still report balanceOf after a successful burn,
 * and for anything the user manually hides from the cleaner.
 * Clearing site data resets the list.
 */

import { readJson, writeJson } from "../storage.ts";
import { normalizeWallet } from "./address.ts";

const STORAGE_KEY = "pyre.dismissed.v0";

type Ledger = Record<string, string[]>;

function readLedger(): Ledger {
  return readJson<Ledger>(STORAGE_KEY, {});
}

function writeLedger(ledger: Ledger) {
  writeJson(STORAGE_KEY, ledger);
}

/** Asset ids currently dismissed for this wallet. */
export function getDismissedIds(
  address: string | null | undefined,
): Set<string> {
  const key = normalizeWallet(address);
  if (!key) return new Set();
  const list = readLedger()[key] ?? [];
  return new Set(list.filter((id) => typeof id === "string" && id.length > 0));
}

/** Hide an asset from future scans for this wallet. */
export function dismissAsset(
  address: string | null | undefined,
  assetId: string,
): Set<string> {
  const key = normalizeWallet(address);
  if (!key || !assetId) return getDismissedIds(address);
  const ledger = readLedger();
  const next = new Set(ledger[key] ?? []);
  next.add(assetId);
  ledger[key] = Array.from(next);
  writeLedger(ledger);
  return next;
}

/** Restore a previously dismissed asset. */
export function undismissAsset(
  address: string | null | undefined,
  assetId: string,
): Set<string> {
  const key = normalizeWallet(address);
  if (!key || !assetId) return getDismissedIds(address);
  const ledger = readLedger();
  const next = new Set(ledger[key] ?? []);
  next.delete(assetId);
  ledger[key] = Array.from(next);
  writeLedger(ledger);
  return next;
}

/** Clear all dismissed ids for a wallet. */
export function clearDismissed(
  address: string | null | undefined,
): Set<string> {
  const key = normalizeWallet(address);
  if (!key) return new Set();
  const ledger = readLedger();
  delete ledger[key];
  writeLedger(ledger);
  return new Set();
}

/**
 * Drop dismissed ids that are no longer held in the wallet.
 * Keeps the count aligned with tokens that can still appear on a scan.
 */
export function pruneDismissedToHeld(
  address: string | null | undefined,
  heldIds: Iterable<string>,
): Set<string> {
  const key = normalizeWallet(address);
  if (!key) return new Set();
  const held = new Set(
    Array.from(heldIds).filter((id) => typeof id === "string" && id.length > 0),
  );
  const ledger = readLedger();
  const current = ledger[key] ?? [];
  const next = current.filter((id) => held.has(id));
  if (next.length !== current.length) {
    if (next.length === 0) delete ledger[key];
    else ledger[key] = next;
    writeLedger(ledger);
  }
  return new Set(next);
}
