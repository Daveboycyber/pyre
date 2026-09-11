import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { robinhoodChain } from "./chain";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined;

const connectors = [
  injected({ target: "metaMask" }),
  injected({ target: "rabby" }),
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
  injected(),
  ...(walletConnectProjectId
    ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
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
