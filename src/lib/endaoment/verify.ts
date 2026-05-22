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
  getRouterAddress,
} from "@/lib/contracts";
import { getPublicClient } from "@/lib/publicClient";
import type { Charity, VerificationResult } from "@/types/charity";

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
 * Extended success result that adds the Endaoment protocol fee to the base
 * `VerificationResult { verified: true }` shape.
 *
 * `endaomentFee` is `0n` when the Entity took no fee on this tx (R5 — some
 * Entities have a zero multiplier, so the `router → Endaoment treasury`
 * transfer is absent).
 *
 * We extend locally rather than widening `VerificationResult` in `charity.ts`
 * so that Epic 5 callers that only consume the base type are unaffected.
 */
export type VerifiedDonation = Extract<VerificationResult, { verified: true }> & {
  endaomentFee: bigint;
};

/**
 * The discriminated result of `verifyDonation`.
 * The `verified: true` branch is widened relative to the base `VerificationResult`
 * to carry `endaomentFee`. Failure branches are unchanged.
 */
export type VerifyDonationResult =
  | VerifiedDonation
  | Extract<VerificationResult, { verified: false }>;

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
 * 1. When the router address is known for `chainId`, the `DonationRouted` log
 *    must be emitted by that router — not a foreign contract (`wrong-router`).
 * 2. The receipt contains a `DonationRouted` log whose `org` field equals
 *    `charity.endaomentOrgAddress` (case-insensitive via EIP-55 normalisation).
 * 3. The ERC20 `Transfer` logs from the router sum to `net`:
 *    - All transfers where `from === routerAddress` are collected.
 *    - The Eudaimonia platform-fee leg is excluded: the single transfer where
 *      `value === routedArgs.fee && to !== expectedOrg`. This is the router →
 *      Eudaimonia treasury transfer (`DonationRouted.fee`).
 *    - The remaining router-out transfers must sum to `routedArgs.net`.
 *    - This accommodates both the legacy single-transfer mock (one Transfer of
 *      `net` to org) and the real two-transfer Endaoment Entity pull model
 *      (router → Endaoment treasury + router → entity, summing to `net`).
 *    - When `routerAddress` is unknown (env unset), falls back to the simple
 *      assertion: a single `Transfer(_, org, net)` must be present.
 *
 * Any mismatch returns `{ verified: false, reason }` — it never throws on a
 * mismatch so the receipt UI can always display a result.
 *
 * @param txid The transaction hash to look up.
 * @param charity The donation target — must carry a non-null `endaomentOrgAddress`.
 * @param chainId The chain the transaction was submitted on.
 * @returns A `VerifyDonationResult` — discriminated on `verified`.
 */
export async function verifyDonation(
  txid: Hex,
  charity: Charity,
  chainId: number,
): Promise<VerifyDonationResult> {
  // Guard: chain must have a configured org address.
  if (charity.endaomentOrgAddress === null) {
    return { verified: false, reason: "no-org-address-for-chain" };
  }

  const expectedOrg = getAddress(charity.endaomentOrgAddress);
  const routerAddress = getRouterAddress(chainId);

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

  // --- Step 2: assert the routed log came from the configured router ---
  // Only enforced when the router address is known for this chain (env may be
  // unset in development/test environments that don't configure a router).
  if (routerAddress !== undefined && getAddress(routedLog.address) !== routerAddress) {
    return { verified: false, reason: "wrong-router" };
  }

  // decodeDonationRoutedLog throws on any malformed log — let it propagate as
  // an unexpected error (not a VerificationFailureReason) since a matching
  // topic[0] that fails to decode indicates corrupt data.
  const routedArgs = decodeDonationRoutedLog({
    topics: routedLog.topics,
    data: routedLog.data,
  });

  // --- Step 3: assert org matches ---
  if (getAddress(routedArgs.org) !== expectedOrg) {
    return { verified: false, reason: "org-mismatch" };
  }

  // --- Step 4: assert router-out transfers sum to net ---
  //
  // Two models must both pass:
  //   (a) Legacy single-transfer mock: one Transfer(router → org, net)
  //   (b) Real Endaoment Entity two-transfer pull:
  //         Transfer(router → Endaoment treasury, endaomentFee)
  //         Transfer(router → entity, net − endaomentFee)
  //       summing to net.
  //
  // In both cases we exclude the Eudaimonia platform-fee leg, identified as a
  // router-out transfer where `value === routedArgs.fee && to !== expectedOrg`.
  // This is safe: the router emits exactly one such transfer per donation.
  // Note: this discriminator could misfire if `routedArgs.fee` happened to equal
  // `endaomentFee` — a pathological edge-case not present in any realistic config.
  let endaomentFee = 0n;

  if (routerAddress !== undefined) {
    // Router address is known — use the precise router-out sum approach.
    const routerOutTransfers = logs
      .map(tryDecodeTransfer)
      .filter(
        (t): t is { from: Address; to: Address; value: bigint } =>
          t !== null && getAddress(t.from) === routerAddress,
      );

    // Exclude the single Eudaimonia fee transfer: router-out where value === fee
    // and to !== expectedOrg (the fee goes to the Eudaimonia treasury, not the org).
    const settlementTransfers = routerOutTransfers.filter(
      (t) => !(t.value === routedArgs.fee && getAddress(t.to) !== expectedOrg),
    );

    const settlementSum = settlementTransfers.reduce(
      (acc, t) => acc + t.value,
      0n,
    );

    if (settlementSum !== routedArgs.net) {
      return { verified: false, reason: "missing-transfer" };
    }

    // endaomentFee: any settlement transfer to an address other than the org.
    // In the two-transfer pull model this is the `router → Endaoment treasury`
    // leg. `0n` when the Entity has no fee (R5).
    endaomentFee = settlementTransfers.reduce(
      (acc, t) => (getAddress(t.to) !== expectedOrg ? acc + t.value : acc),
      0n,
    );
  } else {
    // Router address is unknown — fall back to the simple single-transfer check:
    // a Transfer to the org for exactly net must be present.
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
    // endaomentFee stays 0n — we can't identify it without knowing the router.
  }

  // --- All assertions pass ---
  return {
    verified: true,
    org: routedArgs.org,
    gross: routedArgs.gross,
    fee: routedArgs.fee,
    net: routedArgs.net,
    endaomentFee,
  };
}
