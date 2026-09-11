import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";
import { walletConnectEnabled } from "@/lib/web3/config";

export function WalletDialog() {
  const { open, setOpen, connect, connectors, connecting, enterDemo } =
    useWalletCleaner();
  const navigate = useNavigate();

  const ready = connectors.filter(
    (c) => c.type !== "walletConnect" || walletConnectEnabled,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Pyre reads Robinhood Chain (4663) directly. Nothing burns until you
            sign. Or preview the full flow without a wallet.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {ready.map((connector) => (
            <li key={connector.uid}>
              <button
                type="button"
                disabled={connecting}
                onClick={() => connect(connector.uid)}
                className="flex h-14 w-full items-center gap-3 rounded-md bg-background px-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-150 hover:shadow-[var(--shadow-border-hover)] disabled:opacity-50"
              >
                <span className="flex size-9 items-center justify-center overflow-hidden rounded-sm bg-surface text-foreground">
                  {connector.icon ? (
                    <img src={connector.icon} alt="" className="size-5" />
                  ) : (
                    <Wallet className="size-4" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{connector.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {connector.type === "injected"
                      ? "Browser extension"
                      : "Scan to connect"}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          onClick={() => {
            enterDemo();
            void navigate({ to: "/clean" });
          }}
        >
          <Play />
          Preview the flow
        </Button>
      </DialogContent>
    </Dialog>
  );
}
