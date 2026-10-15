import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const SECTIONS: LegalSection[] = [
  {
    title: "The short version",
    body: (
      <p>
        Pyre has no accounts, no ads, and no tracking. We never see your private key or seed phrase,
        and we do not sell data.
      </p>
    ),
  },
  {
    title: "What we never collect",
    body: (
      <ul>
        <li>Private keys or seed phrases</li>
        <li>Your name, email, or phone number</li>
        <li>Advertising or cross-site tracking cookies</li>
      </ul>
    ),
  },
  {
    title: "Your wallet address",
    body: (
      <p>
        When you connect, Pyre uses your public wallet address to read your tokens, NFTs, and
        approvals and to fetch swap quotes. Blockchain data is public by nature, and any transaction
        you sign is recorded on Robinhood Chain permanently.
      </p>
    ),
  },
  {
    title: "Stored on your device",
    body: (
      <p>
        Your hidden-asset list and any fee credits are saved in your browser&apos;s local storage.
        They stay on your device and you can clear them at any time by clearing site data.
      </p>
    ),
  },
  {
    title: "Services we rely on",
    body: (
      <>
        <p>To work, Pyre talks to these services, each under its own privacy policy:</p>
        <ul>
          <li>Your wallet, or WalletConnect if you connect that way</li>
          <li>The Robinhood Chain RPC, to read and send transactions</li>
          <li>Blockscout, to read balances and approvals</li>
          <li>1inch, for swap quotes</li>
          <li>
            Vercel, which hosts the site and may keep standard server logs such as IP addresses
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Changes and contact",
    body: (
      <p>
        If this policy changes, we will update the date above. Questions? Open an issue on{" "}
        <a
          href="https://github.com/Daveboycyber/pyre/issues"
          className="text-foreground underline underline-offset-4 hover:text-primary"
        >
          GitHub
        </a>
        .
      </p>
    ),
  },
];

export function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="October 15, 2026"
      intro="Pyre is a non-custodial wallet cleaner. This page explains, plainly, what data it touches."
      sections={SECTIONS}
    />
  );
}
