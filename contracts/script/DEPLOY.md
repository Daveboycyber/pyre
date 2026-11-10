# Deploy PyreWifGate (Robinhood Chain 4663)

**Not deployed yet.** Local suite: `forge test` → **10/10 pass**.

## Constructor args

| Arg | Value |
|---|---|
| `wif_` | `0x5173b8eA6923c2d40267890D45C46a3480954773` |
| `treasury_` | `0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6` (same as live PyreBatch) |
| `feeAmount_` | `50000000000000000000` (50 $WIF) |
| `burnBps_` | `8000` (80% burn / 20% treasury) |

Live checks (2026-11-10): `$WIF.decimals() == 18`, symbol `WIF`, name `World is Flat`. Chain id **4663**.

## Prerequisites

1. Foundry installed (`forge`, `cast`)
2. Deployer funded with ETH on Robinhood Chain for gas
3. `PRIVATE_KEY` for deployer (becomes `owner`)

## Option A — forge script

```bash
cd contracts
export PRIVATE_KEY=0x...
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
./script/deploy-wif-gate.sh
```

## Option B — forge create

```bash
forge create PyreWifGate.sol:PyreWifGate \
  --use 0.8.37 \
  --rpc-url https://rpc.mainnet.chain.robinhood.com \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --constructor-args \
    0x5173b8eA6923c2d40267890D45C46a3480954773 \
    0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6 \
    50000000000000000000 \
    8000
```

## After deploy

1. Record the gate address.
2. Verify source on https://robinhoodchain.blockscout.com
3. `transferOwnership` → cold/multisig → `acceptOwnership`
4. Smoke: approve gate + `payFee()` from a wallet holding ≥50 $WIF; confirm user −50, dead +40, treasury +10, and `WifFeePaid`
5. Point the app at the gate (replace the raw treasury transfer in `src/lib/web3/wif.ts`)
