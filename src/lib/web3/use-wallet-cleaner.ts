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
import { robinhoodChain } from "./chain";
import { ensureStockRegistry } from "./stock-tokens";
import { disposeErc20, disposeErc721, revokeApproval } from "./execute";
import { actionErrorMessage } from "./tx-error";
import { DEMO_ADDRESS } from "./demo-assets";
import { buildFeeTx } from "./batch";
import {
  addCredits,
  creditsEarnedFromClean,
  getCredits,
  spendCredit,
} from "./credits";
import {
  dismissAsset,
  getDismissedIds,
  undismissAsset,
} from "./dismissed";
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
import {
  applyMode,
  buildAssetsForAddress,
  cloneDemo,
  sleep,
} from "./use-wallet-cleaner-lib";

export type { AssetKind, LastClean, Mode, ScanStatus, WalletAsset } from "./types";
export { estimate, shortAddress } from "./use-wallet-cleaner-lib";

function useWalletCleanerState() {
  const { address: wagmiAddress, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [open, setOpen] = useState(false);
  const [demo, setDemo] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [mode, setModeState] = useState<Mode>("safe");
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [lastClean, setLastClean] = useState<LastClean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<
    "idle" | "pending" | "done" | "failed"
  >("idle");
  const [credits, setCredits] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const showDismissedRef = useRef(false);
  const clearedIds = useRef(new Set<string>());

  const address = demo ? DEMO_ADDRESS : wagmiAddress;
  const connected = demo || isConnected;

  useEffect(() => {
    setCredits(getCredits(address));
    setDismissedIds(getDismissedIds(address));
    setShowDismissed(false);
    showDismissedRef.current = false;
  }, [address]);

  const ensureRobinhood = useCallback(async () => {
    if (demo) return;
    if (chainId === robinhoodChain.id) return;
    await switchChainAsync({ chainId: robinhoodChain.id });
  }, [chainId, demo, switchChainAsync]);

  const runScan = useCallback(async () => {
    setStatus("scanning");
    setScanError(null);
    setLastClean(null);
    setCurrentId(null);
    setFeeStatus("idle");
    if (demo) {
      await sleep(1100);
      setAssets(cloneDemo("safe"));
      setModeState("safe");
      setStatus("ready");
      return;
    }
    if (!address) return;
    try {
      await ensureRobinhood();
      await ensureStockRegistry();
      const built = await buildAssetsForAddress(address, publicClient);
      const dismissed = getDismissedIds(address);
      setDismissedIds(dismissed);
      const stillHeld = built.filter(
        (a) =>
          !clearedIds.current.has(a.id) &&
          (showDismissedRef.current || !dismissed.has(a.id)),
      );
      const quoted = await attachLiveQuotes(
        stillHeld.map((a) => withSweepFlags(a, PROTOCOL_FEE_WEI)),
        publicClient,
      );
      setAssets(
        applyMode(
          quoted.map((a) => withSweepFlags(a, PROTOCOL_FEE_WEI)),
          "safe",
        ),
      );
      setModeState("safe");
      setStatus("ready");
    } catch (err) {
      console.error("[pyre] scan failed", err);
      setScanError(err instanceof Error ? err.message : "Scan failed");
      setStatus("idle");
    }
  }, [address, publicClient, demo, ensureRobinhood]);

  const connect = useCallback(
    async (connectorId: string) => {
      const connector = connectors.find(
        (c) => c.uid === connectorId || c.id === connectorId,
      );
      if (!connector) {
        throw new Error("That wallet is not available in this browser.");
      }
      setDemo(false);
      setLastClean(null);
      await connectAsync({ connector });
      setOpen(false);
    },
    [connectors, connectAsync],
  );

  const enterDemo = useCallback(() => {
    setOpen(false);
    setDemo(true);
    setLastClean(null);
    setCurrentId(null);
    setFeeStatus("idle");
    setStatus("scanning");
    window.setTimeout(() => {
      setAssets(cloneDemo("safe"));
      setModeState("safe");
      setStatus("ready");
    }, 1100);
  }, []);

  const disconnect = useCallback(async () => {
    if (!demo) {
      await disconnectAsync();
    }
    setDemo(false);
    clearedIds.current.clear();
    setAssets([]);
    setLastClean(null);
    setStatus("idle");
    setModeState("safe");
    setCurrentId(null);
    setFeeStatus("idle");
  }, [demo, disconnectAsync]);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    setAssets((prev) => applyMode(prev, next));
  }, []);

  const toggleAsset = useCallback((id: string) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (a.protected && !(a.dust && a.sweepable)) return a;
        return { ...a, selected: !a.selected };
      }),
    );
  }, []);

  const clean = useCallback(async () => {
    const toProcess = assets.filter(
      (a) => a.selected && (!a.protected || (a.dust && a.sweepable)),
    );
    if (toProcess.length === 0) return;
    const baseFeeWei = protocolFeeWei(toProcess.length);
    const canWaive =
      baseFeeWei > 0n &&
      (demo || (Boolean(address) && getCredits(address) >= 1));
    let feeWaived = false;
    let feeWei = baseFeeWei;
    if (canWaive) {
      if (demo || spendCredit(address)) {
        feeWaived = true;
        feeWei = 0n;
        setCredits(getCredits(address));
      }
    }

    setStatus("signing");
    setFeeStatus(feeWei > 0n ? "pending" : feeWaived ? "done" : "idle");
    setCurrentId(
      feeWei > 0n || feeWaived ? PROTOCOL_FEE_ID : (toProcess[0]?.id ?? null),
    );

    let tokens = 0;
    let nfts = 0;
    let approvals = 0;
    let swept = 0;
    let dustSwaps = 0;
    let failed = 0;
    let recoveredWei = 0n;
    let cutWei = 0n;
    let feePaid = feeWaived;
    let lastError: string | undefined;

    const txs: NonNullable<LastClean["txs"]> = [];

    const emptyResult = {
      tokens: 0,
      nfts: 0,
      approvals: 0,
      swept: 0,
      dustSwaps: 0,
      failed: toProcess.length,
      feeWei: baseFeeWei,
      feePaid: false,
      feeWaived,
      recoveredWei: 0n,
      cutWei: 0n,
      error: undefined as string | undefined,
      txs: [] as NonNullable<LastClean["txs"]>,
    };

    if (!demo) {
      try {
        await ensureRobinhood();
      } catch (err) {
        setLastClean({ ...emptyResult, error: actionErrorMessage(err) });
        setStatus("done");
        return;
      }
    }

    if (feeWei > 0n) {
      try {
        if (demo) {
          await sleep(700);
          feePaid = true;
          setFeeStatus("done");
        } else if (!treasuryIsLive()) {
          setFeeStatus("idle");
        } else {
          if (!walletClient || !publicClient) throw new Error("Wallet not ready");
          const feeTx = buildFeeTx(feeWei);
          const hash = await walletClient.sendTransaction({
            ...feeTx,
            account: address,
            chain: robinhoodChain,
          });
          await publicClient.waitForTransactionReceipt({ hash });
          feePaid = true;
          setFeeStatus("done");
        }
      } catch (err) {
        console.error("[pyre] protocol fee failed", err);
        setFeeStatus("failed");
        setCurrentId(null);
        setLastClean({ ...emptyResult, error: actionErrorMessage(err) });
        setStatus("done");
        return;
      }
    }

    for (const asset of toProcess) {
      setCurrentId(asset.id);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id ? { ...a, txStatus: "pending" } : a,
        ),
      );
      const action = selectedAction(asset, mode);

      try {
        if (action === "dust-swap" || action === "sweep") {
          if (demo) {
            await sleep(700);
            const gross = asset.quoteWei ?? 0n;
            recoveredWei += sweepNetWei(gross);
            cutWei += sweepCutWei(gross);
          } else {
            if (!walletClient || !address || !publicClient || !asset.amountRaw) {
              throw new Error("Wallet not ready");
            }
            if (asset.quoteWei == null || asset.quoteFee == null) {
              throw new Error("No live swap route");
            }
            const result = await executeSweepSwap({
              publicClient,
              walletClient,
              owner: address,
              token: asset.address,
              amountIn: asset.amountRaw,
              fee: asset.quoteFee,
              quoteWei: asset.quoteWei,
            });
            recoveredWei += result.recoveredWei;
            cutWei += result.cutWei;
            txs.push({
              label: asset.symbol,
              hash: result.hash,
              recoveredWei: result.recoveredWei,
              cutWei: result.cutWei,
            });
          }
          if (action === "dust-swap") dustSwaps += 1;
          else swept += 1;
        } else if (demo) {
          await sleep(700);
          if (asset.kind === "token") tokens += 1;
          else if (asset.kind === "nft") nfts += 1;
          else approvals += 1;
        } else {
          if (!walletClient || !address || !publicClient) {
            throw new Error("Wallet not ready");
          }
          if (asset.kind === "token" && asset.amountRaw) {
            await disposeErc20({
              publicClient,
              walletClient,
              owner: address,
              token: asset.address,
              amount: asset.amountRaw,
            });
            tokens += 1;
          } else if (asset.kind === "nft" && asset.tokenId !== undefined) {
            await disposeErc721({
              publicClient,
              walletClient,
              owner: address,
              token: asset.address,
              tokenId: asset.tokenId,
            });
            nfts += 1;
          } else if (asset.kind === "approval" && asset.spender) {
            await revokeApproval({
              publicClient,
              walletClient,
              owner: address,
              token: asset.address,
              spender: asset.spender,
              standard: asset.standard,
            });
            approvals += 1;
          } else {
            throw new Error("Nothing to send for this line");
          }
        }

        clearedIds.current.add(asset.id);
        if (!demo && address) {
          setDismissedIds(dismissAsset(address, asset.id));
        }
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id ? { ...a, txStatus: "done", selected: false } : a,
          ),
        );
      } catch (err) {
        console.error("[pyre] action failed for", asset.id, err);
        failed += 1;
        lastError = actionErrorMessage(err);
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? { ...a, txStatus: "failed", txError: lastError }
              : a,
          ),
        );
      }
    }

    setCurrentId(null);
    const earned = !demo && address ? creditsEarnedFromClean(recoveredWei) : 0;
    if (earned > 0) {
      setCredits(addCredits(address, earned));
    }
    setLastClean({
      tokens,
      nfts,
      approvals,
      swept,
      dustSwaps,
      failed,
      feeWei: feeWaived
        ? baseFeeWei
        : demo || treasuryIsLive()
          ? feeWei
          : 0n,
      feePaid: feeWaived ? true : feeWei === 0n ? false : feePaid,
      feeWaived,
      recoveredWei,
      cutWei,
      creditsEarned: earned > 0 ? earned : undefined,
      error: lastError,
      txs,
    });
    setStatus("done");
  }, [assets, walletClient, address, publicClient, demo, mode, ensureRobinhood]);

  const wasConnected = useRef(false);
  useEffect(() => {
    if (demo) return;
    if (isConnected && !wasConnected.current) {
      wasConnected.current = true;
      void runScan();
    } else if (!isConnected && wasConnected.current) {
      wasConnected.current = false;
      setAssets([]);
      setStatus("idle");
      setLastClean(null);
    }
  }, [isConnected, runScan, demo]);

  const dismiss = useCallback(
    (assetId: string) => {
      if (!address || demo) return;
      setDismissedIds(dismissAsset(address, assetId));
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    },
    [address, demo],
  );

  const undismiss = useCallback(
    (assetId: string) => {
      if (!address || demo) return;
      setDismissedIds(undismissAsset(address, assetId));
    },
    [address, demo],
  );

  const toggleShowDismissed = useCallback(() => {
    setShowDismissed((prev) => {
      const next = !prev;
      showDismissedRef.current = next;
      return next;
    });
  }, []);

  return {
    open,
    setOpen,
    connected,
    connecting,
    demo,
    address,
    status,
    mode,
    assets,
    lastClean,
    scanError,
    currentId,
    feeStatus,
    credits,
    dismissedCount: dismissedIds.size,
    isDismissed: (id: string) => dismissedIds.has(id),
    showDismissed,
    connectors,
    connect,
    enterDemo,
    disconnect,
    setMode,
    toggleAsset,
    dismiss,
    undismiss,
    toggleShowDismissed,
    clean,
    runScan,
  };
}

type WalletCleanerContextValue = ReturnType<typeof useWalletCleanerState>;

const WalletCleanerContext = createContext<WalletCleanerContextValue | null>(
  null,
);

export function WalletCleanerProvider({ children }: { children: ReactNode }) {
  const value = useWalletCleanerState();
  return createElement(WalletCleanerContext.Provider, { value }, children);
}

export function useWalletCleaner() {
  const ctx = useContext(WalletCleanerContext);
  if (!ctx) {
    throw new Error(
      "useWalletCleaner must be used within a WalletCleanerProvider",
    );
  }
  return ctx;
}
