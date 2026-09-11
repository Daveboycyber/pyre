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
import { isProtectedSymbol, looksLikeSpam } from "./classify";
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

async function buildAssetsForAddress(
  address: `0x${string}`,
  publicClient: ReturnType<typeof usePublicClient>,
): Promise<WalletAsset[]> {
  const balances = await fetchTokenBalances(address);
  const assets: WalletAsset[] = [];

  const erc20s = balances.filter((b) => {
    if (!tokenContractAddress(b.token)) return false;
    const type = b.token?.type;
    if (type === "ERC-20" || type === "ERC-404") return true;
    return !type && b.token_id == null;
  });
  const nftsBy = balances.filter(
    (b) =>
      (b.token?.type === "ERC-721" || b.token?.type === "ERC-1155") &&
      tokenContractAddress(b.token),
  );

  const liveByToken = new Map<string, bigint>();
  if (publicClient && erc20s.length > 0) {
    try {
      const contracts = erc20s
        .map((b) => tokenContractAddress(b.token))
        .filter((a): a is `0x${string}` => Boolean(a));
      const results = (await publicClient.multicall({
        contracts: contracts.map((token) => ({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [address] as const,
        })),
        allowFailure: true,
      })) as Array<{ status: "success" | "failure"; result?: unknown }>;
      results.forEach((res, i) => {
        if (res.status === "success" && typeof res.result === "bigint") {
          liveByToken.set(contracts[i].toLowerCase(), res.result);
        }
      });
    } catch (err) {
      console.error("[pyre] live balance overlay failed", err);
    }
  }

  for (const b of erc20s) {
    const contract = tokenContractAddress(b.token);
    if (!contract) continue;
    const symbol = b.token.symbol ?? "???";
    const decimals = Number(b.token.decimals ?? 18);
    const live = liveByToken.get(contract.toLowerCase());
    const raw = live !== undefined ? live : BigInt(b.value || "0");
    if (raw === 0n) continue;
    const display = (Number(raw) / 10 ** decimals).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
    assets.push({
      id: `token:${contract}`,
      kind: "token",
      standard: "ERC-20",
      address: contract,
      name: b.token.name ?? symbol,
      symbol,
      amount: display,
      amountRaw: raw,
      selected: false,
      protected: isProtectedSymbol(symbol),
      spam: looksLikeSpam(b.token.name, symbol),
    });
  }

  for (const b of nftsBy) {
    const contract = tokenContractAddress(b.token);
    if (!contract || b.token_id === null) continue;
    assets.push({
      id: `nft:${contract}:${b.token_id}`,
      kind: "nft",
      standard: b.token.type === "ERC-1155" ? "ERC-1155" : "ERC-721",
      address: contract,
      tokenId: BigInt(b.token_id),
      name: b.token.name ?? "NFT",
      symbol: b.token.symbol ?? "NFT",
      amount: "1",
      selected: false,
      spam: looksLikeSpam(b.token.name, b.token.symbol),
    });
  }

  if (publicClient) {
    const erc20Checks = erc20s.flatMap((b) => {
      const contract = tokenContractAddress(b.token);
      if (!contract) return [];
      return KNOWN_SPENDERS.map((spender) => ({
        address: contract,
        abi: erc20Abi,
        functionName: "allowance" as const,
        args: [address, spender.address] as const,
        meta: { token: b, spender, contract },
      }));
    });
    const nftCollections = new Map(
      nftsBy
        .map((b) => {
          const contract = tokenContractAddress(b.token);
          return contract ? ([contract, b] as const) : null;
        })
        .filter((entry): entry is readonly [`0x${string}`, (typeof nftsBy)[number]] =>
          Boolean(entry),
        ),
    );
    const nftChecks = Array.from(nftCollections.values()).flatMap((b) => {
      const contract = tokenContractAddress(b.token);
      if (!contract) return [];
      return KNOWN_SPENDERS.map((spender) => ({
        address: contract,
        abi: erc721Abi,
        functionName: "isApprovedForAll" as const,
        args: [address, spender.address] as const,
        meta: { token: b, spender, contract },
      }));
    });

    if (erc20Checks.length + nftChecks.length > 0) {
      try {
        const results = (await publicClient.multicall({
          contracts: [...erc20Checks, ...nftChecks],
          allowFailure: true,
        })) as Array<{ status: "success" | "failure"; result?: unknown }>;
        results.forEach((res, i) => {
          if (res.status !== "success") return;
          const isErc20Check = i < erc20Checks.length;
          if (isErc20Check) {
            const { token, spender, contract } = erc20Checks[i].meta;
            const value = res.result as bigint;
            if (value > 0n) {
              assets.push({
                id: `approval:${contract}:${spender.address}`,
                kind: "approval",
                standard: "ERC-20",
                address: contract,
                spender: spender.address,
                name: `${token.token.symbol ?? "Token"} → ${spender.label}`,
                symbol: "Allowance",
                amount: value > 2n ** 200n ? "Unlimited" : value.toString(),
                selected: false,
                spam: true,
              });
            }
          } else {
            const { token, spender, contract } =
              nftChecks[i - erc20Checks.length].meta;
            const approved = res.result as boolean;
            if (approved) {
              assets.push({
                id: `approval:${contract}:${spender.address}:all`,
                kind: "approval",
                standard:
                  token.token.type === "ERC-1155" ? "ERC-1155" : "ERC-721",
                address: contract,
                spender: spender.address,
                name: `${token.token.name ?? "Collection"} → ${spender.label}`,
                symbol: "Operator",
                amount: "All items",
                selected: false,
                spam: true,
              });
            }
          }
        });
      } catch (err) {
        console.error("[pyre] allowance multicall failed", err);
      }
    }
  }

  return assets;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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
  const clearedIds = useRef(new Set<string>());

  const address = demo ? DEMO_ADDRESS : wagmiAddress;
  const connected = demo || isConnected;

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
      const built = await buildAssetsForAddress(address, publicClient);
      const stillHeld = built.filter((a) => !clearedIds.current.has(a.id));
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
      if (!connector) return;
      setOpen(false);
      setDemo(false);
      setLastClean(null);
      await connectAsync({ connector });
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
    const feeWei = protocolFeeWei(toProcess.length);
    setStatus("signing");
    setFeeStatus(feeWei > 0n ? "pending" : "idle");
    setCurrentId(feeWei > 0n ? PROTOCOL_FEE_ID : (toProcess[0]?.id ?? null));

    let tokens = 0;
    let nfts = 0;
    let approvals = 0;
    let swept = 0;
    let dustSwaps = 0;
    let failed = 0;
    let recoveredWei = 0n;
    let cutWei = 0n;
    let feePaid = false;
    let lastError: string | undefined;

    const emptyResult = {
      tokens: 0,
      nfts: 0,
      approvals: 0,
      swept: 0,
      dustSwaps: 0,
      failed: toProcess.length,
      feeWei,
      feePaid: false,
      recoveredWei: 0n,
      cutWei: 0n,
      error: undefined as string | undefined,
    };

    if (!demo) {
      try {
        await ensureRobinhood();
      } catch (err) {
        setLastClean({
          ...emptyResult,
          error: actionErrorMessage(err),
        });
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
          if (!walletClient || !publicClient) {
            throw new Error("Wallet not ready");
          }
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
        setLastClean({
          ...emptyResult,
          error: actionErrorMessage(err),
        });
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
    setLastClean({
      tokens,
      nfts,
      approvals,
      swept,
      dustSwaps,
      failed,
      feeWei: demo || treasuryIsLive() ? feeWei : 0n,
      feePaid: feeWei === 0n ? false : feePaid,
      recoveredWei,
      cutWei,
      error: lastError,
    });
    setStatus("done");
  }, [
    assets,
    walletClient,
    address,
    publicClient,
    demo,
    mode,
    ensureRobinhood,
  ]);

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
    connectors,
    connect,
    enterDemo,
    disconnect,
    setMode,
    toggleAsset,
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
