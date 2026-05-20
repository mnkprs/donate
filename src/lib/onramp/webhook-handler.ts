/**
 * Pure on-ramp webhook state machine (Epic 3, Phase 5).
 *
 * Stripe Crypto Onramp emits a SINGLE event topic — `crypto.onramp_session.updated`
 * — every time a session's status changes (verified against Stripe's API docs;
 * the per-action `*.created/fulfilled/failed` names in the original plan do not
 * exist). So this handler branches on the session object's `status` field, not
 * on the event type.
 *
 * Design guarantees:
 * - **Terminal states are absorbing.** Once a session is `settled` or `failed`,
 *   no later event downgrades it. Stripe does not guarantee delivery order, so a
 *   stale in-flight event can arrive after a terminal one.
 * - **Idempotent by `event.id`.** A replayed event (Stripe retries until 2xx) is
 *   a no-op. The processed-id set is injected so the route owns its lifetime.
 * - **Unknown sessions are ignored**, never created — the store is the source of
 *   truth for sessions WE minted.
 *
 * Kept free of the Next runtime and signature verification so it is trivially
 * unit-testable; the route (`webhook/route.ts`) handles transport + auth.
 */

import { z } from "zod";
import type { OnrampSession, OnrampStatus } from "@/types/onramp";
import type { SessionStore } from "./session-store";

/** The only Crypto Onramp webhook topic Philotimo subscribes to. */
export const ONRAMP_SESSION_UPDATED_EVENT = "crypto.onramp_session.updated";

/**
 * Minimal structural shape of a verified Stripe event. Intentionally narrower
 * than the SDK's `Stripe.Event` so the pure handler has no SDK dependency; the
 * real event is structurally assignable to this.
 */
export interface OnrampWebhookEvent {
  readonly id: string;
  readonly type: string;
  readonly data: { readonly object: unknown };
}

export interface WebhookHandlerDeps {
  readonly store: SessionStore;
  /** Set of already-processed `event.id`s; replays short-circuit. */
  readonly processedEvents: Set<string>;
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
 * future) status is treated as in-flight `pending`, so a Stripe rename of an
 * intermediate status never silently mis-maps to a terminal state.
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
 * Apply one verified webhook event to the session store. Pure aside from the
 * injected store/set mutations; safe to call repeatedly for the same event.
 */
export function applyOnrampSessionEvent(
  event: OnrampWebhookEvent,
  deps: WebhookHandlerDeps,
): void {
  const { store, processedEvents } = deps;

  // Idempotency: a replayed event must not mutate state a second time.
  if (processedEvents.has(event.id)) {
    return;
  }

  // We only act on the onramp session topic; ignore anything else Stripe sends.
  if (event.type !== ONRAMP_SESSION_UPDATED_EVENT) {
    processedEvents.add(event.id);
    return;
  }

  const parsed = onrampSessionObjectSchema.safeParse(event.data.object);
  if (!parsed.success) {
    // Can't act on a payload we don't understand; mark processed so Stripe's
    // retries of this exact event don't loop forever.
    processedEvents.add(event.id);
    return;
  }

  const existing = store.get(parsed.data.id);
  if (!existing) {
    // Not a session we minted (or it was evicted). Do NOT mark processed: if a
    // durable store later holds it, a retry can still apply. Returning here also
    // means we never fabricate a session from webhook data alone.
    return;
  }

  // Terminal states are absorbing — a late/out-of-order event cannot revert them.
  if (isTerminal(existing.status)) {
    processedEvents.add(event.id);
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

  store.update(parsed.data.id, patch);
  processedEvents.add(event.id);
}
