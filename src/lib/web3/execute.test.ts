import assert from "node:assert/strict";
import { test } from "node:test";
import { actionErrorMessage } from "./tx-error.ts";
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
