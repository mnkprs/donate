/**
 * Unit tests for the Sentry PII scrubber (Epic 7, issue #29).
 *
 * Verifies that `scrubSentryEvent` and `scrubSentryBreadcrumb`:
 *  - redact Stripe session ids (cs_test_…, cs_live_…, cos_…) to "[REDACTED]"
 *  - truncate Ethereum wallet addresses (0x + 40 hex) to "0xABCD…WXYZ" (first 6 + last 4)
 *  - truncate transaction hashes (0x + 64 hex) to "0xABCD…WXYZ" (first 6 + last 4)
 *  - redact email addresses to "[REDACTED]"
 *  - cover event.message, exception values, request url/query_string,
 *    tags, extra, contexts, and breadcrumb message/data fields
 *  - never return null (always return the scrubbed event — never drop it)
 *  - pass through events with no PII unchanged
 *
 * No @sentry/nextjs imports — scrubPii is a pure module.
 */

import { describe, expect, it } from "vitest";
import { scrubSentryEvent, scrubSentryBreadcrumb } from "./scrubPii";
import type { ScrubbableEvent, ScrubbableBreadcrumb } from "./scrubPii";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STRIPE_CHECKOUT_SESSION_TEST = "cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6";
const STRIPE_CHECKOUT_SESSION_LIVE = "cs_live_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6";
const STRIPE_ONRAMP_SESSION = "cos_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6";

// Ethereum wallet address: 0x + 40 hex chars
const WALLET_ADDRESS = "0xe0adb1c4f2a3B9d8e7f6A5b4C3d2E1f0A9b8C7d6";
// Transaction hash: 0x + 64 hex chars
const TX_HASH =
  "0xdc67a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0";
const EMAIL = "donor@example.com";

const REDACTED = "[REDACTED]";

// Expected truncated forms (first 6 + last 4 chars, unicode ellipsis)
const WALLET_SHORT = `${WALLET_ADDRESS.slice(0, 6)}…${WALLET_ADDRESS.slice(-4)}`;
const TX_HASH_SHORT = `${TX_HASH.slice(0, 6)}…${TX_HASH.slice(-4)}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<ScrubbableEvent> = {}): ScrubbableEvent {
  return { ...overrides };
}

// ── scrubSentryEvent ──────────────────────────────────────────────────────────

describe("scrubSentryEvent()", () => {
  describe("event.message", () => {
    it("redacts a Stripe checkout session id (cs_test_…) from event.message", () => {
      // Arrange
      const event = makeEvent({
        message: `Onramp event ${STRIPE_CHECKOUT_SESSION_TEST} failed`,
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.message).not.toContain(STRIPE_CHECKOUT_SESSION_TEST);
      expect(result!.message).toContain(REDACTED);
    });

    it("redacts a Stripe checkout session id (cs_live_…) from event.message", () => {
      // Arrange
      const event = makeEvent({
        message: `Session ${STRIPE_CHECKOUT_SESSION_LIVE} reported settlement`,
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.message).not.toContain(STRIPE_CHECKOUT_SESSION_LIVE);
      expect(result!.message).toContain(REDACTED);
    });

    it("redacts a Stripe onramp session id (cos_…) from event.message", () => {
      // Arrange
      const event = makeEvent({
        message: `Onramp session ${STRIPE_ONRAMP_SESSION} failed`,
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.message).not.toContain(STRIPE_ONRAMP_SESSION);
      expect(result!.message).toContain(REDACTED);
    });

    it("truncates a wallet address in event.message to first-6/last-4", () => {
      // Arrange
      const event = makeEvent({ message: `donor address ${WALLET_ADDRESS}` });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.message).not.toContain(WALLET_ADDRESS);
      expect(result!.message).toContain(WALLET_SHORT);
    });

    it("truncates a tx hash in event.message to first-6/last-4", () => {
      // Arrange
      const event = makeEvent({ message: `settlement tx ${TX_HASH}` });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.message).not.toContain(TX_HASH);
      expect(result!.message).toContain(TX_HASH_SHORT);
    });

    it("redacts an email address in event.message", () => {
      // Arrange
      const event = makeEvent({ message: `donor email ${EMAIL}` });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.message).not.toContain(EMAIL);
      expect(result!.message).toContain(REDACTED);
    });
  });

  describe("event.exception.values[*].value", () => {
    it("redacts a Stripe session id from exception value", () => {
      // Arrange
      const event = makeEvent({
        exception: {
          values: [
            {
              value: `Onramp event ${STRIPE_CHECKOUT_SESSION_TEST} reported settlement for ${STRIPE_ONRAMP_SESSION} without a transaction_id`,
            },
          ],
        },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      const val = result!.exception!.values![0]!.value!;
      expect(val).not.toContain(STRIPE_CHECKOUT_SESSION_TEST);
      expect(val).not.toContain(STRIPE_ONRAMP_SESSION);
      expect(val).toContain(REDACTED);
    });

    it("truncates a wallet address from exception value", () => {
      // Arrange
      const event = makeEvent({
        exception: {
          values: [{ value: `address ${WALLET_ADDRESS} not found` }],
        },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      const val = result!.exception!.values![0]!.value!;
      expect(val).not.toContain(WALLET_ADDRESS);
      expect(val).toContain(WALLET_SHORT);
    });
  });

  describe("event.request.url and event.request.query_string", () => {
    it("redacts a Stripe session id from request.url", () => {
      // Arrange
      const event = makeEvent({
        request: {
          url: `https://example.com/api/checkout?session_id=${STRIPE_CHECKOUT_SESSION_TEST}`,
        },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.request!.url).not.toContain(STRIPE_CHECKOUT_SESSION_TEST);
    });

    it("redacts a Stripe session id from request.query_string", () => {
      // Arrange
      const event = makeEvent({
        request: {
          query_string: `session_id=${STRIPE_CHECKOUT_SESSION_LIVE}`,
        },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.request!.query_string).not.toContain(
        STRIPE_CHECKOUT_SESSION_LIVE,
      );
    });

    it("redacts an email from request.url", () => {
      // Arrange
      const event = makeEvent({
        request: { url: `https://example.com/api?email=${EMAIL}` },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.request!.url).not.toContain(EMAIL);
    });
  });

  describe("event.tags", () => {
    it("redacts a Stripe session id from a tag value", () => {
      // Arrange
      const event = makeEvent({
        tags: { session_id: STRIPE_CHECKOUT_SESSION_TEST },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      const tagVal = result!.tags!["session_id"];
      expect(tagVal).not.toContain(STRIPE_CHECKOUT_SESSION_TEST);
    });

    it("redacts an email from a tag value", () => {
      // Arrange
      const event = makeEvent({ tags: { donor: EMAIL } });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result!.tags!["donor"]).not.toContain(EMAIL);
      expect(result!.tags!["donor"]).toContain(REDACTED);
    });
  });

  describe("event.extra", () => {
    it("redacts a Stripe session id embedded in an extra string value", () => {
      // Arrange
      const event = makeEvent({
        extra: { info: `session=${STRIPE_CHECKOUT_SESSION_TEST}` },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(String(result!.extra!["info"])).not.toContain(
        STRIPE_CHECKOUT_SESSION_TEST,
      );
    });
  });

  describe("event.contexts", () => {
    it("redacts a wallet address in a context string value", () => {
      // Arrange
      const event = makeEvent({
        contexts: { wallet: { address: WALLET_ADDRESS } },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(String(result!.contexts!["wallet"]!["address"])).not.toContain(
        WALLET_ADDRESS,
      );
      expect(String(result!.contexts!["wallet"]!["address"])).toContain(
        WALLET_SHORT,
      );
    });
  });

  describe("event.breadcrumbs", () => {
    it("redacts a Stripe session id from a breadcrumb message on the event", () => {
      // Arrange
      const event = makeEvent({
        breadcrumbs: {
          values: [
            {
              message: `Processing session ${STRIPE_CHECKOUT_SESSION_TEST}`,
            },
          ],
        },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      const crumb = result!.breadcrumbs!.values![0]!;
      expect(crumb.message).not.toContain(STRIPE_CHECKOUT_SESSION_TEST);
      expect(crumb.message).toContain(REDACTED);
    });

    it("redacts a wallet address from breadcrumb data string values", () => {
      // Arrange
      const event = makeEvent({
        breadcrumbs: {
          values: [
            {
              data: { donor: WALLET_ADDRESS },
            },
          ],
        },
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      const crumb = result!.breadcrumbs!.values![0]!;
      expect(String(crumb.data!["donor"])).not.toContain(WALLET_ADDRESS);
      expect(String(crumb.data!["donor"])).toContain(WALLET_SHORT);
    });
  });

  describe("pass-through (no PII)", () => {
    it("returns a non-null event when there is no PII", () => {
      // Arrange
      const event = makeEvent({ message: "A plain error with no PII" });

      // Act
      const result = scrubSentryEvent(event);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.message).toBe("A plain error with no PII");
    });

    it("returns null input unchanged (null stays null — caller should not drop)", () => {
      // scrubSentryEvent is called on a ScrubbableEvent; passing null is outside
      // the contract but verify graceful handling at runtime just in case.
      const result = scrubSentryEvent(null as unknown as ScrubbableEvent);
      expect(result).toBeNull();
    });
  });

  describe("never drops the event", () => {
    it("always returns the event object (not null) even when PII is found", () => {
      // Arrange
      const event = makeEvent({
        message: `session ${STRIPE_CHECKOUT_SESSION_TEST} and tx ${TX_HASH}`,
      });

      // Act
      const result = scrubSentryEvent(event);

      // Assert — Sentry drops events when beforeSend returns null; we must not
      expect(result).not.toBeNull();
    });
  });
});

// ── scrubSentryBreadcrumb ────────────────────────────────────────────────────

describe("scrubSentryBreadcrumb()", () => {
  it("redacts a Stripe session id from breadcrumb.message", () => {
    // Arrange
    const crumb: ScrubbableBreadcrumb = {
      message: `Checkout session ${STRIPE_CHECKOUT_SESSION_TEST} started`,
    };

    // Act
    const result = scrubSentryBreadcrumb(crumb);

    // Assert
    expect(result).not.toBeNull();
    expect(result!.message).not.toContain(STRIPE_CHECKOUT_SESSION_TEST);
    expect(result!.message).toContain(REDACTED);
  });

  it("truncates a wallet address in breadcrumb.message", () => {
    // Arrange
    const crumb: ScrubbableBreadcrumb = {
      message: `donor ${WALLET_ADDRESS} paid`,
    };

    // Act
    const result = scrubSentryBreadcrumb(crumb);

    // Assert
    expect(result!.message).not.toContain(WALLET_ADDRESS);
    expect(result!.message).toContain(WALLET_SHORT);
  });

  it("redacts an email in breadcrumb.message", () => {
    // Arrange
    const crumb: ScrubbableBreadcrumb = { message: `emailed ${EMAIL}` };

    // Act
    const result = scrubSentryBreadcrumb(crumb);

    // Assert
    expect(result!.message).not.toContain(EMAIL);
    expect(result!.message).toContain(REDACTED);
  });

  it("redacts a Stripe session id in breadcrumb.data string values", () => {
    // Arrange
    const crumb: ScrubbableBreadcrumb = {
      data: { session: STRIPE_CHECKOUT_SESSION_LIVE },
    };

    // Act
    const result = scrubSentryBreadcrumb(crumb);

    // Assert
    expect(String(result!.data!["session"])).not.toContain(
      STRIPE_CHECKOUT_SESSION_LIVE,
    );
  });

  it("passes through a breadcrumb with no PII", () => {
    // Arrange
    const crumb: ScrubbableBreadcrumb = { message: "User clicked submit" };

    // Act
    const result = scrubSentryBreadcrumb(crumb);

    // Assert
    expect(result).not.toBeNull();
    expect(result!.message).toBe("User clicked submit");
  });

  it("never returns null (breadcrumbs are not dropped, just scrubbed)", () => {
    // Arrange
    const crumb: ScrubbableBreadcrumb = {
      message: `${STRIPE_CHECKOUT_SESSION_TEST} ${EMAIL} ${TX_HASH}`,
    };

    // Act
    const result = scrubSentryBreadcrumb(crumb);

    // Assert
    expect(result).not.toBeNull();
  });
});
