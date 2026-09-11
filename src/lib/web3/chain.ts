import { defineChain } from "viem";

/**
 * Robinhood Chain — Arbitrum Orbit L2, settles to Ethereum, gas paid in ETH.
 * Mainnet launched 2026-07-01. Source: robinhood.com/support + chainlist.org/chain/4663.
 */
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com",
      apiUrl: "https://robinhoodchain.blockscout.com/api/v2",
    },
  },
  testnet: false,
});

export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

export const WETH_ADDRESS =
  "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as const;

export const USDG_ADDRESS =
  "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;

/** Canonical CREATE2 Permit2. */
export const PERMIT2_ADDRESS =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

/** 1inch AggregationRouterV6 on Robinhood Chain (4663). */
export const ONEINCH_ROUTER =
  "0x111111125421cA6dc452d289314280a0f8842A65" as const;

export const UNISWAP_QUOTER_V2 =
  "0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7" as const;

export const UNISWAP_SWAP_ROUTER_02 =
  "0xCaf681a66D020601342297493863E78C959E5cb2" as const;

/**
 * Known contracts worth checking for leftover allowances. This is a curated
 * list, not a full historical scan (that needs an indexer/subgraph over
 * Approval events) — extend as more Robinhood Chain DeFi gets identified.
 */
export const KNOWN_SPENDERS: { address: `0x${string}`; label: string }[] = [
  { address: PERMIT2_ADDRESS, label: "Permit2" },
  { address: UNISWAP_SWAP_ROUTER_02, label: "Uniswap Router" },
  { address: ONEINCH_ROUTER, label: "1inch" },
];
