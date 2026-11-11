import { LoaderCircle, Wallet } from "lucide-react";
import { WalletMenu } from "@/components/wallet/wallet-menu";
import { cn } from "@/lib/utils";
import { useRecentConnector } from "@/lib/web3/use-recent-connector";
import { useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

/**
 * Navbar wallet control. Disconnected: glowing lime pill (with the last-used
 * wallet's icon). Reconnecting on load: a quiet placeholder instead of a
 * "Connect" flash. Connected: address chip that opens the wallet menu.
 */
export function WalletButton({
  className,
  onAction,
}: Readonly<{
  className?: string;
  /** Runs after the click, e.g. to close the mobile menu. */
  onAction?: () => void;
}>) {
  const { connected, connecting, reconnecting, walletUnknown, address, setOpen } = useWalletCleaner();
  const recent = useRecentConnector();

  if (connected && address) {
    return <WalletMenu className={className} onAction={onAction} />;
  }

  if (walletUnknown) {
    // Same footprint as the button, so nothing jumps when the state is known.
    return (
      <span
        aria-hidden
        className={cn("inline-flex h-10 w-[9.5rem] rounded-full bg-card/40 shadow-[var(--shadow-border)]", className)}
      />
    );
  }

  if (reconnecting) {
    return (
      <span
        role="status"
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full bg-card/70 pr-4 pl-3 text-sm text-muted-foreground shadow-[var(--shadow-border)]",
          className,
        )}
      >
        <LoaderCircle className="size-3.5 animate-spin" />
        Reconnecting…
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={connecting}
      title={recent ? `Last used: ${recent.name}` : undefined}
      onClick={() => {
        setOpen(true);
        onAction?.();
      }}
      className={cn(
        "wallet-button group inline-flex h-10 items-center gap-2 rounded-full bg-primary pr-4 pl-1.5 text-sm font-medium text-primary-foreground",
        "transition-[transform,box-shadow] duration-300 ease-[var(--ease-smooth-out)] hover:-translate-y-px active:translate-y-0 active:scale-[0.97] disabled:opacity-70",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-primary-foreground text-primary transition-transform duration-300 group-hover:rotate-[-8deg]">
        {connecting ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : recent?.icon ? (
          <img src={recent.icon} alt="" className="size-4" />
        ) : (
          <Wallet className="size-3.5" />
        )}
      </span>
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
