import { isAddress, type Address } from "viem";
import { baseSepolia } from "wagmi/chains";

import type { RouterChainId } from "@/lib/contracts";

/**
 * Per-chain Endaoment org Entity addresses, keyed by EIN then chain id.
 *
 * EIN-first keying colocates "this org across chains", mirroring the
 * EIN-keyed metadata snapshot (Task 3): the absence of an Entity on a given
 * chain is simply a missing chain key, not a special case. The org *address*
 * is the only thing that varies per chain - name/mission/logo do not.
 */
export type OrgAddressMap = Readonly<
  Record<string, Partial<Record<RouterChainId, Address>>>
>;

/**
 * Production address map.
 *
 * Base Sepolia entries are the CREATE2-predicted Org Entity addresses
 * returned by Endaoment's dev/sandbox registry
 * (`https://api.dev.endaoment.org/v2/orgs/search`, `deployments[chainId=84532]`)
 * - sourced by running `node scripts/fetch-endaoment-orgs.mjs`.
 *
 * These addresses are canonical even though the underlying contracts report
 * `isDeployed: false`: Endaoment lazy-deploys an Entity on first interaction,
 * and the CREATE2 address is deterministic from the EIN. Routing test USDC
 * to them is safe - the destination is locked in by Endaoment's factory
 * regardless of deployment status.
 *
 * Base mainnet addresses are intentionally absent: the dev registry does not
 * publish mainnet entities for these EINs, and we do NOT ship fabricated or
 * zero-address placeholders - a missing entry resolves to `undefined` in
 * `getOrgAddress`, which the receipt route renders as an explicit unverified
 * state. Production mainnet entries land here once sourced from
 * `https://api.endaoment.org` and recorded in `snapshot.json`'s
 * `mainnetAddress` field.
 */
export const ENDAOMENT_ORG_ADDRESSES: OrgAddressMap = {
  // Palestine Children's Relief Fund
  "93-1057665": {
    [baseSepolia.id]: "0xdfbab36381668f800a7b2d5aba796e7f5dac379a",
  },
  // World Central Kitchen
  "27-3521132": {
    [baseSepolia.id]: "0x717242399bedd15ee647914f19b97f6a68deabdd",
  },
  // Direct Relief
  "95-1831116": {
    [baseSepolia.id]: "0xa179ef299b61d51807b6e826ee9e0ce94deb8c13",
  },
};

/**
 * Resolves the Endaoment org Entity address for an EIN on a given chain.
 *
 * Returns `undefined` for an unknown EIN, a chain with no configured Entity,
 * an unsupported chain id, or a malformed configured value - a typo'd address
 * is treated as "not configured" so a bad ops value degrades gracefully rather
 * than surfacing an invalid on-chain target.
 *
 * @param ein Charity EIN, format "NN-NNNNNNN".
 * @param chainId Active chain id (e.g. from wagmi's `useChainId`).
 * @param map Address map to read; defaults to the production map. Injectable
 *   so tests exercise the join without depending on the sparse production data.
 */
export function getOrgAddress(
  ein: string,
  chainId: number,
  map: OrgAddressMap = ENDAOMENT_ORG_ADDRESSES,
): Address | undefined {
  const byChain = map[ein];
  if (!byChain) return undefined;

  const candidate = byChain[chainId as RouterChainId];
  if (!candidate || !isAddress(candidate)) return undefined;

  return candidate;
}
