/**
 * $WIF utility for the World is Flat hackathon track (`hackathon/wif`).
 *
 * Flywheel: batch cleans (2+ actions) can be paid in $WIF → real on-chain
 * transfer to the Pyre treasury. That creates demand for $WIF when users
 * clean wallets. ETH fee remains the fallback when balance is insufficient.
 *
 * Token: 0x5173b8eA6923c2d40267890D45C46a3480954773 (Robinhood Chain)
 */

import {
  encodeFunctionData,
  type PublicClient,
  type WalletClient,
} from "viem";
import { erc20Abi } from "./actions.ts";
import { robinhoodChain } from "./chain.ts";
import { TREASURY_ADDRESS } from "./fees.ts";
import { assertReceiptSuccess } from "./receipt.ts";

/** World is Flat / $WIF on Robinhood Chain. */
export const WIF_ADDRESS =
  "0x5173b8eA6923c2d40267890D45C46a3480954773" as const;

/** Fixed batch fee in $WIF (18 decimals). Hackathon-simple; not oracle-priced. */
export const WIF_FEE_AMOUNT = 50n * 10n ** 18n; // 50 $WIF

export const WIF_FEE_LABEL = "50 $WIF";

export async function readWifBalance(
  publicClient: PublicClient,
  owner: `0x${string}`,
): Promise<bigint> {
  try {
    return (await publicClient.readContract({
      address: WIF_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    })) as bigint;
  } catch {
    return 0n;
  }
}

export function canPayFeeWithWif(balance: bigint): boolean {
  return balance >= WIF_FEE_AMOUNT;
}

/**
 * Transfer the fixed $WIF batch fee to the Pyre treasury.
 * Returns the tx hash. Throws on failure (caller should fall back to ETH).
 */
export async function payFeeWithWif(opts: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  owner: `0x${string}`;
}): Promise<`0x${string}`> {
  const { publicClient, walletClient, owner } = opts;

  const balance = await readWifBalance(publicClient, owner);
  if (!canPayFeeWithWif(balance)) {
    throw new Error(
      `Need at least ${WIF_FEE_LABEL} to pay the batch fee in $WIF`,
    );
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [TREASURY_ADDRESS, WIF_FEE_AMOUNT],
  });

  // Preflight
  try {
    await publicClient.call({
      account: owner,
      to: WIF_ADDRESS,
      data,
    });
  } catch (err) {
    const msg =
      err && typeof err === "object"
        ? String(
            (err as { shortMessage?: string; message?: string }).shortMessage ||
              (err as { message?: string }).message ||
              "transfer reverted",
          )
        : "transfer reverted";
    throw new Error(`$WIF fee simulation failed: ${msg}`, { cause: err });
  }

  const hash = await walletClient.sendTransaction({
    account: owner,
    chain: robinhoodChain,
    to: WIF_ADDRESS,
    data,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assertReceiptSuccess(receipt, "$WIF protocol fee");
  return hash;
}
