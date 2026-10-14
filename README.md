# Pyre

**Wallet cleaner for [Robinhood Chain](https://robinhoodchain.blockscout.com) (chain id 4663).**
Pyre burns spam tokens and bait NFTs, revokes leftover token approvals, and sweeps quoted junk to ETH. Stock Tokens and stables stay locked.

Pyre is non-custodial. It never sees a private key, and every burn, revoke, and swap is a transaction you sign in your own wallet.

---

## How it works

| Step | What happens |
|------|--------------|
| **1. Connect** | Robinhood Wallet, MetaMask, Rabby, Ledger, or any WalletConnect wallet. |
| **2. Scan** | Pyre reads ERC-20s, NFTs, and open allowances for the address from Blockscout. |
| **3. Review** | Each asset is classified with evidence attached. Spam is pre-selected. Stock Tokens, majors, and stables cannot be selected. |
| **4. Sign** | Every action is simulated before you sign it, and its receipt is checked afterwards. You approve each line. |

### What it does

- **Burn spam.** Uses a real `burn` when the token supports it. Otherwise it sends the tokens to `0x…dEaD`.
- **Revoke approvals.** Resets unlimited allowances on Permit2 and known spenders to zero.
- **Sweep to ETH.** Sells spam only when there is a real ETH route and the quote clears gas plus fees.
- **Dismiss.** Hides assets you want to keep out of the review list. You can restore them later.

### Safety rules

- **Stock Tokens are never burned.** The registry comes from a same-origin snapshot of the official Stock Token list (194 addresses on chain 4663). If the registry can't load, Pyre fails closed and selects nothing.
- Dust Stock Tokens are only swapped when the quote clears gas plus the batch fee.
- If the on-chain fee is higher than the fee shown on the review screen, Pyre refuses to send. Rescan to see the new fee.
- If a batch fee is paid but the burns fail, the fee is recorded as a credit for the next clean.

---

## Fees

| Action | Cost |
|--------|------|
| Single burn or revoke | Free (network gas only) |
| Batch clean (2+ actions) | Flat **0.0005 ETH** per batch, paid via `PyreBatch.collectFee()` |
| Sweep (quoted spam → ETH) | **1.25%** of the ETH received |

All fees go to the public treasury [`0xD456De00…F5BB88d6`](https://robinhoodchain.blockscout.com/address/0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6). The live fee is always read from the contract, never from the frontend.

## Contract

| | |
|---|---|
| **PyreBatch (live)** | [`0xcB157e4D7035F9a38b9e0B92b89E544e378c1490`](https://robinhoodchain.blockscout.com/address/0xcB157e4D7035F9a38b9e0B92b89E544e378c1490) |
| Source | [`contracts/PyreBatch.sol`](contracts/PyreBatch.sol) (solc 0.8.37, optimizer off) |
| Fee cap | `MAX_PROTOCOL_FEE = 0.01 ether`, hard-coded |
| Ownership | Two-step (`transferOwnership` → `acceptOwnership`) |

EOA wallets only call `collectFee()`. `clean()` is self-only (`msg.sender == address(this)`) and is reserved for a future smart-account / EIP-7702 flow, so a shared deployment can never be used to spend other people's approvals. Deploy and owner operations are documented in [`contracts/README.md`](contracts/README.md).

---

## Project layout

```
contracts/          PyreBatch.sol + deploy notes
src/routes/         /, /clean, /fees
src/components/     Landing, cleaner, fees pages and UI kit
src/lib/web3/       Scan, classify, execute, receipts, fees, sweep, credits
public/             Static assets incl. the Stock Token snapshot
scripts/            Build, migration, preview and smoke-test tooling
server/             Server middleware
migrations/         SQL migrations
```

## Security

Pyre handles user funds, so please **do not open public issues for vulnerabilities**. Report them privately. See [SECURITY.md](SECURITY.md) for how and what is in scope.

## Disclaimer

Pyre is provided as-is with no warranty. Burns and approval revokes are irreversible. Review every transaction before you sign it.
