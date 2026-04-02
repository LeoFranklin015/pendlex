// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {NetworkRegistry}  from "./NetworkRegistry.sol";
import {PythAdapter}      from "../src/PythAdapter.sol";
import {XStreamVault}     from "../src/XStreamVault.sol";
import {XStreamExchange}  from "../src/XStreamExchange.sol";
import {MarketKeeper}     from "../src/MarketKeeper.sol";
import {DxLeaseEscrow}    from "../src/DxLeaseEscrow.sol";
import {PrincipalToken}   from "../src/tokens/PrincipalToken.sol";
import {MockUSDC}         from "../test/mocks/MockUSDC.sol";

/// @title  ProdDeploy
/// @notice Deploys the pendlex protocol using real Dinari xStock tokens and
///         the real Pyth pull oracle. MockUSDC is used as the collateral token
///         since no canonical testnet USDC address is confirmed on both testnets.
///         Writes deployed addresses to deployments/prod.json for frontend use.
///
/// Supported networks (xStock addresses sourced from Dinari app):
///   Ink Sepolia      (chain 763373)   : ink_sepolia
///   Ethereum Sepolia (chain 11155111) : eth_sepolia
///
/// Prerequisites:
///   Set PRIVATE_KEY in contracts/.env
///   Deployer must have ETH on the target network for gas
///
/// Run on Ink Sepolia:
///   forge script script/ProdDeploy.s.sol:ProdDeploy --rpc-url ink_sepolia --broadcast -vvvv
///
/// Run on Ethereum Sepolia:
///   forge script script/ProdDeploy.s.sol:ProdDeploy --rpc-url eth_sepolia --broadcast -vvvv
contract ProdDeploy is Script {

    // Pyth staleness: 25 hours covers overnight + weekend gaps
    uint256 constant MAX_STALENESS = 90000;

    // =========================================================================
    // State
    // =========================================================================

    uint256 deployerKey;
    address deployer;

    PythAdapter     pythAdapter;
    MockUSDC        usdc;
    XStreamVault    vault;
    XStreamExchange exchange;
    MarketKeeper    keeper;
    DxLeaseEscrow   escrow;

    address xTSLA;  address xNVDA;  address xGOOGL; address xAAPL;
    address xSPY;   address xTBLL;  address xGLD;   address xSLV;

    address pxTSLA;  address dxTSLA;
    address pxNVDA;  address dxNVDA;
    address pxGOOGL; address dxGOOGL;
    address pxAAPL;  address dxAAPL;
    address pxSPY;   address dxSPY;
    address pxTBLL;  address dxTBLL;
    address pxGLD;   address dxGLD;
    address pxSLV;   address dxSLV;

    // =========================================================================
    // Entry point
    // =========================================================================

    function run() external {
        deployerKey = vm.envUint("PRIVATE_KEY");
        deployer    = vm.addr(deployerKey);
        uint256 chainId = block.chainid;

        console.log("Deploying from:", deployer);
        console.log("Chain ID:      ", chainId);
        console.log("Network:       ", NetworkRegistry.name(chainId));
        console.log("Pyth contract: ", NetworkRegistry.PYTH);

        // Load real xStock addresses from registry
        xTSLA  = NetworkRegistry.xTSLA(chainId);
        xNVDA  = NetworkRegistry.xNVDA(chainId);
        xGOOGL = NetworkRegistry.xGOOGL(chainId);
        xAAPL  = NetworkRegistry.xAAPL(chainId);
        xSPY   = NetworkRegistry.xSPY(chainId);
        xTBLL  = NetworkRegistry.xTBLL(chainId);
        xGLD   = NetworkRegistry.xGLD(chainId);
        xSLV   = NetworkRegistry.xSLV(chainId);

        _deploy();
        _writeJson();
    }

    // =========================================================================
    // Deploy
    // =========================================================================

    function _deploy() internal {
        console.log("\n=== DEPLOY ===");

        vm.startBroadcast(deployerKey);

        // Real Pyth oracle (same address on both testnets)
        pythAdapter = new PythAdapter(NetworkRegistry.PYTH, MAX_STALENESS);

        // Deploy MockUSDC as collateral token
        usdc = new MockUSDC();
        usdc.mint(deployer, 10_000_000e6);

        // Vault: register all 8 real xStock assets
        vault = new XStreamVault();
        (pxTSLA,  dxTSLA)  = vault.registerAsset(xTSLA,  NetworkRegistry.FEED_TSLA,  "TSLA");
        (pxNVDA,  dxNVDA)  = vault.registerAsset(xNVDA,  NetworkRegistry.FEED_NVDA,  "NVDA");
        (pxGOOGL, dxGOOGL) = vault.registerAsset(xGOOGL, NetworkRegistry.FEED_GOOGL, "GOOGL");
        (pxAAPL,  dxAAPL)  = vault.registerAsset(xAAPL,  NetworkRegistry.FEED_AAPL,  "AAPL");
        (pxSPY,   dxSPY)   = vault.registerAsset(xSPY,   NetworkRegistry.FEED_SPY,   "SPY");
        (pxTBLL,  dxTBLL)  = vault.registerAsset(xTBLL,  NetworkRegistry.FEED_TBLL,  "TBLL");
        (pxGLD,   dxGLD)   = vault.registerAsset(xGLD,   NetworkRegistry.FEED_GLD,   "GLD");
        (pxSLV,   dxSLV)   = vault.registerAsset(xSLV,   NetworkRegistry.FEED_SLV,   "SLV");

        // Exchange: register all 8 pools
        exchange = new XStreamExchange(address(usdc), address(pythAdapter));
        exchange.registerPool(xTSLA,  pxTSLA,  NetworkRegistry.FEED_TSLA);
        exchange.registerPool(xNVDA,  pxNVDA,  NetworkRegistry.FEED_NVDA);
        exchange.registerPool(xGOOGL, pxGOOGL, NetworkRegistry.FEED_GOOGL);
        exchange.registerPool(xAAPL,  pxAAPL,  NetworkRegistry.FEED_AAPL);
        exchange.registerPool(xSPY,   pxSPY,   NetworkRegistry.FEED_SPY);
        exchange.registerPool(xTBLL,  pxTBLL,  NetworkRegistry.FEED_TBLL);
        exchange.registerPool(xGLD,   pxGLD,   NetworkRegistry.FEED_GLD);
        exchange.registerPool(xSLV,   pxSLV,   NetworkRegistry.FEED_SLV);

        // Keeper + Escrow (deployer is initial keeper bot)
        keeper = new MarketKeeper(address(exchange), address(pythAdapter), deployer);
        exchange.setKeeper(address(keeper));
        keeper.addKeeper(deployer);

        // Seed USDC liquidity -- deployer must approve xStock deposits separately
        // after acquiring xStock tokens from Dinari
        usdc.approve(address(exchange), type(uint256).max);
        exchange.depositLiquidity(pxTSLA,  100_000e6);
        exchange.depositLiquidity(pxNVDA,  100_000e6);
        exchange.depositLiquidity(pxGOOGL, 100_000e6);
        exchange.depositLiquidity(pxAAPL,  100_000e6);
        exchange.depositLiquidity(pxSPY,   100_000e6);
        exchange.depositLiquidity(pxTBLL,  100_000e6);
        exchange.depositLiquidity(pxGLD,   100_000e6);
        exchange.depositLiquidity(pxSLV,   100_000e6);

        escrow = new DxLeaseEscrow(address(vault), address(usdc), 1e6);

        vm.stopBroadcast();

        console.log("  PythAdapter: ", address(pythAdapter));
        console.log("  MockUSDC:    ", address(usdc));
        console.log("  Vault:       ", address(vault));
        console.log("  Exchange:    ", address(exchange));
        console.log("  Keeper:      ", address(keeper));
        console.log("  Escrow:      ", address(escrow));
        console.log("--- xStock / px / dx ---");
        console.log("  TSLA:  ", xTSLA,  pxTSLA,  dxTSLA);
        console.log("  NVDA:  ", xNVDA,  pxNVDA,  dxNVDA);
        console.log("  GOOGL: ", xGOOGL, pxGOOGL, dxGOOGL);
        console.log("  AAPL:  ", xAAPL,  pxAAPL,  dxAAPL);
        console.log("  SPY:   ", xSPY,   pxSPY,   dxSPY);
        console.log("  TBLL:  ", xTBLL,  pxTBLL,  dxTBLL);
        console.log("  GLD:   ", xGLD,   pxGLD,   dxGLD);
        console.log("  SLV:   ", xSLV,   pxSLV,   dxSLV);
    }

    // =========================================================================
    // Write deployments/prod.json
    // =========================================================================

    function _writeJson() internal {
        console.log("\n=== WRITING deployments/prod.json ===");

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
            '  "network": "',      NetworkRegistry.name(block.chainid),          '",\n',
            '  "chainId": "',      vm.toString(block.chainid),                   '",\n',
            '  "pythContract": "', vm.toString(NetworkRegistry.PYTH),            '",\n',
            '  "pythAdapter": "',  vm.toString(address(pythAdapter)),            '",\n',
            '  "usdc": "',         vm.toString(address(usdc)),                   '",\n',
            '  "vault": "',        vm.toString(address(vault)),                  '",\n',
            '  "exchange": "',     vm.toString(address(exchange)),               '",\n',
            '  "marketKeeper": "', vm.toString(address(keeper)),                 '",\n',
            '  "escrow": "',       vm.toString(address(escrow)),                 '",\n',
            '  "assets": [\n',
            _assetJson("Tesla xStock",               "TSLAxt",  xTSLA,  pxTSLA,  dxTSLA,  lpTSLA,  NetworkRegistry.FEED_TSLA,  false), ',\n',
            _assetJson("NVIDIA xStock",              "NVDAxt",  xNVDA,  pxNVDA,  dxNVDA,  lpNVDA,  NetworkRegistry.FEED_NVDA,  true),  ',\n',
            _assetJson("Alphabet xStock",            "GOOGLxt", xGOOGL, pxGOOGL, dxGOOGL, lpGOOGL, NetworkRegistry.FEED_GOOGL, true),  ',\n',
            _assetJson("Apple xStock",               "AAPLxt",  xAAPL,  pxAAPL,  dxAAPL,  lpAAPL,  NetworkRegistry.FEED_AAPL,  true),  ',\n',
            _assetJson("SP500 xStock",               "SPYxt",   xSPY,   pxSPY,   dxSPY,   lpSPY,   NetworkRegistry.FEED_SPY,   true),  ',\n',
            _assetJson("TBLL xStock",                "TBLLxt",  xTBLL,  pxTBLL,  dxTBLL,  lpTBLL,  NetworkRegistry.FEED_TBLL,  true),  ',\n',
            _assetJson("Gold xStock",                "GLDxt",   xGLD,   pxGLD,   dxGLD,   lpGLD,   NetworkRegistry.FEED_GLD,   false), ',\n',
            _assetJson("iShares Silver Trust xStock","SLVxt",   xSLV,   pxSLV,   dxSLV,   lpSLV,   NetworkRegistry.FEED_SLV,   false),
            '\n  ]\n}'
        );

        vm.writeFile("deployments/prod.json", json);
        console.log("  Written to deployments/prod.json");
    }

    function _assetJson(
        string memory name_,
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
            '      "name": "',               name_,                                   '",\n',
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
}
