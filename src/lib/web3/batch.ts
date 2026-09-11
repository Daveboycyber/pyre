import { encodeFunctionData, type Abi } from "viem";
import {
  PYRE_BATCH_ADDRESS,
  TREASURY_ADDRESS,
  pyreBatchIsDeployed,
} from "./fees";

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
