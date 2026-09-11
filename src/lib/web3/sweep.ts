import { isStockToken, parseDisplayAmount } from "./classify";
import type { WalletAsset } from "./types";

/** 1.25% of ETH received, inside the 1–1.5% band. */
export const SWEEP_CUT_BPS = 125n;
export const GAS_BUFFER_WEI = 100_000_000_000_000n; // 0.0001 ETH
export const DUST_UNITS = 0.05;

export function sweepCutWei(grossWei: bigint) {
  return (grossWei * SWEEP_CUT_BPS) / 10_000n;
}

export function sweepNetWei(grossWei: bigint) {
  return grossWei - sweepCutWei(grossWei);
}

export function quoteClears(
  grossWei: bigint,
  feeWei: bigint,
  gasWei: bigint = GAS_BUFFER_WEI,
) {
  return grossWei > feeWei + gasWei;
}

export function isDustPosition(asset: WalletAsset) {
  if (!asset.protected || asset.kind !== "token") return false;
  if (!isStockToken(asset.symbol)) return false;
  return parseDisplayAmount(asset.amount) > 0 && parseDisplayAmount(asset.amount) < DUST_UNITS;
}

export function withSweepFlags(
  asset: WalletAsset,
  feeWei: bigint,
): WalletAsset {
  const dust = isDustPosition(asset);
  const sweepable = asset.quoteWei != null && quoteClears(asset.quoteWei, feeWei);
  return { ...asset, dust, sweepable };
}

export function selectedAction(asset: WalletAsset, mode: "safe" | "burn" | "sweep") {
  if (asset.kind === "approval") return "revoke" as const;
  if (asset.kind === "nft") return "burn" as const;
  if (asset.protected && asset.dust && asset.sweepable) return "dust-swap" as const;
  if (!asset.protected && asset.sweepable && mode === "sweep") return "sweep" as const;
  return "burn" as const;
}
