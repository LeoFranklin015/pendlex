// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockPyth} from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";

import {PythAdapter}     from "../src/PythAdapter.sol";
import {XStreamVault}    from "../src/XStreamVault.sol";
import {XStreamExchange} from "../src/XStreamExchange.sol";
import {MarketKeeper}    from "../src/MarketKeeper.sol";
import {PrincipalToken}  from "../src/tokens/PrincipalToken.sol";
import {MockUSDC}        from "../test/mocks/MockUSDC.sol";
import {MockXStock}      from "../test/mocks/MockXStock.sol";

/// @title  LifecycleTest
/// @notice End-to-end integration script exercising all 8 protocol phases across
///         xAAPL and xSPY on a local Anvil node.
///
/// Run:
///   anvil                                            (terminal 1)
///   forge script script/LifecycleTest.s.sol:LifecycleTest \
///       --rpc-url anvil --broadcast -vvvv            (terminal 2)
///
/// Design notes for --broadcast mode:
///   - vm.warp only affects the local simulation fork, NOT the live Anvil node.
///     Large time warps cause price-update publishTime to appear future-dated to
///     Anvil, triggering StalePrice.  All vm.warp calls are therefore removed.
///   - vm.deal outside a broadcast block is simulation-only; keeperBot is funded
///     via a real payable broadcast transaction from the deployer instead.
///   - Position IDs are read from contract state after opens rather than
///     pre-computed with keccak256 (which would embed the wrong timestamp).
contract LifecycleTest is Script {
    // ---------- Pyth feed IDs (mock) ----------
    bytes32 constant AAPL_FEED = bytes32(uint256(1));
    bytes32 constant SPY_FEED  = bytes32(uint256(2));

    // ---------- Anvil default private keys (accounts 0-5) ----------
    uint256 constant PK_DEPLOYER   = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant PK_LP         = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 constant PK_ALICE      = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    uint256 constant PK_BOB        = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;
    uint256 constant PK_KEEPER_BOT = 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b;
    uint256 constant PK_LIQUIDATOR = 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba;

    // ---------- Derived actor addresses ----------
    address deployer;
    address lpProvider;
    address alice;
    address bob;
    address keeperBot;
    address liquidatorBot;

    // ---------- Deployed contracts ----------
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

    // Monotonic counter added to publishTime so MockPyth always accepts
    // new updates (its rule: publishTime > storedPublishTime).  All calls
    // share the same block.timestamp on Anvil when the script runs quickly;
    // without a tiebreaker the stored price would never change after the first
    // update for each feed.  Max offset is ~10 sec, well within 60-s staleness.
    uint64 priceSeq;

    // =========================================================================
    // Entry point
    // =========================================================================

    function run() external {
        _setupActors();
        _phase1Deploy();
        _phase2Seed();
        _phase3TradingSession1();
        _phase4DividendEvent();
        _phase5TradingSession2();
        _phase6Liquidation();
        _phase7Recombination();
        _phase8LpWithdrawal();

        console.log("\n========================================");
        console.log("  ALL PHASES COMPLETE");
        console.log("========================================");
    }

    // =========================================================================
    // Actor setup
    // =========================================================================

    function _setupActors() internal {
        deployer      = vm.addr(PK_DEPLOYER);
        lpProvider    = vm.addr(PK_LP);
        alice         = vm.addr(PK_ALICE);
        bob           = vm.addr(PK_BOB);
        keeperBot     = vm.addr(PK_KEEPER_BOT);
        liquidatorBot = vm.addr(PK_LIQUIDATOR);

        console.log("========================================");
        console.log("  pendleX Full Lifecycle Test");
        console.log("  2 tokens: xAAPL + xSPY | Anvil + Ink");
        console.log("========================================");
        console.log("--- ACTORS ---");
        console.log("  Deployer:   ", deployer);
        console.log("  LP:         ", lpProvider);
        console.log("  Alice:      ", alice);
        console.log("  Bob:        ", bob);
        console.log("  Keeper:     ", keeperBot);
        console.log("  Liquidator: ", liquidatorBot);
    }

    // =========================================================================
    // Phase 1 -- Deploy all protocol contracts
    // =========================================================================

    function _phase1Deploy() internal {
        console.log("\n=== PHASE 1: DEPLOY ===");

        vm.startBroadcast(PK_DEPLOYER);

        mockPyth    = new MockPyth(60, 1);                          // 60 s validity, 1 wei/update
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

        vm.stopBroadcast();

        console.log("  MockPyth:   ", address(mockPyth));
        console.log("  PythAdapter:", address(pythAdapter));
        console.log("  USDC:       ", address(usdc));
        console.log("  xAAPL:      ", address(xAAPL));
        console.log("  xSPY:       ", address(xSPY));
        console.log("  Vault:      ", address(vault));
        console.log("  pxAAPL:     ", pxAAPL);
        console.log("  dxAAPL:     ", dxAAPL);
        console.log("  pxSPY:      ", pxSPY);
        console.log("  dxSPY:      ", dxSPY);
        console.log("  Exchange:   ", address(exchange));
        console.log("  Keeper:     ", address(keeper));
    }

    // =========================================================================
    // Phase 2 -- Seed liquidity, vault, and actor balances
    // =========================================================================

    function _phase2Seed() internal {
        console.log("\n=== PHASE 2: SEED ===");

        // Mint tokens + fund keeperBot with real ETH via broadcast.
        // vm.deal is simulation-only in --broadcast mode; a payable call is needed
        // for keeperBot because its PK may not map to a pre-funded Anvil account.
        vm.startBroadcast(PK_DEPLOYER);
        usdc.mint(lpProvider, 2_000_000e6);
        usdc.mint(bob,          100_000e6);
        usdc.mint(alice,         50_000e6);
        xAAPL.mint(deployer,   200_000e18);
        xSPY.mint(deployer,    200_000e18);
        xAAPL.mint(alice,       10_000e18);
        (bool ok,) = payable(keeperBot).call{value: 1 ether}("");
        require(ok, "ETH transfer to keeperBot failed");
        vm.stopBroadcast();

        // LP: deposit $500k USDC into each pool
        vm.startBroadcast(PK_LP);
        usdc.approve(address(exchange), type(uint256).max);
        exchange.depositLiquidity(pxAAPL, 500_000e6);
        exchange.depositLiquidity(pxSPY,  500_000e6);
        vm.stopBroadcast();
        console.log("  LP deposited $500k to xAAPL pool and $500k to xSPY pool");

        // Deployer: deposit 100k of each xStock, seed 50k px reserve each
        vm.startBroadcast(PK_DEPLOYER);
        xAAPL.approve(address(vault), type(uint256).max);
        xSPY.approve(address(vault),  type(uint256).max);
        vault.deposit(address(xAAPL), 100_000e18);
        vault.deposit(address(xSPY),  100_000e18);
        PrincipalToken(pxAAPL).approve(address(exchange), type(uint256).max);
        PrincipalToken(pxSPY).approve(address(exchange),  type(uint256).max);
        exchange.depositPxReserve(pxAAPL, 50_000e18);
        exchange.depositPxReserve(pxSPY,  50_000e18);
        // Extra xStock minted directly to vault to cover dividend payouts
        xAAPL.mint(address(vault), 10_000e18);
        xSPY.mint(address(vault),  10_000e18);
        vm.stopBroadcast();
        console.log("  Seeded 50k pxAAPL + 50k pxSPY reserves; +10k xStock each for dividends");

        // Alice: deposit 1000 xAAPL -> gets 1000 px + 1000 dx
        vm.startBroadcast(PK_ALICE);
        xAAPL.approve(address(vault), type(uint256).max);
        vault.deposit(address(xAAPL), 1_000e18);
        vm.stopBroadcast();
        console.log("  Alice deposited 1,000 xAAPL -> 1,000 pxAAPL + 1,000 dxAAPL");

        // Bob: approve exchange to spend USDC
        vm.startBroadcast(PK_BOB);
        usdc.approve(address(exchange), type(uint256).max);
        vm.stopBroadcast();
        console.log("  Bob ready with $100,000 USDC");
    }

    // =========================================================================
    // Phase 3 -- Trading session 1: Bob opens positions, keeper force-settles
    //
    // Note: Manual position close (closeLong/closeShort) requires the exact
    // positionId, which is keccak256(trader, pxToken, block.timestamp_on_anvil).
    // In --broadcast mode the script's simulation timestamps diverge from Anvil's
    // real block timestamps, so pre-computed IDs are unreliable.  Using keeper
    // force-settlement avoids position ID tracking entirely while still exercising
    // the full PnL path: collateral + profit is transferred to pos.trader (Bob).
    // =========================================================================

    function _phase3TradingSession1() internal {
        console.log("\n=== PHASE 3: SESSION 1 ===");

        vm.startBroadcast(PK_KEEPER_BOT);
        keeper.openMarket();
        vm.stopBroadcast();
        console.log("  Market OPEN");

        // Bob: 3x long xAAPL @ $213.42
        (bytes[] memory aaplOpen, uint256 aaplOpenFee) = _priceUpdate(AAPL_FEED, 21342);
        vm.startBroadcast(PK_BOB);
        exchange.openLong{value: aaplOpenFee}(pxAAPL, 5_000e6, 3e18, aaplOpen);
        vm.stopBroadcast();
        console.log("  Bob: 3x LONG xAAPL @ $213.42 | $5k collateral");

        // Bob: 2x short xSPY @ $587.50
        (bytes[] memory spyOpen, uint256 spyOpenFee) = _priceUpdate(SPY_FEED, 58750);
        vm.startBroadcast(PK_BOB);
        exchange.openShort{value: spyOpenFee}(pxSPY, 5_000e6, 2e18, spyOpen);
        vm.stopBroadcast();
        console.log("  Bob: 2x SHORT xSPY @ $587.50 | $5k collateral");

        uint256 bobBefore = usdc.balanceOf(bob);

        // Keeper closes market at updated prices (xAAPL $220, xSPY $575).
        // Each pool receives msg.value / 2 wei.  dualFee = 2 wei (1 per entry),
        // so we send dualFee * pxTokens.length = 4 wei total.
        (bytes[] memory dualClose, uint256 dualCloseFee) = _dualPriceUpdate(22000, 57500);
        address[] memory pxTokens = new address[](2);
        pxTokens[0] = pxAAPL;
        pxTokens[1] = pxSPY;

        vm.startBroadcast(PK_KEEPER_BOT);
        keeper.closeMarket{value: dualCloseFee * 2}(pxTokens, dualClose);
        vm.stopBroadcast();

        uint256 bobProfit = usdc.balanceOf(bob) - bobBefore;
        console.log("  Settled: xAAPL @ $220, xSPY @ $575");
        console.log("  Bob received USDC (collateral + PnL):", bobProfit);
        console.log("  Bob total USDC:", usdc.balanceOf(bob));
        console.log("  Market CLOSED");
    }

    // =========================================================================
    // Phase 4 -- Dividend event: xAAPL rebase, Alice claims yield
    // =========================================================================

    function _phase4DividendEvent() internal {
        console.log("\n=== PHASE 4: DIVIDEND ===");

        // 1.00117e18 => $0.25 dividend per ~$213 share (117 bps multiplier increase)
        vm.startBroadcast(PK_DEPLOYER);
        xAAPL.setMultiplier(1_001_170_000_000_000_000);
        vault.syncDividend(address(xAAPL));
        vm.stopBroadcast();
        console.log("  xAAPL multiplier set to 1.00117e18 and dividend synced");

        uint256 alicePending = vault.pendingDividend(address(xAAPL), alice);
        console.log("  Alice pending dividend (xAAPL wei):", alicePending);

        uint256 aliceBefore = xAAPL.balanceOf(alice);
        vm.startBroadcast(PK_ALICE);
        vault.claimDividend(address(xAAPL));
        vm.stopBroadcast();
        console.log("  Alice claimed xAAPL (wei):", xAAPL.balanceOf(alice) - aliceBefore);
        console.log("  Alice pending after claim:", vault.pendingDividend(address(xAAPL), alice));
        console.log("  Deployer pending (100k dx share):", vault.pendingDividend(address(xAAPL), deployer));
    }

    // =========================================================================
    // Phase 5 -- Trading session 2: keeper force-settles open positions
    // =========================================================================

    function _phase5TradingSession2() internal {
        console.log("\n=== PHASE 5: SESSION 2 ===");

        vm.startBroadcast(PK_KEEPER_BOT);
        keeper.openMarket();
        vm.stopBroadcast();
        console.log("  Market OPEN");

        // Bob: 2x long xAAPL @ $220
        (bytes[] memory aaplOpen, uint256 aaplFee) = _priceUpdate(AAPL_FEED, 22000);
        vm.startBroadcast(PK_BOB);
        exchange.openLong{value: aaplFee}(pxAAPL, 3_000e6, 2e18, aaplOpen);
        vm.stopBroadcast();
        console.log("  Bob: 2x LONG xAAPL @ $220 | $3k collateral");

        // Bob: 2x long xSPY @ $575
        (bytes[] memory spyOpen, uint256 spyFee) = _priceUpdate(SPY_FEED, 57500);
        vm.startBroadcast(PK_BOB);
        exchange.openLong{value: spyFee}(pxSPY, 3_000e6, 2e18, spyOpen);
        vm.stopBroadcast();
        console.log("  Bob: 2x LONG xSPY @ $575 | $3k collateral");
        console.log("  Open xAAPL positions:", exchange.getOpenPositionCount(pxAAPL));
        console.log("  Open xSPY positions: ", exchange.getOpenPositionCount(pxSPY));

        // Dual feed settlement: xAAPL @ $221, xSPY @ $578
        (bytes[] memory dualUpdates, uint256 dualFee) = _dualPriceUpdate(22100, 57800);
        address[] memory pxTokens = new address[](2);
        pxTokens[0] = pxAAPL;
        pxTokens[1] = pxSPY;

        vm.startBroadcast(PK_KEEPER_BOT);
        keeper.closeMarket{value: dualFee * 2}(pxTokens, dualUpdates);
        vm.stopBroadcast();
        console.log("  Keeper settled all @ xAAPL=$221, xSPY=$578");
        console.log("  Open xAAPL after:", exchange.getOpenPositionCount(pxAAPL));
        console.log("  Open xSPY after: ", exchange.getOpenPositionCount(pxSPY));
        console.log("  Market CLOSED");
        console.log("  Bob USDC after session 2:", usdc.balanceOf(bob));
    }

    // =========================================================================
    // Phase 6 -- Liquidation: 5x long crashes >80%, liquidator earns reward
    // =========================================================================

    function _phase6Liquidation() internal {
        console.log("\n=== PHASE 6: LIQUIDATION ===");

        vm.startBroadcast(PK_KEEPER_BOT);
        keeper.openMarket();
        vm.stopBroadcast();
        console.log("  Market OPEN");

        // Bob: 5x long xAAPL @ $220 with $2k collateral
        // notional=$10k, fee=$5, stored collateral=$1,995
        (bytes[] memory openUpdates, uint256 openFee) = _priceUpdate(AAPL_FEED, 22000);
        vm.startBroadcast(PK_BOB);
        exchange.openLong{value: openFee}(pxAAPL, 2_000e6, 5e18, openUpdates);
        vm.stopBroadcast();
        console.log("  Bob: 5x LONG xAAPL @ $220 | $2k collateral");

        // Read the position ID from live contract state (index 0 since no other AAPL
        // positions are open at this point in the lifecycle).
        bytes32 bobLiqPos = exchange.openPositionIds(pxAAPL, 0);
        console.log("  Position ID captured from contract state");

        // Price crashes to $180: loss=$1,818 / $1,995 = 91.1% > 80% threshold
        (bytes[] memory crashUpdates, uint256 crashFee) = _priceUpdate(AAPL_FEED, 18000);
        console.log("  CRASH: xAAPL -> $180 (-18.2%) -- loss ratio 91.1% > 80% threshold");

        uint256 liqBefore = usdc.balanceOf(liquidatorBot);
        vm.startBroadcast(PK_LIQUIDATOR);
        exchange.liquidate{value: crashFee}(bobLiqPos, crashUpdates);
        vm.stopBroadcast();
        console.log("  Liquidated! Keeper reward USDC (6 dec):", usdc.balanceOf(liquidatorBot) - liqBefore);

        XStreamExchange.Position memory pos = exchange.getPosition(bobLiqPos);
        require(pos.trader == address(0), "INVARIANT: position must be deleted after liquidation");
        console.log("  Position deleted: VERIFIED");

        // Close the market (no open positions remain after liquidation)
        address[] memory noTokens = new address[](0);
        bytes[]   memory noData   = new bytes[](0);
        vm.startBroadcast(PK_KEEPER_BOT);
        keeper.closeMarket{value: 0}(noTokens, noData);
        vm.stopBroadcast();
        console.log("  Market CLOSED");
    }

    // =========================================================================
    // Phase 7 -- Recombination: Alice burns 1000 px + 1000 dx -> 1000 xAAPL
    // =========================================================================

    function _phase7Recombination() internal {
        console.log("\n=== PHASE 7: RECOMBINATION ===");

        console.log("  Alice pxAAPL balance:", IERC20(pxAAPL).balanceOf(alice));
        console.log("  Alice dxAAPL balance:", IERC20(dxAAPL).balanceOf(alice));
        uint256 xBefore = xAAPL.balanceOf(alice);
        console.log("  Alice xAAPL before:", xBefore);

        // vault.withdraw: syncs dividend (no new rebase since Phase 4),
        // claims pending (0 since Alice claimed in Phase 4), burns px+dx, returns xStock
        vm.startBroadcast(PK_ALICE);
        vault.withdraw(address(xAAPL), 1_000e18);
        vm.stopBroadcast();

        uint256 xAfter = xAAPL.balanceOf(alice);
        console.log("  Alice pxAAPL after: ", IERC20(pxAAPL).balanceOf(alice));
        console.log("  Alice dxAAPL after: ", IERC20(dxAAPL).balanceOf(alice));
        console.log("  Alice xAAPL after:  ", xAfter);
        console.log("  xAAPL returned:     ", xAfter - xBefore);

        require(xAfter - xBefore == 1_000e18, "INVARIANT: 1 px + 1 dx must equal 1 xStock");
        console.log("  INVARIANT: 1 px + 1 dx = 1 xStock [VERIFIED]");
    }

    // =========================================================================
    // Phase 8 -- LP withdrawal: LP exits both pools
    // =========================================================================

    function _phase8LpWithdrawal() internal {
        console.log("\n=== PHASE 8: LP EXIT ===");

        XStreamExchange.PoolConfig memory aaplPool = exchange.getPoolConfig(pxAAPL);
        XStreamExchange.PoolConfig memory spyPool  = exchange.getPoolConfig(pxSPY);

        console.log("  xAAPL pool USDC liquidity:", aaplPool.usdcLiquidity);
        console.log("  xAAPL pool total fees:    ", aaplPool.totalFees);
        console.log("  xAAPL openInterestLong:   ", aaplPool.openInterestLong);
        console.log("  xSPY  pool USDC liquidity:", spyPool.usdcLiquidity);
        console.log("  xSPY  pool total fees:    ", spyPool.totalFees);
        console.log("  xSPY  openInterestLong:   ", spyPool.openInterestLong);

        uint256 lpAaplShares = IERC20(aaplPool.lpToken).balanceOf(lpProvider);
        uint256 lpSpyShares  = IERC20(spyPool.lpToken).balanceOf(lpProvider);
        console.log("  LP xAAPL-LP shares:", lpAaplShares);
        console.log("  LP xSPY-LP  shares:", lpSpyShares);

        uint256 lpBefore = usdc.balanceOf(lpProvider);
        console.log("  LP USDC before:", lpBefore);

        vm.startBroadcast(PK_LP);
        exchange.withdrawLiquidity(pxAAPL, lpAaplShares);
        exchange.withdrawLiquidity(pxSPY,  lpSpyShares);
        vm.stopBroadcast();

        uint256 lpAfter       = usdc.balanceOf(lpProvider);
        uint256 totalReturned = lpAfter - lpBefore;
        console.log("  LP USDC after:          ", lpAfter);
        console.log("  LP received from pools: ", totalReturned);
        console.log("  LP deposited initially: ", uint256(1_000_000e6));

        console.log("\n  --- FINAL SUMMARY ---");
        console.log("  Bob final USDC:    ", usdc.balanceOf(bob));
        console.log("  Alice final xAAPL: ", xAAPL.balanceOf(alice));
        console.log("  LP final USDC:     ", usdc.balanceOf(lpProvider));
    }

    // =========================================================================
    // Helpers -- Pyth price update builders
    // =========================================================================

    /// @dev Build a single-feed price update blob.
    ///      publishTime = block.timestamp + priceSeq so MockPyth always
    ///      accepts the new price (its rule: publishTime > storedPublishTime).
    ///      The offset stays well within the 60-second staleness window.
    function _priceUpdate(bytes32 feedId, int64 price)
        internal
        returns (bytes[] memory updates, uint256 fee)
    {
        uint64 publishTime = uint64(block.timestamp) + priceSeq;
        priceSeq++;
        bytes memory data = mockPyth.createPriceFeedUpdateData(
            feedId,
            price,       // price value (expo=-2 means /100 -> $213.42 = 21342)
            uint64(100), // confidence
            int32(-2),   // exponent
            price,       // ema price (same as spot for tests)
            uint64(100),
            publishTime
        );
        updates    = new bytes[](1);
        updates[0] = data;
        fee        = pythAdapter.getUpdateFee(updates); // 1 wei per entry
    }

    /// @dev Build a dual-feed update blob (AAPL + SPY in one bytes[] array).
    ///      Both feeds share the same publishTime tick so one priceSeq step
    ///      covers the pair atomically.
    ///      closeMarket splits msg.value by pxTokens.length; send fee * nPools.
    function _dualPriceUpdate(int64 aaplPrice, int64 spyPrice)
        internal
        returns (bytes[] memory updates, uint256 fee)
    {
        uint64 publishTime = uint64(block.timestamp) + priceSeq;
        priceSeq++;
        updates    = new bytes[](2);
        updates[0] = mockPyth.createPriceFeedUpdateData(
            AAPL_FEED, aaplPrice, uint64(100), int32(-2),
            aaplPrice,  uint64(100), publishTime
        );
        updates[1] = mockPyth.createPriceFeedUpdateData(
            SPY_FEED, spyPrice, uint64(100), int32(-2),
            spyPrice, uint64(100), publishTime
        );
        fee = pythAdapter.getUpdateFee(updates); // 2 wei total
    }
}
