import { encodeFunctionData, type Abi, type PublicClient } from "viem";
import {
  PYRE_BATCH_ADDRESS,
  TREASURY_ADDRESS,
  pyreBatchIsDeployed,
  resolveBatchFee,
} from "./fees.ts";

export const pyreBatchAbi = [
  {
    type: "function",
    name: "collectFee",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "clean",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "protocolFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const satisfies Abi;

export type FeeTx = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
};

/**
 * Fee to send for a batch the user was quoted `shownWei` for. When PyreBatch
 * is deployed its `protocolFee()` is the source of truth, not the env value.
 */
export async function batchFeeToSend(
  publicClient: PublicClient,
  shownWei: bigint,
): Promise<bigint> {
  if (!pyreBatchIsDeployed()) return shownWei;
  const onChain = (await publicClient.readContract({
    address: PYRE_BATCH_ADDRESS,
    abi: pyreBatchAbi,
    functionName: "protocolFee",
  })) as bigint;
  return resolveBatchFee(shownWei, onChain);
}

/** Build the single fee payment that must land before any batch burns. */
export function buildFeeTx(feeWei: bigint): FeeTx {
  if (feeWei <= 0n) {
    throw new Error("No protocol fee on a single action");
  }
  if (pyreBatchIsDeployed()) {
    return {
      to: PYRE_BATCH_ADDRESS,
      data: encodeFunctionData({
        abi: pyreBatchAbi,
        functionName: "collectFee",
      }),
      value: feeWei,
    };
  }
  return {
    to: TREASURY_ADDRESS,
    data: "0x",
    value: feeWei,
  };
}
