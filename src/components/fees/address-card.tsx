import { Copy, ExternalLink } from "lucide-react";
import { notify } from "@/lib/notify";
import { explorerAddressUrl } from "@/lib/web3/blockscout";

/** A public on-chain address with copy and explorer actions. */
export function AddressCard({
  title,
  description,
  address,
  status,
}: {
  title: string;
  description: string;
  address: string;
  status?: { label: string; live: boolean };
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      notify.success("Address copied", {
        description: `${address.slice(0, 10)}…${address.slice(-6)}`,
      });
    } catch {
      notify.error("Could not copy", { description: "Select the address and copy it manually." });
    }
  };

  return (
    <div className="flex flex-col rounded-2xl bg-card/60 p-6 shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {status ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={
                status.live
                  ? "size-1.5 rounded-full bg-primary"
                  : "size-1.5 rounded-full bg-destructive"
              }
            />
            {status.label}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <p className="mt-4 rounded-lg bg-background/60 px-3 py-2 font-mono text-xs break-all">
        {address}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs shadow-[var(--shadow-border)] transition-colors hover:bg-surface"
        >
          <Copy className="size-3.5" />
          Copy
        </button>
        <a
          href={explorerAddressUrl(address)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs shadow-[var(--shadow-border)] transition-colors hover:bg-surface"
        >
          Explorer
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
