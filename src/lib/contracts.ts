import { isAddress, parseAbiItem, type Address } from "viem";
import { base, baseSepolia } from "wagmi/chains";

/**
 * On-chain contract surface for the TransparentDonationRouter (Epic 4).
 *
 * The router address is resolved from environment variables rather than baked
 * into source: the contract is deployed per-network by an operator (see
 * `contracts/script/Deploy.s.sol`), and the deployed address is wired in via
 * `NEXT_PUBLIC_ROUTER_ADDRESS_*` with no code change — mirroring how
 * `wagmi.ts` reads its RPC URLs from env.
 */

/**
 * The `DonationRouted` event, mirrored from `TransparentDonationRouter.sol`.
 * Epic 5's receipt decoder reads this log: `gross → routing`, `fee →
 * eudaimonia`, `net → settlement`. The signature is asserted against the
 * Solidity event hash in the test suite, so any drift fails the build.
 */
export const DONATION_ROUTED_EVENT = parseAbiItem(
  "event DonationRouted(address indexed donor, address indexed org, uint256 gross, uint256 fee, uint256 net)",
);

/** Chain IDs the router supports. Base mainnet and Base Sepolia only. */
export const ROUTER_SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id] as const;

export type RouterChainId = (typeof ROUTER_SUPPORTED_CHAIN_IDS)[number];

const isSupportedChainId = (chainId: number): chainId is RouterChainId =>
  (ROUTER_SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);

/**
 * Reads the deployed router address env var for a supported chain.
 *
 * Each branch is a direct `process.env.NEXT_PUBLIC_*` property access (never a
 * computed key) so Next.js inlines the value at build time. Reading lazily here
 * — rather than capturing into a module-level constant — keeps the value live
 * for both runtime overrides and test env stubbing.
 */
const readRouterAddressEnv = (chainId: RouterChainId): string | undefined => {
  switch (chainId) {
    case base.id:
      return process.env.NEXT_PUBLIC_ROUTER_ADDRESS_BASE;
    case baseSepolia.id:
      return process.env.NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA;
  }
};

/**
 * Resolves the deployed router address for a chain, or `undefined` when it is
 * not yet deployed/configured.
 *
 * Returns `undefined` for an unsupported chain, an unset env var, or a
 * malformed env value — a typo is treated the same as "not configured" so a
 * bad ops value degrades gracefully instead of surfacing an invalid address.
 *
 * @param chainId The active chain ID (e.g. from wagmi's `useChainId`).
 * @returns The validated router `Address`, or `undefined` if unavailable.
 */
export function getRouterAddress(chainId: number): Address | undefined {
  if (!isSupportedChainId(chainId)) return undefined;

  const candidate = readRouterAddressEnv(chainId);
  if (!candidate || !isAddress(candidate)) return undefined;

  return candidate;
}
