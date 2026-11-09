// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PyreWifGate
/// @notice $WIF batch-fee gate for the World is Flat track (`hackathon/wif`).
///
/// Robinhood Chain gas is ETH. This contract does not replace gas.
/// It is the protocol fee for a Pyre batch clean, settled only in $WIF.
///
/// Flywheel, one transaction:
///   1. User approves this contract for `feeAmount`.
///   2. `payFee()` pulls that amount.
///   3. At least `MIN_BURN_BPS` (50%) is sent to the dead address.
///   4. The rest goes to the Pyre treasury.
///   5. `WifFeePaid` is emitted so indexers and judges can see usage.
///
/// Cleaner demand forces users to hold $WIF. Every paid batch permanently
/// reduces supply. The owner cannot turn the burn off.
contract PyreWifGate {
    uint256 public constant BPS = 10_000;
    /// @dev Owner cannot set the burn share below this.
    uint256 public constant MIN_BURN_BPS = 5_000;
    /// @dev 1,000 whole tokens. Assumes 18 decimals, same as $WIF.
    uint256 public constant MAX_FEE = 1_000 ether;
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;

    address public immutable wif;

    address public owner;
    address public pendingOwner;
    address public treasury;
    uint256 public feeAmount;
    uint256 public burnBps;
    bool public paused;

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error FeeTooHigh();
    error BurnOutOfRange();
    error Paused();
    error TransferFailed();

    event WifFeePaid(
        address indexed payer,
        uint256 gross,
        uint256 burned,
        uint256 toTreasury
    );
    event FeeAmountUpdated(uint256 feeAmount);
    event BurnBpsUpdated(uint256 burnBps);
    event TreasuryUpdated(address treasury);
    event PausedSet(bool paused);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address wif_, address treasury_, uint256 feeAmount_, uint256 burnBps_) {
        if (wif_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (feeAmount_ > MAX_FEE) revert FeeTooHigh();
        if (burnBps_ < MIN_BURN_BPS || burnBps_ > BPS) revert BurnOutOfRange();
        wif = wif_;
        owner = msg.sender;
        treasury = treasury_;
        feeAmount = feeAmount_;
        burnBps = burnBps_;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Pull `feeAmount` $WIF from the caller, burn the required share, forward the rest.
    function payFee() external {
        if (paused) revert Paused();
        uint256 gross = feeAmount;
        uint256 burned = (gross * burnBps) / BPS;
        uint256 toTreasury = gross - burned;

        _move(msg.sender, address(this), gross);
        if (burned != 0) _move(address(this), BURN, burned);
        if (toTreasury != 0) _move(address(this), treasury, toTreasury);

        emit WifFeePaid(msg.sender, gross, burned, toTreasury);
    }

    function setFeeAmount(uint256 next) external onlyOwner {
        if (next > MAX_FEE) revert FeeTooHigh();
        feeAmount = next;
        emit FeeAmountUpdated(next);
    }

    function setBurnBps(uint256 next) external onlyOwner {
        if (next < MIN_BURN_BPS || next > BPS) revert BurnOutOfRange();
        burnBps = next;
        emit BurnBpsUpdated(next);
    }

    function setTreasury(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        treasury = next;
        emit TreasuryUpdated(next);
    }

    function setPaused(bool next) external onlyOwner {
        paused = next;
        emit PausedSet(next);
    }

    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        pendingOwner = next;
        emit OwnershipTransferStarted(owner, next);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previous = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previous, msg.sender);
    }

    /// @dev Accepts both standard `bool` returns and tokens that return nothing.
    function _move(address from, address to, uint256 amount) internal {
        bytes memory data = from == address(this)
            ? abi.encodeWithSignature("transfer(address,uint256)", to, amount)
            : abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount);
        (bool ok, bytes memory ret) = wif.call(data);
        if (!ok) revert TransferFailed();
        if (ret.length > 0 && !abi.decode(ret, (bool))) revert TransferFailed();
    }
}
