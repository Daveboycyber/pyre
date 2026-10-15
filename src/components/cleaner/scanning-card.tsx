import { LoaderCircle } from "lucide-react";

/** Skeleton list shown while the wallet is being read. */
export function ScanningCard() {
  return (
    <section
      aria-busy="true"
      className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]"
    >
      <div className="flex items-center gap-2 text-sm">
        <LoaderCircle className="size-4 animate-spin text-primary" />
        Scanning wallet
      </div>
      <p className="text-xs text-muted-foreground">
        Reading tokens, NFTs and approvals on Robinhood Chain, then checking each one against the
        Stock Token list.
      </p>
      <ul className="flex flex-col gap-2" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-md px-1 py-2">
            <span className="size-4 animate-pulse rounded-sm bg-background" />
            <span className="flex-1 space-y-1.5">
              <span
                className="block h-3 animate-pulse rounded bg-background"
                style={{ width: `${70 - i * 12}%`, animationDelay: `${i * 120}ms` }}
              />
              <span
                className="block h-2.5 w-1/3 animate-pulse rounded bg-background/70"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
