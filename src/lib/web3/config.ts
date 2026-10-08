import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { robinhoodChain } from "./chain";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined;

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
  ...(walletConnectProjectId
    ? [
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
            icons: [],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors,
  transports: {
    [robinhoodChain.id]: http(robinhoodChain.rpcUrls.default.http[0]),
  },
  multiInjectedProviderDiscovery: true,
  ssr: true,
});

export const walletConnectEnabled = Boolean(walletConnectProjectId);

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
