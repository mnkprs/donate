// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IEndaomentEntity} from "../../src/interfaces/IEndaomentEntity.sol";
import {TransparentDonationRouter} from "../../src/TransparentDonationRouter.sol";

/// @title MockReentrantOrg
/// @notice Malicious test double that attempts to re-enter the router during
///         its `donate()` callback, proving the `nonReentrant` guard holds.
/// @dev Test-only. The router approves this contract and then calls `donate`
///      from inside its own `nonReentrant` body; this mock immediately calls
///      back into `router.donate()`, which must revert at the guard.
contract MockReentrantOrg is IEndaomentEntity {
    TransparentDonationRouter public immutable router;

    constructor(TransparentDonationRouter _router) {
        router = _router;
    }

    /// @inheritdoc IEndaomentEntity
    /// @dev Re-enters the router as the very first statement: `nonReentrant`
    ///      runs at function entry (before any checks), so the re-entrant call
    ///      reverts on the guard, not on a downstream allowance/balance error.
    ///      Args are deliberately minimal-but-valid (`address(this)`, `1`) — the
    ///      guard fires before they are ever inspected. The bubbled-up revert
    ///      aborts the outer donation.
    function donate(uint256) external override {
        router.donate(address(this), 1);
    }
}
