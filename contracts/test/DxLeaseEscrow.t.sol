// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {XStreamVault} from "../src/XStreamVault.sol";
import {DxLeaseEscrow} from "../src/DxLeaseEscrow.sol";
import {DividendToken} from "../src/tokens/DividendToken.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockXStock} from "./mocks/MockXStock.sol";

contract DxLeaseEscrowTest is Test {
    bytes32 constant AAPL_FEED = bytes32(uint256(1));
    bytes32 constant SPY_FEED = bytes32(uint256(2));

    XStreamVault internal vault;
    DxLeaseEscrow internal escrow;
    MockUSDC internal usdc;
    MockXStock internal xAAPL;
    MockXStock internal xSPY;
    DividendToken internal dxAAPL;
    DividendToken internal dxSPY;

    address internal seller;
    address internal alice;
    address internal bob;

    function setUp() public {
        seller = makeAddr("seller");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        vault = new XStreamVault();
        usdc = new MockUSDC();
        xAAPL = new MockXStock("Dinari xAAPL", "xAAPL");
        xSPY = new MockXStock("Dinari xSPY", "xSPY");

        (, address dxAAPLAddr) = vault.registerAsset(address(xAAPL), AAPL_FEED, "AAPLx");
        (, address dxSPYAddr) = vault.registerAsset(address(xSPY), SPY_FEED, "SPYx");
        dxAAPL = DividendToken(dxAAPLAddr);
        dxSPY = DividendToken(dxSPYAddr);

        escrow = new DxLeaseEscrow(address(vault), address(usdc), 1e6);

        xAAPL.mint(seller, 10_000e18);
        xSPY.mint(seller, 10_000e18);
        xAAPL.mint(address(vault), 10_000e18);
        xSPY.mint(address(vault), 10_000e18);

        usdc.mint(alice, 1_000_000e6);
        usdc.mint(bob, 1_000_000e6);

        vm.startPrank(seller);
        xAAPL.approve(address(vault), type(uint256).max);
        xSPY.approve(address(vault), type(uint256).max);
        vault.deposit(address(xAAPL), 1_000e18);
        vault.deposit(address(xSPY), 1_000e18);
        dxAAPL.approve(address(escrow), type(uint256).max);
        dxSPY.approve(address(escrow), type(uint256).max);
        vm.stopPrank();

        vm.prank(alice);
        usdc.approve(address(escrow), type(uint256).max);

        vm.prank(bob);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function test_OpenListingLocksDxAndStoresTerms() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        DxLeaseEscrow.Listing memory listing = escrow.getListing(listingId);
        assertEq(listing.seller, seller);
        assertEq(listing.dxToken, address(dxAAPL));
        assertEq(listing.xStock, address(xAAPL));
        assertEq(listing.amount, 500e18);
        assertEq(listing.basePrice, 1_000e6);
        assertEq(listing.leaseDuration, 7 days);
        assertEq(uint256(listing.status), uint256(DxLeaseEscrow.ListingStatus.OpenAuction));
        assertEq(dxAAPL.balanceOf(address(escrow)), 500e18);
        assertEq(dxAAPL.balanceOf(seller), 500e18);
    }

    function test_BidBelowBasePriceReverts() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        vm.prank(alice);
        vm.expectRevert(DxLeaseEscrow.BidTooLow.selector);
        escrow.placeBid(listingId, 999e6);
    }

    function test_HigherBidReplacesOldBidderAndRefundsViaWithdrawal() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        vm.prank(alice);
        escrow.placeBid(listingId, 1_000e6);

        vm.prank(bob);
        escrow.placeBid(listingId, 1_001e6);

        assertEq(escrow.refundableBalance(alice), 1_000e6);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        escrow.withdrawRefund();
        assertEq(usdc.balanceOf(alice), aliceBefore + 1_000e6);
        assertEq(escrow.refundableBalance(alice), 0);
    }

    function test_FinalizeWithoutBidsAllowsSellerReclaim() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        vm.warp(block.timestamp + 1 days + 1);
        escrow.finalizeAuction(listingId);

        DxLeaseEscrow.Listing memory listing = escrow.getListing(listingId);
        assertEq(uint256(listing.status), uint256(DxLeaseEscrow.ListingStatus.Expired));

        vm.prank(seller);
        escrow.reclaimDx(listingId);
        assertEq(dxAAPL.balanceOf(seller), 1_000e18);
    }

    function test_FinalizeWithWinnerPaysSellerAndStartsLease() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        vm.prank(alice);
        escrow.placeBid(listingId, 1_000e6);

        uint256 sellerBefore = usdc.balanceOf(seller);
        vm.warp(block.timestamp + 1 days + 1);
        escrow.finalizeAuction(listingId);

        DxLeaseEscrow.Listing memory listing = escrow.getListing(listingId);
        assertEq(usdc.balanceOf(seller), sellerBefore + 1_000e6);
        assertEq(listing.activeLessee, alice);
        assertEq(uint256(listing.status), uint256(DxLeaseEscrow.ListingStatus.ActiveLease));
        assertEq(listing.leaseEnd, listing.leaseStart + 7 days);
    }

    function test_ClaimDuringActiveLeaseForwardsDividendToLessee() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        vm.prank(alice);
        escrow.placeBid(listingId, 1_000e6);

        vm.warp(block.timestamp + 1 days + 1);
        escrow.finalizeAuction(listingId);

        xAAPL.setMultiplier(1_002_000_000_000_000_000);

        uint256 aliceBefore = xAAPL.balanceOf(alice);
        uint256 claimed = escrow.claimAndDistribute(listingId);

        assertEq(claimed, 1e18);
        assertEq(xAAPL.balanceOf(alice), aliceBefore + 1e18);
    }

    function test_ClaimAfterLeaseEndForwardsDividendToSeller() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        vm.prank(alice);
        escrow.placeBid(listingId, 1_000e6);

        vm.warp(block.timestamp + 1 days + 1);
        escrow.finalizeAuction(listingId);

        vm.warp(block.timestamp + 7 days + 1);
        xAAPL.setMultiplier(1_002_000_000_000_000_000);

        uint256 sellerBefore = xAAPL.balanceOf(seller);
        uint256 claimed = escrow.claimAndDistribute(listingId);

        assertEq(claimed, 1e18);
        assertEq(xAAPL.balanceOf(seller), sellerBefore + 1e18);
        assertEq(
            uint256(escrow.getListing(listingId).status),
            uint256(DxLeaseEscrow.ListingStatus.Expired)
        );
    }

    function test_SellerCannotReclaimDuringActiveLease() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        vm.prank(alice);
        escrow.placeBid(listingId, 1_000e6);

        vm.warp(block.timestamp + 1 days + 1);
        escrow.finalizeAuction(listingId);

        vm.prank(seller);
        vm.expectRevert(DxLeaseEscrow.ListingNotReclaimable.selector);
        escrow.reclaimDx(listingId);
    }

    function test_SellerCanReclaimAfterExpiredLease() public {
        uint256 listingId = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        vm.prank(alice);
        escrow.placeBid(listingId, 1_000e6);

        vm.warp(block.timestamp + 1 days + 1);
        escrow.finalizeAuction(listingId);

        vm.warp(block.timestamp + 7 days + 1);

        vm.prank(seller);
        escrow.reclaimDx(listingId);
        assertEq(dxAAPL.balanceOf(seller), 1_000e18);
    }

    function test_LockingDxPreservesSellerPendingDividendBeforeTransfer() public {
        xAAPL.setMultiplier(1_002_000_000_000_000_000);
        vault.syncDividend(address(xAAPL));

        uint256 sellerBefore = xAAPL.balanceOf(seller);

        _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);

        assertEq(xAAPL.balanceOf(seller), sellerBefore + 2e18);
        assertEq(vault.pendingDividend(address(xAAPL), seller), 0);
    }

    function test_MultipleListingsForDifferentDxTokensDoNotCrossContaminate() public {
        uint256 aaplListing = _openListing(address(dxAAPL), 500e18, 1_000e6, 1 days, 7 days);
        uint256 spyListing = _openListing(address(dxSPY), 400e18, 2_000e6, 1 days, 5 days);

        vm.prank(alice);
        escrow.placeBid(aaplListing, 1_000e6);

        vm.prank(bob);
        escrow.placeBid(spyListing, 2_000e6);

        vm.warp(block.timestamp + 1 days + 1);
        escrow.finalizeAuction(aaplListing);
        escrow.finalizeAuction(spyListing);

        xAAPL.setMultiplier(1_002_000_000_000_000_000);
        xSPY.setMultiplier(1_003_000_000_000_000_000);

        uint256 aliceBefore = xAAPL.balanceOf(alice);
        uint256 bobBefore = xSPY.balanceOf(bob);

        uint256 aaplClaim = escrow.claimAndDistribute(aaplListing);
        uint256 spyClaim = escrow.claimAndDistribute(spyListing);

        assertEq(aaplClaim, 1e18);
        assertEq(spyClaim, 1.2e18);
        assertEq(xAAPL.balanceOf(alice), aliceBefore + 1e18);
        assertEq(xSPY.balanceOf(bob), bobBefore + 1.2e18);
    }

    function _openListing(
        address dxToken,
        uint256 amount,
        uint256 basePrice,
        uint256 auctionDuration,
        uint256 leaseDuration
    ) internal returns (uint256) {
        vm.prank(seller);
        return escrow.openAuction(dxToken, amount, basePrice, auctionDuration, leaseDuration);
    }
}
