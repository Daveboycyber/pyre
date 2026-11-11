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
import { robinhoodChain } from "./chain.ts";
import { HAD_WALLET_SESSION_AT_LOAD } from "./config.ts";
import { ensureStockRegistry } from "./stock-tokens.ts";
import { disposeErc20, disposeErc721, revokeApproval } from "./execute.ts";
import { actionErrorMessage, scanErrorMessage } from "./tx-error.ts";
import { clearLastClean, loadLastClean, saveLastClean, type SavedClean } from "./last-clean.ts";
import { DEMO_ADDRESS, DEMO_FAILURES } from "./demo-assets.ts";
import { alertDialog } from "../dialogs.ts";
import { notify } from "../notify.ts";
import { batchFeeToSend, buildFeeTx } from "./batch.ts";
import { assertReceiptSuccess } from "./receipt.ts";
import {
  addCredits,
  creditsEarnedFromClean,
  creditsForFeeWithoutSuccess,
  getCredits,
  spendCredit,
} from "./credits.ts";
import {
  dismissAsset,
  getDismissedIds,
  pruneDismissedToHeld,
  undismissAsset,
} from "./dismissed.ts";
import { PROTOCOL_FEE_ID, PROTOCOL_FEE_WEI, protocolFeeWei, treasuryIsLive } from "./fees.ts";
import {
  canPayFeeWithWif,
  formatWif,
  payFeeWithWif,
  readWifBalance,
  readWifFeeAmount,
  WIF_FEE_AMOUNT,
  WIF_FEE_LABEL,
  wifFeeFallback,
} from "./wif.ts";
import { attachLiveQuotes } from "./quotes.ts";
import {
  selectedAction,
  sweepCutWei,
  sweepNetWei,
  withSweepFlags,
} from "./sweep.ts";
import { executeSweepSwap } from "./uniswap.ts";
import type { LastClean, Mode, ScanStatus, WalletAsset } from "./types.ts";
import {
  applyMode,
  buildAssetsForAddress,
  cloneDemo,
  shortAddress,
  sleep,
} from "./use-wallet-cleaner-lib.ts";

export type { AssetKind, LastClean, Mode, ScanStatus, WalletAsset } from "./types.ts";
export { estimate, shortAddress } from "./use-wallet-cleaner-lib.ts";

const RESTORE_WINDOW_MS = 4000;

function useWalletCleanerState() {
  const { address: wagmiAddress, isConnected, isReconnecting, chainId } = useAccount();
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
  /** True once this run's batch fee was paid in $WIF (live + result UI). */
  const [feePaidWithWif, setFeePaidWithWif] = useState(false);
  /** $WIF balance from the last scan; null until read. Drives the fee copy. */
  const [wifBalance, setWifBalance] = useState<bigint | null>(null);
  /** Live gate `feeAmount` from the last scan; null until read or if the read failed. */
  const [wifFee, setWifFee] = useState<bigint | null>(null);
  const [credits, setCredits] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const showDismissedRef = useRef(false);
  /** False on the server and the first client paint; see the restore window below. */
  const [mounted, setMounted] = useState(false);
  const [restoreWindow, setRestoreWindow] = useState(HAD_WALLET_SESSION_AT_LOAD);
  const clearedIds = useRef(new Set<string>());

  const address = demo ? DEMO_ADDRESS : wagmiAddress;
  const connected = demo || isConnected;

  useEffect(() => {
// eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate ledger when the wallet address changes
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
    setFeePaidWithWif(false);
    if (demo) {
      await sleep(1100);
      setWifBalance(WIF_FEE_AMOUNT);
      setWifFee(WIF_FEE_AMOUNT);
      setAssets(cloneDemo("safe"));
      setModeState("safe");
      setStatus("ready");
      return;
    }
    if (!address) return;
    try {
      await ensureRobinhood();
      await ensureStockRegistry();
      if (publicClient) {
        void readWifBalance(publicClient, address).then(setWifBalance);
        void readWifFeeAmount(publicClient).then(setWifFee, () => setWifFee(null));
      }
      const built = await buildAssetsForAddress(address, publicClient);
      const dismissed = pruneDismissedToHeld(
        address,
        built.map((a) => a.id),
      );
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
      setScanError(scanErrorMessage(err));
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
    setFeePaidWithWif(false);
    setWifBalance(WIF_FEE_AMOUNT);
    setWifFee(WIF_FEE_AMOUNT);
    setStatus("scanning");
    window.setTimeout(() => {
      setAssets(cloneDemo("safe"));
      setModeState("safe");
      setStatus("ready");
    }, 1100);
  }, []);

  /** Clears everything tied to the current wallet session. */
  const resetSession = useCallback(() => {
    clearedIds.current.clear();
    setAssets([]);
    setLastClean(null);
    setScanError(null);
    setStatus("idle");
    setModeState("safe");
    setCurrentId(null);
    setFeeStatus("idle");
    setFeePaidWithWif(false);
    setWifBalance(null);
    setWifFee(null);
  }, []);

  /** Set while the user disconnects from Pyre, so the wallet-side notice stays quiet. */
  const userDisconnect = useRef(false);

  const disconnect = useCallback(async () => {
    setRestoreWindow(false);
    if (!demo) {
      userDisconnect.current = true;
      try {
        await disconnectAsync();
      } catch (err) {
        console.error("[pyre] disconnect failed", err);
        notify.error("Disconnected here, but the wallet did not confirm.", {
          description: "You may also need to disconnect Pyre inside your wallet app.",
        });
      }
    }
    setDemo(false);
    resetSession();
  }, [demo, disconnectAsync, resetSession]);

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

  const runClean = useCallback(async () => {
    const toProcess = assets.filter(
      (a) => a.selected && (!a.protected || (a.dust && a.sweepable)),
    );
    if (toProcess.length === 0) return;
    const baseFeeWei = protocolFeeWei(toProcess.length);
    const canWaive =
      baseFeeWei > 0n && !demo && Boolean(address) && getCredits(address) >= 1;
    let feeWaived = false;
    let feeWei = baseFeeWei;
    if (canWaive && spendCredit(address)) {
      feeWaived = true;
      feeWei = 0n;
      setCredits(getCredits(address));
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

    let feePaidWithWifLocal = false;
    let feeWifLabel: string | undefined;

    if (feeWei > 0n) {
      try {
        if (demo) {
          await sleep(700);
          feePaid = true;
          feePaidWithWifLocal = true;
          feeWifLabel = WIF_FEE_LABEL;
          setFeePaidWithWif(true);
          setFeeStatus("done");
        } else if (!treasuryIsLive()) {
          setFeeStatus("idle");
        } else {
          if (!walletClient || !publicClient || !address) {
            throw new Error("Wallet not ready");
          }

          const wifBal = await readWifBalance(publicClient, address);
          if (wifFee !== null && canPayFeeWithWif(wifBal, wifFee)) {
            try {
              const wifHash = await payFeeWithWif({
                publicClient,
                walletClient,
                owner: address,
                shownFee: wifFee,
              });
              feePaid = true;
              feePaidWithWifLocal = true;
              feeWifLabel = formatWif(wifFee);
              setFeePaidWithWif(true);
              txs.push({ label: `$WIF fee (${feeWifLabel})`, hash: wifHash });
              setFeeStatus("done");
            } catch (wifErr) {
              if (wifFeeFallback(wifErr) === "stop") throw wifErr;
              console.warn("[pyre] $WIF fee failed, falling back to ETH", wifErr);
            }
          }

          if (!feePaid) {
            feeWei = await batchFeeToSend(publicClient, feeWei);
            if (feeWei > 0n) {
              const feeTx = buildFeeTx(feeWei);
              const hash = await walletClient.sendTransaction({
                ...feeTx,
                account: address,
                chain: robinhoodChain,
              });
              const receipt = await publicClient.waitForTransactionReceipt({
                hash,
              });
              assertReceiptSuccess(receipt, "Protocol fee");
              feePaid = true;
            }
            setFeeStatus("done");
          }
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
        const demoFailure = demo ? DEMO_FAILURES[asset.id] : undefined;
        if (demoFailure) {
          await sleep(700);
          throw new Error(demoFailure);
        }
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
            if (result.cutError) {
              lastError = `${asset.symbol} swapped, but the sweep cut was not paid: ${actionErrorMessage(result.cutError)}`;
            }
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
    const successCount = tokens + nfts + approvals + swept + dustSwaps;
    let earned = !demo && address ? creditsEarnedFromClean(recoveredWei) : 0;
    if (!demo && address) {
      earned += creditsForFeeWithoutSuccess({
        feePaid,
        feeWaived,
        successCount,
        failedCount: failed,
      });
    }
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
      feePaidWithWif: feePaidWithWifLocal || undefined,
      feeWifLabel,
      recoveredWei,
      cutWei,
      creditsEarned: earned > 0 ? earned : undefined,
      error: lastError,
      txs,
    });
    setStatus("done");
  }, [assets, walletClient, address, publicClient, demo, mode, ensureRobinhood, wifFee]);

  const clean = useCallback(async () => {
    try {
      await runClean();
    } catch (err) {
      console.error("[pyre] clean crashed", err);
      const reason = actionErrorMessage(err);
      setCurrentId(null);
      setFeeStatus((s) => (s === "pending" ? "failed" : s));
      setAssets((prev) =>
        prev.map((a) =>
          a.txStatus === "pending" ? { ...a, txStatus: "failed", txError: reason } : a,
        ),
      );
      setLastClean(
        (prev) =>
          prev ?? {
            tokens: 0,
            nfts: 0,
            approvals: 0,
            swept: 0,
            dustSwaps: 0,
            failed: 1,
            feeWei: 0n,
            feePaid: false,
            recoveredWei: 0n,
            cutWei: 0n,
            error: `Something went wrong mid-clean, so Pyre stopped. Check your wallet activity before trying again. (${reason})`,
          },
      );
      setStatus("done");
      void alertDialog({
        tone: "error",
        title: "Pyre stopped mid-clean",
        description: `Something unexpected happened, so no more lines were sent. Check your wallet activity before trying again. (${reason})`,
      });
    }
  }, [runClean]);

  const retryFailed = useCallback(() => {
    setAssets((prev) =>
      prev
        .filter((a) => a.txStatus !== "done")
        .map((a) =>
          a.txStatus === "failed"
            ? { ...a, selected: true, txStatus: undefined, txError: undefined }
            : { ...a, selected: false },
        ),
    );
    setLastClean(null);
    setCurrentId(null);
    setFeeStatus("idle");
    setFeePaidWithWif(false);
    setStatus("ready");
  }, []);

  const [previousClean, setPreviousClean] = useState<SavedClean | null>(null);

  useEffect(() => {
// eslint-disable-next-line react-hooks/set-state-in-effect -- load the last clean for this address
    setPreviousClean(demo ? null : loadLastClean(address));
  }, [address, demo]);

  useEffect(() => {
    if (demo || status !== "done" || !lastClean || !address) return;
    const failedLines = assets
      .filter((a) => a.txStatus === "failed")
      .map((a) => ({ id: a.id, name: a.name, symbol: a.symbol, reason: a.txError }));
    saveLastClean(address, lastClean, failedLines);
// eslint-disable-next-line react-hooks/set-state-in-effect -- mirror the clean just written to storage
    setPreviousClean(loadLastClean(address));
  }, [demo, status, lastClean, address, assets]);

  const dismissPreviousClean = useCallback(() => {
    clearLastClean();
    setPreviousClean(null);
  }, []);

  // Before the first paint we cannot know whether a wallet will be restored (the page is
  // server-rendered), so the wallet UI starts "unknown". If a wallet was connected when the
  // page loaded, show "Reconnecting…" until it is back, for at most RESTORE_WINDOW_MS:
  // wagmi's first attempt can fail before wallets announce themselves and succeed a moment later.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only: wallet state is known after mount
    setMounted(true);
    if (!HAD_WALLET_SESSION_AT_LOAD) return;
    const timeout = window.setTimeout(() => setRestoreWindow(false), RESTORE_WINDOW_MS);
    return () => window.clearTimeout(timeout);
  }, []);
  // Once the wallet is back and stays connected, the window has done its job.
  useEffect(() => {
    if (!restoreWindow || !isConnected) return;
    const settle = window.setTimeout(() => setRestoreWindow(false), 1000);
    return () => window.clearTimeout(settle);
  }, [restoreWindow, isConnected]);

  // Follow the wallet itself: connect (incl. the silent reconnect on load), account
  // switches and disconnects made inside the wallet app.
  const sessionAddress = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (demo) return;
    if (isConnected && wagmiAddress) {
      const previous = sessionAddress.current;
      if (previous === wagmiAddress) return;
      sessionAddress.current = wagmiAddress;
      if (previous) {
        // Never keep one account's tokens on screen for another account to sign.
        resetSession();
        notify.info(`Switched to ${shortAddress(wagmiAddress)}`, {
          description: "Rescanning this wallet.",
        });
      }
      void runScan();
    } else if (!isConnected && !isReconnecting && sessionAddress.current) {
      sessionAddress.current = undefined;
      setRestoreWindow(false); // a real disconnect, not a restore in progress
      resetSession();
      if (!userDisconnect.current) {
        notify.info("Wallet disconnected", {
          description: "Reconnect any time with Connect wallet.",
        });
      }
      userDisconnect.current = false;
    }
  }, [isConnected, isReconnecting, wagmiAddress, runScan, demo, resetSession]);

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
      void runScan();
    },
    [address, demo, runScan],
  );

  const toggleShowDismissed = useCallback(() => {
    const next = !showDismissedRef.current;
    showDismissedRef.current = next;
    setShowDismissed(next);
    void runScan();
  }, [runScan]);

  return {
    open,
    setOpen,
    connected,
    connecting,
    /** A saved wallet is reconnecting: show a placeholder, not "Connect wallet". */
    reconnecting: !demo && !isConnected && mounted && (isReconnecting || restoreWindow),
    /** Not yet known on the client whether a wallet will be restored (first paint). */
    walletUnknown: !demo && !isConnected && !mounted,
    demo,
    address,
    status,
    mode,
    assets,
    lastClean,
    scanError,
    currentId,
    feeStatus,
    feePaidWithWif,
    /** True when the scanned wallet holds enough $WIF for the live gate fee. */
    canPayWif: wifBalance !== null && wifFee !== null && canPayFeeWithWif(wifBalance, wifFee),
    /** Live gate fee as a label; the static default until the first read. */
    wifFeeLabel: wifFee !== null ? formatWif(wifFee) : WIF_FEE_LABEL,
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
    retryFailed,
    runScan,
    previousClean,
    dismissPreviousClean,
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
