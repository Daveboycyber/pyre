# Pyre — Product Status Brief

**Date:** 8 October 2026  
**App:** [pyre-mu.vercel.app](https://pyre-mu.vercel.app)  
**Network:** Robinhood Chain (chain ID 4663)  
**Audience:** technical and non-technical stakeholders

---

## What Pyre is

Pyre is a **non-custodial wallet cleaner** for Robinhood Chain. Users connect their own wallet, scan for spam tokens and leftover approvals, and choose what to burn or revoke. Pyre never holds funds and never moves assets without a user signature.

Stock Tokens on Robinhood Chain are treated as protected. They are not burned. Dust positions may only be handled through safe, explicit flows that do not destroy the underlying stock exposure.

The product is inspired by Solana-era incinerators, rebuilt for Robinhood Chain’s EVM environment and visual identity (lime `#CCFF00` on dark grey).

---

## What is live and proven

### Core cleaner

| Capability | Status |
|------------|--------|
| Wallet connect (desktop extensions) | Live |
| Wallet connect (mobile WalletConnect + open-in-app) | Live |
| Scan wallet holdings on Robinhood Chain | Live |
| Burn ERC-20 spam (transfer to dead address) | Proven on-chain |
| Revoke token approvals | Live |
| Safe / Sweep / Review modes | Live |
| Stock Token protection (no burn) | Live |
| Dismiss / hide scam tokens that still report a balance | Live |
| Show dismissed + restore | Live |
| Demo / preview flow without a wallet | Live |

### Monetization (Phase 1)

| Capability | Status |
|------------|--------|
| Single action free; batch (2+) charges a flat fee | Live |
| Flat protocol fee **0.0005 ETH** per batch | Live |
| Fee routed to project treasury | Live |
| Credits v0 (local, per-wallet fee waivers) | Live |

### Example proven burn

A real burn completed on Robinhood Chain:

- **Tx:** `0x2f8a70d9f1b2f8542ae7e03eb760b6dde50ba124c428a3282c0628f31335d68c`
- **Explorer:** [Blockscout](https://robinhoodchain.blockscout.com)

---

## Smart contract

| Item | Detail |
|------|--------|
| **Name** | `PyreBatch` |
| **Address** | `0x92C5eAaBdaDFF7575c3f19B6ce3f86e8F9b5126B` |
| **Network** | Robinhood Chain mainnet (4663) |
| **Explorer** | [View on Blockscout](https://robinhoodchain.blockscout.com/address/0x92C5eAaBdaDFF7575c3f19B6ce3f86e8F9b5126B) |
| **Verification** | Source verified on Blockscout |
| **Role** | Collects the flat batch fee and forwards it to treasury; supports optional multicall when the caller is a smart account |

**Treasury (fee recipient):**  
`0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6`

Burns themselves are signed directly from the user’s wallet (transfer to the standard dead address). The batch contract is the fee gate, not a custody vault.

---

## Product surface today

1. **Landing** — brand, value prop, path into the cleaner  
2. **Connect** — MetaMask, Rainbow, WalletConnect, Robinhood Wallet handoff  
3. **Scan** — live balances via RPC / multicall  
4. **Review** — select spam; Stock Tokens locked; dismiss junk  
5. **Sign** — fee (if batch) then per-line burns / revokes  
6. **Done** — summary of actions; option to scan again  

Stack (for technical readers): TanStack Start, Vite, wagmi / viem, WalletConnect, deployed on Vercel, source on GitHub (`Daveboycyber/pyre`).

---

## Known limitations (honest)

- Some scam tokens keep reporting a balance after a successful burn; **dismiss** is the user-facing fix.
- MetaMask may flag certain token contracts or the current `*.vercel.app` host; Rainbow and in-app browsers have worked around this in testing.
- Indexer lag can briefly show a token after burn until a live rescan; the app uses live balance checks and a session clear list to reduce that.
- Credits and dismiss lists are stored in the browser (localStorage), not on-chain.

---

## What remains to develop, prove, or ship

These items complete the current product loop; they are not a separate product vision.

| Area | Remaining work |
|------|----------------|
| **Reliability** | Broader burn testing across wallets and token types; confirm fee receipts on treasury after batch cleans |
| **Mobile UX** | Ongoing validation of WalletConnect and open-in-app paths on Safari / Chrome |
| **Cleaner UX** | Optional Blockscout links on each completed line; clearer pending → confirmed states |
| **Dismiss** | Optional “clear all dismissed”; keep prune-on-scan behaviour stable |
| **Operations** | Owner procedures for contract parameters; monitoring of fee flow |
| **Release** | Custom domain and production metadata when the team is ready to leave the Vercel preview host |

---

## One-line summary

**Pyre is a live, non-custodial spam cleaner on Robinhood Chain, with a verified fee contract, working burns, Stock Token protection, and mobile connect — ready for continued hardening and a production host, not a greenfield build.**
