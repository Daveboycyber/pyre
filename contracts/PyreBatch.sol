// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PyreBatch
/// @notice Fee gate for Pyre on Robinhood Chain (+ optional self-executed multicall).
///
/// EOA path (current app):
///   1. User calls `collectFee()` once for a batch.
///   2. User signs each burn/revoke from their own wallet.
///
/// Smart-account / EIP-7702 path (future):
///   When this bytecode is the *user's* account, `clean(calls)` may run
///   because `msg.sender == address(this)`. It is NOT callable by third
///   parties on a shared deployment — that would allow draining approvals.
contract PyreBatch {
    /// @notice Hard ceiling for protocolFee (constructor + setProtocolFee).
    uint256 public constant MAX_PROTOCOL_FEE = 0.01 ether;

    address public owner;
    address public pendingOwner;
    address payable public treasury;
    uint256 public protocolFee;

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    error InsufficientFee();
    error NotOwner();
    error NotPendingOwner();
    error NotSelf();
    error FeeTransferFailed();
    error ZeroAddress();
    error FeeTooHigh();

    event FeePaid(address indexed payer, uint256 amount);
    event CallFailed(uint256 index, bytes reason);
    event ProtocolFeeUpdated(uint256 fee);
    event TreasuryUpdated(address treasury);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev EIP-7702 / smart-account self-execution only.
    modifier onlySelf() {
        if (msg.sender != address(this)) revert NotSelf();
        _;
    }

    constructor(address payable treasury_, uint256 protocolFee_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        if (protocolFee_ > MAX_PROTOCOL_FEE) revert FeeTooHigh();
        owner = msg.sender;
        treasury = treasury_;
        protocolFee = protocolFee_;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Pay the flat batch fee with no calls. Used by EOA wallets
    ///         before they sign individual burns/revokes.
    function collectFee() public payable {
        _takeFee();
    }

    /// @notice Self-only multicall after taking the fee.
    /// @dev Restricted to `msg.sender == address(this)` so a shared deployment
    ///      cannot be used to drain approvals via arbitrary calls.
    function clean(Call[] calldata calls) external payable onlySelf {
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
        if (next > MAX_PROTOCOL_FEE) revert FeeTooHigh();
        protocolFee = next;
        emit ProtocolFeeUpdated(next);
    }

    function setTreasury(address payable next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        treasury = next;
        emit TreasuryUpdated(next);
    }

    /// @notice Begin two-step ownership transfer. `next` must call `acceptOwnership`.
    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        pendingOwner = next;
        emit OwnershipTransferStarted(owner, next);
    }

    /// @notice Complete ownership transfer. Only the pending owner may accept.
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previous = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previous, msg.sender);
    }

    /// @notice Cancel a pending ownership transfer.
    function renounceOwnershipTransfer() external onlyOwner {
        pendingOwner = address(0);
        emit OwnershipTransferStarted(owner, address(0));
    }

    receive() external payable {
        collectFee();
    }
}
