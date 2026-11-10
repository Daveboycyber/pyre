// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PyreWifGate} from "../PyreWifGate.sol";

/// @notice Deploy PyreWifGate on Robinhood Chain (4663).
/// Env:
///   WIF         default 0x5173b8eA6923c2d40267890D45C46a3480954773
///   TREASURY    default 0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6 (live PyreBatch treasury)
///   FEE_AMOUNT  default 50e18
///   BURN_BPS    default 8000
contract DeployPyreWifGate is Script {
    address constant DEFAULT_WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address constant DEFAULT_TREASURY = 0xD456De00CB1b20F90D7F7F2A5A38F211f5BB88d6;

    function run() external {
        address wif = vm.envOr("WIF", DEFAULT_WIF);
        address treasury = vm.envOr("TREASURY", DEFAULT_TREASURY);
        uint256 feeAmount = vm.envOr("FEE_AMOUNT", uint256(50 ether));
        uint256 burnBps = vm.envOr("BURN_BPS", uint256(8_000));

        console2.log("wif", wif);
        console2.log("treasury", treasury);
        console2.log("feeAmount", feeAmount);
        console2.log("burnBps", burnBps);

        vm.startBroadcast();
        PyreWifGate gate = new PyreWifGate(wif, treasury, feeAmount, burnBps);
        vm.stopBroadcast();

        console2.log("PyreWifGate", address(gate));
        console2.log("owner", gate.owner());
    }
}
