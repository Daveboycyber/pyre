import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shortAddress, useWalletCleaner } from "@/lib/web3/use-wallet-cleaner";

const NAV: Array<
  | { kind: "route"; to: "/clean"; label: string }
  | { kind: "hash"; href: string; label: string }
> = [
  { kind: "route", to: "/clean", label: "Cleaner" },
  { kind: "hash", href: "#how", label: "How it works" },
  { kind: "hash", href: "#fees", label: "Fees" },
  { kind: "hash", href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { connected, address, setOpen, disconnect, demo } = useWalletCleaner();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link to="/" className="text-foreground" aria-label="Pyre home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((item) =>
            item.kind === "route" ? (
              <Link
                key={item.label}
                to={item.to}
                className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {connected && address ? (
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              className="hidden font-mono text-xs sm:inline-flex"
            >
              {demo ? "Demo · " : ""}
              {shortAddress(address)}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setOpen(true)}
              className="hidden sm:inline-flex"
            >
              Connect wallet
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border md:hidden",
          menuOpen ? "block" : "hidden",
        )}
      >
        <nav
          className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3"
          aria-label="Mobile"
        >
          {NAV.map((item) =>
            item.kind === "route" ? (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center text-sm text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center text-sm text-foreground"
              >
                {item.label}
              </a>
            ),
          )}
          {connected && address ? (
            <Button variant="outline" className="mt-2" onClick={disconnect}>
              Disconnect {shortAddress(address)}
            </Button>
          ) : (
            <Button
              className="mt-2"
              onClick={() => {
                setMenuOpen(false);
                setOpen(true);
              }}
            >
              Connect wallet
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
