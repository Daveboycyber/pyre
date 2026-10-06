import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { KNOWN_SPENDERS, robinhoodChain } from "./chain";
import { fetchTokenBalances, tokenContractAddress } from "./blockscout";
import { isProtectedHolding, looksLikeSpam } from "./classify";
import { ensureStockRegistry } from "./stock-tokens";
import { erc20Abi, erc721Abi } from "./actions";
import { disposeErc20, disposeErc721, revokeApproval } from "./execute";
import { actionErrorMessage } from "./tx-error";
import { DEMO_ADDRESS, DEMO_ASSETS } from "./demo-assets";
import { buildFeeTx } from "./batch";
import { PROTOCOL_FEE_ID, PROTOCOL_FEE_WEI, protocolFeeWei, treasuryIsLive } from "./fees";
import { attachLiveQuotes } from "./quotes";
import {
  selectedAction,
  sweepCutWei,
  sweepNetWei,
  withSweepFlags,
} from "./sweep";
import { executeSweepSwap } from "./uniswap";
import type { LastClean, Mode, ScanStatus, WalletAsset } from "./types";

export type { AssetKind, LastClean, Mode, ScanStatus, WalletAsset } from "./types";

function applyMode(assets: WalletAsset[], mode: Mode): WalletAsset[] {
  return assets.map((asset) => {
    const flagged = withSweepFlags(asset, PROTOCOL_FEE_WEI);
    if (flagged.protected && !flagged.dust) {
      return { ...flagged, selected: false };
    }
    if (mode === "safe") {
      return {
        ...flagged,
        selected: Boolean(flagged.spam) && !flagged.protected,
      };
    }
    if (mode === "sweep") {
      if (flagged.dust) {
        return { ...flagged, selected: Boolean(flagged.sweepable) };
      }
      return { ...flagged, selected: Boolean(flagged.spam) };
    }
    if (flagged.protected) return { ...flagged, selected: false };
    return flagged;
  });
}

export function estimate(assets: WalletAsset[], mode: Mode = "safe") {
  const selected = assets.filter(
    (a) => a.selected && (!a.protected || (a.dust && a.sweepable)),
  );
  const tokens = selected.filter(
    (a) => a.kind === "token" && selectedAction(a, mode) === "burn",
  ).length;
  const nfts = selected.filter((a) => a.kind === "nft").length;
  const approvals = selected.filter((a) => a.kind === "approval").length;
  const sweeps = selected.filter(
    (a) => selectedAction(a, mode) === "sweep",
  ).length;
  const dustSwaps = selected.filter(
    (a) => selectedAction(a, mode) === "dust-swap",
  ).length;
  const protectedCount = assets.filter(
    (a) => a.protected && !a.dust,
  ).length;
  const recoveredWei = selected.reduce((sum, a) => {
    const action = selectedAction(a, mode);
    if ((action === "sweep" || action === "dust-swap") && a.quoteWei) {
      return sum + sweepNetWei(a.quoteWei);
    }
    return sum;
  }, 0n);
  const cutWei = selected.reduce((sum, a) => {
    const action = selectedAction(a, mode);
    if ((action === "sweep" || action === "dust-swap") && a.quoteWei) {
      return sum + sweepCutWei(a.quoteWei);
    }
    return sum;
  }, 0n);
  const actions = tokens + nfts + approvals + sweeps + dustSwaps;
  return {
    tokens,
    nfts,
    approvals,
    sweeps,
    dustSwaps,
    burns: tokens + nfts,
    protected: protectedCount,
    actions,
    feeWei: protocolFeeWei(actions),
    recoveredWei,
    cutWei,
  };
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function cloneDemo(mode: Mode = "safe"): WalletAsset[] {
  return applyMode(
    DEMO_ASSETS.map((asset) => ({ ...asset })),
    mode,
  );
}
