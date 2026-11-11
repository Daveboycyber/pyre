# Security Policy

Pyre handles user funds, so we take security reports seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Do not open a public issue, PR, or discussion for a vulnerability.**

Report it privately through [GitHub Security Advisories](https://github.com/Daveboycyber/pyre/security/advisories/new). Please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- Affected component (contract, frontend, address, commit)
- Any suggested fix

We aim to acknowledge reports within **72 hours** and to share a remediation plan within **7 days**. Please give us reasonable time to fix the issue before disclosing it publicly.

## Scope

| In scope | Address / path |
|----------|----------------|
| PyreBatch (live) | [`0xcB157e4D7035F9a38b9e0B92b89E544e378c1490`](https://robinhoodchain.blockscout.com/address/0xcB157e4D7035F9a38b9e0B92b89E544e378c1490) on Robinhood Chain (4663) |
| PyreWifGate (live, `hackathon/wif` only) | [`0x4A5442c781F4ec7f38c080338758f4193287E29E`](https://robinhoodchain.blockscout.com/address/0x4A5442c781F4ec7f38c080338758f4193287E29E) on Robinhood Chain (4663) |
| Contract source | [`contracts/`](contracts/) |
| Web app | `src/`, `server/` — especially transaction building, simulation, receipt checks, asset classification, and the Stock Token registry |

Of particular interest:

- Anything that could cause a user to burn, revoke, or swap an asset they did not select
- Stock Tokens being selectable or burnable
- Charging more than the fee shown on the review screen
- Draining approvals or funds through PyreBatch or PyreWifGate
- Unauthorized changes to the fee, treasury, or contract ownership

### Out of scope

- The previous, pre-hardening deployment `0x92C5eAaBdaDFF7575c3f19B6ce3f86e8F9b5126B`
- Third-party services (Blockscout, 1inch, Uniswap, WalletConnect, wallets) and Robinhood Chain itself
- Phishing or social engineering of users or maintainers
- Denial of service, spam, or volumetric attacks
- Issues that need a compromised device, wallet, or browser extension

## Rules of engagement

- Test against your own wallets and funds only.
- Do not exploit an issue beyond what is needed to show it exists.
- Do not access, modify, or move other users' assets or data.

## How Pyre protects you

Pyre is non-custodial. It never holds your tokens, never sees your keys and cannot sign anything for you. Every burn, revoke, sweep and fee payment is a transaction your wallet shows you first.

- **Stock Tokens and stablecoins are locked.** They can't be selected for burn. Pyre loads the Stock Token list from its API and, if that fails, from a bundled snapshot plus a list of major tickers, so a failed load never unlocks them.
- **Every action is simulated before you sign.** If the simulation fails, Pyre skips that line and your wallet never gets a prompt for it.
- **Every receipt is checked after it lands.** A transaction that reverted is never reported as success. Revokes are checked on chain afterwards, and a revoke that leaves the approval in place is reported as a failure.
- **No surprise fees.** The batch fee is read on chain when you review, and again just before you sign. If it went up in between, the clean stops before anything is signed.
- **Fee first, then burns.** If the batch fee fails, no burns start. If a $WIF fee payment was sent but can't be confirmed, Pyre stops instead of asking you to pay in ETH as well.
- **Exact approvals only.** When Pyre needs an approval (the $WIF fee gate, or the Uniswap router for a sweep), it asks for the exact amount, never unlimited.
- **Slippage limit on sweeps.** A sweep to ETH reverts if it would return more than 1% below the quote.
- **Contracts with hard limits.**

  | Contract | What the owner can change | What the owner can't do |
  |---|---|---|
  | PyreBatch | Fee (up to 0.01 ETH) | Touch your tokens |
  | PyreWifGate | Fee (up to 1,000 $WIF), burn share (50–100%), treasury | Move any token except the fee you pay, move your other tokens, turn the burn off |

  Neither contract has an upgrade path or a function that can take tokens from your wallet.

## Staying safe: tips for users

**Your wallet**
- Never share your seed phrase or private key with anyone, including anyone claiming to be from Pyre. Pyre never needs them.
- Keep long-term holdings in a hardware wallet (Ledger, Trezor) or a separate wallet from the one you use to connect to apps.
- Store your seed phrase offline, on paper or metal, never in a screenshot, cloud note, email or password-manager note.

**Before you sign**
- Read every wallet prompt. Check the contract address, the token and the amount. If a prompt doesn't match what Pyre's review screen showed, reject it.
- Be suspicious of any "approve unlimited" or `setApprovalForAll(…, true)` request. Pyre never asks for either: it only sets approvals to zero (revokes), turns `setApprovalForAll` off, or approves an exact amount for a fee or sweep.
- Check you're on the real Pyre site. Bookmark it and open it from the bookmark, not from links in DMs, replies or search ads.
- Make sure your wallet is on Robinhood Chain (chain id 4663) before signing.

**Spam tokens and airdrops**
- Don't interact with tokens you didn't buy. Spam tokens often carry links in their name or symbol that lead to drainer sites. Pyre treats a link in a token name as a spam signal, but your wallet or explorer may show it as is.
- Never visit a URL found in a token name, NFT description or memo to "claim" anything.
- Burning a spam token through Pyre sends it to a dead address. You don't need to "sell" it on a site the token points you to.

**Approvals**
- Revoke approvals you no longer use. Old unlimited approvals are the most common way wallets get drained after a protocol is hacked.
- Run a Pyre scan now and then to find leftover approvals, and revoke the ones you don't recognise.

**If something goes wrong**
- If you think your wallet is compromised, move what's left to a fresh wallet straight away, then revoke approvals from the old one.
- Pyre support will never DM you first, ask you to "verify" your wallet or send you a link to sign.

## What Pyre cannot protect you from

- A compromised device, browser extension or wallet app
- Fake copies of the Pyre site
- Approvals and transactions you sign on other sites
- Tokens whose own contract misbehaves (Pyre simulates every action, but can't change what a token does)

## Safety reminder

Nobody from Pyre will ever ask for your seed phrase or private key. Pyre never needs them: every action is a transaction you sign in your own wallet.
