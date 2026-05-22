// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IEndaomentEntity} from "../../src/interfaces/IEndaomentEntity.sol";

/// @title MockEndaomentOrg
/// @notice Test double for an Endaoment org Entity. Implements the router's
///         single forwarding seam, `IEndaomentEntity.donate`.
/// @dev Test-only. Mirrors the real pull model: `donate` pulls `amount` of the
///      base token from `msg.sender` (the router) via `transferFrom`, which is
///      why the router must approve this contract first. Pulling exactly
///      `amount` is also what drains the router's allowance back to zero — the
///      "no leftover allowance" invariant depends on this honest behavior.
contract MockEndaomentOrg is IEndaomentEntity {
    IERC20 public immutable token;

    /// @notice Cumulative base-token amount this org has received via `donate`.
    uint256 public totalReceived;

    constructor(IERC20 _token) {
        token = _token;
    }

    /// @inheritdoc IEndaomentEntity
    function donate(uint256 amount) external override {
        // Raw transferFrom is safe here: this mock is only ever paired with the
        // OZ-based MockERC20, which reverts on failure rather than returning
        // false, so the pull can never silently no-op. Fork tests hit real USDC
        // (also revert-on-failure). Do not copy this into a context where the
        // token might return false instead of reverting.
        token.transferFrom(msg.sender, address(this), amount);
        totalReceived += amount;
    }
}
