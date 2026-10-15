import assert from "node:assert/strict";
import { test } from "node:test";
import { actionErrorMessage, connectErrorMessage, scanErrorMessage } from "./tx-error.ts";
import { SimulationFailed } from "./execute.ts";

test("maps wallet rejection", () => {
  assert.equal(
    actionErrorMessage({ shortMessage: "User rejected the request." }),
    "Signature declined in wallet",
  );
});

test("maps reverted burns", () => {
  assert.match(
    actionErrorMessage({ shortMessage: "execution reverted: transfer failed" }),
    /Token rejected the burn/,
  );
});

test("SimulationFailed is identifiable", () => {
  const err = new SimulationFailed("No burn path simulated successfully: boom");
  assert.equal(err.name, "SimulationFailed");
  assert.match(err.message, /No burn path/);
  assert.match(actionErrorMessage(err), /No burn path|boom|Simulation/i);
});

test("scan errors read as plain language", () => {
  assert.match(scanErrorMessage(new Error("Failed to fetch")), /block explorer/);
  assert.match(scanErrorMessage(new Error("HTTP 503")), /block explorer/);
  assert.match(scanErrorMessage(new Error("User rejected the request.")), /Robinhood Chain/);
  assert.equal(scanErrorMessage(new Error("boom")), "boom");
  assert.match(scanErrorMessage(undefined), /did not finish/);
});

test("network trouble is not blamed on the wrong chain", () => {
  assert.match(
    actionErrorMessage({ shortMessage: "HTTP request failed. Network error" }),
    /Could not reach Robinhood Chain/,
  );
  assert.match(actionErrorMessage({ message: "The request timed out." }), /took too long/);
  assert.match(actionErrorMessage({ message: "429 Too Many Requests" }), /busy/);
});

test("maps chain mismatch, nonce, gas and wallet codes", () => {
  assert.equal(
    actionErrorMessage({
      shortMessage: "The current chain of the wallet (id: 1) does not match the target chain",
    }),
    "Wallet is not on Robinhood Chain",
  );
  assert.match(actionErrorMessage({ message: "nonce too low" }), /pending transaction/);
  assert.match(actionErrorMessage({ message: "gas required exceeds allowance" }), /would fail/);
  assert.equal(actionErrorMessage({ code: 4001, message: "x" }), "Signature declined in wallet");
  assert.equal(
    actionErrorMessage({ message: "Not enough ETH: insufficient funds for gas" }),
    "Not enough ETH for gas",
  );
});

test("long unknown errors are trimmed to one line", () => {
  const msg = actionErrorMessage({ message: `${"x".repeat(300)}\nstack details` });
  assert.ok(msg.length <= 140);
  assert.ok(!msg.includes("\n"));
});

test("connect errors read as plain language", () => {
  assert.match(connectErrorMessage({ message: "User rejected the request." }), /cancelled/);
  assert.match(connectErrorMessage({ code: -32002, message: "x" }), /already has a request/);
  assert.match(connectErrorMessage(new Error("Connector not found")), /not available/);
  assert.match(connectErrorMessage(new Error("weird internal thing")), /Could not connect/);
});
