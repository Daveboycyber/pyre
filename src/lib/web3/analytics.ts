/**
 * Public usage stats built only from on-chain events.
 *
 * A batch clean is the one action that names Pyre on-chain: the wallet calls
 * PyreBatch.collectFee() and the contract emits FeePaid(payer). Burns, sweeps
 * and revokes are ordinary token calls from the user's own wallet, so they are
 * counted when the paying wallet makes them within ATTRIBUTION_BLOCKS after
 * its fee. Single-action cleans pay no fee and leave nothing to attribute.
 *
 * Pure helpers only (no network) so they run under Node's test runner.
 * Wei amounts leave this module as decimal strings so snapshots are plain JSON.
 */
import { DEAD_ADDRESS, KNOWN_SPENDERS, UNISWAP_SWAP_ROUTER_02 } from "./chain.ts";

/** ~31 minutes at Robinhood Chain's ~0.103 s blocks. */
export const ATTRIBUTION_BLOCKS = 18_000;

/** The public RPC rejects eth_getLogs spans over 10,000,000 blocks. */
export const MAX_LOG_SPAN = 10_000_000;

export const DAILY_DAYS = 30;
export const TOP_TOKENS = 25;
export const TOP_SPENDERS = 10;
export const WATCHLIST_ROWS = 10;
export const RECENT_ROWS = 20;
export const WALLET_EVENT_ROWS = 100;

export type ActionKind = "burn" | "sweep" | "revoke";

export type FeeEvent = {
  contract: string;
  payer: string;
  amountWei: bigint;
  block: number;
  timestamp: number; // unix seconds
  txHash: string;
};

export type ActionEvent = {
  kind: ActionKind;
  payer: string;
  token: string;
  /** Spender or operator that lost access; revokes only. */
  spender?: string | null;
  block: number;
  timestamp: number | null;
  txHash: string;
  logIndex: number;
};

export type TokenInfo = {
  symbol: string | null;
  name: string | null;
  stock: boolean;
  /** The on-chain name or symbol contained a link, removed before display. */
  hadLink?: boolean;
};

export type TokenRow = {
  address: string;
  symbol: string | null;
  name: string | null;
  stock: boolean;
  burns: number;
  sweeps: number;
  wallets: number;
  firstSeen: number | null;
};

export type SpenderRow = {
  address: string;
  label: string | null;
  revokes: number;
  wallets: number;
};

export type WatchRow = {
  address: string;
  symbol: string | null;
  name: string | null;
  hadLink: boolean;
  burns: number;
  wallets: number;
  firstSeen: number | null;
};

export type DailyRow = { day: string; cleans: number; wallets: number };

/** Hourly bucket for the 24h view; `day` holds the bucket's ISO hour. */
export type HourlyRow = DailyRow;

export const RANGES = ["24h", "7d", "30d", "all"] as const;
export type RangeKey = (typeof RANGES)[number];

const RANGE_SECONDS: Record<RangeKey, number> = {
  "24h": 86_400,
  "7d": 7 * 86_400,
  "30d": 30 * 86_400,
  all: Number.POSITIVE_INFINITY,
};

export type Totals = {
  wallets: number;
  newWallets: number;
  returningWallets: number;
  batchCleans: number;
  burns: number;
  sweeps: number;
  revokes: number;
  actionsPerClean: number;
  tokens: number;
  stockTokensSwept: number;
  feesWei: string;
  ethRecoveredWei: string;
};

export type RecentRow = {
  kind: "clean" | ActionKind;
  wallet: string;
  token: { address: string; symbol: string | null; stock: boolean } | null;
  spender: { address: string; label: string | null } | null;
  /** Sweeps: ETH the swap unwrapped. Cleans: the fee paid. */
  amountWei: string | null;
  timestamp: number | null;
  txHash: string;
};

export type AnalyticsSnapshot = {
  generatedAt: number; // unix ms
  headBlock: number;
  attributionMinutes: number;
  contracts: { address: string; label: string; cleans: number; feesWei: string }[];
  totals: Record<RangeKey, Totals>;
  daily: DailyRow[];
  hourly: HourlyRow[];
  tokens: TokenRow[];
  spenders: SpenderRow[];
  watchlist: WatchRow[];
  recent: RecentRow[];
};

export type WalletHistory = {
  address: string;
  batchCleans: number;
  burns: number;
  sweeps: number;
  revokes: number;
  feesWei: string;
  ethRecoveredWei: string;
  firstSeen: number | null;
  lastSeen: number | null;
  events: RecentRow[];
};

export type AnalyticsInput = {
  fees: readonly FeeEvent[];
  actions: readonly ActionEvent[];
  tokens: ReadonlyMap<string, TokenInfo>;
  /** Lower-case tx hash → ETH unwrapped by SwapRouter02 in that sweep tx. */
  ethOutByTx: ReadonlyMap<string, bigint>;
  contracts: readonly { address: string; label: string }[];
  headBlock: number;
  nowMs: number;
};

/**
 * Invisible and direction-changing code points scammers use to disguise text:
 * control codes, soft hyphen, zero-width and joiner characters, bidi
 * overrides and isolates, variation selectors, Hangul fillers and specials.
 */
const INVISIBLE_RANGES: readonly [number, number][] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x00ad, 0x00ad],
  [0x034f, 0x034f],
  [0x061c, 0x061c],
  [0x115f, 0x1160],
  [0x17b4, 0x17b5],
  [0x180b, 0x180f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x206f],
  [0x3164, 0x3164],
  [0xfe00, 0xfe0f],
  [0xfeff, 0xfeff],
  [0xffa0, 0xffa0],
  [0xfff0, 0xffff],
];

function isInvisible(codePoint: number) {
  return INVISIBLE_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi);
}

function stripInvisible(text: string) {
  let out = "";
  for (const ch of text) {
    if (!isInvisible(ch.codePointAt(0) ?? 0)) out += ch;
  }
  return out;
}

/** Common ways to write a dot in an obfuscated link: "[.]", "(.)", " dot ". */
const DOT = String.raw`(?:\.|\[\.\]|\(\.\)|\s+dot\s+)`;

/** URLs, bare domains (claim-reward.xyz, claim[.]xyz) and t.me / wa.me handles. */
const LINK = new RegExp(
  String.raw`(?:https?:\/\/|www${DOT})\S+|\b(?:t|wa)\.me\/\S*|\b[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?(?:${DOT}[\p{L}\p{N}-]+)*${DOT}[a-z]{2,24}\b(?:\/\S*)?`,
  "giu",
);

export const LINK_REMOVED = "[link removed]";

/**
 * Token names and symbols come from the token contract, so scammers write
 * them. Before Pyre shows one: normalize look-alike characters, strip
 * invisible ones, replace anything link-like, collapse spaces and cap length.
 * `hadLink` lets the UI warn that the original pointed somewhere.
 */
export function safeTokenText(value: string | null | undefined, maxLength: number) {
  if (!value) return { text: null, hadLink: false };
  let text = stripInvisible(value.normalize("NFKC"));
  let hadLink = false;
  text = text.replace(LINK, () => {
    hadLink = true;
    return LINK_REMOVED;
  });
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return { text: null, hadLink };
  if (text.length > maxLength) text = `${text.slice(0, maxLength - 1).trimEnd()}…`;
  return { text, hadLink };
}

/** Inclusive [from, to] block spans no wider than `maxSpan`. */
export function blockRanges(from: number, to: number, maxSpan = MAX_LOG_SPAN) {
  const out: { from: number; to: number }[] = [];
  for (let start = from; start <= to; start += maxSpan) {
    out.push({ from: start, to: Math.min(start + maxSpan - 1, to) });
  }
  return out;
}

const lower = (a: string) => a.toLowerCase();
/**
 * Where Pyre's burn paths send tokens: burn() emits a Transfer to the zero
 * address, the fallback transfers to 0x…dEaD, and the last resort to 0x…0001
 * (see disposeErc20 / disposeErc721 in execute.ts).
 */
const BURN_SINKS = new Set([
  lower(DEAD_ADDRESS),
  "0x0000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000001",
]);
const ROUTER = lower(UNISWAP_SWAP_ROUTER_02);
const SPENDER_LABELS = new Map(KNOWN_SPENDERS.map((s) => [lower(s.address), s.label]));

export function spenderLabel(address: string) {
  return SPENDER_LABELS.get(lower(address)) ?? null;
}

/**
 * A Transfer out of the paying wallet. Sent to a burn sink it is a burn; inside a
 * transaction sent to Uniswap SwapRouter02 it is a sweep. Anything else is
 * not a Pyre action.
 */
export function classifyTransfer(to: string, txTo: string | null): ActionKind | null {
  if (BURN_SINKS.has(lower(to))) return "burn";
  if (txTo && lower(txTo) === ROUTER) return "sweep";
  return null;
}

/** approve(spender, 0) and setApprovalForAll(operator, false) are revokes. */
export function isRevoke(value: bigint | boolean) {
  return value === 0n || value === false;
}

/** Keep only actions made by a fee payer inside its attribution window. */
export function attributeActions(
  fees: readonly FeeEvent[],
  actions: readonly ActionEvent[],
  windowBlocks = ATTRIBUTION_BLOCKS,
) {
  const windows = new Map<string, { from: number; to: number }[]>();
  for (const f of fees) {
    const key = lower(f.payer);
    const list = windows.get(key) ?? [];
    list.push({ from: f.block, to: f.block + windowBlocks });
    windows.set(key, list);
  }
  const seen = new Set<string>();
  const out: ActionEvent[] = [];
  for (const a of actions) {
    const id = `${lower(a.txHash)}:${a.logIndex}`;
    if (seen.has(id)) continue;
    const spans = windows.get(lower(a.payer));
    if (!spans?.some((w) => a.block >= w.from && a.block <= w.to)) continue;
    seen.add(id);
    out.push(a);
  }
  return out;
}

export function utcDay(timestampSec: number) {
  return new Date(timestampSec * 1000).toISOString().slice(0, 10);
}

/** Zero-filled cleans and distinct wallets per UTC day, oldest first. */
export function dailySeries(fees: readonly FeeEvent[], nowSec: number, days = DAILY_DAYS) {
  const buckets = new Map<string, { cleans: number; wallets: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(utcDay(nowSec - i * 86_400), { cleans: 0, wallets: new Set() });
  }
  for (const f of fees) {
    const b = buckets.get(utcDay(f.timestamp));
    if (!b) continue;
    b.cleans += 1;
    b.wallets.add(lower(f.payer));
  }
  return [...buckets].map(([day, b]) => ({ day, cleans: b.cleans, wallets: b.wallets.size }));
}

/** Cleans and distinct wallets per UTC hour for the last 24 hours. */
export function hourlySeries(fees: readonly FeeEvent[], nowSec: number) {
  const hourStart = Math.floor(nowSec / 3_600) * 3_600;
  const buckets = new Map<number, { cleans: number; wallets: Set<string> }>();
  for (let i = 23; i >= 0; i--) {
    buckets.set(hourStart - i * 3_600, { cleans: 0, wallets: new Set() });
  }
  for (const f of fees) {
    const b = buckets.get(Math.floor(f.timestamp / 3_600) * 3_600);
    if (!b) continue;
    b.cleans += 1;
    b.wallets.add(lower(f.payer));
  }
  return [...buckets].map(([at, b]) => ({
    day: new Date(at * 1000).toISOString().slice(0, 13),
    cleans: b.cleans,
    wallets: b.wallets.size,
  }));
}

/** ETH unwrapped by the sweeps, counting each transaction once. */
export function sweptEth(actions: readonly ActionEvent[], ethOutByTx: ReadonlyMap<string, bigint>) {
  const txs = new Set(actions.filter((a) => a.kind === "sweep").map((a) => lower(a.txHash)));
  let total = 0n;
  for (const tx of txs) total += ethOutByTx.get(tx) ?? 0n;
  return total;
}

function prepare(input: AnalyticsInput) {
  const fees = [...input.fees].sort((a, b) => a.block - b.block);
  const actions = attributeActions(fees, input.actions);
  const info = (address: string): TokenInfo =>
    input.tokens.get(lower(address)) ?? { symbol: null, name: null, stock: false };
  const firstFee = new Map<string, number>();
  const feeCount = new Map<string, number>();
  for (const f of fees) {
    const key = lower(f.payer);
    if (!firstFee.has(key)) firstFee.set(key, f.timestamp);
    feeCount.set(key, (feeCount.get(key) ?? 0) + 1);
  }
  return { fees, actions, info, firstFee, feeCount };
}

type Prepared = ReturnType<typeof prepare>;

function totalsFor(
  p: Prepared,
  ethOutByTx: ReadonlyMap<string, bigint>,
  since: number,
  nowSec: number,
): Totals {
  const fees = p.fees.filter((f) => f.timestamp >= since);
  const actions = p.actions.filter((a) => (a.timestamp ?? nowSec) >= since);
  const count = (kind: ActionKind) => actions.filter((a) => a.kind === kind).length;
  const moved = actions.filter((a) => a.kind !== "revoke");
  const wallets = new Set(fees.map((f) => lower(f.payer)));
  const swept = new Set(
    moved.filter((a) => a.kind === "sweep" && p.info(a.token).stock).map((a) => lower(a.token)),
  );
  return {
    wallets: wallets.size,
    newWallets: [...wallets].filter((w) => (p.firstFee.get(w) ?? 0) >= since).length,
    returningWallets: [...wallets].filter((w) => (p.feeCount.get(w) ?? 0) > 1).length,
    batchCleans: fees.length,
    burns: count("burn"),
    sweeps: count("sweep"),
    revokes: count("revoke"),
    actionsPerClean: fees.length ? Math.round((actions.length / fees.length) * 10) / 10 : 0,
    tokens: new Set(moved.map((a) => lower(a.token))).size,
    stockTokensSwept: swept.size,
    feesWei: fees.reduce((sum, f) => sum + f.amountWei, 0n).toString(),
    ethRecoveredWei: sweptEth(actions, ethOutByTx).toString(),
  };
}

function toRecentRows(
  p: Prepared,
  fees: readonly FeeEvent[],
  actions: readonly ActionEvent[],
  ethOutByTx: ReadonlyMap<string, bigint>,
  limit: number,
): RecentRow[] {
  const rows = [
    ...fees.map((f) => ({
      kind: "clean" as const,
      wallet: f.payer,
      token: null,
      spender: null,
      amountWei: f.amountWei.toString(),
      timestamp: f.timestamp,
      txHash: f.txHash,
      block: f.block,
    })),
    ...actions.map((a) => {
      const t = p.info(a.token);
      const eth = a.kind === "sweep" ? ethOutByTx.get(lower(a.txHash)) : undefined;
      return {
        kind: a.kind,
        wallet: a.payer,
        token: { address: a.token, symbol: t.symbol, stock: t.stock },
        spender: a.spender ? { address: a.spender, label: spenderLabel(a.spender) } : null,
        amountWei: eth != null ? eth.toString() : null,
        timestamp: a.timestamp,
        txHash: a.txHash,
        block: a.block,
      };
    }),
  ];
  return rows
    .sort((a, b) => b.block - a.block)
    .slice(0, limit)
    .map(({ block: _block, ...row }) => row);
}

function tokenRows(p: Prepared): TokenRow[] {
  const rows = new Map<string, TokenRow & { walletSet: Set<string> }>();
  for (const a of p.actions) {
    if (a.kind === "revoke") continue;
    const key = lower(a.token);
    const t = p.info(key);
    const row = rows.get(key) ?? {
      address: a.token,
      symbol: t.symbol,
      name: t.name,
      stock: t.stock,
      burns: 0,
      sweeps: 0,
      wallets: 0,
      firstSeen: null,
      walletSet: new Set<string>(),
    };
    if (a.kind === "burn") row.burns += 1;
    else row.sweeps += 1;
    row.walletSet.add(lower(a.payer));
    if (a.timestamp != null && (row.firstSeen == null || a.timestamp < row.firstSeen)) {
      row.firstSeen = a.timestamp;
    }
    rows.set(key, row);
  }
  return [...rows.values()]
    .map(({ walletSet, ...row }) => ({ ...row, wallets: walletSet.size }))
    .sort((a, b) => b.burns + b.sweeps - (a.burns + a.sweeps) || b.wallets - a.wallets);
}

function spenderRows(p: Prepared): SpenderRow[] {
  const rows = new Map<string, { revokes: number; wallets: Set<string> }>();
  for (const a of p.actions) {
    if (a.kind !== "revoke" || !a.spender) continue;
    const key = lower(a.spender);
    const row = rows.get(key) ?? { revokes: 0, wallets: new Set<string>() };
    row.revokes += 1;
    row.wallets.add(lower(a.payer));
    rows.set(key, row);
  }
  return [...rows]
    .map(([address, r]) => ({
      address,
      label: spenderLabel(address),
      revokes: r.revokes,
      wallets: r.wallets.size,
    }))
    .sort((a, b) => b.revokes - a.revokes || b.wallets - a.wallets)
    .slice(0, TOP_SPENDERS);
}

/** Burned, non-Stock tokens that hit the most wallets: the spam to ignore. */
function watchRows(p: Prepared, tokens: readonly TokenRow[]): WatchRow[] {
  return tokens
    .filter((t) => !t.stock && t.burns > 0)
    .sort((a, b) => b.wallets - a.wallets || b.burns - a.burns)
    .slice(0, WATCHLIST_ROWS)
    .map(({ address, symbol, name, burns, wallets, firstSeen }) => ({
      address,
      symbol,
      name,
      hadLink: Boolean(p.info(address).hadLink),
      burns,
      wallets,
      firstSeen,
    }));
}

export function buildSnapshot(input: AnalyticsInput): AnalyticsSnapshot {
  const p = prepare(input);
  const nowSec = Math.floor(input.nowMs / 1000);
  const totals = Object.fromEntries(
    RANGES.map((range) => [
      range,
      totalsFor(p, input.ethOutByTx, nowSec - RANGE_SECONDS[range], nowSec),
    ]),
  ) as Record<RangeKey, Totals>;
  const tokens = tokenRows(p);

  return {
    generatedAt: input.nowMs,
    headBlock: input.headBlock,
    attributionMinutes: 30,
    contracts: input.contracts.map((c) => {
      const own = p.fees.filter((f) => lower(f.contract) === lower(c.address));
      return {
        ...c,
        cleans: own.length,
        feesWei: own.reduce((sum, f) => sum + f.amountWei, 0n).toString(),
      };
    }),
    totals,
    daily: dailySeries(p.fees, nowSec),
    hourly: hourlySeries(p.fees, nowSec),
    tokens: tokens.slice(0, TOP_TOKENS),
    spenders: spenderRows(p),
    watchlist: watchRows(p, tokens),
    recent: toRecentRows(p, p.fees, p.actions, input.ethOutByTx, RECENT_ROWS),
  };
}

export function isAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/** One wallet's attributed Pyre history, newest first. */
export function walletHistory(input: AnalyticsInput, address: string): WalletHistory {
  const p = prepare(input);
  const key = lower(address);
  const fees = p.fees.filter((f) => lower(f.payer) === key);
  const actions = p.actions.filter((a) => lower(a.payer) === key);
  const count = (kind: ActionKind) => actions.filter((a) => a.kind === kind).length;
  const times = [...fees.map((f) => f.timestamp), ...actions.map((a) => a.timestamp ?? 0)].filter(
    (t) => t > 0,
  );
  return {
    address: key,
    batchCleans: fees.length,
    burns: count("burn"),
    sweeps: count("sweep"),
    revokes: count("revoke"),
    feesWei: fees.reduce((sum, f) => sum + f.amountWei, 0n).toString(),
    ethRecoveredWei: sweptEth(actions, input.ethOutByTx).toString(),
    firstSeen: times.length ? Math.min(...times) : null,
    lastSeen: times.length ? Math.max(...times) : null,
    events: toRecentRows(p, fees, actions, input.ethOutByTx, WALLET_EVENT_ROWS),
  };
}
