// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LPToken} from "../src/tokens/LPToken.sol";

contract LPTokenTransferableTest is Test {
    LPToken public lp;
    address public exchange;
    address public alice;
    address public bob;

    function setUp() public {
        exchange = makeAddr("exchange");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        lp = new LPToken("LP Token", "LP", exchange, true);
    }

    // --- constructor ---

    function test_constructor_setsName() public view {
        assertEq(lp.name(), "LP Token");
    }

    function test_constructor_setsSymbol() public view {
        assertEq(lp.symbol(), "LP");
    }

    function test_constructor_setsExchange() public view {
        assertEq(lp.exchange(), exchange);
    }

    function test_constructor_setsTransferable() public view {
        assertTrue(lp.transferable());
    }

    // --- mint access control ---

    function test_mint_onlyExchangeCanMint() public {
        vm.prank(exchange);
        lp.mint(alice, 1000);
        assertEq(lp.balanceOf(alice), 1000);
    }

    function test_mint_nonExchangeReverts() public {
        vm.prank(alice);
        vm.expectRevert(LPToken.OnlyExchange.selector);
        lp.mint(alice, 1000);
    }

    // --- burn access control ---

    function test_burn_onlyExchangeCanBurn() public {
        vm.prank(exchange);
        lp.mint(alice, 1000);

        vm.prank(exchange);
        lp.burn(alice, 400);
        assertEq(lp.balanceOf(alice), 600);
    }

    function test_burn_nonExchangeReverts() public {
        vm.prank(exchange);
        lp.mint(alice, 1000);

        vm.prank(alice);
        vm.expectRevert(LPToken.OnlyExchange.selector);
        lp.burn(alice, 500);
    }

    // --- transferable: transfer works ---

    function test_transfer_works_whenTransferable() public {
        vm.prank(exchange);
        lp.mint(alice, 1000);

        vm.prank(alice);
        lp.transfer(bob, 250);
        assertEq(lp.balanceOf(alice), 750);
        assertEq(lp.balanceOf(bob), 250);
    }
}

contract LPTokenNonTransferableTest is Test {
    LPToken public lp;
    address public exchange;
    address public alice;
    address public bob;

    function setUp() public {
        exchange = makeAddr("exchange");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        lp = new LPToken("LP Token NT", "LPNT", exchange, false);
    }

    function test_constructor_setsTransferableFalse() public view {
        assertFalse(lp.transferable());
    }

    // --- non-transferable: transfer reverts ---

    function test_transfer_reverts_whenNonTransferable() public {
        vm.prank(exchange);
        lp.mint(alice, 1000);

        vm.prank(alice);
        vm.expectRevert(LPToken.TransfersDisabled.selector);
        lp.transfer(bob, 100);
    }

    function test_transferFrom_reverts_whenNonTransferable() public {
        vm.prank(exchange);
        lp.mint(alice, 1000);

        vm.prank(alice);
        lp.approve(bob, 500);

        vm.prank(bob);
        vm.expectRevert(LPToken.TransfersDisabled.selector);
        lp.transferFrom(alice, bob, 100);
    }

    // --- non-transferable: mint and burn still work ---

    function test_mint_works_whenNonTransferable() public {
        vm.prank(exchange);
        lp.mint(alice, 500);
        assertEq(lp.balanceOf(alice), 500);
        assertEq(lp.totalSupply(), 500);
    }

    function test_burn_works_whenNonTransferable() public {
        vm.prank(exchange);
        lp.mint(alice, 1000);

        vm.prank(exchange);
        lp.burn(alice, 400);
        assertEq(lp.balanceOf(alice), 600);
        assertEq(lp.totalSupply(), 600);
    }
}
