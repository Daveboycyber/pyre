import assert from "node:assert/strict";
import { test } from "node:test";
import { actionErrorMessage } from "./tx-error.ts";

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
