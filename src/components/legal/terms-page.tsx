import { Link } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const SECTIONS: LegalSection[] = [
  {
    title: "Using Pyre",
    body: (
      <p>
        Pyre is a free, open interface for cleaning wallets on Robinhood Chain. By using it you
        agree to these terms. If you do not agree, please do not use it.
      </p>
    ),
  },
  {
    title: "You stay in control",
    body: (
      <p>
        Pyre is non-custodial. It builds transactions, and your wallet signs them. We never hold
        your keys or funds, and we cannot reverse, cancel, or refund a transaction once it is
        signed.
      </p>
    ),
  },
  {
    title: "Burns are permanent",
    body: (
      <p>
        Burned tokens and NFTs are gone for good, and revoked approvals must be granted again to
        restore them. Review every line before you sign. You are responsible for what you approve.
      </p>
    ),
  },
  {
    title: "Fees",
    body: (
      <p>
        You pay network gas. Batches and sweeps also carry a protocol fee, shown before you sign and
        listed on the{" "}
        <Link
          to="/fees"
          className="text-foreground underline underline-offset-4 hover:text-primary"
        >
          Fees
        </Link>{" "}
        page.
      </p>
    ),
  },
  {
    title: "No guarantees",
    body: (
      <p>
        Pyre is provided as is. Spam detection and the Stock Token lock are best effort and can be
        wrong. Pyre is not financial, legal, or tax advice, and is not affiliated with Robinhood
        Markets, Inc.
      </p>
    ),
  },
  {
    title: "Limits on liability",
    body: (
      <p>
        To the extent the law allows, Pyre and its contributors are not liable for any loss from
        using the app, including lost tokens, failed transactions, or smart contract or network
        issues.
      </p>
    ),
  },
  {
    title: "Fair use",
    body: (
      <p>
        Do not use Pyre for anything illegal, to break sanctions, or to attack the app or its users.
        We may change or discontinue Pyre and update these terms at any time. The date above shows
        the latest version.
      </p>
    ),
  },
];

export function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      updated="October 15, 2026"
      intro="The plain-language rules for using Pyre."
      sections={SECTIONS}
    />
  );
}
