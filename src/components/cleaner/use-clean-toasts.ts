import { useEffect, useRef } from "react";
import { cleanOutcome, failureSummary, succeededCount } from "@/components/cleaner/outcome";
import { notify } from "@/lib/notify";
import { formatFeeEth } from "@/lib/web3/fees";
import type { LastClean } from "@/lib/web3/types";

/** One toast per finished clean, matching the result panel's outcome. */
export function useCleanToasts(result: LastClean | null, demo: boolean) {
  const shown = useRef<LastClean | null>(null);

  useEffect(() => {
    if (!result || shown.current === result) return;
    shown.current = result;
    const ok = succeededCount(result);
    const prefix = demo ? "Demo · " : "";
    const outcome = cleanOutcome(result);

    if (outcome === "success") {
      notify.success(`${prefix}Wallet cleaned`, {
        description:
          `${ok} action${ok === 1 ? "" : "s"} confirmed.` +
          (result.recoveredWei > 0n ? ` ${formatFeeEth(result.recoveredWei)} recovered.` : ""),
      });
    } else if (outcome === "partial") {
      notify.warning(`${prefix}${ok} of ${ok + result.failed} done`, {
        description: `${result.failed} line${result.failed === 1 ? "" : "s"} did not go through. See the list to retry.`,
      });
    } else {
      notify.error(`${prefix}Nothing was cleaned`, { description: failureSummary(result) });
    }
  }, [result, demo]);
}
