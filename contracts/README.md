# Pyre contracts

## PyreBatch (Robinhood Chain, chain id 4663)

**Deployed (pre-hardening):** `0x92C5eAaBdaDFF7575c3f19B6ce3f86e8F9b5126B`

The app only uses `collectFee()` for EOAs. Burns/revokes are signed by the user.

### Hardening in this tree (redeploy required)

| Change | Detail |
|--------|--------|
| `clean()` | `onlySelf` — `msg.sender == address(this)` |
| Fee cap | `MAX_PROTOCOL_FEE = 0.01 ether` |
| Ownership | Two-step: `transferOwnership` → `acceptOwnership` |

### Redeploy (Foundry)

```bash
# From repo root, with Foundry installed and RPC + key set
export RH_RPC_URL="https://rpc.robinhood.xyz"   # or your endpoint
export PRIVATE_KEY=0x...                        # deployer (becomes owner)
export TREASURY=0xd456de00cb1b20f90d7f7f2a5a38f211f5bb88d6
export FEE_WEI=500000000000000                  # 0.0005 ETH

forge create contracts/PyreBatch.sol:PyreBatch \
  --rpc-url "$RH_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args "$TREASURY" "$FEE_WEI"
```

Then set `VITE_PYRE_BATCH` on Vercel to the new address and verify on Blockscout.

### Owner ops after deploy

- `setProtocolFee(uint256)` — must be ≤ `MAX_PROTOCOL_FEE`
- `setTreasury(address)`
- `transferOwnership(newOwner)` then `acceptOwnership()` from the new owner

Prefer a multisig as owner and treasury when available.
