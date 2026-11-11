import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Copy, LoaderCircle, Play, Wallet } from "lucide-react";
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
import { useRecentConnector } from "@/lib/web3/use-recent-connector";
import { useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";
import { walletConnectEnabled } from "@/lib/web3/config";
import { connectErrorMessage } from "@/lib/web3/tx-error";

function walletNameKey(name: string) {
  return name.replace(/\s+wallet$/i, "").trim().toLowerCase();
}

/** Drop wallets with no provider, and the duplicate plain-icon copies. */
async function availableConnectors(connectors: readonly Connector[], recentId?: string) {
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

  // Last-used wallet first, then installed wallets with a real icon, WalletConnect last.
  const rank = (c: Connector) =>
    c.id === recentId ? 0 : c.type === "walletConnect" ? 3 : c.icon ? 1 : 2;
  found.sort((a, b) => rank(a.connector) - rank(b.connector));

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
  const recent = useRecentConnector();
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
    // Clear the previous probe before the async scan so the dialog does not flash stale wallets.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before async connector probe
    setProbed(false);
    setError(null);
    void availableConnectors(connectors, recent?.id).then((list) => {
      if (cancelled) return;
      setReady(list);
      setProbed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, connectors, recent?.id]);

  const injectedReady = ready.filter((c) => c.type !== "walletConnect");
  const onlyWalletConnect =
    ready.length > 0 && injectedReady.length === 0;
  // Deep links when no extension is injected (Safari/Chrome mobile).
  const showMobileHandoff = mobile && probed && injectedReady.length === 0;

  async function onConnect(connector: Connector) {
    setError(null);
    setPendingId(connector.uid);
    try {
      await connect(connector.uid);
    } catch (err) {
      console.error("[pyre] wallet connect failed", err);
      setError(connectErrorMessage(err));
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
              ? "Use WalletConnect for any wallet, or open Pyre inside MetaMask / Rainbow."
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
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {connector.type === "walletConnect"
                        ? "WalletConnect"
                        : connector.name}
                      {connector.id === recent?.id ? (
                        <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium text-primary">
                          Last used
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pendingId === connector.uid
                        ? "Waiting for approval…"
                        : connector.type === "walletConnect"
                          ? mobile
                            ? "Open any wallet app"
                            : "Scan a QR code with your phone"
                          : "Installed in this browser"}
                    </span>
                  </span>
                  {pendingId === connector.uid ? (
                    <LoaderCircle className="size-4 animate-spin text-primary" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {showMobileHandoff ? (
          <>
            {onlyWalletConnect ? (
              <p className="text-xs text-muted-foreground">Or open directly in an app</p>
            ) : null}
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
                  <span className="flex size-9 items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground">
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
          </>
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
