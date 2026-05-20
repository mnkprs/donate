import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mswServer } from "../../../vitest.setup";
import { CLIENT_REQUEST_ID_HEADER } from "@/app/api/onramp/session/route";
import type { CheckoutPayload } from "@/types/checkout";
import type { OnrampErrorBody } from "@/types/onramp";
import { OnrampError, realSubmit, SESSION_ENDPOINT } from "./realSubmit";

/**
 * The unit test env is `node` (vitest.config.ts), so `fetch` needs an ABSOLUTE
 * URL or it rejects on URL parsing before MSW can intercept. In the browser
 * `realSubmit` uses a same-origin relative path; tests inject this base.
 */
const TEST_BASE = "http://localhost";
const SESSION_URL = `${TEST_BASE}${SESSION_ENDPOINT}`;

const PAYLOAD: CheckoutPayload = Object.freeze({
  campaignId: "pcrf",
  grossCents: 5000,
  email: "donor@example.com",
  note: "keep it up",
});

/** Stripe-style success body the route returns on 200. */
const OK_BODY = Object.freeze({
  sessionId: "cos_test_123",
  redirectUrl: "https://crypto.link.com/session/cos_test_123",
});

/** RFC-4122 v4 UUID, the shape `crypto.randomUUID()` produces. */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function call(): Promise<unknown> {
  return realSubmit(PAYLOAD, { baseUrl: TEST_BASE });
}

describe("realSubmit()", () => {
  it("POSTs the JSON-serialized CheckoutPayload to /api/onramp/session", async () => {
    let method: string | null = null;
    let contentType: string | null = null;
    let body: unknown = null;

    mswServer.use(
      http.post(SESSION_URL, async ({ request }) => {
        method = request.method;
        contentType = request.headers.get("content-type");
        body = await request.json();
        return HttpResponse.json(OK_BODY, { status: 200 });
      }),
    );

    await call();

    expect(method).toBe("POST");
    expect(contentType).toContain("application/json");
    expect(body).toEqual(PAYLOAD);
  });

  it("sends a fresh UUID idempotency key under the shared header constant", async () => {
    let header: string | null = null;

    mswServer.use(
      http.post(SESSION_URL, ({ request }) => {
        header = request.headers.get(CLIENT_REQUEST_ID_HEADER);
        return HttpResponse.json(OK_BODY, { status: 200 });
      }),
    );

    await call();

    expect(header).toMatch(UUID_V4);
  });

  it("uses a DIFFERENT idempotency key on each call (per-attempt, not stable)", async () => {
    const keys: string[] = [];

    mswServer.use(
      http.post(SESSION_URL, ({ request }) => {
        keys.push(request.headers.get(CLIENT_REQUEST_ID_HEADER) ?? "");
        return HttpResponse.json(OK_BODY, { status: 200 });
      }),
    );

    await call();
    await call();

    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("returns the narrow { sessionId, redirectUrl } on 200", async () => {
    mswServer.use(
      http.post(SESSION_URL, () => HttpResponse.json(OK_BODY, { status: 200 })),
    );

    const result = await realSubmit(PAYLOAD, { baseUrl: TEST_BASE });

    expect(result).toEqual({
      sessionId: "cos_test_123",
      redirectUrl: "https://crypto.link.com/session/cos_test_123",
    });
  });

  it("throws OnrampError carrying the server code+message on a 4xx error envelope", async () => {
    const envelope: OnrampErrorBody = {
      error: { code: "invalid_request", message: "grossCents is below the minimum" },
    };
    mswServer.use(
      http.post(SESSION_URL, () => HttpResponse.json(envelope, { status: 400 })),
    );

    await expect(call()).rejects.toMatchObject({
      name: "OnrampError",
      code: "invalid_request",
      message: "grossCents is below the minimum",
    });
  });

  it("preserves the provider_error code from a 502", async () => {
    const envelope: OnrampErrorBody = {
      error: {
        code: "provider_error",
        message: "Unable to create on-ramp session with the payment provider",
      },
    };
    mswServer.use(
      http.post(SESSION_URL, () => HttpResponse.json(envelope, { status: 502 })),
    );

    await expect(call()).rejects.toMatchObject({ code: "provider_error" });
  });

  it("preserves the rate_limited code+message from a 429 (H1 surfaces to the donor)", async () => {
    const envelope: OnrampErrorBody = {
      error: {
        code: "rate_limited",
        message: "Too many requests. Please slow down and try again shortly.",
      },
    };
    mswServer.use(
      http.post(SESSION_URL, () => HttpResponse.json(envelope, { status: 429 })),
    );

    await expect(call()).rejects.toMatchObject({
      name: "OnrampError",
      code: "rate_limited",
      message: "Too many requests. Please slow down and try again shortly.",
    });
  });

  it("throws code 'unexpected_response' on a non-2xx body that is not an error envelope", async () => {
    mswServer.use(
      http.post(SESSION_URL, () =>
        HttpResponse.text("<html>502 Bad Gateway</html>", { status: 502 }),
      ),
    );

    await expect(call()).rejects.toMatchObject({ code: "unexpected_response" });
  });

  it("throws code 'unexpected_response' when a 200 body is missing required fields", async () => {
    mswServer.use(
      http.post(SESSION_URL, () =>
        HttpResponse.json({ sessionId: "cos_test_123" }, { status: 200 }),
      ),
    );

    await expect(call()).rejects.toMatchObject({ code: "unexpected_response" });
  });

  it("throws code 'network_error' when fetch itself rejects (offline/DNS)", async () => {
    mswServer.use(http.post(SESSION_URL, () => HttpResponse.error()));

    await expect(call()).rejects.toMatchObject({ code: "network_error" });
  });

  it("throws an Error instance so CheckoutForm.errorMessage() can read .message", async () => {
    mswServer.use(http.post(SESSION_URL, () => HttpResponse.error()));

    const error = await call().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OnrampError);
    expect((error as OnrampError).message.length).toBeGreaterThan(0);
  });
});
