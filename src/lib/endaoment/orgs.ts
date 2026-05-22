import { isAddress, type Address } from "viem";

import type { RouterChainId } from "@/lib/contracts";

/**
 * Per-chain Endaoment org Entity addresses, keyed by EIN then chain id.
 *
 * EIN-first keying colocates "this org across chains", mirroring the
 * EIN-keyed metadata snapshot (Task 3): the absence of an Entity on a given
 * chain is simply a missing chain key, not a special case. The org *address*
 * is the only thing that varies per chain — name/mission/logo do not.
 */
export type OrgAddressMap = Readonly<
  Record<string, Partial<Record<RouterChainId, Address>>>
>;

/**
 * Production address map. Intentionally sparse: real Base / Base Sepolia org
 * Entity addresses for the curated charities (PCRF, WCK, Direct Relief) are
 * not yet confirmed against Endaoment's registry (issue #6, risk table). We do
 * NOT ship fabricated or zero-address placeholders — a missing entry resolves
 * to `null` in `getCharity`, which the receipt route renders as an explicit
 * unverified state. Entries land here once verified addresses are sourced
 * (Task 2/3 wiring confirms them).
 */
export const ENDAOMENT_ORG_ADDRESSES: OrgAddressMap = {};

/**
 * Resolves the Endaoment org Entity address for an EIN on a given chain.
 *
 * Returns `undefined` for an unknown EIN, a chain with no configured Entity,
 * an unsupported chain id, or a malformed configured value — a typo'd address
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
