// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice Mintable 6-decimal USDC stand-in for unit tests.
/// @dev Test-only — never deployed to a real network. The 6-decimal override
///      keeps amounts readable as "100 USDC == 100e6" and mirrors real USDC,
///      so follow-on tests can't silently miscalibrate against an 18-decimal
///      default. `mint` is open (no access control) because only tests call it.
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    /// @inheritdoc ERC20
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mints `amount` tokens to `to`. Test fixtures only.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
