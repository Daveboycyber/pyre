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

    function transfer(address to, uint256 amount) external virtual returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external virtual returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// Returns false instead of reverting. `failTransfer` fails only the gate's
/// outgoing transfers, so the pull succeeds and the burn step fails.
contract FalseWif is MockWif {
    bool public failTransferFrom = true;
    bool public failTransfer = true;

    function setFailures(bool transferFrom_, bool transfer_) external {
        failTransferFrom = transferFrom_;
        failTransfer = transfer_;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        if (failTransfer) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        if (failTransferFrom) return false;
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// USDT-style token: transfer and transferFrom return no data.
contract NoReturnWif {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external {
        allowance[msg.sender][spender] = amount;
    }

    function transfer(address to, uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }

    function transferFrom(address from, address to, uint256 amount) external {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
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

    function test_constructor_rejects_burn_below_floor() public {
        vm.expectRevert(PyreWifGate.BurnOutOfRange.selector);
        new PyreWifGate(address(wif), treasury, FEE, 4_999);
    }

    function test_constructor_rejects_burn_above_max() public {
        vm.expectRevert(PyreWifGate.BurnOutOfRange.selector);
        new PyreWifGate(address(wif), treasury, FEE, 10_001);
    }

    function test_constructor_rejects_zero_treasury() public {
        vm.expectRevert(PyreWifGate.ZeroAddress.selector);
        new PyreWifGate(address(wif), address(0), FEE, BURN_BPS);
    }

    function test_setFeeAmount_max_ok_and_above_reverts() public {
        gate.setFeeAmount(gate.MAX_FEE());
        assertEq(gate.feeAmount(), 1_000 ether);

        uint256 tooHigh = gate.MAX_FEE() + 1;
        vm.expectRevert(PyreWifGate.FeeTooHigh.selector);
        gate.setFeeAmount(tooHigh);
        assertEq(gate.feeAmount(), 1_000 ether);
    }

    function test_token_returning_false_on_pull_reverts() public {
        FalseWif bad = new FalseWif();
        PyreWifGate g = new PyreWifGate(address(bad), treasury, FEE, BURN_BPS);
        bad.mint(user, FEE);
        vm.prank(user);
        bad.approve(address(g), FEE);

        vm.prank(user);
        vm.expectRevert(PyreWifGate.TransferFailed.selector);
        g.payFee();
        assertEq(bad.balanceOf(user), FEE);
    }

    function test_token_returning_false_on_burn_reverts_whole_fee() public {
        FalseWif bad = new FalseWif();
        bad.setFailures(false, true);
        PyreWifGate g = new PyreWifGate(address(bad), treasury, FEE, BURN_BPS);
        bad.mint(user, FEE);
        vm.prank(user);
        bad.approve(address(g), FEE);

        vm.prank(user);
        vm.expectRevert(PyreWifGate.TransferFailed.selector);
        g.payFee();
        // The pull is rolled back too: the user keeps everything.
        assertEq(bad.balanceOf(user), FEE);
        assertEq(bad.balanceOf(address(g)), 0);
        assertEq(bad.allowance(user, address(g)), FEE);
    }

    function test_token_with_no_return_data_works() public {
        NoReturnWif quiet = new NoReturnWif();
        PyreWifGate g = new PyreWifGate(address(quiet), treasury, FEE, BURN_BPS);
        quiet.mint(user, FEE);
        vm.prank(user);
        quiet.approve(address(g), FEE);

        vm.prank(user);
        g.payFee();
        assertEq(quiet.balanceOf(user), 0);
        assertEq(quiet.balanceOf(g.BURN()), 40 ether);
        assertEq(quiet.balanceOf(treasury), 10 ether);
        assertEq(quiet.balanceOf(address(g)), 0);
    }

    function test_token_with_no_return_data_still_reverts_on_failure() public {
        NoReturnWif quiet = new NoReturnWif();
        PyreWifGate g = new PyreWifGate(address(quiet), treasury, FEE, BURN_BPS);
        quiet.mint(user, FEE);
        // no approve: transferFrom underflows and reverts with no return data

        vm.prank(user);
        vm.expectRevert(PyreWifGate.TransferFailed.selector);
        g.payFee();
    }

    function test_third_account_cannot_accept_ownership() public {
        address next = makeAddr("next");
        address stranger = makeAddr("stranger");
        gate.transferOwnership(next);

        vm.prank(stranger);
        vm.expectRevert(PyreWifGate.NotPendingOwner.selector);
        gate.acceptOwnership();
        assertEq(gate.owner(), address(this));
        assertEq(gate.pendingOwner(), next);
    }
}
