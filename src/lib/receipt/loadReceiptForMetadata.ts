/**
 * Server-side receipt loader for metadata generation (Epic 6, Task 8).
 *
 * Reads a transaction receipt from the chain, decodes it via
 * `decodeRouterReceipt`, reverse-maps the decoded `org` address to a campaign
 * name, and returns a small typed shape for `generateMetadata` and
 * `opengraph-image` to consume. All I/O failures return `null` — never throws
 * into the page.
 *
 * This is deliberately minimal: it does not run the full `verifyDonation`
 * pipeline and does not call the live Endaoment API. Snapshot + on-chain data.
 */

import {
  toEventSelector,
  type Address,
  type Log,
} from "viem";

import { CAMPAIGNS } from "@/lib/campaigns";
import {
  getRouterAddress,
  decodeDonationRoutedLog,
  DONATION_ROUTED_EVENT,
} from "@/lib/contracts";
import { getPublicClient } from "@/lib/publicClient";
import { getOrgAddress, ENDAOMENT_ORG_ADDRESSES } from "@/lib/endaoment/orgs";
import { decodeRouterReceipt } from "@/lib/receipt/decodeReceipt";
import type { OrgAddressMap } from "@/lib/endaoment/orgs";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

/**
 * The small shape that `generateMetadata` and `opengraph-image` need.
 * `verified` reflects whether `decodeRouterReceipt` returned `ok: true`.
 */
export interface ReceiptMetadata {
  /** Human-readable charity name from the campaign registry. */
  charityName: string;
  /** Net-to-entity USDC amount, formatted as a decimal string (6 d.p.). */
  amountUsdc: string;
  /** `true` when the receipt decoded cleanly against the router. */
  verified: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DONATION_ROUTED_TOPIC = toEventSelector(
  DONATION_ROUTED_EVENT,
) as `0x${string}`;

/**
 * Formats a USDC base-unit `bigint` as a decimal string with 6 decimal places.
 * e.g. `975_150n` → `"0.975150"`.
 */
function formatUsdc(amount: bigint): string {
  return (Number(amount) / 1_000_000).toFixed(6);
}

/** True when `log` is a DonationRouted event (matches by topic-0). */
function isDonationRoutedLog(log: Log): boolean {
  return (
    Array.isArray(log.topics) &&
    log.topics.length > 0 &&
    typeof log.topics[0] === "string" &&
    (log.topics[0] as string).toLowerCase() ===
      DONATION_ROUTED_TOPIC.toLowerCase()
  );
}

/**
 * Reverse-maps an on-chain org `Address` to a campaign name by scanning all
 * known campaigns and checking whether their configured EIN maps to `orgAddress`
 * on `chainId`.
 *
 * Injectable `map` argument mirrors `getCharity`'s signature so tests can
 * exercise the lookup without touching the sparse production map.
 */
function findCharityNameByOrgAddress(
  orgAddress: Address,
  chainId: number,
  map: OrgAddressMap,
): string | null {
  const orgLower = orgAddress.toLowerCase();

  for (const campaign of CAMPAIGNS) {
    const resolved = getOrgAddress(campaign.ein, chainId, map);
    if (resolved && resolved.toLowerCase() === orgLower) {
      return campaign.name;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads and decodes a donation receipt server-side, returning the minimal
 * shape needed for OG metadata generation.
 *
 * @param txid    Transaction hash (hex string).
 * @param chainId Active chain id — required. Callers must resolve this from
 *                `NEXT_PUBLIC_CHAIN` (e.g. `process.env.NEXT_PUBLIC_CHAIN === "base"
 *                ? base.id : baseSepolia.id`). Throws if not a finite number so
 *                misconfigured deployments fail loudly instead of silently reading
 *                the wrong network.
 * @param map     Org-address map (injectable for tests). Defaults to the
 *                production map (intentionally sparse until E5.1 lands).
 * @returns `ReceiptMetadata` on success, `null` on any failure.
 * @throws When `chainId` is not a finite number (misconfigured deployment guard).
 */
export async function loadReceiptForMetadata(
  txid: `0x${string}`,
  chainId: number,
  map: OrgAddressMap = ENDAOMENT_ORG_ADDRESSES,
): Promise<ReceiptMetadata | null> {
  if (typeof chainId !== "number" || !Number.isFinite(chainId)) {
    throw new Error(
      `loadReceiptForMetadata: chainId is required and must be a finite number, got ${String(chainId)}`,
    );
  }
  try {
    // --- 1. Resolve router address (fails fast if not configured) -----------
    const routerAddress = getRouterAddress(chainId);
    if (!routerAddress) return null;

    // --- 2. Fetch the transaction receipt -----------------------------------
    const client = getPublicClient(chainId);
    const receipt = await client.getTransactionReceipt({ hash: txid });

    // --- 3. Peek the DonationRouted log to learn the org address -----------
    //
    // `decodeRouterReceipt` needs the org address to classify the
    // "router → org" Transfer leg. We extract it from the DonationRouted event
    // first so we can then run the full decode with the real address.
    const routedLog = receipt.logs.find(isDonationRoutedLog);
    if (!routedLog) return null;

    let orgAddress: Address;
    try {
      const event = decodeDonationRoutedLog(routedLog);
      orgAddress = event.org;
    } catch {
      return null;
    }

    // --- 4. Full decode with the known org address --------------------------
    const decoded = decodeRouterReceipt(receipt, routerAddress, orgAddress);
    if (!decoded.ok) return null;

    // --- 5. Reverse-map org address to charity name -------------------------
    const charityName = findCharityNameByOrgAddress(orgAddress, chainId, map);
    if (!charityName) return null;

    // --- 6. Format the amount -----------------------------------------------
    const amountUsdc = formatUsdc(decoded.netToEntity);

    return { charityName, amountUsdc, verified: true };
  } catch {
    return null;
  }
}
