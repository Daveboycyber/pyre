# Hackathon / $WIF branch

**Branch:** `hackathon/wif`  
**Event:** [World is Flat](https://worldisflat.fun/build) (Robinhood Chain)  
**Deadline:** submissions close **12 Nov 2026, 17:30 UTC**.

## Isolation policy

- Contest track only — do **not** merge into `main` or `phase-2` by default.
- Production (`main`) stays the original cleaner without $WIF.

## $WIF on Robinhood Chain

```
0x5173b8eA6923c2d40267890D45C46a3480954773
```

## What shipped (minimal utility)

| Piece | Behavior |
|-------|----------|
| `src/lib/web3/wif.ts` | Constants + `payFeeWithWif` (ERC-20 transfer to treasury) |
| Cleaner fee path | If wallet holds ≥ **50 $WIF**, batch fee is paid **in $WIF** on-chain; else ETH via `PyreBatch` |
| UI copy | Review / sign bar explain $WIF fee |

### Flywheel

Users who clean 2+ items need a batch fee → prefer $WIF when held → on-chain transfer to Pyre treasury → demand for $WIF tied to real cleaner usage.

### Fee amount

Fixed **50 $WIF** (18 decimals) for hackathon simplicity (not oracle-priced). Override later if needed.

## Deploy

Pushes to `hackathon/wif` → Vercel **Preview**. Use that URL for the submission demo. Keep it live through the final (~16 Nov).

## Still needed before submit

1. Smoke-test: hold 50+ $WIF → batch clean → confirm treasury received $WIF tx  
2. Demo video (scan → multi-select → $WIF fee → burns)  
3. Public repo link + short write-up of the flywheel  
4. Categories: **Stock Tokens** + **tools and infra**  

No Robinhood name/logo in project branding (event rules).
