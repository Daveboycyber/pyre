/**
 * Reads Pyre usage straight from Robinhood Chain logs for the public /stats
 * page. Blockscout's API sits behind a Cloudflare challenge for servers, so
 * this talks to the public RPC only. That RPC is not an archive node (no
 * historical state) but serves logs, receipts and blocks, which is all we need.
 *
 * State is kept per server instance and extended incrementally: each refresh
 * scans only blocks it has not seen yet. One refresh runs at a time, results
 * are reused for TTL_MS, and a failed refresh serves the last good data.
 */
import { createPublicClient, erc20Abi, http, toEventSelector, type Hex, type Log } from "viem";
import {
  ATTRIBUTION_BLOCKS,
  blockRanges,
  buildSnapshot,
  classifyTransfer,
  isRevoke,
  safeTokenText,
  walletHistory,
  type ActionEvent,
  type AnalyticsInput,
  type AnalyticsSnapshot,
  type FeeEvent,
  type TokenInfo,
  type WalletHistory,
} from "../../src/lib/web3/analytics.ts";
import { robinhoodChain, UNISWAP_SWAP_ROUTER_02, WETH_ADDRESS } from "../../src/lib/web3/chain.ts";
import { unwrappedWei } from "../../src/lib/web3/receipt.ts";
import stockTokens from "../../public/stock-tokens.json";

const LIVE_BATCH = "0xcB157e4D7035F9a38b9e0B92b89E544e378c1490";
const RETIRED_BATCH = "0x92C5eAaBdaDFF7575c3f19B6ce3f86e8F9b5126B";

export const CONTRACTS = [
  { address: LIVE_BATCH, label: "PyreBatch" },
  { address: RETIRED_BATCH, label: "PyreBatch (retired)" },
];

/** ~2026-10-06, before the first PyreBatch went live on 2026-10-07. */
const SCAN_FROM_BLOCK = 81_000_000;

const TOPIC = {
  feePaid: toEventSelector("FeePaid(address,uint256)"),
  transfer: toEventSelector("Transfer(address,address,uint256)"),
  approval: toEventSelector("Approval(address,address,uint256)"),
  approvalForAll: toEventSelector("ApprovalForAll(address,address,bool)"),
};

const CONCURRENCY = 6;
const TTL_MS = 2 * 60 * 1000;

const STOCK_BY_ADDRESS = new Map(
  (stockTokens as { symbol: string; name: string; address: string }[]).map((t) => [
    t.address.toLowerCase(),
    t,
  ]),
);

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(undefined, { retryCount: 3, timeout: 20_000 }),
});

type State = {
  scannedTo: number;
  fees: FeeEvent[];
  feeWindowScannedTo: Map<string, number>;
  actions: Map<string, ActionEvent>;
  tokens: Map<string, TokenInfo>;
  blockTimes: Map<number, number>;
  txTo: Map<string, string | null>;
  ethOutByTx: Map<string, bigint>;
};

const state: State = {
  scannedTo: SCAN_FROM_BLOCK - 1,
  fees: [],
  feeWindowScannedTo: new Map(),
  actions: new Map(),
  tokens: new Map(),
  blockTimes: new Map(),
  txTo: new Map(),
  ethOutByTx: new Map(),
};

async function mapLimit<T, R>(items: readonly T[], fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return out;
}

const hex = (n: number) => `0x${n.toString(16)}` as Hex;
const topicAddress = (topic: string) => `0x${topic.slice(26)}`.toLowerCase();
const addressTopic = (address: string) =>
  `0x${address.slice(2).toLowerCase().padStart(64, "0")}` as Hex;

async function rawLogs(params: {
  address?: string[];
  topics: (Hex | Hex[] | null)[];
  from: number;
  to: number;
}): Promise<Log[]> {
  return client.request({
    method: "eth_getLogs",
    params: [
      {
        ...(params.address ? { address: params.address as Hex[] } : {}),
        topics: params.topics,
        fromBlock: hex(params.from),
        toBlock: hex(params.to),
      },
    ],
  }) as Promise<Log[]>;
}

/**
 * One contract per request: the RPC allows 10M-block spans only when every
 * filter position has a single value, and caps multi-value filters at 100k.
 */
async function scanFees(head: number) {
  for (const range of blockRanges(state.scannedTo + 1, head)) {
    const perContract = await Promise.all(
      CONTRACTS.map((c) =>
        rawLogs({ address: [c.address], topics: [TOPIC.feePaid], from: range.from, to: range.to }),
      ),
    );
    const logs = perContract.flat();
    for (const log of logs) {
      state.fees.push({
        contract: log.address,
        payer: topicAddress(log.topics[1]!),
        amountWei: BigInt(log.data),
        block: Number(log.blockNumber),
        timestamp: 0,
        txHash: log.transactionHash!,
      });
    }
    state.scannedTo = range.to;
  }
}

async function txTarget(hash: string) {
  if (!state.txTo.has(hash)) {
    const tx = await client.getTransaction({ hash: hash as Hex });
    state.txTo.set(hash, tx.to?.toLowerCase() ?? null);
  }
  return state.txTo.get(hash) ?? null;
}

async function toAction(log: Log, payer: string): Promise<ActionEvent | null> {
  const [topic0, , topic2] = log.topics;
  let kind: ActionEvent["kind"] | null = null;
  let spender: string | null = null;
  if (topic0 === TOPIC.transfer && topic2) {
    const to = topicAddress(topic2);
    kind = classifyTransfer(to, null) ?? classifyTransfer(to, await txTarget(log.transactionHash!));
  } else if (topic0 === TOPIC.approval && log.topics.length === 3) {
    // ERC-20 only: a 4-topic Approval is a single ERC-721 token approval.
    kind = isRevoke(BigInt(log.data)) ? "revoke" : null;
    spender = topic2 ? topicAddress(topic2) : null;
  } else if (topic0 === TOPIC.approvalForAll) {
    kind = isRevoke(BigInt(log.data) !== 0n) ? "revoke" : null;
    spender = topic2 ? topicAddress(topic2) : null;
  }
  if (!kind) return null;
  return {
    kind,
    payer,
    token: log.address.toLowerCase(),
    spender: kind === "revoke" ? spender : null,
    block: Number(log.blockNumber),
    timestamp: null,
    txHash: log.transactionHash!,
    logIndex: Number(log.logIndex),
  };
}

/** Transfers, approvals and operator changes by each payer after its fee. */
async function scanFeeWindows(head: number) {
  const pending = state.fees.flatMap((fee) => {
    const key = `${fee.txHash}:${fee.payer}`;
    const from = (state.feeWindowScannedTo.get(key) ?? fee.block - 1) + 1;
    const to = Math.min(fee.block + ATTRIBUTION_BLOCKS, head);
    return from <= to ? [{ key, fee, from, to }] : [];
  });
  await mapLimit(pending, async ({ key, fee, from, to }) => {
    const logs = await rawLogs({
      topics: [[TOPIC.transfer, TOPIC.approval, TOPIC.approvalForAll], addressTopic(fee.payer)],
      from,
      to,
    });
    const actions = await mapLimit(logs, (log) => toAction(log, fee.payer));
    for (const a of actions) {
      if (a) state.actions.set(`${a.txHash}:${a.logIndex}`, a);
    }
    state.feeWindowScannedTo.set(key, to);
  });
}

async function readString(address: string, functionName: "symbol" | "name") {
  try {
    const value = await client.readContract({
      address: address as Hex,
      abi: erc20Abi,
      functionName,
    });
    return typeof value === "string" && value.trim() ? value.slice(0, 256) : null; // sanitized and capped by safeTokenText
  } catch {
    return null;
  }
}

async function loadTokenInfo() {
  const missing = [...new Set([...state.actions.values()].map((a) => a.token))].filter(
    (t) => !state.tokens.has(t),
  );
  await mapLimit(missing, async (address) => {
    const stock = STOCK_BY_ADDRESS.get(address);
    const [rawSymbol, rawName] = stock
      ? [stock.symbol, stock.name]
      : await Promise.all([readString(address, "symbol"), readString(address, "name")]);
    // Scammers write these strings; clean them before they reach any page.
    const symbol = safeTokenText(rawSymbol, 16);
    const name = safeTokenText(rawName, 48);
    state.tokens.set(address, {
      symbol: symbol.text,
      name: name.text,
      stock: Boolean(stock),
      hadLink: symbol.hadLink || name.hadLink,
    });
  });
}

async function loadTimestamps() {
  const blocks = [
    ...new Set([
      ...state.fees.map((f) => f.block),
      ...[...state.actions.values()].map((a) => a.block),
    ]),
  ].filter((b) => !state.blockTimes.has(b));
  await mapLimit(blocks, async (blockNumber) => {
    const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });
    state.blockTimes.set(blockNumber, Number(block.timestamp));
  });
  for (const f of state.fees) f.timestamp = state.blockTimes.get(f.block) ?? 0;
  for (const a of state.actions.values()) a.timestamp = state.blockTimes.get(a.block) ?? null;
}

/** ETH that SwapRouter02 unwrapped to the user in each sweep transaction. */
async function loadSweepEth() {
  const txs = [
    ...new Set(
      [...state.actions.values()]
        .filter((a) => a.kind === "sweep")
        .map((a) => a.txHash.toLowerCase()),
    ),
  ].filter((tx) => !state.ethOutByTx.has(tx));
  await mapLimit(txs, async (tx) => {
    const receipt = await client.getTransactionReceipt({ hash: tx as Hex });
    state.ethOutByTx.set(
      tx,
      unwrappedWei(receipt.logs, WETH_ADDRESS, UNISWAP_SWAP_ROUTER_02) ?? 0n,
    );
  });
}

async function refreshState(): Promise<AnalyticsInput> {
  const head = Number(await client.getBlockNumber());
  await scanFees(head);
  await scanFeeWindows(head);
  await Promise.all([loadTokenInfo(), loadTimestamps(), loadSweepEth()]);
  return {
    fees: state.fees,
    actions: [...state.actions.values()],
    tokens: state.tokens,
    ethOutByTx: state.ethOutByTx,
    contracts: CONTRACTS,
    headBlock: head,
    nowMs: Date.now(),
  };
}

let cached: AnalyticsInput | null = null;
let inflight: Promise<AnalyticsInput> | null = null;

async function currentInput(): Promise<AnalyticsInput> {
  if (cached && Date.now() - cached.nowMs < TTL_MS) return cached;
  inflight ??= refreshState()
    .then((input) => {
      cached = input;
      return input;
    })
    .finally(() => {
      inflight = null;
    });
  try {
    return await inflight;
  } catch (err) {
    if (cached) {
      console.error("[analytics] refresh failed, serving last good data", err);
      return cached;
    }
    throw err;
  }
}

export async function getSnapshot(): Promise<AnalyticsSnapshot> {
  return buildSnapshot(await currentInput());
}

export async function getWalletHistory(address: string): Promise<WalletHistory> {
  return walletHistory(await currentInput(), address);
}
