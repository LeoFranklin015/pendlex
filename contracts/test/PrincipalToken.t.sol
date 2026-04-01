// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PrincipalToken} from "../src/tokens/PrincipalToken.sol";

contract PrincipalTokenTest is Test {
    PrincipalToken public pt;
    address public vault;
    address public alice;
    address public bob;

    function setUp() public {
        vault = makeAddr("vault");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        pt = new PrincipalToken("Principal Token", "PT", vault);
    }

    // --- constructor ---

    function test_constructor_setsName() public view {
        assertEq(pt.name(), "Principal Token");
    }

    function test_constructor_setsSymbol() public view {
        assertEq(pt.symbol(), "PT");
    }

    function test_constructor_setsVault() public view {
        assertEq(pt.vault(), vault);
    }

    // --- mint access control ---

    function test_mint_onlyVaultCanMint() public {
        vm.prank(vault);
        pt.mint(alice, 1000);
        assertEq(pt.balanceOf(alice), 1000);
    }

    function test_mint_nonVaultReverts() public {
        vm.prank(alice);
        vm.expectRevert(PrincipalToken.OnlyVault.selector);
        pt.mint(alice, 1000);
    }

    // --- burn access control ---

    function test_burn_onlyVaultCanBurn() public {
        vm.prank(vault);
        pt.mint(alice, 1000);

        vm.prank(vault);
        pt.burn(alice, 400);
        assertEq(pt.balanceOf(alice), 600);
    }

    function test_burn_nonVaultReverts() public {
        vm.prank(vault);
        pt.mint(alice, 1000);

        vm.prank(alice);
        vm.expectRevert(PrincipalToken.OnlyVault.selector);
        pt.burn(alice, 500);
    }

    // --- mint effects ---

    function test_mint_increasesBalanceAndTotalSupply() public {
        vm.prank(vault);
        pt.mint(alice, 500);
        assertEq(pt.balanceOf(alice), 500);
        assertEq(pt.totalSupply(), 500);

        vm.prank(vault);
        pt.mint(bob, 300);
        assertEq(pt.balanceOf(bob), 300);
        assertEq(pt.totalSupply(), 800);
    }

    // --- burn effects ---

    function test_burn_decreasesBalanceAndTotalSupply() public {
        vm.prank(vault);
        pt.mint(alice, 1000);

        vm.prank(vault);
        pt.burn(alice, 400);
        assertEq(pt.balanceOf(alice), 600);
        assertEq(pt.totalSupply(), 600);
    }

    // --- ERC20 transfer ---

    function test_transfer_works() public {
        vm.prank(vault);
        pt.mint(alice, 1000);

        vm.prank(alice);
        pt.transfer(bob, 250);
        assertEq(pt.balanceOf(alice), 750);
        assertEq(pt.balanceOf(bob), 250);
    }

    function test_approve_and_transferFrom_works() public {
        vm.prank(vault);
        pt.mint(alice, 1000);

        vm.prank(alice);
        pt.approve(bob, 500);

        vm.prank(bob);
        pt.transferFrom(alice, bob, 300);
        assertEq(pt.balanceOf(alice), 700);
        assertEq(pt.balanceOf(bob), 300);
    }
}
