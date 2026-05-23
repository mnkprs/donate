import { base } from "wagmi/chains";

import { LiveReceiptStrip } from "./LiveReceiptStrip";

const MAINNET_CHAIN_ENV = "base" as const;

/**
 * Server gate for the live-receipts strip (issue #27).
 *
 * The strip is only mounted when the deployed chain is Base mainnet. Off
 * mainnet — Base Sepolia, unset env, or any future test network — there is
 * effectively zero donation traffic, so the live read collapses to a
 * perpetual "Receipts unavailable" line. Hiding the strip entirely keeps the
 * landing page honest and avoids shipping the client bundle when it cannot
 * produce real receipts.
 */
export function LiveReceiptStripMount() {
  if (process.env.NEXT_PUBLIC_CHAIN !== MAINNET_CHAIN_ENV) return null;
  return <LiveReceiptStrip chainId={base.id} />;
}
