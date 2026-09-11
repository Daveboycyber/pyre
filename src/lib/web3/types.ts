export type Mode = "safe" | "burn" | "sweep";
export type ScanStatus = "idle" | "scanning" | "ready" | "signing" | "done";
export type AssetKind = "token" | "nft" | "approval";
export type AssetAction = "burn" | "revoke" | "sweep" | "dust-swap";

export type WalletAsset = {
  id: string;
  kind: AssetKind;
  standard: "ERC-20" | "ERC-721" | "ERC-1155";
  address: `0x${string}`;
  tokenId?: bigint;
  spender?: `0x${string}`;
  name: string;
  symbol: string;
  amount: string;
  amountRaw?: bigint;
  selected: boolean;
  protected?: boolean;
  spam?: boolean;
  txStatus?: "pending" | "done" | "failed";
  txError?: string;
  quoteWei?: bigint;
  quoteFee?: number;
  sweepable?: boolean;
  dust?: boolean;
};

export type LastClean = {
  tokens: number;
  nfts: number;
  approvals: number;
  swept: number;
  dustSwaps: number;
  failed: number;
  feeWei: bigint;
  feePaid: boolean;
  recoveredWei: bigint;
  cutWei: bigint;
  error?: string;
};
