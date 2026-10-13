import { formatEther } from "viem";

/** Flat ETH fee charged once per batch Clean (2+ actions). Override via env. */
const DEFAULT_FEE_WEI = 500_000_000_000_000n; // 0.0005 ETH ≈ $1–2

function envString(key: string): string | undefined {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> })
      .env;
    return env?.[key];
  } catch {
    return undefined;
  }
}

function readFeeWei(): bigint {
  const raw = envString("VITE_PYRE_FEE_WEI");
  if (!raw) return DEFAULT_FEE_WEI;
  try {
    return BigInt(raw);
  } catch {
    return DEFAULT_FEE_WEI;
  }
}

function readAddress(envKey: string, fallback: `0x${string}`): `0x${string}` {
  const raw = envString(envKey);
  if (raw && /^0x[0-9a-fA-F]{40}$/.test(raw)) return raw as `0x${string}`;
  return fallback;
}

const PLACEHOLDER_TREASURY =
  "0x4663466346634663466346634663466346634663" as const;

const LIVE_TREASURY =
  "0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6" as const;

/** Public payout address for batch fees and the 1.25% sweep cut. */
export const TREASURY_ADDRESS = readAddress(
  "VITE_PYRE_TREASURY",
  LIVE_TREASURY,
);

/** Hardened PyreBatch (self-only clean, fee cap, 2-step ownership). */
const LIVE_PYRE_BATCH =
  "0xcB157e4D7035F9a38b9e0B92b89E544e378c1490" as const;

/** PyreBatch on Robinhood Chain — batch fees go through collectFee(). */
export const PYRE_BATCH_ADDRESS = readAddress(
  "VITE_PYRE_BATCH",
  LIVE_PYRE_BATCH,
);

export const PROTOCOL_FEE_WEI = readFeeWei();
export const BATCH_THRESHOLD = 2;
export const PROTOCOL_FEE_ID = "protocol-fee";

export function isBatch(actionCount: number) {
  return actionCount >= BATCH_THRESHOLD;
}

export function protocolFeeWei(actionCount: number) {
  return isBatch(actionCount) ? PROTOCOL_FEE_WEI : 0n;
}

/**
 * The fee to send, given what the user was shown and what PyreBatch charges
 * on-chain. A lower on-chain fee is used as-is; a higher one throws so the
 * user is never charged more than the review screen said.
 */
export function resolveBatchFee(shownWei: bigint, onChainWei: bigint) {
  if (onChainWei > shownWei) {
    throw new Error(
      `Protocol fee changed to ${formatFeeEth(onChainWei)}. Rescan before cleaning.`,
    );
  }
  return onChainWei;
}

export function formatFeeEth(wei: bigint) {
  const eth = formatEther(wei);
  const trimmed = eth
    .replace(/(\.[0-9]*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
  return `${trimmed} ETH`;
}

export function pyreBatchIsDeployed() {
  return (
    PYRE_BATCH_ADDRESS.toLowerCase() !==
    "0x0000000000000000000000000000000000000000"
  );
}

/** Do not send user ETH to the placeholder. */
export function treasuryIsLive() {
  return TREASURY_ADDRESS.toLowerCase() !== PLACEHOLDER_TREASURY.toLowerCase();
}
