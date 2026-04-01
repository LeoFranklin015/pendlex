// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockPyth} from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";

import {PythAdapter}     from "../src/PythAdapter.sol";
import {XStreamVault}    from "../src/XStreamVault.sol";
import {XStreamExchange} from "../src/XStreamExchange.sol";
import {MarketKeeper}    from "../src/MarketKeeper.sol";
import {PrincipalToken}  from "../src/tokens/PrincipalToken.sol";
import {MockUSDC}        from "./mocks/MockUSDC.sol";
import {MockXStock}      from "./mocks/MockXStock.sol";

/// @title  DividendAuctionTest
/// @notice Three focused scenarios exercising the intersection of dividends
///         and EOD keeper settlement:
///
///   1. test_dividendAuctionSettlement
///      Alice holds dxAAPL AND has an open long during a dividend event.
///      The keeper force-settles her position at EOD.
///      Shows that USDC trading profit (from settlement) and xAAPL dividend
///      income are completely independent streams -- holding a position does
///      NOT block or forfeit dividend accumulation.
///
///   2. test_dividendDistributionToOwner
///      Deployer owns 100,000 dxAAPL; Alice owns 1,000; Bob owns 500.
///      A single +0.3% rebase generates:
///        deployer: 300 xAAPL  (100k * 0.003)
///        alice:      3 xAAPL  (1k  * 0.003)
///        bob:      1.5 xAAPL  (500 * 0.003)
///      Tests that the owner's proportional majority stake in dx tokens
///      correctly earns the bulk of dividends. Also tests multiple sequential
///      rebases (second +0.2%) accumulate before claim.
///
///   3. test_auctionLosingCase
///      All traders open longs. EOD settlement occurs at prices BELOW entry
///      for every position. All traders lose:
///        - Each receives less USDC than deposited as collateral
///        - LP pool absorbs all losses (usdcLiquidity increases)
///        - LP withdraws MORE than $1M initial deposit (profitable day)
///      Validates the loss-absorption / LP-profit path end-to-end.
contract DividendAuctionTest is Test {
    // ---------- Pyth feed IDs ----------
    bytes32 constant AAPL_FEED = bytes32(uint256(1));
    bytes32 constant SPY_FEED  = bytes32(uint256(2));

    // ---------- Actors ----------
    address deployer;
    address lpProvider;
    address alice;
    address bob;
    address charlie;
    address keeperBot;

    // ---------- Contracts ----------
    MockPyth        mockPyth;
    PythAdapter     pythAdapter;
    MockUSDC        usdc;
    MockXStock      xAAPL;
    MockXStock      xSPY;
    XStreamVault    vault;
    XStreamExchange exchange;
    MarketKeeper    keeper;

    address pxAAPL;
    address dxAAPL;
    address pxSPY;
    address dxSPY;

    uint64 priceSeq;

    // =========================================================================
    // Setup -- fresh state before every test
    // =========================================================================

    function setUp() public {
        deployer   = makeAddr("deployer");
        lpProvider = makeAddr("lpProvider");
        alice      = makeAddr("alice");
        bob        = makeAddr("bob");
        charlie    = makeAddr("charlie");
        keeperBot  = makeAddr("keeperBot");

        vm.deal(deployer,   10 ether);
        vm.deal(lpProvider,  1 ether);
        vm.deal(alice,       1 ether);
        vm.deal(bob,         1 ether);
        vm.deal(charlie,     1 ether);
        vm.deal(keeperBot,   1 ether);

        vm.startPrank(deployer);
        mockPyth    = new MockPyth(60, 1);
        pythAdapter = new PythAdapter(address(mockPyth), 60);
        usdc        = new MockUSDC();
        xAAPL       = new MockXStock("Dinari xAAPL", "xAAPL");
        xSPY        = new MockXStock("Dinari xSPY",  "xSPY");
        vault       = new XStreamVault();

        (pxAAPL, dxAAPL) = vault.registerAsset(address(xAAPL), AAPL_FEED, "xAAPL");
        (pxSPY,  dxSPY)  = vault.registerAsset(address(xSPY),  SPY_FEED,  "xSPY");

        exchange = new XStreamExchange(address(usdc), address(pythAdapter));
        exchange.registerPool(address(xAAPL), pxAAPL, AAPL_FEED);
        exchange.registerPool(address(xSPY),  pxSPY,  SPY_FEED);

        keeper = new MarketKeeper(address(exchange), address(pythAdapter), deployer);
        exchange.setKeeper(address(keeper));
        keeper.addKeeper(keeperBot);

        // Vault seed: deployer deposits 100k xAAPL + 100k xSPY
        xAAPL.mint(deployer, 200_000e18);
        xSPY.mint(deployer,  200_000e18);
        xAAPL.approve(address(vault), type(uint256).max);
        xSPY.approve(address(vault),  type(uint256).max);
        vault.deposit(address(xAAPL), 100_000e18);
        vault.deposit(address(xSPY),  100_000e18);

        // px reserve for exchange
        PrincipalToken(pxAAPL).approve(address(exchange), type(uint256).max);
        PrincipalToken(pxSPY).approve(address(exchange),  type(uint256).max);
        exchange.depositPxReserve(pxAAPL, 50_000e18);
        exchange.depositPxReserve(pxSPY,  50_000e18);

        // Extra xStock in vault to fund dividend payouts
        xAAPL.mint(address(vault), 20_000e18);
        xSPY.mint(address(vault),  20_000e18);
        vm.stopPrank();

        // LP provides $500k to each pool
        vm.startPrank(lpProvider);
        usdc.mint(lpProvider, 1_000_000e6);
        usdc.approve(address(exchange), type(uint256).max);
        exchange.depositLiquidity(pxAAPL, 500_000e6);
        exchange.depositLiquidity(pxSPY,  500_000e6);
        vm.stopPrank();

        // Alice and Bob hold xAAPL and USDC
        vm.startPrank(deployer);
        xAAPL.mint(alice,   5_000e18);
        xAAPL.mint(bob,     2_000e18);
        usdc.mint(alice,  100_000e6);
        usdc.mint(bob,    100_000e6);
        usdc.mint(charlie, 50_000e6);
        vm.stopPrank();

        vm.prank(alice);   usdc.approve(address(exchange), type(uint256).max);
        vm.prank(bob);     usdc.approve(address(exchange), type(uint256).max);
        vm.prank(charlie); usdc.approve(address(exchange), type(uint256).max);
    }

    // =========================================================================
    // Test 1: Dividend accumulates independently of open trading positions
    //
    //   Alice deposits 1,000 xAAPL -> 1,000 dxAAPL
    //   Alice opens 3x long xAAPL while holding dxAAPL
    //   Dividend event: xAAPL +0.2% rebase
    //   Keeper settles Alice's position at EOD (she gets USDC profit)
    //   Alice then claims her dxAAPL dividend (she gets xAAPL)
    //   The two income streams are completely independent.
    // =========================================================================

    function test_dividendAuctionSettlement() public {
        console.log("=================================================");
        console.log("  Test 1: Dividend + Auction Settlement");
        console.log("  Open position does NOT block dividend accrual");
        console.log("=================================================");

        // --- Alice deposits 1,000 xAAPL into vault ---
        vm.startPrank(alice);
        xAAPL.approve(address(vault), type(uint256).max);
        vault.deposit(address(xAAPL), 1_000e18);
        vm.stopPrank();

        assertEq(IERC20(dxAAPL).balanceOf(alice), 1_000e18, "Alice should have 1000 dxAAPL");
        assertEq(vault.pendingDividend(address(xAAPL), alice), 0, "No dividend yet");

        // --- Market opens; Alice opens 3x long @ $213.42 ---
        vm.startPrank(keeperBot);
        keeper.openMarket();
        vm.stopPrank();

        (bytes[] memory u, uint256 f) = _priceUpdate(AAPL_FEED, 21342);
        vm.startPrank(alice);
        bytes32 alicePos = exchange.openLong{value: f}(pxAAPL, 5_000e6, 3e18, u);
        vm.stopPrank();

        console.log("\n  Alice has open 3x long xAAPL AND holds 1,000 dxAAPL");
        console.log("  dxAAPL balance:           ", IERC20(dxAAPL).balanceOf(alice));
        console.log("  Pending dividend (before):", vault.pendingDividend(address(xAAPL), alice));

        // --- Dividend event: xAAPL rebase +0.2% ---
        // Opening the position does NOT reduce Alice's dxAAPL balance.
        // The dividend accumulates on her full 1,000 dxAAPL.
        vm.startPrank(deployer);
        xAAPL.setMultiplier(1_002_000_000_000_000_000); // +0.2%
        vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        uint256 alicePending = vault.pendingDividend(address(xAAPL), alice);
        // Expected: 1000e18 * 2e15 / 1e18 = 2e18 = 2 xAAPL
        uint256 expectedDividend = 1_000e18 * 2_000_000_000_000_000 / 1e18;

        console.log("\n  After +0.2% rebase:");
        console.log("  Alice pending dividend:   ", alicePending);
        console.log("  Expected (2 xAAPL):       ", expectedDividend);
        assertEq(alicePending, expectedDividend,
            "Dividend accrues on full dxAAPL balance even with open position");

        // --- EOD settlement: keeper closes market for xAAPL @ $220 (+3.1%) ---
        uint256 aliceUsdcBefore = usdc.balanceOf(alice);
        (u, f) = _priceUpdate(AAPL_FEED, 22000);
        address[] memory tokens = new address[](1);
        tokens[0] = pxAAPL;
        vm.startPrank(keeperBot);
        keeper.closeMarket{value: f}(tokens, u);
        vm.stopPrank();

        uint256 usdcFromSettlement = usdc.balanceOf(alice) - aliceUsdcBefore;
        console.log("\n  EOD settlement @ $220:");
        console.log("  Alice USDC from position:  ", usdcFromSettlement);
        console.log("  USDC profit (> $5k col):   ", usdcFromSettlement > 5_000e6 ? "YES" : "NO");
        assertGt(usdcFromSettlement, 5_000e6,
            "Alice 3x long profits at higher price and gets back more than collateral");

        // Position is deleted after settlement
        assertEq(exchange.getPosition(alicePos).trader, address(0), "Position deleted");

        // --- Alice's dxAAPL dividend is still pending (position close != dividend claim) ---
        uint256 pendingAfterSettle = vault.pendingDividend(address(xAAPL), alice);
        assertEq(pendingAfterSettle, expectedDividend,
            "Dividend still pending after position settlement -- they are independent");
        console.log("\n  Dividend still pending after settlement:", pendingAfterSettle);
        console.log("  (Position settlement does NOT auto-claim dividends)");

        // --- Alice claims her dividend separately ---
        uint256 xAaplBefore = xAAPL.balanceOf(alice);
        vm.prank(alice);
        vault.claimDividend(address(xAAPL));
        uint256 xAaplReceived = xAAPL.balanceOf(alice) - xAaplBefore;

        console.log("\n  After claiming dividend:");
        console.log("  xAAPL received:            ", xAaplReceived);
        assertEq(xAaplReceived, expectedDividend, "Claimed exact expected dividend");
        assertEq(vault.pendingDividend(address(xAAPL), alice), 0, "Pending zeroed after claim");

        console.log("\n  RESULT: Alice earned $", usdcFromSettlement / 1e6, "from settlement");
        console.log("  RESULT: Alice earned", xAaplReceived / 1e18, "xAAPL from dividend");
        console.log("  Two streams are completely independent [VERIFIED]");
    }

    // =========================================================================
    // Test 2: Dividend distribution proportional to dxToken ownership
    //
    //   deployer: 100,000 dxAAPL  (vault seed position)
    //   alice:      1,000 dxAAPL
    //   bob:          500 dxAAPL
    //   Total:    101,500 dxAAPL
    //
    //   Rebase 1: +0.3% multiplier
    //     deployer: 300 xAAPL
    //     alice:      3 xAAPL
    //     bob:      1.5 xAAPL  (rounded down to 1.5e18 wei)
    //
    //   Rebase 2: +0.2% multiplier (deployer doesn't claim between rebases)
    //     deployer accumulated: 300 + 200 = 500 xAAPL before claim
    //     alice accumulated:    3 + 2 = 5 xAAPL (alice claims only after second rebase)
    //
    //   Verifies:
    //   - Owner gets proportionally dominant share
    //   - Multi-rebase accumulation without intermediate claim
    //   - pendingDividend view is accurate at all stages
    // =========================================================================

    function test_dividendDistributionToOwner() public {
        console.log("=================================================");
        console.log("  Test 2: Dividend Distribution to Owner");
        console.log("  deployer: 100k dx | alice: 1k dx | bob: 500 dx");
        console.log("=================================================");

        // Alice deposits 1,000 xAAPL
        vm.startPrank(alice);
        xAAPL.approve(address(vault), type(uint256).max);
        vault.deposit(address(xAAPL), 1_000e18);
        vm.stopPrank();

        // Bob deposits 500 xAAPL
        vm.startPrank(bob);
        xAAPL.approve(address(vault), type(uint256).max);
        vault.deposit(address(xAAPL), 500e18);
        vm.stopPrank();

        // Balances
        uint256 deployerDx = IERC20(dxAAPL).balanceOf(deployer);
        uint256 aliceDx    = IERC20(dxAAPL).balanceOf(alice);
        uint256 bobDx      = IERC20(dxAAPL).balanceOf(bob);

        console.log("\n  dxAAPL balances:");
        console.log("  deployer:", deployerDx);
        console.log("  alice:   ", aliceDx);
        console.log("  bob:     ", bobDx);

        assertEq(deployerDx, 100_000e18);
        assertEq(aliceDx,      1_000e18);
        assertEq(bobDx,          500e18);

        // ---- Rebase 1: +0.3% ----
        uint256 multiplier1 = 1_003_000_000_000_000_000; // 1e18 + 3e15
        uint256 delta1      = multiplier1 - 1e18;        // 3e15

        vm.startPrank(deployer);
        xAAPL.setMultiplier(multiplier1);
        vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        uint256 deployerPending1 = vault.pendingDividend(address(xAAPL), deployer);
        uint256 alicePending1    = vault.pendingDividend(address(xAAPL), alice);
        uint256 bobPending1      = vault.pendingDividend(address(xAAPL), bob);

        // pendingDividend = dxBalance * delta / 1e18
        uint256 expDeployer1 = deployerDx * delta1 / 1e18; // 100,000 * 3e15 / 1e18 = 300e18
        uint256 expAlice1    = aliceDx    * delta1 / 1e18; //   1,000 * 3e15 / 1e18 = 3e18
        uint256 expBob1      = bobDx      * delta1 / 1e18; //     500 * 3e15 / 1e18 = 1.5e18

        console.log("\n  After rebase 1 (+0.3%):");
        console.log("  deployer pending:", deployerPending1, "== 300 xAAPL");
        console.log("  alice    pending:", alicePending1,    "== 3 xAAPL");
        console.log("  bob      pending:", bobPending1,      "== 1.5 xAAPL");

        assertEq(deployerPending1, expDeployer1, "Deployer rebase1 pending mismatch");
        assertEq(alicePending1,    expAlice1,    "Alice rebase1 pending mismatch");
        assertEq(bobPending1,      expBob1,      "Bob rebase1 pending mismatch");

        // Deployer gets ~99x more than alice (100k vs 1k dx)
        assertEq(deployerPending1 / alicePending1, 100,
            "Deployer:Alice dividend ratio should be 100:1");

        // ---- Bob claims after rebase 1 ----
        uint256 xBobBefore = xAAPL.balanceOf(bob);
        vm.prank(bob);
        vault.claimDividend(address(xAAPL));
        uint256 bobClaimed1 = xAAPL.balanceOf(bob) - xBobBefore;

        console.log("\n  Bob claims after rebase 1:");
        console.log("  Bob received (xAAPL wei):", bobClaimed1);
        assertEq(bobClaimed1, expBob1, "Bob received exactly 1.5 xAAPL");
        assertEq(vault.pendingDividend(address(xAAPL), bob), 0, "Bob pending zeroed");

        // ---- Rebase 2: +0.2% (cumulative from base 1.003 -> 1.005) ----
        uint256 multiplier2 = 1_005_000_000_000_000_000; // 1e18 + 5e15
        uint256 delta2      = multiplier2 - multiplier1;  // 2e15 (incremental)

        vm.startPrank(deployer);
        xAAPL.setMultiplier(multiplier2);
        vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        // Deployer: accumulates both rebases without claiming (rewardDebt not reset)
        uint256 deployerPending2 = vault.pendingDividend(address(xAAPL), deployer);
        uint256 alicePending2    = vault.pendingDividend(address(xAAPL), alice);
        uint256 bobPending2      = vault.pendingDividend(address(xAAPL), bob);

        // deployer: still has rebase1 unclaimed + rebase2 new
        uint256 expDeployer2 = expDeployer1 + deployerDx * delta2 / 1e18; // 300 + 200 = 500 xAAPL
        // alice: still has rebase1 unclaimed + rebase2 new
        uint256 expAlice2    = expAlice1    + aliceDx    * delta2 / 1e18; //   3 +   2 = 5 xAAPL
        // bob: already claimed rebase1, so only rebase2 new
        uint256 expBob2      = bobDx * delta2 / 1e18;                      //   0 + 1 = 1 xAAPL

        console.log("\n  After rebase 2 (+0.2% incremental):");
        console.log("  deployer pending:", deployerPending2, "== 500 xAAPL (both rebases)");
        console.log("  alice    pending:", alicePending2,    "== 5 xAAPL  (both rebases)");
        console.log("  bob      pending:", bobPending2,      "== 1 xAAPL  (rebase2 only)");

        assertEq(deployerPending2, expDeployer2, "Deployer two-rebase accumulation mismatch");
        assertEq(alicePending2,    expAlice2,    "Alice two-rebase accumulation mismatch");
        assertEq(bobPending2,      expBob2,      "Bob post-claim new rebase mismatch");

        // ---- Deployer claims all accumulated dividends in one call ----
        uint256 xDeployerBefore = xAAPL.balanceOf(deployer);
        vm.prank(deployer);
        vault.claimDividend(address(xAAPL));
        uint256 deployerClaimed = xAAPL.balanceOf(deployer) - xDeployerBefore;

        console.log("\n  Deployer claims all (both rebases):");
        console.log("  Deployer received (xAAPL):", deployerClaimed);
        assertEq(deployerClaimed, expDeployer2, "Deployer received sum of both rebases");

        // ---- Alice claims ----
        uint256 xAliceBefore = xAAPL.balanceOf(alice);
        vm.prank(alice);
        vault.claimDividend(address(xAAPL));
        uint256 aliceClaimed = xAAPL.balanceOf(alice) - xAliceBefore;

        assertEq(aliceClaimed, expAlice2, "Alice received sum of both rebases");

        console.log("\n  === Ownership vs. Dividend share ===");
        console.log("  deployer dx share: 100,000 / 101,500 = 98.5%");
        console.log("  deployer claimed:", deployerClaimed / 1e18, "xAAPL");
        console.log("  alice claimed:   ", aliceClaimed    / 1e18, "xAAPL");
        console.log("  bob claimed:     ", (bobClaimed1 + bobPending2) / 1e18, "xAAPL (split)");
        console.log("  Owner gets the dominant share [VERIFIED]");
    }

    // =========================================================================
    // Test 3: Auction losing case -- all positions lose at EOD settlement
    //
    //   Three traders all open LONG positions:
    //     Alice:   3x long xAAPL @ $213.42  ($5k collateral)
    //     Bob:     4x long xAAPL @ $213.42  ($4k collateral)
    //     Charlie: 2x long xSPY  @ $587.50  ($3k collateral)
    //
    //   EOD settlement at prices BELOW every entry:
    //     xAAPL settles @ $200   (down 6.3% from $213.42)
    //     xSPY  settles @ $555   (down 5.5% from $587.50)
    //
    //   All three longs are losers:
    //     Alice / Bob:    collateralReturned < $5k / $4k  (xAAPL fell)
    //     Charlie:        collateralReturned < $3k        (xSPY fell)
    //
    //   LP pool absorbs every loss:
    //     xAAPL pool usdcLiquidity increases vs initial $500k
    //     xSPY  pool usdcLiquidity increases vs initial $500k
    //     LP withdraws MORE than $1M initial deposit (net profitable day)
    // =========================================================================

    function test_auctionLosingCase() public {
        console.log("=================================================");
        console.log("  Test 3: Auction Losing Case");
        console.log("  All longs lose at EOD -- LP profits");
        console.log("=================================================");

        // Initial LP liquidity snapshot
        uint256 aaplLiqInit = exchange.getPoolConfig(pxAAPL).usdcLiquidity;
        uint256 spyLiqInit  = exchange.getPoolConfig(pxSPY).usdcLiquidity;
        console.log("\n  Initial liquidity:");
        console.log("  xAAPL pool:", aaplLiqInit);
        console.log("  xSPY  pool:", spyLiqInit);

        // Market opens
        vm.startPrank(keeperBot);
        keeper.openMarket();
        vm.stopPrank();

        // Snapshot USDC balances BEFORE any collateral is spent
        uint256 aliceStart   = usdc.balanceOf(alice);
        uint256 bobStart     = usdc.balanceOf(bob);
        uint256 charlieStart = usdc.balanceOf(charlie);

        // --- Alice: 3x long xAAPL @ $213.42, $5k collateral ---
        (bytes[] memory u, uint256 f) = _priceUpdate(AAPL_FEED, 21342);
        vm.startPrank(alice);
        exchange.openLong{value: f}(pxAAPL, 5_000e6, 3e18, u);
        vm.stopPrank();
        console.log("\n  Alice:   3x long xAAPL @ $213.42  ($5k collateral)");

        // --- Bob: 4x long xAAPL @ $213.42, $4k collateral ---
        vm.warp(block.timestamp + 1); // distinct block.timestamp for unique posId
        (u, f) = _priceUpdate(AAPL_FEED, 21342);
        vm.startPrank(bob);
        exchange.openLong{value: f}(pxAAPL, 4_000e6, 4e18, u);
        vm.stopPrank();
        console.log("  Bob:     4x long xAAPL @ $213.42  ($4k collateral)");

        // --- Charlie: 2x long xSPY @ $587.50, $3k collateral ---
        (u, f) = _priceUpdate(SPY_FEED, 58750);
        vm.startPrank(charlie);
        exchange.openLong{value: f}(pxSPY, 3_000e6, 2e18, u);
        vm.stopPrank();
        console.log("  Charlie: 2x long xSPY  @ $587.50  ($3k collateral)");

        uint256 openAapl = exchange.getOpenPositionCount(pxAAPL);
        uint256 openSpy  = exchange.getOpenPositionCount(pxSPY);
        assertEq(openAapl, 2, "Two xAAPL longs open");
        assertEq(openSpy,  1, "One xSPY long open");

        console.log("\n  Open positions: xAAPL =", openAapl, "| xSPY =", openSpy);

        // --- EOD Settlement: prices below ALL entries ---
        // xAAPL: $213.42 -> $200 (-6.3%)   xSPY: $587.50 -> $555 (-5.5%)
        console.log("\n  EOD SETTLEMENT (losing prices):");
        console.log("  xAAPL settles @ $200 (was $213.42, -6.3%)");
        console.log("  xSPY  settles @ $555 (was $587.50, -5.5%)");

        // Build dual-token settlement: one call per pool via closeMarket
        // closeMarket loops pxTokens and sends msg.value / pxTokens.length per pool
        // For two separate pools we build one dual update array
        uint64 publishTime = uint64(block.timestamp) + priceSeq;
        priceSeq++;
        bytes[] memory dualUpdate = new bytes[](2);
        dualUpdate[0] = mockPyth.createPriceFeedUpdateData(
            AAPL_FEED, 20000, uint64(100), int32(-2), 20000, uint64(100), publishTime
        );
        dualUpdate[1] = mockPyth.createPriceFeedUpdateData(
            SPY_FEED, 55500, uint64(100), int32(-2), 55500, uint64(100), publishTime
        );
        uint256 dualFee = pythAdapter.getUpdateFee(dualUpdate);

        address[] memory pxTokens = new address[](2);
        pxTokens[0] = pxAAPL;
        pxTokens[1] = pxSPY;

        vm.startPrank(keeperBot);
        keeper.closeMarket{value: dualFee * 2}(pxTokens, dualUpdate);
        vm.stopPrank();

        // --- Verify all positions are gone ---
        assertEq(exchange.getOpenPositionCount(pxAAPL), 0, "All xAAPL positions settled");
        assertEq(exchange.getOpenPositionCount(pxSPY),  0, "All xSPY positions settled");
        assertFalse(exchange.marketOpen(), "Market closed after EOD");

        // --- Verify all traders' final USDC is less than their starting USDC ---
        // aliceStart  = balance before any collateral was paid
        // usdc.balanceOf(alice) after settlement = aliceStart - collateral + returned
        // If returned < collateral => final < aliceStart (net loss)
        uint256 aliceFinal   = usdc.balanceOf(alice);
        uint256 bobFinal     = usdc.balanceOf(bob);
        uint256 charlieFinal = usdc.balanceOf(charlie);

        uint256 aliceNet   = aliceStart   > aliceFinal   ? aliceStart   - aliceFinal   : 0; // net loss
        uint256 bobNet     = bobStart     > bobFinal     ? bobStart     - bobFinal     : 0;
        uint256 charlieNet = charlieStart > charlieFinal ? charlieStart - charlieFinal : 0;

        console.log("\n  === Settlement results ===");
        console.log("  Alice   started $100k, now $", aliceFinal   / 1e6, " | net loss $", aliceNet   / 1e6);
        console.log("  Bob     started $100k, now $", bobFinal     / 1e6, " | net loss $", bobNet     / 1e6);
        console.log("  Charlie started $ 50k, now $", charlieFinal / 1e6, " | net loss $", charlieNet / 1e6);

        assertLt(aliceFinal,   aliceStart,   "Alice must end with less USDC than she started (net loss)");
        assertLt(bobFinal,     bobStart,     "Bob must end with less USDC than he started (net loss)");
        assertLt(charlieFinal, charlieStart, "Charlie must end with less USDC than he started (net loss)");

        // --- LP pool liquidity must have increased (absorbed trader losses) ---
        uint256 aaplLiqAfter = exchange.getPoolConfig(pxAAPL).usdcLiquidity;
        uint256 spyLiqAfter  = exchange.getPoolConfig(pxSPY).usdcLiquidity;

        console.log("\n  === LP pool after settlement ===");
        console.log("  xAAPL pool before: $", aaplLiqInit / 1e6,
                    " after: $", aaplLiqAfter / 1e6);
        console.log("  xSPY  pool before: $", spyLiqInit  / 1e6,
                    " after: $", spyLiqAfter  / 1e6);

        assertGt(aaplLiqAfter, aaplLiqInit, "xAAPL pool absorbed trader losses -> liquidity increased");
        assertGt(spyLiqAfter,  spyLiqInit,  "xSPY  pool absorbed trader losses -> liquidity increased");

        // --- LP withdraws and gets back MORE than initial deposit ---
        XStreamExchange.PoolConfig memory aaplPool = exchange.getPoolConfig(pxAAPL);
        XStreamExchange.PoolConfig memory spyPool  = exchange.getPoolConfig(pxSPY);
        uint256 lpAaplShares = IERC20(aaplPool.lpToken).balanceOf(lpProvider);
        uint256 lpSpyShares  = IERC20(spyPool.lpToken).balanceOf(lpProvider);

        uint256 lpBefore = usdc.balanceOf(lpProvider);
        vm.startPrank(lpProvider);
        exchange.withdrawLiquidity(pxAAPL, lpAaplShares);
        exchange.withdrawLiquidity(pxSPY,  lpSpyShares);
        vm.stopPrank();

        uint256 lpReturned = usdc.balanceOf(lpProvider) - lpBefore;

        console.log("\n  === LP withdrawal ===");
        console.log("  LP deposited:  $1,000,000");
        console.log("  LP received:   $", lpReturned / 1e6);
        console.log("  LP net profit: $", (lpReturned - 1_000_000e6) / 1e6);

        assertGt(lpReturned, 1_000_000e6,
            "LP must profit: absorbed losses from all losing traders");

        // Cross-check conservation of value.
        //
        // Trading fees (0.05% of notional) go to pool.totalFees -- a separate
        // counter from pool.usdcLiquidity.  withdrawLiquidity distributes only
        // usdcLiquidity to LPs; totalFees accumulates in the exchange contract
        // but is NOT currently redeemable by LPs (v1 protocol fee sink).
        //
        // Therefore:
        //   LP profit + protocol fees = total trader losses
        //
        uint256 lpProfit    = lpReturned - 1_000_000e6;
        uint256 totalLosses = aliceNet + bobNet + charlieNet;
        uint256 aaplFees    = exchange.getPoolConfig(pxAAPL).totalFees;
        uint256 spyFees     = exchange.getPoolConfig(pxSPY).totalFees;
        uint256 protocolFees = aaplFees + spyFees;

        console.log("\n  Value conservation check:");
        console.log("  Alice net loss ($):   ", aliceNet    / 1e6);
        console.log("  Bob   net loss ($):   ", bobNet      / 1e6);
        console.log("  Charlie net loss ($): ", charlieNet  / 1e6);
        console.log("  Total trader losses ($):", totalLosses  / 1e6);
        console.log("  LP profit ($):          ", lpProfit     / 1e6);
        console.log("  Protocol fees ($):      ", protocolFees / 1e6);
        console.log("  LP profit + fees ($):   ", (lpProfit + protocolFees) / 1e6);

        assertEq(lpProfit + protocolFees, totalLosses,
            "Conservation: LP profit + protocol fees == total trader losses");

        console.log("\n  LP profits exactly equal all trader losses [VERIFIED]");
    }

    // =========================================================================
    // Helper -- Pyth price update
    // =========================================================================

    function _priceUpdate(bytes32 feedId, int64 price)
        internal
        returns (bytes[] memory updates, uint256 fee)
    {
        uint64 publishTime = uint64(block.timestamp) + priceSeq;
        priceSeq++;
        bytes memory data = mockPyth.createPriceFeedUpdateData(
            feedId, price, uint64(100), int32(-2), price, uint64(100), publishTime
        );
        updates    = new bytes[](1);
        updates[0] = data;
        fee        = pythAdapter.getUpdateFee(updates);
    }
}
