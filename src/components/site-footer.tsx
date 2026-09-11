import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            Non-custodial Robinhood Chain wallet cleaner. Burn spam, revoke
            approvals, leave Stock Tokens alone.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          <Link
            to="/clean"
            className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            Cleaner
          </Link>
          <a
            href="#how"
            className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#fees"
            className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            Fees
          </a>
          <a
            href="#faq"
            className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            FAQ
          </a>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl border-t border-border px-5 py-6 sm:px-6">
        <p className="text-xs text-muted-foreground">
          Pyre is not affiliated with Robinhood Markets, Inc. Review every
          transaction before you sign. Burns cannot be undone.
        </p>
      </div>
    </footer>
  );
}
