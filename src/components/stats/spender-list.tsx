import { ExternalLink, ShieldCheck } from "lucide-react";
import type { SpenderRow } from "@/lib/web3/analytics";
import { shortAddress } from "@/components/stats/format";
import { explorerAddressUrl } from "@/lib/web3/blockscout";
import { IconBadge } from "@/components/stats/icon-badge";
import { SECTION_ICON } from "@/components/stats/icons";

/** Which contracts lost access when Pyre users revoked approvals. */
export function SpenderList({ rows }: { readonly rows: SpenderRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.revokes));
  return (
    <div className="flex flex-col rounded-[28px] bg-primary/[0.07] p-6 shadow-[var(--shadow-border)] sm:p-8">
      <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
        <IconBadge icon={SECTION_ICON.spenders} />
        Approvals revoked
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Contracts that lost access to Pyre users&apos; tokens, by number of revokes.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No approvals revoked in a batch yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {rows.map((s) => (
            <li key={s.address}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <a
                  href={explorerAddressUrl(s.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-w-0 items-center gap-2"
                >
                  <ShieldCheck
                    className={
                      s.label
                        ? "size-4 shrink-0 text-primary"
                        : "size-4 shrink-0 text-muted-foreground"
                    }
                    aria-hidden="true"
                  />
                  <span className="truncate font-semibold group-hover:text-primary">
                    {s.label ?? shortAddress(s.address)}
                  </span>
                  {s.label ? null : (
                    <span className="shrink-0 text-xs text-muted-foreground">Unknown contract</span>
                  )}
                  <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">{s.revokes}</span> · {s.wallets}{" "}
                  {s.wallets === 1 ? "wallet" : "wallets"}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (s.revokes / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
