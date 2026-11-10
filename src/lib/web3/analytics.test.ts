import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ATTRIBUTION_BLOCKS,
  type AnalyticsInput,
  isAddress,
  LINK_REMOVED,
  safeTokenText,
  walletHistory,
  attributeActions,
  blockRanges,
  buildSnapshot,
  classifyTransfer,
  dailySeries,
  hourlySeries,
  isRevoke,
  type ActionEvent,
  type FeeEvent,
} from "./analytics.ts";
import { DEAD_ADDRESS, UNISWAP_SWAP_ROUTER_02 } from "./chain.ts";

const LIVE = "0xcB157e4D7035F9a38b9e0B92b89E544e378c1490";
const ALICE = "0x00000000000000000000000000000000000A11CE";
const BOB = "0x0000000000000000000000000000000000000B0B";
const SPAM = "0x5PAM000000000000000000000000000000000001";
const AAPL = "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9";
const DAY = 86_400;
const NOW = Date.UTC(2026, 10, 7, 12) / 1000;

const fee = (
  payer: string,
  block: number,
  timestamp = NOW,
  txHash = `0xfee${block}`,
): FeeEvent => ({
  contract: LIVE,
  payer,
  amountWei: 500_000_000_000_000n,
  block,
  timestamp,
  txHash,
});

const action = (
  kind: ActionEvent["kind"],
  payer: string,
  block: number,
  token = SPAM,
  logIndex = 0,
): ActionEvent => ({
  kind,
  payer,
  token,
  block,
  timestamp: NOW,
  txHash: `0xact${block}`,
  logIndex,
});

test("blockRanges splits a span into inclusive chunks under the RPC cap", () => {
  assert.deepEqual(blockRanges(0, 24, 10), [
    { from: 0, to: 9 },
    { from: 10, to: 19 },
    { from: 20, to: 24 },
  ]);
  assert.deepEqual(blockRanges(5, 5, 10), [{ from: 5, to: 5 }]);
  assert.deepEqual(blockRanges(6, 5, 10), []);
});

test("classifyTransfer: dead address is a burn, a SwapRouter02 tx is a sweep", () => {
  assert.equal(classifyTransfer(DEAD_ADDRESS.toLowerCase(), null), "burn");
  assert.equal(classifyTransfer("0x0000000000000000000000000000000000000000", null), "burn");
  assert.equal(classifyTransfer("0x0000000000000000000000000000000000000001", null), "burn");
  assert.equal(classifyTransfer(BOB, UNISWAP_SWAP_ROUTER_02.toLowerCase()), "sweep");
  assert.equal(classifyTransfer(BOB, BOB), null);
  assert.equal(classifyTransfer(BOB, null), null);
});

test("isRevoke only accepts a zero allowance or a cleared operator", () => {
  assert.equal(isRevoke(0n), true);
  assert.equal(isRevoke(false), true);
  assert.equal(isRevoke(1n), false);
  assert.equal(isRevoke(true), false);
});

test("attributeActions keeps a payer's actions inside the window only", () => {
  const fees = [fee(ALICE, 1_000)];
  const kept = attributeActions(fees, [
    action("burn", ALICE, 999),
    action("burn", ALICE, 1_000),
    action("burn", ALICE.toLowerCase(), 1_000 + ATTRIBUTION_BLOCKS),
    action("burn", ALICE, 1_001 + ATTRIBUTION_BLOCKS),
    action("burn", BOB, 1_500),
  ]);
  assert.deepEqual(
    kept.map((a) => a.block),
    [1_000, 1_000 + ATTRIBUTION_BLOCKS],
  );
});

test("attributeActions drops the same log seen through two overlapping windows", () => {
  const fees = [fee(ALICE, 1_000), fee(ALICE, 1_100)];
  const burn = action("burn", ALICE, 1_200);
  assert.equal(attributeActions(fees, [burn, { ...burn }]).length, 1);
});

test("dailySeries zero-fills the last N days and counts distinct wallets", () => {
  const series = dailySeries(
    [fee(ALICE, 1, NOW), fee(ALICE, 2, NOW), fee(BOB, 3, NOW - DAY), fee(BOB, 4, NOW - 40 * DAY)],
    NOW,
    3,
  );
  assert.deepEqual(series, [
    { day: "2026-11-05", cleans: 0, wallets: 0 },
    { day: "2026-11-06", cleans: 1, wallets: 1 },
    { day: "2026-11-07", cleans: 2, wallets: 1 },
  ]);
});

test("buildSnapshot totals, token table and recent feed", () => {
  const snap = buildSnapshot({
    fees: [fee(ALICE, 1_000), fee(BOB, 2_000)],
    actions: [
      action("burn", ALICE, 1_001, SPAM, 0),
      action("sweep", ALICE, 1_002, AAPL, 0),
      action("revoke", ALICE, 1_003, SPAM, 0),
      action("burn", BOB, 2_001, SPAM, 0),
      action("burn", BOB, 9_999_999, SPAM, 0), // outside any window
    ],
    tokens: new Map([
      [SPAM.toLowerCase(), { symbol: "CLAIM", name: "Claim rewards", stock: false }],
      [AAPL.toLowerCase(), { symbol: "AAPL", name: "Apple", stock: true }],
    ]),
    ethOutByTx: new Map(),
    contracts: [{ address: LIVE, label: "PyreBatch" }],
    headBlock: 3_000,
    nowMs: NOW * 1000,
  });

  assert.deepEqual(snap.totals.all, {
    wallets: 2,
    newWallets: 2,
    returningWallets: 0,
    batchCleans: 2,
    burns: 2,
    sweeps: 1,
    revokes: 1,
    actionsPerClean: 2,
    tokens: 2,
    stockTokensSwept: 1,
    feesWei: "1000000000000000",
    ethRecoveredWei: "0",
  });
  assert.deepEqual(snap.contracts, [
    { address: LIVE, label: "PyreBatch", cleans: 2, feesWei: "1000000000000000" },
  ]);
  assert.deepEqual(
    snap.tokens.map((t) => [t.symbol, t.burns, t.sweeps, t.wallets, t.stock]),
    [
      ["CLAIM", 2, 0, 2, false],
      ["AAPL", 0, 1, 1, true],
    ],
  );
  assert.equal(snap.recent[0].kind, "burn");
  assert.equal(snap.recent[0].wallet, BOB);
  assert.equal(snap.recent.at(-1)?.kind, "clean");
  assert.equal(snap.daily.at(-1)?.cleans, 2);
});

test("buildSnapshot with no events is all zeros, not an error", () => {
  const snap = buildSnapshot({
    fees: [],
    actions: [],
    tokens: new Map(),
    ethOutByTx: new Map(),
    contracts: [{ address: LIVE, label: "PyreBatch" }],
    headBlock: 1,
    nowMs: NOW * 1000,
  });
  assert.equal(snap.totals.all.wallets, 0);
  assert.equal(snap.totals["24h"].batchCleans, 0);
  assert.equal(snap.hourly.length, 24);
  assert.equal(snap.tokens.length, 0);
  assert.equal(snap.recent.length, 0);
  assert.equal(snap.daily.length, 30);
});

test("hourlySeries buckets the last 24 UTC hours", () => {
  const series = hourlySeries(
    [fee(ALICE, 1, NOW), fee(BOB, 2, NOW - 3_600), fee(BOB, 3, NOW - 25 * 3_600)],
    NOW,
  );
  assert.equal(series.length, 24);
  assert.deepEqual(series.at(-1), { day: "2026-11-07T12", cleans: 1, wallets: 1 });
  assert.deepEqual(series.at(-2), { day: "2026-11-07T11", cleans: 1, wallets: 1 });
  assert.equal(
    series.reduce((n, r) => n + r.cleans, 0),
    2,
  );
});

test("totals per range only count events inside the range", () => {
  const snap = buildSnapshot({
    fees: [fee(ALICE, 1_000, NOW - 2 * DAY), fee(BOB, 2_000, NOW - 3_600)],
    actions: [{ ...action("burn", ALICE, 1_001), timestamp: NOW - 2 * DAY }],
    tokens: new Map(),
    ethOutByTx: new Map(),
    contracts: [{ address: LIVE, label: "PyreBatch" }],
    headBlock: 3_000,
    nowMs: NOW * 1000,
  });
  assert.equal(snap.totals["24h"].batchCleans, 1);
  assert.equal(snap.totals["24h"].burns, 0);
  assert.equal(snap.totals["7d"].batchCleans, 2);
  assert.equal(snap.totals["7d"].burns, 1);
  assert.equal(snap.totals.all.wallets, 2);
});

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const ODD_SPENDER = "0x00000000000000000000000000000000000000AA";

const baseInput = (overrides: Partial<AnalyticsInput>): AnalyticsInput => ({
  fees: [],
  actions: [],
  tokens: new Map(),
  ethOutByTx: new Map(),
  contracts: [{ address: LIVE, label: "PyreBatch" }],
  headBlock: 10_000,
  nowMs: NOW * 1000,
  ...overrides,
});

test("ETH recovered counts each sweep transaction once", () => {
  const sweepA = action("sweep", ALICE, 1_001, AAPL, 0);
  const sweepB = { ...action("sweep", ALICE, 1_001, SPAM, 1) }; // same tx as sweepA
  const sweepC = action("sweep", ALICE, 1_002, SPAM, 0);
  const snap = buildSnapshot(
    baseInput({
      fees: [fee(ALICE, 1_000)],
      actions: [sweepA, sweepB, sweepC],
      ethOutByTx: new Map([
        ["0xact1001", 300n],
        ["0xact1002", 50n],
      ]),
    }),
  );
  assert.equal(snap.totals.all.ethRecoveredWei, "350");
  assert.equal(snap.recent.find((r) => r.txHash === "0xact1002")?.amountWei, "50");
});

test("new and returning wallets per range", () => {
  const snap = buildSnapshot(
    baseInput({
      fees: [fee(ALICE, 1, NOW - 10 * DAY), fee(ALICE, 2, NOW - 3_600), fee(BOB, 3, NOW - 3_600)],
    }),
  );
  assert.equal(snap.totals["24h"].wallets, 2);
  assert.equal(snap.totals["24h"].newWallets, 1); // Bob; Alice first cleaned 10 days ago
  assert.equal(snap.totals["24h"].returningWallets, 1); // Alice cleaned twice
  assert.equal(snap.totals.all.newWallets, 2);
});

test("revokes are grouped by spender with known labels", () => {
  const revoke = (block: number, spender: string, payer = ALICE): ActionEvent => ({
    ...action("revoke", payer, block),
    spender,
  });
  const snap = buildSnapshot(
    baseInput({
      fees: [fee(ALICE, 1_000), fee(BOB, 1_000)],
      actions: [
        revoke(1_001, PERMIT2.toLowerCase()),
        revoke(1_002, PERMIT2.toLowerCase(), BOB),
        revoke(1_003, ODD_SPENDER.toLowerCase()),
      ],
    }),
  );
  assert.deepEqual(snap.spenders, [
    { address: PERMIT2.toLowerCase(), label: "Permit2", revokes: 2, wallets: 2 },
    { address: ODD_SPENDER.toLowerCase(), label: null, revokes: 1, wallets: 1 },
  ]);
  assert.equal(snap.recent[0].spender?.address, ODD_SPENDER.toLowerCase());
});

test("watchlist keeps burned non-Stock tokens, most wallets first", () => {
  const OTHER = "0x0000000000000000000000000000000000000BAD";
  const snap = buildSnapshot(
    baseInput({
      fees: [fee(ALICE, 1_000), fee(BOB, 1_000)],
      actions: [
        { ...action("burn", ALICE, 1_001, OTHER), timestamp: NOW - 50 },
        action("burn", ALICE, 1_002, SPAM),
        { ...action("burn", BOB, 1_003, SPAM), timestamp: NOW - 100 },
        action("sweep", ALICE, 1_004, AAPL),
      ],
      tokens: new Map([[AAPL.toLowerCase(), { symbol: "AAPL", name: "Apple", stock: true }]]),
    }),
  );
  assert.deepEqual(
    snap.watchlist.map((w) => [w.address, w.wallets, w.burns, w.firstSeen]),
    [
      [SPAM, 2, 2, NOW - 100],
      [OTHER, 1, 1, NOW - 50],
    ],
  );
});

test("walletHistory returns only that wallet's attributed events", () => {
  const input = baseInput({
    fees: [fee(ALICE, 1_000, NOW - 100), fee(BOB, 2_000)],
    actions: [
      action("burn", ALICE, 1_001),
      action("sweep", ALICE, 1_002, AAPL),
      action("burn", ALICE, 9_999_999), // outside the window
      action("burn", BOB, 2_001),
    ],
    ethOutByTx: new Map([["0xact1002", 70n]]),
  });
  const h = walletHistory(input, ALICE.toUpperCase().replace("0X", "0x"));
  assert.equal(h.address, ALICE.toLowerCase());
  assert.equal(h.batchCleans, 1);
  assert.equal(h.burns, 1);
  assert.equal(h.sweeps, 1);
  assert.equal(h.ethRecoveredWei, "70");
  assert.equal(h.feesWei, "500000000000000");
  assert.equal(h.events.length, 3);
  assert.equal(h.firstSeen, NOW - 100);

  const empty = walletHistory(input, "0x0000000000000000000000000000000000000001");
  assert.equal(empty.batchCleans, 0);
  assert.equal(empty.events.length, 0);
  assert.equal(empty.firstSeen, null);
});

test("isAddress accepts only 0x + 40 hex characters", () => {
  assert.equal(isAddress(ALICE), true);
  assert.equal(isAddress("0x123"), false);
  assert.equal(isAddress(`${ALICE}00`), false);
  assert.equal(isAddress("0xZZ00000000000000000000000000000000000000"), false);
});

test("safeTokenText removes links scammers put in token names", () => {
  const cases: [string, string][] = [
    ["Visit claim-rewards.xyz to claim", `Visit ${LINK_REMOVED} to claim`],
    ["https://evil.example/airdrop", LINK_REMOVED],
    ["www.free-usdc.com", LINK_REMOVED],
    ["Claim at rewards[.]io now", `Claim at ${LINK_REMOVED} now`],
    ["airdrop(.)finance", LINK_REMOVED],
    ["join t.me/scamgroup", `join ${LINK_REMOVED}`],
    ["claim-usdc dot com", LINK_REMOVED],
    ["ＣＬＡＩＭ．ＸＹＺ", LINK_REMOVED], // full-width look-alikes
  ];
  for (const [input, expected] of cases) {
    const out = safeTokenText(input, 64);
    assert.equal(out.text, expected, input);
    assert.equal(out.hadLink, true, input);
  }
});

test("safeTokenText leaves normal names alone", () => {
  for (const name of [
    "Bad Guy",
    "Apple • Robinhood Token",
    "Wrapped ETH 2.0",
    "USD.e",
    "BONK HOOD",
  ]) {
    const out = safeTokenText(name, 64);
    assert.equal(out.text, name, name);
    assert.equal(out.hadLink, false, name);
  }
});

test("safeTokenText strips invisible and direction-flipping characters", () => {
  const out = safeTokenText("U\u200bS\u200dD\u202eC\u0000 \u2066Coin", 64);
  assert.equal(out.text, "USDC Coin");
  assert.equal(safeTokenText("\u200b\u200b", 64).text, null);
  assert.equal(safeTokenText(null, 64).text, null);
});

test("safeTokenText caps length after cleaning", () => {
  const out = safeTokenText("A".repeat(100), 16);
  assert.equal(out.text?.length, 16);
  assert.ok(out.text?.endsWith("…"));
});

test("watchlist flags tokens whose name had a link", () => {
  const snap = buildSnapshot(
    baseInput({
      fees: [fee(ALICE, 1_000)],
      actions: [action("burn", ALICE, 1_001)],
      tokens: new Map([
        [
          SPAM.toLowerCase(),
          { symbol: "CLAIM", name: `Visit ${LINK_REMOVED}`, stock: false, hadLink: true },
        ],
      ]),
    }),
  );
  assert.equal(snap.watchlist[0].hadLink, true);
});
