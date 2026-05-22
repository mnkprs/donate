// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEndaomentEntity} from "./interfaces/IEndaomentEntity.sol";

/// @title TransparentDonationRouter
/// @notice Receives USDC, skims a hardcoded 1% platform fee to the treasury,
///         and forwards the remaining 99% to a targeted Endaoment org Entity.
/// @dev Task 1 GREEN: `usdc` and `treasury` are deploy-time `immutable`s,
///      validated against the zero address in the constructor. Values fixed at
///      construction live in runtime bytecode, so reads cost no SLOAD.
///      Task 2 GREEN: `previewSplit` fee math. Task 3 GREEN: `donate` happy
///      path via checks-effects-interactions, guarded by ReentrancyGuard.
///      H1 GREEN: `donate` only forwards to owner-allowlisted orgs, so a
///      legitimate `DonationRouted` log can no longer be emitted for an
///      attacker-controlled org. This adds an `Ownable` curation key the
///      original immutable design omitted (review M4) — the owner MUST be a
///      multisig in production.
contract TransparentDonationRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Thrown when a constructor or `donate` argument that must be a
    ///         real address is the zero address.
    error ZeroAddress();

    /// @notice Thrown when a donation is attempted with a zero gross amount.
    error ZeroAmount();

    /// @notice Thrown when `donate` targets an org the owner has not allowlisted.
    /// @param org The rejected, un-vetted org address.
    error OrgNotAllowed(address org);

    /// @notice USDC token the router pulls from donors. Set once at deploy.
    IERC20 public immutable usdc;

    /// @notice Treasury that receives the 1% platform fee. Set once at deploy.
    address public immutable treasury;

    /// @notice Orgs the owner has vetted as legitimate Endaoment entities.
    ///         `donate` forwards only to orgs mapped `true` here (H1).
    mapping(address => bool) public allowedOrgs;

    /// @notice Platform fee in basis points (1%). Hardcoded, non-mutable.
    uint256 public constant FEE_BPS = 100;

    /// @notice Basis-point denominator (100%).
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Emitted once per routed donation. The off-chain receipt decoder
    ///         (Epic 5) reads this; `gross→routing`, `fee→eudaimonia`,
    ///         `net→settlement`. The tx hash rides on the log itself, so it is
    ///         intentionally not an event arg.
    /// @param donor Address that funded the donation (the caller).
    /// @param org Endaoment org Entity the net was forwarded to.
    /// @param gross Total USDC pulled from the donor.
    /// @param fee Platform fee skimmed to the treasury.
    /// @param net Amount forwarded to `org` via its `donate()`.
    event DonationRouted(address indexed donor, address indexed org, uint256 gross, uint256 fee, uint256 net);

    /// @notice Emitted whenever the owner adds or removes an org from the
    ///         allowlist, giving the curation set a fully on-chain audit trail.
    /// @param org The org whose allowance changed.
    /// @param allowed New state: `true` = donate-eligible, `false` = revoked.
    event OrgAllowanceUpdated(address indexed org, bool allowed);

    /// @param _usdc USDC token address on the target network.
    /// @param _treasury Address that receives the platform fee.
    /// @param _owner Allowlist curation owner; a multisig in production (M4).
    ///        OZ `Ownable` reverts `OwnableInvalidOwner` if this is the zero
    ///        address, so an unownable router can never be deployed.
    constructor(address _usdc, address _treasury, address _owner) Ownable(_owner) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    /// @notice Adds or removes an org from the donate allowlist. Owner-only.
    /// @dev The zero address can never be allowlisted, so the curated set never
    ///      holds a meaningless entry that `donate`'s own zero-check would catch.
    /// @param org Endaoment org Entity to vet (non-zero).
    /// @param allowed `true` to make it donate-eligible, `false` to revoke.
    function setOrgAllowed(address org, bool allowed) external onlyOwner {
        if (org == address(0)) revert ZeroAddress();
        allowedOrgs[org] = allowed;
        emit OrgAllowanceUpdated(org, allowed);
    }

    /// @notice Splits a gross USDC amount into the platform fee and the net
    ///         forwarded to Endaoment, using integer-floor rounding.
    /// @dev `net = amount - fee` (not a second division) makes the split lossless
    ///      by construction: `fee + net == amount` for every input. Any dust the
    ///      floor division truncates from `fee` is retained in `net`.
    /// @param amount Gross USDC (6 decimals) the donor is contributing.
    /// @return fee Platform fee = `amount * FEE_BPS / BPS_DENOMINATOR` (floored).
    /// @return net Remainder forwarded to the org = `amount - fee`.
    function previewSplit(uint256 amount) public pure returns (uint256 fee, uint256 net) {
        fee = (amount * FEE_BPS) / BPS_DENOMINATOR;
        net = amount - fee;
    }

    /// @notice Routes a USDC donation: pulls `amount` from the caller, skims the
    ///         1% platform fee to the treasury, and forwards the net to
    ///         `endaomentOrg` via its `donate()` so Endaoment's own fee and
    ///         accounting run on-chain.
    /// @dev Checks-effects-interactions. The donor must have approved this
    ///      router for at least `amount` of USDC. `forceApprove` resets the
    ///      org's allowance before granting `net`, tolerating tokens that
    ///      require a zero-then-set approval. `nonReentrant` hardens the
    ///      external `donate()` call (Task 4).
    /// @param endaomentOrg Org Entity that receives the net donation.
    /// @param amount Gross USDC (6 decimals) to route.
    function donate(address endaomentOrg, uint256 amount) external nonReentrant {
        // Checks
        if (endaomentOrg == address(0)) revert ZeroAddress();
        // H1: forward only to owner-vetted orgs, before any funds move or the
        // DonationRouted log is emitted — so the event can never legitimize an
        // attacker-controlled recipient. After the zero-address check (a zero
        // org still surfaces ZeroAddress), before the amount check.
        if (!allowedOrgs[endaomentOrg]) revert OrgNotAllowed(endaomentOrg);
        if (amount == 0) revert ZeroAmount();

        // Effects
        (uint256 fee, uint256 net) = previewSplit(amount);

        // Interactions
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.safeTransfer(treasury, fee);
        usdc.forceApprove(endaomentOrg, net);
        IEndaomentEntity(endaomentOrg).donate(net);

        emit DonationRouted(msg.sender, endaomentOrg, amount, fee, net);
    }
}
