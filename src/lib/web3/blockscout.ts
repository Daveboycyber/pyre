import { robinhoodChain } from "./chain";

const API_BASE = robinhoodChain.blockExplorers.default.apiUrl;

export type BlockscoutTokenBalance = {
  token: {
    address: string;
    name: string | null;
    symbol: string | null;
    decimals: string | null;
    type: "ERC-20" | "ERC-721" | "ERC-1155" | "ERC-404";
    icon_url: string | null;
  };
  value: string;
  token_id: string | null;
};

async function blockscoutGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Blockscout ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

/** Every ERC-20/721/1155 balance Blockscout has indexed for this address. */
export async function fetchTokenBalances(
  address: string,
): Promise<BlockscoutTokenBalance[]> {
  try {
    const data = await blockscoutGet<{ items: BlockscoutTokenBalance[] }>(
      `/addresses/${address}/tokens?type=ERC-20,ERC-721,ERC-1155,ERC-404`,
    );
    return data.items ?? [];
  } catch (err) {
    console.error("[blockscout] token balance fetch failed", err);
    return [];
  }
}

export function explorerAddressUrl(address: string) {
  return `${robinhoodChain.blockExplorers.default.url}/address/${address}`;
}

export function explorerTxUrl(hash: string) {
  return `${robinhoodChain.blockExplorers.default.url}/tx/${hash}`;
}
