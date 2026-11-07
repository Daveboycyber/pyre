import { Activity, Coins, History, Info, ScanSearch, ShieldAlert, ShieldCheck } from "lucide-react";

/** Section heading icons. Headings only, to keep the page calm. */
export const SECTION_ICON = {
  summary: Activity,
  lookup: ScanSearch,
  history: History,
  tokens: Coins,
  watchlist: ShieldAlert,
  spenders: ShieldCheck,
  method: Info,
} as const;
