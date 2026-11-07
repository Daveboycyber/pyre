import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useAccount } from "wagmi";
import { ActivityFeed } from "@/components/stats/activity-feed";
import {
  fetchWalletHistory,
  formatDate,
  formatEth,
  shortAddress,
  shouldRetry,
} from "@/components/stats/format";
import { isAddress } from "@/lib/web3/analytics";
import { IconBadge } from "@/components/stats/icon-badge";
import { SECTION_ICON } from "@/components/stats/icons";

/** Look up any wallet's Pyre history. Public on-chain data, no signature needed. */
export function WalletLookup() {
  const { address: connected } = useAccount();
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const { data, error, isFetching } = useQuery({
    queryKey: ["pyre-wallet", address],
    queryFn: () => fetchWalletHistory(address!),
    enabled: Boolean(address),
    staleTime: 60_000,
    retry: shouldRetry,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!isAddress(value)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setAddress(value.toLowerCase());
  };

  const stats = data
    ? [
        { label: "Batch cleans", value: String(data.batchCleans) },
        { label: "Burned", value: String(data.burns) },
        { label: "Swept", value: String(data.sweeps) },
        { label: "Revoked", value: String(data.revokes) },
        { label: "ETH recovered", value: formatEth(data.ethRecoveredWei) },
        { label: "Fees paid", value: formatEth(data.feesWei) },
      ]
    : [];

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-[28px] bg-primary/[0.07] p-6 shadow-[var(--shadow-border)] sm:p-8">
        <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <IconBadge icon={SECTION_ICON.lookup} />
          Check a wallet
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          See what Pyre cleaned for any address. It is public on-chain data, so nothing to connect
          or sign.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="wallet-lookup" className="sr-only">
            Wallet address
          </label>
          <input
            id="wallet-lookup"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x… wallet address"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid}
            aria-describedby={invalid ? "wallet-lookup-error" : undefined}
            className="h-14 min-w-0 flex-1 rounded-2xl bg-black px-4 font-mono text-sm shadow-[var(--shadow-border)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <div className="flex gap-3">
            {connected ? (
              <button
                type="button"
                onClick={() => {
                  setInput(connected);
                  setInvalid(false);
                  setAddress(connected.toLowerCase());
                }}
                className="h-14 flex-1 rounded-2xl bg-primary/15 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/25 sm:flex-none"
              >
                Use my wallet
              </button>
            ) : null}
            <button
              type="submit"
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:flex-none"
            >
              <Search className="size-5" />
              {isFetching ? "Checking…" : "Check"}
            </button>
          </div>
        </form>
        {invalid ? (
          <p id="wallet-lookup-error" role="alert" className="mt-3 text-sm text-destructive">
            Enter a full 0x address: 0x followed by 40 letters and numbers.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Something went wrong. Try again."}
          </p>
        ) : null}

        {data ? (
          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{shortAddress(data.address)}</span>
              {data.firstSeen
                ? ` · first clean ${formatDate(data.firstSeen)}, last ${formatDate(data.lastSeen)}`
                : " · no batch cleans found"}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      {data && data.events.length > 0 ? (
        <ActivityFeed
          recent={data.events}
          title={`History for ${shortAddress(data.address)}`}
          showWallet={false}
          live={false}
          icon={SECTION_ICON.history}
        />
      ) : null}
      {data && data.events.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">
          No batch cleans from this wallet. Single burns and revokes are free and leave no Pyre
          event, so they do not show here.
        </p>
      ) : null}
    </section>
  );
}
