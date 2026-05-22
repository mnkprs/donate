import type { Address } from "viem";

/**
 * Type contracts for Epic 5 — Endaoment integration (issue #6).
 *
 * `Charity` is the join view the receipt route consumes: campaign presentation
 * (id, name, ein) plus the chain-specific Endaoment org address and its
 * explorer link. `endaomentOrgAddress` is nullable because an org may not have
 * an Entity deployed on every chain (notably Base Sepolia) — callers render the
 * charity name and fall back to an unverified state rather than crashing.
 */
export interface Charity {
  /** Campaign slug, e.g. "pcrf". */
  id: string;
  /** Public-facing charity legal name. */
  name: string;
  /** US IRS Employer Identification Number, format "NN-NNNNNNN". */
  ein: string;
  /** Endaoment org Entity address on the active chain, or null if none. */
  endaomentOrgAddress: Address | null;
  /** BaseScan address link for `endaomentOrgAddress`, or null when unset. */
  baseScanUrl: string | null;
}

/**
 * Vetted, chain-agnostic org metadata. Sourced from Endaoment's REST API at
 * runtime (Task 2) with a committed snapshot fallback (Task 3). The metadata
 * itself does not vary per chain; only the org *address* does (see `Charity`).
 */
export interface EndaomentOrgMetadata {
  /** Org legal name. */
  name: string;
  /** EIN — the chain-agnostic key this metadata is stored under. */
  ein: string;
  /** One-paragraph mission/description. */
  mission: string;
  /** Logo URL, or null when the org has none. */
  logoUrl: string | null;
  /** Mainnet (Base) org Entity address recorded with the snapshot. */
  mainnetAddress: Address;
  /** ISO-8601 timestamp the snapshot row was captured, e.g. "2026-05-22". */
  capturedAt: string;
}

/** Why an on-chain verification did not succeed (Task 4). */
export type VerificationFailureReason =
  /** No `DonationRouted` log found in the receipt. */
  | "no-routed-log"
  /** `DonationRouted.org` did not match the charity's configured address. */
  | "org-mismatch"
  /** No ERC20 `Transfer(_, org, net)` log accompanied the routed event. */
  | "missing-transfer"
  /** The charity has no configured org address on the active chain. */
  | "no-org-address-for-chain";

/**
 * Result of verifying a donation transaction against a charity (Task 4).
 *
 * Discriminated on `verified` so callers must handle the failure reason before
 * reaching the on-chain amounts — a verified result always carries the org and
 * the gross/fee/net the contract emitted, in USDC base units.
 */
export type VerificationResult =
  | {
      verified: true;
      org: Address;
      gross: bigint;
      fee: bigint;
      net: bigint;
    }
  | {
      verified: false;
      reason: VerificationFailureReason;
    };
