// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title StockDesk
/// @notice Phase 2 buy desk: users sell whitelisted Robinhood Chain stock
///         tokens to Pyre for ETH. Inventory stays in this contract.
///
/// Capital loop (product):
///   Cleaner + PYRE fees → fund this contract (or a dedicated desk wallet that
///   tops it up) → pay users for dust stock → hold inventory for baskets later.
///
/// Non-goals:
///   - Never mints stock tokens.
///   - No oracle dependency in v1 — owner posts wei-per-whole-token quotes.
///   - Fail closed when ETH balance cannot cover the quote.
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract StockDesk {
    address public owner;
    address public pendingOwner;

    bool public paused;

    /// @notice Hard ceiling on a single ETH payout (anti-drain).
    uint256 public maxPayoutWei;

    struct Quote {
        /// @dev ETH wei paid for one whole token (10 ** decimals units).
        uint256 weiPerWhole;
        uint8 decimals;
        bool listed;
    }

    mapping(address => Quote) public quotes;

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error Paused();
    error NotListed();
    error BadQuote();
    error AmountZero();
    error PayoutTooHigh();
    error InsufficientDeskEth();
    error TransferInFailed();
    error TransferOutFailed();
    error EthSendFailed();

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PausedUpdated(bool paused);
    event MaxPayoutUpdated(uint256 maxPayoutWei);
    event QuoteUpdated(address indexed token, uint256 weiPerWhole, uint8 decimals, bool listed);
    event DustSold(
        address indexed seller,
        address indexed token,
        uint256 amount,
        uint256 paidWei
    );
    event EthDeposited(address indexed from, uint256 amount);
    event EthWithdrawn(address indexed to, uint256 amount);
    event InventoryWithdrawn(address indexed token, address indexed to, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(uint256 maxPayoutWei_) {
        if (maxPayoutWei_ == 0) revert BadQuote();
        owner = msg.sender;
        maxPayoutWei = maxPayoutWei_;
        emit OwnershipTransferred(address(0), msg.sender);
        emit MaxPayoutUpdated(maxPayoutWei_);
    }

    // -----------------------------------------------------------------------
    // User
    // -----------------------------------------------------------------------

    /// @notice Sell `amount` of a listed stock token to the desk for ETH.
    /// @dev Caller must `approve` this contract first. Reverts if desk ETH
    ///      cannot cover the quote (fail closed).
    function sellDust(address token, uint256 amount) external returns (uint256 paidWei) {
        if (paused) revert Paused();
        if (amount == 0) revert AmountZero();

        Quote memory q = quotes[token];
        if (!q.listed) revert NotListed();
        if (q.weiPerWhole == 0) revert BadQuote();

        paidWei = (amount * q.weiPerWhole) / (10 ** uint256(q.decimals));
        if (paidWei == 0) revert AmountZero();
        if (paidWei > maxPayoutWei) revert PayoutTooHigh();
        if (address(this).balance < paidWei) revert InsufficientDeskEth();

        // Pull stock first; only then pay ETH.
        if (!IERC20(token).transferFrom(msg.sender, address(this), amount)) {
            revert TransferInFailed();
        }

        (bool ok, ) = payable(msg.sender).call{value: paidWei}("");
        if (!ok) revert EthSendFailed();

        emit DustSold(msg.sender, token, amount, paidWei);
    }

    /// @notice Preview ETH payout for an amount without executing.
    function quotePayout(address token, uint256 amount) external view returns (uint256 paidWei) {
        Quote memory q = quotes[token];
        if (!q.listed || q.weiPerWhole == 0 || amount == 0) return 0;
        paidWei = (amount * q.weiPerWhole) / (10 ** uint256(q.decimals));
        if (paidWei > maxPayoutWei) return 0;
        if (address(this).balance < paidWei) return 0;
    }

    // -----------------------------------------------------------------------
    // Funding (desk treasury)
    // -----------------------------------------------------------------------

    receive() external payable {
        emit EthDeposited(msg.sender, msg.value);
    }

    // -----------------------------------------------------------------------
    // Owner
    // -----------------------------------------------------------------------

    function setPaused(bool next) external onlyOwner {
        paused = next;
        emit PausedUpdated(next);
    }

    function setMaxPayoutWei(uint256 next) external onlyOwner {
        if (next == 0) revert BadQuote();
        maxPayoutWei = next;
        emit MaxPayoutUpdated(next);
    }

    /// @notice List or update a stock token quote. `listed=false` delists.
    function setQuote(
        address token,
        uint256 weiPerWhole,
        uint8 decimals,
        bool listed
    ) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (listed && weiPerWhole == 0) revert BadQuote();
        if (decimals > 18) revert BadQuote();
        quotes[token] = Quote({weiPerWhole: weiPerWhole, decimals: decimals, listed: listed});
        emit QuoteUpdated(token, weiPerWhole, decimals, listed);
    }

    function withdrawEth(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert EthSendFailed();
        emit EthWithdrawn(to, amount);
    }

    /// @notice Move stock inventory out (treasury ops / basket seeding).
    function withdrawInventory(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (!IERC20(token).transfer(to, amount)) revert TransferOutFailed();
        emit InventoryWithdrawn(token, to, amount);
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

    function renounceOwnershipTransfer() external onlyOwner {
        pendingOwner = address(0);
        emit OwnershipTransferStarted(owner, address(0));
    }
}
