// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IEndaomentEntity
/// @notice Minimal interface for an Endaoment Org/Fund Entity on Base.
/// @dev The router approves `amount` of the base token (USDC) to the entity,
///      then calls `donate` so Endaoment's own fee + accounting run on-chain.
///      Confirm the exact signature against the real ABI when Epic 5 lands;
///      this interface is the single seam to adjust if it differs.
interface IEndaomentEntity {
    /// @notice Pulls `amount` of the entity's base token from the caller and
    ///         credits it as a donation to this entity.
    /// @param amount Base-token (USDC) amount to donate, in token decimals.
    function donate(uint256 amount) external;
}
