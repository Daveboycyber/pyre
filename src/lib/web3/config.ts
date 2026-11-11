import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { robinhoodChain } from "./chain.ts";

/**
 * Reown / WalletConnect Cloud project ID.
 * Safe to ship in the client bundle — VITE_ vars are public by design.
 * Override with VITE_WALLETCONNECT_PROJECT_ID in env if needed.
 */
const walletConnectProjectId =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() ||
  "2d178360d703a086c6d769bf2dc2afae";

/**
 * One injected connector + EIP-6963 discovery.
 * Do not also pin metaMask/rabby/injected targets — that lists the same
 * wallet twice (plain icon + real icon) and shows dead buttons on mobile.
 * Robinhood is extra because some builds only set window.robinhood.ethereum.
 */
const connectors = [
  injected(),
  injected({
    target: () => ({
      id: "robinhoodWallet",
      name: "Robinhood Wallet",
      provider:
        typeof window !== "undefined"
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).robinhood?.ethereum
          : undefined,
    }),
  }),
  walletConnect({
    projectId: walletConnectProjectId,
    showQrModal: true,
    metadata: {
      name: "Pyre",
      description: "Robinhood Chain wallet cleaner",
      url:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://pyre-mu.vercel.app",
      icons: ["https://pyre-mu.vercel.app/favicon.ico"],
    },
  }),
];

/**
 * Whether a connected wallet was saved when the page loaded. Read here, before
 * createConfig, because wagmi's first reconnect attempt can clear the saved
 * session (e.g. before wallets announce over EIP-6963) and reconnect a moment
 * later. The UI uses it to show "Reconnecting…" instead of "Connect wallet".
 */
export const HAD_WALLET_SESSION_AT_LOAD = (() => {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("wagmi.store");
    return Boolean(raw && (JSON.parse(raw) as { state?: { current?: string | null } }).state?.current);
  } catch {
    return false; // storage blocked: nothing to restore
  }
})();

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors,
  transports: {
    [robinhoodChain.id]: http(robinhoodChain.rpcUrls.default.http[0]),
  },
  multiInjectedProviderDiscovery: true,
  ssr: true,
});

export const walletConnectEnabled = true;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
