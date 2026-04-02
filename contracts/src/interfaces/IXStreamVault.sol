// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IXStreamVault {
    function dxToXStock(address dxToken) external view returns (address xStock);

    function claimDividend(address xStock) external returns (uint256 claimed);

    function syncDividend(address xStock) external returns (uint256 delta);

    function onDxTransfer(
        address xStock,
        address from,
        uint256 fromBalanceBefore,
        address to,
        uint256 toBalanceBefore,
        uint256 amount
    ) external;
}
