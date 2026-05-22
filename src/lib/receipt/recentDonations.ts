/**
 * Recent on-chain donations loader for the landing-page "Live receipts" strip.
 *
 * `fetchRecentDonations` reads `DonationRouted` logs emitted by the deployed
 * `TransparentDonationRouter` over a bounded recent block window, decodes them
 * through the strict shared decoder, and shapes them into display-ready rows.
 *
 * Honesty contract: every value shown is taken directly from an on-chain log.
 * There is no fixture, placeholder, or fabricated row — when nothing can be
 * read, callers receive an empty array (or a thrown error) and surface an
 * explicit "Receipts unavailable" state rather than inventing data.
 *
 * No React, no client construction here — the caller injects a minimal
 * {@link RecentDonationsClient}. This mirrors `runReceiptResolver`: the I/O is
 * pushed to the edge so the decode/sort/format logic stays pure and testable.
 */

import { type Address, type Hex } from "viem";

import { DONATION_ROUTED_EVENT, decodeDonationRoutedLog } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Tuning constants (named — no magic numbers)
// ---------------------------------------------------------------------------

/**
 * How many blocks back to scan for recent donations. Kept modest because public
 * Base RPCs cap `eth_getLogs` ranges; ~2000 blocks ≈ the last hour on Base L2
 * (~2s blocks) and stays well inside free-tier limits.
 */
export const DEFAULT_LOOKBACK_BLOCKS = 2_000n;

/** Default number of rows the strip renders. */
export const DEFAULT_RECENT_LIMIT = 6;

/** USDC has 6 decimals on Base. */
const USDC_DECIMALS = 6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The subset of a viem `Log` this loader reads. A full viem `Log` is a
 * structural superset, so a real `PublicClient` result is assignable to a
 * `readonly OnChainLog[]` after the loader's own narrowing.
 */
export interface OnChainLog {
  topics: [Hex, ...Hex[]] | [];
  data: Hex;
  /** `null` while the log's block is still pending. */
  blockNumber: bigint | null;
  /** `null` while pending; used as the within-block ordering tiebreak. */
  logIndex: number | null;
  /** `null` while pending. */
  transactionHash: Hex | null;
}

/** Minimal client surface the loader needs — satisfied by a viem `PublicClient`. */
export interface RecentDonationsClient {
  getBlockNumber: () => Promise<bigint>;
  getLogs: (args: {
    address: Address;
    event: typeof DONATION_ROUTED_EVENT;
    fromBlock: bigint;
    toBlock: bigint | "latest";
  }) => Promise<readonly OnChainLog[]>;
}

/** A single display-ready donation row. Every field derives from on-chain data. */
export interface RecentDonation {
  /** Full transaction hash. */
  txid: Hex;
  /** Truncated tx hash for display, e.g. "0xaaaa…aaaa". */
  txidShort: string;
  /** Truncated donor address, e.g. "0x1111…1111". */
  donorShort: string;
  /** Truncated org Entity address, e.g. "0x2222…2222". */
  orgShort: string;
  /** Gross USDC pulled from the donor, dollars + cents, e.g. "50.00". */
  grossUsdc: string;
  /** Net USDC delivered to the org, dollars + cents, e.g. "49.50". */
  netUsdc: string;
  /** Block the donation settled in. */
  blockNumber: bigint;
}

export interface FetchRecentDonationsOptions {
  /** Deployed router address whose `DonationRouted` logs are read. */
  routerAddress: Address;
  /** Max rows to return (newest first). Defaults to {@link DEFAULT_RECENT_LIMIT}. */
  limit?: number;
  /** Block lookback window. Defaults to {@link DEFAULT_LOOKBACK_BLOCKS}. */
  lookbackBlocks?: bigint;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Formats USDC base units as dollars + cents with thousands separators,
 * e.g. `49_500_000n → "49.50"`, `1_234_567_890n → "1,234.57"`.
 *
 * Rounds half-up to the nearest cent on the integer base units (never via
 * floats) so display rounding can never misstate the on-chain amount through
 * binary-fraction error.
 */
function formatUsdcDollars(baseUnits: bigint): string {
  // 6 decimals → cents are hundredths, i.e. divide by 10^(6-2) = 10_000.
  const perCent = 10n ** BigInt(USDC_DECIMALS - 2);
  const cents = (baseUnits + perCent / 2n) / perCent; // round half-up
  const dollars = cents / 100n;
  const remainder = cents % 100n;
  const dollarsStr = new Intl.NumberFormat("en-US").format(dollars);
  return `${dollarsStr}.${remainder.toString().padStart(2, "0")}`;
}

/** Truncates an address or hash to "0x1234…cdef" (first 6 + last 4). */
function truncateHex(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Internal: decode + narrow a single log
// ---------------------------------------------------------------------------

interface RankedDonation {
  donation: RecentDonation;
  blockNumber: bigint;
  logIndex: number;
}

/**
 * Decodes one log into a ranked donation, or `null` when it cannot be shown
 * honestly: still pending (no block/hash) or not a decodable DonationRouted log.
 */
function toRankedDonation(log: OnChainLog): RankedDonation | null {
  // A log without a confirmed block or tx hash is still pending — skip it
  // rather than render a row that can't be linked or ordered.
  if (log.blockNumber === null || log.transactionHash === null) return null;

  let args;
  try {
    args = decodeDonationRoutedLog({ topics: log.topics, data: log.data });
  } catch {
    // Address+event filtering should make this unreachable, but a foreign or
    // corrupt log must never become a fabricated-looking row.
    return null;
  }

  return {
    blockNumber: log.blockNumber,
    logIndex: log.logIndex ?? 0,
    donation: {
      txid: log.transactionHash,
      txidShort: truncateHex(log.transactionHash),
      donorShort: truncateHex(args.donor),
      orgShort: truncateHex(args.org),
      grossUsdc: formatUsdcDollars(args.gross),
      netUsdc: formatUsdcDollars(args.net),
      blockNumber: log.blockNumber,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads the most recent donations routed through `routerAddress`.
 *
 * @param client A minimal block/log reader (a viem `PublicClient` satisfies it).
 * @param options Router address plus optional `limit` / `lookbackBlocks`.
 * @returns Display-ready rows, newest first, at most `limit`. Empty when the
 *   window holds no donations.
 * @throws Whatever the client throws (e.g. an RPC range error) — the caller is
 *   expected to map a rejection to an explicit "Receipts unavailable" state.
 */
export async function fetchRecentDonations(
  client: RecentDonationsClient,
  options: FetchRecentDonationsOptions,
): Promise<RecentDonation[]> {
  const limit = options.limit ?? DEFAULT_RECENT_LIMIT;
  const lookback = options.lookbackBlocks ?? DEFAULT_LOOKBACK_BLOCKS;

  const latest = await client.getBlockNumber();
  const fromBlock = latest > lookback ? latest - lookback : 0n;

  const logs = await client.getLogs({
    address: options.routerAddress,
    event: DONATION_ROUTED_EVENT,
    fromBlock,
    toBlock: "latest",
  });

  const ranked: RankedDonation[] = [];
  for (const log of logs) {
    const entry = toRankedDonation(log);
    if (entry) ranked.push(entry);
  }

  // Newest first: higher block wins; within a block, higher logIndex wins.
  ranked.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber > b.blockNumber ? -1 : 1;
    }
    return b.logIndex - a.logIndex;
  });

  return ranked.slice(0, limit).map((r) => r.donation);
}
