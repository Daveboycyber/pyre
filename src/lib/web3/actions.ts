import { encodeFunctionData, type Abi } from "viem";
import { DEAD_ADDRESS } from "./chain";

// Minimal ABIs — just the functions Pyre needs to call.
export const erc20Abi = [
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const satisfies Abi;

export const erc721Abi = [
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

/**
 * Build the calldata for burning an ERC-20. Tries the standard
 * OpenZeppelin `ERC20Burnable.burn(uint256)` selector first; callers should
 * fall back to `buildErc20DeadTransfer` if simulation/estimateGas reverts
 * (most tokens never implemented `burn`).
 */
export function buildErc20Burn(amount: bigint) {
  return encodeFunctionData({ abi: erc20Abi, functionName: "burn", args: [amount] });
}

export function buildErc20DeadTransfer(amount: bigint) {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [DEAD_ADDRESS, amount],
  });
}

export function buildErc20Revoke(spender: `0x${string}`) {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, 0n],
  });
}

export function buildErc721Burn(tokenId: bigint) {
  return encodeFunctionData({ abi: erc721Abi, functionName: "burn", args: [tokenId] });
}

export function buildErc721DeadTransfer(owner: `0x${string}`, tokenId: bigint) {
  return encodeFunctionData({
    abi: erc721Abi,
    functionName: "safeTransferFrom",
    args: [owner, DEAD_ADDRESS, tokenId],
  });
}

export function buildErc721RevokeAll(operator: `0x${string}`) {
  return encodeFunctionData({
    abi: erc721Abi,
    functionName: "setApprovalForAll",
    args: [operator, false],
  });
}
