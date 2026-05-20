import { beforeEach, describe, expect, it, vi } from "vitest";
import { inMemorySessionStore } from "./session-store";
import {
  applyOnrampSessionEvent,
  ONRAMP_SESSION_UPDATED_EVENT,
  type OnrampWebhookEvent,
} from "./webhook-handler";
import type { OnrampSession } from "@/types/onramp";

/** A freshly-created session, the state the POST route leaves behind. */
const CREATED_SESSION: OnrampSession = Object.freeze({
  id: "cos_test_123",
  status: "created",
  clientSecret: "cos_test_123_secret_abc",
  redirectUrl: "https://crypto.link.com/session/cos_test_123",
  grossCents: 5000,
  campaignId: "pcrf",
  donorEmail: "donor@example.com",
});

/**
 * Build a `crypto.onramp_session.updated` event carrying a session object with
 * the given Stripe status. Mirrors the shape Stripe delivers post-verification.
 */
function updatedEvent(
  status: string,
  overrides: {
    id?: string;
    sessionId?: string;
    transactionId?: string | null;
  } = {},
): OnrampWebhookEvent {
  return {
    id: overrides.id ?? "evt_1",
    type: ONRAMP_SESSION_UPDATED_EVENT,
    data: {
      object: {
        id: overrides.sessionId ?? CREATED_SESSION.id,
        object: "crypto.onramp_session",
        status,
        transaction_details:
          overrides.transactionId === undefined
            ? null
            : { transaction_id: overrides.transactionId },
      },
    },
  };
}

describe("applyOnrampSessionEvent()", () => {
  const store = inMemorySessionStore;
  let processedEvents: Set<string>;

  beforeEach(() => {
    store.reset();
    processedEvents = new Set();
    store.put(CREATED_SESSION);
  });

  function deps() {
    return { store, processedEvents };
  }

  it("transitions to 'settled' and captures the tx hash on fulfillment_complete", () => {
    applyOnrampSessionEvent(
      updatedEvent("fulfillment_complete", { transactionId: "0xabc123" }),
      deps(),
    );

    const session = store.get(CREATED_SESSION.id);
    expect(session?.status).toBe("settled");
    expect(session?.txHash).toBe("0xabc123");
  });

  it("transitions to 'failed' on a rejected session", () => {
    applyOnrampSessionEvent(updatedEvent("rejected"), deps());

    expect(store.get(CREATED_SESSION.id)?.status).toBe("failed");
  });

  it("maps in-flight statuses (e.g. fulfillment_processing) to 'pending'", () => {
    applyOnrampSessionEvent(updatedEvent("fulfillment_processing"), deps());

    expect(store.get(CREATED_SESSION.id)?.status).toBe("pending");
  });

  it("maps unknown/future intermediate statuses to 'pending' (forward-compatible)", () => {
    applyOnrampSessionEvent(updatedEvent("some_new_status"), deps());

    expect(store.get(CREATED_SESSION.id)?.status).toBe("pending");
  });

  it("is a no-op for an unknown session id (Stripe may send sessions we don't own)", () => {
    applyOnrampSessionEvent(
      updatedEvent("fulfillment_complete", {
        sessionId: "cos_not_ours",
        transactionId: "0xdead",
      }),
      deps(),
    );

    // Our session is untouched; nothing is created for the foreign id.
    expect(store.get(CREATED_SESSION.id)?.status).toBe("created");
    expect(store.get("cos_not_ours")).toBeUndefined();
  });

  it("is a no-op for event types other than crypto.onramp_session.updated", () => {
    const otherEvent: OnrampWebhookEvent = {
      id: "evt_other",
      type: "payment_intent.succeeded",
      data: { object: { id: CREATED_SESSION.id, status: "rejected" } },
    };

    applyOnrampSessionEvent(otherEvent, deps());

    expect(store.get(CREATED_SESSION.id)?.status).toBe("created");
  });

  it("is a no-op when the event payload is malformed (missing session id)", () => {
    const malformed: OnrampWebhookEvent = {
      id: "evt_malformed",
      type: ONRAMP_SESSION_UPDATED_EVENT,
      data: { object: { status: "fulfillment_complete" } },
    };

    applyOnrampSessionEvent(malformed, deps());

    expect(store.get(CREATED_SESSION.id)?.status).toBe("created");
  });

  it("does not downgrade a settled session (terminal state is absorbing)", () => {
    // Settle first.
    applyOnrampSessionEvent(
      updatedEvent("fulfillment_complete", {
        id: "evt_settle",
        transactionId: "0xfinal",
      }),
      deps(),
    );

    // A late, out-of-order in-flight event for the same session must not revert.
    applyOnrampSessionEvent(
      updatedEvent("fulfillment_processing", { id: "evt_late" }),
      deps(),
    );

    const session = store.get(CREATED_SESSION.id);
    expect(session?.status).toBe("settled");
    expect(session?.txHash).toBe("0xfinal");
  });

  it("does not revert a failed session on a later event", () => {
    applyOnrampSessionEvent(updatedEvent("rejected", { id: "evt_fail" }), deps());
    applyOnrampSessionEvent(
      updatedEvent("fulfillment_processing", { id: "evt_after_fail" }),
      deps(),
    );

    expect(store.get(CREATED_SESSION.id)?.status).toBe("failed");
  });

  it("is idempotent: replaying the same event.id does not re-mutate the store", () => {
    const updateSpy = vi.spyOn(store, "update");
    const event = updatedEvent("fulfillment_processing", { id: "evt_dupe" });

    applyOnrampSessionEvent(event, deps());
    applyOnrampSessionEvent(event, deps());

    expect(store.get(CREATED_SESSION.id)?.status).toBe("pending");
    // The replay short-circuits before touching the store.
    expect(updateSpy).toHaveBeenCalledTimes(1);
    updateSpy.mockRestore();
  });

  it("refuses to settle (throws, leaves session recoverable) when fulfillment_complete lacks a tx hash", () => {
    // Stripe populates transaction_id at fulfillment_complete; if a delivery
    // omits it, settling anyway would write a permanently hash-less terminal
    // record. Throw instead → route 500 → Stripe retries with the hash.
    const event = updatedEvent("fulfillment_complete", { id: "evt_no_hash" });

    expect(() => applyOnrampSessionEvent(event, deps())).toThrow();

    // Session is NOT settled, and the event is NOT marked processed, so a retry
    // carrying the hash can still apply.
    expect(store.get(CREATED_SESSION.id)?.status).toBe("created");
    expect(processedEvents.has("evt_no_hash")).toBe(false);
  });

  it("applies events out of order: fulfillment_complete with no prior pending still settles", () => {
    // No intermediate "pending" event was ever delivered.
    applyOnrampSessionEvent(
      updatedEvent("fulfillment_complete", {
        id: "evt_jump",
        transactionId: "0xjump",
      }),
      deps(),
    );

    expect(store.get(CREATED_SESSION.id)?.status).toBe("settled");
    expect(store.get(CREATED_SESSION.id)?.txHash).toBe("0xjump");
  });
});
