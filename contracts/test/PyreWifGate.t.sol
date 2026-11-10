// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PyreWifGate} from "../PyreWifGate.sol";

contract MockWif {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract PyreWifGateTest is Test {
    MockWif wif;
    PyreWifGate gate;
    address treasury = makeAddr("treasury");
    address user = makeAddr("user");

    uint256 constant FEE = 50 ether;
    uint256 constant BURN_BPS = 8_000;

    function setUp() public {
        wif = new MockWif();
        gate = new PyreWifGate(address(wif), treasury, FEE, BURN_BPS);
        wif.mint(user, 1_000 ether);
        vm.prank(user);
        wif.approve(address(gate), type(uint256).max);
    }

    function test_payFee_burnsEighty_forwardsTwenty() public {
        vm.prank(user);
        gate.payFee();

        assertEq(wif.balanceOf(user), 950 ether);
        assertEq(wif.balanceOf(gate.BURN()), 40 ether);
        assertEq(wif.balanceOf(treasury), 10 ether);
        assertEq(wif.balanceOf(address(gate)), 0);
    }

    function test_full_burn_when_bps_max() public {
        gate.setBurnBps(10_000);
        vm.prank(user);
        gate.payFee();
        assertEq(wif.balanceOf(gate.BURN()), 50 ether);
        assertEq(wif.balanceOf(treasury), 0);
    }

    function test_min_burn_fifty_fifty() public {
        gate.setBurnBps(5_000);
        vm.prank(user);
        gate.payFee();
        assertEq(wif.balanceOf(gate.BURN()), 25 ether);
        assertEq(wif.balanceOf(treasury), 25 ether);
    }

    function test_owner_cannot_zero_the_burn() public {
        vm.expectRevert(PyreWifGate.BurnOutOfRange.selector);
        gate.setBurnBps(4_999);
    }

    function test_constructor_rejects_zero_wif() public {
        vm.expectRevert(PyreWifGate.ZeroAddress.selector);
        new PyreWifGate(address(0), treasury, FEE, BURN_BPS);
    }

    function test_constructor_rejects_fee_too_high() public {
        vm.expectRevert(PyreWifGate.FeeTooHigh.selector);
        new PyreWifGate(address(wif), treasury, 1_001 ether, BURN_BPS);
    }

    function test_pause_blocks_pay() public {
        gate.setPaused(true);
        vm.prank(user);
        vm.expectRevert(PyreWifGate.Paused.selector);
        gate.payFee();
    }

    function test_stranger_cannot_set_fee() public {
        vm.prank(user);
        vm.expectRevert(PyreWifGate.NotOwner.selector);
        gate.setFeeAmount(1);
    }

    function test_two_step_ownership() public {
        address next = makeAddr("next");
        gate.transferOwnership(next);
        assertEq(gate.pendingOwner(), next);
        assertEq(gate.owner(), address(this));
        vm.prank(next);
        gate.acceptOwnership();
        assertEq(gate.owner(), next);
        assertEq(gate.pendingOwner(), address(0));
    }

    function test_insufficient_allowance_reverts() public {
        address poor = makeAddr("poor");
        wif.mint(poor, FEE);
        // no approve
        vm.prank(poor);
        vm.expectRevert(PyreWifGate.TransferFailed.selector);
        gate.payFee();
    }
}
