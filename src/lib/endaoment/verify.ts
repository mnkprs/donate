import {
  decodeEventLog,
  getAddress,
  parseAbiItem,
  toEventHash,
  type Address,
  type Hex,
} from "viem";

import {
  DONATION_ROUTED_EVENT,
  decodeDonationRoutedLog,
} from "@/lib/contracts";
import { getPublicClient } from "@/lib/publicClient";
import type { Charity } from "@/types/charity";
import type { VerificationResult } from "@/types/charity";

/**
 * ABI item for the standard ERC20 Transfer event.
 * Used to locate and decode the settlement transfer to the org Entity.
 */
const ERC20_TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

/** topics[0] for `DonationRouted` — pre-computed to avoid per-log recomputation. */
const DONATION_ROUTED_TOPIC = toEventHash(DONATION_ROUTED_EVENT);

/** topics[0] for `Transfer` — pre-computed for the same reason. */
const ERC20_TRANSFER_TOPIC = toEventHash(ERC20_TRANSFER_EVENT);

/**
 * A minimal raw log shape: what we need from a viem `Log` to decode events.
 */
interface RawLog {
  topics: readonly (Hex | null)[];
  data: Hex;
  address: Address;
}

/**
 * Tries to decode a raw log as an ERC20 Transfer, returning `null` on failure.
 * Only attempts decode when `topics[0]` matches the Transfer signature hash to
 * avoid spurious throws on unrelated event types.
 */
function tryDecodeTransfer(
  log: RawLog,
): { from: Address; to: Address; value: bigint } | null {
  if (log.topics[0] !== ERC20_TRANSFER_TOPIC) return null;

  try {
    const { args } = decodeEventLog({
      abi: [ERC20_TRANSFER_EVENT],
      eventName: "Transfer",
      topics: log.topics as [Hex, ...Hex[]],
      data: log.data,
      strict: true,
    });
    return { from: args.from, to: args.to, value: args.value };
  } catch {
    return null;
  }
}

/**
 * Verifies a donation transaction on-chain against a charity.
 *
 * Verification passes (`verified: true`) only when:
 * 1. The receipt contains a `DonationRouted` log whose `org` field equals
 *    `charity.endaomentOrgAddress` (case-insensitive via EIP-55 normalisation).
 * 2. The same receipt contains an ERC20 `Transfer(_, org, net)` where `to` is
 *    the org address and `value` equals the `net` amount from the routed event.
 *
 * Any mismatch returns `{ verified: false, reason }` — it never throws on a
 * mismatch so the receipt UI can always display a result.
 *
 * @param txid The transaction hash to look up.
 * @param charity The donation target — must carry a non-null `endaomentOrgAddress`.
 * @param chainId The chain the transaction was submitted on.
 * @returns A `VerificationResult` — discriminated on `verified`.
 */
export async function verifyDonation(
  txid: Hex,
  charity: Charity,
  chainId: number,
): Promise<VerificationResult> {
  // Guard: chain must have a configured org address.
  if (charity.endaomentOrgAddress === null) {
    return { verified: false, reason: "no-org-address-for-chain" };
  }

  const expectedOrg = getAddress(charity.endaomentOrgAddress);

  const client = getPublicClient(chainId);
  const receipt = await client.getTransactionReceipt({ hash: txid });
  const logs = receipt.logs as RawLog[];

  // --- Step 1: find and decode the DonationRouted log ---
  const routedLog = logs.find(
    (log) => log.topics[0] === DONATION_ROUTED_TOPIC,
  );

  if (!routedLog) {
    return { verified: false, reason: "no-routed-log" };
  }

  // decodeDonationRoutedLog throws on any malformed log — let it propagate as
  // an unexpected error (not a VerificationFailureReason) since a matching
  // topic[0] that fails to decode indicates corrupt data.
  const routedArgs = decodeDonationRoutedLog({
    topics: routedLog.topics,
    data: routedLog.data,
  });

  // --- Step 2: assert org matches ---
  if (getAddress(routedArgs.org) !== expectedOrg) {
    return { verified: false, reason: "org-mismatch" };
  }

  // --- Step 3: assert an ERC20 Transfer(_, org, net) is present ---
  const hasMatchingTransfer = logs.some((log) => {
    const transfer = tryDecodeTransfer(log);
    if (!transfer) return false;
    return (
      getAddress(transfer.to) === expectedOrg &&
      transfer.value === routedArgs.net
    );
  });

  if (!hasMatchingTransfer) {
    return { verified: false, reason: "missing-transfer" };
  }

  // --- Both assertions pass ---
  return {
    verified: true,
    org: routedArgs.org,
    gross: routedArgs.gross,
    fee: routedArgs.fee,
    net: routedArgs.net,
  };
}
