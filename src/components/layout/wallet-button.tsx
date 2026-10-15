import { LoaderCircle, LogOut, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { shortAddress, useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

/**
 * Navbar wallet control. Disconnected: glowing lime pill. Connected: address
 * chip with a live dot that turns into "Disconnect" on hover.
 */
export function WalletButton({
  className,
  onAction,
}: {
  className?: string;
  /** Runs after the click, e.g. to close the mobile menu. */
  onAction?: () => void;
}) {
  const { connected, connecting, address, demo, setOpen, disconnect } = useWalletCleaner();

  if (connected && address) {
    return (
      <button
        type="button"
        onClick={() => {
          void disconnect();
          onAction?.();
        }}
        title={demo ? "Exit demo" : "Disconnect wallet"}
        className={cn(
          "group inline-flex h-10 items-center gap-2 rounded-full bg-card/70 pr-4 pl-3 text-sm shadow-[var(--shadow-border)] transition-[background-color,box-shadow] duration-300",
          "hover:bg-destructive/10 hover:shadow-[0_0_0_1px_rgb(255_107_74/0.4)]",
          className,
        )}
      >
        <span className="relative flex size-2.5 group-hover:hidden">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
          <span className="relative size-2.5 rounded-full bg-primary" />
        </span>
        <LogOut className="hidden size-4 text-destructive group-hover:block" />
        {demo ? (
          <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium text-primary uppercase group-hover:hidden">
            Demo
          </span>
        ) : null}
        <span className="font-mono text-xs group-hover:hidden">{shortAddress(address)}</span>
        <span className="hidden text-destructive group-hover:inline">
          {demo ? "Exit demo" : "Disconnect"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={connecting}
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
      <span className="flex size-7 items-center justify-center rounded-full bg-primary-foreground text-primary transition-transform duration-300 group-hover:rotate-[-8deg]">
        {connecting ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <Wallet className="size-3.5" />
        )}
      </span>
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
