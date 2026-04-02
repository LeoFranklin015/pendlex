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
import {DividendToken}   from "../src/tokens/DividendToken.sol";
import {MockUSDC}        from "./mocks/MockUSDC.sol";
import {MockXStock}      from "./mocks/MockXStock.sol";

/// @title  E2EAll
/// @notice Full integration test covering all 8 xStock assets and every protocol
///         flow: vault yield splitting, leveraged trading, liquidation, keeper
///         lifecycle, and dx lease auctions.
///
///         Uses forge's EVM simulation so vm.warp / vm.prank are fully reliable.
///
/// Run:
///   forge test --match-contract E2EAll -vv
///   forge test --match-contract E2EAll -vvvv   (with full traces)
contract E2EAll is Test {

    // =========================================================================
    // Feed IDs and starting prices (expo = -2, divide by 100 to get USD)
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
    // Actors
    // =========================================================================

    address internal deployer    = makeAddr("deployer");
    address internal lpProvider  = makeAddr("lp");
    address internal alice       = makeAddr("alice");
    address internal bob         = makeAddr("bob");
    address internal keeperBot   = makeAddr("keeperBot");
    address internal liquidator  = makeAddr("liquidator");

    // =========================================================================
    // Protocol contracts
    // =========================================================================

    MockPyth        internal mockPyth;
    PythAdapter     internal pythAdapter;
    MockUSDC        internal usdc;
    XStreamVault    internal vault;
    XStreamExchange internal exchange;
    MarketKeeper    internal keeper;
    DxLeaseEscrow   internal escrow;

    // Per-asset addresses
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

    // Monotonic counter so MockPyth always accepts new price updates
    // (its invariant: new publishTime > stored publishTime)
    uint64 internal priceSeq;

    // =========================================================================
    // setUp
    // =========================================================================

    function setUp() public {
        vm.startPrank(deployer);

        // --- Oracle + USDC ---
        mockPyth    = new MockPyth(3600, 1);   // 1-hour validity, 1 wei per update
        pythAdapter = new PythAdapter(address(mockPyth), 3600);
        usdc        = new MockUSDC();

        // --- 8 xStock mocks ---
        xTSLA  = new MockXStock("Dinari Tesla xStock",    "TSLAxt");
        xNVDA  = new MockXStock("Dinari NVIDIA xStock",   "NVDAxt");
        xGOOGL = new MockXStock("Dinari Alphabet xStock", "GOOGLxt");
        xAAPL  = new MockXStock("Dinari Apple xStock",    "AAPLxt");
        xSPY   = new MockXStock("Dinari SP500 xStock",    "SPYxt");
        xTBLL  = new MockXStock("Dinari TBLL xStock",     "TBLLxt");
        xGLD   = new MockXStock("Dinari Gold xStock",     "GLDxt");
        xSLV   = new MockXStock("Dinari Silver xStock",   "SLVxt");

        // --- Vault: register all 8 assets ---
        vault = new XStreamVault();

        (pxTSLA,  dxTSLA)  = vault.registerAsset(address(xTSLA),  FEED_TSLA,  "TSLA");
        (pxNVDA,  dxNVDA)  = vault.registerAsset(address(xNVDA),  FEED_NVDA,  "NVDA");
        (pxGOOGL, dxGOOGL) = vault.registerAsset(address(xGOOGL), FEED_GOOGL, "GOOGL");
        (pxAAPL,  dxAAPL)  = vault.registerAsset(address(xAAPL),  FEED_AAPL,  "AAPL");
        (pxSPY,   dxSPY)   = vault.registerAsset(address(xSPY),   FEED_SPY,   "SPY");
        (pxTBLL,  dxTBLL)  = vault.registerAsset(address(xTBLL),  FEED_TBLL,  "TBLL");
        (pxGLD,   dxGLD)   = vault.registerAsset(address(xGLD),   FEED_GLD,   "GLD");
        (pxSLV,   dxSLV)   = vault.registerAsset(address(xSLV),   FEED_SLV,   "SLV");

        // --- Exchange: register all 8 pools ---
        exchange = new XStreamExchange(address(usdc), address(pythAdapter));

        exchange.registerPool(address(xTSLA),  pxTSLA,  FEED_TSLA);
        exchange.registerPool(address(xNVDA),  pxNVDA,  FEED_NVDA);
        exchange.registerPool(address(xGOOGL), pxGOOGL, FEED_GOOGL);
        exchange.registerPool(address(xAAPL),  pxAAPL,  FEED_AAPL);
        exchange.registerPool(address(xSPY),   pxSPY,   FEED_SPY);
        exchange.registerPool(address(xTBLL),  pxTBLL,  FEED_TBLL);
        exchange.registerPool(address(xGLD),   pxGLD,   FEED_GLD);
        exchange.registerPool(address(xSLV),   pxSLV,   FEED_SLV);

        // --- Keeper + escrow ---
        keeper = new MarketKeeper(address(exchange), address(pythAdapter), deployer);
        exchange.setKeeper(address(keeper));
        keeper.addKeeper(keeperBot);

        escrow = new DxLeaseEscrow(address(vault), address(usdc), 1e6); // 1 USDC min increment

        // --- Seed: mint xStocks to relevant actors ---
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 500_000e18;  // deployer seeding reserve
        amounts[1] = 10_000e18;   // vault dividend buffer

        MockXStock[8] memory stocks = [xTSLA, xNVDA, xGOOGL, xAAPL, xSPY, xTBLL, xGLD, xSLV];
        for (uint256 i = 0; i < stocks.length; i++) {
            stocks[i].mint(deployer,         200_000e18);
            stocks[i].mint(alice,             10_000e18);
            stocks[i].mint(address(vault),    10_000e18); // dividend reserve
        }
        usdc.mint(lpProvider, 10_000_000e6);
        usdc.mint(bob,           500_000e6);
        usdc.mint(alice,          50_000e6);
        vm.deal(bob,         10 ether);
        vm.deal(alice,       10 ether);
        vm.deal(keeperBot,   10 ether);
        vm.deal(liquidator,  10 ether);

        // --- LP: seed USDC liquidity into all 8 pools ($200k each) ---
        vm.stopPrank();
        vm.startPrank(lpProvider);
        usdc.approve(address(exchange), type(uint256).max);
        address[8] memory pxTokens = [pxTSLA, pxNVDA, pxGOOGL, pxAAPL, pxSPY, pxTBLL, pxGLD, pxSLV];
        for (uint256 i = 0; i < pxTokens.length; i++) {
            exchange.depositLiquidity(pxTokens[i], 200_000e6);
        }
        vm.stopPrank();

        // --- Deployer: deposit 100k of each xStock into vault, seed 50k px reserves ---
        vm.startPrank(deployer);
        address[8] memory xStockAddrs = [
            address(xTSLA), address(xNVDA), address(xGOOGL), address(xAAPL),
            address(xSPY),  address(xTBLL), address(xGLD),   address(xSLV)
        ];
        for (uint256 i = 0; i < xStockAddrs.length; i++) {
            IERC20(xStockAddrs[i]).approve(address(vault), type(uint256).max);
            vault.deposit(xStockAddrs[i], 100_000e18);
            IERC20(pxTokens[i]).approve(address(exchange), type(uint256).max);
            exchange.depositPxReserve(pxTokens[i], 50_000e18);
        }
        vm.stopPrank();

        // --- Alice: approve vault for all xStocks ---
        vm.startPrank(alice);
        for (uint256 i = 0; i < xStockAddrs.length; i++) {
            IERC20(xStockAddrs[i]).approve(address(vault), type(uint256).max);
        }
        usdc.approve(address(exchange), type(uint256).max);
        usdc.approve(address(escrow), type(uint256).max);
        vm.stopPrank();

        // --- Bob: approve exchange ---
        vm.startPrank(bob);
        usdc.approve(address(exchange), type(uint256).max);
        usdc.approve(address(escrow), type(uint256).max);
        vm.stopPrank();
    }

    // =========================================================================
    // Test 1 -- Vault: deposit, dividend, claim, withdraw
    // =========================================================================

    /// @notice Deposit NVDA + AAPL, trigger multiplier increase, verify dividends
    ///         are correctly distributed proportional to dx balance.
    function test_01_VaultDepositDividendWithdraw() public {
        // Alice deposits 1000 xNVDA
        vm.prank(alice);
        vault.deposit(address(xNVDA), 1_000e18);

        assertEq(IERC20(pxNVDA).balanceOf(alice), 1_000e18, "px minted");
        assertEq(IERC20(dxNVDA).balanceOf(alice), 1_000e18, "dx minted");
        assertEq(vault.pendingDividend(address(xNVDA), alice), 0, "no dividend yet");

        // NVDA pays a dividend: multiplier increases by 0.2% (2/1000)
        // Deployer holds 100k dx, Alice holds 1k dx
        // Total deposited = 101k. Alice's share = 1k/101k.
        // delta = 0.002 * 101000e18 = 202e18 xNVDA distributed
        // Alice gets 202e18 * (1000/101000) = ~2e18 xNVDA
        xNVDA.setMultiplier(1_002_000_000_000_000_000);
        vault.syncDividend(address(xNVDA));

        uint256 alicePending = vault.pendingDividend(address(xNVDA), alice);
        assertGt(alicePending, 0, "pending dividend after rebase");
        // Alice has 1/101 of total dx = 1e18 / 101 * 202 = ~2e18
        assertEq(alicePending, 1_000e18 * 202e18 / 101_000e18, "exact pending amount");

        uint256 aliceXBefore = xNVDA.balanceOf(alice);
        vm.prank(alice);
        vault.claimDividend(address(xNVDA));

        assertEq(xNVDA.balanceOf(alice), aliceXBefore + alicePending, "claimed correct amount");
        assertEq(vault.pendingDividend(address(xNVDA), alice), 0, "zero after claim");

        // Alice withdraws 1000 xNVDA: burns 1000 px + 1000 dx, gets 1000 xNVDA back
        uint256 xBefore = xNVDA.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(address(xNVDA), 1_000e18);

        assertEq(xNVDA.balanceOf(alice), xBefore + 1_000e18, "xNVDA returned");
        assertEq(IERC20(pxNVDA).balanceOf(alice), 0, "px burned");
        assertEq(IERC20(dxNVDA).balanceOf(alice), 0, "dx burned");
    }

    // =========================================================================
    // Test 2 -- Vault: TSLA has no multiplier change, zero dividend
    // =========================================================================

    function test_02_NonRebasing_NoDividend() public {
        vm.prank(alice);
        vault.deposit(address(xTSLA), 500e18);

        // TSLA multiplier stays at 1e18 (isMultiplierChanging = false)
        vault.syncDividend(address(xTSLA));

        assertEq(vault.pendingDividend(address(xTSLA), alice), 0, "no dividend for non-rebasing stock");
    }

    // =========================================================================
    // Test 3 -- Exchange: long with profit, manual close
    // =========================================================================

    function test_03_LongProfit() public {
        vm.prank(keeperBot);
        keeper.openMarket();

        // Bob: 3x long AAPL @ $250.12 with $10k collateral
        // notional = $30k, fee = $15, size = 30000e6 * 1e12 * 1e18 / price_1e18
        (bytes[] memory openData, uint256 openFee) = _priceUpdate(FEED_AAPL, PRICE_AAPL);
        vm.prank(bob);
        exchange.openLong{value: openFee}(pxAAPL, 10_000e6, 3e18, openData);

        bytes32[] memory posIds = _getOpenPositionIds(pxAAPL, 1);

        // Price rises to $275 (+9.9%)
        (bytes[] memory closeData, uint256 closeFee) = _priceUpdate(FEED_AAPL, 27500);
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(bob);
        exchange.closeLong{value: closeFee}(posIds[0], closeData);

        uint256 bobAfter = usdc.balanceOf(bob);
        assertGt(bobAfter, bobBefore, "Bob profited on long");
        assertGt(bobAfter, 10_000e6, "returned more than collateral");

        // Close market
        address[] memory empty;
        bytes[] memory emptyData;
        vm.prank(keeperBot);
        keeper.closeMarket{value: 0}(empty, emptyData);
    }

    // =========================================================================
    // Test 4 -- Exchange: long with loss
    // =========================================================================

    function test_04_LongLoss() public {
        vm.prank(keeperBot);
        keeper.openMarket();

        (bytes[] memory openData, uint256 openFee) = _priceUpdate(FEED_GOOGL, PRICE_GOOGL);
        vm.prank(bob);
        exchange.openLong{value: openFee}(pxGOOGL, 10_000e6, 2e18, openData);

        bytes32[] memory posIds = _getOpenPositionIds(pxGOOGL, 1);

        // Price drops to $280 (-7.3%)
        (bytes[] memory closeData, uint256 closeFee) = _priceUpdate(FEED_GOOGL, 28000);
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(bob);
        exchange.closeLong{value: closeFee}(posIds[0], closeData);

        assertLt(usdc.balanceOf(bob) - bobBefore, 10_000e6, "Bob got less than collateral on loss");

        address[] memory empty;
        bytes[] memory emptyData;
        vm.prank(keeperBot);
        keeper.closeMarket{value: 0}(empty, emptyData);
    }

    // =========================================================================
    // Test 5 -- Exchange: short with profit
    // =========================================================================

    function test_05_ShortProfit() public {
        vm.prank(keeperBot);
        keeper.openMarket();

        (bytes[] memory openData, uint256 openFee) = _priceUpdate(FEED_SPY, PRICE_SPY);
        vm.prank(bob);
        exchange.openShort{value: openFee}(pxSPY, 8_000e6, 2e18, openData);

        bytes32[] memory posIds = _getOpenPositionIds(pxSPY, 1);

        // Price drops to $620 (-6.3%)
        (bytes[] memory closeData, uint256 closeFee) = _priceUpdate(FEED_SPY, 62000);
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(bob);
        exchange.closeShort{value: closeFee}(posIds[0], closeData);

        assertGt(usdc.balanceOf(bob) - bobBefore, 8_000e6, "Bob profited on short");

        address[] memory empty;
        bytes[] memory emptyData;
        vm.prank(keeperBot);
        keeper.closeMarket{value: 0}(empty, emptyData);
    }

    // =========================================================================
    // Test 6 -- Exchange: liquidation (5x long, price crashes >80%)
    // =========================================================================

    function test_06_Liquidation() public {
        vm.prank(keeperBot);
        keeper.openMarket();

        // Bob: 5x long GLD @ $460.84 with $2k collateral
        // notional = $10k, fee = $5, stored collateral = $1995
        (bytes[] memory openData, uint256 openFee) = _priceUpdate(FEED_GLD, PRICE_GLD);
        vm.prank(bob);
        exchange.openLong{value: openFee}(pxGLD, 2_000e6, 5e18, openData);

        // Price crashes to $380 (-17.6%)
        // loss per px unit = entryPrice - crashPrice on a 5x long
        // size = 10000e6 * 1e12 * 1e18 / (46084 * 1e16) = ~21.7e18 px units
        // pnl = size * (crashPrice - entryPrice) / 1e18 (in px 1e18 units)
        // loss in USDC = pnl / 1e12. Must be > 80% of collateral ($1596)
        (bytes[] memory crashData, uint256 crashFee) = _priceUpdate(FEED_GLD, 37900);

        uint256 liqBefore = usdc.balanceOf(liquidator);
        vm.prank(liquidator);
        exchange.liquidateByIndex{value: crashFee}(pxGLD, 0, crashData);

        assertGt(usdc.balanceOf(liquidator), liqBefore, "liquidator earned reward");
        assertEq(exchange.getOpenPositionCount(pxGLD), 0, "position deleted");

        address[] memory empty;
        bytes[] memory emptyData;
        vm.prank(keeperBot);
        keeper.closeMarket{value: 0}(empty, emptyData);
    }

    // =========================================================================
    // Test 7 -- Exchange: keeper force-settle on market close
    // =========================================================================

    function test_07_KeeperForceSettlement() public {
        vm.prank(keeperBot);
        keeper.openMarket();

        // Alice: 2x long TSLA
        (bytes[] memory aliceData, uint256 aliceFee) = _priceUpdate(FEED_TSLA, PRICE_TSLA);
        vm.prank(alice);
        exchange.openLong{value: aliceFee}(pxTSLA, 5_000e6, 2e18, aliceData);

        // Bob: 3x long NVDA
        (bytes[] memory bobData, uint256 bobFee) = _priceUpdate(FEED_NVDA, PRICE_NVDA);
        vm.prank(bob);
        exchange.openLong{value: bobFee}(pxNVDA, 5_000e6, 3e18, bobData);

        assertEq(exchange.getOpenPositionCount(pxTSLA), 1);
        assertEq(exchange.getOpenPositionCount(pxNVDA), 1);

        // Keeper closes market at slightly higher prices
        (bytes[] memory tslaDat,  uint256 tslaFee)  = _priceUpdate(FEED_TSLA, 40000);
        (bytes[] memory nvdaDat,  uint256 nvdaFee)   = _priceUpdate(FEED_NVDA, 18500);

        // closeMarket expects one bytes[] for all pools; build combined update
        bytes[] memory combined = new bytes[](2);
        combined[0] = tslaDat[0];
        combined[1] = nvdaDat[0];

        address[] memory pxTokens = new address[](2);
        pxTokens[0] = pxTSLA;
        pxTokens[1] = pxNVDA;

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore   = usdc.balanceOf(bob);

        vm.prank(keeperBot);
        keeper.closeMarket{value: (tslaFee + nvdaFee) * 2}(pxTokens, combined);

        assertEq(exchange.getOpenPositionCount(pxTSLA), 0, "TSLA settled");
        assertEq(exchange.getOpenPositionCount(pxNVDA), 0, "NVDA settled");
        assertGt(usdc.balanceOf(alice), aliceBefore, "Alice USDC returned");
        assertGt(usdc.balanceOf(bob),   bobBefore,   "Bob USDC returned");
    }

    // =========================================================================
    // Test 8 -- DxLeaseEscrow: full cycle
    //   1. Alice opens auction on dxNVDA
    //   2. Bob wins auction, pays USDC to Alice
    //   3. NVDA dividend accrues -> goes to Bob (active lessee)
    //   4. Lease expires -> dividend goes to Alice (seller)
    //   5. Alice reclaims dx tokens
    // =========================================================================

    function test_08_EscrowFullCycle() public {
        // Alice deposits 2000 xNVDA to get 2000 dx
        vm.prank(alice);
        vault.deposit(address(xNVDA), 2_000e18);
        assertEq(IERC20(dxNVDA).balanceOf(alice), 2_000e18);

        // Alice approves escrow, opens auction: 1000 dxNVDA, base $500 USDC, 1-day auction, 7-day lease
        vm.startPrank(alice);
        IERC20(dxNVDA).approve(address(escrow), type(uint256).max);
        uint256 listingId = escrow.openAuction(dxNVDA, 1_000e18, 500e6, 1 days, 7 days);
        vm.stopPrank();

        assertEq(IERC20(dxNVDA).balanceOf(address(escrow)), 1_000e18, "escrow holds dx");

        // Bob bids 600 USDC
        vm.prank(bob);
        escrow.placeBid(listingId, 600e6);

        // Alice bids higher (1000 USDC) to test refund flow
        vm.prank(alice);
        usdc.approve(address(escrow), type(uint256).max);
        vm.prank(alice);
        escrow.placeBid(listingId, 1_000e6);

        // Bob's 600 USDC is refundable
        assertEq(escrow.refundableBalance(bob), 600e6, "Bob refundable");
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        escrow.withdrawRefund();
        assertEq(usdc.balanceOf(bob), bobBefore + 600e6, "Bob refund withdrawn");

        // Bob places winning bid
        vm.prank(bob);
        escrow.placeBid(listingId, 1_001e6);
        assertEq(escrow.refundableBalance(alice), 1_000e6, "Alice refundable after outbid");

        // Warp past auction end, finalize
        uint256 aliceUsdcBefore = usdc.balanceOf(alice);
        vm.warp(block.timestamp + 1 days + 1);
        escrow.finalizeAuction(listingId);

        assertEq(usdc.balanceOf(alice), aliceUsdcBefore + 1_001e6, "Alice receives bid");
        DxLeaseEscrow.Listing memory listing = escrow.getListing(listingId);
        assertEq(listing.activeLessee, bob, "Bob is lessee");
        assertEq(uint256(listing.status), uint256(DxLeaseEscrow.ListingStatus.ActiveLease));

        // NVDA dividend fires during active lease -> Bob (lessee) receives it
        xNVDA.setMultiplier(1_002_000_000_000_000_000);
        uint256 bobXBefore = xNVDA.balanceOf(bob);
        uint256 claimed = escrow.claimAndDistribute(listingId);

        assertGt(claimed, 0, "dividend claimed");
        assertEq(xNVDA.balanceOf(bob), bobXBefore + claimed, "Bob received dividend during lease");

        // Warp past lease end, second dividend -> goes to Alice (seller)
        vm.warp(block.timestamp + 7 days + 1);
        xNVDA.setMultiplier(1_004_000_000_000_000_000);
        uint256 aliceXBefore = xNVDA.balanceOf(alice);
        uint256 claimed2 = escrow.claimAndDistribute(listingId);

        assertGt(claimed2, 0, "second dividend claimed");
        assertEq(xNVDA.balanceOf(alice), aliceXBefore + claimed2, "Alice received dividend after lease");

        // Alice reclaims dx tokens
        aliceXBefore = IERC20(dxNVDA).balanceOf(alice);
        vm.prank(alice);
        escrow.reclaimDx(listingId);
        assertEq(IERC20(dxNVDA).balanceOf(alice), aliceXBefore + 1_000e18, "dx reclaimed");
    }

    // =========================================================================
    // Test 9 -- DxLeaseEscrow: cancel with no bids refunds dx
    // =========================================================================

    function test_09_EscrowCancelNoBids() public {
        vm.prank(alice);
        vault.deposit(address(xGLD), 500e18);

        vm.startPrank(alice);
        IERC20(dxGLD).approve(address(escrow), type(uint256).max);
        uint256 listingId = escrow.openAuction(dxGLD, 500e18, 200e6, 1 days, 3 days);

        uint256 aliceDxBefore = IERC20(dxGLD).balanceOf(alice);
        escrow.cancelAuction(listingId);
        vm.stopPrank();

        assertEq(IERC20(dxGLD).balanceOf(alice), aliceDxBefore + 500e18, "dx returned on cancel");
    }

    // =========================================================================
    // Test 10 -- DividendToken transfer auto-settles dividend
    // =========================================================================

    function test_10_DxTransferSettlesPendingDividend() public {
        // Alice and Bob both deposit 1000 xSPY
        vm.prank(alice);
        vault.deposit(address(xSPY), 1_000e18);
        vm.prank(bob);
        xSPY.mint(bob, 1_000e18);
        vm.startPrank(bob);
        xSPY.approve(address(vault), type(uint256).max);
        vault.deposit(address(xSPY), 1_000e18);
        vm.stopPrank();

        // SPY dividend
        xSPY.setMultiplier(1_003_000_000_000_000_000);
        vault.syncDividend(address(xSPY));

        uint256 alicePendingBefore = vault.pendingDividend(address(xSPY), alice);
        assertGt(alicePendingBefore, 0, "Alice has pending dividend");

        // Alice transfers 500 dxSPY to bob -- this should auto-settle Alice's dividend
        uint256 aliceXBefore = xSPY.balanceOf(alice);
        vm.prank(alice);
        IERC20(dxSPY).transfer(bob, 500e18);

        // Alice's pending should be zero (settled to xSPY)
        assertEq(vault.pendingDividend(address(xSPY), alice), 0, "Alice dividend settled on transfer");
        assertGt(xSPY.balanceOf(alice), aliceXBefore, "Alice received xSPY from auto-settlement");
    }

    // =========================================================================
    // Test 11 -- LP profit from trading fees
    // =========================================================================

    function test_11_LPEarnsFromTradingFees() public {
        vm.prank(keeperBot);
        keeper.openMarket();

        // Bob opens a large long on TBLL
        (bytes[] memory openData, uint256 openFee) = _priceUpdate(FEED_TBLL, PRICE_TBLL);
        vm.prank(bob);
        exchange.openLong{value: openFee}(pxTBLL, 50_000e6, 3e18, openData);

        bytes32[] memory posIds = _getOpenPositionIds(pxTBLL, 1);

        // Price moves slightly up, Bob closes
        (bytes[] memory closeData, uint256 closeFee) = _priceUpdate(FEED_TBLL, 10700);
        vm.prank(bob);
        exchange.closeLong{value: closeFee}(posIds[0], closeData);

        // LP pool should have accrued fees
        XStreamExchange.PoolConfig memory pool = exchange.getPoolConfig(pxTBLL);
        assertGt(pool.totalFees, 0, "fees accumulated");

        // LP withdraws
        address lpToken = pool.lpToken;
        uint256 lpShares = IERC20(lpToken).balanceOf(lpProvider);
        uint256 lpBefore = usdc.balanceOf(lpProvider);

        vm.prank(lpProvider);
        exchange.withdrawLiquidity(pxTBLL, lpShares);

        // LP may get slightly more or less than deposited depending on PnL; just verify no revert
        uint256 lpAfter = usdc.balanceOf(lpProvider);
        assertGt(lpAfter, lpBefore, "LP received USDC back");

        address[] memory empty;
        bytes[] memory emptyData;
        vm.prank(keeperBot);
        keeper.closeMarket{value: 0}(empty, emptyData);
    }

    // =========================================================================
    // Test 12 -- Multiple dividend events: cumulative accrual
    // =========================================================================

    function test_12_MultipleRebases() public {
        vm.prank(alice);
        vault.deposit(address(xSLV), 1_000e18);

        // SLV: two rebase events
        xSLV.setMultiplier(1_001_000_000_000_000_000);
        vault.syncDividend(address(xSLV));
        uint256 pending1 = vault.pendingDividend(address(xSLV), alice);

        xSLV.setMultiplier(1_003_000_000_000_000_000);
        vault.syncDividend(address(xSLV));
        uint256 pending2 = vault.pendingDividend(address(xSLV), alice);

        assertGt(pending2, pending1, "cumulative accrual across rebases");

        uint256 xBefore = xSLV.balanceOf(alice);
        vm.prank(alice);
        vault.claimDividend(address(xSLV));
        assertEq(xSLV.balanceOf(alice), xBefore + pending2, "claimed cumulative amount");
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /// @dev Build a single-feed price update. publishTime increments so MockPyth
    ///      always stores the new price (invariant: new time > stored time).
    function _priceUpdate(bytes32 feedId, int64 price)
        internal
        returns (bytes[] memory updates, uint256 fee)
    {
        uint64 publishTime = uint64(block.timestamp) + priceSeq;
        priceSeq++;
        bytes memory data = mockPyth.createPriceFeedUpdateData(
            feedId,
            price,
            uint64(100), // confidence
            int32(-2),   // expo: price / 100 = USD value
            price,
            uint64(100),
            publishTime
        );
        updates    = new bytes[](1);
        updates[0] = data;
        fee        = mockPyth.getUpdateFee(updates); // 1 wei per entry
    }

    /// @dev Read open position IDs from exchange for a given px token.
    ///      Asserts exactly `expectedCount` positions exist.
    function _getOpenPositionIds(address pxToken, uint256 expectedCount)
        internal
        view
        returns (bytes32[] memory ids)
    {
        uint256 count = exchange.getOpenPositionCount(pxToken);
        assertEq(count, expectedCount, "unexpected open position count");
        ids = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = exchange.openPositionIds(pxToken, i);
        }
    }
}
