// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PyreBatch
/// @notice Phase 1 fee gate + try/catch multicall for Robinhood Chain.
///
/// `collectFee()` takes the protocol fee and forwards it to the treasury.
/// `clean(calls)` does the same, then runs each call independently so one
/// revert does not unwind the rest of the batch or the fee.
///
/// Burns and approval revokes must execute as the user. Use `clean` when this
/// code runs in the user's account (EIP-7702 or a smart account). EOAs that
/// cannot delegate call `collectFee` first, then sign each burn/revoke from
/// the wallet — the app refuses to start those lines if the fee tx reverts.
contract PyreBatch {
    address public owner;
    address payable public treasury;
    uint256 public protocolFee;

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    error InsufficientFee();
    error NotOwner();
    error FeeTransferFailed();
    error ZeroAddress();

    event FeePaid(address indexed payer, uint256 amount);
    event CallFailed(uint256 index, bytes reason);
    event ProtocolFeeUpdated(uint256 fee);
    event TreasuryUpdated(address treasury);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address payable treasury_, uint256 protocolFee_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        treasury = treasury_;
        protocolFee = protocolFee_;
    }

    /// @notice Pay the flat batch fee with no calls. Used by EOA wallets
    ///         before they sign individual burns/revokes.
    function collectFee() public payable {
        _takeFee();
    }

    /// @notice Take the fee, then execute each call with try/catch semantics.
    ///         The fee is charged once even if some calls fail.
    function clean(Call[] calldata calls) external payable {
        _takeFee();
        for (uint256 i = 0; i < calls.length; i++) {
            (bool ok, bytes memory reason) = calls[i].target.call{
                value: calls[i].value
            }(calls[i].data);
            if (!ok) emit CallFailed(i, reason);
        }
    }

    function _takeFee() internal {
        if (msg.value < protocolFee) revert InsufficientFee();
        uint256 fee = protocolFee;
        (bool ok, ) = treasury.call{value: fee}("");
        if (!ok) revert FeeTransferFailed();
        emit FeePaid(msg.sender, fee);
        uint256 refund = msg.value - fee;
        if (refund > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: refund}("");
            if (!refunded) revert FeeTransferFailed();
        }
    }

    function setProtocolFee(uint256 next) external onlyOwner {
        protocolFee = next;
        emit ProtocolFeeUpdated(next);
    }

    function setTreasury(address payable next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        treasury = next;
        emit TreasuryUpdated(next);
    }

    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        owner = next;
    }

    receive() external payable {
        collectFee();
    }
}
