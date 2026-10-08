/** Phone browsers have no extensions and cannot detect installed apps.
 *  These are deep-link handoffs into common wallet apps, not a live install scan.
 */

export function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Land in the cleaner, not the marketing page. */
export function currentDappUrl() {
  if (typeof window === "undefined") return "https://pyre-mu.vercel.app/clean";
  const url = new URL(window.location.href);
  if (url.pathname === "/" || url.pathname === "") url.pathname = "/clean";
  return url.toString();
}

export type MobileWalletLink = {
  id: string;
  name: string;
  hint: string;
  href: string;
  /** Tailwind-friendly solid mark color */
  markClass: string;
  /** Single letter or short mark when no svg */
  mark: string;
};

/**
 * Curated deep links for mobile Safari/Chrome.
 * Do not list every wallet — phone browsers cannot prove install status,
 * so a long list reads as “detected” wallets the user may not have.
 * Focus on wallets people actually use with Robinhood Chain.
 */
export function mobileWalletLinks(dappUrl: string): MobileWalletLink[] {
  const encoded = encodeURIComponent(dappUrl);
  const noProto = dappUrl.replace(/^https?:\/\//, "");
  return [
    {
      id: "metamask",
      name: "MetaMask",
      hint: "Opens Pyre inside the MetaMask app",
      href: `https://metamask.app.link/dapp/${noProto}`,
      markClass: "bg-[#E2761B] text-white",
      mark: "M",
    },
    {
      id: "rainbow",
      name: "Rainbow",
      hint: "Opens Pyre inside the Rainbow app",
      href: `https://rnbwapp.com/dapp?url=${encoded}`,
      markClass:
        "bg-gradient-to-br from-[#FF4000] via-[#FA0] to-[#15C] text-white",
      mark: "R",
    },
  ];
}
