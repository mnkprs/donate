// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TransparentDonationRouter} from "../src/TransparentDonationRouter.sol";

/// @title Deploy — TransparentDonationRouter deployment script (Epic 4 Task 6)
/// @notice Deploys the router to a target Base network, reading the USDC token
///         and treasury addresses from the environment so the same script
///         serves Base Sepolia and Base mainnet without edits.
/// @dev Usage (operator action — not run in CI):
///        forge script script/Deploy.s.sol:Deploy \
///          --rpc-url base_sepolia --broadcast --verify
///      with `USDC_ADDRESS`, `TREASURY_ADDRESS`, `PRIVATE_KEY` (or a configured
///      keystore/ledger), and `BASESCAN_API_KEY` set in the environment.
///
///      `run()` is the broadcast entrypoint; `_deploy` is the pure construction
///      seam the test suite calls directly with literal addresses, so the
///      wiring is provable without broadcasting or env gymnastics.
contract Deploy is Script {
    /// @notice Reads deployment params from env, broadcasts the deployment, and
    ///         logs the resulting router address.
    /// @return router The freshly deployed router.
    function run() external returns (TransparentDonationRouter router) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast();
        router = _deploy(usdc, treasury);
        vm.stopBroadcast();

        console2.log("TransparentDonationRouter deployed at:", address(router));
        console2.log("  usdc:    ", address(router.usdc()));
        console2.log("  treasury:", router.treasury());
    }

    /// @notice Constructs the router. Constructor zero-address guards apply, so
    ///         a misconfigured env reverts here rather than deploying a router
    ///         pointed at the zero address.
    /// @param usdc USDC token address on the target network.
    /// @param treasury Address that receives the platform fee.
    /// @return router The deployed router instance.
    function _deploy(address usdc, address treasury)
        public
        returns (TransparentDonationRouter router)
    {
        router = new TransparentDonationRouter(usdc, treasury);
    }
}
