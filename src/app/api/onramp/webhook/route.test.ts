import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { inMemorySessionStore } from "@/lib/onramp/session-store";
import type { SessionStore } from "@/lib/onramp/session-store";
import { ONRAMP_SESSION_UPDATED_EVENT } from "@/lib/onramp/webhook-handler";
import { TEST_ENV } from "@/lib/onramp/test-fixtures";
import type { OnrampSession } from "@/types/onramp";
import { handleOnrampWebhook, STRIPE_SIGNATURE_HEADER } from "./route";

/** Only used for its pure `webhooks` crypto helpers — never makes a network call. */
const stripe = new Stripe("sk_test_dummy_key");
const WEBHOOK_SECRET = TEST_ENV.STRIPE_ONRAMP_WEBHOOK_SECRET;

const CREATED_SESSION: OnrampSession = Object.freeze({
  id: "cos_test_123",
  status: "created",
  clientSecret: "cos_test_123_secret_abc",
  redirectUrl: "https://crypto.link.com/session/cos_test_123",
  grossCents: 5000,
  campaignId: "pcrf",
  donorEmail: "donor@example.com",
});

function eventPayload(
  status: string,
  opts: { id?: string; sessionId?: string; transactionId?: string } = {},
): string {
  return JSON.stringify({
    id: opts.id ?? "evt_1",
    object: "event",
    type: ONRAMP_SESSION_UPDATED_EVENT,
    data: {
      object: {
        id: opts.sessionId ?? CREATED_SESSION.id,
        object: "crypto.onramp_session",
        status,
        transaction_details: opts.transactionId
          ? { transaction_id: opts.transactionId }
          : null,
      },
    },
  });
}

function signedRequest(payload: string, secret: string = WEBHOOK_SECRET): Request {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/onramp/webhook", {
    method: "POST",
    headers: { [STRIPE_SIGNATURE_HEADER]: header, "content-type": "application/json" },
    body: payload,
  });
}

/** Real SDK verifier, bound so `this` is preserved. */
const constructEvent: (p: string, h: string, s: string) => Stripe.Event = (
  payload,
  header,
  secret,
) => stripe.webhooks.constructEvent(payload, header, secret);

describe("POST /api/onramp/webhook — handleOnrampWebhook()", () => {
  const store = inMemorySessionStore;
  let processedEvents: Set<string>;

  beforeEach(() => {
    store.reset();
    store.put(CREATED_SESSION);
    processedEvents = new Set();
  });

  function deps(overrides: Partial<{ store: SessionStore }> = {}) {
    return {
      webhookSecret: WEBHOOK_SECRET,
      store: overrides.store ?? store,
      processedEvents,
      constructEvent,
    };
  }

  it("verifies a valid signature, dispatches to the handler, and returns 200", async () => {
    const req = signedRequest(
      eventPayload("fulfillment_complete", { transactionId: "0xabc123" }),
    );

    const res = await handleOnrampWebhook(req, deps());

    expect(res.status).toBe(200);
    const session = store.get(CREATED_SESSION.id);
    expect(session?.status).toBe("settled");
    expect(session?.txHash).toBe("0xabc123");
  });

  it("rejects an invalid signature with 400 and does NOT touch the store", async () => {
    // Signed with the wrong secret → verification against WEBHOOK_SECRET fails.
    const req = signedRequest(eventPayload("rejected"), "whsec_wrong_secret");

    const res = await handleOnrampWebhook(req, deps());

    expect(res.status).toBe(400);
    // Handler never ran: session unchanged, no event recorded.
    expect(store.get(CREATED_SESSION.id)?.status).toBe("created");
    expect(processedEvents.size).toBe(0);
  });

  it("returns 400 when the stripe-signature header is missing", async () => {
    const req = new Request("http://localhost/api/onramp/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: eventPayload("fulfillment_complete"),
    });

    const res = await handleOnrampWebhook(req, deps());

    expect(res.status).toBe(400);
    expect(store.get(CREATED_SESSION.id)?.status).toBe("created");
  });

  it("returns 400 when a validly-signed body is not parseable as a Stripe event", async () => {
    const req = signedRequest("{not valid json");

    const res = await handleOnrampWebhook(req, deps());

    expect(res.status).toBe(400);
    expect(store.get(CREATED_SESSION.id)?.status).toBe("created");
  });

  it("returns 500 (so Stripe retries) when the handler throws", async () => {
    const throwingStore: SessionStore = {
      get: () => CREATED_SESSION,
      put: () => {},
      update: () => {
        throw new Error("store write failed");
      },
      reset: () => {},
    };

    const req = signedRequest(
      eventPayload("fulfillment_complete", { transactionId: "0xabc" }),
    );

    const res = await handleOnrampWebhook(req, deps({ store: throwingStore }));

    expect(res.status).toBe(500);
  });
});
