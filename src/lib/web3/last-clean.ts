/**
 * Keeps the most recent clean result for this browser tab, so a reload does
 * not wipe what happened (counts, failures, receipt links).
 * sessionStorage only: it ends with the tab and never leaves the device.
 */
import { readJson, removeKey, writeJson } from "../storage.ts";
import { normalizeWallet } from "./address.ts";
import type { LastClean } from "./types.ts";

const KEY = "pyre.lastClean.v1";

export type FailedLine = { id: string; name: string; symbol: string; reason?: string };

export type SavedClean = {
  wallet: string;
  at: number;
  result: LastClean;
  failedLines: FailedLine[];
};

const BIGINT_FIELDS = ["feeWei", "recoveredWei", "cutWei"] as const;

function encode(result: LastClean) {
  return {
    ...result,
    feeWei: result.feeWei.toString(),
    recoveredWei: result.recoveredWei.toString(),
    cutWei: result.cutWei.toString(),
    txs: result.txs?.map((tx) => ({
      ...tx,
      recoveredWei: tx.recoveredWei?.toString(),
      cutWei: tx.cutWei?.toString(),
    })),
  };
}

function decode(raw: Record<string, unknown>): LastClean | null {
  try {
    const out = { ...raw } as Record<string, unknown>;
    for (const field of BIGINT_FIELDS) out[field] = BigInt(String(raw[field] ?? "0"));
    const txs = raw.txs as Array<Record<string, unknown>> | undefined;
    out.txs = txs?.map((tx) => ({
      ...tx,
      recoveredWei: tx.recoveredWei != null ? BigInt(String(tx.recoveredWei)) : undefined,
      cutWei: tx.cutWei != null ? BigInt(String(tx.cutWei)) : undefined,
    }));
    return out as unknown as LastClean;
  } catch {
    return null;
  }
}

export function saveLastClean(
  address: string | null | undefined,
  result: LastClean,
  failedLines: FailedLine[],
  now = Date.now(),
) {
  const wallet = normalizeWallet(address);
  if (!wallet) return;
  writeJson(KEY, { wallet, at: now, result: encode(result), failedLines }, "session");
}

/** The saved result for this wallet, or null when there is none or it is unreadable. */
export function loadLastClean(address: string | null | undefined): SavedClean | null {
  const wallet = normalizeWallet(address);
  if (!wallet) return null;
  const saved = readJson<{
    wallet?: string;
    at?: number;
    result?: Record<string, unknown>;
    failedLines?: FailedLine[];
  }>(KEY, {}, "session");
  if (saved.wallet !== wallet || !saved.result || typeof saved.at !== "number") return null;
  const result = decode(saved.result);
  if (!result) return null;
  return { wallet, at: saved.at, result, failedLines: saved.failedLines ?? [] };
}

export function clearLastClean() {
  removeKey(KEY, "session");
}
