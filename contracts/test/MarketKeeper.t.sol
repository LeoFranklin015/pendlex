// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {XStreamExchange} from "../src/XStreamExchange.sol";
import {MarketKeeper} from "../src/MarketKeeper.sol";
import {PythAdapter} from "../src/PythAdapter.sol";
import {XStreamVault} from "../src/XStreamVault.sol";
import {PrincipalToken} from "../src/tokens/PrincipalToken.sol";
import {MockPyth} from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockXStock} from "./mocks/MockXStock.sol";

contract MarketKeeperTest is Test {
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
    address keeperBot;
    address trader;
    address randomUser;

    function setUp() public {
        owner = address(this);
        keeperBot = makeAddr("keeperBot");
        trader = makeAddr("trader");
        randomUser = makeAddr("randomUser");

        // Deploy core infra
        mockPyth = new MockPyth(60, 1);
        adapter = new PythAdapter(address(mockPyth), 60);
        usdc = new MockUSDC();

        // Deploy vault and register asset to get pxToken
        vault = new XStreamVault();
        xStock = new MockXStock("Test XStock", "xTST");
        (address pxAddr,) = vault.registerAsset(address(xStock), FEED_ID, "Test");
        pxToken = PrincipalToken(pxAddr);

        // Deploy exchange
        exchange = new XStreamExchange(address(usdc), address(adapter));
        exchange.registerPool(address(xStock), address(pxToken), FEED_ID);

        // Deploy keeper and wire it up
        keeper = new MarketKeeper(address(exchange), address(adapter), owner);
        exchange.setKeeper(address(keeper));
        keeper.addKeeper(keeperBot);

        // Seed liquidity
        usdc.mint(owner, 1_000_000e6);
        usdc.approve(address(exchange), type(uint256).max);
        exchange.depositLiquidity(address(pxToken), 500_000e6);

        // Seed px reserve
        xStock.mint(owner, 100_000e18);
        xStock.approve(address(vault), type(uint256).max);
        vault.deposit(address(xStock), 100_000e18);
        pxToken.approve(address(exchange), type(uint256).max);
        exchange.depositPxReserve(address(pxToken), 100_000e18);

        // Fund trader
        usdc.mint(trader, 100_000e6);
        vm.prank(trader);
        usdc.approve(address(exchange), type(uint256).max);

        // Give ETH for pyth fees
        vm.deal(keeperBot, 10 ether);
        vm.deal(trader, 10 ether);
        vm.deal(owner, 10 ether);
        vm.deal(address(keeper), 10 ether);
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

    function test_OpenMarket() public {
        vm.prank(keeperBot);
        keeper.openMarket();

        assertTrue(keeper.isMarketOpen());
        assertTrue(exchange.marketOpen());
    }

    function test_OpenMarket_RevertAlreadyOpen() public {
        vm.prank(keeperBot);
        keeper.openMarket();

        vm.prank(keeperBot);
        vm.expectRevert(MarketKeeper.AlreadyOpen.selector);
        keeper.openMarket();
    }

    function test_CloseMarket() public {
        // Open market first
        vm.prank(keeperBot);
        keeper.openMarket();
        assertTrue(keeper.isMarketOpen());

        // Open a position so closeMarket has something to settle
        vm.warp(block.timestamp);
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));

        vm.prank(trader);
        exchange.openLong{value: fee}(address(pxToken), 1000e6, 2e18, updates);
        assertEq(exchange.getOpenPositionCount(address(pxToken)), 1);

        // Close market -- should settle the position
        vm.warp(block.timestamp + 1);
        (bytes[] memory closeUpdates, uint256 closeFee) = _createPriceUpdate(int64(21342));

        address[] memory pxTokens = new address[](1);
        pxTokens[0] = address(pxToken);

        vm.prank(keeperBot);
        keeper.closeMarket{value: closeFee}(pxTokens, closeUpdates);

        assertFalse(keeper.isMarketOpen());
        assertFalse(exchange.marketOpen());
        assertEq(exchange.getOpenPositionCount(address(pxToken)), 0);
    }

    function test_EmergencyClose() public {
        // Open market
        vm.prank(keeperBot);
        keeper.openMarket();
        assertTrue(keeper.isMarketOpen());

        // Open a position
        vm.warp(block.timestamp);
        (bytes[] memory updates, uint256 fee) = _createPriceUpdate(int64(21342));

        vm.prank(trader);
        exchange.openLong{value: fee}(address(pxToken), 1000e6, 2e18, updates);

        // Emergency close by owner -- does NOT settle positions
        keeper.emergencyCloseMarket();

        assertFalse(keeper.isMarketOpen());
        assertFalse(exchange.marketOpen());
        // Position still exists (not settled)
        assertEq(exchange.getOpenPositionCount(address(pxToken)), 1);
    }

    function test_AddRemoveKeeper() public {
        address newKeeper = makeAddr("newKeeper");

        // Only owner can add
        vm.prank(randomUser);
        vm.expectRevert();
        keeper.addKeeper(newKeeper);

        // Owner adds keeper
        keeper.addKeeper(newKeeper);
        assertTrue(keeper.keepers(newKeeper));

        // Only owner can remove
        vm.prank(randomUser);
        vm.expectRevert();
        keeper.removeKeeper(newKeeper);

        // Owner removes keeper
        keeper.removeKeeper(newKeeper);
        assertFalse(keeper.keepers(newKeeper));
    }

    function test_OnlyKeeper() public {
        // randomUser is not a keeper and not the owner
        vm.prank(randomUser);
        vm.expectRevert(MarketKeeper.OnlyKeeper.selector);
        keeper.openMarket();

        // Verify the owner CAN call keeper functions (owner passes onlyKeeper)
        keeper.openMarket();
        assertTrue(keeper.isMarketOpen());
    }
}
