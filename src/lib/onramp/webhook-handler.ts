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

/** The only Crypto Onramp webhook topic Philotimo subscribes to. */
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
 * Durable record of which `event.id`s have already been applied. Async so a
 * KV-backed implementation drops in unchanged; replays short-circuit on `has`.
 */
export interface ProcessedEventLog {
  has(eventId: string): Promise<boolean>;
  add(eventId: string): Promise<void>;
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
    async add(eventId) {
      await kv.set(EVENT_PREFIX + eventId, 1, ttlSeconds);
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
 * Map Stripe's session status onto Philotimo's narrower domain status. Only the
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

  // Idempotency: a replayed event must not mutate state a second time.
  if (await processedEvents.has(event.id)) {
    return;
  }

  // We only act on the onramp session topic; ignore anything else Stripe sends.
  if (event.type !== ONRAMP_SESSION_UPDATED_EVENT) {
    await processedEvents.add(event.id);
    return;
  }

  const parsed = onrampSessionObjectSchema.safeParse(event.data.object);
  if (!parsed.success) {
    // Can't act on a payload we don't understand; mark processed so Stripe's
    // retries of this exact event don't loop forever.
    await processedEvents.add(event.id);
    return;
  }

  const existing = await store.get(parsed.data.id);
  if (!existing) {
    // Not a session we minted (or it was evicted). Return without applying or
    // fabricating anything from webhook data alone. We leave the event UNMARKED,
    // but the route still answers 200, so Stripe treats it as acknowledged and
    // will not redeliver — the event is effectively dropped, not retried. Not
    // marking it simply avoids persisting a processed marker for a session we
    // don't own (if reprocessing-on-redeliver were ever required, the route
    // would have to return a non-2xx here instead).
    return;
  }

  // Terminal states are absorbing — a late/out-of-order event cannot revert them.
  if (isTerminal(existing.status)) {
    await processedEvents.add(event.id);
    return;
  }

  const nextStatus = toDomainStatus(parsed.data.status);
  const txId = parsed.data.transaction_details?.transaction_id;

  // Settlement requires the on-chain tx hash. Stripe populates transaction_id
  // at fulfillment_complete; if a delivery omits it, settling anyway would write
  // a permanently hash-less terminal record (terminal states are absorbing, so
  // it could never be backfilled). Throw instead — the route turns this into a
  // 500 so Stripe retries, and event.id stays unmarked so the retry can apply.
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
  await processedEvents.add(event.id);
}
