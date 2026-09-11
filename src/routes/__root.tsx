import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { wagmiConfig } from "@/lib/web3/config";
import { WalletCleanerProvider } from "@/lib/web3/use-wallet-cleaner";
import appCss from "../styles.css?url";

const web3QueryClient = new QueryClient();

const APP_NAME = "Pyre";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${APP_NAME} — Burn spam on Robinhood Chain` },
      {
        name: "description",
        content:
          "Clean a Robinhood Chain wallet: burn junk tokens and NFTs, revoke leftover approvals, and keep Stock Tokens locked. Gas in ETH. Non-custodial.",
      },
      { name: "theme-color", content: "#CCFF00" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={web3QueryClient}>
            <WalletCleanerProvider>
              <AuthProvider>
                <Outlet />
              </AuthProvider>
            </WalletCleanerProvider>
          </QueryClientProvider>
        </WagmiProvider>
        <Scripts />
      </body>
    </html>
  ),
});
