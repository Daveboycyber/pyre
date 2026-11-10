#!/usr/bin/env bash
# Deploy PyreWifGate to Robinhood Chain mainnet.
# Required: PRIVATE_KEY (deployer becomes owner). Never commit it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export RH_RPC_URL="${RH_RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
export WIF="${WIF:-0x5173b8eA6923c2d40267890D45C46a3480954773}"
export TREASURY="${TREASURY:-0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6}"
export FEE_AMOUNT="${FEE_AMOUNT:-50000000000000000000}"  # 50e18
export BURN_BPS="${BURN_BPS:-8000}"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "Set PRIVATE_KEY (0x…) for the deployer. It becomes owner."
  exit 1
fi

echo "Dry-run simulation first..."
forge script script/DeployPyreWifGate.s.sol:DeployPyreWifGate \
  --rpc-url "$RH_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  -vvv

echo
read -r -p "Broadcast to chain 4663? [y/N] " ans
if [[ "${ans,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

forge script script/DeployPyreWifGate.s.sol:DeployPyreWifGate \
  --rpc-url "$RH_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  -vvv

echo "After deploy: verify on Blockscout, transferOwnership to cold wallet, wire gate address into wif.ts"
