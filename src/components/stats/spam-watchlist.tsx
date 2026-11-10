import { Copy, ExternalLink, Link2Off } from "lucide-react";
import type { WatchRow } from "@/lib/web3/analytics";
import { formatDate, shortAddress } from "@/components/stats/format";
import { notify } from "@/lib/notify";
import { explorerAddressUrl } from "@/lib/web3/blockscout";
import { IconBadge } from "@/components/stats/icon-badge";
import { SECTION_ICON } from "@/components/stats/icons";

async function copyAddress(address: string) {
  try {
    await navigator.clipboard.writeText(address);
    notify.success("Contract copied", { description: shortAddress(address) });
  } catch {
    notify.error("Could not copy", { description: "Select the address and copy it manually." });
  }
}

/** Spam that Pyre users burned most, so others know what to ignore. */
export function SpamWatchlist({ rows }: { readonly rows: WatchRow[] }) {
  return (
    <div className="flex flex-col rounded-[28px] bg-black p-6 sm:p-8">
      <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
        <IconBadge icon={SECTION_ICON.watchlist} />
        Spam watchlist
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tokens Pyre users burned, most wallets first. If one of these shows up in your wallet, do
        not interact with it.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No spam burned in a batch yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-white/10">
          {rows.map((t) => (
            <li key={t.address} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {t.symbol ?? "Unnamed token"}
                  {t.name && t.name !== t.symbol ? (
                    <span className="font-normal text-muted-foreground"> · {t.name}</span>
                  ) : null}
                </p>
                {t.hadLink ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                    <Link2Off className="size-3.5" aria-hidden="true" />
                    Its name pushed a website. Link removed, do not visit it.
                  </p>
                ) : null}
                <p className="mt-0.5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  {shortAddress(t.address)}
                  <button
                    type="button"
                    onClick={() => copyAddress(t.address)}
                    aria-label={`Copy ${t.symbol ?? "token"} contract address`}
                    className="hover:text-primary"
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <a
                    href={explorerAddressUrl(t.address)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${t.symbol ?? "token"} in the explorer`}
                    className="hover:text-primary"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                <p>
                  <span className="text-sm font-semibold text-foreground">{t.wallets}</span>{" "}
                  {t.wallets === 1 ? "wallet" : "wallets"}
                </p>
                <p>First burned {formatDate(t.firstSeen)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
