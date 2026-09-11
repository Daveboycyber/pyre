export function actionErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Transaction failed";
  const rec = err as { shortMessage?: string; message?: string };
  const text = rec.shortMessage || rec.message || "Transaction failed";
  if (/user rejected|denied|rejected the request/i.test(text)) {
    return "Signature declined in wallet";
  }
  if (/insufficient funds/i.test(text)) return "Not enough ETH for gas";
  if (/chain|network/i.test(text)) return "Wallet is not on Robinhood Chain";
  return text.replace(/^execution reverted(?::\s*)?/i, "Token rejected the burn");
}
