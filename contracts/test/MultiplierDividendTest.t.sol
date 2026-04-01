// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {XStreamVault}  from "../src/XStreamVault.sol";
import {MockXStock}    from "./mocks/MockXStock.sol";

/// @title  MultiplierDividendTest
/// @notice Tests the xStock multiplier-based dividend distribution mechanism
///         in XStreamVault in full depth.
///
/// Background
/// ----------
/// Dinari xStocks represent tokenised real-world equities.  When the underlying
/// stock pays a dividend (or undergoes a corporate action), Dinari increases the
/// xStock contract's `multiplier` value.  The vault reads this delta and converts
/// it into xStock payouts to dxToken holders.
///
/// Multiplier math
/// ---------------
///   delta  = (newMultiplier - lastMultiplier) * totalDeposited / 1e18
///          = exact extra xStock owed to all dxToken holders combined
///
///   accDivPerShare += delta * 1e36 / totalDeposited
///                  = (newMultiplier - lastMultiplier) * 1e18   [simplifies]
///
///   pendingDividend(user) = dxBalance * accDivPerShare / 1e36 - rewardDebt
///                         = dxBalance * (newMultiplier - lastMultiplier) / 1e18
///
/// In plain English: "for every 1 xStock you deposited, you earn
///   (multiplierIncrease / 1e18) xStock as dividend."
///
/// Tests
/// -----
///   1. test_singleDividendExactMath
///      Verifies the dividend amount is exactly `dxBalance * delta / 1e18`.
///      Vault xStock balance decreases by the exact claimed amount.
///
///   2. test_lateDepositorGetsNoPriorDividend
///      Bob deposits AFTER a dividend event.  Bob's rewardDebt is set to the
///      current accDivPerShare so he gets nothing from past dividends.
///      A subsequent dividend distributes only the new increment to Bob.
///
///   3. test_multipleDividendsAccumulate
///      Three sequential multiplier increases.  User does NOT claim between them.
///      One final claim pays the sum of all three dividends in a single call.
///
///   4. test_vaultBalanceSufficiency
///      Total xStock paid by the vault after N dividends equals exactly
///      sum(multiplierDelta_i) * totalDeposited / 1e18.  Vault must hold
///      enough xStock to cover all payouts.
///
///   5. test_dividendOnWithdraw
///      When a user calls withdraw(), the vault auto-claims pending dividends
///      before burning px+dx and returning xStock.  The returned xStock amount
///      includes both the principal AND the dividend.
contract MultiplierDividendTest is Test {
    address deployer;
    address alice;
    address bob;
    address charlie;

    MockXStock   xAAPL;
    XStreamVault vault;
    address      pxAAPL;
    address      dxAAPL;

    bytes32 constant FEED = bytes32(uint256(1));

    function setUp() public {
        deployer = makeAddr("deployer");
        alice    = makeAddr("alice");
        bob      = makeAddr("bob");
        charlie  = makeAddr("charlie");

        vm.startPrank(deployer);
        xAAPL = new MockXStock("Dinari xAAPL", "xAAPL");
        vault = new XStreamVault();
        (pxAAPL, dxAAPL) = vault.registerAsset(address(xAAPL), FEED, "xAAPL");

        // Mint xAAPL to actors
        xAAPL.mint(alice,   100_000e18);
        xAAPL.mint(bob,     100_000e18);
        xAAPL.mint(charlie, 100_000e18);

        // Vault needs a xAAPL float to pay out dividends when they are claimed.
        // In production Dinari would supply this; here we pre-fund the vault.
        xAAPL.mint(address(vault), 10_000e18);
        vm.stopPrank();
    }

    // =========================================================================
    // Test 1: Single dividend -- exact math end-to-end
    //
    //   Alice deposits 1,000 xAAPL.
    //   AAPL pays a 0.5% dividend -> multiplier 1e18 -> 1.005e18.
    //   Expected payout: 1,000 * 0.005 = 5 xAAPL.
    //   Vault xAAPL balance must decrease by exactly 5 xAAPL after claim.
    // =========================================================================

    function test_singleDividendExactMath() public {
        console.log("==============================================");
        console.log("  Test 1: Single Dividend -- Exact Math");
        console.log("==============================================");

        // --- Deposit ---
        _deposit(alice, 1_000e18);

        uint256 startMultiplier = xAAPL.multiplier(); // 1e18
        assertEq(vault.pendingDividend(address(xAAPL), alice), 0, "No pending before dividend");

        // --- Corporate action: AAPL pays 0.5% dividend ---
        uint256 newMultiplier  = 1_005_000_000_000_000_000; // 1.005e18
        uint256 delta          = newMultiplier - startMultiplier; // 5e15

        vm.startPrank(deployer);
        xAAPL.setMultiplier(newMultiplier);
        uint256 syncedDelta = vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        // delta returned by syncDividend = multiplierDelta * totalDeposited / 1e18
        //   = 5e15 * 1000e18 / 1e18 = 5e18 = 5 xAAPL (total owed to all holders)
        uint256 expectedTotalDelta = delta * 1_000e18 / 1e18; // 5e18
        assertEq(syncedDelta, expectedTotalDelta, "syncDividend must return total xStock owed");

        // Per-user pending = dxBalance * delta / 1e18 = 1000e18 * 5e15 / 1e18 = 5e18
        uint256 expectedAlice = 1_000e18 * delta / 1e18;
        uint256 alicePending  = vault.pendingDividend(address(xAAPL), alice);

        console.log("\n  Multiplier: 1.000 -> 1.005 (+0.5%)");
        console.log("  Alice dxAAPL:       1,000");
        console.log("  Expected dividend:  ", expectedAlice, "(5 xAAPL)");
        console.log("  Actual pending:     ", alicePending);

        assertEq(alicePending, expectedAlice, "Pending dividend mismatch");

        // --- Claim ---
        uint256 vaultBefore = xAAPL.balanceOf(address(vault));
        uint256 aliceBefore = xAAPL.balanceOf(alice);

        vm.prank(alice);
        uint256 claimed = vault.claimDividend(address(xAAPL));

        uint256 vaultAfter = xAAPL.balanceOf(address(vault));
        uint256 aliceAfter = xAAPL.balanceOf(alice);

        console.log("\n  Alice claimed:              ", claimed);
        console.log("  Vault xAAPL decreased by:   ", vaultBefore - vaultAfter);
        console.log("  Alice xAAPL increased by:   ", aliceAfter - aliceBefore);

        assertEq(claimed, expectedAlice,              "Claimed amount must match expected");
        assertEq(claimed, aliceAfter - aliceBefore,   "Alice balance increased by claimed");
        assertEq(claimed, vaultBefore - vaultAfter,   "Vault paid out exactly the claimed amount");
        assertEq(vault.pendingDividend(address(xAAPL), alice), 0, "No pending after claim");

        console.log("\n  Dividend exact math [VERIFIED]");
    }

    // =========================================================================
    // Test 2: Late depositor gets no prior dividends (rewardDebt protection)
    //
    //   Event sequence:
    //     Alice deposits 1,000 xAAPL.
    //     Dividend 1 (+0.5%) fires.  Alice accumulates 5 xAAPL.
    //     Bob deposits 500 xAAPL  <-- AFTER dividend 1.
    //     Bob's rewardDebt is set to current accDivPerShare -> pending = 0.
    //     Dividend 2 (+0.3%) fires.
    //     Alice gets 1000 * 0.003 = 3 xAAPL from dividend 2 (plus prior 5 unclaimed).
    //     Bob gets   500  * 0.003 = 1.5 xAAPL from dividend 2 only.
    //     Bob gets NOTHING from dividend 1 (was not yet deposited).
    // =========================================================================

    function test_lateDepositorGetsNoPriorDividend() public {
        console.log("==============================================");
        console.log("  Test 2: Late Depositor -- rewardDebt Guard");
        console.log("==============================================");

        // Alice deposits before dividend
        _deposit(alice, 1_000e18);

        // Dividend 1: +0.5%
        uint256 m1    = 1_005_000_000_000_000_000;
        uint256 d1    = m1 - 1e18; // 5e15
        vm.startPrank(deployer);
        xAAPL.setMultiplier(m1);
        vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        uint256 alicePendingD1 = vault.pendingDividend(address(xAAPL), alice);
        assertEq(alicePendingD1, 1_000e18 * d1 / 1e18, "Alice should have 5 xAAPL pending");

        console.log("\n  Dividend 1 (+0.5%) fired before Bob joins");
        console.log("  Alice pending: ", alicePendingD1, "(5 xAAPL)");

        // Bob deposits AFTER dividend 1
        _deposit(bob, 500e18);

        uint256 bobPendingAfterDeposit = vault.pendingDividend(address(xAAPL), bob);
        assertEq(bobPendingAfterDeposit, 0,
            "Bob deposited after dividend 1 -- must have zero pending");

        console.log("  Bob deposits 500 xAAPL AFTER dividend 1");
        console.log("  Bob pending immediately after deposit:", bobPendingAfterDeposit, "(must be 0)");

        // Dividend 2: +0.3% (multiplier 1.005 -> 1.008)
        uint256 m2    = 1_008_000_000_000_000_000;
        uint256 d2    = m2 - m1; // 3e15
        vm.startPrank(deployer);
        xAAPL.setMultiplier(m2);
        vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        uint256 alicePendingD2 = vault.pendingDividend(address(xAAPL), alice);
        uint256 bobPendingD2   = vault.pendingDividend(address(xAAPL), bob);

        // Alice: unclaimed d1 + new d2 = 5 + 3 = 8 xAAPL
        uint256 expAlice = 1_000e18 * d1 / 1e18 + 1_000e18 * d2 / 1e18;
        // Bob: ONLY d2 (not d1) = 500 * 0.003 = 1.5 xAAPL
        uint256 expBob   = 500e18 * d2 / 1e18;

        console.log("\n  Dividend 2 (+0.3%) fired");
        console.log("  Alice pending (d1+d2):", alicePendingD2, "== 8 xAAPL");
        console.log("  Bob   pending (d2 only):", bobPendingD2,  "== 1.5 xAAPL");
        console.log("  Bob gets ZERO from dividend 1 [key invariant]");

        assertEq(alicePendingD2, expAlice, "Alice pending must be sum of both dividends");
        assertEq(bobPendingD2,   expBob,   "Bob pending must be dividend 2 only");

        // Verify Bob cannot claim d1 amount even if he tries
        uint256 bobXBefore = xAAPL.balanceOf(bob);
        vm.prank(bob);
        vault.claimDividend(address(xAAPL));
        uint256 bobClaimed = xAAPL.balanceOf(bob) - bobXBefore;

        assertEq(bobClaimed, expBob, "Bob receives only his portion of dividend 2");
        console.log("\n  Bob claimed:", bobClaimed, "xAAPL (1.5 xAAPL, d2 only) [VERIFIED]");
    }

    // =========================================================================
    // Test 3: Multiple sequential dividends accumulate without intermediate claim
    //
    //   Three quarterly dividends fire back-to-back (+0.5%, +0.4%, +0.6%).
    //   Alice never claims between them.
    //   Her final pending = 1,000 * (0.005 + 0.004 + 0.006) = 15 xAAPL.
    //   One claimDividend() call collects all three in one shot.
    // =========================================================================

    function test_multipleDividendsAccumulate() public {
        console.log("==============================================");
        console.log("  Test 3: Multiple Dividends -- Accumulate");
        console.log("==============================================");

        _deposit(alice, 1_000e18);

        // Q1 dividend: +0.5%
        uint256 m1 = 1_005_000_000_000_000_000;
        vm.startPrank(deployer); xAAPL.setMultiplier(m1); vault.syncDividend(address(xAAPL)); vm.stopPrank();

        // Q2 dividend: +0.4%  (1.005 -> 1.009)
        uint256 m2 = 1_009_000_000_000_000_000;
        vm.startPrank(deployer); xAAPL.setMultiplier(m2); vault.syncDividend(address(xAAPL)); vm.stopPrank();

        // Q3 dividend: +0.6%  (1.009 -> 1.015)
        uint256 m3 = 1_015_000_000_000_000_000;
        vm.startPrank(deployer); xAAPL.setMultiplier(m3); vault.syncDividend(address(xAAPL)); vm.stopPrank();

        uint256 totalDelta   = m3 - 1e18; // 15e15  (total multiplier increase over 3 quarters)
        uint256 expectedTotal = 1_000e18 * totalDelta / 1e18; // 15e18 = 15 xAAPL

        uint256 alicePending = vault.pendingDividend(address(xAAPL), alice);

        console.log("\n  Q1 +0.5% | Q2 +0.4% | Q3 +0.6%  (Alice never claimed between)");
        console.log("  Total multiplier increase:", totalDelta, "(15e15 = 1.5%)");
        console.log("  Alice pending:            ", alicePending, "(15 xAAPL)");
        console.log("  Expected:                 ", expectedTotal);

        assertEq(alicePending, expectedTotal,
            "Pending must equal sum of all three quarterly dividends");

        // Single claim collects all three
        uint256 aliceBefore = xAAPL.balanceOf(alice);
        vm.prank(alice);
        uint256 claimed = vault.claimDividend(address(xAAPL));

        assertEq(claimed, expectedTotal, "One claim must collect all three dividends");
        assertEq(xAAPL.balanceOf(alice) - aliceBefore, expectedTotal, "Balance increased by full amount");
        assertEq(vault.pendingDividend(address(xAAPL), alice), 0, "Nothing left pending");

        console.log("  Claimed in one call:       ", claimed, "(15 xAAPL)");
        console.log("  Three dividends in single claim [VERIFIED]");
    }

    // =========================================================================
    // Test 4: Vault xStock balance sufficiency
    //
    //   The vault holds xAAPL to pay dividends.  After all holders claim,
    //   total xAAPL paid == sum(multiplierDelta_i) * totalDeposited / 1e18.
    //   Vault balance must not go below zero.
    //
    //   Three depositors: alice=1,000  bob=2,000  charlie=500  total=3,500
    //   Two dividends: +0.5% and +0.3%  combined delta = 0.008
    //   Total payout = 3,500 * 0.008 = 28 xAAPL
    //   Vault starts with 10,000 xAAPL float -> has plenty.
    // =========================================================================

    function test_vaultBalanceSufficiency() public {
        console.log("==============================================");
        console.log("  Test 4: Vault Balance Sufficiency");
        console.log("==============================================");

        _deposit(alice,   1_000e18);
        _deposit(bob,     2_000e18);
        _deposit(charlie,   500e18);

        uint256 totalDeposited = 3_500e18;

        // Two dividends
        uint256 m1 = 1_005_000_000_000_000_000; // +0.5%
        uint256 m2 = 1_008_000_000_000_000_000; // +0.3% (1.005 -> 1.008)
        uint256 totalDelta = m2 - 1e18; // 8e15

        vm.startPrank(deployer);
        xAAPL.setMultiplier(m1); vault.syncDividend(address(xAAPL));
        xAAPL.setMultiplier(m2); vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        uint256 expectedTotalPayout = totalDelta * totalDeposited / 1e18; // 8e15 * 3500e18 / 1e18 = 28e18

        // Verify per-user amounts
        uint256 alicePending   = vault.pendingDividend(address(xAAPL), alice);
        uint256 bobPending     = vault.pendingDividend(address(xAAPL), bob);
        uint256 charliePending = vault.pendingDividend(address(xAAPL), charlie);
        uint256 sumPending     = alicePending + bobPending + charliePending;

        console.log("\n  Total deposited: 3,500 xAAPL");
        console.log("  Combined delta:  0.8% (8e15)");
        console.log("  Alice pending:   ", alicePending,   "(8 xAAPL)");
        console.log("  Bob pending:     ", bobPending,     "(16 xAAPL)");
        console.log("  Charlie pending: ", charliePending, "(4 xAAPL)");
        console.log("  Sum of pending:  ", sumPending,     "(28 xAAPL)");
        console.log("  Expected total:  ", expectedTotalPayout);

        assertEq(sumPending, expectedTotalPayout, "Sum of all pending == total payout");

        // All three claim; verify vault can cover it
        uint256 vaultBefore = xAAPL.balanceOf(address(vault));
        console.log("\n  Vault xAAPL before claims:", vaultBefore);

        vm.prank(alice);   vault.claimDividend(address(xAAPL));
        vm.prank(bob);     vault.claimDividend(address(xAAPL));
        vm.prank(charlie); vault.claimDividend(address(xAAPL));

        uint256 vaultAfter = xAAPL.balanceOf(address(vault));
        uint256 paidOut    = vaultBefore - vaultAfter;

        console.log("  Vault xAAPL after claims: ", vaultAfter);
        console.log("  Vault paid out:           ", paidOut, "(28 xAAPL)");

        assertEq(paidOut, expectedTotalPayout, "Vault paid exactly the total dividend");
        assertGt(vaultAfter, 0, "Vault must remain solvent after all payouts");

        assertEq(vault.pendingDividend(address(xAAPL), alice),   0, "Alice zeroed");
        assertEq(vault.pendingDividend(address(xAAPL), bob),     0, "Bob zeroed");
        assertEq(vault.pendingDividend(address(xAAPL), charlie), 0, "Charlie zeroed");

        console.log("  Vault solvent; all pending zeroed [VERIFIED]");
    }

    // =========================================================================
    // Test 5: withdraw() auto-claims pending dividend
    //
    //   When a user exits via vault.withdraw(), the vault:
    //     1. Calls _syncDividend (updates accDivPerShare)
    //     2. Calls _claimDividend (transfers pending xAAPL to user)
    //     3. Burns px + dx tokens
    //     4. Returns the principal xAAPL to user
    //
    //   So the user receives: principal + accrued dividend in one transaction.
    //   The remaining dx balance after partial withdrawal has its rewardDebt
    //   correctly reset (no double-claim).
    // =========================================================================

    function test_dividendOnWithdraw() public {
        console.log("==============================================");
        console.log("  Test 5: Dividend Auto-claimed on Withdraw");
        console.log("==============================================");

        _deposit(alice, 1_000e18);

        // Dividend: +0.5% -> Alice earns 5 xAAPL
        uint256 m1 = 1_005_000_000_000_000_000;
        vm.startPrank(deployer);
        xAAPL.setMultiplier(m1);
        vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        uint256 alicePending = vault.pendingDividend(address(xAAPL), alice);
        assertEq(alicePending, 5e18, "Alice should have 5 xAAPL pending");

        console.log("\n  Alice has 5 xAAPL pending dividend");
        console.log("  Alice withdraws 600 xAAPL principal (partial withdraw)");

        uint256 aliceXBefore = xAAPL.balanceOf(alice);

        // Partial withdraw: burns 600 px + 600 dx, returns 600 xAAPL + 5 xAAPL dividend
        vm.prank(alice);
        vault.withdraw(address(xAAPL), 600e18);

        uint256 aliceXAfter  = xAAPL.balanceOf(alice);
        uint256 totalReceived = aliceXAfter - aliceXBefore;

        console.log("  xAAPL received (principal + dividend):", totalReceived);
        console.log("  Expected: 600 (principal) + 5 (dividend) = 605 xAAPL");

        // withdraw returns principal + claimed dividend
        assertEq(totalReceived, 600e18 + 5e18,
            "Withdraw returns principal AND pending dividend in one go");

        // After partial withdraw: Alice has 400 dx remaining
        // rewardDebt is reset to 400 * accDivPerShare / 1e36
        // So pending for remaining 400 dx = 0 (just claimed, debt reset)
        uint256 pendingAfterWithdraw = vault.pendingDividend(address(xAAPL), alice);
        assertEq(pendingAfterWithdraw, 0,
            "After withdraw, pending resets to 0 for remaining dx balance");
        assertEq(IERC20(dxAAPL).balanceOf(alice), 400e18, "400 dxAAPL remain");

        console.log("  Remaining dxAAPL balance:", IERC20(dxAAPL).balanceOf(alice));
        console.log("  Pending after withdraw:  ", pendingAfterWithdraw, "(0 -- debt reset)");

        // Second dividend fires: +0.3% on remaining 400 dx
        uint256 m2 = 1_008_000_000_000_000_000; // 1.005 -> 1.008
        vm.startPrank(deployer);
        xAAPL.setMultiplier(m2);
        vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        uint256 d2 = m2 - m1; // 3e15
        uint256 expNewPending = 400e18 * d2 / 1e18; // 400 * 0.003 = 1.2 xAAPL

        uint256 pendingAfterSecond = vault.pendingDividend(address(xAAPL), alice);
        assertEq(pendingAfterSecond, expNewPending,
            "Post-withdraw, dividend accrues only on remaining 400 dx");

        console.log("\n  After second dividend (+0.3%) on remaining 400 dx:");
        console.log("  Alice pending:", pendingAfterSecond, "(1.2 xAAPL)");
        console.log("  Dividend on withdraw + correct rewardDebt reset [VERIFIED]");
    }

    // =========================================================================
    // Helper
    // =========================================================================

    function _deposit(address user, uint256 amount) internal {
        vm.startPrank(user);
        xAAPL.approve(address(vault), amount);
        vault.deposit(address(xAAPL), amount);
        vm.stopPrank();
    }
}
