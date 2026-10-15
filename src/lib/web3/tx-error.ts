type ErrorRecord = { name?: string; shortMessage?: string; message?: string; code?: number };

const REJECTED =
  /user rejected|user denied|denied transaction|rejected the request|request rejected|cancell?ed/i;

/** Ordered rules: the first match wins, so specific causes sit above generic ones. */
const TX_RULES: Array<[RegExp, string]> = [
  [REJECTED, "Signature declined in wallet"],
  [/insufficient funds|exceeds the balance/i, "Not enough ETH for gas"],
  [
    /chain mismatch|does not match the target chain|unrecognized chain|unsupported chain|wrong network/i,
    "Wallet is not on Robinhood Chain",
  ],
  [
    /nonce too low|nonce has already been used|replacement transaction underpriced/i,
    "Your wallet has a pending transaction. Let it finish, then retry.",
  ],
  [
    /timed? ?out|took too long|deadline exceeded/i,
    "The network took too long to respond. Check your wallet activity before retrying.",
  ],
  [/\b429\b|rate limit|too many requests/i, "The network is busy. Wait a moment and try again."],
  [
    /failed to fetch|fetch failed|network ?error|network request failed|http request failed|load failed/i,
    "Could not reach Robinhood Chain. Check your connection and try again.",
  ],
  [
    /gas required exceeds|intrinsic gas too low|cannot estimate gas/i,
    "This transaction would fail on-chain, so it was not sent.",
  ],
];

/** First line of an error, trimmed to a readable length. */
function firstLine(text: string, max = 140) {
  const line = text.split("\n")[0].trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

export function actionErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Transaction failed";
  const rec = err as ErrorRecord;
  if (rec.name === "SimulationFailed") {
    return (
      rec.message?.replace(/^Pre-sign simulation failed:\s*/i, "") ||
      "This action would fail on-chain — skipped before wallet prompt"
    );
  }
  if (rec.code === 4001) return "Signature declined in wallet";
  const text = rec.shortMessage || rec.message || "Transaction failed";
  for (const [re, message] of TX_RULES) {
    if (re.test(text)) return message;
  }
  if (/did not decrease|allowance is still|operator is still/i.test(text)) {
    return firstLine(text);
  }
  return firstLine(text.replace(/^execution reverted(?::\s*)?/i, "Token rejected the burn"));
}

/** Readable reason a wallet connection did not complete. */
export function connectErrorMessage(err: unknown): string {
  const rec = (err && typeof err === "object" ? err : {}) as ErrorRecord;
  const text = rec.shortMessage || rec.message || "";
  if (rec.code === 4001 || REJECTED.test(text)) return "Connection cancelled in the wallet.";
  if (rec.code === -32002 || /already pending|already processing/i.test(text)) {
    return "Your wallet already has a request open. Check the wallet window.";
  }
  if (/not available|not installed|not found|no provider|provider not/i.test(text)) {
    return "That wallet is not available in this browser. Install it or pick another.";
  }
  if (/failed to fetch|network|timed? ?out/i.test(text)) {
    return "Could not reach the wallet service. Check your connection and try again.";
  }
  return "Could not connect. Try again or pick another wallet.";
}

/** Readable reason for a failed wallet scan. */
export function scanErrorMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (/user rejected|denied|rejected the request/i.test(text)) {
    return "Switch your wallet to Robinhood Chain to scan it.";
  }
  if (/failed to fetch|network ?error|timeout|timed out|load failed|429|5\d\d/i.test(text)) {
    return "Could not reach the block explorer. Check your connection and try again.";
  }
  return text || "The scan did not finish. Try again.";
}
