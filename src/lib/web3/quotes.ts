import type { PublicClient } from "viem";
import { WETH_ADDRESS } from "./chain";
import type { WalletAsset } from "./types";
import { quoteBestToWeth } from "./uniswap";

const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

function envKey(): string | undefined {
  try {
    return (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_ONEINCH_API_KEY;
  } catch {
    return undefined;
  }
}

async function quoteVia1inch(
  token: `0x${string}`,
  amountRaw: bigint,
): Promise<bigint | null> {
  const key = envKey();
  if (!key) return null;
  const url = new URL("https://api.1inch.dev/swap/v6.0/4663/quote");
  url.searchParams.set("src", token);
  url.searchParams.set("dst", NATIVE_ETH);
  url.searchParams.set("amount", amountRaw.toString());
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${key}`,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { dstAmount?: string };
    if (!data.dstAmount) return null;
    const wei = BigInt(data.dstAmount);
    return wei > 0n ? wei : null;
  } catch {
    return null;
  }
}

export async function attachLiveQuotes(
  assets: WalletAsset[],
  publicClient?: PublicClient | null,
): Promise<WalletAsset[]> {
  const next = await Promise.all(
    assets.map(async (asset) => {
      if (asset.kind !== "token" || !asset.amountRaw || !asset.address) {
        return asset;
      }
      if (asset.address.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
        return { ...asset, quoteWei: asset.amountRaw, quoteFee: 0 };
      }
      const eligible = Boolean(asset.spam) || Boolean(asset.dust);
      if (!eligible) return asset;

      if (publicClient) {
        const uni = await quoteBestToWeth(
          publicClient,
          asset.address,
          asset.amountRaw,
        );
        if (uni) {
          return { ...asset, quoteWei: uni.amountOut, quoteFee: uni.fee };
        }
      }

      const inch = await quoteVia1inch(asset.address, asset.amountRaw);
      return inch != null ? { ...asset, quoteWei: inch } : asset;
    }),
  );
  return next;
}
