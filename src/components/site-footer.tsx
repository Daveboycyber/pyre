import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

const linkClass =
  "text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground";

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
        <nav aria-label="Product">
          <p className="text-xs tracking-[0.18em] text-muted-foreground/70 uppercase">Product</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/clean" className={linkClass}>
                Cleaner
              </Link>
            </li>
            <li>
              <a href="/#how" className={linkClass}>
                How it works
              </a>
            </li>
            <li>
              <Link to="/fees" className={linkClass}>
                Fees
              </Link>
            </li>
            <li>
              <a href="/#faq" className={linkClass}>
                FAQ
              </a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="text-xs tracking-[0.18em] text-muted-foreground/70 uppercase">Legal</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className={linkClass}>
                Terms of Use
              </Link>
            </li>
          </ul>
        </nav>
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
