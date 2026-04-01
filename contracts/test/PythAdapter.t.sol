// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PythAdapter} from "../src/PythAdapter.sol";
import {MockPyth} from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";

contract PythAdapterTest is Test {
    PythAdapter adapter;
    MockPyth mockPyth;

    bytes32 constant FEED_ID = bytes32(uint256(1));
    uint256 constant MAX_STALENESS = 60; // 60 seconds
    uint256 constant SINGLE_UPDATE_FEE = 1; // 1 wei per update

    function setUp() public {
        // validTimePeriod must be >= maxStaleness for MockPyth's getPriceNoOlderThan
        mockPyth = new MockPyth(MAX_STALENESS, SINGLE_UPDATE_FEE);
        adapter = new PythAdapter(address(mockPyth), MAX_STALENESS);
    }

    // ---------------------------------------------------------------
    // 1. normalizePythPrice
    // ---------------------------------------------------------------

    function test_NormalizePythPrice() public view {
        // price=21342, expo=-2 -> 213.42 * 1e18 = 213_420_000_000_000_000_000
        uint256 result1 = adapter.normalizePythPrice(21342, -2);
        assertEq(result1, 213_420_000_000_000_000_000);

        // price=12345, expo=-5 -> 0.12345 * 1e18 = 123_450_000_000_000_000
        // 12345 * 10^(18-5) = 12345 * 10^13 = 1.2345e17
        uint256 result2 = adapter.normalizePythPrice(12345, -5);
        assertEq(result2, 123_450_000_000_000_000);

        // price=500, expo=0 -> 500 * 1e18
        uint256 result3 = adapter.normalizePythPrice(500, 0);
        assertEq(result3, 500e18);
    }

    // ---------------------------------------------------------------
    // 2. normalizePythPrice reverts on negative price
    // ---------------------------------------------------------------

    function test_NormalizePythPrice_NegativeReverts() public {
        vm.expectRevert(PythAdapter.NegativePrice.selector);
        adapter.normalizePythPrice(-1, -8);
    }

    // ---------------------------------------------------------------
    // 3. getPrice
    // ---------------------------------------------------------------

    function test_GetPrice() public {
        // Warp to a known timestamp so publishTime is within staleness window
        uint64 publishTime = 1000;
        vm.warp(publishTime);

        // Build update data: price=21342, conf=10, expo=-2, emaPrice=21342, emaConf=10
        bytes memory update = mockPyth.createPriceFeedUpdateData(
            FEED_ID,
            int64(21342),
            uint64(10),
            int32(-2),
            int64(21342),
            uint64(10),
            publishTime
        );

        bytes[] memory updateData = new bytes[](1);
        updateData[0] = update;

        // Fee for 1 update
        uint256 fee = mockPyth.getUpdateFee(updateData);
        assertEq(fee, SINGLE_UPDATE_FEE);

        // Fund this test contract
        vm.deal(address(this), 1 ether);

        (uint256 price, uint256 retPublishTime) = adapter.getPrice{value: fee}(
            FEED_ID,
            updateData
        );

        // 21342 * 10^(18-2) = 213.42e18
        assertEq(price, 213_420_000_000_000_000_000);
        assertEq(retPublishTime, publishTime);
    }

    // ---------------------------------------------------------------
    // 4. setMaxStaleness
    // ---------------------------------------------------------------

    function test_SetMaxStaleness() public {
        // Owner (this contract) can set
        adapter.setMaxStaleness(120);
        assertEq(adapter.maxStaleness(), 120);

        // Non-owner reverts (OwnableUnauthorizedAccount from OZ5)
        address nonOwner = address(0xBEEF);
        vm.prank(nonOwner);
        vm.expectRevert();
        adapter.setMaxStaleness(999);

        // Confirm unchanged
        assertEq(adapter.maxStaleness(), 120);
    }

    // ---------------------------------------------------------------
    // 5. getUpdateFee
    // ---------------------------------------------------------------

    function test_GetUpdateFee() public view {
        bytes[] memory updateData = new bytes[](3);
        updateData[0] = "";
        updateData[1] = "";
        updateData[2] = "";

        uint256 fee = adapter.getUpdateFee(updateData);
        assertEq(fee, 3 * SINGLE_UPDATE_FEE);
    }
}
