import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Notice } from "@/components/cleaner/notice";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ActivityFeed } from "@/components/stats/activity-feed";
import { ContractCard } from "@/components/stats/contract-card";
import { DailyChart } from "@/components/stats/daily-chart";
import { fetchAnalytics, shortHour, shouldRetry } from "@/components/stats/format";
import { RangeTabs } from "@/components/stats/range-tabs";
import { SpamWatchlist } from "@/components/stats/spam-watchlist";
import { SpenderList } from "@/components/stats/spender-list";
import { StatTiles } from "@/components/stats/stat-tiles";
import { TokenTable } from "@/components/stats/token-table";
import { WalletLookup } from "@/components/stats/wallet-lookup";
import { IconBadge } from "@/components/stats/icon-badge";
import { SECTION_ICON } from "@/components/stats/icons";
import type { RangeKey } from "@/lib/web3/analytics";
import { PYRE_BATCH_ADDRESS } from "@/lib/web3/fees";

const REFRESH_MS = 60_000;

const FALLBACK_CONTRACTS = [
  { address: PYRE_BATCH_ADDRESS, label: "PyreBatch", cleans: 0 },
  {
    address: "0x92C5eAaBdaDFF7575c3f19B6ce3f86e8F9b5126B",
    label: "PyreBatch (retired)",
    cleans: 0,
  },
];

function Skeleton({ className }: { readonly className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-[28px] bg-primary/[0.05] shadow-[var(--shadow-border)] motion-safe:animate-pulse ${className}`}
    />
  );
}

export function StatsPage() {
  const [range, setRange] = useState<RangeKey>("all");
  const { data, error, isPending, refetch, isFetching } = useQuery({
    queryKey: ["pyre-analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS / 2,
    retry: shouldRetry,
  });

  const chart =
    range === "24h"
      ? {
          rows: data?.hourly ?? [],
          title: "Per hour",
          caption: "Last 24 hours, UTC",
          label: shortHour,
        }
      : {
          rows: range === "7d" ? (data?.daily ?? []).slice(-7) : (data?.daily ?? []),
          title: "Per day",
          caption: range === "7d" ? "Last 7 days, UTC" : "Last 30 days, UTC",
          label: undefined,
        };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-14 sm:px-6 lg:py-20">
        <section className="flex flex-col gap-12">
          <div>
            <h1 className="on-scroll text-4xl font-semibold tracking-tight sm:text-6xl">
              Pyre on Robinhood Chain
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Live usage, read straight from on-chain events. No wallet, no sign-up, and every
              number links to the explorer.
            </p>
          </div>
          <ContractCard
            contracts={data?.contracts ?? FALLBACK_CONTRACTS}
            headBlock={data?.headBlock}
            generatedAt={data?.generatedAt}
          />
        </section>

        {error && !data ? (
          <Notice
            tone="error"
            title="Could not read Robinhood Chain right now"
            actions={
              <button type="button" onClick={() => refetch()} className="text-link text-sm">
                {isFetching ? "Retrying…" : "Try again"}
              </button>
            }
          >
            {error instanceof Error && error.message.startsWith("Too many")
              ? error.message
              : "The public RPC did not answer. The numbers load again as soon as it does."}
          </Notice>
        ) : null}

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <IconBadge icon={SECTION_ICON.summary} />
              Summary
            </h2>
            <RangeTabs value={range} onChange={setRange} />
          </div>
          {isPending ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
              <Skeleton className="h-96" />
            </>
          ) : data ? (
            <>
              <StatTiles totals={data.totals[range]} />
              <DailyChart
                daily={chart.rows}
                title={chart.title}
                caption={range === "all" ? "Last 30 days, UTC" : chart.caption}
                label={chart.label}
              />
            </>
          ) : null}
        </section>

        <WalletLookup />

        {data ? <TokenTable tokens={data.tokens} wallets={data.totals.all.wallets} /> : null}

        {data ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <SpamWatchlist rows={data.watchlist} />
            <SpenderList rows={data.spenders} />
          </div>
        ) : null}

        {data ? <ActivityFeed recent={data.recent} /> : null}

        <section className="rounded-[28px] bg-primary/[0.07] p-6 text-sm text-muted-foreground shadow-[var(--shadow-border)] sm:p-8">
          <h2 className="flex items-center gap-3 text-lg font-semibold text-foreground">
            <IconBadge icon={SECTION_ICON.method} size="sm" />
            How we count
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <p>
              <span className="font-semibold text-foreground">Batch cleans and wallets</span> come
              from the <code className="font-mono text-xs">FeePaid</code> event on PyreBatch, the
              only event that names Pyre.
            </p>
            <p>
              <span className="font-semibold text-foreground">Burns, sweeps and revokes</span> count
              when the paying wallet makes them within {data?.attributionMinutes ?? 30} minutes of
              its fee: burns and transfers to a burn address, swaps through Uniswap, and allowances
              set to zero. ETH recovered is what those swaps unwrapped, read from each transaction
              receipt.
            </p>
            <p>
              <span className="font-semibold text-foreground">Single burns and revokes</span> are
              free, so they leave no Pyre event and are not counted. Real usage is higher than
              shown.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
