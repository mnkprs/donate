// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IEndaomentEntity
/// @notice Minimal interface for an Endaoment Org/Fund Entity on Base.
/// @dev The router approves `amount` of the base token (USDC) to the entity,
///      then calls `donate` so Endaoment's own fee + accounting run on-chain.
///
///      Signature VERIFIED against primary source (Epic 4 / H2):
///        endaoment/endaoment-contracts-v2, commit 02c7557, src/Entity.sol#L120
///        `function donate(uint256 _amount) external virtual;`
///      `Org` and `Fund` both inherit this from `Entity` with no override, so the
///      `donate(uint256)` selector is correct for every target entity.
///
///      Pull model (Entity._donateWithFeeMultiplier, src/Entity.sol#L156-166):
///      the entity does TWO `safeTransferFrom(msg.sender, …)` calls — Endaoment's
///      own fee → treasury, then the remainder → the entity — both drawing from
///      the SAME allowance and summing to `amount`. The router's single
///      `forceApprove(org, net)` therefore covers both pulls, and Endaoment's fee
///      is taken out of our forwarded `net` on-chain. No `deadline`, token-address,
///      or permit arg exists on this path.
///
///      `baseToken` is registry-driven (not hardcoded), so treat the entity's
///      on-chain `baseToken()` as source of truth; on Base it is canonical USDC
///      (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913). Target entity addresses are
///      created per-org/fund by Endaoment's OrgFundFactory and resolved
///      dynamically — there is no static address to copy.
interface IEndaomentEntity {
    /// @notice Pulls `amount` of the entity's base token from the caller and
    ///         credits it as a donation to this entity.
    /// @param amount Base-token (USDC) amount to donate, in token decimals.
    function donate(uint256 amount) external;
}
