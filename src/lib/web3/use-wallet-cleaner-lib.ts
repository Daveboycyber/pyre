import { usePublicClient } from "wagmi";
import { KNOWN_SPENDERS } from "./chain";
import { fetchTokenBalances, tokenContractAddress } from "./blockscout";
import { isProtectedHolding, looksLikeSpam } from "./classify";
import { erc20Abi, erc721Abi } from "./actions";
import { DEMO_ASSETS } from "./demo-assets";
import { PROTOCOL_FEE_WEI, protocolFeeWei } from "./fees";
import {
  selectedAction,
  sweepCutWei,
  sweepNetWei,
  withSweepFlags,
} from "./sweep";
import type { Mode, WalletAsset } from "./types";

export type { AssetKind, LastClean, Mode, ScanStatus, WalletAsset } from "./types";

export function applyMode(assets: WalletAsset[], mode: Mode): WalletAsset[] {
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

export function cloneDemo(mode: Mode = "safe"): WalletAsset[] {
  return applyMode(
    DEMO_ASSETS.map((asset) => ({ ...asset })),
    mode,
  );
}

export async function buildAssetsForAddress(
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
      protected: isProtectedHolding(symbol, contract),
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

export function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
