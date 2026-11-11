# PyreWifGate audit (2026-11-11)

Internal review of the $WIF batch-fee gate and its app wiring on `hackathon/wif`. It answers the questions in the pre-deploy audit brief (commit `d049ddc`) and checks the live deployment.

| | |
|---|---|
| Contract | `contracts/PyreWifGate.sol`, unchanged since `d049ddc` |
| Live address | `0x4A5442c781F4ec7f38c080338758f4193287E29E` (Robinhood Chain, 4663) |
| Deploy tx | `0xb05cab6275c9a59a306f3aac81d0b40fb95e8c51cc7b1931ba28eaaa9cf7902a` (block 111297070) |
| App wiring reviewed | `src/lib/web3/wif.ts` and `use-wallet-cleaner.ts` at `26de339` |
| Token | $WIF `0x5173b8eA6923c2d40267890D45C46a3480954773` |

The brief says "not deployed". That is out of date: the gate is live and `26de339` points the app at it.

## Method

- **Bytecode.** Built locally with the repo's `foundry.toml` (solc 0.8.37, optimizer off). The live runtime code (with the `wif` immutable masked) and the deploy transaction's init code match the build byte for byte, CBOR metadata included. Constructor args decode to `wif = 0x5173…4773`, `treasury = 0xD456…88d6`, `feeAmount = 50e18`, `burnBps = 8000`.
- **Live state** (block ~111.43M): `feeAmount = 50e18`, `burnBps = 8000`, `paused = false`, `pendingOwner = 0x0`, gate $WIF balance 0. Owner is `0xf2159eCDEb837ae34f637dA3AFd29Eb52e5566b6`, an EOA (the deployer). The treasury is an EOA.
- **Token.** Read the $WIF runtime bytecode and probed it with `eth_call`. Blockscout's API is behind Cloudflare and was not reachable from the review machine, so the verified-source check was not done.
- **Tests.** `forge test --match-contract PyreWifGate`: the original suite passed 10/10. This PR adds the 9 cases the brief asked for, and the suite now passes 19/19 (see [Contract tests added](#contract-tests-added)).
- **Fork run.** Anvil fork of chain 4663, impersonating a real $WIF holder:
  - `payFee()` without an approval reverts with `TransferFailed()` (`0x90b8ec18`).
  - Approving 50 $WIF then calling `payFee()` gives user −50, `0x…dEaD` +40, treasury +10 and gate 0, with 4 logs (3 Transfer and `WifFeePaid`). It used 85,994 gas.
  - `totalSupply` is unchanged after the payment.
  - With the owner fee raised to 1,000 $WIF, a holder who approved `type(uint256).max` paid 1,000 $WIF in one call.
  - With `burnBps = 5000` and `treasury = gate`, 25 $WIF stayed in the gate with no way out.

## Answers to the brief

1. **Does live $WIF accept a transfer to `0x…dEaD`?** Yes. `transfer(0x…dEaD, 1)` returns `true` in simulation, and that address already holds about 116.6k $WIF. Only a transfer to `0x0` reverts (`ERC20InvalidReceiver`).
2. **Is the low-level call safe for that token?** Yes. $WIF is OpenZeppelin v5 `ERC20` with `ERC20Burnable`: `transfer` and `transferFrom` return `true` and revert with OZ custom errors on failure. Its runtime code has no `CALL`, `DELEGATECALL`, `STATICCALL` or `CREATE` opcodes. So there are no transfer hooks, no blacklist checks against an outside contract, and no way to re-enter `payFee`. The extra getters (`curve`, `launchFactory`, `deployer`, `socials`, `logo`, `description`, `getTokenInfo`) are read-only. `_move` handles it correctly.
3. **Is the 50% burn floor strict enough?** It is enforced in the constructor and in `setBurnBps`, and tested. The level itself is a product choice.
4. **Is the missing rescue function acceptable?** Yes for a contest contract. See finding 5 for the one way funds can get stuck.

## Findings

| # | Severity | Area | Finding | Status |
|---|---|---|---|---|
| 1 | High | App | **The cleaner showed a static fee, not the real one.** The gate's `feeAmount` is the fee, and `payFeeWithWif` correctly paid it. But the cleaner UI printed a hardcoded "50 $WIF" label, so if the owner changed the fee (0 to 1,000 $WIF), users would sign for an amount they were never shown. That breaks the `AGENTS.md` rule "never charge more than the user saw". | **Fixed in this PR**: the cleaner now reads and shows the live gate fee |
| 2 | High | Ops | **The owner is still the hot deployer EOA.** The checklist step to hand ownership to a cold wallet or multisig hasn't been done. That key can raise the fee to 1,000 $WIF (charging any max-approval holder who calls `payFee`), redirect up to 50% of each fee, or pause. | **Open.** Run `transferOwnership(cold)`, then `acceptOwnership()` from the cold wallet. |
| 3 | Medium | App | **The fallback to ETH could charge twice.** Any $WIF failure fell through to the ETH fee. If `payFee` was sent but the receipt wait threw, the user could pay both. The fallback also fired when the user declined in the wallet. | **Fixed in this PR** |
| 4 | Low | Contract / copy | **Sending to `0x…dEaD` removes tokens from circulation but leaves `totalSupply` unchanged**, even though $WIF has a real `burn(uint256)`. The NatSpec line "permanently reduces supply" overstates it. | Open. A future version could call `burn()`. Copy should say "removed from circulation". |
| 5 | Low | Contract | **The gate can strand fees.** `setTreasury` accepts the gate's own address, which leaves the treasury share stuck forever. $WIF sent to the gate directly is also stuck. | Open. A future version should reject `treasury == address(this)`. |
| 6 | Low | Contract | **`payFee()` takes no maximum fee**, so a wallet with an unlimited approval pays whatever the fee is when the call lands. | Open. Covered in the app by exact approvals and the check against the fee shown at review. A future version could take `payFee(uint256 maxFee)`. |
| 7 | Low | Copy | **The fee row, review hint, FAQ and hackathon doc still said the whole fee goes to the treasury.** | **Fixed in this PR** |
| 8 | Low | App | **`wif.ts` had no tests**, and `readWifFeeAmount` quietly fell back to the static 50 when the read failed. | **Fixed in this PR** |
| 9 | Info | Contract | **Zero-fee events.** Only possible if the owner sets `feeAmount = 0`. Then anyone can call `payFee()` for free and emit `WifFeePaid(payer, 0, 0, 0)`. No funds move and no one loses anything; the only effect is that a naive count of paid batches (for example on a stats page or for judges) could be inflated. At the live 50 $WIF, every event costs the caller a real 50 $WIF. | Note. Count only events with `gross > 0`, and don't set the fee to 0 |
| 10 | Info | Docs | **The brief is out of date.** It says "not deployed" and compiler 0.8.24 (the build uses 0.8.37 with the `^0.8.24` pragma). `contracts/script/DEPLOY.md` also still said "not deployed". | DEPLOY.md **fixed in this PR**; the brief is a separate document |

No path was found for a third party to take user funds through the gate. The contract matches its spec.

## What this PR changes

- **The live gate fee is the fee.** The cleaner reads `feeAmount` from the gate on every scan and shows it everywhere it shows the $WIF fee: the review hint, confirm dialog, sign button, signing row, result panel and tx list. "50 $WIF" remains only as static copy on the marketing pages and in demo mode.
- `payFeeWithWif` pays the live fee and takes `shownFee`, the value read at scan and shown at review. If the owner raised the fee after the user reviewed it, it throws `WifFeeError` before anything is signed (the same rule `resolveBatchFee` applies to ETH). It checks once before signing and again right before `payFee`, after the approve lands. Approvals are for exactly the live fee, so a raise between the re-check and inclusion makes `payFee` revert instead of overcharging. A lower fee is paid as is.
- `canPayWif` compares the balance with the live fee, not the static 50. If the fee can't be read, the clean uses the ETH fee path.
- `readWifFeeAmount` throws on a failed read instead of assuming 50.
- If `payFee` is sent but the receipt can't be confirmed, it throws `WifFeeError` with the tx hash, and the clean stops.
- `wifFeeFallback(err)` decides between `"eth"` and `"stop"`. A wallet rejection or a `WifFeeError` stops the clean. Low balance, read failures, failed simulations and mined reverts (which charged nothing) still fall back to ETH.
- `actionErrorMessage` shows `WifFeeError` messages as-is.
- Copy now says at least half the fee is burned and the rest goes to the treasury.
- `src/lib/web3/wif.test.ts` adds 12 tests covering these paths, including paying a live fee other than 50.
- `contracts/test/PyreWifGate.t.sol` adds the 9 contract tests listed below. `contracts/PyreWifGate.sol` is unchanged, so the live bytecode match still holds.
- `contracts/script/DEPLOY.md` now records the live address and the 19/19 test count.

## Contract tests added

The brief listed these as missing. They are now in `contracts/test/PyreWifGate.t.sol`, and all 19 tests pass.

| Brief item | Test | What it checks |
|---|---|---|
| Constructor `burnBps` of 4999 | `test_constructor_rejects_burn_below_floor` | Reverts with `BurnOutOfRange` |
| Constructor `burnBps` of 10001 | `test_constructor_rejects_burn_above_max` | Reverts with `BurnOutOfRange` |
| Constructor with a zero treasury | `test_constructor_rejects_zero_treasury` | Reverts with `ZeroAddress` |
| `setFeeAmount(MAX_FEE)` ok, `MAX_FEE + 1` reverts | `test_setFeeAmount_max_ok_and_above_reverts` | 1,000 $WIF is accepted, 1,000 $WIF + 1 wei reverts with `FeeTooHigh`, and the stored fee stays at 1,000 |
| Token returns `false` | `test_token_returning_false_on_pull_reverts` | `transferFrom` returning `false` reverts with `TransferFailed`; the user keeps their balance |
| Token returns `false` | `test_token_returning_false_on_burn_reverts_whole_fee` | The pull succeeds but the burn `transfer` returns `false`, so the whole call reverts: user balance, allowance and gate balance are all unchanged |
| Token returns no data | `test_token_with_no_return_data_works` | A USDT-style token with no return value still splits 40 / 10 and leaves the gate at 0 |
| Token returns no data | `test_token_with_no_return_data_still_reverts_on_failure` | A failing pull with no return data still reverts with `TransferFailed` |
| Third account calls `acceptOwnership()` | `test_third_account_cannot_accept_ownership` | Reverts with `NotPendingOwner`; owner and pending owner are unchanged |

The PyreBatch suite (16 tests) still passes.
