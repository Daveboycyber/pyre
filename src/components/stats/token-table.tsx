import { useState } from "react";
import { ArrowDownWideNarrow, ExternalLink } from "lucide-react";
import type { TokenRow } from "@/lib/web3/analytics";
import { shortAddress } from "@/components/stats/format";
import { explorerAddressUrl } from "@/lib/web3/blockscout";
import { IconBadge } from "@/components/stats/icon-badge";
import { SECTION_ICON } from "@/components/stats/icons";

const SORTS = [
  { key: "total", label: "Most cleaned" },
  { key: "burns", label: "Burned" },
  { key: "sweeps", label: "Swept" },
  { key: "wallets", label: "Wallets" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

const sortValue = (t: TokenRow, key: SortKey) => (key === "total" ? t.burns + t.sweeps : t[key]);

function TokenAvatar({ token }: { readonly token: TokenRow }) {
  const text = (token.symbol ?? token.address.slice(2)).slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={
        token.stock
          ? "grid size-10 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
          : "grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary"
      }
    >
      {text}
    </span>
  );
}

/** Tokens burned or swept in Pyre batches, all time, sortable. */
export function TokenTable({
  tokens,
  wallets,
}: {
  readonly tokens: TokenRow[];
  readonly wallets: number;
}) {
  const [sortIndex, setSortIndex] = useState(0);
  const sort = SORTS[sortIndex];
  const rows = [...tokens].sort((a, b) => sortValue(b, sort.key) - sortValue(a, sort.key));

  return (
    <div className="rounded-[28px] bg-primary/[0.07] p-6 shadow-[var(--shadow-border)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <IconBadge icon={SECTION_ICON.tokens} />
            <span>
              {tokens.length} {tokens.length === 1 ? "token" : "tokens"} cleaned with Pyre
            </span>
          </h2>
          <p className="mt-1 flex items-center gap-2 pl-[52px] text-sm text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {wallets} {wallets === 1 ? "wallet" : "wallets"}, all time
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSortIndex((i) => (i + 1) % SORTS.length)}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/25"
        >
          Sort: {sort.label}
          <ArrowDownWideNarrow className="size-4" />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No tokens burned or swept in a batch yet. They show up here as soon as one lands.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-sm">
                <th className="pb-4 font-semibold">Token</th>
                <th className="pb-4 font-semibold">Type</th>
                <th className="pb-4 text-right font-semibold">Burned</th>
                <th className="pb-4 text-right font-semibold">Swept</th>
                <th className="pb-4 text-right font-semibold">Wallets</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.address}>
                  <td className="py-3 pr-4">
                    <a
                      href={explorerAddressUrl(t.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3"
                    >
                      <TokenAvatar token={t} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-semibold group-hover:text-primary">
                          {t.symbol ?? shortAddress(t.address)}
                          <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                        {t.name && t.name !== t.symbol ? (
                          <span className="block max-w-[14rem] truncate text-xs text-muted-foreground">
                            {t.name}
                          </span>
                        ) : null}
                      </span>
                    </a>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className={
                          t.stock
                            ? "size-1.5 rounded-full bg-primary"
                            : "size-1.5 rounded-full bg-foreground/60"
                        }
                      />
                      {t.stock ? "Stock Token" : "Token"}
                    </span>
                  </td>
                  <td className="py-3 text-right">{t.burns}</td>
                  <td className="py-3 text-right">{t.sweeps}</td>
                  <td className="py-3 text-right">{t.wallets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
