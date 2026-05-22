import { base, baseSepolia } from "wagmi/chains";

import type { Hex } from "@/types/receipt";

/**
 * Per-chain BaseScan origin URL, mirroring the `BASESCAN_BASE_URL` map in
 * `src/lib/endaoment/registry.ts`. Maintained here as a separate constant so
 * `explorer.ts` has no dependency on the Endaoment registry layer.
 */
const BASESCAN_ORIGIN: Record<number, string> = {
  [base.id]: "https://basescan.org",
  [baseSepolia.id]: "https://sepolia.basescan.org",
};

/**
 * Returns the BaseScan origin for `chainId`, falling back to the Base mainnet
 * origin for any unrecognised chain — consistent with `deriveBaseScanUrl` in
 * `src/lib/endaoment/registry.ts`, which applies the same fallback.
 */
function getOrigin(chainId: number): string {
  return BASESCAN_ORIGIN[chainId] ?? BASESCAN_ORIGIN[base.id];
}

/**
 * Builds a BaseScan transaction URL for a given txid and chain.
 *
 * Falls back to the Base mainnet URL for unrecognised chain ids (matches the
 * `deriveBaseScanUrl` convention in `src/lib/endaoment/registry.ts`).
 *
 * @param txid  Full transaction hash.
 * @param chainId  Active chain id (e.g. `base.id` or `baseSepolia.id`).
 * @returns  `https://<origin>/tx/<txid>`
 */
export function deriveTxUrl(txid: Hex, chainId: number): string {
  return `${getOrigin(chainId)}/tx/${txid}`;
}

/**
 * Builds a BaseScan transaction URL that deep-links to the event log tab.
 *
 * BaseScan surfaces logs on the transaction page via the `#eventlog` fragment —
 * a tab anchor, not a per-log selector. `logIndex` is accepted for caller
 * ergonomics (e.g. passing a stage's log index without a wrapper), but does
 * not change the returned URL.
 *
 * Falls back to Base mainnet for unrecognised chain ids.
 *
 * @param txid      Full transaction hash.
 * @param chainId   Active chain id.
 * @param logIndex  Optional log index (ignored in URL construction).
 * @returns  `https://<origin>/tx/<txid>#eventlog`
 */
export function deriveLogUrl(
  txid: Hex,
  chainId: number,
  logIndex?: number,
): string {
  void logIndex; // accepted for ergonomics; #eventlog is a tab, not per-log
  return `${deriveTxUrl(txid, chainId)}#eventlog`;
}
