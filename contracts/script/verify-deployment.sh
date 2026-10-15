#!/usr/bin/env bash
# Checks the live PyreBatch against this repo:
#   1. deployed runtime bytecode == contracts/PyreBatch.sol (metadata stripped)
#   2. live fee is within the hard cap and the treasury is set
# Usage: contracts/script/verify-deployment.sh [address] [rpc]
set -euo pipefail

ADDR="${1:-0xcB157e4D7035F9a38b9e0B92b89E544e378c1490}"
RPC="${2:-${RH_RPC_URL:-https://rpc.mainnet.chain.robinhood.com}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

strip_metadata() { tr -d '\n' | sed -E 's/^0x//; s/a264697066.*$//'; }

cast code "$ADDR" --rpc-url "$RPC" | strip_metadata > "$TMP/onchain"
(cd "$ROOT" && forge inspect PyreBatch.sol:PyreBatch deployedBytecode) | strip_metadata > "$TMP/local"

if [[ ! -s "$TMP/onchain" ]]; then
  echo "::error::No code at $ADDR"; exit 1
fi
if ! cmp -s "$TMP/onchain" "$TMP/local"; then
  echo "::error::Deployed bytecode at $ADDR does not match contracts/PyreBatch.sol"; exit 1
fi
echo "Bytecode matches source."

FEE="$(cast call "$ADDR" "protocolFee()(uint256)" --rpc-url "$RPC" | awk '{print $1}')"
CAP="$(cast call "$ADDR" "MAX_PROTOCOL_FEE()(uint256)" --rpc-url "$RPC" | awk '{print $1}')"
TREASURY="$(cast call "$ADDR" "treasury()(address)" --rpc-url "$RPC")"
OWNER="$(cast call "$ADDR" "owner()(address)" --rpc-url "$RPC")"
PENDING="$(cast call "$ADDR" "pendingOwner()(address)" --rpc-url "$RPC")"

echo "protocolFee  $FEE (cap $CAP)"
echo "treasury     $TREASURY"
echo "owner        $OWNER"
echo "pendingOwner $PENDING"

if [[ "$TREASURY" == "0x0000000000000000000000000000000000000000" ]] || [[ "${TREASURY,,}" == "${ADDR,,}" ]]; then
  echo "::error::Treasury is unset or points at the contract itself"; exit 1
fi
if (( FEE > CAP )); then
  echo "::error::protocolFee is above the cap"; exit 1
fi
if [[ "$PENDING" != "0x0000000000000000000000000000000000000000" ]]; then
  echo "::warning::An ownership transfer is pending to $PENDING"
fi
echo "Live settings look sane."
