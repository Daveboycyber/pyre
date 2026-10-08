/** Phone browsers have no extensions. Open the dapp inside the wallet app. */

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
  mark: string;
};

export function mobileWalletLinks(dappUrl: string): MobileWalletLink[] {
  const encoded = encodeURIComponent(dappUrl);
  const noProto = dappUrl.replace(/^https?:\/\//, "");
  return [
    {
      id: "metamask",
      name: "MetaMask",
      hint: "Open in the MetaMask app",
      href: `https://metamask.app.link/dapp/${noProto}`,
      mark: "M",
    },
    {
      id: "rainbow",
      name: "Rainbow",
      hint: "Open in the Rainbow app",
      href: `https://rnbwapp.com/dapp?url=${encoded}`,
      mark: "R",
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      hint: "Open in Coinbase Wallet",
      href: `https://go.cb-w.com/dapp?cb_url=${encoded}`,
      mark: "C",
    },
  ];
}
