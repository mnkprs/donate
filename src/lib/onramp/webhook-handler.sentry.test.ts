/**
 * Sentry error-capture coverage for the on-ramp webhook handler (Epic 7, 1B).
 *
 * Verifies that `applyOnrampSessionEvent`:
 *  - calls `Sentry.captureException` on the failure path (hash-less settlement),
 *  - does NOT call it on a successful apply,
 *  - attaches NO donor PII (the call carries only the Error — no session,
 *    donor email, client secret, or tx hash).
 *
 * `@sentry/nextjs` is mocked so the assertions are about *what we pass*, not
 * about reaching a real Sentry project. Mirrors the vitest style in
 * `webhook-handler.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { createInMemoryKvStore } from "@/lib/kv/kv-store";
import { inMemorySessionStore } from "./session-store";
import {
  applyOnrampSessionEvent,
  createProcessedEventLog,
  ONRAMP_SESSION_UPDATED_EVENT,
  type OnrampWebhookEvent,
  type ProcessedEventLog,
} from "./webhook-handler";
import type { OnrampSession } from "@/types/onramp";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const captureException = vi.mocked(Sentry.captureException);

const CREATED_SESSION: OnrampSession = Object.freeze({
  id: "cos_test_123",
  status: "created",
  clientSecret: "cos_test_123_secret_abc",
  redirectUrl: "https://crypto.link.com/session/cos_test_123",
  grossCents: 5000,
  campaignId: "pcrf",
  donorEmail: "donor@example.com",
});

function updatedEvent(
  status: string,
  overrides: { id?: string; transactionId?: string | null } = {},
): OnrampWebhookEvent {
  return {
    id: overrides.id ?? "evt_1",
    type: ONRAMP_SESSION_UPDATED_EVENT,
    data: {
      object: {
        id: CREATED_SESSION.id,
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

describe("applyOnrampSessionEvent() Sentry capture", () => {
  const store = inMemorySessionStore;
  let processedEvents: ProcessedEventLog;

  beforeEach(async () => {
    captureException.mockClear();
    await store.reset();
    processedEvents = createProcessedEventLog(createInMemoryKvStore());
    await store.put(CREATED_SESSION);
  });

  function deps() {
    return { store, processedEvents };
  }

  it("captures the exception on the failure path (settlement without a tx hash)", async () => {
    await expect(
      applyOnrampSessionEvent(
        updatedEvent("fulfillment_complete", { id: "evt_no_hash" }),
        deps(),
      ),
    ).rejects.toThrow();

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("does NOT capture anything on a successful apply", async () => {
    await applyOnrampSessionEvent(
      updatedEvent("fulfillment_complete", { transactionId: "0xabc123" }),
      deps(),
    );

    expect(captureException).not.toHaveBeenCalled();
  });

  it("attaches no donor PII — captures the Error only, with no extra context arg", async () => {
    await expect(
      applyOnrampSessionEvent(
        updatedEvent("fulfillment_complete", { id: "evt_pii_check" }),
        deps(),
      ),
    ).rejects.toThrow();

    expect(captureException).toHaveBeenCalledTimes(1);
    const [captured, secondArg] = captureException.mock.calls[0];

    // Only the Error is passed — no session/PII-carrying context object.
    expect(captured).toBeInstanceOf(Error);
    expect(secondArg).toBeUndefined();

    // Defense-in-depth: the serialized call must not leak donor PII or secrets.
    const serialized = JSON.stringify(
      captureException.mock.calls[0],
      Object.getOwnPropertyNames((captured as Error)),
    );
    expect(serialized).not.toContain(CREATED_SESSION.donorEmail);
    expect(serialized).not.toContain(CREATED_SESSION.clientSecret);
  });
});
