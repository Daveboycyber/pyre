import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Copy, Play, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { Connector } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  currentDappUrl,
  isMobileBrowser,
  mobileWalletLinks,
} from "@/lib/web3/mobile-wallets";
import { useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";
import { walletConnectEnabled } from "@/lib/web3/config";

function walletNameKey(name: string) {
  return name.replace(/\s+wallet$/i, "").trim().toLowerCase();
}

/** Drop wallets with no provider, and the duplicate plain-icon copies. */
async function availableConnectors(connectors: readonly Connector[]) {
  const found: { connector: Connector; provider: unknown }[] = [];
  for (const connector of connectors) {
    if (connector.type === "walletConnect") {
      if (!walletConnectEnabled) continue;
      found.push({ connector, provider: `wc:${connector.uid}` });
      continue;
    }
    try {
      const provider = await connector.getProvider();
      if (provider) found.push({ connector, provider });
    } catch {
      // Extension target with nothing installed — hide it.
    }
  }

  found.sort(
    (a, b) => Number(Boolean(b.connector.icon)) - Number(Boolean(a.connector.icon)),
  );

  const seenProviders = new Set<unknown>();
  const seenNames = new Set<string>();
  const unique: Connector[] = [];
  for (const item of found) {
    if (seenProviders.has(item.provider)) continue;
    const name = walletNameKey(item.connector.name);
    if (seenNames.has(name)) continue;
    if (
      item.connector.id === "injected" &&
      found.some((other) => other.connector.id !== "injected")
    ) {
      continue;
    }
    seenProviders.add(item.provider);
    seenNames.add(name);
    unique.push(item.connector);
  }
  return unique;
}

export function WalletDialog() {
  const { open, setOpen, connect, connectors, enterDemo } = useWalletCleaner();
  const navigate = useNavigate();
  const [ready, setReady] = useState<Connector[]>([]);
  const [probed, setProbed] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mobile = isMobileBrowser();
  const dappUrl = currentDappUrl();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setProbed(false);
    setError(null);
    void availableConnectors(connectors).then((list) => {
      if (cancelled) return;
      setReady(list);
      setProbed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, connectors]);

  const showMobileHandoff = mobile && probed && ready.length === 0;

  async function onConnect(connector: Connector) {
    setError(null);
    setPendingId(connector.uid);
    try {
      await connect(connector.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not connect";
      setError(
        /reject|denied|cancel/i.test(message)
          ? "Connection cancelled in the wallet."
          : message,
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            {showMobileHandoff
              ? "Safari and Chrome can’t see wallet apps. Pick one below to open Pyre inside that app, then connect there."
              : "Pyre reads Robinhood Chain (4663) directly. Nothing burns until you sign."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-md bg-background px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!probed ? (
          <p className="text-sm text-muted-foreground">Looking for wallets…</p>
        ) : null}

        {probed && ready.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {ready.map((connector) => (
              <li key={connector.uid}>
                <button
                  type="button"
                  disabled={pendingId !== null}
                  onClick={() => void onConnect(connector)}
                  className="flex h-14 w-full items-center gap-3 rounded-md bg-background px-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-150 hover:shadow-[var(--shadow-border-hover)] disabled:opacity-60"
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
                      {pendingId === connector.uid
                        ? "Waiting for approval…"
                        : connector.type === "walletConnect"
                          ? "Scan a QR code"
                          : "Installed in this browser"}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {showMobileHandoff ? (
          <ul className="flex flex-col gap-2">
            {mobileWalletLinks(dappUrl).map((wallet) => (
              <li key={wallet.id}>
                <a
                  href={wallet.href}
                  className="flex h-14 w-full items-center gap-3 rounded-md bg-background px-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                >
                  <span
                    className={`flex size-9 items-center justify-center rounded-sm text-sm font-semibold ${wallet.markClass}`}
                  >
                    {wallet.mark}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{wallet.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {wallet.hint}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(dappUrl).then(() => {
                    setCopied(true);
                  });
                }}
                className="flex h-14 w-full items-center gap-3 rounded-md bg-background px-3 text-left shadow-[var(--shadow-border)]"
              >
                <span className="flex size-9 items-center justify-center rounded-sm bg-[#CCFF00] text-sm font-semibold text-black">
                  {copied ? <Copy className="size-4" /> : "R"}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">Robinhood Wallet</span>
                  <span className="text-xs text-muted-foreground">
                    {copied
                      ? "Link copied — paste it in the Web3 browser"
                      : "Copy link, open Web3 in Robinhood, then paste"}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        ) : null}

        {probed && ready.length === 0 && !mobile ? (
          <p className="text-sm text-muted-foreground">
            No wallet in this browser. Install MetaMask, Rabby, or Rainbow, then
            refresh. On a phone, open this site inside the wallet’s browser.
          </p>
        ) : null}

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
