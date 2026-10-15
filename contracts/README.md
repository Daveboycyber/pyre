# PyreBatch

The on-chain fee gate for [Pyre](../README.md) on **Robinhood Chain (chain id 4663)**.

PyreBatch does one job today: it collects Pyre's flat batch fee in ETH and forwards it to the treasury in the same transaction. It never holds user funds, never holds token approvals, and never touches a user's tokens. Every burn and revoke is a separate transaction the user signs from their own wallet.

---

## Deployments

| | Address | Status |
|---|---|---|
| **PyreBatch (hardened)** | [`0xcB157e4D7035F9a38b9e0B92b89E544e378c1490`](https://robinhoodchain.blockscout.com/address/0xcB157e4D7035F9a38b9e0B92b89E544e378c1490) | **Live**. Used by the app |
| PyreBatch (original) | [`0x92C5eAaBdaDFF7575c3f19B6ce3f86e8F9b5126B`](https://robinhoodchain.blockscout.com/address/0x92C5eAaBdaDFF7575c3f19B6ce3f86e8F9b5126B) | Retired. Do not use |

### Live configuration

Read from the chain on 2026-10-15:

| Setting | Value |
|---|---|
| `protocolFee` | `500000000000000` wei (**0.0005 ETH**) |
| `MAX_PROTOCOL_FEE` | `10000000000000000` wei (**0.01 ETH**), hard-coded |
| `treasury` | [`0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6`](https://robinhoodchain.blockscout.com/address/0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6) |
| `owner` | `0x88A0fE4b665fAdA92268F8a7b941837836dAa944` |
| `pendingOwner` | none |

### Build settings

The deployed runtime bytecode matches [`PyreBatch.sol`](PyreBatch.sol) **byte for byte** (excluding the metadata hash) when compiled with:

| | |
|---|---|
| Compiler | `solc 0.8.37` |
| Optimizer | **off** |
| EVM version | compiler default |

See [Verify the deployment](#verify-the-deployment) to reproduce this check.

---

## How the app uses it

```
User clicks "Sign 7 actions"
  │
  ├─ 1. app reads protocolFee() on-chain
  │      └─ if it is higher than the fee shown on screen, the app stops (never overcharges)
  │
  ├─ 2. wallet signs collectFee() with value = protocolFee
  │      └─ PyreBatch forwards the fee to the treasury and refunds any excess
  │      └─ if this reverts, no burns start and nothing is charged
  │
  └─ 3. wallet signs each burn / revoke directly against the token contract
```

- Single actions are free. The fee only applies to batches of 2+ actions.
- The fee is read from the contract at sign time. The `VITE_PYRE_FEE_WEI` env value is only what the UI shows before that read.
- The frontend address lives in [`src/lib/web3/fees.ts`](../src/lib/web3/fees.ts) (`LIVE_PYRE_BATCH`) and can be overridden with `VITE_PYRE_BATCH`.

---

## Interface

### User functions

| Function | Who | What it does |
|---|---|---|
| `collectFee()` payable | anyone | Requires `msg.value >= protocolFee`. Sends `protocolFee` to `treasury`, refunds the rest to the caller, emits `FeePaid`. |
| `receive()` | anyone | Plain ETH transfers behave exactly like `collectFee()`. |
| `clean(Call[] calls)` payable | **only the contract itself** | Takes the fee, then runs each call and emits `CallFailed` for any that revert. Reserved for a future smart-account / EIP-7702 flow. See [Security model](#security-model). |

### Owner functions

| Function | Notes |
|---|---|
| `setProtocolFee(uint256)` | Reverts with `FeeTooHigh` above `MAX_PROTOCOL_FEE`. |
| `setTreasury(address payable)` | Reverts with `ZeroAddress` for `address(0)`. |
| `transferOwnership(address)` | Step 1 of 2. Sets `pendingOwner`. |
| `acceptOwnership()` | Step 2 of 2. Must be called by `pendingOwner`. |
| `renounceOwnershipTransfer()` | Cancels a pending transfer. |

### Events

| Event | When |
|---|---|
| `FeePaid(address indexed payer, uint256 amount)` | Every successful fee payment |
| `CallFailed(uint256 index, bytes reason)` | A call inside `clean()` reverted |
| `ProtocolFeeUpdated(uint256 fee)` | Fee changed |
| `TreasuryUpdated(address treasury)` | Treasury changed |
| `OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)` | Transfer started. Also emitted with `newOwner = 0` on cancel |
| `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)` | Deploy, and on `acceptOwnership` |

### Errors

`InsufficientFee` · `NotOwner` · `NotPendingOwner` · `NotSelf` · `FeeTransferFailed` · `ZeroAddress` · `FeeTooHigh`

---

## Security model

**What holds:**

- **No custody.** The contract keeps no balance. Each payment is forwarded and any excess refunded in the same call.
- **No approval risk.** `clean()` only runs when `msg.sender == address(this)`, so a shared deployment can never be used to move other people's tokens through approvals they granted.
- **Bounded fee.** The owner cannot set the fee above 0.01 ETH, and the app never sends more than the fee the user was shown.
- **Fee changes cannot overcharge.** If the owner raises the fee while a user's transaction is pending, that transaction reverts with `InsufficientFee` because the app sends the exact amount. If the owner lowers it, the difference is refunded.
- **Reentrancy.** A caller re-entering through the refund must pay again. Nothing can be withdrawn.
- **Two-step ownership** prevents handing the contract to a mistyped address.

**Known limitations** (none affect the current `collectFee()` flow):

| # | Area | Detail |
|---|---|---|
| 1 | EIP-7702 path (not used yet) | Under 7702 delegation the code runs on the user's own storage, where `protocolFee`, `treasury` and `owner` are all zero. No fee would be collected, and `receive()` would bounce every incoming ETH transfer back to its sender. **Do not delegate a wallet to this contract.** The 7702 flow needs its own implementation with constants and a plain `receive()`. |
| 2 | Treasury setting | `setTreasury` accepts the contract's own address. Doing so makes every fee payment recurse and revert, which blocks all batch cleans until it is changed back. Treat it as an owner mistake to avoid. |
| 3 | Key management | `owner` and `treasury` are currently single-key wallets (EOAs). A multisig for both is recommended before significant volume. |
| 4 | Treasury liveness | If the treasury is a contract that rejects ETH, every fee payment reverts and batch cleans stop. Single, free actions still work. |

To report a vulnerability, see [SECURITY.md](../SECURITY.md). Please do not open a public issue.

---

## Verify the deployment

Anyone can confirm that the live contract is this source:

```bash
RPC=https://rpc.mainnet.chain.robinhood.com
ADDR=0xcB157e4D7035F9a38b9e0B92b89E544e378c1490

# Bytecode on chain
cast code $ADDR --rpc-url $RPC > onchain.hex

# Bytecode from source (same settings as the deploy)
forge inspect contracts/PyreBatch.sol:PyreBatch deployedBytecode --use 0.8.37 > local.hex

# Compare everything before the CBOR metadata (starts at "a264697066")
python3 - <<'PY'
strip = lambda h: h.strip()[2:].split("a264697066")[0]
print("MATCH" if strip(open("onchain.hex").read()) == strip(open("local.hex").read()) else "DIFFERENT")
PY

# Live settings
cast call $ADDR "protocolFee()(uint256)" --rpc-url $RPC
cast call $ADDR "treasury()(address)"    --rpc-url $RPC
cast call $ADDR "owner()(address)"       --rpc-url $RPC
```

---

## Deploy

Requires [Foundry](https://book.getfoundry.sh). Build with the same settings as above (solc 0.8.37, optimizer off) so the bytecode stays reproducible.

```bash
export RH_RPC_URL="https://rpc.mainnet.chain.robinhood.com"
export PRIVATE_KEY=0x...      # deployer, becomes owner. Never commit this
export TREASURY=0x...         # must not be address(0) or the contract itself
export FEE_WEI=500000000000000  # 0.0005 ETH, must be <= 0.01 ETH

forge create contracts/PyreBatch.sol:PyreBatch \
  --use 0.8.37 \
  --rpc-url "$RH_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --constructor-args "$TREASURY" "$FEE_WEI"
```

**After deploying:**

1. Verify the source on [Blockscout](https://robinhoodchain.blockscout.com).
2. Run the [verification steps](#verify-the-deployment) against the new address.
3. Update `LIVE_PYRE_BATCH` in `src/lib/web3/fees.ts`, or set `VITE_PYRE_BATCH` on Vercel.
4. Move ownership to a multisig with `transferOwnership` → `acceptOwnership`.
5. Update the [Deployments](#deployments) table in this file.

## Owner operations

```bash
# Change the fee (wei, max 0.01 ETH)
cast send $ADDR "setProtocolFee(uint256)" 400000000000000 --rpc-url $RPC --private-key $OWNER_KEY

# Change the treasury
cast send $ADDR "setTreasury(address)" 0xNEW_TREASURY --rpc-url $RPC --private-key $OWNER_KEY

# Hand over ownership (two steps)
cast send $ADDR "transferOwnership(address)" 0xNEW_OWNER --rpc-url $RPC --private-key $OWNER_KEY
cast send $ADDR "acceptOwnership()"                      --rpc-url $RPC --private-key $NEW_OWNER_KEY
```

A fee change takes effect immediately. Users with a transaction already in flight are protected: a higher fee reverts their transaction instead of charging more.
