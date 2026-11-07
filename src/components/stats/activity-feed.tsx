import type { ReactNode } from "react";
import { ExternalLink, type LucideIcon } from "lucide-react";
import type { RecentRow } from "@/lib/web3/analytics";
import { ACTION_LABEL, formatEth, shortAddress, timeAgo } from "@/components/stats/format";
import { explorerTxUrl } from "@/lib/web3/blockscout";
import { IconBadge } from "@/components/stats/icon-badge";

function Detail({ row }: { readonly row: RecentRow }) {
  if (row.kind === "clean") {
    return (
      <span className="text-muted-foreground">
        Fee {row.amountWei ? formatEth(row.amountWei) : "paid"}
      </span>
    );
  }
  const token = row.token ? (row.token.symbol ?? shortAddress(row.token.address)) : "Token";
  return (
    <span>
      <span className="font-medium">{token}</span>
      {row.token?.stock ? <span className="text-muted-foreground"> · Stock Token</span> : null}
      {row.kind === "sweep" && row.amountWei ? (
        <span className="text-muted-foreground"> → {formatEth(row.amountWei)}</span>
      ) : null}
      {row.kind === "revoke" && row.spender ? (
        <span className="text-muted-foreground">
          {" "}
          from {row.spender.label ?? shortAddress(row.spender.address)}
        </span>
      ) : null}
    </span>
  );
}

/** Attributed on-chain events, newest first, each linked to its tx. */
export function ActivityFeed({
  recent,
  title = "Live activity",
  showWallet = true,
  empty = "No batch cleans on-chain yet.",
  live = true,
  icon,
}: {
  readonly recent: RecentRow[];
  readonly title?: ReactNode;
  readonly showWallet?: boolean;
  readonly empty?: string;
  readonly live?: boolean;
  readonly icon?: LucideIcon;
}) {
  return (
    <div className="rounded-[28px] bg-black p-6 sm:p-8">
      <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
        {live ? (
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full rounded-full bg-primary opacity-70 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
        ) : null}
        {icon ? <IconBadge icon={icon} /> : null}
        {title}
      </h2>

      {recent.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 font-semibold">Action</th>
                <th className="pb-4 font-semibold">Detail</th>
                {showWallet ? <th className="pb-4 font-semibold">Wallet</th> : null}
                <th className="pb-4 text-right font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr
                  key={`${r.txHash}-${r.kind}-${r.token?.address ?? ""}-${r.spender?.address ?? ""}`}
                >
                  <td className="py-3 pr-4">
                    <span
                      className={
                        r.kind === "clean"
                          ? "inline-block rounded-xl bg-primary px-3 py-2 text-xs font-semibold whitespace-nowrap text-primary-foreground"
                          : "inline-block rounded-xl bg-card px-3 py-2 text-xs font-semibold whitespace-nowrap"
                      }
                    >
                      {ACTION_LABEL[r.kind]}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Detail row={r} />
                  </td>
                  {showWallet ? (
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {shortAddress(r.wallet)}
                    </td>
                  ) : null}
                  <td className="py-3 text-right">
                    <a
                      href={explorerTxUrl(r.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground tabular-nums hover:text-primary"
                    >
                      {timeAgo(r.timestamp)}
                      <ExternalLink className="size-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
