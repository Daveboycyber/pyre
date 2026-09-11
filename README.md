# Pyre

Wallet cleaner for [Robinhood Chain](https://robinhoodchain.blockscout.com) (chain 4663). Burns spam, revokes leftover approvals, and sweeps quoted junk to ETH. Stock Tokens stay locked.

Treasury: `0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6`

## Run it on your domain

This app is meant to live on **your** host, not a Grok URL.

1. Import this repository into [Vercel](https://vercel.com/new) (or any host that runs a Vite / Nitro Node 22 build).
2. Deploy. Framework preset can stay as Other — `npm run build` already emits Vercel output.
3. In the Vercel project: **Settings → Domains** → add `pyre.yourdomain.com` (or an apex domain).
4. At your DNS provider, add the records Vercel shows (usually a `CNAME` for a subdomain, or `A` for an apex).
5. Wait for HTTPS. Open that URL, connect a wallet on Robinhood Chain, and run a single-token Clean first.

Optional: in Vercel project env, set `VITE_WALLETCONNECT_PROJECT_ID` if you want phone QR connect.

## What not to do

Do not burn Stock Tokens. Safe mode will not select them. Sweep only sells spam with a real ETH route; dust Stock Tokens swap only when the quote clears gas plus the batch fee.
