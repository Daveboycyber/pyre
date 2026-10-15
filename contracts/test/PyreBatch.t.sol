// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PyreBatch} from "../PyreBatch.sol";

contract Rejecter {
    receive() external payable {
        revert();
    }
}

contract Reenterer {
    PyreBatch internal immutable batch;
    uint256 public calls;

    constructor(PyreBatch batch_) {
        batch = batch_;
    }

    function pay() external payable {
        batch.collectFee{value: msg.value}();
    }

    receive() external payable {
        if (calls++ == 0) batch.collectFee{value: msg.value}();
    }
}

contract PyreBatchTest is Test {
    PyreBatch internal batch;
    address payable internal constant TREASURY = payable(address(0xBEEF));
    uint256 internal constant FEE = 0.0005 ether;

    function setUp() public {
        batch = new PyreBatch(TREASURY, FEE);
    }

    // --- fee collection ---------------------------------------------------

    function test_collectFee_forwardsExactFee() public {
        batch.collectFee{value: FEE}();
        assertEq(TREASURY.balance, FEE);
        assertEq(address(batch).balance, 0, "contract never holds funds");
    }

    function test_collectFee_refundsExcess() public {
        address user = address(0xA11CE);
        vm.deal(user, 1 ether);
        vm.prank(user);
        batch.collectFee{value: 0.1 ether}();
        assertEq(user.balance, 1 ether - FEE);
        assertEq(TREASURY.balance, FEE);
    }

    function test_collectFee_revertsWhenUnderpaid() public {
        vm.expectRevert(PyreBatch.InsufficientFee.selector);
        batch.collectFee{value: FEE - 1}();
    }

    function test_receive_behavesLikeCollectFee() public {
        (bool ok,) = address(batch).call{value: FEE}("");
        assertTrue(ok);
        assertEq(TREASURY.balance, FEE);
    }

    function test_feeRaise_revertsExactPayerInsteadOfOvercharging() public {
        batch.setProtocolFee(FEE * 2);
        vm.expectRevert(PyreBatch.InsufficientFee.selector);
        batch.collectFee{value: FEE}();
    }

    function testFuzz_collectFee_neverKeepsFunds(uint96 paid) public {
        vm.assume(paid >= FEE);
        address user = address(0xF00D);
        vm.deal(user, paid);
        vm.prank(user);
        batch.collectFee{value: paid}();
        assertEq(address(batch).balance, 0);
        assertEq(TREASURY.balance, FEE);
        assertEq(user.balance, uint256(paid) - FEE);
    }

    // --- access control ---------------------------------------------------

    function test_clean_onlySelf() public {
        vm.expectRevert(PyreBatch.NotSelf.selector);
        batch.clean{value: FEE}(new PyreBatch.Call[](0));
    }

    function test_feeCap() public {
        uint256 cap = batch.MAX_PROTOCOL_FEE();
        vm.expectRevert(PyreBatch.FeeTooHigh.selector);
        batch.setProtocolFee(cap + 1);
    }

    function test_ownerOnly() public {
        vm.prank(address(1));
        vm.expectRevert(PyreBatch.NotOwner.selector);
        batch.setProtocolFee(0);
    }

    function test_treasuryCannotBeZero() public {
        vm.expectRevert(PyreBatch.ZeroAddress.selector);
        batch.setTreasury(payable(address(0)));
    }

    function test_twoStepOwnership() public {
        batch.transferOwnership(address(7));
        assertEq(batch.owner(), address(this), "owner unchanged until accepted");

        vm.prank(address(8));
        vm.expectRevert(PyreBatch.NotPendingOwner.selector);
        batch.acceptOwnership();

        vm.prank(address(7));
        batch.acceptOwnership();
        assertEq(batch.owner(), address(7));
        assertEq(batch.pendingOwner(), address(0));
    }

    // --- adversarial ------------------------------------------------------

    function test_reentrancy_mustPayAgain() public {
        Reenterer attacker = new Reenterer(batch);
        attacker.pay{value: 2 * FEE}();
        assertEq(TREASURY.balance, 2 * FEE, "re-entry paid a second fee");
        assertEq(address(batch).balance, 0);
    }

    function test_rejectingTreasury_blocksFees() public {
        batch.setTreasury(payable(address(new Rejecter())));
        vm.expectRevert(PyreBatch.FeeTransferFailed.selector);
        batch.collectFee{value: FEE}();
    }

    function test_rejectingPayer_cannotOverpay() public {
        Rejecter payer = new Rejecter();
        vm.deal(address(payer), 1 ether);
        vm.prank(address(payer));
        vm.expectRevert(PyreBatch.FeeTransferFailed.selector);
        batch.collectFee{value: FEE + 1}();
    }

    // --- documented limitations (contracts/README.md "Known limitations") --

    /// Limitation 2: treasury == contract makes every fee payment recurse and revert.
    function test_limitation_selfTreasuryBlocksFees() public {
        batch.setTreasury(payable(address(batch)));
        vm.expectRevert();
        batch.collectFee{value: FEE}();
    }

    /// Limitation 1: under 7702-style delegation storage is empty, so no fee is
    /// collected and incoming ETH is bounced back to the sender.
    function test_limitation_7702DelegationBouncesEth() public {
        address wallet = address(0xC0FFEE);
        vm.etch(wallet, address(batch).code);
        assertEq(PyreBatch(payable(wallet)).protocolFee(), 0);

        address sender = address(0x5E4D);
        vm.deal(sender, 1 ether);
        vm.prank(sender);
        (bool ok,) = wallet.call{value: 0.3 ether}("");
        assertTrue(ok);
        assertEq(wallet.balance, 0, "wallet received nothing");
        assertEq(sender.balance, 1 ether, "ETH bounced back");
    }
}
