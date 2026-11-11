import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicClient, WalletClient } from "viem";
import { actionErrorMessage } from "./tx-error.ts";
import {
  payFeeWithWif,
  readWifFeeAmount,
  WIF_FEE_AMOUNT,
  WIF_GATE_ADDRESS,
  WifFeeError,
  wifFeeFallback,
} from "./wif.ts";

const OWNER = "0x00000000000000000000000000000000000000aa" as const;
const HASH = `0x${"11".repeat(32)}` as const;
const WIF = 10n ** 18n;

type Fake = {
  fees?: bigint[];
  balance?: bigint;
  allowance?: bigint;
  receipt?: () => Promise<{ status: "success" | "reverted" }>;
  send?: () => Promise<`0x${string}`>;
};

function clients(f: Fake = {}) {
  const fees = [...(f.fees ?? [WIF_FEE_AMOUNT])];
  const sent: `0x${string}`[] = [];
  const publicClient = {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === "feeAmount") return fees.length > 1 ? fees.shift() : fees[0];
      if (functionName === "balanceOf") return f.balance ?? 1_000n * WIF;
      if (functionName === "allowance") return f.allowance ?? 0n;
      throw new Error(`unexpected read ${functionName}`);
    },
    call: async () => ({ data: "0x" }),
    waitForTransactionReceipt: f.receipt ?? (async () => ({ status: "success" as const })),
  } as unknown as PublicClient;
  const walletClient = {
    sendTransaction: async ({ to }: { to: `0x${string}` }) => {
      sent.push(to);
      return f.send ? f.send() : HASH;
    },
  } as unknown as WalletClient;
  return { publicClient, walletClient, sent };
}

test("payFeeWithWif approves the exact fee then calls the gate", async () => {
  const c = clients();
  const hash = await payFeeWithWif({ ...c, owner: OWNER });
  assert.equal(hash, HASH);
  assert.equal(c.sent.length, 2);
  assert.equal(c.sent[1], WIF_GATE_ADDRESS);
});

test("payFeeWithWif skips approve when allowance already covers the fee", async () => {
  const c = clients({ allowance: WIF_FEE_AMOUNT });
  await payFeeWithWif({ ...c, owner: OWNER });
  assert.deepEqual(c.sent, [WIF_GATE_ADDRESS]);
});

test("a gate fee above the shown fee stops before anything is signed", async () => {
  const c = clients({ fees: [1_000n * WIF], allowance: 2n ** 256n - 1n });
  await assert.rejects(payFeeWithWif({ ...c, owner: OWNER }), (err) => {
    assert.ok(err instanceof WifFeeError);
    assert.equal(wifFeeFallback(err), "stop");
    assert.match(actionErrorMessage(err), /changed to 1000 \$WIF/);
    return true;
  });
  assert.equal(c.sent.length, 0);
});

test("a fee raised during the approve wait stops before payFee", async () => {
  const c = clients({ fees: [WIF_FEE_AMOUNT, 60n * WIF] });
  await assert.rejects(payFeeWithWif({ ...c, owner: OWNER }), WifFeeError);
  assert.equal(c.sent.length, 1, "only the approve was sent");
  assert.notEqual(c.sent[0], WIF_GATE_ADDRESS);
});

test("a lower gate fee is fine", async () => {
  const c = clients({ fees: [10n * WIF], allowance: 10n * WIF });
  await payFeeWithWif({ ...c, owner: OWNER });
  assert.deepEqual(c.sent, [WIF_GATE_ADDRESS]);
});

test("a sent payFee with no receipt never falls back to ETH", async () => {
  const c = clients({
    allowance: WIF_FEE_AMOUNT,
    receipt: async () => {
      throw new Error("timed out waiting for receipt");
    },
  });
  await assert.rejects(payFeeWithWif({ ...c, owner: OWNER }), (err) => {
    assert.equal(wifFeeFallback(err), "stop");
    assert.match((err as Error).message, /sent but not confirmed/);
    return true;
  });
});

test("a mined payFee revert charged nothing, so ETH fallback is allowed", async () => {
  const c = clients({ allowance: WIF_FEE_AMOUNT, receipt: async () => ({ status: "reverted" }) });
  await assert.rejects(payFeeWithWif({ ...c, owner: OWNER }), (err) => {
    assert.equal(wifFeeFallback(err), "eth");
    return true;
  });
});

test("declining in the wallet stops the clean instead of prompting for ETH", async () => {
  const rejected = Object.assign(new Error("User rejected the request."), { code: 4001 });
  const c = clients({
    send: async () => {
      throw rejected;
    },
  });
  await assert.rejects(payFeeWithWif({ ...c, owner: OWNER }), (err) => {
    assert.equal(wifFeeFallback(err), "stop");
    return true;
  });
  const wrapped = new Error("wrapper", {
    cause: { shortMessage: "User denied transaction signature." },
  });
  assert.equal(wifFeeFallback(wrapped), "stop");
});

test("low balance and read failures fall back to ETH", async () => {
  const c = clients({ balance: 1n * WIF });
  await assert.rejects(payFeeWithWif({ ...c, owner: OWNER }), (err) => {
    assert.equal(wifFeeFallback(err), "eth");
    return true;
  });
  assert.equal(wifFeeFallback(new Error("HTTP request failed")), "eth");
});

test("readWifFeeAmount throws instead of guessing the fee", async () => {
  const publicClient = {
    readContract: async () => {
      throw new Error("rpc down");
    },
  } as unknown as PublicClient;
  await assert.rejects(readWifFeeAmount(publicClient), /rpc down/);
});
