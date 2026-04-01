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

/// @title  DayTradingTest
/// @notice Simulates a full trading day on pendleX with realistic timing via vm.warp.
///
/// Trading day schedule (all times relative to DAY_START):
///   09:30  Market opens
///   10:00  Alice: 3x long xAAPL @ $213.42  (manual close at 14:00)
///   10:30  Bob:   2x short xSPY  @ $587.50 (keeper settles at EOD)
///   11:00  Charlie: 3x long xSPY  @ $587.50 (keeper settles at EOD)
///   13:00  Dividend event -- xAAPL +0.2% rebase
///   13:30  Alice claims dividend
///   14:00  Alice closes xAAPL long @ $220  (manually, captures PnL)
///   14:30  Bob opens 5x long xAAPL @ $220 with $2k collateral (risky)
///   15:00  xAAPL crashes to $180 -- Bob's position is 91% underwater -> LIQUIDATED
///   15:30  Bob claims xAAPL dividend (0.2% on 500 dx shares)
///   16:00  End-of-day settlement "auction": keeper closes market for xSPY @ $572
///          - Bob's short  (entry $587.50 -> $572):  profit
///          - Charlie's long (entry $587.50 -> $572): loss
///   16:05  LP withdraws; final balances verified
///
/// Tests exercised:
///   - openLong / closeLong (manual trader close, exact position ID)
///   - openShort / settleAllPositions (keeper EOD auction)
///   - liquidate (health factor < 0.2)
///   - syncDividend / pendingDividend / claimDividend (multi-user)
///   - LP deposit / withdrawLiquidity
///   - vm.warp for realistic intraday timing
///
/// Run:
///   forge test --match-contract DayTradingTest -vv
///   forge test --match-contract DayTradingTest -vvvv
contract DayTradingTest is Test {
    // ---------- Pyth feed IDs ----------
    bytes32 constant AAPL_FEED = bytes32(uint256(1));
    bytes32 constant SPY_FEED  = bytes32(uint256(2));

    // ---------- Simulated day timestamps ----------
    // Base: arbitrary Unix timestamp anchored to a weekday morning
    uint256 constant DAY_START    = 1_700_100_000; // ~Nov 15 2023 09:00 UTC
    uint256 constant T_OPEN       = DAY_START + 1800;   //  09:30
    uint256 constant T_ALICE_LONG = DAY_START + 3600;   //  10:00
    uint256 constant T_BOB_SHORT  = DAY_START + 5400;   //  10:30
    uint256 constant T_CHARLIE    = DAY_START + 7200;   //  11:00
    uint256 constant T_DIVIDEND   = DAY_START + 14400;  //  13:00
    uint256 constant T_CLAIM_DIV  = DAY_START + 16200;  //  13:30
    uint256 constant T_ALICE_CLOSE= DAY_START + 18000;  //  14:00
    uint256 constant T_BOB_LIQ    = DAY_START + 19800;  //  14:30
    uint256 constant T_CRASH      = DAY_START + 21600;  //  15:00
    uint256 constant T_BOB_CLAIM  = DAY_START + 23400;  //  15:30
    uint256 constant T_EOD        = DAY_START + 25200;  //  16:00
    uint256 constant T_SETTLE     = DAY_START + 25500;  //  16:05

    // ---------- Actors ----------
    address deployer;
    address lpProvider;
    address alice;
    address bob;
    address charlie;
    address keeperBot;
    address liquidatorBot;

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

    // Position IDs captured at open for manual close / liquidation
    bytes32 aliceLongPosId;
    bytes32 bobShortPosId;
    bytes32 charlieLongPosId;
    bytes32 bobRiskyPosId;

    // Monotonic publishTime offset so MockPyth accepts successive updates
    uint64 priceSeq;

    // =========================================================================
    // Setup
    // =========================================================================

    function setUp() public {
        deployer      = makeAddr("deployer");
        lpProvider    = makeAddr("lpProvider");
        alice         = makeAddr("alice");
        bob           = makeAddr("bob");
        charlie       = makeAddr("charlie");
        keeperBot     = makeAddr("keeperBot");
        liquidatorBot = makeAddr("liquidatorBot");

        vm.deal(deployer,      10 ether);
        vm.deal(lpProvider,     1 ether);
        vm.deal(alice,          1 ether);
        vm.deal(bob,            1 ether);
        vm.deal(charlie,        1 ether);
        vm.deal(keeperBot,      1 ether);
        vm.deal(liquidatorBot,  1 ether);

        // Start at day-open so vm.warp in tests is relative to a known base
        vm.warp(DAY_START);

        _deployContracts();
        _seedBalances();
    }

    // =========================================================================
    // Main test
    // =========================================================================

    function test_fullTradingDay() public {
        console.log("=================================================");
        console.log("  pendleX Full Day Trading Test");
        console.log("  xAAPL (long/close/liq) + xSPY (short+long/eod)");
        console.log("=================================================");

        _openMarket();
        _morningTrading();
        _dividendEvent();
        _afternoonTrading();
        _liquidation();
        _dividendClaims();
        _endOfDaySettlementAuction();
        _lpWithdrawal();
    }

    // =========================================================================
    // Phase A: Market opens at 09:30
    // =========================================================================

    function _openMarket() internal {
        vm.warp(T_OPEN);
        console.log("\n--- 09:30 MARKET OPEN ---");

        vm.startPrank(keeperBot);
        keeper.openMarket();
        vm.stopPrank();

        assertTrue(exchange.marketOpen(), "Market should be open");
        console.log("  Market is OPEN at timestamp:", block.timestamp);
    }

    // =========================================================================
    // Phase B: Morning trading -- three positions opened
    //
    //   10:00  Alice:   3x long  xAAPL @ $213.42  ($5k collateral)
    //   10:30  Bob:     2x short xSPY  @ $587.50  ($4k collateral)
    //   11:00  Charlie: 3x long  xSPY  @ $587.50  ($3k collateral)
    // =========================================================================

    function _morningTrading() internal {
        // ---- 10:00 Alice opens 3x long xAAPL ----
        vm.warp(T_ALICE_LONG);
        console.log("\n--- 10:00 Alice opens 3x long xAAPL @ $213.42 ---");

        (bytes[] memory u, uint256 f) = _priceUpdate(AAPL_FEED, 21342);
        vm.startPrank(alice);
        aliceLongPosId = exchange.openLong{value: f}(pxAAPL, 5_000e6, 3e18, u);
        vm.stopPrank();

        XStreamExchange.Position memory ap = exchange.getPosition(aliceLongPosId);
        console.log("  Alice posId: [captured]");
        console.log("  Entry price (1e18):", ap.entryPrice);
        console.log("  Size (px, 1e18):   ", ap.size);
        console.log("  Collateral (USDC): ", ap.collateral);
        assertEq(ap.trader, alice);
        assertTrue(ap.isLong);

        // ---- 10:30 Bob opens 2x short xSPY ----
        vm.warp(T_BOB_SHORT);
        console.log("\n--- 10:30 Bob opens 2x short xSPY @ $587.50 ---");

        (u, f) = _priceUpdate(SPY_FEED, 58750);
        vm.startPrank(bob);
        bobShortPosId = exchange.openShort{value: f}(pxSPY, 4_000e6, 2e18, u);
        vm.stopPrank();

        XStreamExchange.Position memory bp = exchange.getPosition(bobShortPosId);
        console.log("  Bob posId: [captured]");
        console.log("  Entry price (1e18):", bp.entryPrice);
        console.log("  Collateral (USDC): ", bp.collateral);
        assertFalse(bp.isLong);

        // ---- 11:00 Charlie opens 3x long xSPY ----
        vm.warp(T_CHARLIE);
        console.log("\n--- 11:00 Charlie opens 3x long xSPY @ $587.50 ---");

        (u, f) = _priceUpdate(SPY_FEED, 58750);
        vm.startPrank(charlie);
        charlieLongPosId = exchange.openLong{value: f}(pxSPY, 3_000e6, 3e18, u);
        vm.stopPrank();

        XStreamExchange.Position memory cp = exchange.getPosition(charlieLongPosId);
        console.log("  Charlie posId: [captured]");
        console.log("  Collateral (USDC):", cp.collateral);
        assertTrue(cp.isLong);

        console.log("\n  --- Morning snapshot ---");
        console.log("  Open xAAPL positions:", exchange.getOpenPositionCount(pxAAPL));
        console.log("  Open xSPY  positions:", exchange.getOpenPositionCount(pxSPY));
        console.log("  xAAPL open interest (long):", exchange.getPoolConfig(pxAAPL).openInterestLong);
        console.log("  xSPY  open interest (long):", exchange.getPoolConfig(pxSPY).openInterestLong);
        console.log("  xSPY  open interest (short):", exchange.getPoolConfig(pxSPY).openInterestShort);

        assertEq(exchange.getOpenPositionCount(pxAAPL), 1, "1 xAAPL position open");
        assertEq(exchange.getOpenPositionCount(pxSPY),  2, "2 xSPY positions open");
    }

    // =========================================================================
    // Phase C: Dividend event at 13:00
    //   xAAPL rebase: multiplier +0.2% (200bps from 1e18 -> 1.002e18)
    //   Alice has 1000 dxAAPL -> pending = 1000 * 0.002 = 2 xAAPL
    //   Bob   has  500 dxAAPL -> pending =  500 * 0.002 = 1 xAAPL
    // =========================================================================

    function _dividendEvent() internal {
        vm.warp(T_DIVIDEND);
        console.log("\n--- 13:00 DIVIDEND EVENT: xAAPL rebase +0.2% ---");

        // Current state before rebase
        uint256 alicePre = vault.pendingDividend(address(xAAPL), alice);
        uint256 bobPre   = vault.pendingDividend(address(xAAPL), bob);
        assertEq(alicePre, 0, "No pending dividend before event");
        assertEq(bobPre,   0, "No pending dividend before event");

        // Trigger rebase: multiplier 1e18 -> 1.002e18
        vm.startPrank(deployer);
        xAAPL.setMultiplier(1_002_000_000_000_000_000);
        vault.syncDividend(address(xAAPL));
        vm.stopPrank();

        // Verify pending dividends
        uint256 alicePending = vault.pendingDividend(address(xAAPL), alice);
        uint256 bobPending   = vault.pendingDividend(address(xAAPL), bob);

        // pendingDividend = dxBalance * multiplierDelta / 1e18
        // Alice: 1000e18 * 2e15 / 1e18 = 2e18
        // Bob:    500e18 * 2e15 / 1e18 = 1e18
        uint256 multiplierDelta = 1_002_000_000_000_000_000 - 1e18; // 2e15
        uint256 expectedAlice   = (1_000e18 * multiplierDelta) / 1e18;
        uint256 expectedBob     = (500e18  * multiplierDelta) / 1e18;

        console.log("  Multiplier delta (1e18 units):", multiplierDelta);
        console.log("  Alice dxAAPL:  1,000 -> pending:", alicePending);
        console.log("  Bob   dxAAPL:    500 -> pending:", bobPending);
        console.log("  Expected Alice:", expectedAlice);
        console.log("  Expected Bob:  ", expectedBob);

        assertEq(alicePending, expectedAlice, "Alice dividend amount mismatch");
        assertEq(bobPending,   expectedBob,   "Bob dividend amount mismatch");
    }

    // =========================================================================
    // Phase D: Alice claims dividend at 13:30, then closes her long at 14:00
    //   xAAPL rose from $213.42 to $220 (+3.1%)
    //   3x leverage => ~9.3% gain on notional
    //   Expected profit ~$462 on $5k collateral
    // =========================================================================

    function _afternoonTrading() internal {
        // ---- 13:30 Alice claims dividend ----
        vm.warp(T_CLAIM_DIV);
        console.log("\n--- 13:30 Alice claims xAAPL dividend ---");

        uint256 xAaplBefore = xAAPL.balanceOf(alice);
        vm.startPrank(alice);
        vault.claimDividend(address(xAAPL));
        vm.stopPrank();
        uint256 claimed = xAAPL.balanceOf(alice) - xAaplBefore;

        console.log("  Alice xAAPL claimed:", claimed);
        console.log("  Alice pending after claim:", vault.pendingDividend(address(xAAPL), alice));
        assertEq(claimed, 2e18, "Alice should receive exactly 2 xAAPL");
        assertEq(vault.pendingDividend(address(xAAPL), alice), 0, "No pending after claim");

        // ---- 14:00 Alice closes her 3x long xAAPL @ $220 ----
        vm.warp(T_ALICE_CLOSE);
        console.log("\n--- 14:00 Alice closes 3x long xAAPL @ $220 (+3.1%) ---");

        uint256 usdcBefore = usdc.balanceOf(alice);
        (bytes[] memory u, uint256 f) = _priceUpdate(AAPL_FEED, 22000);
        vm.startPrank(alice);
        int256 pnl = exchange.closeLong{value: f}(aliceLongPosId, u);
        vm.stopPrank();
        uint256 usdcAfter = usdc.balanceOf(alice);

        console.log("  PnL (1e18 units):", pnl);
        console.log("  PnL in USDC ($):  ", uint256(pnl) / 1e12);
        console.log("  USDC returned:    ", usdcAfter - usdcBefore);
        console.log("  Alice total USDC: ", usdcAfter);

        assertGt(pnl, 0, "Alice long should be profitable (xAAPL went up)");
        // Confirm position is deleted
        XStreamExchange.Position memory closed = exchange.getPosition(aliceLongPosId);
        assertEq(closed.trader, address(0), "Position must be deleted after close");
        assertEq(exchange.getOpenPositionCount(pxAAPL), 0, "No xAAPL positions remaining");

        // ---- 14:30 Bob opens a new risky 5x long xAAPL @ $220 ----
        vm.warp(T_BOB_LIQ);
        console.log("\n--- 14:30 Bob opens 5x long xAAPL @ $220 (risky) ---");

        (u, f) = _priceUpdate(AAPL_FEED, 22000);
        vm.startPrank(bob);
        bobRiskyPosId = exchange.openLong{value: f}(pxAAPL, 2_000e6, 5e18, u);
        vm.stopPrank();

        XStreamExchange.Position memory rp = exchange.getPosition(bobRiskyPosId);
        console.log("  Collateral stored:", rp.collateral);
        console.log("  Size (px, 1e18):  ", rp.size);
        // notional = 2000 * 5 = $10k; fee = $5; stored = $1995
        assertEq(rp.collateral, 1_995e6, "Stored collateral must equal deposit minus fee");
    }

    // =========================================================================
    // Phase E: Liquidation at 15:00
    //   xAAPL crashes from $220 to $180 (-18.2%)
    //   Bob's 5x long: loss = $10k * (40/220) = $1,818 on $1,995 collateral = 91% > 80%
    //   liquidatorBot earns 10% of remaining collateral ($17.68)
    // =========================================================================

    function _liquidation() internal {
        vm.warp(T_CRASH);
        console.log("\n--- 15:00 CRASH: xAAPL $220 -> $180 (-18.2%) ---");

        uint256 liqBefore = usdc.balanceOf(liquidatorBot);

        // Crash price update: publishTime must strictly exceed any prior update
        (bytes[] memory u, uint256 f) = _priceUpdate(AAPL_FEED, 18000);

        // Verify the position IS liquidatable before calling liquidate
        // loss = notional * (1 - exitPrice/entryPrice) = $10k * (40/220) = ~$1818.18
        // loss / collateral = 1818 / 1995 = 91.1% > 80% threshold
        console.log("  Expected loss ratio: 91.1% (> 80% threshold)");

        vm.startPrank(liquidatorBot);
        uint256 reward = exchange.liquidate{value: f}(bobRiskyPosId, u);
        vm.stopPrank();

        uint256 liqReward = usdc.balanceOf(liquidatorBot) - liqBefore;
        console.log("  Liquidator reward (USDC, 6dec):", liqReward);
        console.log("  Liquidator reward ($):         ", liqReward / 1e6);

        // position deleted
        XStreamExchange.Position memory liqPos = exchange.getPosition(bobRiskyPosId);
        assertEq(liqPos.trader, address(0), "Position must be deleted after liquidation");
        assertGt(liqReward, 0, "Liquidator must receive a reward");
        assertEq(exchange.getOpenPositionCount(pxAAPL), 0, "No xAAPL positions after liquidation");

        // Expected: remaining = $1,995 - $1,818.18 = $176.82; reward = 10% = $17.68
        // 10% of remaining; remaining > 0 since loss < collateral
        uint256 notional    = 2_000e6 * 5; // $10k
        uint256 fee         = notional * 5 / 10000; // $5
        uint256 storedColl  = 2_000e6 - fee; // $1,995
        // size = notional * 1e12 * 1e18 / price  (price = 22000e16)
        uint256 size        = notional * 1e12 * 1e18 / (22000 * 1e16);
        // pnl in 1e18 units: size * (exitPrice - entryPrice) / 1e18 (long, price fell)
        uint256 exit18      = 18000 * 1e16;
        uint256 entry18     = 22000 * 1e16;
        int256  pnl18       = int256(size) * (int256(exit18) - int256(entry18)) / int256(1e18);
        uint256 lossUsdc    = uint256(-pnl18) / 1e12;
        uint256 remaining   = storedColl > lossUsdc ? storedColl - lossUsdc : 0;
        uint256 expectedRew = remaining * 1000 / 10000; // LIQUIDATION_REWARD_BPS = 1000

        console.log("  Expected reward ($):           ", expectedRew / 1e6);
        assertEq(reward, expectedRew, "Liquidation reward calculation mismatch");
    }

    // =========================================================================
    // Phase F: Bob claims his xAAPL dividend at 15:30
    //   Bob has 500 dxAAPL, dividend from the 13:00 rebase = 1 xAAPL
    // =========================================================================

    function _dividendClaims() internal {
        vm.warp(T_BOB_CLAIM);
        console.log("\n--- 15:30 Bob claims xAAPL dividend ---");

        uint256 pendingBob = vault.pendingDividend(address(xAAPL), bob);
        console.log("  Bob pending dividend (xAAPL):", pendingBob);
        assertEq(pendingBob, 1e18, "Bob's 500 dxAAPL at +0.2% => 1 xAAPL");

        uint256 xBefore = xAAPL.balanceOf(bob);
        vm.startPrank(bob);
        vault.claimDividend(address(xAAPL));
        vm.stopPrank();
        uint256 received = xAAPL.balanceOf(bob) - xBefore;

        console.log("  Bob received xAAPL:", received);
        assertEq(received, 1e18, "Bob must receive exactly 1 xAAPL");
        assertEq(vault.pendingDividend(address(xAAPL), bob), 0, "No pending after claim");
    }

    // =========================================================================
    // Phase G: End-of-day settlement "auction" at 16:00
    //   Keeper closes market for xSPY pool at closing price $572
    //   Two open positions are settled:
    //     1. Bob's 2x short xSPY (entry $587.50, exit $572) -> PROFIT for Bob
    //     2. Charlie's 3x long xSPY (entry $587.50, exit $572) -> LOSS for Charlie
    //   The keeper's settleAllPositions call is the on-chain settlement "auction":
    //   all remaining open positions are cleared at a single fair closing price.
    // =========================================================================

    function _endOfDaySettlementAuction() internal {
        vm.warp(T_EOD);
        console.log("\n--- 16:00 END-OF-DAY SETTLEMENT AUCTION ---");
        console.log("  Closing price: xSPY @ $572 (down 2.6% from open @ $587.50)");

        uint256 openCount = exchange.getOpenPositionCount(pxSPY);
        console.log("  Open xSPY positions to settle:", openCount);
        assertEq(openCount, 2, "Two xSPY positions must still be open at EOD");

        uint256 bobUsdcBefore     = usdc.balanceOf(bob);
        uint256 charlieUsdcBefore = usdc.balanceOf(charlie);

        (bytes[] memory u, uint256 f) = _priceUpdate(SPY_FEED, 57200);
        address[] memory pxTokens = new address[](1);
        pxTokens[0] = pxSPY;

        vm.startPrank(keeperBot);
        keeper.closeMarket{value: f}(pxTokens, u);
        vm.stopPrank();

        uint256 bobUsdcAfter     = usdc.balanceOf(bob);
        uint256 charlieUsdcAfter = usdc.balanceOf(charlie);

        int256 bobSpyPnl     = int256(bobUsdcAfter)     - int256(bobUsdcBefore);
        int256 charlieSpyPnl = int256(charlieUsdcAfter) - int256(charlieUsdcBefore);

        console.log("  Bob short xSPY PnL ($):        ", uint256(bobSpyPnl)     / 1e6);
        console.log("  Charlie long  xSPY PnL ($):   ");
        console.log("    USDC returned:", charlieUsdcAfter - charlieUsdcBefore);

        assertFalse(exchange.marketOpen(), "Market must be closed after EOD auction");
        assertEq(exchange.getOpenPositionCount(pxSPY), 0, "All xSPY positions settled");

        // Bob's short should profit (price fell from $587.50 to $572)
        assertGt(bobSpyPnl, int256(4_000e6),
            "Bob (short) receives at least collateral back since xSPY fell");

        // Charlie's long should lose (price fell against his position)
        assertLt(charlieSpyPnl, int256(3_000e6),
            "Charlie (long) receives less than collateral since xSPY fell");

        console.log("\n  Settlement complete. Positions: 0 xAAPL, 0 xSPY");

        // Print both positions settled details
        console.log("  Bob   xSPY returned ($):", bobUsdcAfter / 1e6);
        console.log("  Charlie xSPY returned ($):", charlieUsdcAfter / 1e6);
    }

    // =========================================================================
    // Phase H: LP withdrawal at 16:05 with fee income summary
    // =========================================================================

    function _lpWithdrawal() internal {
        vm.warp(T_SETTLE);
        console.log("\n--- 16:05 LP WITHDRAWAL & DAY SUMMARY ---");

        XStreamExchange.PoolConfig memory aaplPool = exchange.getPoolConfig(pxAAPL);
        XStreamExchange.PoolConfig memory spyPool  = exchange.getPoolConfig(pxSPY);

        console.log("  xAAPL pool USDC liquidity:", aaplPool.usdcLiquidity);
        console.log("  xAAPL pool total fees:    ", aaplPool.totalFees);
        console.log("  xSPY  pool USDC liquidity:", spyPool.usdcLiquidity);
        console.log("  xSPY  pool total fees:    ", spyPool.totalFees);

        uint256 lpAaplShares = IERC20(aaplPool.lpToken).balanceOf(lpProvider);
        uint256 lpSpyShares  = IERC20(spyPool.lpToken).balanceOf(lpProvider);

        uint256 lpBefore = usdc.balanceOf(lpProvider);
        vm.startPrank(lpProvider);
        exchange.withdrawLiquidity(pxAAPL, lpAaplShares);
        exchange.withdrawLiquidity(pxSPY,  lpSpyShares);
        vm.stopPrank();

        uint256 lpAfter = usdc.balanceOf(lpProvider);
        console.log("\n  LP deposited:  $1,000,000");
        console.log("  LP received:   $", (lpAfter - lpBefore) / 1e6);
        console.log("  LP net PnL ($):");
        int256 lpNet = int256(lpAfter - lpBefore) - int256(1_000_000e6);
        if (lpNet >= 0) {
            console.log("    + (profit):", uint256(lpNet) / 1e6);
        } else {
            console.log("    - (loss):  ", uint256(-lpNet) / 1e6);
        }

        assertGt(lpAfter - lpBefore, 0, "LP must receive something back");

        console.log("\n  ============ FINAL DAY SUMMARY ============");
        console.log("  Alice USDC:     $", usdc.balanceOf(alice) / 1e6);
        console.log("  Alice xAAPL:    ", xAAPL.balanceOf(alice));
        console.log("  Bob   USDC:     $", usdc.balanceOf(bob) / 1e6);
        console.log("  Bob   xAAPL:    ", xAAPL.balanceOf(bob));
        console.log("  Charlie USDC:   $", usdc.balanceOf(charlie) / 1e6);
        console.log("  LP final USDC:  $", usdc.balanceOf(lpProvider) / 1e6);
        console.log("  ===========================================");
    }

    // =========================================================================
    // Deployment helpers (called in setUp)
    // =========================================================================

    function _deployContracts() internal {
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

        vm.stopPrank();
    }

    function _seedBalances() internal {
        // Mint USDC for traders and LP
        vm.startPrank(deployer);
        usdc.mint(lpProvider,  1_000_000e6);
        usdc.mint(alice,          50_000e6);
        usdc.mint(bob,           100_000e6);
        usdc.mint(charlie,        50_000e6);

        // Mint xAAPL and xSPY for vault seeding
        xAAPL.mint(deployer,    200_000e18);
        xSPY.mint(deployer,     200_000e18);
        // Alice and Bob will deposit xAAPL into vault for dividend tracking
        xAAPL.mint(alice,        10_000e18);
        xAAPL.mint(bob,           5_000e18);
        vm.stopPrank();

        // LP provides $500k liquidity to each pool
        vm.startPrank(lpProvider);
        usdc.approve(address(exchange), type(uint256).max);
        exchange.depositLiquidity(pxAAPL, 500_000e6);
        exchange.depositLiquidity(pxSPY,  500_000e6);
        vm.stopPrank();

        // Deployer seeds vault + px reserves
        vm.startPrank(deployer);
        xAAPL.approve(address(vault), type(uint256).max);
        xSPY.approve(address(vault),  type(uint256).max);
        vault.deposit(address(xAAPL), 100_000e18);
        vault.deposit(address(xSPY),  100_000e18);
        PrincipalToken(pxAAPL).approve(address(exchange), type(uint256).max);
        PrincipalToken(pxSPY).approve(address(exchange),  type(uint256).max);
        exchange.depositPxReserve(pxAAPL, 50_000e18);
        exchange.depositPxReserve(pxSPY,  50_000e18);
        // Extra xStock to vault for dividend payouts
        xAAPL.mint(address(vault), 10_000e18);
        xSPY.mint(address(vault),  10_000e18);
        vm.stopPrank();

        // Alice deposits 1,000 xAAPL -> 1,000 pxAAPL + 1,000 dxAAPL
        vm.startPrank(alice);
        xAAPL.approve(address(vault), type(uint256).max);
        vault.deposit(address(xAAPL), 1_000e18);
        usdc.approve(address(exchange), type(uint256).max);
        vm.stopPrank();

        // Bob deposits 500 xAAPL -> 500 pxAAPL + 500 dxAAPL (dividend participation)
        vm.startPrank(bob);
        xAAPL.approve(address(vault), type(uint256).max);
        vault.deposit(address(xAAPL), 500e18);
        usdc.approve(address(exchange), type(uint256).max);
        vm.stopPrank();

        // Charlie approves exchange for USDC trading
        vm.startPrank(charlie);
        usdc.approve(address(exchange), type(uint256).max);
        vm.stopPrank();
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /// @dev Single-feed Pyth price update.
    ///      publishTime = block.timestamp + priceSeq ensures MockPyth
    ///      always accepts the update (its rule: publishTime > storedPublishTime).
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
