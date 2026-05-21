/**
 * Pure on-ramp webhook state machine (Epic 3, Phase 5; async since the M2 fix).
 *
 * Stripe Crypto Onramp emits a SINGLE event topic — `crypto.onramp_session.updated`
 * — every time a session's status changes. So this handler branches on the session
 * object's `status` field, not on the event type.
 *
 * Design guarantees:
 * - **Terminal states are absorbing.** Once a session is `settled` or `failed`,
 *   no later event downgrades it. Stripe does not guarantee delivery order.
 * - **Idempotent by `event.id`.** A replayed event (Stripe retries until 2xx) is
 *   a no-op. The {@link ProcessedEventLog} is injected so the route owns its
 *   lifetime AND its durability — backed by KV it survives cold starts and is
 *   shared across instances, closing the cross-lambda replay gap (M2).
 * - **Unknown sessions are ignored**, never created.
 *
 * Kept free of the Next runtime and signature verification so it is trivially
 * unit-testable; the route (`webhook/route.ts`) handles transport + auth.
 */

import { z } from "zod";
import type { KvStore } from "@/lib/kv/kv-store";
import type { OnrampSession, OnrampStatus } from "@/types/onramp";
import type { SessionStore } from "./session-store";

/** The only Crypto Onramp webhook topic Eudaimonia subscribes to. */
export const ONRAMP_SESSION_UPDATED_EVENT = "crypto.onramp_session.updated";

/**
 * Minimal structural shape of a verified Stripe event. Intentionally narrower
 * than the SDK's `Stripe.Event` so the pure handler has no SDK dependency.
 */
export interface OnrampWebhookEvent {
  readonly id: string;
  readonly type: string;
  readonly data: { readonly object: unknown };
}

/**
 * Durable record of which `event.id`s have already been applied. Claiming is
 * atomic (Redis `SET … NX`) so concurrent duplicate deliveries — not just
 * sequential replays — can never both pass the check and double-apply (the
 * has()+add() TOCTOU). `release` undoes a claim when an apply fails so the
 * route's 500 → Stripe retry can re-apply rather than no-op on a stale claim.
 */
export interface ProcessedEventLog {
  /** Read-only: has `eventId` already been claimed? */
  has(eventId: string): Promise<boolean>;
  /**
   * Atomically claim `eventId`. Returns `true` if THIS caller claimed it (first
   * delivery → must process); `false` if it was already claimed (replay or a
   * concurrent duplicate → caller no-ops).
   */
  claim(eventId: string): Promise<boolean>;
  /** Release a prior claim so a retry can re-apply (used on mid-apply failure). */
  release(eventId: string): Promise<void>;
}

export interface WebhookHandlerDeps {
  readonly store: SessionStore;
  readonly processedEvents: ProcessedEventLog;
}

/** Key namespace for processed-event markers within a (possibly shared) KvStore. */
const EVENT_PREFIX = "evt:";

/**
 * Retain processed-event markers well beyond Stripe's retry window (up to ~3
 * days) so a late retry still short-circuits, while still bounding storage.
 */
export const PROCESSED_EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Build a ProcessedEventLog over any KvStore (in-memory for tests, KV in prod). */
export function createProcessedEventLog(
  kv: KvStore,
  ttlSeconds: number = PROCESSED_EVENT_TTL_SECONDS,
): ProcessedEventLog {
  return {
    async has(eventId) {
      return kv.has(EVENT_PREFIX + eventId);
    },
    async claim(eventId) {
      return kv.setNx(EVENT_PREFIX + eventId, 1, ttlSeconds);
    },
    async release(eventId) {
      await kv.delete(EVENT_PREFIX + eventId);
    },
  };
}

/**
 * The fields of the Crypto Onramp session object this handler depends on.
 * Validated even though the signature is already verified: a valid signature
 * proves authenticity, not that the payload matches the schema we expect.
 */
const onrampSessionObjectSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  transaction_details: z
    .object({ transaction_id: z.string().min(1).nullish() })
    .nullish(),
});

/**
 * Map Stripe's session status onto Eudaimonia's narrower domain status. Only the
 * two terminal states are matched explicitly; every other (intermediate or
 * future) status is treated as in-flight `pending`.
 */
function toDomainStatus(stripeStatus: string): OnrampStatus {
  switch (stripeStatus) {
    case "fulfillment_complete":
      return "settled";
    case "rejected":
      return "failed";
    default:
      return "pending";
  }
}

function isTerminal(status: OnrampStatus): boolean {
  return status === "settled" || status === "failed";
}

/**
 * Apply one verified webhook event to the session store. Safe to call repeatedly
 * for the same event (idempotent by `event.id`).
 */
export async function applyOnrampSessionEvent(
  event: OnrampWebhookEvent,
  deps: WebhookHandlerDeps,
): Promise<void> {
  const { store, processedEvents } = deps;

  // Atomically CLAIM this event.id before any work (Redis SET NX). A losing
  // claim means the event is already handled (replay) or being handled
  // concurrently — a no-op. This enforces idempotency AND closes the
  // has()+add() TOCTOU under duplicate delivery. A KV failure here throws → the
  // route returns 500 so Stripe retries (fail-closed: never drop a settlement).
  if (!(await processedEvents.claim(event.id))) {
    return;
  }

  try {
    // We only act on the onramp session topic; ignore anything else Stripe
    // sends. The claim stays — we never want to reprocess a foreign event type.
    if (event.type !== ONRAMP_SESSION_UPDATED_EVENT) {
      return;
    }

    const parsed = onrampSessionObjectSchema.safeParse(event.data.object);
    if (!parsed.success) {
      // Claim stays: a payload we can't parse now won't parse on a redelivery
      // either, so short-circuit its retries rather than loop forever.
      return;
    }

    const existing = await store.get(parsed.data.id);
    if (!existing) {
      // Not a session we minted (or it was evicted). RELEASE the claim so the
      // event ends UNMARKED — we never fabricate a session from webhook data,
      // and a later redelivery can still apply if a durable store comes to hold
      // it. (The route answers 200 regardless, so Stripe treats it as acked.)
      await processedEvents.release(event.id);
      return;
    }

    // Terminal states are absorbing — a late/out-of-order event cannot revert
    // them. Claim stays; there is nothing further to apply.
    if (isTerminal(existing.status)) {
      return;
    }

    const nextStatus = toDomainStatus(parsed.data.status);
    const txId = parsed.data.transaction_details?.transaction_id;

    // Settlement requires the on-chain tx hash. Stripe populates transaction_id
    // at fulfillment_complete; if a delivery omits it, settling anyway would
    // write a permanently hash-less terminal record (terminal is absorbing, so
    // it could never be backfilled). Throw — the catch releases the claim and
    // the route returns 500 so Stripe's retry (with the hash) re-applies.
    if (nextStatus === "settled" && !txId) {
      throw new Error(
        `Onramp event ${event.id} reported settlement for ${parsed.data.id} without a transaction_id`,
      );
    }

    // Build the patch in one expression — OnrampSession fields are readonly.
    const patch: Partial<OnrampSession> =
      nextStatus === "settled" && txId
        ? { status: nextStatus, txHash: txId }
        : { status: nextStatus };

    await store.update(parsed.data.id, patch);
  } catch (err: unknown) {
    // Any failure mid-apply must NOT leave the event claimed, or the route's
    // 500 → Stripe retry would no-op on the stale claim. Release, then rethrow.
    await processedEvents.release(event.id);
    throw err;
  }
}
