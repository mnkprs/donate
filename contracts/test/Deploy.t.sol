// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../script/Deploy.s.sol";
import {TransparentDonationRouter} from "../src/TransparentDonationRouter.sol";

/// @title Deploy script unit suite (Epic 4 Task 6)
/// @notice Exercises the deploy script's pure construction seam (`_deploy`)
///         without broadcasting. Live deployment is an operator action; here we
///         only prove the script wires constructor args through to the router's
///         immutables and preserves the contract's zero-address guards.
contract DeployTest is Test {
    // Deterministic, non-zero stand-ins. These are not real Base addresses;
    // the script reads the real ones from env at broadcast time.
    address internal constant USDC = address(0xA11CE);
    address internal constant TREASURY = address(0xB0B);

    Deploy internal deployer;

    function setUp() public {
        deployer = new Deploy();
    }

    function test_Deploy_WiresUsdcAndTreasuryIntoRouter() public {
        TransparentDonationRouter router = deployer._deploy(USDC, TREASURY);

        assertEq(address(router.usdc()), USDC, "usdc immutable mismatch");
        assertEq(router.treasury(), TREASURY, "treasury immutable mismatch");
    }

    function test_Deploy_DeploysFreshRouterEachCall() public {
        TransparentDonationRouter a = deployer._deploy(USDC, TREASURY);
        TransparentDonationRouter b = deployer._deploy(USDC, TREASURY);

        assertTrue(address(a) != address(b), "expected distinct deployments");
    }

    function test_Deploy_PropagatesZeroUsdcRevert() public {
        vm.expectRevert(TransparentDonationRouter.ZeroAddress.selector);
        deployer._deploy(address(0), TREASURY);
    }

    function test_Deploy_PropagatesZeroTreasuryRevert() public {
        vm.expectRevert(TransparentDonationRouter.ZeroAddress.selector);
        deployer._deploy(USDC, address(0));
    }
}
