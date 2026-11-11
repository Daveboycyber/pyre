import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { WalletButton } from "@/components/layout/wallet-button";
import { WalletDialog } from "@/components/wallet/wallet-dialog";
import { Button } from "@/components/ui/button";
import { NavItemLink } from "@/components/ui/nav-item-link";
import { PRODUCT_NAV } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link to="/" className="text-foreground" aria-label="Pyre home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {PRODUCT_NAV.map((item) => (
            <NavItemLink
              key={item.label}
              item={item}
              className="relative text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              activeClassName="!text-foreground after:absolute after:-bottom-2 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary"
            />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <WalletButton className="hidden sm:inline-flex" />
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

      <div className={cn("border-t border-border md:hidden", menuOpen ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3" aria-label="Mobile">
          {PRODUCT_NAV.map((item) => (
            <NavItemLink
              key={item.label}
              item={item}
              onClick={() => setMenuOpen(false)}
              className="flex min-h-11 items-center text-sm text-foreground"
              activeClassName="!text-primary"
            />
          ))}
          <WalletButton
            className="mt-2 w-full justify-center"
            onAction={() => setMenuOpen(false)}
          />
        </nav>
      </div>
      <WalletDialog />
    </header>
  );
}
