// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {XStreamExchange} from "../src/XStreamExchange.sol";
import {MarketKeeper} from "../src/MarketKeeper.sol";
import {PythAdapter} from "../src/PythAdapter.sol";
import {XStreamVault} from "../src/XStreamVault.sol";
import {PrincipalToken} from "../src/tokens/PrincipalToken.sol";
import {LPToken} from "../src/tokens/LPToken.sol";
import {MockPyth} from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockXStock} from "./mocks/MockXStock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract XStreamExchangeTest is Test {
    bytes32 constant FEED_ID = bytes32(uint256(1));

    MockPyth mockPyth;
    PythAdapter adapter;
    MockUSDC usdc;
    XStreamExchange exchange;
    MarketKeeper keeper;
    MockXStock xStock;
    XStreamVault vault;
    PrincipalToken pxToken;

    address owner;
    address trader;
    address lp;
    address keeperBot;

    function setUp() public {
        owner = address(this);
        trader = makeAddr("trader");
        lp = makeAddr("lp");
        keeperBot = makeAddr("keeperBot");

        // Deploy core infra
        mockPyth = new MockPyth(60, 1); // 60s valid, 1 wei fee
        adapter = new PythAdapter(address(mockPyth), 60);
        usdc = new MockUSDC();

        // Deploy vault and register asset to get pxToken
        vault = new XStreamVault();
        xStock = new MockXStock("Test XStock", "xTST");
        (address pxAddr,) = vault.registerAsset(address(xStock), FEED_ID, "Test");
        pxToken = PrincipalToken(pxAddr);

        // Deploy exchange
        exchange = new XStreamExchange(address(usdc), address(adapter));

        // Register pool
        exchange.registerPool(address(xStock), address(pxToken), FEED_ID);

        // Deploy keeper and wire it up
        keeper = new MarketKeeper(address(exchange), address(adapter), owner);
        exchange.setKeeper(address(keeper));
        keeper.addKeeper(keeperBot);

        // Seed liquidity: mint USDC to LP, deposit into exchange
        usdc.mint(lp, 1_000_000e6);
        vm.startPrank(lp);
        usdc.approve(address(exchange), type(uint256).max);
        exchange.depositLiquidity(address(pxToken), 500_000e6);
        vm.stopPrank();

        // Seed px reserve: deposit xStock into vault to get pxTokens, then deposit to exchange
        xStock.mint(owner, 100_000e18);
        xStock.approve(address(vault), type(uint256).max);
        vault.deposit(address(xStock), 100_000e18);
        pxToken.approve(address(exchange), type(uint256).max);
        exchange.depositPxReserve(address(pxToken), 100_000e18);

        // Give trader USDC
        usdc.mint(trader, 100_000e6);
        vm.prank(trader);
        usdc.approve(address(exchange), type(uint256).max);

        // Give ETH for pyth fees
        vm.deal(trader, 10 ether);
        vm.deal(keeperBot, 10 ether);
        vm.deal(owner, 10 ether);

        // Open the market
        vm.prank(keeperBot);
        keeper.openMarket();
    }

    // --- Helpers ---

    function _createPriceUpdate(int64 price) internal view returns (bytes[] memory updates, uint256 fee) {
        bytes memory updateData = mockPyth.createPriceFeedUpdateData(
            FEED_ID, price, uint64(100), int32(-2), price, uint64(100), uint64(block.timestamp)
        );
        updates = new bytes[](1);
        updates[0] = updateData;
        fee = adapter.getUpdateFee(updates);
    }

    // --- Tests ---

    function test_RegisterPool() public view {
        XStreamExchange.PoolConfig memory pool = exchange.getPoolConfig(address(pxToken));
        assertEq(pool.xStock, address(xStock));
        assertEq(pool.pythFeedId, FEED_ID);
        assertEq(pool.maxLeverage, 5e18);
        assertTrue(pool.lpToken != address(0));
    }

    function test_DepositLiquidity() public {
        uint256 depositAmount = 10_000e6;
        usdc.mint(trader, depositAmount);

        vm.startPrank(trader);
        usdc.approve(address(exchange), depositAmount);

        uint256 usdcBefore = usdc.balanceOf(trader);
        exchange.depositLiquidity(address(pxToken), depositAmount);
        uint256 usdcAfter = usdc.balanceOf(trader);
        vm.stopPrank();

        assertEq(usdcBefore - usdcAfter, depositAmount);

        XStreamExchange.PoolConfig memory pool = exchange.getPoolConfig(address(pxToken));
        // Pool had 500_000e6 from setUp plus this deposit
        assertEq(pool.usdcLiquidity, 500_000e6 + depositAmount);

        LPToken lpToken = LPToken(pool.lpToken);
        assertTrue(lpToken.balanceOf(trader) > 0);
    }

    function test_WithdrawLiquidity() public {
        XStreamExchange.PoolConfig memory pool = exchange.getPoolConfig(address(pxToken));
        LPToken lpToken = LPToken(pool.lpToken);
        uint256 lpShares = lpToken.balanceOf(lp);
        assertTrue(lpShares > 0);

        uint256 usdcBefore = usdc.balanceOf(lp);

        vm.prank(lp);
        exchange.withdrawLiquidity(address(pxToken), lpShares);

        uint256 usdcAfter = usdc.balanceOf(lp);
        uint256 returned = usdcAfter - usdcBefore;

        // Should get back ~500_000e6 (all the liquidity the LP deposited)
        assertEq(returned, 500_000e6);
        assertEq(lpToken.balanceOf(lp), 0);

        // Re-seed liquidity so later tests can still work if needed
        vm.startPrank(lp);
        usdc.approve(address(exchange), type(uint256).max);
        exchange.depositLiquidity(address(pxToken), returned);
        vm.stopPrank();
    }

    function test_OpenLong() public {
        vm.warp(block.timestamp);

        // Price = 213.42 USD (price=21342, expo=-2)
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));

        uint256 collateral = 1000e6; // 1000 USDC
        uint256 leverage = 2e18;     // 2x

        uint256 traderBefore = usdc.balanceOf(trader);

        vm.prank(trader);
        bytes32 positionId = exchange.openLong{value: fee}(
            address(pxToken), collateral, leverage, updates
        );

        uint256 traderAfter = usdc.balanceOf(trader);
        assertEq(traderBefore - traderAfter, collateral);

        XStreamExchange.Position memory pos = exchange.getPosition(positionId);
        assertEq(pos.trader, trader);
        assertEq(pos.pxToken, address(pxToken));
        assertTrue(pos.isLong);
        assertTrue(pos.size > 0);
        assertTrue(pos.entryPrice > 0);
        assertEq(pos.leverage, leverage);

        // collateral stored should be collateral minus fee
        // notional = 1000e6 * 2e18 / 1e18 = 2000e6
        // fee = 2000e6 * 5 / 10000 = 1e6
        uint256 expectedFee = 2000e6 * 5 / 10000;
        assertEq(pos.collateral, collateral - expectedFee);
    }

    function test_CloseLong_Profit() public {
        vm.warp(block.timestamp);

        // Open at 213.42
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));
        uint256 collateral = 1000e6;
        uint256 leverage = 2e18;

        vm.prank(trader);
        bytes32 positionId = exchange.openLong{value: fee}(
            address(pxToken), collateral, leverage, updates
        );

        uint256 traderBefore = usdc.balanceOf(trader);

        // Close at higher price: 250.00
        vm.warp(block.timestamp + 1);
        (bytes[] memory closeUpdates, uint256 closeFee) = _createPriceUpdate(int64(25000));

        vm.prank(trader);
        int256 pnl = exchange.closeLong{value: closeFee}(positionId, closeUpdates);

        uint256 traderAfter = usdc.balanceOf(trader);
        assertTrue(pnl > 0, "PnL should be positive for price increase on long");
        assertTrue(traderAfter > traderBefore, "Trader should receive more than zero");
    }

    function test_CloseLong_Loss() public {
        vm.warp(block.timestamp);

        // Open at 213.42
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));
        uint256 collateral = 1000e6;
        uint256 leverage = 2e18;

        vm.prank(trader);
        bytes32 positionId = exchange.openLong{value: fee}(
            address(pxToken), collateral, leverage, updates
        );

        XStreamExchange.Position memory pos = exchange.getPosition(positionId);
        uint256 storedCollateral = pos.collateral;

        // Close at lower price: 200.00
        vm.warp(block.timestamp + 1);
        (bytes[] memory closeUpdates, uint256 closeFee) = _createPriceUpdate(int64(20000));

        uint256 traderBefore = usdc.balanceOf(trader);

        vm.prank(trader);
        int256 pnl = exchange.closeLong{value: closeFee}(positionId, closeUpdates);

        uint256 traderAfter = usdc.balanceOf(trader);
        assertTrue(pnl < 0, "PnL should be negative for price decrease on long");
        // Trader gets less than their stored collateral
        uint256 received = traderAfter - traderBefore;
        assertTrue(received < storedCollateral, "Trader should receive less than collateral");
    }

    function test_OpenShort() public {
        vm.warp(block.timestamp);

        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));

        uint256 collateral = 1000e6;
        uint256 leverage = 2e18;

        XStreamExchange.PoolConfig memory poolBefore = exchange.getPoolConfig(address(pxToken));
        uint256 reserveBefore = poolBefore.pxReserve;

        vm.prank(trader);
        bytes32 positionId = exchange.openShort{value: fee}(
            address(pxToken), collateral, leverage, updates
        );

        XStreamExchange.Position memory pos = exchange.getPosition(positionId);
        assertEq(pos.trader, trader);
        assertFalse(pos.isLong);
        assertTrue(pos.size > 0);

        XStreamExchange.PoolConfig memory poolAfter = exchange.getPoolConfig(address(pxToken));
        // pxReserve should have decreased by the position size
        assertEq(poolAfter.pxReserve, reserveBefore - pos.size);
    }

    function test_CloseShort_Profit() public {
        vm.warp(block.timestamp);

        // Open short at 213.42
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));
        uint256 collateral = 1000e6;
        uint256 leverage = 2e18;

        vm.prank(trader);
        bytes32 positionId = exchange.openShort{value: fee}(
            address(pxToken), collateral, leverage, updates
        );

        XStreamExchange.PoolConfig memory poolBefore = exchange.getPoolConfig(address(pxToken));

        // Close at lower price: 180.00 (profit for short)
        vm.warp(block.timestamp + 1);
        (bytes[] memory closeUpdates, uint256 closeFee) = _createPriceUpdate(int64(18000));

        uint256 traderBefore = usdc.balanceOf(trader);

        vm.prank(trader);
        int256 pnl = exchange.closeShort{value: closeFee}(positionId, closeUpdates);

        uint256 traderAfter = usdc.balanceOf(trader);
        assertTrue(pnl > 0, "PnL should be positive for price decrease on short");
        assertTrue(traderAfter > traderBefore, "Trader should receive funds");

        // pxReserve should have been restored
        XStreamExchange.PoolConfig memory poolAfter = exchange.getPoolConfig(address(pxToken));
        assertTrue(poolAfter.pxReserve > poolBefore.pxReserve, "pxReserve should increase on short close");
    }

    function test_Liquidate() public {
        vm.warp(block.timestamp);

        // Open long at 213.42
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));
        uint256 collateral = 1000e6;
        uint256 leverage = 5e18; // max leverage for bigger exposure

        vm.prank(trader);
        bytes32 positionId = exchange.openLong{value: fee}(
            address(pxToken), collateral, leverage, updates
        );

        // Move price drastically down: 50.00 (from 213.42)
        // loss >= 80% of collateral triggers liquidation
        vm.warp(block.timestamp + 1);
        (bytes[] memory liqUpdates, uint256 liqFee) = _createPriceUpdate(int64(5000));

        address liquidator = makeAddr("liquidator");
        vm.deal(liquidator, 10 ether);

        uint256 liquidatorBefore = usdc.balanceOf(liquidator);

        vm.prank(liquidator);
        uint256 keeperReward = exchange.liquidate{value: liqFee}(positionId, liqUpdates);

        uint256 liquidatorAfter = usdc.balanceOf(liquidator);
        // Liquidator should receive 10% keeper reward of remaining collateral (if any)
        assertEq(liquidatorAfter - liquidatorBefore, keeperReward);

        // Position should be deleted
        XStreamExchange.Position memory pos = exchange.getPosition(positionId);
        assertEq(pos.trader, address(0));
    }

    function test_Liquidate_RevertNotLiquidatable() public {
        vm.warp(block.timestamp);

        // Open long at 213.42
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));
        uint256 collateral = 1000e6;
        uint256 leverage = 2e18;

        vm.prank(trader);
        bytes32 positionId = exchange.openLong{value: fee}(
            address(pxToken), collateral, leverage, updates
        );

        // Price only slightly lower: 210.00 -- not enough for liquidation
        vm.warp(block.timestamp + 1);
        (bytes[] memory liqUpdates, uint256 liqFee) = _createPriceUpdate(int64(21000));

        address liquidator = makeAddr("liquidator");
        vm.deal(liquidator, 10 ether);

        vm.prank(liquidator);
        vm.expectRevert(XStreamExchange.PositionNotLiquidatable.selector);
        exchange.liquidate{value: liqFee}(positionId, liqUpdates);
    }

    function test_MarketNotOpen_Revert() public {
        // Close market first
        vm.warp(block.timestamp);
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));

        address[] memory pxTokens = new address[](1);
        pxTokens[0] = address(pxToken);

        vm.prank(keeperBot);
        keeper.closeMarket{value: fee}(pxTokens, updates);

        // Try to open a long -- should revert
        (bytes[] memory updates2, uint256 fee2) = _createPriceUpdate(int64(21342));

        vm.prank(trader);
        vm.expectRevert(XStreamExchange.MarketNotOpen.selector);
        exchange.openLong{value: fee2}(address(pxToken), 1000e6, 2e18, updates2);
    }

    function test_SettleAllPositions() public {
        vm.warp(block.timestamp);

        // Open two positions (different timestamps to get different position IDs)
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));

        vm.prank(trader);
        exchange.openLong{value: fee}(address(pxToken), 1000e6, 2e18, updates);

        vm.warp(block.timestamp + 1);
        (bytes[] memory updates2, uint256 fee2) = _createPriceUpdate(int64(21342));

        vm.prank(trader);
        exchange.openLong{value: fee2}(address(pxToken), 1000e6, 2e18, updates2);

        uint256 openCount = exchange.getOpenPositionCount(address(pxToken));
        assertEq(openCount, 2);

        // Settle all via keeper
        vm.warp(block.timestamp + 1);
        (bytes[] memory settleUpdates, uint256 settleFee) = _createPriceUpdate(int64(21342));

        vm.deal(address(keeper), 10 ether);
        vm.prank(address(keeper));
        (uint256 positionsClosed,) = exchange.settleAllPositions{value: settleFee}(
            address(pxToken), settleUpdates
        );

        assertEq(positionsClosed, 2);
        assertEq(exchange.getOpenPositionCount(address(pxToken)), 0);
    }
}
