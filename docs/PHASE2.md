# Phase 2 — Stock Desk

Branch: `phase-2`  
Status: **scaffold** (not on main, not deployed)

## Locked product loop

```
Cleaner fees + PYRE fees  →  Stock Desk treasury (ETH)
                              ↓
Users sell dust stock OTC  →  desk pays ETH, holds inventory
                              ↓
Later: baskets / yield partners use inventory
```

- Stock is **never minted**.
- Default payout is **ETH**.
- Desk **fails closed** if underfunded.
- Only **registry-whitelisted** stock tokens (owner-listed quotes in v1).

## D1 — what shipped in this scaffold

| Piece | Path |
|-------|------|
| `StockDesk` contract | [`contracts/StockDesk.sol`](../contracts/StockDesk.sol) |
| Foundry tests | [`contracts/test/StockDesk.t.sol`](../contracts/test/StockDesk.t.sol) |

### Contract behavior

- `setQuote(token, weiPerWhole, decimals, listed)` — owner posts price.
- `sellDust(token, amount)` — pull ERC-20, pay ETH.
- `quotePayout` — view helper (returns 0 if not fillable).
- `maxPayoutWei` — per-tx cap.
- `paused` — kill switch.
- `receive()` — fund desk with ETH (fee routing can send here later).
- Inventory / ETH withdraw — owner only.
- Two-step ownership (same pattern as PyreBatch).

### Not in D1 yet

- App UI (“Sell dust to Pyre”)
- Automatic fee split from `PyreBatch` → desk
- PYRE fee share routing
- Multi-asset baskets / shares
- On-chain oracle pricing

## Next on this branch

1. Run `forge test` in `contracts/` (needs forge-std).
2. Deploy StockDesk to Robinhood Chain when ready; fund with ETH.
3. List first ticker(s) with conservative `weiPerWhole`.
4. Wire app action on stock+dust rows → `sellDust`.
5. Route a % of cleaner fees to the desk address.

## Open before mainnet desk

- Desk owner key / multisig
- First ticker list + decimals from registry
- Initial `maxPayoutWei` and quote policy
- Whether desk address == fee treasury or a separate wallet
