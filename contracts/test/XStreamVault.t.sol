// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {XStreamVault} from "../src/XStreamVault.sol";
import {PrincipalToken} from "../src/tokens/PrincipalToken.sol";
import {DividendToken} from "../src/tokens/DividendToken.sol";
import {MockXStock} from "./mocks/MockXStock.sol";

contract XStreamVaultTest is Test {
    bytes32 constant FEED_ID = bytes32(uint256(1));

    XStreamVault public vault;
    MockXStock public xStock;

    address public alice;
    address public bob;

    PrincipalToken public px;
    DividendToken public dx;

    function setUp() public {
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        xStock = new MockXStock("Test XStock", "xTST");
        vault = new XStreamVault();

        (address pxAddr, address dxAddr) = vault.registerAsset(
            address(xStock),
            FEED_ID,
            "Test"
        );
        px = PrincipalToken(pxAddr);
        dx = DividendToken(dxAddr);

        // Mint xStock to test users and approve vault
        xStock.mint(alice, 1000e18);
        xStock.mint(bob, 1000e18);

        vm.prank(alice);
        xStock.approve(address(vault), type(uint256).max);

        vm.prank(bob);
        xStock.approve(address(vault), type(uint256).max);

        // Mint extra xStock to vault so it can pay dividends
        xStock.mint(address(vault), 10_000e18);
    }

    function test_RegisterAsset() public view {
        XStreamVault.AssetConfig memory config = vault.getAssetConfig(address(xStock));
        assertEq(config.principalToken, address(px));
        assertEq(config.dividendToken, address(dx));
        assertEq(config.pythFeedId, FEED_ID);
        assertEq(config.lastMultiplier, 1e18);
        assertEq(config.accDivPerShare, 0);
        assertEq(config.totalDeposited, 0);
        assertEq(config.minDepositAmount, 0);
    }

    function test_RegisterAsset_RevertDuplicate() public {
        vm.expectRevert(XStreamVault.AssetAlreadyRegistered.selector);
        vault.registerAsset(address(xStock), FEED_ID, "Test");
    }

    function test_Deposit() public {
        uint256 amount = 100e18;
        uint256 aliceBefore = xStock.balanceOf(alice);

        vm.prank(alice);
        vault.deposit(address(xStock), amount);

        // xStock transferred from alice to vault
        assertEq(xStock.balanceOf(alice), aliceBefore - amount);
        // px and dx minted 1:1
        assertEq(px.balanceOf(alice), amount);
        assertEq(dx.balanceOf(alice), amount);
        // totalDeposited updated
        XStreamVault.AssetConfig memory config = vault.getAssetConfig(address(xStock));
        assertEq(config.totalDeposited, amount);
    }

    function test_Withdraw() public {
        uint256 depositAmount = 100e18;
        uint256 withdrawAmount = 40e18;

        vm.prank(alice);
        vault.deposit(address(xStock), depositAmount);

        uint256 aliceBefore = xStock.balanceOf(alice);

        vm.prank(alice);
        vault.withdraw(address(xStock), withdrawAmount);

        // xStock returned to alice
        assertEq(xStock.balanceOf(alice), aliceBefore + withdrawAmount);
        // px and dx burned
        assertEq(px.balanceOf(alice), depositAmount - withdrawAmount);
        assertEq(dx.balanceOf(alice), depositAmount - withdrawAmount);
        // totalDeposited updated
        XStreamVault.AssetConfig memory config = vault.getAssetConfig(address(xStock));
        assertEq(config.totalDeposited, depositAmount - withdrawAmount);
    }

    function test_Withdraw_RevertInsufficientBalance() public {
        uint256 depositAmount = 100e18;

        vm.prank(alice);
        vault.deposit(address(xStock), depositAmount);

        // Try to withdraw more than deposited
        vm.prank(alice);
        vm.expectRevert(XStreamVault.InsufficientBalance.selector);
        vault.withdraw(address(xStock), depositAmount + 1);
    }

    function test_DividendAccrual() public {
        uint256 amount = 100e18;

        vm.prank(alice);
        vault.deposit(address(xStock), amount);

        // Increase multiplier: 1e18 -> 1.00117e18
        uint256 newMultiplier = 1.00117e18;
        xStock.setMultiplier(newMultiplier);

        vault.syncDividend(address(xStock));

        XStreamVault.AssetConfig memory config = vault.getAssetConfig(address(xStock));
        // delta = (newMul - lastMul) * totalDeposited / 1e18
        uint256 expectedDelta = (newMultiplier - 1e18) * amount / 1e18;
        // accDivPerShare = delta * 1e36 / totalDeposited
        uint256 expectedAccDiv = expectedDelta * 1e36 / amount;
        assertEq(config.accDivPerShare, expectedAccDiv);
        assertEq(config.lastMultiplier, newMultiplier);

        // Check pending dividend
        uint256 pending = vault.pendingDividend(address(xStock), alice);
        assertEq(pending, expectedDelta);
    }

    function test_ClaimDividend() public {
        uint256 amount = 100e18;

        vm.prank(alice);
        vault.deposit(address(xStock), amount);

        uint256 newMultiplier = 1.00117e18;
        xStock.setMultiplier(newMultiplier);

        uint256 expectedDelta = (newMultiplier - 1e18) * amount / 1e18;
        uint256 aliceBefore = xStock.balanceOf(alice);

        vm.prank(alice);
        vault.claimDividend(address(xStock));

        // Alice receives the dividend in xStock
        assertEq(xStock.balanceOf(alice), aliceBefore + expectedDelta);
        // Pending should be zero after claim
        assertEq(vault.pendingDividend(address(xStock), alice), 0);
    }

    function test_WithdrawAutoClaimsDividend() public {
        uint256 depositAmount = 100e18;
        uint256 withdrawAmount = 50e18;

        vm.prank(alice);
        vault.deposit(address(xStock), depositAmount);

        uint256 newMultiplier = 1.00117e18;
        xStock.setMultiplier(newMultiplier);

        uint256 expectedDelta = (newMultiplier - 1e18) * depositAmount / 1e18;
        uint256 aliceBefore = xStock.balanceOf(alice);

        vm.prank(alice);
        vault.withdraw(address(xStock), withdrawAmount);

        // Alice gets back the withdrawn amount + the accrued dividend
        assertEq(xStock.balanceOf(alice), aliceBefore + withdrawAmount + expectedDelta);
        // Pending should be zero after withdraw
        assertEq(vault.pendingDividend(address(xStock), alice), 0);
    }

    function test_DxTransferClaimsDividends() public {
        uint256 amount = 100e18;

        // Both deposit
        vm.prank(alice);
        vault.deposit(address(xStock), amount);

        vm.prank(bob);
        vault.deposit(address(xStock), amount);

        // Increase multiplier to accrue dividends
        uint256 newMultiplier = 1.002e18;
        xStock.setMultiplier(newMultiplier);

        // Sync so accDivPerShare is updated
        vault.syncDividend(address(xStock));

        uint256 pendingAlice = vault.pendingDividend(address(xStock), alice);
        uint256 pendingBob = vault.pendingDividend(address(xStock), bob);
        assertTrue(pendingAlice > 0, "alice should have pending dividend");
        assertTrue(pendingBob > 0, "bob should have pending dividend");

        uint256 aliceBefore = xStock.balanceOf(alice);
        uint256 bobBefore = xStock.balanceOf(bob);

        // Alice transfers dx tokens to bob -- triggers onDxTransfer
        uint256 transferAmount = 10e18;
        vm.prank(alice);
        dx.transfer(bob, transferAmount);

        // Both should have received their pending dividends
        assertEq(xStock.balanceOf(alice), aliceBefore + pendingAlice);
        assertEq(xStock.balanceOf(bob), bobBefore + pendingBob);

        // Reward debt should be reset -- pending is now zero
        assertEq(vault.pendingDividend(address(xStock), alice), 0);
        assertEq(vault.pendingDividend(address(xStock), bob), 0);
    }

    function test_Pause() public {
        vault.pause();

        vm.prank(alice);
        vm.expectRevert();
        vault.deposit(address(xStock), 100e18);

        vault.unpause();

        vm.prank(alice);
        vault.deposit(address(xStock), 100e18);

        assertEq(px.balanceOf(alice), 100e18);
    }

    function test_SetMinDepositAmount() public {
        uint256 minAmount = 50e18;
        vault.setMinDepositAmount(address(xStock), minAmount);

        // Deposit below min should revert
        vm.prank(alice);
        vm.expectRevert(XStreamVault.MinDepositNotMet.selector);
        vault.deposit(address(xStock), minAmount - 1);

        // Deposit at min should succeed
        vm.prank(alice);
        vault.deposit(address(xStock), minAmount);
        assertEq(px.balanceOf(alice), minAmount);
    }
}
