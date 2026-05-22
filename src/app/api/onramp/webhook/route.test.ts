import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/log/logger";
import { createInMemoryKvStore } from "@/lib/kv/kv-store";
import { inMemorySessionStore } from "@/lib/onramp/session-store";
import type { SessionStore } from "@/lib/onramp/session-store";
import {
  createProcessedEventLog,
  ONRAMP_SESSION_UPDATED_EVENT,
  type ProcessedEventLog,
} from "@/lib/onramp/webhook-handler";
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
  let processedEvents: ProcessedEventLog;

  beforeEach(async () => {
    await store.reset();
    await store.put(CREATED_SESSION);
    processedEvents = createProcessedEventLog(createInMemoryKvStore());
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    const session = await store.get(CREATED_SESSION.id);
    expect(session?.status).toBe("settled");
    expect(session?.txHash).toBe("0xabc123");
  });

  it("rejects an invalid signature with 400 and does NOT touch the store", async () => {
    // Signed with the wrong secret → verification against WEBHOOK_SECRET fails.
    const req = signedRequest(eventPayload("rejected"), "whsec_wrong_secret");

    const res = await handleOnrampWebhook(req, deps());

    expect(res.status).toBe(400);
    // Handler never ran: session unchanged, no event recorded.
    expect((await store.get(CREATED_SESSION.id))?.status).toBe("created");
    expect(await processedEvents.has("evt_1")).toBe(false);
  });

  it("returns 400 when the stripe-signature header is missing", async () => {
    const req = new Request("http://localhost/api/onramp/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: eventPayload("fulfillment_complete"),
    });

    const res = await handleOnrampWebhook(req, deps());

    expect(res.status).toBe(400);
    expect((await store.get(CREATED_SESSION.id))?.status).toBe("created");
  });

  it("returns 400 when a validly-signed body is not parseable as a Stripe event", async () => {
    const req = signedRequest("{not valid json");

    const res = await handleOnrampWebhook(req, deps());

    expect(res.status).toBe(400);
    expect((await store.get(CREATED_SESSION.id))?.status).toBe("created");
  });

  it("returns 500 (so Stripe retries) when the handler throws", async () => {
    const throwingStore: SessionStore = {
      get: async () => CREATED_SESSION,
      put: async () => {},
      update: async () => {
        throw new Error("store write failed");
      },
      reset: async () => {},
    };

    const req = signedRequest(
      eventPayload("fulfillment_complete", { transactionId: "0xabc" }),
    );

    const res = await handleOnrampWebhook(req, deps({ store: throwingStore }));

    expect(res.status).toBe(500);
  });

  it("logs handler failures through the structured logger, not console (L3)", async () => {
    const logSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);
    const throwingStore: SessionStore = {
      get: async () => CREATED_SESSION,
      put: async () => {},
      update: async () => {
        throw new Error("store write failed");
      },
      reset: async () => {},
    };
    const req = signedRequest(
      eventPayload("fulfillment_complete", { transactionId: "0xabc" }),
    );

    await handleOnrampWebhook(req, deps({ store: throwingStore }));

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [fields, msg] = logSpy.mock.calls[0];
    expect(fields).toMatchObject({ scope: "onramp/webhook" });
    expect((fields as { err: unknown }).err).toBeInstanceOf(Error);
    expect(typeof msg).toBe("string");
  });

  it("logs signature-verification failures through the structured logger (L3)", async () => {
    const logSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);
    const req = signedRequest(eventPayload("rejected"), "whsec_wrong_secret");

    await handleOnrampWebhook(req, deps());

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toMatchObject({ scope: "onramp/webhook" });
  });
});
