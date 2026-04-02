// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockPyth} from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";

import {PythAdapter}     from "../src/PythAdapter.sol";
import {XStreamVault}    from "../src/XStreamVault.sol";
import {XStreamExchange} from "../src/XStreamExchange.sol";
import {MarketKeeper}    from "../src/MarketKeeper.sol";
import {DxLeaseEscrow}   from "../src/DxLeaseEscrow.sol";
import {PrincipalToken}  from "../src/tokens/PrincipalToken.sol";
import {MockUSDC}        from "./mocks/MockUSDC.sol";
import {MockXStock}      from "./mocks/MockXStock.sol";

/// @title  DayTradingAll8
/// @notice Full intraday simulation covering all 8 xStock assets in one trading day.
///
/// Day schedule (all times relative to DAY_START = 09:00 anchor):
///   09:30  Market opens
///   10:00  Alice: 3x long  xAAPL @ $250.12 ($5k)           [closes 14:00 with profit]
///   10:10  Bob:   2x short xSPY  @ $662.29 ($4k)           [settled EOD]
///   10:20  Charlie: 3x long xTSLA @ $391.20 ($3k)          [settled EOD]
///   10:30  Dave:  2x long  xNVDA @ $180.25 ($3k)           [settled EOD]
///   10:40  Alice: 2x short xGOOGL @ $302.28 ($2k)          [settled EOD]
///   10:50  Charlie: 5x long xGLD  @ $460.84 ($2k)          [LIQUIDATED 14:30]
///   11:00  Dave:  3x long  xTBLL @ $105.70 ($2k)           [settled EOD]
///   11:10  Bob:   2x long  xSLV  @  $72.69 ($2k)           [settled EOD]
///   11:30  Alice deposits 500 xAAPL to vault -> opens dxAAPL escrow auction (1hr, 1hr lease)
///   12:00  Bob bids 300 USDC on Alice's dxAAPL escrow
///   12:00  xAAPL rebase +0.2% (dividend will go to Bob as lessee)
///   12:36  Auction finalizes: Bob is lessee (lease: 12:36 -> 13:36)
///   13:00  escrow.claimAndDistribute -> Bob receives xAAPL dividend
///   14:00  Alice closes xAAPL long @ $265 (+5.9%) -> profit
///   14:30  xGLD crashes $460.84 -> $379 (-17.8%) -> Charlie's 5x long LIQUIDATED
///   13:36  Lease expires (warp to 13:45)
///   13:45  xAAPL second rebase +0.1% (post-lease) -> dividend to Alice (seller)
///   13:50  escrow.claimAndDistribute -> Alice receives second dividend
///   13:55  Alice reclaims dxAAPL
///   16:00  EOD: keeper closes remaining 6 positions
///           (Bob short SPY, Charlie long TSLA, Dave long NVDA,
///            Alice short GOOGL, Dave long TBLL, Bob long SLV)
///   16:05  LP withdraws; full balance summary
///
/// Run:
///   forge test --match-contract DayTradingAll8 -vv
///   forge test --match-contract DayTradingAll8 -vvvv
contract DayTradingAll8 is Test {

    // =========================================================================
    // Feed IDs and starting prices (expo = -2, price / 100 = USD)
    // =========================================================================

    bytes32 constant FEED_TSLA  = bytes32(uint256(1));
    bytes32 constant FEED_NVDA  = bytes32(uint256(2));
    bytes32 constant FEED_GOOGL = bytes32(uint256(3));
    bytes32 constant FEED_AAPL  = bytes32(uint256(4));
    bytes32 constant FEED_SPY   = bytes32(uint256(5));
    bytes32 constant FEED_TBLL  = bytes32(uint256(6));
    bytes32 constant FEED_GLD   = bytes32(uint256(7));
    bytes32 constant FEED_SLV   = bytes32(uint256(8));

    int64 constant PRICE_TSLA  = 39120;  // $391.20
    int64 constant PRICE_NVDA  = 18025;  // $180.25
    int64 constant PRICE_GOOGL = 30228;  // $302.28
    int64 constant PRICE_AAPL  = 25012;  // $250.12
    int64 constant PRICE_SPY   = 66229;  // $662.29
    int64 constant PRICE_TBLL  = 10570;  // $105.70
    int64 constant PRICE_GLD   = 46084;  // $460.84
    int64 constant PRICE_SLV   = 7269;   //  $72.69

    // =========================================================================
    // Intraday timestamps
    // =========================================================================

    uint256 constant DAY_START     = 1_700_100_000; // 09:00 anchor (arbitrary weekday)

    uint256 constant T_OPEN        = DAY_START + 1800;   // 09:30 market opens
    uint256 constant T_P1          = DAY_START + 3600;   // 10:00 Alice long xAAPL
    uint256 constant T_P2          = DAY_START + 4200;   // 10:10 Bob short xSPY
    uint256 constant T_P3          = DAY_START + 4800;   // 10:20 Charlie long xTSLA
    uint256 constant T_P4          = DAY_START + 5400;   // 10:30 Dave long xNVDA
    uint256 constant T_P5          = DAY_START + 6000;   // 10:40 Alice short xGOOGL
    uint256 constant T_P6          = DAY_START + 6600;   // 10:50 Charlie long xGLD (risky)
    uint256 constant T_P7          = DAY_START + 7200;   // 11:00 Dave long xTBLL
    uint256 constant T_P8          = DAY_START + 7800;   // 11:10 Bob long xSLV
    uint256 constant T_ESCROW_OPEN = DAY_START + 9000;   // 11:30 Alice opens dxAAPL auction
    uint256 constant T_BOB_BID     = DAY_START + 10800;  // 12:00 Bob bids + xAAPL rebase
    uint256 constant T_FINALIZE    = DAY_START + 13000;  // 12:36 finalize auction
    uint256 constant T_ESCROW_CLAIM= DAY_START + 14400;  // 13:00 claimAndDistribute -> Bob
    uint256 constant T_ALICE_CLOSE = DAY_START + 14400;  // 13:00 Alice closes xAAPL long
    uint256 constant T_GLD_CRASH   = DAY_START + 16200;  // 14:30 xGLD crash -> liquidate
    // T_ESCROW_OPEN + 1hr(auction) + 1hr(lease) = DAY_START + 9000 + 3600 + 3600 = DAY_START + 16200
    // Finalize happens at T_FINALIZE=13000, lease starts there, 1hr lease ends at 13000+3600=16600
    uint256 constant T_POST_LEASE  = DAY_START + 17000;  // 13:44 after lease expires
    uint256 constant T_RECLAIM     = DAY_START + 17200;  // 13:47 Alice reclaims dxAAPL
    uint256 constant T_EOD         = DAY_START + 25200;  // 16:00 EOD settlement
    uint256 constant T_LP_OUT      = DAY_START + 25500;  // 16:05 LP withdrawal

    // =========================================================================
    // Actors
    // =========================================================================

    address internal deployer;
    address internal lpProvider;
    address internal alice;
    address internal bob;
    address internal charlie;
    address internal dave;
    address internal keeperBot;
    address internal liquidatorBot;

    // =========================================================================
    // Contracts
    // =========================================================================

    MockPyth        internal mockPyth;
    PythAdapter     internal pythAdapter;
    MockUSDC        internal usdc;
    XStreamVault    internal vault;
    XStreamExchange internal exchange;
    MarketKeeper    internal keeper;
    DxLeaseEscrow   internal escrow;

    MockXStock internal xTSLA;
    MockXStock internal xNVDA;
    MockXStock internal xGOOGL;
    MockXStock internal xAAPL;
    MockXStock internal xSPY;
    MockXStock internal xTBLL;
    MockXStock internal xGLD;
    MockXStock internal xSLV;

    address internal pxTSLA;  address internal dxTSLA;
    address internal pxNVDA;  address internal dxNVDA;
    address internal pxGOOGL; address internal dxGOOGL;
    address internal pxAAPL;  address internal dxAAPL;
    address internal pxSPY;   address internal dxSPY;
    address internal pxTBLL;  address internal dxTBLL;
    address internal pxGLD;   address internal dxGLD;
    address internal pxSLV;   address internal dxSLV;

    // Position IDs for manual close / liquidation tracking
    bytes32 internal aliceAaplPosId;
    uint256 internal escrowListingId;

    // Monotonic counter to satisfy MockPyth's publishTime > stored invariant
    uint64 internal priceSeq;

    // =========================================================================
    // Setup
    // =========================================================================

    function setUp() public {
        deployer     = makeAddr("deployer");
        lpProvider   = makeAddr("lpProvider");
        alice        = makeAddr("alice");
        bob          = makeAddr("bob");
        charlie      = makeAddr("charlie");
        dave         = makeAddr("dave");
        keeperBot    = makeAddr("keeperBot");
        liquidatorBot= makeAddr("liquidatorBot");

        vm.warp(DAY_START);

        vm.deal(alice,         10 ether);
        vm.deal(bob,           10 ether);
        vm.deal(charlie,       10 ether);
        vm.deal(dave,          10 ether);
        vm.deal(keeperBot,     10 ether);
        vm.deal(liquidatorBot, 10 ether);

        _deployContracts();
        _seedBalances();
    }

    // =========================================================================
    // Main test
    // =========================================================================

    function test_fullDayWithAll8Assets() public {
        console.log("=================================================");
        console.log("  pendleX Full Day: All 8 xStocks");
        console.log("=================================================");

        _phase_openMarket();
        _phase_morningPositions();
        _phase_escrowAndDividend();
        _phase_afternoonClose();
        _phase_liquidation();
        _phase_postLeaseEscrow();
        _phase_eodSettlement();
        _phase_lpWithdrawal();
    }

    // =========================================================================
    // Phase A: Market opens 09:30
    // =========================================================================

    function _phase_openMarket() internal {
        vm.warp(T_OPEN);
        console.log("\n--- 09:30 MARKET OPEN ---");

        vm.prank(keeperBot);
        keeper.openMarket();

        assertTrue(exchange.marketOpen(), "market must be open");
        console.log("  Market open at:", block.timestamp);
    }

    // =========================================================================
    // Phase B: 8 positions opened across all 8 assets
    // =========================================================================

    function _phase_morningPositions() internal {
        bytes[] memory u; uint256 f;

        // 10:00 Alice: 3x long xAAPL @ $250.12, $5k
        vm.warp(T_P1);
        (u, f) = _priceUpdate(FEED_AAPL, PRICE_AAPL);
        vm.prank(alice);
        aliceAaplPosId = exchange.openLong{value: f}(pxAAPL, 5_000e6, 3e18, u);
        console.log("\n--- 10:00 Alice 3x long xAAPL @ $250.12 ---");
        assertEq(exchange.getOpenPositionCount(pxAAPL), 1);

        // 10:10 Bob: 2x short xSPY @ $662.29, $4k
        vm.warp(T_P2);
        (u, f) = _priceUpdate(FEED_SPY, PRICE_SPY);
        vm.prank(bob);
        exchange.openShort{value: f}(pxSPY, 4_000e6, 2e18, u);
        console.log("--- 10:10 Bob 2x short xSPY @ $662.29 ---");
        assertEq(exchange.getOpenPositionCount(pxSPY), 1);

        // 10:20 Charlie: 3x long xTSLA @ $391.20, $3k
        vm.warp(T_P3);
        (u, f) = _priceUpdate(FEED_TSLA, PRICE_TSLA);
        vm.prank(charlie);
        exchange.openLong{value: f}(pxTSLA, 3_000e6, 3e18, u);
        console.log("--- 10:20 Charlie 3x long xTSLA @ $391.20 ---");
        assertEq(exchange.getOpenPositionCount(pxTSLA), 1);

        // 10:30 Dave: 2x long xNVDA @ $180.25, $3k
        vm.warp(T_P4);
        (u, f) = _priceUpdate(FEED_NVDA, PRICE_NVDA);
        vm.prank(dave);
        exchange.openLong{value: f}(pxNVDA, 3_000e6, 2e18, u);
        console.log("--- 10:30 Dave 2x long xNVDA @ $180.25 ---");
        assertEq(exchange.getOpenPositionCount(pxNVDA), 1);

        // 10:40 Alice: 2x short xGOOGL @ $302.28, $2k
        vm.warp(T_P5);
        (u, f) = _priceUpdate(FEED_GOOGL, PRICE_GOOGL);
        vm.prank(alice);
        exchange.openShort{value: f}(pxGOOGL, 2_000e6, 2e18, u);
        console.log("--- 10:40 Alice 2x short xGOOGL @ $302.28 ---");
        assertEq(exchange.getOpenPositionCount(pxGOOGL), 1);

        // 10:50 Charlie: 5x long xGLD @ $460.84, $2k (RISKY -- will be liquidated)
        vm.warp(T_P6);
        (u, f) = _priceUpdate(FEED_GLD, PRICE_GLD);
        vm.prank(charlie);
        exchange.openLong{value: f}(pxGLD, 2_000e6, 5e18, u);
        console.log("--- 10:50 Charlie 5x long xGLD @ $460.84 (risky) ---");
        assertEq(exchange.getOpenPositionCount(pxGLD), 1);

        // 11:00 Dave: 3x long xTBLL @ $105.70, $2k
        vm.warp(T_P7);
        (u, f) = _priceUpdate(FEED_TBLL, PRICE_TBLL);
        vm.prank(dave);
        exchange.openLong{value: f}(pxTBLL, 2_000e6, 3e18, u);
        console.log("--- 11:00 Dave 3x long xTBLL @ $105.70 ---");
        assertEq(exchange.getOpenPositionCount(pxTBLL), 1);

        // 11:10 Bob: 2x long xSLV @ $72.69, $2k
        vm.warp(T_P8);
        (u, f) = _priceUpdate(FEED_SLV, PRICE_SLV);
        vm.prank(bob);
        exchange.openLong{value: f}(pxSLV, 2_000e6, 2e18, u);
        console.log("--- 11:10 Bob 2x long xSLV @ $72.69 ---");
        assertEq(exchange.getOpenPositionCount(pxSLV), 1);

        console.log("\n  Open positions per asset: AAPL=1 SPY=1 TSLA=1 NVDA=1 GOOGL=1 GLD=1 TBLL=1 SLV=1");
    }

    // =========================================================================
    // Phase C: Escrow auction + xAAPL dividend
    //   11:30  Alice deposits 500 xAAPL -> vault, opens dxAAPL escrow (1hr auction, 1hr lease)
    //   12:00  Bob bids 300 USDC; xAAPL rebase +0.2%
    //   12:36  Finalize: Bob is lessee; dividend accrued to escrow -> Bob via claimAndDistribute
    // =========================================================================

    function _phase_escrowAndDividend() internal {
        // 11:30 Alice deposits 500 xAAPL into vault and opens escrow
        vm.warp(T_ESCROW_OPEN);
        console.log("\n--- 11:30 Alice opens dxAAPL escrow auction (1hr auction, 1hr lease) ---");

        vm.startPrank(alice);
        vault.deposit(address(xAAPL), 500e18);
        assertEq(IERC20(dxAAPL).balanceOf(alice), 500e18, "Alice holds 500 dxAAPL");

        IERC20(dxAAPL).approve(address(escrow), type(uint256).max);
        escrowListingId = escrow.openAuction(dxAAPL, 500e18, 200e6, 1 hours, 1 hours);
        vm.stopPrank();

        assertEq(IERC20(dxAAPL).balanceOf(address(escrow)), 500e18, "Escrow holds 500 dxAAPL");
        console.log("  Listing ID (uint256):", escrowListingId);

        // 12:00 Bob bids 300 USDC + xAAPL rebase +0.2%
        vm.warp(T_BOB_BID);
        console.log("\n--- 12:00 Bob bids 300 USDC + xAAPL rebase +0.2% ---");

        vm.prank(bob);
        escrow.placeBid(escrowListingId, 300e6);

        uint256 aliceUsdcBefore = usdc.balanceOf(alice);

        // xAAPL rebase: escrow holds dxAAPL, so dividend accrues to escrow address
        xAAPL.setMultiplier(1_002_000_000_000_000_000);
        vault.syncDividend(address(xAAPL));

        uint256 escrowPending = vault.pendingDividend(address(xAAPL), address(escrow));
        assertGt(escrowPending, 0, "Escrow has pending xAAPL dividend");
        console.log("  Escrow pending dividend:", escrowPending);

        // 12:36 Finalize auction (past 1hr auction end)
        vm.warp(T_FINALIZE);
        console.log("\n--- 12:36 Finalize: Bob wins, becomes lessee ---");

        escrow.finalizeAuction(escrowListingId);

        assertEq(usdc.balanceOf(alice), aliceUsdcBefore + 300e6, "Alice received winning bid");
        DxLeaseEscrow.Listing memory listing = escrow.getListing(escrowListingId);
        assertEq(listing.activeLessee, bob, "Bob is lessee");
        assertEq(uint256(listing.status), uint256(DxLeaseEscrow.ListingStatus.ActiveLease));
        console.log("  Bob is active lessee");

        // 13:00 claimAndDistribute -> Bob receives xAAPL (active lease period)
        vm.warp(T_ESCROW_CLAIM);
        console.log("\n--- 13:00 claimAndDistribute -> Bob gets xAAPL dividend ---");

        uint256 bobXAaplBefore = xAAPL.balanceOf(bob);
        uint256 claimed = escrow.claimAndDistribute(escrowListingId);

        assertGt(claimed, 0, "dividend was claimed");
        assertEq(xAAPL.balanceOf(bob), bobXAaplBefore + claimed, "Bob received xAAPL");
        console.log("  Bob received xAAPL:", claimed);
    }

    // =========================================================================
    // Phase D: Alice closes her xAAPL long at 14:00 with profit
    //   Entry: $250.12  Exit: $265  (+5.9%)
    //   3x leverage -> ~17.7% gain on collateral
    // =========================================================================

    function _phase_afternoonClose() internal {
        vm.warp(T_ALICE_CLOSE);
        console.log("\n--- 13:00 Alice closes 3x long xAAPL @ $265 (+5.9%) ---");

        uint256 aliceBefore = usdc.balanceOf(alice);
        (bytes[] memory u, uint256 f) = _priceUpdate(FEED_AAPL, 26500);

        vm.prank(alice);
        int256 pnl = exchange.closeLong{value: f}(aliceAaplPosId, u);

        uint256 aliceAfter = usdc.balanceOf(alice);
        console.log("  PnL (1e18):", pnl);
        console.log("  USDC returned:", aliceAfter - aliceBefore);

        assertGt(pnl, 0, "Alice's long should profit (price rose)");
        assertGt(aliceAfter, aliceBefore, "Alice received USDC back");
        assertGt(aliceAfter, 5_000e6, "Alice returned more than collateral");

        XStreamExchange.Position memory closed = exchange.getPosition(aliceAaplPosId);
        assertEq(closed.trader, address(0), "Position deleted after close");
        assertEq(exchange.getOpenPositionCount(pxAAPL), 0, "No xAAPL positions remain");
    }

    // =========================================================================
    // Phase E: xGLD crashes at 14:30 -> Charlie's 5x long is liquidated
    //   Entry: $460.84  Crash: $379 (-17.8%)
    //   5x => ~89% loss on collateral -> exceeds 80% threshold
    // =========================================================================

    function _phase_liquidation() internal {
        vm.warp(T_GLD_CRASH);
        console.log("\n--- 14:30 xGLD CRASH: $460.84 -> $379 (-17.8%) -> LIQUIDATION ---");

        uint256 liqBefore = usdc.balanceOf(liquidatorBot);
        (bytes[] memory u, uint256 f) = _priceUpdate(FEED_GLD, 37900);

        vm.prank(liquidatorBot);
        uint256 reward = exchange.liquidateByIndex{value: f}(pxGLD, 0, u);

        uint256 liqAfter = usdc.balanceOf(liquidatorBot);
        console.log("  Liquidator reward (USDC 6dec):", liqAfter - liqBefore);
        console.log("  Reward ($):", (liqAfter - liqBefore) / 1e6);

        assertGt(reward, 0, "Liquidator earned reward");
        assertEq(exchange.getOpenPositionCount(pxGLD), 0, "GLD position deleted");
        assertGt(liqAfter, liqBefore, "Liquidator USDC increased");
    }

    // =========================================================================
    // Phase F: Lease expires; second xAAPL rebase goes to Alice (seller)
    //          Alice reclaims her dxAAPL tokens
    //   Lease start: T_FINALIZE = DAY_START+13000
    //   Lease end:   T_FINALIZE + 1hr = DAY_START+16600
    //   T_POST_LEASE = DAY_START+17000 > lease end
    // =========================================================================

    function _phase_postLeaseEscrow() internal {
        vm.warp(T_POST_LEASE);
        console.log("\n--- 13:44 Lease expired. xAAPL rebase +0.1% -> dividend to Alice ---");

        // Second xAAPL rebase after lease expires
        xAAPL.setMultiplier(1_003_000_000_000_000_000); // +0.1% on top of existing 1.002x
        vault.syncDividend(address(xAAPL));

        uint256 escrowPending2 = vault.pendingDividend(address(xAAPL), address(escrow));
        assertGt(escrowPending2, 0, "Escrow has second dividend pending");

        uint256 aliceXBefore = xAAPL.balanceOf(alice);
        uint256 claimed2 = escrow.claimAndDistribute(escrowListingId);

        assertGt(claimed2, 0, "Second dividend claimed");
        assertEq(xAAPL.balanceOf(alice), aliceXBefore + claimed2, "Alice received post-lease dividend");
        console.log("  Alice received xAAPL (post-lease):", claimed2);

        // Alice reclaims her dxAAPL
        vm.warp(T_RECLAIM);
        console.log("\n--- 13:47 Alice reclaims dxAAPL ---");

        uint256 aliceDxBefore = IERC20(dxAAPL).balanceOf(alice);
        vm.prank(alice);
        escrow.reclaimDx(escrowListingId);

        assertEq(IERC20(dxAAPL).balanceOf(alice), aliceDxBefore + 500e18, "500 dxAAPL reclaimed");
        console.log("  Alice reclaimed 500 dxAAPL");
    }

    // =========================================================================
    // Phase G: EOD settlement at 16:00
    //   Keeper closes market and settles 6 remaining positions across 6 pools:
    //   xSPY (Bob short), xTSLA (Charlie long), xNVDA (Dave long),
    //   xGOOGL (Alice short), xTBLL (Dave long), xSLV (Bob long)
    //
    //   EOD closing prices vs entry:
    //   xSPY:   $662.29 -> $640  (down) -> Bob's short PROFITS
    //   xTSLA:  $391.20 -> $402  (up)   -> Charlie's long PROFITS
    //   xNVDA:  $180.25 -> $175  (down) -> Dave's long LOSES
    //   xGOOGL: $302.28 -> $312  (up)   -> Alice's short LOSES
    //   xTBLL:  $105.70 -> $107  (up)   -> Dave's long PROFITS
    //   xSLV:    $72.69 -> $70   (down) -> Bob's long LOSES
    // =========================================================================

    function _phase_eodSettlement() internal {
        vm.warp(T_EOD);
        console.log("\n--- 16:00 EOD SETTLEMENT: 6 pools settled at closing prices ---");

        assertEq(exchange.getOpenPositionCount(pxSPY),   1, "1 SPY open");
        assertEq(exchange.getOpenPositionCount(pxTSLA),  1, "1 TSLA open");
        assertEq(exchange.getOpenPositionCount(pxNVDA),  1, "1 NVDA open");
        assertEq(exchange.getOpenPositionCount(pxGOOGL), 1, "1 GOOGL open");
        assertEq(exchange.getOpenPositionCount(pxTBLL),  1, "1 TBLL open");
        assertEq(exchange.getOpenPositionCount(pxSLV),   1, "1 SLV open");

        // Capture pre-settlement USDC balances
        uint256 bobBefore     = usdc.balanceOf(bob);
        uint256 charlieBefore = usdc.balanceOf(charlie);
        uint256 daveBefore    = usdc.balanceOf(dave);

        // Build combined 6-feed price update
        bytes32[] memory feedArr = new bytes32[](6);
        feedArr[0] = FEED_SPY;
        feedArr[1] = FEED_TSLA;
        feedArr[2] = FEED_NVDA;
        feedArr[3] = FEED_GOOGL;
        feedArr[4] = FEED_TBLL;
        feedArr[5] = FEED_SLV;

        int64[] memory priceArr = new int64[](6);
        priceArr[0] = 64000;  // SPY $640
        priceArr[1] = 40200;  // TSLA $402
        priceArr[2] = 17500;  // NVDA $175
        priceArr[3] = 31200;  // GOOGL $312
        priceArr[4] = 10700;  // TBLL $107
        priceArr[5] = 7000;   // SLV $70

        (bytes[] memory combined, uint256 feePerPool) = _multiPriceUpdate(feedArr, priceArr);

        address[] memory pxTokens = new address[](6);
        pxTokens[0] = pxSPY;
        pxTokens[1] = pxTSLA;
        pxTokens[2] = pxNVDA;
        pxTokens[3] = pxGOOGL;
        pxTokens[4] = pxTBLL;
        pxTokens[5] = pxSLV;

        vm.prank(keeperBot);
        keeper.closeMarket{value: feePerPool * 6}(pxTokens, combined);

        // All positions cleared
        for (uint256 i = 0; i < 6; i++) {
            assertEq(exchange.getOpenPositionCount(pxTokens[i]), 0, "all positions settled");
        }
        assertFalse(exchange.marketOpen(), "market closed after EOD");

        // PnL direction assertions
        // Bob: short SPY (price fell from $662 -> $640) + long SLV (price fell) = mixed
        // Net: short SPY profits outweigh SLV loss; Bob should get > $4k back from SPY
        assertGt(usdc.balanceOf(bob) - bobBefore, 4_000e6, "Bob's short SPY returned > collateral");

        // Charlie: long TSLA (price rose $391->$402) = profit
        assertGt(usdc.balanceOf(charlie) - charlieBefore, 3_000e6, "Charlie's TSLA long profitable");

        // Dave: mixed (NVDA loss, TBLL profit); should get most of collateral back
        assertGt(usdc.balanceOf(dave) - daveBefore, 3_000e6, "Dave net USDC from NVDA+TBLL");

        console.log("  Bob post-settle USDC (SPY short + SLV long returned):", usdc.balanceOf(bob) / 1e6);
        console.log("  Charlie post-settle USDC (TSLA long returned):", usdc.balanceOf(charlie) / 1e6);
        console.log("  Dave post-settle USDC (NVDA+TBLL returned):", usdc.balanceOf(dave) / 1e6);
        console.log("  Alice post-settle USDC (GOOGL short returned):", usdc.balanceOf(alice) / 1e6);
    }

    // =========================================================================
    // Phase H: LP withdraws at 16:05 and full day summary
    // =========================================================================

    function _phase_lpWithdrawal() internal {
        vm.warp(T_LP_OUT);
        console.log("\n--- 16:05 LP WITHDRAWAL ---");

        address[] memory pxAll = new address[](8);
        pxAll[0] = pxTSLA; pxAll[1] = pxNVDA;  pxAll[2] = pxGOOGL; pxAll[3] = pxAAPL;
        pxAll[4] = pxSPY;  pxAll[5] = pxTBLL;  pxAll[6] = pxGLD;   pxAll[7] = pxSLV;

        uint256 lpBefore = usdc.balanceOf(lpProvider);

        vm.startPrank(lpProvider);
        for (uint256 i = 0; i < 8; i++) {
            XStreamExchange.PoolConfig memory pool = exchange.getPoolConfig(pxAll[i]);
            uint256 shares = IERC20(pool.lpToken).balanceOf(lpProvider);
            if (shares > 0) {
                exchange.withdrawLiquidity(pxAll[i], shares);
            }
        }
        vm.stopPrank();

        uint256 lpAfter = usdc.balanceOf(lpProvider);
        int256 lpNet = int256(lpAfter) - int256(lpBefore);

        console.log("  LP deposited: $1,600,000 ($200k x 8 pools)");
        console.log("  LP received: $", lpAfter / 1e6);
        if (lpNet >= 0) {
            console.log("  LP net: + $", uint256(lpNet) / 1e6);
        } else {
            console.log("  LP net: - $", uint256(-lpNet) / 1e6);
        }

        assertGt(lpAfter - lpBefore, 0, "LP received USDC back from all pools");

        console.log("\n  ============ FULL DAY SUMMARY ============");
        console.log("  Alice USDC:    $", usdc.balanceOf(alice) / 1e6);
        console.log("  Bob   USDC:    $", usdc.balanceOf(bob) / 1e6);
        console.log("  Charlie USDC:  $", usdc.balanceOf(charlie) / 1e6);
        console.log("  Dave USDC:     $", usdc.balanceOf(dave) / 1e6);
        console.log("  LP USDC:       $", usdc.balanceOf(lpProvider) / 1e6);
        console.log("  ==========================================");
    }

    // =========================================================================
    // Deployment helpers
    // =========================================================================

    function _deployContracts() internal {
        vm.startPrank(deployer);

        mockPyth    = new MockPyth(3600, 1); // 1-hr validity, 1 wei per update
        pythAdapter = new PythAdapter(address(mockPyth), 3600);
        usdc        = new MockUSDC();

        xTSLA  = new MockXStock("Dinari Tesla",   "TSLAxt");
        xNVDA  = new MockXStock("Dinari NVIDIA",  "NVDAxt");
        xGOOGL = new MockXStock("Dinari Alphabet","GOOGLxt");
        xAAPL  = new MockXStock("Dinari Apple",   "AAPLxt");
        xSPY   = new MockXStock("Dinari SP500",   "SPYxt");
        xTBLL  = new MockXStock("Dinari TBLL",    "TBLLxt");
        xGLD   = new MockXStock("Dinari Gold",    "GLDxt");
        xSLV   = new MockXStock("Dinari Silver",  "SLVxt");

        vault = new XStreamVault();
        (pxTSLA,  dxTSLA)  = vault.registerAsset(address(xTSLA),  FEED_TSLA,  "TSLA");
        (pxNVDA,  dxNVDA)  = vault.registerAsset(address(xNVDA),  FEED_NVDA,  "NVDA");
        (pxGOOGL, dxGOOGL) = vault.registerAsset(address(xGOOGL), FEED_GOOGL, "GOOGL");
        (pxAAPL,  dxAAPL)  = vault.registerAsset(address(xAAPL),  FEED_AAPL,  "AAPL");
        (pxSPY,   dxSPY)   = vault.registerAsset(address(xSPY),   FEED_SPY,   "SPY");
        (pxTBLL,  dxTBLL)  = vault.registerAsset(address(xTBLL),  FEED_TBLL,  "TBLL");
        (pxGLD,   dxGLD)   = vault.registerAsset(address(xGLD),   FEED_GLD,   "GLD");
        (pxSLV,   dxSLV)   = vault.registerAsset(address(xSLV),   FEED_SLV,   "SLV");

        exchange = new XStreamExchange(address(usdc), address(pythAdapter));
        exchange.registerPool(address(xTSLA),  pxTSLA,  FEED_TSLA);
        exchange.registerPool(address(xNVDA),  pxNVDA,  FEED_NVDA);
        exchange.registerPool(address(xGOOGL), pxGOOGL, FEED_GOOGL);
        exchange.registerPool(address(xAAPL),  pxAAPL,  FEED_AAPL);
        exchange.registerPool(address(xSPY),   pxSPY,   FEED_SPY);
        exchange.registerPool(address(xTBLL),  pxTBLL,  FEED_TBLL);
        exchange.registerPool(address(xGLD),   pxGLD,   FEED_GLD);
        exchange.registerPool(address(xSLV),   pxSLV,   FEED_SLV);

        keeper = new MarketKeeper(address(exchange), address(pythAdapter), deployer);
        exchange.setKeeper(address(keeper));
        keeper.addKeeper(keeperBot);

        escrow = new DxLeaseEscrow(address(vault), address(usdc), 1e6);

        vm.stopPrank();
    }

    function _seedBalances() internal {
        address[8] memory xs = [
            address(xTSLA), address(xNVDA), address(xGOOGL), address(xAAPL),
            address(xSPY),  address(xTBLL), address(xGLD),   address(xSLV)
        ];
        address[8] memory px = [pxTSLA, pxNVDA, pxGOOGL, pxAAPL, pxSPY, pxTBLL, pxGLD, pxSLV];

        // Mint USDC
        vm.startPrank(deployer);
        usdc.mint(lpProvider, 10_000_000e6);
        usdc.mint(alice,         200_000e6);
        usdc.mint(bob,           200_000e6);
        usdc.mint(charlie,       200_000e6);
        usdc.mint(dave,          200_000e6);

        // Mint xStocks to deployer, dividend reserves, and actors
        for (uint256 i = 0; i < 8; i++) {
            MockXStock(xs[i]).mint(deployer,          500_000e18);
            MockXStock(xs[i]).mint(alice,              10_000e18);
            MockXStock(xs[i]).mint(charlie,            10_000e18);
            MockXStock(xs[i]).mint(address(vault),     10_000e18); // dividend reserve
        }
        vm.stopPrank();

        // LP seeds $200k USDC per pool
        vm.startPrank(lpProvider);
        usdc.approve(address(exchange), type(uint256).max);
        for (uint256 i = 0; i < 8; i++) {
            exchange.depositLiquidity(px[i], 200_000e6);
        }
        vm.stopPrank();

        // Deployer seeds vault with 100k of each xStock + 50k px reserves to exchange
        vm.startPrank(deployer);
        for (uint256 i = 0; i < 8; i++) {
            IERC20(xs[i]).approve(address(vault), type(uint256).max);
            vault.deposit(xs[i], 100_000e18);
            IERC20(px[i]).approve(address(exchange), type(uint256).max);
            exchange.depositPxReserve(px[i], 50_000e18);
        }
        vm.stopPrank();

        // Approvals for trading actors
        vm.startPrank(alice);
        usdc.approve(address(exchange), type(uint256).max);
        usdc.approve(address(escrow),   type(uint256).max);
        for (uint256 i = 0; i < 8; i++) {
            IERC20(xs[i]).approve(address(vault), type(uint256).max);
        }
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(exchange), type(uint256).max);
        usdc.approve(address(escrow),   type(uint256).max);
        vm.stopPrank();

        vm.startPrank(charlie);
        usdc.approve(address(exchange), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(dave);
        usdc.approve(address(exchange), type(uint256).max);
        vm.stopPrank();
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /// @dev Single-feed price update. priceSeq ensures publishTime > stored.
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
        fee        = mockPyth.getUpdateFee(updates);
    }

    /// @dev Multi-feed combined price update for EOD settlement.
    ///      Returns (updates, feePerPool) where feePerPool covers one pool's call.
    function _multiPriceUpdate(bytes32[] memory feedIds, int64[] memory prices)
        internal
        returns (bytes[] memory updates, uint256 feePerPool)
    {
        require(feedIds.length == prices.length, "length mismatch");
        updates = new bytes[](feedIds.length);
        for (uint256 i = 0; i < feedIds.length; i++) {
            uint64 publishTime = uint64(block.timestamp) + priceSeq;
            priceSeq++;
            updates[i] = mockPyth.createPriceFeedUpdateData(
                feedIds[i], prices[i], uint64(100), int32(-2), prices[i], uint64(100), publishTime
            );
        }
        feePerPool = mockPyth.getUpdateFee(updates);
    }
}
