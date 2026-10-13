import { decodeEventLog, parseAbiItem, type Log } from "viem";

/** Throw unless the receipt says the tx executed. A mined revert is not success. */
export function assertReceiptSuccess(
  receipt: { status: "success" | "reverted" },
  label: string,
) {
  if (receipt.status !== "success") {
    throw new Error(`${label} reverted on-chain`);
  }
}

const wethWithdrawal = parseAbiItem(
  "event Withdrawal(address indexed src, uint256 wad)",
);

/**
 * ETH actually released by WETH in a swap receipt: the sum of WETH
 * `Withdrawal` events emitted by `weth` for `src` (the router on the
 * unwrap path). Returns null when no matching event is found.
 */
export function unwrappedWei(
  logs: Pick<Log, "address" | "data" | "topics">[],
  weth: `0x${string}`,
  src: `0x${string}`,
): bigint | null {
  let total: bigint | null = null;
  for (const log of logs) {
    if (log.address.toLowerCase() !== weth.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: [wethWithdrawal],
        data: log.data,
        topics: log.topics,
      });
      if (decoded.args.src.toLowerCase() !== src.toLowerCase()) continue;
      total = (total ?? 0n) + decoded.args.wad;
    } catch {
      // Not a Withdrawal log.
    }
  }
  return total;
}
