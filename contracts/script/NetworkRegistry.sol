// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title  NetworkRegistry
/// @notice Real Dinari xStock token addresses for each supported testnet.
///         Sourced directly from the Dinari app UI.
///
/// Chain IDs:
///   Ethereum Sepolia : 11155111
///   Ink Sepolia      : 763373
library NetworkRegistry {

    // =========================================================================
    // Pyth contract -- same address on both Ink Sepolia and Ethereum Sepolia
    // =========================================================================

    address constant PYTH = 0x2880aB155794e7179c9eE2e38200202908C17B43;

    // =========================================================================
    // Real Pyth price feed IDs (market hours, non-pre/post)
    // =========================================================================

    bytes32 constant FEED_TSLA  = 0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1;
    bytes32 constant FEED_NVDA  = 0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593;
    bytes32 constant FEED_GOOGL = 0x5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6;
    bytes32 constant FEED_AAPL  = 0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688;
    bytes32 constant FEED_SPY   = 0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5;
    // No direct Pyth TBLL feed -- using BIL (SPDR Bloomberg 1-3 Month T-Bill ETF) as proxy
    bytes32 constant FEED_TBLL  = 0x6050efb3d94369697e5cdebf4b7a14f0f503bf8cd880e24ef85f9fbc0a68feb2;
    bytes32 constant FEED_GLD   = 0xe190f467043db04548200354889dfe0d9d314c08b8d4e62fabf4d5a3140fecca;
    bytes32 constant FEED_SLV   = 0x6fc08c9963d266069cbd9780d98383dabf2668322a5bef0b9491e11d67e5d7e7;

    // =========================================================================
    // xStock addresses by network
    // =========================================================================

    function xTSLA(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0x27c253BB83731D6323b3fb2B333DcF0C94b6031e; // eth_sepolia
        if (chainId == 763373)   return 0x9F64b176fEDF64a9A37ba58d372f3bd13B5F73b4; // ink_sepolia
        revert("NetworkRegistry: unsupported chain");
    }

    function xNVDA(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0xaDfdf3EC7dC440931D363DA1D97b8Ee0479Dc409;
        if (chainId == 763373)   return 0xfeE1b917518EFa5c63C6baB841426F6A52b8581e;
        revert("NetworkRegistry: unsupported chain");
    }

    function xGOOGL(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0x8A36935c0F5137ceA736F28886ef8F480a1a1727;
        if (chainId == 763373)   return 0x9eE3eb32dD9Da95Cd1D9C824701A1EcF9AE046B2;
        revert("NetworkRegistry: unsupported chain");
    }

    function xAAPL(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0x6DEfC6061Cafa52d96FAf60AE7A7D727a75C3Bdb;
        if (chainId == 763373)   return 0x3e3885a7106107728afEF74A0000d90D3fA3cd1e;
        revert("NetworkRegistry: unsupported chain");
    }

    function xSPY(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0x7312c657e8c73c09dD282c5E7cBdDf43ace25cFc;
        if (chainId == 763373)   return 0xC16212b6840001f0a4382c3Da3c3f136C5b1cC31;
        revert("NetworkRegistry: unsupported chain");
    }

    function xTBLL(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0x6b4aDe3cAa2bEa98CEbe7019E09d69c23CD11C42;
        if (chainId == 763373)   return 0x06fdEB09bdCC13eCCC758b15DC81a45c839632d7;
        revert("NetworkRegistry: unsupported chain");
    }

    function xGLD(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0xeae1f4476fDBD4FaED890568b1Cf69F372d72462;
        if (chainId == 763373)   return 0xedB61935572130a7946B7FA9A3EC788367047E4D;
        revert("NetworkRegistry: unsupported chain");
    }

    function xSLV(uint256 chainId) internal pure returns (address) {
        if (chainId == 11155111) return 0x732C084288F3E7eF4D0b6Cdb6bdcbFd072DfEb92;
        if (chainId == 763373)   return 0x24A25fB43521D93AB57D1d57B0531fA5813a238c;
        revert("NetworkRegistry: unsupported chain");
    }

    // =========================================================================
    // Network name helper
    // =========================================================================

    function name(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 11155111) return "eth_sepolia";
        if (chainId == 763373)   return "ink_sepolia";
        if (chainId == 31337)    return "anvil";
        return "unknown";
    }
}
