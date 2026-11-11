/**
 * $WIF utility for the World is Flat hackathon track (`hackathon/wif`).
 *
 * Flywheel: batch cleans (2+ actions) settle the protocol fee via PyreWifGate.
 * The gate pulls feeAmount $WIF, burns the configured share (default 80%), and
 * forwards the rest to the Pyre treasury. ETH fee remains the fallback when
 * the wallet cannot pay in $WIF.
 *
 * Token: 0x5173b8eA6923c2d40267890D45C46a3480954773 (Robinhood Chain)
 * Gate:  0x4A5442c781F4ec7f38c080338758f4193287E29E
 */

import {
  encodeFunctionData,
  type Abi,
  type PublicClient,
  type WalletClient,
} from "viem";
import { erc20Abi } from "./actions.ts";
import { robinhoodChain } from "./chain.ts";
import { assertReceiptSuccess } from "./receipt.ts";

/** World is Flat / $WIF on Robinhood Chain. */
export const WIF_ADDRESS =
  "0x5173b8eA6923c2d40267890D45C46a3480954773" as const;

/** Live PyreWifGate (hackathon/wif, chain 4663). */
export const WIF_GATE_ADDRESS =
  "0x4A5442c781F4ec7f38c080338758f4193287E29E" as const;

/** Fixed batch fee in $WIF (18 decimals). Matches gate constructor default. */
export const WIF_FEE_AMOUNT = 50n * 10n ** 18n; // 50 $WIF

export const WIF_FEE_LABEL = "50 $WIF";

const pyreWifGateAbi = [
  {
    type: "function",
    name: "payFee",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "feeAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const satisfies Abi;

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

/** On-chain fee from the gate; falls back to the local constant on read failure. */
export async function readWifFeeAmount(
  publicClient: PublicClient,
): Promise<bigint> {
  try {
    return (await publicClient.readContract({
      address: WIF_GATE_ADDRESS,
      abi: pyreWifGateAbi,
      functionName: "feeAmount",
    })) as bigint;
  } catch {
    return WIF_FEE_AMOUNT;
  }
}

export function canPayFeeWithWif(balance: bigint, feeAmount = WIF_FEE_AMOUNT): boolean {
  return balance >= feeAmount;
}

async function ensureWifAllowance(opts: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  owner: `0x${string}`;
  amount: bigint;
}): Promise<void> {
  const { publicClient, walletClient, owner, amount } = opts;
  const allowance = (await publicClient.readContract({
    address: WIF_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, WIF_GATE_ADDRESS],
  })) as bigint;

  if (allowance >= amount) return;

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [WIF_GATE_ADDRESS, amount],
  });

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
              "approve reverted",
          )
        : "approve reverted";
    throw new Error(`$WIF approve simulation failed: ${msg}`, { cause: err });
  }

  const hash = await walletClient.sendTransaction({
    account: owner,
    chain: robinhoodChain,
    to: WIF_ADDRESS,
    data,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assertReceiptSuccess(receipt, "$WIF approve for PyreWifGate");
}

/**
 * Pay the batch fee through PyreWifGate: approve if needed, then payFee().
 * Gate burns the burnBps share and forwards the rest to treasury.
 * Returns the payFee tx hash. Throws on failure (caller should fall back to ETH).
 */
export async function payFeeWithWif(opts: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  owner: `0x${string}`;
}): Promise<`0x${string}`> {
  const { publicClient, walletClient, owner } = opts;

  const feeAmount = await readWifFeeAmount(publicClient);
  const balance = await readWifBalance(publicClient, owner);
  if (!canPayFeeWithWif(balance, feeAmount)) {
    throw new Error(
      `Need at least ${WIF_FEE_LABEL} to pay the batch fee in $WIF`,
    );
  }

  await ensureWifAllowance({
    publicClient,
    walletClient,
    owner,
    amount: feeAmount,
  });

  const data = encodeFunctionData({
    abi: pyreWifGateAbi,
    functionName: "payFee",
  });

  try {
    await publicClient.call({
      account: owner,
      to: WIF_GATE_ADDRESS,
      data,
    });
  } catch (err) {
    const msg =
      err && typeof err === "object"
        ? String(
            (err as { shortMessage?: string; message?: string }).shortMessage ||
              (err as { message?: string }).message ||
              "payFee reverted",
          )
        : "payFee reverted";
    throw new Error(`$WIF gate fee simulation failed: ${msg}`, { cause: err });
  }

  const hash = await walletClient.sendTransaction({
    account: owner,
    chain: robinhoodChain,
    to: WIF_GATE_ADDRESS,
    data,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assertReceiptSuccess(receipt, "$WIF protocol fee (PyreWifGate)");
  return hash;
}
