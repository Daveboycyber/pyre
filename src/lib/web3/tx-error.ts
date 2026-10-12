export function actionErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Transaction failed";
  const rec = err as { name?: string; shortMessage?: string; message?: string };
  if (rec.name === "SimulationFailed") {
    return (
      rec.message?.replace(/^Pre-sign simulation failed:\s*/i, "") ||
      "This action would fail on-chain — skipped before wallet prompt"
    );
  }
  const text = rec.shortMessage || rec.message || "Transaction failed";
  if (/user rejected|denied|rejected the request/i.test(text)) {
    return "Signature declined in wallet";
  }
  if (/insufficient funds/i.test(text)) return "Not enough ETH for gas";
  if (/chain|network/i.test(text)) return "Wallet is not on Robinhood Chain";
  if (/did not decrease|allowance is still|operator is still/i.test(text)) {
    return text;
  }
  return text.replace(/^execution reverted(?::\s*)?/i, "Token rejected the burn");
}
