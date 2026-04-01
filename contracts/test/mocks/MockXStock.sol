// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockXStock is ERC20 {
    uint256 private _multiplier;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _multiplier = 1e18;
    }

    function multiplier() external view returns (uint256) {
        return _multiplier;
    }

    function setMultiplier(uint256 newMultiplier) external {
        _multiplier = newMultiplier;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
