export type Mode = "safe" | "review" | "sweep";
export type ScanStatus = "idle" | "scanning" | "ready" | "signing" | "done";
export type AssetKind = "token" | "nft" | "approval";
export type AssetAction = "burn" | "revoke" | "sweep" | "dust-swap";

export type ClassificationLabel = "stock" | "stable" | "spam" | "unknown";

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
  /** Evidence-based classifier output (scan-time). */
  classificationLabel?: ClassificationLabel;
  classificationConfidence?: number;
  classificationReasons?: string[];
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
  /** Batch fee was waived by spending a local credit. */
  feeWaived?: boolean;
  /** Batch fee paid by transferring $WIF to treasury (hackathon track). */
  feePaidWithWif?: boolean;
  recoveredWei: bigint;
  cutWei: bigint;
  /** Credits awarded for this clean (local ledger). */
  creditsEarned?: number;
  error?: string;
  txs?: Array<{
    label: string;
    hash: `0x${string}`;
    recoveredWei?: bigint;
    cutWei?: bigint;
  }>;
};
