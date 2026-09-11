import { encodeFunctionData, type Abi, type PublicClient } from "viem";
import {
  TREASURY_ADDRESS,
  treasuryIsLive,
} from "./fees";
import { sweepCutWei, sweepNetWei } from "./sweep";
import {
  UNISWAP_QUOTER_V2,
  UNISWAP_SWAP_ROUTER_02,
  WETH_ADDRESS,
} from "./chain";
import { erc20Abi } from "./actions";

const FEE_TIERS = [100, 500, 3000, 10_000] as const;
const SLIPPAGE_BPS = 100n;

const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const satisfies Abi;

const swapRouterAbi = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "unwrapWETH9",
    stateMutability: "payable",
    inputs: [
      { name: "amountMinimum", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "multicall",
    stateMutability: "payable",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }],
  },
] as const satisfies Abi;

export type UniQuote = {
  amountOut: bigint;
  fee: number;
};

export async function quoteBestToWeth(
  publicClient: PublicClient,
  token: `0x${string}`,
  amountIn: bigint,
): Promise<UniQuote | null> {
  if (amountIn <= 0n) return null;
  if (token.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
    return { amountOut: amountIn, fee: 0 };
  }
  let best: UniQuote | null = null;
  for (const fee of FEE_TIERS) {
    try {
      const { result } = await publicClient.simulateContract({
        address: UNISWAP_QUOTER_V2,
        abi: quoterV2Abi,
        functionName: "quoteExactInputSingle",
        args: [
          {
            tokenIn: token,
            tokenOut: WETH_ADDRESS,
            amountIn,
            fee,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
      const amountOut = result[0];
      if (amountOut > 0n && (!best || amountOut > best.amountOut)) {
        best = { amountOut, fee };
      }
    } catch {
      // no pool at this fee
    }
  }
  return best;
}

function minOutFromQuote(amountOut: bigint) {
  return (amountOut * (10_000n - SLIPPAGE_BPS)) / 10_000n;
}

type TxClient = {
  sendTransaction: (args: {
    to: `0x${string}`;
    data?: `0x${string}`;
    value?: bigint;
  }) => Promise<`0x${string}`>;
};

async function ensureAllowance(
  publicClient: PublicClient,
  walletClient: TxClient,
  owner: `0x${string}`,
  token: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
) {
  const current = (await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  })) as bigint;
  if (current >= amount) return;
  const hash = await walletClient.sendTransaction({
    to: token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
    }),
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Swap token → ETH via Uniswap SwapRouter02, then send the 1.25% cut to
 * treasury when one is configured. Returns the net ETH the user kept.
 */
export async function executeSweepSwap(opts: {
  publicClient: PublicClient;
  walletClient: TxClient;
  owner: `0x${string}`;
  token: `0x${string}`;
  amountIn: bigint;
  fee: number;
  quoteWei: bigint;
}): Promise<{ recoveredWei: bigint; cutWei: bigint }> {
  const { publicClient, walletClient, owner, token, amountIn, fee, quoteWei } =
    opts;
  const minOut = minOutFromQuote(quoteWei);
  const cutWei = treasuryIsLive() ? sweepCutWei(quoteWei) : 0n;
  const recoveredWei = quoteWei - cutWei;

  if (token.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
    const hash = await walletClient.sendTransaction({
      to: WETH_ADDRESS,
      data: encodeFunctionData({
        abi: [
          {
            type: "function",
            name: "withdraw",
            stateMutability: "nonpayable",
            inputs: [{ name: "wad", type: "uint256" }],
            outputs: [],
          },
        ] as const satisfies Abi,
        functionName: "withdraw",
        args: [amountIn],
      }),
    });
    await publicClient.waitForTransactionReceipt({ hash });
  } else {
    await ensureAllowance(
      publicClient,
      walletClient,
      owner,
      token,
      UNISWAP_SWAP_ROUTER_02,
      amountIn,
    );
    const swapData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn: token,
          tokenOut: WETH_ADDRESS,
          fee,
          recipient: UNISWAP_SWAP_ROUTER_02,
          amountIn,
          amountOutMinimum: minOut,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });
    const unwrapData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: "unwrapWETH9",
      args: [minOut, owner],
    });
    const hash = await walletClient.sendTransaction({
      to: UNISWAP_SWAP_ROUTER_02,
      data: encodeFunctionData({
        abi: swapRouterAbi,
        functionName: "multicall",
        args: [[swapData, unwrapData]],
      }),
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  if (cutWei > 0n) {
    const cutHash = await walletClient.sendTransaction({
      to: TREASURY_ADDRESS,
      value: cutWei,
    });
    await publicClient.waitForTransactionReceipt({ hash: cutHash });
  }

  return { recoveredWei: sweepNetWei(quoteWei), cutWei };
}
