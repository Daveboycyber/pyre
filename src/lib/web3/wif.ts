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

import { encodeFunctionData, type Abi, type PublicClient, type WalletClient } from "viem";
import { erc20Abi } from "./actions.ts";
import { robinhoodChain } from "./chain.ts";
import { assertReceiptSuccess } from "./receipt.ts";

/** World is Flat / $WIF on Robinhood Chain. */
export const WIF_ADDRESS = "0x5173b8eA6923c2d40267890D45C46a3480954773" as const;

/** Live PyreWifGate (hackathon/wif, chain 4663). */
export const WIF_GATE_ADDRESS = "0x4A5442c781F4ec7f38c080338758f4193287E29E" as const;

/** Batch fee shown to users, in $WIF (18 decimals). The most the app will pay. */
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

/**
 * A $WIF fee failure that must stop the clean instead of falling back to ETH:
 * the gate asks for more than the user was shown, or a payFee tx was sent and
 * its outcome is unknown (paying ETH as well could charge twice).
 */
export class WifFeeError extends Error {
  override name = "WifFeeError";
}

const REJECTED_IN_WALLET =
  /user rejected|user denied|denied transaction|rejected the request|request rejected/i;

/** True when the error (or any cause) is the user declining in their wallet. */
function isWalletRejection(err: unknown): boolean {
  for (let e = err, depth = 0; e && typeof e === "object" && depth < 8; depth++) {
    const rec = e as { code?: number; shortMessage?: string; message?: string; cause?: unknown };
    if (rec.code === 4001) return true;
    if (REJECTED_IN_WALLET.test(rec.shortMessage ?? rec.message ?? "")) return true;
    e = rec.cause;
  }
  return false;
}

/**
 * What to do after `payFeeWithWif` throws. "eth" only when nothing was charged
 * and the user did not decline: a wallet rejection or a WifFeeError stops the clean.
 */
export function wifFeeFallback(err: unknown): "eth" | "stop" {
  if (err instanceof WifFeeError) return "stop";
  if (isWalletRejection(err)) return "stop";
  return "eth";
}

/** On-chain fee from the gate. Throws on read failure; never guesses. */
export async function readWifFeeAmount(publicClient: PublicClient): Promise<bigint> {
  return (await publicClient.readContract({
    address: WIF_GATE_ADDRESS,
    abi: pyreWifGateAbi,
    functionName: "feeAmount",
  })) as bigint;
}

/** Stop when the gate fee is above what the user was shown. */
function assertFeeWithinQuote(feeAmount: bigint, maxFee: bigint) {
  if (feeAmount > maxFee) {
    throw new WifFeeError(
      `The $WIF batch fee changed to ${feeAmount / 10n ** 18n} $WIF, above the ${WIF_FEE_LABEL} shown. Nothing was charged. Rescan and try again.`,
    );
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
    throw new Error(`$WIF approve simulation failed: ${errorText(err, "approve reverted")}`, {
      cause: err,
    });
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

function errorText(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const rec = err as { shortMessage?: string; message?: string };
  return String(rec.shortMessage || rec.message || fallback);
}

/**
 * Pay the batch fee through PyreWifGate: approve if needed, then payFee().
 * Gate burns the burnBps share and forwards the rest to treasury.
 *
 * `maxFee` is the fee the user was shown. A higher on-chain fee throws
 * WifFeeError before anything is signed. Only exact approvals are made, so a
 * fee raised between approve and payFee makes payFee revert rather than
 * overcharge. Use `wifFeeFallback` on the thrown error before trying ETH.
 */
export async function payFeeWithWif(opts: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  owner: `0x${string}`;
  maxFee?: bigint;
}): Promise<`0x${string}`> {
  const { publicClient, walletClient, owner, maxFee = WIF_FEE_AMOUNT } = opts;

  const feeAmount = await readWifFeeAmount(publicClient);
  assertFeeWithinQuote(feeAmount, maxFee);
  const balance = await readWifBalance(publicClient, owner);
  if (!canPayFeeWithWif(balance, feeAmount)) {
    throw new Error(`Need at least ${WIF_FEE_LABEL} to pay the batch fee in $WIF`);
  }

  await ensureWifAllowance({
    publicClient,
    walletClient,
    owner,
    amount: feeAmount,
  });

  // The fee is owner-settable. Re-read after the approve wait, right before payFee.
  assertFeeWithinQuote(await readWifFeeAmount(publicClient), maxFee);

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
    throw new Error(`$WIF gate fee simulation failed: ${errorText(err, "payFee reverted")}`, {
      cause: err,
    });
  }

  const hash = await walletClient.sendTransaction({
    account: owner,
    chain: robinhoodChain,
    to: WIF_GATE_ADDRESS,
    data,
  });

  let receipt: { status: "success" | "reverted" };
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash });
  } catch (err) {
    // Sent but unconfirmed: it may still land, so never pay ETH on top.
    throw new WifFeeError(
      `The $WIF fee transaction (${hash}) was sent but not confirmed. Check your wallet activity before retrying.`,
      { cause: err },
    );
  }
  // A mined revert charged nothing, so the ETH fallback stays safe.
  assertReceiptSuccess(receipt, "$WIF protocol fee (PyreWifGate)");
  return hash;
}
