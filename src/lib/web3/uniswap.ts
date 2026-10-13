import { encodeFunctionData, type Abi, type PublicClient } from "viem";
import {
  TREASURY_ADDRESS,
  treasuryIsLive,
} from "./fees";
import { sweepCutWei } from "./sweep";
import {
  UNISWAP_QUOTER_V2,
  UNISWAP_SWAP_ROUTER_02,
  WETH_ADDRESS,
} from "./chain";
import { erc20Abi } from "./actions";
import { assertReceiptSuccess, unwrappedWei } from "./receipt";

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
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assertReceiptSuccess(receipt, "Swap approval");
}

/**
 * Swap token → ETH via Uniswap SwapRouter02, then send the 1.25% cut to
 * treasury when one is configured. Amounts are taken from the swap receipt,
 * not the scan-time quote. If the cut tx is declined or fails the swap still
 * stands: `cutWei` is 0 and `cutError` says why.
 */
export async function executeSweepSwap(opts: {
  publicClient: PublicClient;
  walletClient: TxClient;
  owner: `0x${string}`;
  token: `0x${string}`;
  amountIn: bigint;
  fee: number;
  quoteWei: bigint;
}): Promise<{
  recoveredWei: bigint;
  cutWei: bigint;
  hash: `0x${string}`;
  cutError?: unknown;
}> {
  const { publicClient, walletClient, owner, token, amountIn, fee, quoteWei } =
    opts;
  const minOut = minOutFromQuote(quoteWei);

  let hash: `0x${string}`;
  let grossWei: bigint;
  if (token.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
    hash = await walletClient.sendTransaction({
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
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assertReceiptSuccess(receipt, "WETH unwrap");
    grossWei = amountIn;
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
    hash = await walletClient.sendTransaction({
      to: UNISWAP_SWAP_ROUTER_02,
      data: encodeFunctionData({
        abi: swapRouterAbi,
        functionName: "multicall",
        args: [[swapData, unwrapData]],
      }),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assertReceiptSuccess(receipt, "Swap");
    // minOut is a floor; the unwrap event says what was really paid out.
    grossWei =
      unwrappedWei(receipt.logs, WETH_ADDRESS, UNISWAP_SWAP_ROUTER_02) ?? minOut;
  }

  let cutWei = treasuryIsLive() ? sweepCutWei(grossWei) : 0n;
  let cutError: unknown;
  if (cutWei > 0n) {
    try {
      const cutHash = await walletClient.sendTransaction({
        to: TREASURY_ADDRESS,
        value: cutWei,
      });
      const cutReceipt = await publicClient.waitForTransactionReceipt({
        hash: cutHash,
      });
      assertReceiptSuccess(cutReceipt, "Sweep cut");
    } catch (err) {
      cutError = err;
      cutWei = 0n;
    }
  }

  return { recoveredWei: grossWei - cutWei, cutWei, hash, cutError };
}
