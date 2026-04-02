// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IXStreamVault} from "./interfaces/IXStreamVault.sol";

contract DxLeaseEscrow is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum ListingStatus {
        None,
        OpenAuction,
        ActiveLease,
        Expired,
        Cancelled,
        ClaimedBack
    }

    struct Listing {
        address seller;
        address dxToken;
        address xStock;
        uint256 amount;
        uint256 basePrice;
        uint64 auctionEnd;
        uint64 leaseDuration;
        uint64 leaseStart;
        uint64 leaseEnd;
        address activeLessee;
        address highestBidder;
        uint256 highestBid;
        ListingStatus status;
    }

    IXStreamVault public immutable vault;
    IERC20 public immutable usdc;
    uint256 public immutable minBidIncrement;

    uint256 public nextListingId = 1;

    mapping(uint256 => Listing) private listings;
    mapping(address => uint256) public refundableBalance;
    mapping(address => uint256) public activeListingByDxToken;

    error InvalidAmount();
    error InvalidDuration();
    error UnsupportedDxToken();
    error ExistingListingForDxToken();
    error ListingNotFound();
    error ListingNotOpen();
    error BidTooLow();
    error AuctionStillActive();
    error AuctionAlreadyEnded();
    error ListingNotReclaimable();
    error NotSeller();
    error NoRefundAvailable();
    error ListingNotActive();
    error CannotCancelAfterBid();

    event AuctionOpened(
        uint256 indexed listingId,
        address indexed seller,
        address indexed dxToken,
        address xStock,
        uint256 amount,
        uint256 basePrice,
        uint256 auctionEnd,
        uint256 leaseDuration
    );
    event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount);
    event AuctionFinalized(
        uint256 indexed listingId,
        address indexed seller,
        address indexed winner,
        uint256 winningBid,
        uint256 leaseStart,
        uint256 leaseEnd
    );
    event AuctionExpired(uint256 indexed listingId);
    event AuctionCancelled(uint256 indexed listingId);
    event RefundWithdrawn(address indexed bidder, uint256 amount);
    event DividendDistributed(uint256 indexed listingId, address indexed beneficiary, uint256 amount);
    event DxReclaimed(uint256 indexed listingId, address indexed seller, uint256 amount);

    constructor(address vault_, address usdc_, uint256 minBidIncrement_)
        Ownable(msg.sender)
    {
        vault = IXStreamVault(vault_);
        usdc = IERC20(usdc_);
        minBidIncrement = minBidIncrement_;
    }

    function openAuction(
        address dxToken,
        uint256 amount,
        uint256 basePrice,
        uint256 auctionDuration,
        uint256 leaseDuration
    ) external whenNotPaused nonReentrant returns (uint256 listingId) {
        if (amount == 0 || basePrice == 0) revert InvalidAmount();
        if (auctionDuration == 0 || leaseDuration == 0) revert InvalidDuration();

        address xStock = vault.dxToXStock(dxToken);
        if (xStock == address(0)) revert UnsupportedDxToken();
        if (activeListingByDxToken[dxToken] != 0) revert ExistingListingForDxToken();

        listingId = nextListingId++;
        activeListingByDxToken[dxToken] = listingId;

        listings[listingId] = Listing({
            seller: msg.sender,
            dxToken: dxToken,
            xStock: xStock,
            amount: amount,
            basePrice: basePrice,
            auctionEnd: uint64(block.timestamp + auctionDuration),
            leaseDuration: uint64(leaseDuration),
            leaseStart: 0,
            leaseEnd: 0,
            activeLessee: address(0),
            highestBidder: address(0),
            highestBid: 0,
            status: ListingStatus.OpenAuction
        });

        IERC20(dxToken).safeTransferFrom(msg.sender, address(this), amount);

        emit AuctionOpened(
            listingId,
            msg.sender,
            dxToken,
            xStock,
            amount,
            basePrice,
            block.timestamp + auctionDuration,
            leaseDuration
        );
    }

    function placeBid(uint256 listingId, uint256 amount) external whenNotPaused nonReentrant {
        Listing storage listing = _getListingStorage(listingId);
        _refreshStatus(listingId, listing);

        if (listing.status != ListingStatus.OpenAuction) revert ListingNotOpen();
        if (block.timestamp >= listing.auctionEnd) revert AuctionAlreadyEnded();

        uint256 minimumBid = listing.highestBid == 0
            ? listing.basePrice
            : listing.highestBid + minBidIncrement;
        if (amount < minimumBid) revert BidTooLow();

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        if (listing.highestBidder != address(0)) {
            refundableBalance[listing.highestBidder] += listing.highestBid;
        }

        listing.highestBidder = msg.sender;
        listing.highestBid = amount;

        emit BidPlaced(listingId, msg.sender, amount);
    }

    function finalizeAuction(uint256 listingId) external whenNotPaused nonReentrant {
        Listing storage listing = _getListingStorage(listingId);
        _refreshStatus(listingId, listing);

        if (listing.status != ListingStatus.OpenAuction) revert ListingNotOpen();
        if (block.timestamp < listing.auctionEnd) revert AuctionStillActive();

        if (listing.highestBidder == address(0)) {
            listing.status = ListingStatus.Expired;
            emit AuctionExpired(listingId);
            return;
        }

        listing.status = ListingStatus.ActiveLease;
        listing.activeLessee = listing.highestBidder;
        listing.leaseStart = uint64(block.timestamp);
        listing.leaseEnd = uint64(block.timestamp + listing.leaseDuration);

        usdc.safeTransfer(listing.seller, listing.highestBid);

        emit AuctionFinalized(
            listingId,
            listing.seller,
            listing.activeLessee,
            listing.highestBid,
            listing.leaseStart,
            listing.leaseEnd
        );
    }

    function cancelAuction(uint256 listingId) external nonReentrant {
        Listing storage listing = _getListingStorage(listingId);
        if (listing.seller != msg.sender) revert NotSeller();
        if (listing.status != ListingStatus.OpenAuction) revert ListingNotOpen();
        if (listing.highestBidder != address(0)) revert CannotCancelAfterBid();

        listing.status = ListingStatus.Cancelled;
        activeListingByDxToken[listing.dxToken] = 0;

        IERC20(listing.dxToken).safeTransfer(listing.seller, listing.amount);

        emit AuctionCancelled(listingId);
    }

    function withdrawRefund() external nonReentrant {
        uint256 amount = refundableBalance[msg.sender];
        if (amount == 0) revert NoRefundAvailable();

        refundableBalance[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);

        emit RefundWithdrawn(msg.sender, amount);
    }

    function claimAndDistribute(uint256 listingId) external nonReentrant returns (uint256 claimed) {
        Listing storage listing = _getListingStorage(listingId);
        _refreshStatus(listingId, listing);

        if (listing.status == ListingStatus.ClaimedBack || listing.status == ListingStatus.Cancelled) {
            revert ListingNotActive();
        }

        address beneficiary = _beneficiaryFor(listing);
        uint256 balanceBefore = IERC20(listing.xStock).balanceOf(address(this));
        vault.claimDividend(listing.xStock);
        uint256 balanceAfter = IERC20(listing.xStock).balanceOf(address(this));
        claimed = balanceAfter - balanceBefore;

        if (claimed > 0) {
            IERC20(listing.xStock).safeTransfer(beneficiary, claimed);
            emit DividendDistributed(listingId, beneficiary, claimed);
        }
    }

    function reclaimDx(uint256 listingId) external nonReentrant {
        Listing storage listing = _getListingStorage(listingId);
        _refreshStatus(listingId, listing);

        if (listing.seller != msg.sender) revert NotSeller();
        if (listing.status != ListingStatus.Expired) revert ListingNotReclaimable();

        listing.status = ListingStatus.ClaimedBack;
        activeListingByDxToken[listing.dxToken] = 0;

        IERC20(listing.dxToken).safeTransfer(listing.seller, listing.amount);

        emit DxReclaimed(listingId, listing.seller, listing.amount);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _getListingView(listingId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _beneficiaryFor(Listing storage listing) internal view returns (address) {
        if (
            listing.status == ListingStatus.ActiveLease
                && block.timestamp >= listing.leaseStart
                && block.timestamp < listing.leaseEnd
        ) {
            return listing.activeLessee;
        }

        return listing.seller;
    }

    function _refreshStatus(uint256 listingId, Listing storage listing) internal {
        if (listing.status == ListingStatus.ActiveLease && block.timestamp >= listing.leaseEnd) {
            listing.status = ListingStatus.Expired;
            emit AuctionExpired(listingId);
        }
    }

    function _getListingStorage(uint256 listingId) internal view returns (Listing storage listing) {
        listing = listings[listingId];
        if (listing.seller == address(0)) revert ListingNotFound();
    }

    function _getListingView(uint256 listingId) internal view returns (Listing memory listing) {
        listing = listings[listingId];
        if (listing.seller == address(0)) revert ListingNotFound();
    }
}
