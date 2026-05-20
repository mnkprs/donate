/**
 * POST /api/onramp/webhook — ingest Stripe Crypto Onramp events.
 *
 * This route is the system's settlement-auth boundary: a bug here would let a
 * caller mark any session "settled". So verification is non-negotiable and uses
 * Stripe's own audited `webhooks.constructEvent` over the EXACT raw request body
 * — never a hand-rolled HMAC, never the parsed JSON (the signature is computed
 * over the raw bytes).
 *
 * Pipeline:
 *   1. Require the `stripe-signature` header            → 400 if missing.
 *   2. Read the raw body and verify the signature       → 400 if invalid/unparseable.
 *   3. Dispatch the verified event to the pure handler.
 *   4. Handler error → 500 so Stripe RETRIES (at-least-once delivery); the pure
 *      handler's `event.id` idempotency makes a retry safe.
 *   5. Success → 200 `{ received: true }`.
 *
 * Deps are injected so the handler is unit-testable against the real verifier
 * (via `stripe.webhooks.generateTestHeaderString`) without the Next runtime. The
 * processed-event log is a {@link ProcessedEventLog}; backed by KV it survives
 * cold starts and is shared across instances (security review M2).
 */

import Stripe from "stripe";
import { serverEnv } from "@/lib/env/server";
import { onrampKvStore } from "@/lib/onramp/onramp-kv";
import {
  inMemorySessionStore,
  type SessionStore,
} from "@/lib/onramp/session-store";
import {
  applyOnrampSessionEvent,
  createProcessedEventLog,
  type OnrampWebhookEvent,
  type ProcessedEventLog,
} from "@/lib/onramp/webhook-handler";

/** Header Stripe sets carrying the timestamped event signature. */
export const STRIPE_SIGNATURE_HEADER = "stripe-signature";

/** Verifies the raw body against a secret, returning the event or throwing. */
type ConstructEvent = (
  payload: string,
  signature: string,
  secret: string,
) => OnrampWebhookEvent;

export interface WebhookRouteDeps {
  readonly webhookSecret: string;
  readonly store: SessionStore;
  /** Durable, replay-idempotent log of handled `event.id`s. */
  readonly processedEvents: ProcessedEventLog;
  readonly constructEvent: ConstructEvent;
}

/**
 * Minimal JSON ack. Stripe ignores the body and acts only on the status code,
 * so this is for our own logs/debugging — deliberately not the client-facing
 * `OnrampErrorBody` envelope (that contract is for the donor's browser).
 */
function ack(message: string, status: number): Response {
  return Response.json({ message }, { status });
}

export async function handleOnrampWebhook(
  request: Request,
  deps: WebhookRouteDeps,
): Promise<Response> {
  const signature = request.headers.get(STRIPE_SIGNATURE_HEADER);
  if (!signature) {
    return ack("Missing stripe-signature header", 400);
  }

  // Raw body, not request.json(): the signature is over these exact bytes.
  const rawBody = await request.text();

  let event: OnrampWebhookEvent;
  try {
    event = deps.constructEvent(rawBody, signature, deps.webhookSecret);
  } catch (err: unknown) {
    // Bad signature OR unparseable payload — either way we refuse to act.
    // TODO: swap console for a structured logger (pino/winston) before launch.
    console.error("[onramp/webhook] signature verification failed:", err);
    return ack("Invalid webhook signature", 400);
  }

  try {
    await applyOnrampSessionEvent(event, {
      store: deps.store,
      processedEvents: deps.processedEvents,
    });
  } catch (err: unknown) {
    console.error("[onramp/webhook] event handling failed:", err);
    // 500 makes Stripe retry; idempotency by event.id keeps the retry safe.
    return ack("Webhook processing failed", 500);
  }

  return Response.json({ received: true }, { status: 200 });
}

/**
 * Lazily-built Stripe client. Only its pure `webhooks.constructEvent` crypto is
 * used here; the secret key is never sent over the wire by this route.
 */
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (stripeClient === null) {
    stripeClient = new Stripe(serverEnv().STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

/** Processed-event log over the shared (durable when configured) KvStore. */
const webhookProcessedEvents = createProcessedEventLog(onrampKvStore());

export function POST(request: Request): Promise<Response> {
  const env = serverEnv();
  return handleOnrampWebhook(request, {
    webhookSecret: env.STRIPE_ONRAMP_WEBHOOK_SECRET,
    store: inMemorySessionStore,
    processedEvents: webhookProcessedEvents,
    constructEvent: (payload, signature, secret) =>
      getStripe().webhooks.constructEvent(payload, signature, secret),
  });
}
