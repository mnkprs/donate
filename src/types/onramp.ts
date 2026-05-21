/**
 * Fiat-to-crypto on-ramp domain types (Epic 3).
 *
 * The on-ramp turns a donor's fiat checkout intent (Epic 2's `CheckoutPayload`)
 * into a USDC settlement on Base addressed to the Eudaimonia router contract.
 * The router (Epic 4) deducts the 1% platform fee on-chain, so the on-ramp
 * always settles the FULL gross to the router — never a net amount.
 *
 * Sources of truth:
 * - Provider + amount semantics: docs/adr/0001-onramp-provider.md
 * - Full-gross-to-router fee model: docs/adr/0002-fee-collection.md
 */

/**
 * Lifecycle of an on-ramp session as Eudaimonia tracks it. This is the *domain*
 * status, intentionally narrower than Stripe's raw session statuses; the
 * webhook handler (Phase 5) maps Stripe events onto these four states.
 *
 * - created:  session created with Stripe, donor not yet redirected/funded.
 * - pending:  donor committed; settlement in flight on Base.
 * - settled:  USDC delivered to the router contract (tx hash known).
 * - failed:   KYC rejection, payment failure, or settlement failure.
 */
export type OnrampStatus = "created" | "pending" | "settled" | "failed";

/**
 * Input contract for creating a session. Structurally compatible with Epic 2's
 * `CheckoutPayload` (which adds an optional `note`), so the checkout form's
 * payload can be passed straight through without transformation.
 */
export interface CreateSessionInput {
  readonly campaignId: string;
  /** Donor-entered gross amount in integer cents. */
  readonly grossCents: number;
  readonly email: string;
}

/**
 * Typed, pre-serialization shape of the outbound Stripe Crypto Onramp request.
 * The `stripe.ts` wrapper is the only place that flattens this into Stripe's
 * bracket-encoded form body, keeping the pure builder free of wire concerns.
 */
export interface StripeOnrampRequest {
  readonly destinationCurrency: "usdc";
  readonly destinationNetwork: "base" | "base-sepolia";
  /** USDC amount as a decimal string at 1:1 with USD, e.g. "50.00". */
  readonly destinationAmount: string;
  /** Router contract address that receives the full gross USDC. */
  readonly destinationWalletAddress: string;
  readonly customerEmail: string;
  readonly metadata: {
    readonly campaign_id: string;
  };
}

/**
 * Success body of `POST /api/onramp/session`. Deliberately narrow: the client
 * only needs where to send the donor next and an id to poll status with. The
 * Phase 7 `realSubmit` client consumes exactly this shape.
 */
export interface OnrampSessionResponse {
  readonly sessionId: string;
  readonly redirectUrl: string;
}

/** Machine-readable error codes returned by the on-ramp API routes. */
export type OnrampErrorCode =
  | "invalid_request"
  | "provider_error"
  | "not_found"
  | "rate_limited";

/**
 * Typed error envelope shared by the on-ramp routes. `code` drives client
 * branching; `message` is safe to surface (never contains secrets).
 */
export interface OnrampErrorBody {
  readonly error: {
    readonly code: OnrampErrorCode;
    readonly message: string;
  };
}

/**
 * Persisted on-ramp session record. Created in Phase 4, mutated by the webhook
 * handler in Phase 5, read by the status route in Phase 6.
 */
export interface OnrampSession {
  /** Stripe Crypto Onramp session id (e.g. "cos_..."). */
  readonly id: string;
  readonly status: OnrampStatus;
  /** Client secret for the Stripe.js embedded onramp UI. */
  readonly clientSecret: string;
  /** Hosted-onramp redirect URL the donor is sent to (Phase 7). */
  readonly redirectUrl: string;
  readonly grossCents: number;
  readonly campaignId: string;
  readonly donorEmail: string;
  /** On-chain settlement transaction hash, populated once status === "settled". */
  readonly txHash?: string;
}

/**
 * Public projection of an `OnrampSession` returned by
 * `GET /api/onramp/status/[sessionId]` (Phase 6).
 *
 * Deliberately NARROW: a `sessionId` is reached without authentication and is a
 * guessable capability handle (same boundary the Phase 4 idempotency hardening
 * drew, commit 6e1e34c). So this projection excludes everything sensitive —
 * `clientSecret` (Stripe embedded-UI secret), `donorEmail` (PII), and
 * `redirectUrl` (a donor-flow capability, not a status-poll concern). It carries
 * only what a status poller / the Epic 5 receipt page needs.
 *
 * `txHash` is present ONLY once `status === "settled"`; for any other status the
 * key is omitted entirely (never serialized as `null`).
 */
export interface OnrampStatusResponse {
  readonly sessionId: string;
  readonly status: OnrampStatus;
  readonly campaignId: string;
  readonly grossCents: number;
  readonly txHash?: string;
}
