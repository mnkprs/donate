/**
 * Pure receipt decoder for the TransparentDonationRouter (Epic 6, Task 1).
 *
 * `decodeRouterReceipt` classifies the ERC20 Transfer logs in a transaction
 * receipt into the four donation legs and cross-checks them against the
 * on-chain `DonationRouted` event. No I/O — accepts a receipt + two addresses,
 * returns a discriminated result.
 *
 * Classification logic (mirrors contracts/src/TransparentDonationRouter.sol):
 *   1. donor → router               (gross in)
 *   2. router → Eudaimonia treasury (1% platform fee = event.fee)
 *   3. router → Endaoment treasury  (protocol fee skim, possibly absent — R5)
 *   4. router → org                 (remainder = netToEntity)
 *
 * The function identifies transfers by (from, to) against `routerAddress` and
 * `orgAddress` only. It never relies on token addresses or treasury addresses,
 * matching the plan's constraint that treasury addresses are NOT passed in.
 */

import {
  decodeEventLog,
  parseAbiItem,
  toEventSelector,
  type Address,
  type Log,
} from "viem";

import {
  decodeDonationRoutedLog,
  DONATION_ROUTED_EVENT,
  type DonationRoutedArgs,
} from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

/** All parsed amounts and parties when decoding succeeds. */
export interface DecodeReceiptSuccess {
  ok: true;
  /** Total USDC pulled from the donor (matches DonationRouted.gross). */
  gross: bigint;
  /** Eudaimonia 1% platform fee (matches DonationRouted.fee). */
  eudaimoniaFee: bigint;
  /** Endaoment protocol fee skim. 0n when the entity takes no fee (R5). */
  endaomentFee: bigint;
  /** Net USDC that arrived at the org entity. */
  netToEntity: bigint;
  /** Donor EOA (from the DonationRouted event). */
  donor: Address;
  /** Org entity address (from the DonationRouted event). */
  org: Address;
}

/** Returned when the receipt cannot be reconciled. */
export interface DecodeReceiptFailure {
  ok: false;
  /**
   * - `'wrong-router'`  — the DonationRouted log was emitted by a contract
   *   other than `routerAddress`. Could be a spoofed receipt or wrong network.
   * - `'missing-legs'`  — a required Transfer leg is absent, amounts don't
   *   reconcile against the DonationRouted event, or the event itself is absent.
   */
  reason: "wrong-router" | "missing-legs";
}

export type DecodeReceiptResult = DecodeReceiptSuccess | DecodeReceiptFailure;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Minimal receipt shape the decoder reads. Accepts viem's TransactionReceipt. */
interface ReceiptLike {
  logs: readonly Log[];
}

const TRANSFER_EVENT_ABI = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const TRANSFER_TOPIC = toEventSelector(TRANSFER_EVENT_ABI) as `0x${string}`;

const DONATION_ROUTED_TOPIC = toEventSelector(
  DONATION_ROUTED_EVENT,
) as `0x${string}`;

/** Normalise a topic/address to lower-case for comparison. */
const lower = (s: string): string => s.toLowerCase();

/** True when this log is an ERC20 Transfer event. */
function isTransferLog(log: Log): boolean {
  return (
    Array.isArray(log.topics) &&
    log.topics.length > 0 &&
    typeof log.topics[0] === "string" &&
    lower(log.topics[0] as string) === lower(TRANSFER_TOPIC)
  );
}

/** True when this log is a DonationRouted event (by topic-0 only). */
function isDonationRoutedLog(log: Log): boolean {
  return (
    Array.isArray(log.topics) &&
    log.topics.length > 0 &&
    typeof log.topics[0] === "string" &&
    lower(log.topics[0] as string) === lower(DONATION_ROUTED_TOPIC)
  );
}

interface TransferArgs {
  from: Address;
  to: Address;
  value: bigint;
}

/** Decode a Transfer log into its from/to/value. Returns null on failure. */
function decodeTransfer(log: Log): TransferArgs | null {
  try {
    const { args } = decodeEventLog({
      abi: [TRANSFER_EVENT_ABI],
      eventName: "Transfer",
      topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      data: log.data,
      strict: true,
    });
    return { from: args.from, to: args.to, value: args.value };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decodes a router transaction receipt into its four donation legs.
 *
 * @param receipt      The viem transaction receipt (or compatible shape).
 * @param routerAddress The deployed `TransparentDonationRouter` address.
 * @param orgAddress   The target Endaoment org Entity address.
 * @returns A discriminated result — success with amounts, or failure with reason.
 */
export function decodeRouterReceipt(
  receipt: ReceiptLike,
  routerAddress: Address,
  orgAddress: Address,
): DecodeReceiptResult {
  const routerLower = lower(routerAddress);
  const orgLower = lower(orgAddress);

  // --- Step 1: Find and validate the DonationRouted event -------------------

  const routedLog = receipt.logs.find(isDonationRoutedLog);

  if (!routedLog) {
    return { ok: false, reason: "missing-legs" };
  }

  // The log must have been emitted by the expected router contract.
  if (lower(routedLog.address) !== routerLower) {
    return { ok: false, reason: "wrong-router" };
  }

  let event: DonationRoutedArgs;
  try {
    event = decodeDonationRoutedLog(routedLog);
  } catch {
    return { ok: false, reason: "missing-legs" };
  }

  const { donor, org, gross: eventGross, fee: eventFee, net: eventNet } = event;

  // --- Step 2: Collect and classify Transfer logs ---------------------------

  const transfers: TransferArgs[] = [];
  for (const log of receipt.logs) {
    if (!isTransferLog(log)) continue;
    const decoded = decodeTransfer(log);
    if (decoded) transfers.push(decoded);
  }

  // donor → router
  const grossTransfer = transfers.find(
    (t) => lower(t.from) === lower(donor) && lower(t.to) === routerLower,
  );

  if (!grossTransfer) {
    return { ok: false, reason: "missing-legs" };
  }

  // Verify gross matches the event
  if (grossTransfer.value !== eventGross) {
    return { ok: false, reason: "missing-legs" };
  }

  // router → org  (final settled amount)
  const orgTransfer = transfers.find(
    (t) => lower(t.from) === routerLower && lower(t.to) === orgLower,
  );

  if (!orgTransfer) {
    return { ok: false, reason: "missing-legs" };
  }

  // Eudaimonia fee: router-out transfer whose value === event.fee
  // (by definition of how the router is coded; event.fee IS the platform fee)
  const eudaimoniaTransfer = transfers.find(
    (t) =>
      lower(t.from) === routerLower &&
      lower(t.to) !== orgLower &&
      t.value === eventFee,
  );

  if (!eudaimoniaTransfer) {
    return { ok: false, reason: "missing-legs" };
  }

  // Endaoment treasury skim: any remaining router-out transfer
  // (not the org transfer, not the eudaimonia-fee transfer)
  const endaomentTransfer = transfers.find(
    (t) =>
      lower(t.from) === routerLower &&
      lower(t.to) !== orgLower &&
      t !== eudaimoniaTransfer,
  );

  const endaomentFee = endaomentTransfer?.value ?? 0n;
  const netToEntity = orgTransfer.value;

  // --- Step 3: Reconcile totals against the event ---------------------------

  // Net-side: the Endaoment skim plus what reached the org must equal event.net.
  if (endaomentFee + netToEntity !== eventNet) {
    return { ok: false, reason: "missing-legs" };
  }

  // Gross-side (M4): the FULL split must reconcile against gross. Because the
  // leg classifier excludes the platform-fee leg by matching transfer VALUE
  // against event.fee, a misclassification (or a corrupt event) could leave the
  // net side reconciling while the gross side does not. Enforce the complete
  // invariant so any such case fails loudly instead of returning a wrong
  // breakdown:  eudaimoniaFee(=event.fee) + endaomentFee + netToEntity === gross.
  if (eventFee + endaomentFee + netToEntity !== eventGross) {
    return { ok: false, reason: "missing-legs" };
  }

  return {
    ok: true,
    gross: eventGross,
    eudaimoniaFee: eventFee,
    endaomentFee,
    netToEntity,
    donor,
    org,
  };
}

