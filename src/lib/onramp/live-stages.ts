/**
 * In-flight donation tracker model (Epic 5, Screen 1).
 *
 * Pure, framework-free logic for the live 5-stage tracker:
 *   - the stage template (Paid → Converted → Routed → Delivered → Published),
 *   - the donor-facing fee split (1% Eudaimonia + 1.5% Endaoment), and
 *   - the mapping from the backend `OnrampStatus` onto a tracker position.
 *
 * Ported from `designs/design_handoff_in_flight_screens/designs/tracker-live.jsx`.
 *
 * Scope note: the backend `OnrampStatusResponse` (Epic 3) carries only the four
 * domain statuses (created/pending/settled/failed) and `grossCents` — not a
 * per-stage cursor. So amounts are derived from the real gross here, while
 * on-chain timestamps/addresses stay illustrative until the webhook handler
 * records per-stage detail (README "Day 4" / Epic 6). The mapping is therefore
 * deliberately coarse: created/pending → converting, settled → all done.
 */
import type { OnrampStatus } from "@/types/onramp";

export type LiveStageState = "done" | "active" | "queued" | "failed";

export type LiveStageKey =
  | "paid"
  | "converted"
  | "routed"
  | "delivered"
  | "published";

/** Static, copy-only fields for a stage — no live state or amount. */
export interface LiveStageTemplate {
  readonly n: number;
  readonly key: LiveStageKey;
  readonly title: string;
  readonly short: string;
  readonly unit: string;
  readonly contract: string;
  readonly address: string;
  readonly addressLabel: string;
  readonly timestamp: string;
  readonly relative: string;
  readonly detail: string;
}

/** A template stage resolved with its live state + computed amount. */
export interface LiveStage extends LiveStageTemplate {
  readonly amount: string;
  readonly state: LiveStageState;
  readonly failureReason?: string;
}

export interface StagePosition {
  readonly currentStage: number;
  readonly failedAt: number | null;
}

export interface DonationSplit {
  readonly grossMicros: number;
  readonly eudaimoniaFeeMicros: number;
  readonly afterEudaimoniaMicros: number;
  readonly endaomentFeeMicros: number;
  readonly charityMicros: number;
}

/** Basis points (1bp = 0.01%). Fees mirror docs/adr/0002-fee-collection.md. */
const EUDAIMONIA_FEE_BPS = 100; // 1%
const ENDAOMENT_FEE_BPS = 150; // 1.5%
const BPS_DENOMINATOR = 10_000;

/** USDC settles 1:1 with USD and has 6 decimals; 1 US cent = 10,000 micro-USDC. */
const MICROS_PER_CENT = 10_000;
const MICROS_PER_UNIT = 1_000_000;

export const LIVE_STAGES_TEMPLATE: readonly LiveStageTemplate[] = [
  {
    n: 1,
    key: "paid",
    title: "Paid",
    short: "Card charged · Stripe",
    unit: "USD",
    contract: "Stripe Payments",
    address: "pi_3OqK…7Yz9",
    addressLabel: "Charge ID",
    timestamp: "17:34:01 UTC",
    relative: "just now",
    detail:
      "Card authorization completed. Funds reserved on the issuer side; on-ramp begins immediately.",
  },
  {
    n: 2,
    key: "converted",
    title: "Converted",
    short: "USD → USDC via Stripe Onramp",
    unit: "USDC",
    contract: "Stripe Crypto Onramp",
    address: "0xa9d1…f7b2",
    addressLabel: "Settle to",
    timestamp: "17:34:04 UTC",
    relative: "+3s",
    detail:
      "Fiat minted to USDC on Base L2 at 1:1. Settlement is atomic — no slippage.",
  },
  {
    n: 3,
    key: "routed",
    title: "Routed",
    short: "Eudaimonia · 1% fee taken on-chain",
    unit: "USDC",
    contract: "TransparentDonationRouter",
    address: "0x10fd…a589",
    addressLabel: "Router",
    timestamp: "17:34:06 UTC",
    relative: "+5s",
    detail:
      "Our router contract splits 1% to Eudaimonia’s treasury and forwards 99% to the charity’s Endaoment Org Fund.",
  },
  {
    n: 4,
    key: "delivered",
    title: "Delivered",
    short: "Arrived at charity’s Endaoment fund",
    unit: "USDC",
    contract: "Endaoment · OrgFund",
    address: "0x10e9…eb82",
    addressLabel: "Charity",
    timestamp: "17:34:08 UTC",
    relative: "+7s",
    detail:
      "Endaoment’s 1.5% fee is taken at this step; the remainder is spendable by the charity’s multisig.",
  },
  {
    n: 5,
    key: "published",
    title: "Published",
    short: "Public receipt live · sharable forever",
    unit: "",
    contract: "eudaimonia.app",
    address: "/receipt/0xdc67…78ed",
    addressLabel: "Receipt URL",
    timestamp: "17:34:09 UTC",
    relative: "+8s",
    detail:
      "Your receipt is now public at eudaimonia.app/receipt/{tx}. Anyone with the link can verify it.",
  },
] as const;

/** Format integer US cents as a 2-dp dollar string, e.g. 500 → "5.00". */
export function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format micro-USDC to `dp` decimals, e.g. (4_875_750, 3) → "4.876". */
export function formatUsdc(micros: number, dp: number): string {
  return (micros / MICROS_PER_UNIT).toFixed(dp);
}

/**
 * Split a gross donation (integer US cents) into the on-chain hops the donor
 * sees: full gross settles to the router, which deducts 1%, then Endaoment
 * deducts 1.5% of the remainder. Returns integer micro-USDC throughout so
 * callers control display precision without re-introducing float drift.
 */
export function computeDonationSplit(grossCents: number): DonationSplit {
  const grossMicros = grossCents * MICROS_PER_CENT;
  const eudaimoniaFeeMicros = Math.round(
    (grossMicros * EUDAIMONIA_FEE_BPS) / BPS_DENOMINATOR,
  );
  const afterEudaimoniaMicros = grossMicros - eudaimoniaFeeMicros;
  const endaomentFeeMicros = Math.round(
    (afterEudaimoniaMicros * ENDAOMENT_FEE_BPS) / BPS_DENOMINATOR,
  );
  const charityMicros = afterEudaimoniaMicros - endaomentFeeMicros;
  return {
    grossMicros,
    eudaimoniaFeeMicros,
    afterEudaimoniaMicros,
    endaomentFeeMicros,
    charityMicros,
  };
}

/** Derive 1–2 uppercase initials from a charity name, e.g. "World Central…" → "WC". */
export function charityInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/**
 * Map a backend `OnrampStatus` onto a tracker position. Coarse by necessity —
 * the backend collapses converted/routed/delivered into a single "settled", so
 * the in-flight statuses both render the converting stage as active, and
 * `settled` marks every stage done (`currentStage` past the last node).
 *
 * `failed` flags the converting stage as the failure point: it is the earliest
 * on-chain hop and the only one the coarse status can attribute without the
 * (out-of-scope) `failureReason`. Screen 2 refines this per outcome.
 */
export function deriveLiveStages(status: OnrampStatus): StagePosition {
  switch (status) {
    case "created":
    case "pending":
      return { currentStage: 2, failedAt: null };
    case "settled":
      return { currentStage: LIVE_STAGES_TEMPLATE.length + 1, failedAt: null };
    case "failed":
      return { currentStage: 2, failedAt: 2 };
  }
}

export interface BuildLiveStagesInput {
  readonly currentStage: number;
  readonly failedAt?: number | null;
  readonly grossCents: number;
  readonly failureReason?: string;
}

function stageState(
  n: number,
  currentStage: number,
  failedAt: number | null,
): LiveStageState {
  if (failedAt !== null) {
    if (n === failedAt) return "failed";
    return n < failedAt ? "done" : "queued";
  }
  if (n < currentStage) return "done";
  if (n === currentStage) return "active";
  return "queued";
}

function stageAmount(key: LiveStageKey, split: DonationSplit): string {
  switch (key) {
    case "paid":
      return formatDollars(split.grossMicros / MICROS_PER_CENT);
    case "converted":
      return formatUsdc(split.grossMicros, 6);
    case "routed":
      return formatUsdc(split.afterEudaimoniaMicros, 6);
    case "delivered":
      return formatUsdc(split.charityMicros, 6);
    case "published":
      return "—";
  }
}

/**
 * Resolve the template into a live stage list: assign each stage its state from
 * the cursor and its amount from the real gross. Returns fresh objects — the
 * shared `LIVE_STAGES_TEMPLATE` is never mutated.
 */
export function buildLiveStages(input: BuildLiveStagesInput): LiveStage[] {
  const { currentStage, failedAt = null, grossCents, failureReason } = input;
  const split = computeDonationSplit(grossCents);

  return LIVE_STAGES_TEMPLATE.map((template) => {
    const state = stageState(template.n, currentStage, failedAt);
    const base: LiveStage = {
      ...template,
      amount: stageAmount(template.key, split),
      state,
    };
    return state === "failed" && failureReason
      ? { ...base, failureReason }
      : base;
  });
}
