// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {TransparentDonationRouter} from "../src/TransparentDonationRouter.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockEndaomentOrg} from "./mocks/MockEndaomentOrg.sol";
import {MockReentrantOrg} from "./mocks/MockReentrantOrg.sol";

/// @title TransparentDonationRouter unit suite
/// @notice Tasks 1–3 — constructor & immutables, fee math, donate happy-path.
///         Later tasks (guards/reverts, fork) append here.
contract TransparentDonationRouterTest is Test {
    // Constructor tests (Task 1) only need a non-zero address for `usdc`/
    // `treasury`. Task 3 needs a *real* ERC20 the router can move, so `setUp`
    // deploys a MockERC20 and feeds its address in as the USDC immutable.
    MockERC20 internal token;
    MockEndaomentOrg internal org;
    address internal usdc;
    address internal treasury;
    address internal donor;

    TransparentDonationRouter internal router;

    /// @dev Mirrors the contract's own event so `vm.expectEmit` has a typed
    ///      reference. Must stay byte-identical to the contract declaration.
    event DonationRouted(
        address indexed donor, address indexed org, uint256 gross, uint256 fee, uint256 net
    );

    function setUp() public {
        token = new MockERC20();
        usdc = address(token);
        treasury = makeAddr("treasury");
        donor = makeAddr("donor");
        router = new TransparentDonationRouter(usdc, treasury);
        org = new MockEndaomentOrg(token);
    }

    // --- Task 1: constructor stores immutables --------------------------------

    function test_Constructor_SetsUsdcAndTreasury() public view {
        // address(...) cast lets this assertion survive the GREEN promotion of
        // `usdc` from `address` to `IERC20` without a test edit.
        assertEq(address(router.usdc()), usdc, "usdc not stored");
        assertEq(router.treasury(), treasury, "treasury not stored");
    }

    // --- Task 1: zero-address rejection ---------------------------------------

    function test_Constructor_RevertsOnZeroUsdc() public {
        vm.expectRevert(TransparentDonationRouter.ZeroAddress.selector);
        new TransparentDonationRouter(address(0), treasury);
    }

    function test_Constructor_RevertsOnZeroTreasury() public {
        vm.expectRevert(TransparentDonationRouter.ZeroAddress.selector);
        new TransparentDonationRouter(usdc, address(0));
    }

    // --- Task 1: fee constants ------------------------------------------------

    function test_FeeConstants() public view {
        assertEq(router.FEE_BPS(), 100, "FEE_BPS must be 1%");
        assertEq(router.BPS_DENOMINATOR(), 10_000, "BPS_DENOMINATOR must be 100%");
    }

    // --- Task 2: fee split math (previewSplit) --------------------------------

    /// @notice Canonical case: $100 USDC (6 decimals) splits into $1 fee / $99 net.
    function test_PreviewSplit_OnePercent() public view {
        (uint256 fee, uint256 net) = router.previewSplit(100e6);
        assertEq(fee, 1e6, "fee should be 1% of 100 USDC");
        assertEq(net, 99e6, "net should be remaining 99 USDC");
    }

    /// @notice Integer floor: amounts below 100 base units yield zero fee, so the
    ///         donor's full amount forwards as net (sub-$0.0001 dust keeps 1/99
    ///         conservation: 0 + 99 == 99).
    function test_PreviewSplit_RoundsDown() public view {
        (uint256 fee, uint256 net) = router.previewSplit(99);
        assertEq(fee, 0, "fee floors to zero below 100 units");
        assertEq(net, 99, "net keeps the full amount when fee floors out");
    }

    /// @notice Invariant over the full overflow-safe range: the split is lossless
    ///         (fee + net == amount) and fee matches the exact floor formula.
    /// @dev Upper bound = type(uint256).max / FEE_BPS so `amount * FEE_BPS` cannot
    ///      overflow; beyond that the 0.8.x checked multiply would revert on
    ///      inputs no real USDC supply could reach.
    function testFuzz_PreviewSplit_Conservation(uint256 amount) public view {
        amount = bound(amount, 0, type(uint256).max / router.FEE_BPS());

        (uint256 fee, uint256 net) = router.previewSplit(amount);

        assertEq(fee + net, amount, "split must be lossless");
        assertEq(fee, (amount * 100) / 10_000, "fee must equal exact floor formula");
    }

    // --- Task 3: happy-path donate --------------------------------------------

    uint256 internal constant DONATION = 100e6; // $100 USDC
    uint256 internal constant EXPECTED_FEE = 1e6; // 1% → $1
    uint256 internal constant EXPECTED_NET = 99e6; // 99% → $99

    /// @dev Funds the donor and pre-approves the router for `amount`. The CEI
    ///      flow pulls gross from the donor, so without this the transferFrom
    ///      leg reverts — every happy-path test starts from here.
    function _fundAndApprove(uint256 amount) internal {
        token.mint(donor, amount);
        vm.prank(donor);
        token.approve(address(router), amount);
    }

    function test_Donate_PullsGrossFromDonor() public {
        _fundAndApprove(DONATION);

        vm.prank(donor);
        router.donate(address(org), DONATION);

        assertEq(token.balanceOf(donor), 0, "donor should be debited the full gross");
    }

    function test_Donate_SendsFeeToTreasury() public {
        _fundAndApprove(DONATION);

        vm.prank(donor);
        router.donate(address(org), DONATION);

        assertEq(token.balanceOf(treasury), EXPECTED_FEE, "treasury should receive the 1% fee");
    }

    function test_Donate_ForwardsNetToOrg_ViaDonate() public {
        _fundAndApprove(DONATION);

        vm.prank(donor);
        router.donate(address(org), DONATION);

        // The org records what it pulled through its own donate() — proving the
        // forward ran via the Endaoment seam, not a raw transfer.
        assertEq(org.totalReceived(), EXPECTED_NET, "org should record the net via donate()");
        assertEq(token.balanceOf(address(org)), EXPECTED_NET, "org should hold the net");
    }

    function test_Donate_LeavesNoLeftoverAllowance() public {
        _fundAndApprove(DONATION);

        vm.prank(donor);
        router.donate(address(org), DONATION);

        // Combined invariant: the router approves exactly `net` and the honest
        // mock org pulls exactly `net`, draining the allowance to zero. (A
        // malicious org pulling less would leave dust — a Task 4 concern.)
        assertEq(token.allowance(address(router), address(org)), 0, "no residual approval to org");
        assertEq(token.balanceOf(address(router)), 0, "router should hold no USDC after routing");
    }

    function test_Donate_EmitsDonationRouted() public {
        _fundAndApprove(DONATION);

        // Match both indexed topics (donor, org) and the full data payload
        // (gross, fee, net): expectEmit(checkTopic1, checkTopic2, checkTopic3, checkData).
        vm.expectEmit(true, true, false, true, address(router));
        emit DonationRouted(donor, address(org), DONATION, EXPECTED_FEE, EXPECTED_NET);

        vm.prank(donor);
        router.donate(address(org), DONATION);
    }

    // --- Task 4: guards & reverts ---------------------------------------------

    /// @notice A zero org address is rejected by the `endaomentOrg != 0` check
    ///         before any token movement.
    function test_Donate_RevertsOnZeroOrg() public {
        _fundAndApprove(DONATION);

        vm.expectRevert(TransparentDonationRouter.ZeroAddress.selector);
        vm.prank(donor);
        router.donate(address(0), DONATION);
    }

    /// @notice A zero gross amount is rejected by the `amount > 0` check.
    function test_Donate_RevertsOnZeroAmount() public {
        _fundAndApprove(DONATION);

        vm.expectRevert(TransparentDonationRouter.ZeroAmount.selector);
        vm.prank(donor);
        router.donate(address(org), 0);
    }

    /// @notice With funds but no approval, the `safeTransferFrom` pull reverts.
    ///         OZ's ERC20 surfaces `ERC20InsufficientAllowance`; `expectRevert`
    ///         matches the selector regardless of its args.
    function test_Donate_RevertsWhenNoAllowance() public {
        token.mint(donor, DONATION); // funded but NOT approved

        vm.expectRevert(IERC20Errors.ERC20InsufficientAllowance.selector);
        vm.prank(donor);
        router.donate(address(org), DONATION);
    }

    /// @notice With approval but no balance, the pull reverts on
    ///         `ERC20InsufficientBalance`.
    function test_Donate_RevertsWhenInsufficientBalance() public {
        vm.prank(donor); // approved the router, but donor holds zero USDC
        token.approve(address(router), DONATION);

        vm.expectRevert(IERC20Errors.ERC20InsufficientBalance.selector);
        vm.prank(donor);
        router.donate(address(org), DONATION);
    }

    /// @notice A malicious org that re-enters `router.donate()` during its own
    ///         `donate()` callback is stopped by `nonReentrant`. The reentrant
    ///         call hits the guard at function entry (before any checks), so the
    ///         whole outer tx reverts with `ReentrancyGuardReentrantCall`.
    function test_Donate_NonReentrant() public {
        MockReentrantOrg attacker = new MockReentrantOrg(router);
        _fundAndApprove(DONATION);

        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        vm.prank(donor);
        router.donate(address(attacker), DONATION);
    }
}
