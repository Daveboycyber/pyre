import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { shortAddress, useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

export function CleanerHeader() {
  const { connected, demo, address, setOpen, disconnect } = useWalletCleaner();
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-5">
        <Link to="/" aria-label="Pyre home">
          <Logo />
        </Link>
        {connected ? (
          <Button size="sm" variant="outline" onClick={() => void disconnect()}>
            {demo || !address ? "Exit demo" : shortAddress(address)}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            Connect
          </Button>
        )}
      </div>
    </header>
  );
}
