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

async function gasWorks(
  publicClient: PublicClient,
  owner: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`,
) {
  try {
    await publicClient.estimateGas({ account: owner, to, data });
    return true;
  } catch {
    return false;
  }
}

async function sendAndWait(
  publicClient: PublicClient,
  walletClient: TxClient,
  owner: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`,
) {
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

/** Pick a calldata path that estimates gas, then send it once. */
export async function disposeErc20(opts: {
  publicClient: PublicClient;
  walletClient: TxClient;
  owner: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
}) {
  const { publicClient, walletClient, owner, token } = opts;
  let amount = opts.amount;
  try {
    const live = (await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    })) as bigint;
    if (live === 0n) throw new Error("Token balance is zero");
    if (live < amount) amount = live;
  } catch (err) {
    if (err instanceof Error && err.message === "Token balance is zero") throw err;
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

  let data = deadData;
  for (const candidate of candidates) {
    if (await gasWorks(publicClient, owner, token, candidate)) {
      data = candidate;
      break;
    }
  }

  return sendAndWait(publicClient, walletClient, owner, token, data);
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
  const data = (await gasWorks(publicClient, owner, token, burnData))
    ? burnData
    : transferData;
  return sendAndWait(publicClient, walletClient, owner, token, data);
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
  return sendAndWait(publicClient, walletClient, owner, token, data);
}
