// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockPyth} from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";

import {PythAdapter}     from "../src/PythAdapter.sol";
import {XStreamVault}    from "../src/XStreamVault.sol";
import {XStreamExchange} from "../src/XStreamExchange.sol";
import {MarketKeeper}    from "../src/MarketKeeper.sol";
import {DxLeaseEscrow}   from "../src/DxLeaseEscrow.sol";
import {PrincipalToken}  from "../src/tokens/PrincipalToken.sol";
import {MockUSDC}        from "../test/mocks/MockUSDC.sol";
import {MockXStock}      from "../test/mocks/MockXStock.sol";

/// @title  MockDeploy
/// @notice Deploys the full pendlex protocol using MockPyth, MockUSDC, and MockXStock.
///         Works on Anvil, Ink Sepolia, and Ethereum Sepolia.
///         Writes deployed addresses to deployments/mock.json for frontend use.
///
/// Prerequisites:
///   Set PRIVATE_KEY in contracts/.env
///
/// Run on Anvil:
///   anvil                                                       (terminal 1)
///   forge script script/MockDeploy.s.sol:MockDeploy --rpc-url anvil --broadcast -vvvv
///
/// Run on Ink Sepolia:
///   forge script script/MockDeploy.s.sol:MockDeploy --rpc-url ink_sepolia --broadcast -vvvv
///
/// Run on Ethereum Sepolia:
///   forge script script/MockDeploy.s.sol:MockDeploy --rpc-url eth_sepolia --broadcast -vvvv
contract MockDeploy is Script {

    // =========================================================================
    // Mock Pyth feed IDs (sequential bytes32 -- order matches H_ array)
    // =========================================================================

    bytes32 constant FEED_TSLA  = bytes32(uint256(1));
    bytes32 constant FEED_NVDA  = bytes32(uint256(2));
    bytes32 constant FEED_GOOGL = bytes32(uint256(3));
    bytes32 constant FEED_AAPL  = bytes32(uint256(4));
    bytes32 constant FEED_SPY   = bytes32(uint256(5));
    bytes32 constant FEED_TBLL  = bytes32(uint256(6));
    bytes32 constant FEED_GLD   = bytes32(uint256(7));
    bytes32 constant FEED_SLV   = bytes32(uint256(8));

    // Starting prices (expo = -2, divide by 100 for USD)
    int64 constant PRICE_TSLA  = 39120;
    int64 constant PRICE_NVDA  = 18025;
    int64 constant PRICE_GOOGL = 30228;
    int64 constant PRICE_AAPL  = 25012;
    int64 constant PRICE_SPY   = 66229;
    int64 constant PRICE_TBLL  = 10570;
    int64 constant PRICE_GLD   = 46084;
    int64 constant PRICE_SLV   = 7269;

    // =========================================================================
    // State
    // =========================================================================

    uint256 deployerKey;
    address deployer;

    MockPyth        mockPyth;
    PythAdapter     pythAdapter;
    MockUSDC        usdc;
    XStreamVault    vault;
    XStreamExchange exchange;
    MarketKeeper    keeper;
    DxLeaseEscrow   escrow;

    MockXStock xTSLA;  MockXStock xNVDA;  MockXStock xGOOGL; MockXStock xAAPL;
    MockXStock xSPY;   MockXStock xTBLL;  MockXStock xGLD;   MockXStock xSLV;

    address pxTSLA;  address dxTSLA;
    address pxNVDA;  address dxNVDA;
    address pxGOOGL; address dxGOOGL;
    address pxAAPL;  address dxAAPL;
    address pxSPY;   address dxSPY;
    address pxTBLL;  address dxTBLL;
    address pxGLD;   address dxGLD;
    address pxSLV;   address dxSLV;

    uint64 priceSeq;

    // =========================================================================
    // Entry point
    // =========================================================================

    function run() external {
        deployerKey = vm.envUint("PRIVATE_KEY");
        deployer    = vm.addr(deployerKey);

        console.log("Deploying from:", deployer);
        console.log("Chain ID:      ", block.chainid);

        _deploy();
        _seed();
        _smokeTest();
        _writeJson();
    }

    // =========================================================================
    // Phase 1 -- Deploy all protocol contracts
    // =========================================================================

    function _deploy() internal {
        console.log("\n=== DEPLOY ===");

        vm.startBroadcast(deployerKey);

        // Oracle: 1-hour validity, 1 wei per update fee
        mockPyth    = new MockPyth(3600, 1);
        pythAdapter = new PythAdapter(address(mockPyth), 3600);
        usdc        = new MockUSDC();

        // 8 xStock mocks matching H_ array
        xTSLA  = new MockXStock("Tesla xStock",               "TSLAxt");
        xNVDA  = new MockXStock("NVIDIA xStock",              "NVDAxt");
        xGOOGL = new MockXStock("Alphabet xStock",            "GOOGLxt");
        xAAPL  = new MockXStock("Apple xStock",               "AAPLxt");
        xSPY   = new MockXStock("SP500 xStock",               "SPYxt");
        xTBLL  = new MockXStock("TBLL xStock",                "TBLLxt");
        xGLD   = new MockXStock("Gold xStock",                "GLDxt");
        xSLV   = new MockXStock("iShares Silver Trust xStock","SLVxt");

        // Vault: register all 8 assets
        vault = new XStreamVault();
        (pxTSLA,  dxTSLA)  = vault.registerAsset(address(xTSLA),  FEED_TSLA,  "TSLA");
        (pxNVDA,  dxNVDA)  = vault.registerAsset(address(xNVDA),  FEED_NVDA,  "NVDA");
        (pxGOOGL, dxGOOGL) = vault.registerAsset(address(xGOOGL), FEED_GOOGL, "GOOGL");
        (pxAAPL,  dxAAPL)  = vault.registerAsset(address(xAAPL),  FEED_AAPL,  "AAPL");
        (pxSPY,   dxSPY)   = vault.registerAsset(address(xSPY),   FEED_SPY,   "SPY");
        (pxTBLL,  dxTBLL)  = vault.registerAsset(address(xTBLL),  FEED_TBLL,  "TBLL");
        (pxGLD,   dxGLD)   = vault.registerAsset(address(xGLD),   FEED_GLD,   "GLD");
        (pxSLV,   dxSLV)   = vault.registerAsset(address(xSLV),   FEED_SLV,   "SLV");

        // Exchange: register all 8 pools
        exchange = new XStreamExchange(address(usdc), address(pythAdapter));
        exchange.registerPool(address(xTSLA),  pxTSLA,  FEED_TSLA);
        exchange.registerPool(address(xNVDA),  pxNVDA,  FEED_NVDA);
        exchange.registerPool(address(xGOOGL), pxGOOGL, FEED_GOOGL);
        exchange.registerPool(address(xAAPL),  pxAAPL,  FEED_AAPL);
        exchange.registerPool(address(xSPY),   pxSPY,   FEED_SPY);
        exchange.registerPool(address(xTBLL),  pxTBLL,  FEED_TBLL);
        exchange.registerPool(address(xGLD),   pxGLD,   FEED_GLD);
        exchange.registerPool(address(xSLV),   pxSLV,   FEED_SLV);

        // Keeper + Escrow
        keeper = new MarketKeeper(address(exchange), address(pythAdapter), deployer);
        exchange.setKeeper(address(keeper));
        keeper.addKeeper(deployer);

        escrow = new DxLeaseEscrow(address(vault), address(usdc), 1e6);

        vm.stopBroadcast();

        console.log("  MockPyth:    ", address(mockPyth));
        console.log("  PythAdapter: ", address(pythAdapter));
        console.log("  MockUSDC:    ", address(usdc));
        console.log("  Vault:       ", address(vault));
        console.log("  Exchange:    ", address(exchange));
        console.log("  Keeper:      ", address(keeper));
        console.log("  Escrow:      ", address(escrow));
    }

    // =========================================================================
    // Phase 2 -- Seed deployer with tokens and liquidity
    // =========================================================================

    function _seed() internal {
        console.log("\n=== SEED ===");

        vm.startBroadcast(deployerKey);

        // Mint xStocks and USDC to deployer
        xTSLA.mint(deployer,  10_000e18); xNVDA.mint(deployer,  10_000e18);
        xGOOGL.mint(deployer, 10_000e18); xAAPL.mint(deployer,  10_000e18);
        xSPY.mint(deployer,   10_000e18); xTBLL.mint(deployer,  10_000e18);
        xGLD.mint(deployer,   10_000e18); xSLV.mint(deployer,   10_000e18);
        usdc.mint(deployer, 10_000_000e6);

        // Mint dividend reserve into vault
        xTSLA.mint(address(vault),  10_000e18); xNVDA.mint(address(vault),  10_000e18);
        xGOOGL.mint(address(vault), 10_000e18); xAAPL.mint(address(vault),  10_000e18);
        xSPY.mint(address(vault),   10_000e18); xTBLL.mint(address(vault),  10_000e18);
        xGLD.mint(address(vault),   10_000e18); xSLV.mint(address(vault),   10_000e18);

        // Deposit xStock into vault, seed px reserves in exchange
        _mintAndSeed(xTSLA,  address(vault), pxTSLA);
        _mintAndSeed(xNVDA,  address(vault), pxNVDA);
        _mintAndSeed(xGOOGL, address(vault), pxGOOGL);
        _mintAndSeed(xAAPL,  address(vault), pxAAPL);
        _mintAndSeed(xSPY,   address(vault), pxSPY);
        _mintAndSeed(xTBLL,  address(vault), pxTBLL);
        _mintAndSeed(xGLD,   address(vault), pxGLD);
        _mintAndSeed(xSLV,   address(vault), pxSLV);

        // Deposit USDC liquidity into each pool
        usdc.approve(address(exchange), type(uint256).max);
        exchange.depositLiquidity(pxTSLA,  300_000e6);
        exchange.depositLiquidity(pxNVDA,  300_000e6);
        exchange.depositLiquidity(pxGOOGL, 300_000e6);
        exchange.depositLiquidity(pxAAPL,  300_000e6);
        exchange.depositLiquidity(pxSPY,   300_000e6);
        exchange.depositLiquidity(pxTBLL,  300_000e6);
        exchange.depositLiquidity(pxGLD,   300_000e6);
        exchange.depositLiquidity(pxSLV,   300_000e6);

        vm.stopBroadcast();

        console.log("  Seeded: xStock, USDC, LP deposits for all 8 pools");
    }

    function _mintAndSeed(MockXStock xStock, address vaultAddr, address pxToken) internal {
        xStock.mint(deployer, 200_000e18);
        xStock.approve(vaultAddr, type(uint256).max);
        vault.deposit(address(xStock), 100_000e18);
        PrincipalToken(pxToken).approve(address(exchange), type(uint256).max);
        exchange.depositPxReserve(pxToken, 50_000e18);
    }

    // =========================================================================
    // Phase 3 -- Smoke test: one full trade + dividend cycle
    // =========================================================================

    function _smokeTest() internal {
        console.log("\n=== SMOKE TEST ===");

        vm.startBroadcast(deployerKey);

        keeper.openMarket();
        console.log("  Market OPEN");

        (bytes[] memory openData, uint256 openFee) = _priceUpdate(FEED_AAPL, PRICE_AAPL);
        usdc.approve(address(exchange), type(uint256).max);
        exchange.openLong{value: openFee}(pxAAPL, 10_000e6, 3e18, openData);
        console.log("  3x LONG AAPL @$250.12 | $10k collateral");

        (bytes[] memory closeData, uint256 closeFee) = _priceUpdate(FEED_AAPL, 27500);
        address[] memory pxTokens = new address[](1);
        pxTokens[0] = pxAAPL;
        uint256 balBefore = usdc.balanceOf(deployer);
        keeper.closeMarket{value: closeFee * 2}(pxTokens, closeData);
        console.log("  Settled AAPL @$275 | deployer received:", usdc.balanceOf(deployer) - balBefore);
        console.log("  Market CLOSED");

        xNVDA.approve(address(vault), type(uint256).max);
        vault.deposit(address(xNVDA), 1_000e18);
        xNVDA.setMultiplier(1_001_000_000_000_000_000);
        vault.syncDividend(address(xNVDA));
        console.log("  Pending NVDA dividend:", vault.pendingDividend(address(xNVDA), deployer));
        vault.claimDividend(address(xNVDA));
        console.log("  Dividend claimed. Smoke test PASSED");

        vm.stopBroadcast();
    }

    // =========================================================================
    // Phase 4 -- Write deployments/mock.json
    // =========================================================================

    function _writeJson() internal {
        console.log("\n=== WRITING deployments/mock.json ===");

        address lpTSLA  = exchange.getPoolConfig(pxTSLA).lpToken;
        address lpNVDA  = exchange.getPoolConfig(pxNVDA).lpToken;
        address lpGOOGL = exchange.getPoolConfig(pxGOOGL).lpToken;
        address lpAAPL  = exchange.getPoolConfig(pxAAPL).lpToken;
        address lpSPY   = exchange.getPoolConfig(pxSPY).lpToken;
        address lpTBLL  = exchange.getPoolConfig(pxTBLL).lpToken;
        address lpGLD   = exchange.getPoolConfig(pxGLD).lpToken;
        address lpSLV   = exchange.getPoolConfig(pxSLV).lpToken;

        string memory json = string.concat(
            '{\n',
            '  "network": "', _networkName(),                              '",\n',
            '  "chainId": "',  vm.toString(block.chainid),                 '",\n',
            '  "mockPyth": "', vm.toString(address(mockPyth)),             '",\n',
            '  "pythAdapter": "', vm.toString(address(pythAdapter)),       '",\n',
            '  "usdc": "',     vm.toString(address(usdc)),                 '",\n',
            '  "vault": "',    vm.toString(address(vault)),                '",\n',
            '  "exchange": "', vm.toString(address(exchange)),             '",\n',
            '  "marketKeeper": "', vm.toString(address(keeper)),           '",\n',
            '  "escrow": "',   vm.toString(address(escrow)),               '",\n',
            '  "assets": [\n',
            _assetJson("Tesla xStock",               "TSLAxt",  address(xTSLA),  pxTSLA,  dxTSLA,  lpTSLA,  FEED_TSLA,  false), ',\n',
            _assetJson("NVIDIA xStock",              "NVDAxt",  address(xNVDA),  pxNVDA,  dxNVDA,  lpNVDA,  FEED_NVDA,  true),  ',\n',
            _assetJson("Alphabet xStock",            "GOOGLxt", address(xGOOGL), pxGOOGL, dxGOOGL, lpGOOGL, FEED_GOOGL, true),  ',\n',
            _assetJson("Apple xStock",               "AAPLxt",  address(xAAPL),  pxAAPL,  dxAAPL,  lpAAPL,  FEED_AAPL,  true),  ',\n',
            _assetJson("SP500 xStock",               "SPYxt",   address(xSPY),   pxSPY,   dxSPY,   lpSPY,   FEED_SPY,   true),  ',\n',
            _assetJson("TBLL xStock",                "TBLLxt",  address(xTBLL),  pxTBLL,  dxTBLL,  lpTBLL,  FEED_TBLL,  true),  ',\n',
            _assetJson("Gold xStock",                "GLDxt",   address(xGLD),   pxGLD,   dxGLD,   lpGLD,   FEED_GLD,   false), ',\n',
            _assetJson("iShares Silver Trust xStock","SLVxt",   address(xSLV),   pxSLV,   dxSLV,   lpSLV,   FEED_SLV,   false),
            '\n  ]\n}'
        );

                vm.writeFile("deployments/mock.json", json);
        console.log("  Written to deployments/mock.json");
    }

    function _assetJson(
        string memory name,
        string memory symbol,
        address xStock,
        address pxToken,
        address dxToken,
        address lpToken,
        bytes32 feedId,
        bool isMultiplierChanging
    ) internal pure returns (string memory) {
        return string.concat(
            '    {\n',
            '      "name": "',               name,                                    '",\n',
            '      "symbol": "',             symbol,                                  '",\n',
            '      "xStock": "',             vm.toString(xStock),                     '",\n',
            '      "pxToken": "',            vm.toString(pxToken),                    '",\n',
            '      "dxToken": "',            vm.toString(dxToken),                    '",\n',
            '      "lpToken": "',            vm.toString(lpToken),                    '",\n',
            '      "pythFeedId": "',         vm.toString(feedId),                     '",\n',
            '      "isMultiplierChanging": ', isMultiplierChanging ? "true" : "false", '\n',
            '    }'
        );
    }

        function _networkName() internal view returns (string memory) {
        if (block.chainid == 763373)   return "ink_sepolia";
        if (block.chainid == 11155111) return "eth_sepolia";
        return "anvil";
    }

    // =========================================================================
    // Helper: build single-feed MockPyth price update blob
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
