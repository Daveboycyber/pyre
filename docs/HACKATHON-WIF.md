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
| `src/lib/web3/wif.ts` | Constants + `payFeeWithWif` (approve + `PyreWifGate.payFee()` at `0x4A5442c781F4ec7f38c080338758f4193287E29E`) |
| Cleaner fee path | If wallet holds ≥ **50 $WIF**, batch fee is paid **in $WIF** on-chain; else ETH via `PyreBatch` |
| UI copy | Review / sign bar explain $WIF fee |

### Flywheel

Users who clean 2+ items need a batch fee → prefer $WIF when held → PyreWifGate burns at least half (80% today) to `0x…dEaD` and sends the rest to the Pyre treasury → demand for $WIF tied to real cleaner usage.

### Fee amount

The fee is the gate's on-chain `feeAmount`: **50 $WIF** today (18 decimals, not oracle-priced). The owner can change it from 0 to 1,000 $WIF. The cleaner reads the live fee on every scan and shows that amount. If the fee goes up between review and signing, the clean stops before anything is signed. Marketing pages show the 50 $WIF default. See [the gate audit](audits/PyreWifGate-2026-11-11.md).

## Deploy

Pushes to `hackathon/wif` → Vercel **Preview**. Use that URL for the submission demo. Keep it live through the final (~16 Nov).

## Still needed before submit

1. Smoke-test: hold 50+ $WIF → batch clean → confirm user −50, `0x…dEaD` +40, treasury +10 and a `WifFeePaid` log  
2. Demo video (scan → multi-select → $WIF fee → burns)  
3. Public repo link + short write-up of the flywheel  
4. Categories: **Stock Tokens** + **tools and infra**  

No Robinhood name/logo in project branding (event rules).
