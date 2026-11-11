# World is Flat submission

Paste-ready pack for https://worldisflat.fun/build.
Submissions close **12 Nov 2026, 17:30 UTC**. The preview must stay up through **16 Nov 2026, 17:30 UTC**.

Do not put "Robinhood" in the project name, logo, or handle.

## Links

| | |
|---|---|
| Repo (branch) | https://github.com/Daveboycyber/pyre/tree/hackathon/wif |
| Live demo | https://pyre-git-hackathon-wif-pyre5.vercel.app |
| Chain | Robinhood Chain, id 4663 |
| $WIF | `0x5173b8eA6923c2d40267890D45C46a3480954773` |
| Gate | `0x4A5442c781F4ec7f38c080338758f4193287E29E` |
| Deploy tx | `0xb05cab6275c9a59a306f3aac81d04b0fb95e8c51cc7b1931ba28eaaa9cf7902a` |
| Audit | `docs/audits/PyreWifGate-2026-11-11.md` |

Production `main` is the cleaner without $WIF. Submit the preview above, not the production domain.

## Form copy

**Name:** Pyre

**Categories:** tools and infra. Add Stock Tokens only if the demo shows the stock-token lock. That category follows the restricted-country list.

**One liner:**

Pyre cleans a wallet on Robinhood Chain. A batch clean pays its fee in $WIF, and the gate removes most of that fee from circulation.

**What it does:**

Pyre scans a wallet, marks spam and dust, and lets the user burn tokens or revoke approvals from their own wallet. Pyre never holds the tokens.

A clean of two or more actions has a protocol fee. If the wallet holds enough $WIF, that fee is paid through PyreWifGate (`0x4A5442c781F4ec7f38c080338758f4193287E29E`). The gate pulls the live `feeAmount` (50 $WIF today), sends 80% to `0x…dEaD`, and sends 20% to the Pyre treasury. If the wallet cannot pay in $WIF, the same clean falls back to a small ETH fee. Gas stays ETH. $WIF is not the chain gas token.

**Flywheel:**

People clean wallets because the wallets are messy, not because of a points program. Each paid batch creates real demand for $WIF and takes most of the fee out of circulation. The contract will not let the owner set the burned share below 50%. Using the product is what brings people back to $WIF.

**Proof:**

- Source: `contracts/PyreWifGate.sol` and `src/lib/web3/wif.ts` on `hackathon/wif`.
- Live gate matches that source (solc 0.8.37, optimizer off). Constructor args: WIF, treasury `0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6`, fee 50e18, burn 8000 bps.
- Fork check on chain 4663: user −50 $WIF, dead +40, treasury +10, `WifFeePaid` emitted. See the audit.
- `totalSupply` does not change. Tokens go to the dead address, so they leave circulation. Do not claim a supply burn.

## Demo video (about 45–60 seconds)

Record the preview, not production. Narrate:

1. Open the preview. Connect a wallet that holds at least 50 $WIF.
2. Scan. Select two or more lines.
3. Point at the fee: it reads the live gate fee, paid in $WIF, at least half removed from circulation.
4. Sign approve only if the wallet asks, then `payFee`.
5. Show the burns or revokes, each signed by the user.
6. Open the gate on the explorer. Show `WifFeePaid`, dead +40, treasury +10.

## Before you click submit

- [ ] Preview loads: https://pyre-git-hackathon-wif-pyre5.vercel.app
- [ ] One real wallet clean with ≥50 $WIF, or paste the fork tx hashes from the audit into the form
- [ ] Video uploaded and linked
- [ ] Repo is public, or `wifonrh` is invited if it stays private
- [ ] Name, logo, and handle do not use Robinhood
- [ ] Leave the preview deployed through 16 Nov, 17:30 UTC
