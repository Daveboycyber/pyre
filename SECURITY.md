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
| Contract source | [`contracts/`](contracts/) |
| Web app | `src/`, `server/` — especially transaction building, simulation, receipt checks, asset classification, and the Stock Token registry |

Of particular interest:

- Anything that could cause a user to burn, revoke, or swap an asset they did not select
- Stock Tokens being selectable or burnable
- Charging more than the fee shown on the review screen
- Draining approvals or funds through PyreBatch
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

## Safety reminder

Nobody from Pyre will ever ask for your seed phrase or private key. Pyre never needs them: every action is a transaction you sign in your own wallet.
