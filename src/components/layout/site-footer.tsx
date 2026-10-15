import { Logo } from "@/components/layout/logo";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NavItemLink } from "@/components/ui/nav-item-link";
import { LEGAL_NAV, PRODUCT_NAV, type NavItem } from "@/lib/site-nav";

const COLUMNS: { title: string; items: NavItem[] }[] = [
  { title: "Product", items: PRODUCT_NAV },
  { title: "Legal", items: LEGAL_NAV },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-16">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            Non-custodial Robinhood Chain wallet cleaner. Burn spam, revoke approvals, leave Stock
            Tokens alone.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <Eyebrow className="text-muted-foreground/70">{column.title}</Eyebrow>
            <ul className="mt-4 space-y-2.5">
              {column.items.map((item) => (
                <li key={item.label}>
                  <NavItemLink
                    item={item}
                    className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-6xl border-t border-border px-5 py-6 sm:px-6">
        <p className="text-xs text-muted-foreground">
          Pyre is not affiliated with Robinhood Markets, Inc. Review every transaction before you
          sign. Burns cannot be undone.
        </p>
      </div>
    </footer>
  );
}
