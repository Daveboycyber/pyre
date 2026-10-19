/**
 * Phase 2 Stock Desk — client constants and ABI surface.
 * Contract lives on branch `phase-2` until deployed; address stays zero until then.
 */

import type { Abi } from "viem";

function envString(key: string): string | undefined {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    return env?.[key];
  } catch {
    return undefined;
  }
}

function readAddress(envKey: string, fallback: `0x${string}`): `0x${string}` {
  const raw = envString(envKey);
  if (raw && /^0x[0-9a-fA-F]{40}$/.test(raw)) return raw as `0x${string}`;
  return fallback;
}

/** Set after deploy; override with VITE_PYRE_STOCK_DESK. */
const UNDEPLOYED = "0x0000000000000000000000000000000000000000" as const;

export const STOCK_DESK_ADDRESS = readAddress("VITE_PYRE_STOCK_DESK", UNDEPLOYED);

export function stockDeskIsLive() {
  return STOCK_DESK_ADDRESS.toLowerCase() !== UNDEPLOYED.toLowerCase();
}

/** Minimal ABI for D1 sell + quote + pause read. */
export const stockDeskAbi = [
  {
    type: "function",
    name: "sellDust",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "paidWei", type: "uint256" }],
  },
  {
    type: "function",
    name: "quotePayout",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "paidWei", type: "uint256" }],
  },
  {
    type: "function",
    name: "quotes",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "weiPerWhole", type: "uint256" },
      { name: "decimals", type: "uint8" },
      { name: "listed", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "maxPayoutWei",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "DustSold",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "paidWei", type: "uint256", indexed: false },
    ],
  },
] as const satisfies Abi;
