/**
 * Checkout domain types. All monetary values flow as integer cents through the
 * API surface to avoid floating-point drift; only the presentation layer
 * formats them as dollars.
 *
 * Sources of truth:
 * - Fee row labels and copy: designs/checkout.jsx (OrderSummary, ~line 477).
 * - Min/max amount: locked in prompts/epic-2-checkout-plan.md Phase 1.
 */

export type FeeRowKind =
  | "gross"
  | "eudaimonia"
  | "endaoment"
  | "cardProcessing"
  | "net";

export interface FeeRow {
  /** Stable identifier for tests and React keys. */
  readonly kind: FeeRowKind;
  /** Human-readable row label (e.g. "Eudaimonia routing fee"). */
  readonly label: string;
  /** Short hint under the label (e.g. "1.00% · taken on-chain, …"). */
  readonly sub?: string;
  /** Integer cents. */
  readonly amountCents: number;
  /** Used by the row renderer for muted text styling. */
  readonly muted?: boolean;
  /** The terminal "Net to charity" row is rendered larger. */
  readonly strong?: boolean;
}

export interface FeeBreakdown {
  /** The donor-entered gross amount, in cents. */
  readonly grossCents: number;
  /** Ordered rows ready for OrderSummary to render. Empty when gross === 0. */
  readonly rows: readonly FeeRow[];
  /** Net amount the charity receives after platform + Endaoment fees, in cents. */
  readonly netToCharityCents: number;
  /** Eudaimonia's 1% platform fee, in cents. */
  readonly eudaimoniaFeeCents: number;
  /** Endaoment's 1.5% charitable-infrastructure fee, in cents. */
  readonly endaomentFeeCents: number;
  /** 2.9% + $0.30 card processing fee, in cents. Zero when gross is zero. */
  readonly cardProcessingFeeCents: number;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export interface CheckoutPayload {
  readonly campaignId: string;
  readonly grossCents: number;
  readonly email: string;
  readonly note?: string;
}
