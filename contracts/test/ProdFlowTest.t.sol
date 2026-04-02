// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import {PythAdapter}     from "../src/PythAdapter.sol";
import {XStreamVault}    from "../src/XStreamVault.sol";
import {XStreamExchange} from "../src/XStreamExchange.sol";
import {MarketKeeper}    from "../src/MarketKeeper.sol";
import {DxLeaseEscrow}   from "../src/DxLeaseEscrow.sol";
import {PrincipalToken}  from "../src/tokens/PrincipalToken.sol";
import {MockUSDC}        from "./mocks/MockUSDC.sol";
import {MockXStock}      from "./mocks/MockXStock.sol";

/// @title  ProdFlowTest
/// @notice Integration test that verifies the full protocol flow against the real
///         IPyth / PythStructs ABI using vm.mockCall -- no MockPyth dependency.
///
///         This validates that PythAdapter correctly encodes and decodes all Pyth
///         contract calls. The mocked "real" Pyth address simulates what the actual
///         Pyth deployment on Ink (or any chain) would respond with.
///
/// What is tested:
///   - PythAdapter.getPrice correctly calls IPyth.updatePriceFeeds + getPriceNoOlderThan
///   - PythAdapter.getUpdateFee delegates to IPyth.getUpdateFee
///   - Price normalization: expo=-2, price=25012 => 250.12 * 1e18 = 2.5012e20
///   - Full trading cycle (long, short, close, liquidation, keeper EOD)
///   - DividendToken + vault yield split using MockXStock.setMultiplier
///   - DxLeaseEscrow auction + claimAndDistribute
///
/// How mocking works:
///   vm.mockCall(target, calldataPrefix, returnData) intercepts any call to
///   `target` whose calldata starts with calldataPrefix and returns returnData.
///   Calling vm.mockCall again for the same prefix overwrites the previous mock.
///   This lets us update prices between trades without any helper contract.
///
/// Run:
///   forge test --match-contract ProdFlowTest -vv
///   forge test --match-contract ProdFlowTest -vvvv
contract ProdFlowTest is Test {

    // =========================================================================
    // "Real" Pyth address (mocked via vm.mockCall -- no actual network access)
    // =========================================================================

    // Ink Mainnet Pyth contract address (placeholder; real address TBD)
    address constant REAL_PYTH     = address(0x4374e5A8b9C22271E9eB878a2aA31cE9Cb4b2ec5);
    uint256 constant MAX_STALENESS = 3600; // 1 hour

    // =========================================================================
    // Feed IDs (bytes32 -- same format used by Pyth Network price feeds)
    // =========================================================================

    bytes32 constant FEED_AAPL = 0xd9912df360b5b09df4b9d04e74b54e8e56df840ec00ca879dfa3d4c14afbb640;
    bytes32 constant FEED_SPY  = 0x19924739ca7b4f9e0a49e9b3b9a9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1;

    // =========================================================================
    // Actors
    // =========================================================================

    address internal deployer;
    address internal lpProvider;
    address internal alice;
    address internal bob;
    address internal keeperBot;
    address internal liquidatorBot;

    // =========================================================================
    // Contracts
    // =========================================================================

    PythAdapter     internal pythAdapter;
    MockUSDC        internal usdc;
    XStreamVault    internal vault;
    XStreamExchange internal exchange;
    MarketKeeper    internal keeper;
    DxLeaseEscrow   internal escrow;

    MockXStock internal xAAPL;
    MockXStock internal xSPY;

    address internal pxAAPL; address internal dxAAPL;
    address internal pxSPY;  address internal dxSPY;

    // =========================================================================
    // Setup
    // =========================================================================

    function setUp() public {
        deployer     = makeAddr("deployer");
        lpProvider   = makeAddr("lpProvider");
        alice        = makeAddr("alice");
        bob          = makeAddr("bob");
        keeperBot    = makeAddr("keeperBot");
        liquidatorBot= makeAddr("liquidatorBot");

        vm.deal(alice,         10 ether);
        vm.deal(bob,           10 ether);
        vm.deal(keeperBot,     10 ether);
        vm.deal(liquidatorBot, 10 ether);
        // Fund REAL_PYTH so value-bearing calls to it don't revert
        vm.deal(REAL_PYTH, 100 ether);

        _setupPythMocks();
        _deployContracts();
        _seedBalances();
    }

    // =========================================================================
    // Test: Full trading day against real Pyth ABI
    // =========================================================================

    function test_prodFullTradingDay() public {
        console.log("==============================================");
        console.log("  ProdFlowTest: Real Pyth ABI via vm.mockCall");
        console.log("==============================================");

        _phase_openMarket();
        _phase_openPositions();
        _phase_dividendAndClaim();
        _phase_closeAndLiquidate();
        _phase_eodSettlement();
        _phase_lpWithdrawal();
    }

    // =========================================================================
    // Test: Price normalization from real Pyth format
    // =========================================================================

    function test_priceNormalization() public {
        // Pyth expo=-2, price=25012 => 250.12 USD => normalized to 250.12 * 1e18 = 2.5012e20
        uint256 normalized = pythAdapter.normalizePythPrice(25012, -2);
        assertEq(normalized, 25012 * 10 ** (18 - 2), "expo=-2 normalization incorrect");

        // expo=-8, price=1234567890 => BTC-like => 12.34567890 USD => 12345678900000000000
        normalized = pythAdapter.normalizePythPrice(1_234_567_890, -8);
        assertEq(normalized, 1_234_567_890 * 10 ** (18 - 8), "expo=-8 normalization incorrect");

        // expo=2, price=5 => 500 USD
        normalized = pythAdapter.normalizePythPrice(5, 2);
        assertEq(normalized, 5 * 10 ** (18 + 2), "positive expo normalization incorrect");

        console.log("  Price normalization: all 3 cases pass");
    }

    // =========================================================================
    // Test: DxLeaseEscrow full cycle using prod-style Pyth adapter
    // =========================================================================

    function test_prodEscrowCycle() public {
        // Alice deposits another 1000 xAAPL to vault (setUp already gave her 1000 dxAAPL)
        vm.prank(alice);
        vault.deposit(address(xAAPL), 1_000e18);
        assertEq(IERC20(dxAAPL).balanceOf(alice), 2_000e18);

        // Alice opens escrow auction: 500 dxAAPL, base $200, 1hr auction, 2hr lease
        vm.startPrank(alice);
        IERC20(dxAAPL).approve(address(escrow), type(uint256).max);
        uint256 listingId = escrow.openAuction(dxAAPL, 500e18, 200e6, 1 hours, 2 hours);
        vm.stopPrank();

        assertEq(IERC20(dxAAPL).balanceOf(address(escrow)), 500e18);

        // Bob bids 350 USDC
        vm.prank(bob);
        escrow.placeBid(listingId, 350e6);

        // xAAPL rebase during auction (escrow holds dx; dividend accrues to escrow)
        xAAPL.setMultiplier(1_002_000_000_000_000_000);
        vault.syncDividend(address(xAAPL));
        assertGt(vault.pendingDividend(address(xAAPL), address(escrow)), 0, "escrow has pending div");

        // Finalize (warp past auction end)
        vm.warp(block.timestamp + 1 hours + 1);
        uint256 aliceBefore = usdc.balanceOf(alice);
        escrow.finalizeAuction(listingId);
        assertEq(usdc.balanceOf(alice), aliceBefore + 350e6, "Alice received winning bid");

        // Bob is lessee: claimAndDistribute sends xAAPL to Bob
        uint256 bobXBefore = xAAPL.balanceOf(bob);
        uint256 claimed = escrow.claimAndDistribute(listingId);
        assertGt(claimed, 0, "dividend claimed");
        assertEq(xAAPL.balanceOf(bob), bobXBefore + claimed, "Bob received dividend as lessee");

        // Warp past lease end; second dividend goes to Alice
        vm.warp(block.timestamp + 2 hours + 1);
        xAAPL.setMultiplier(1_003_000_000_000_000_000);
        vault.syncDividend(address(xAAPL));

        uint256 aliceXBefore = xAAPL.balanceOf(alice);
        uint256 claimed2 = escrow.claimAndDistribute(listingId);
        assertGt(claimed2, 0, "second dividend claimed");
        assertEq(xAAPL.balanceOf(alice), aliceXBefore + claimed2, "Alice gets post-lease dividend");

        // Alice reclaims dx (2000 total - 500 in escrow + 500 reclaimed = 2000)
        vm.prank(alice);
        escrow.reclaimDx(listingId);
        assertEq(IERC20(dxAAPL).balanceOf(alice), 2_000e18, "Alice back to 2000 dxAAPL after reclaim");

        console.log("  Escrow full cycle: auction -> lease -> post-lease -> reclaim: PASS");
    }

    // =========================================================================
    // Phases
    // =========================================================================

    function _phase_openMarket() internal {
        console.log("\n--- Market OPEN ---");
        vm.prank(keeperBot);
        keeper.openMarket();
        assertTrue(exchange.marketOpen());
    }

    function _phase_openPositions() internal {
        console.log("\n--- Alice: 3x long xAAPL @ $250.12 ($5k) ---");
        _mockPrice(FEED_AAPL, 25012); // $250.12

        uint256 fee = pythAdapter.getUpdateFee(_dummyUpdates());
        assertEq(fee, 0, "getUpdateFee from real Pyth mock returns 0");

        bytes[] memory u = _dummyUpdates();
        vm.prank(alice);
        exchange.openLong{value: fee}(pxAAPL, 5_000e6, 3e18, u);

        XStreamExchange.Position memory ap = exchange.getPosition(
            exchange.openPositionIds(pxAAPL, 0)
        );
        assertEq(ap.trader, alice);
        assertTrue(ap.isLong);
        // Normalized price: 25012 * 1e16 = 2.5012e20
        assertEq(ap.entryPrice, 25012 * 1e16, "entry price normalized from Pyth expo=-2");
        console.log("  Alice position opened. Entry price:", ap.entryPrice);

        console.log("\n--- Bob: 2x short xSPY @ $662.29 ($4k) ---");
        _mockPrice(FEED_SPY, 66229); // $662.29

        vm.prank(bob);
        exchange.openShort{value: fee}(pxSPY, 4_000e6, 2e18, u);

        XStreamExchange.Position memory bp = exchange.getPosition(
            exchange.openPositionIds(pxSPY, 0)
        );
        assertEq(bp.trader, bob);
        assertFalse(bp.isLong);
        assertEq(bp.entryPrice, 66229 * 1e16, "SPY entry price normalized");
        console.log("  Bob short position opened. Entry price:", bp.entryPrice);

        // Risky position for liquidation test: Bob opens 5x long xAAPL @ $250.12 with $2k
        console.log("\n--- Bob: 5x long xAAPL @ $250.12 ($2k) [risky] ---");
        _mockPrice(FEED_AAPL, 25012);

        vm.prank(bob);
        exchange.openLong{value: fee}(pxAAPL, 2_000e6, 5e18, u);
        assertEq(exchange.getOpenPositionCount(pxAAPL), 2, "Alice + Bob long on AAPL");
    }

    function _phase_dividendAndClaim() internal {
        console.log("\n--- xAAPL rebase +0.3% -> Alice claims ---");

        // Alice deposited 1000 xAAPL into vault in setUp
        assertEq(IERC20(dxAAPL).balanceOf(alice), 1_000e18, "Alice holds 1000 dxAAPL");

        xAAPL.setMultiplier(1_003_000_000_000_000_000);
        vault.syncDividend(address(xAAPL));

        uint256 pending = vault.pendingDividend(address(xAAPL), alice);
        assertGt(pending, 0, "Alice has pending xAAPL dividend");
        console.log("  Alice pending xAAPL:", pending);

        uint256 xBefore = xAAPL.balanceOf(alice);
        vm.prank(alice);
        vault.claimDividend(address(xAAPL));
        assertGt(xAAPL.balanceOf(alice), xBefore, "Alice received xAAPL from dividend");
        assertEq(vault.pendingDividend(address(xAAPL), alice), 0, "zero pending after claim");
    }

    function _phase_closeAndLiquidate() internal {
        console.log("\n--- Alice closes xAAPL long @ $265 (+5.9%) ---");
        _mockPrice(FEED_AAPL, 26500); // $265

        bytes[] memory u = _dummyUpdates();
        bytes32 alicePosId = exchange.openPositionIds(pxAAPL, 0);
        // Alice's position might not be at index 0 if Bob opened first on same timestamp
        // Find Alice's position
        for (uint256 i = 0; i < exchange.getOpenPositionCount(pxAAPL); i++) {
            bytes32 pid = exchange.openPositionIds(pxAAPL, i);
            if (exchange.getPosition(pid).trader == alice) {
                alicePosId = pid;
                break;
            }
        }

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        int256 pnl = exchange.closeLong{value: 0}(alicePosId, u);

        assertGt(pnl, 0, "Alice's long is profitable (price rose)");
        assertGt(usdc.balanceOf(alice), aliceBefore, "Alice received USDC back");
        console.log("  Alice PnL (1e18):", pnl);

        console.log("\n--- xAAPL crashes $250.12 -> $205 -> Bob's 5x long LIQUIDATED ---");
        _mockPrice(FEED_AAPL, 20500); // $205, ~18% drop -> 5x => ~90% loss -> liquidatable

        uint256 liqBefore = usdc.balanceOf(liquidatorBot);
        bytes32 bobPosId = exchange.openPositionIds(pxAAPL, 0);

        vm.prank(liquidatorBot);
        uint256 reward = exchange.liquidate{value: 0}(bobPosId, u);

        assertGt(reward, 0, "Liquidator earned reward");
        assertGt(usdc.balanceOf(liquidatorBot), liqBefore, "Liquidator USDC increased");
        assertEq(exchange.getOpenPositionCount(pxAAPL), 0, "All AAPL positions cleared");
        console.log("  Liquidation reward:", reward);
    }

    function _phase_eodSettlement() internal {
        console.log("\n--- EOD: Keeper closes xSPY position @ $640 ---");
        _mockPrice(FEED_SPY, 64000); // $640 (SPY fell from $662.29)

        uint256 bobBefore = usdc.balanceOf(bob);

        bytes[] memory u = _dummyUpdates();
        address[] memory pxTokens = new address[](1);
        pxTokens[0] = pxSPY;

        vm.prank(keeperBot);
        keeper.closeMarket{value: 0}(pxTokens, u);

        // Bob was short: price fell from $662.29 -> $640, short profits
        assertGt(usdc.balanceOf(bob), bobBefore, "Bob (short SPY) received USDC back");
        assertGt(usdc.balanceOf(bob) - bobBefore, 4_000e6, "Bob's short returned > collateral");
        assertEq(exchange.getOpenPositionCount(pxSPY), 0, "xSPY position settled");
        assertFalse(exchange.marketOpen(), "market closed after EOD");
        console.log("  Bob USDC returned (short SPY):", (usdc.balanceOf(bob) - bobBefore) / 1e6);
    }

    function _phase_lpWithdrawal() internal {
        console.log("\n--- LP withdraws from xAAPL and xSPY pools ---");

        uint256 lpBefore = usdc.balanceOf(lpProvider);

        vm.startPrank(lpProvider);
        {
            XStreamExchange.PoolConfig memory aaplPool = exchange.getPoolConfig(pxAAPL);
            uint256 aaplShares = IERC20(aaplPool.lpToken).balanceOf(lpProvider);
            if (aaplShares > 0) exchange.withdrawLiquidity(pxAAPL, aaplShares);
        }
        {
            XStreamExchange.PoolConfig memory spyPool = exchange.getPoolConfig(pxSPY);
            uint256 spyShares = IERC20(spyPool.lpToken).balanceOf(lpProvider);
            if (spyShares > 0) exchange.withdrawLiquidity(pxSPY, spyShares);
        }
        vm.stopPrank();

        uint256 lpAfter = usdc.balanceOf(lpProvider);
        assertGt(lpAfter - lpBefore, 0, "LP received USDC back");
        console.log("  LP received: $", (lpAfter - lpBefore) / 1e6);
        console.log("  LP deposited: $1,000,000 ($500k x 2)");
    }

    // =========================================================================
    // Pyth mock setup
    // =========================================================================

    /// @dev Mocks the three IPyth functions PythAdapter calls.
    ///      getUpdateFee -> 0 (simplifies value handling)
    ///      updatePriceFeeds -> void no-op
    ///      getPriceNoOlderThan -> set per-call via _mockPrice()
    function _setupPythMocks() internal {
        // getUpdateFee(bytes[]) -> returns 0
        vm.mockCall(
            REAL_PYTH,
            abi.encodeWithSelector(IPyth.getUpdateFee.selector),
            abi.encode(uint256(0))
        );

        // updatePriceFeeds(bytes[]) -> void, no return
        vm.mockCall(
            REAL_PYTH,
            abi.encodeWithSelector(IPyth.updatePriceFeeds.selector),
            ""
        );
    }

    /// @dev Updates the mocked price for a specific feed.
    ///      Overwrites any previous mock for the same feedId.
    ///      price is Pyth-format with expo=-2 (divide by 100 to get USD).
    function _mockPrice(bytes32 feedId, int64 price) internal {
        PythStructs.Price memory p;
        p.price       = price;
        p.conf        = 100;
        p.expo        = -2;
        p.publishTime = block.timestamp;

        vm.mockCall(
            REAL_PYTH,
            abi.encodeWithSelector(IPyth.getPriceNoOlderThan.selector, feedId, MAX_STALENESS),
            abi.encode(p)
        );
    }

    /// @dev Returns a dummy (empty-content) update array.
    ///      The actual bytes don't matter because updatePriceFeeds is mocked to be a no-op,
    ///      and the price is set via _mockPrice() on getPriceNoOlderThan.
    function _dummyUpdates() internal pure returns (bytes[] memory u) {
        u = new bytes[](1);
        u[0] = hex"";
    }

    // =========================================================================
    // Deployment + seeding
    // =========================================================================

    function _deployContracts() internal {
        vm.startPrank(deployer);

        // PythAdapter points to the real (mocked) Pyth address
        pythAdapter = new PythAdapter(REAL_PYTH, MAX_STALENESS);

        usdc  = new MockUSDC();
        xAAPL = new MockXStock("Dinari Apple xStock", "xAAPL");
        xSPY  = new MockXStock("Dinari SP500 xStock", "xSPY");

        vault = new XStreamVault();
        (pxAAPL, dxAAPL) = vault.registerAsset(address(xAAPL), FEED_AAPL, "AAPL");
        (pxSPY,  dxSPY)  = vault.registerAsset(address(xSPY),  FEED_SPY,  "SPY");

        exchange = new XStreamExchange(address(usdc), address(pythAdapter));
        exchange.registerPool(address(xAAPL), pxAAPL, FEED_AAPL);
        exchange.registerPool(address(xSPY),  pxSPY,  FEED_SPY);

        keeper = new MarketKeeper(address(exchange), address(pythAdapter), deployer);
        exchange.setKeeper(address(keeper));
        keeper.addKeeper(keeperBot);

        escrow = new DxLeaseEscrow(address(vault), address(usdc), 1e6);

        vm.stopPrank();
    }

    function _seedBalances() internal {
        vm.startPrank(deployer);
        usdc.mint(lpProvider,    1_000_000e6);
        usdc.mint(alice,           100_000e6);
        usdc.mint(bob,             100_000e6);

        xAAPL.mint(deployer,    500_000e18);
        xSPY.mint(deployer,     500_000e18);
        xAAPL.mint(alice,        10_000e18);
        xAAPL.mint(address(vault), 10_000e18); // dividend buffer
        xSPY.mint(address(vault),  10_000e18);
        vm.stopPrank();

        // LP provides $500k to each pool
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
        vm.stopPrank();

        // Alice deposits 1000 xAAPL for dividend participation
        vm.startPrank(alice);
        xAAPL.approve(address(vault), type(uint256).max);
        vault.deposit(address(xAAPL), 1_000e18);
        usdc.approve(address(exchange), type(uint256).max);
        usdc.approve(address(escrow),   type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(exchange), type(uint256).max);
        usdc.approve(address(escrow),   type(uint256).max);
        vm.stopPrank();
    }
}
