import { ArrowLeftRight, Shield, ShieldAlert } from "lucide-react";
import type { Mode } from "@/lib/web3/types";

export const MODES: { id: Mode; label: string; icon: typeof Shield }[] = [
  { id: "safe", label: "Safe", icon: Shield },
  { id: "sweep", label: "Sweep", icon: ArrowLeftRight },
  { id: "review", label: "Review", icon: ShieldAlert },
];

export const MODE_HINTS: Record<Mode, string> = {
  safe: "Safe mode burns spam and revokes leftovers. It will not sweep or touch Stock Tokens.",
  sweep:
    "Sweep sells spam with a real ETH route, takes 1.25%, and burns the rest. Dust Stock Tokens swap only when the quote clears gas plus the batch fee. They are never burned.",
  review:
    "Review lets you tick extra tokens and NFTs. Locked holdings cannot be selected. Burns cannot be undone.",
};
