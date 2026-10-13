import type { PublicClient } from "viem";
import { encodeFunctionData } from "viem";
import { robinhoodChain } from "./chain";
import {
  buildErc20Burn,
  buildErc20DeadTransfer,
  buildErc20Revoke,
  buildErc721Burn,
  buildErc721DeadTransfer,
  buildErc721RevokeAll,
  erc20Abi,
  erc721Abi,
} from "./actions";

const SINK_ADDRESS = "0x0000000000000000000000000000000000000001" as const;

export type TxClient = {
  sendTransaction: (args: {
    to: `0x${string}`;
    data?: `0x${string}`;
    value?: bigint;
    account?: `0x${string}`;
    chain?: typeof robinhoodChain;
  }) => Promise<`0x${string}`>;
};

/** Thrown when every candidate calldata reverts under eth_call. */
export class SimulationFailed extends Error {
  readonly reason: string;
  constructor(message = "Simulation failed for every burn path") {
    super(message);
    this.name = "SimulationFailed";
    this.reason = message;
  }
}

/**
 * Dry-run a call with eth_call. This is stricter than estimateGas alone:
 * we only care that the call succeeds against current state, not gas cost.
 */
export async function simulateCall(
  publicClient: PublicClient,
  owner: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await publicClient.call({
      account: owner,
      to,
      data,
    });
    return { ok: true };
  } catch (err) {
    const text =
      err && typeof err === "object"
        ? String(
            (err as { shortMessage?: string; message?: string }).shortMessage ||
              (err as { message?: string }).message ||
              "call reverted",
          )
        : "call reverted";
    return { ok: false, error: text };
  }
}

/** First candidate that simulates successfully, or null. */
export async function pickSimulatedCalldata(
  publicClient: PublicClient,
  owner: `0x${string}`,
  to: `0x${string}`,
  candidates: `0x${string}`[],
): Promise<{ data: `0x${string}` } | { error: string }> {
  let lastError = "no candidates";
  for (const candidate of candidates) {
    const result = await simulateCall(publicClient, owner, to, candidate);
    if (result.ok) return { data: candidate };
    lastError = result.error;
  }
  return { error: lastError };
}

async function sendAndWait(
  publicClient: PublicClient,
  walletClient: TxClient,
  owner: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`,
) {
  // Final sim immediately before the wallet prompt — state may have changed.
  const preflight = await simulateCall(publicClient, owner, to, data);
  if (!preflight.ok) {
    throw new SimulationFailed(
      `Pre-sign simulation failed: ${preflight.error}`,
    );
  }

  const hash = await walletClient.sendTransaction({
    account: owner,
    chain: robinhoodChain,
    to,
    data,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Transaction reverted on-chain");
  }
  return hash;
}

/**
 * Pick a calldata path that simulates, send it, then check balance.
 * Sticky balanceOf after a successful receipt is common on spam tokens —
 * we still count the burn as done and let the cleaner dismiss the row.
 */
export async function disposeErc20(opts: {
  publicClient: PublicClient;
  walletClient: TxClient;
  owner: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
}): Promise<{
  alreadyGone?: boolean;
  hash?: `0x${string}`;
  /** Receipt ok but balanceOf did not drop (non-standard / spam token). */
  stickyBalance?: boolean;
}> {
  const { publicClient, walletClient, owner, token } = opts;
  let amount = opts.amount;
  let liveBefore: bigint | null = null;
  try {
    liveBefore = (await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    })) as bigint;
    if (liveBefore === 0n) return { alreadyGone: true };
    if (liveBefore < amount) amount = liveBefore;
  } catch {
    // Keep the indexer amount if balanceOf is missing.
  }

  const deadData = buildErc20DeadTransfer(amount);
  const sinkData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [SINK_ADDRESS, amount],
  });
  const candidates: `0x${string}`[] = [
    buildErc20Burn(amount),
    deadData,
    sinkData,
  ];

  const picked = await pickSimulatedCalldata(
    publicClient,
    owner,
    token,
    candidates,
  );
  if ("error" in picked) {
    throw new SimulationFailed(
      `No burn path simulated successfully: ${picked.error}`,
    );
  }

  const hash = await sendAndWait(
    publicClient,
    walletClient,
    owner,
    token,
    picked.data,
  );

  // Post-execute check: informational only for sticky spam balances.
  let stickyBalance = false;
  try {
    const liveAfter = (await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    })) as bigint;
    if (liveBefore !== null && liveAfter >= liveBefore) {
      stickyBalance = true;
    }
  } catch {
    // balanceOf missing after burn — receipt still stands.
  }

  return { hash, stickyBalance };
}

export async function disposeErc721(opts: {
  publicClient: PublicClient;
  walletClient: TxClient;
  owner: `0x${string}`;
  token: `0x${string}`;
  tokenId: bigint;
}) {
  const { publicClient, walletClient, owner, token, tokenId } = opts;
  const burnData = buildErc721Burn(tokenId);
  const transferData = buildErc721DeadTransfer(owner, tokenId);
  const picked = await pickSimulatedCalldata(publicClient, owner, token, [
    burnData,
    transferData,
  ]);
  if ("error" in picked) {
    throw new SimulationFailed(
      `No NFT burn path simulated successfully: ${picked.error}`,
    );
  }
  return sendAndWait(publicClient, walletClient, owner, token, picked.data);
}

export async function revokeApproval(opts: {
  publicClient: PublicClient;
  walletClient: TxClient;
  owner: `0x${string}`;
  token: `0x${string}`;
  spender: `0x${string}`;
  standard: "ERC-20" | "ERC-721" | "ERC-1155";
}) {
  const { publicClient, walletClient, owner, token, spender, standard } = opts;
  const data =
    standard === "ERC-20"
      ? buildErc20Revoke(spender)
      : buildErc721RevokeAll(spender);

  const sim = await simulateCall(publicClient, owner, token, data);
  if (!sim.ok) {
    throw new SimulationFailed(`Revoke simulation failed: ${sim.error}`);
  }

  const hash = await sendAndWait(publicClient, walletClient, owner, token, data);

  // Post-execute verify allowance / operator flag when readable.
  try {
    if (standard === "ERC-20") {
      const allowance = (await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      })) as bigint;
      if (allowance !== 0n) {
        throw new Error(
          "Revoke receipt succeeded but allowance is still non-zero",
        );
      }
    } else {
      const approved = (await publicClient.readContract({
        address: token,
        abi: erc721Abi,
        functionName: "isApprovedForAll",
        args: [owner, spender],
      })) as boolean;
      if (approved) {
        throw new Error(
          "Revoke receipt succeeded but operator is still approved",
        );
      }
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("allowance") || err.message.includes("operator"))
    ) {
      throw err;
    }
  }

  return hash;
}
