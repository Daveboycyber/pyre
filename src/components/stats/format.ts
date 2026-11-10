import { formatEther } from "viem";
import type { AnalyticsSnapshot, RecentRow, WalletHistory } from "@/lib/web3/analytics";

/** An API error that keeps its HTTP status, so callers can skip retries on 429. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const TOO_MANY = "Too many requests from your connection. Wait a minute and try again.";

/** Retry transient failures, never a rate limit or a bad request. */
export function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && (error.status === 429 || error.status === 400)) return false;
  return failureCount < 2;
}

export async function fetchAnalytics(): Promise<AnalyticsSnapshot> {
  const res = await fetch("/api/analytics", { headers: { accept: "application/json" } });
  if (res.status === 429) throw new ApiError(429, TOO_MANY);
  if (!res.ok) throw new ApiError(res.status, `Stats request failed (${res.status})`);
  return res.json() as Promise<AnalyticsSnapshot>;
}

export async function fetchWalletHistory(address: string): Promise<WalletHistory> {
  const res = await fetch(`/api/analytics/wallet?address=${encodeURIComponent(address)}`, {
    headers: { accept: "application/json" },
  });
  if (res.status === 400) throw new ApiError(400, "That is not a valid 0x wallet address.");
  if (res.status === 429) throw new ApiError(429, TOO_MANY);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      "Could not read Robinhood Chain right now. Try again in a moment.",
    );
  }
  return res.json() as Promise<WalletHistory>;
}

/** "0.0005"; tiny non-zero amounts show as "<0.0001". */
export function ethAmount(wei: string | bigint) {
  const value = BigInt(wei);
  if (value === 0n) return "0";
  if (value < 100_000_000_000_000n) return "<0.0001";
  const [whole, frac = ""] = formatEther(value).split(".");
  const trimmed = frac.slice(0, 4).replace(/0+$/, "");
  return `${Number(whole).toLocaleString("en-US")}${trimmed ? `.${trimmed}` : ""}`;
}

export function formatEth(wei: string | bigint) {
  return `${ethAmount(wei)} ETH`;
}

export function formatDate(timestampSec: number | null) {
  if (!timestampSec) return "—";
  return new Date(timestampSec * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");

export function formatCount(n: number) {
  return n < 10_000 ? full.format(n) : compact.format(n);
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function timeAgo(timestampSec: number | null, nowMs = Date.now()) {
  if (!timestampSec) return "";
  const s = Math.max(0, Math.round(nowMs / 1000 - timestampSec));
  if (s < 60) return "just now";
  if (s < 3_600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3_600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

export function shortDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-11-07T12" → "12:00" (UTC). */
export function shortHour(hour: string) {
  return `${hour.slice(11, 13)}:00`;
}

export const RANGE_LABEL = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  all: "All time",
} as const;

export const ACTION_LABEL: Record<RecentRow["kind"], string> = {
  clean: "Batch clean",
  burn: "Burned",
  sweep: "Swept",
  revoke: "Revoked",
};
