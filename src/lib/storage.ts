/**
 * Safe JSON helpers for browser storage.
 *
 * Every read and write is guarded: SSR (no window), private mode, quota
 * errors and corrupt JSON all fall back quietly instead of throwing.
 */

type Area = "local" | "session";

function store(area: Area): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return area === "session" ? window.sessionStorage : window.localStorage;
}

export function readJson<T extends object>(key: string, fallback: T, area: Area = "local"): T {
  try {
    const raw = store(area)?.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, area: Area = "local"): void {
  try {
    store(area)?.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode — ignore
  }
}

export function removeKey(key: string, area: Area = "local"): void {
  try {
    store(area)?.removeItem(key);
  } catch {
    // ignore
  }
}
