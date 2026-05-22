import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { mswServer } from "../../../vitest.setup";
import { createOnrampSession, STRIPE_ONRAMP_URL } from "./stripe";
import { STRIPE_OK, TEST_ENV, VALID_INPUT } from "./test-fixtures";

describe("createOnrampSession()", () => {
  it("POSTs to the Stripe Crypto Onramp endpoint with bearer auth and form encoding", async () => {
    let authHeader: string | null = null;
    let contentType: string | null = null;

    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, ({ request }) => {
        authHeader = request.headers.get("authorization");
        contentType = request.headers.get("content-type");
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    await createOnrampSession(VALID_INPUT, TEST_ENV);

    expect(authHeader).toBe(`Bearer ${TEST_ENV.STRIPE_SECRET_KEY}`);
    expect(contentType).toContain("application/x-www-form-urlencoded");
  });

  it("sends the exact bracket-encoded body derived from buildSessionRequest", async () => {
    let body: URLSearchParams | null = null;

    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, async ({ request }) => {
        body = new URLSearchParams(await request.text());
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    await createOnrampSession(VALID_INPUT, TEST_ENV);

    expect(body!.get("transaction_details[destination_currency]")).toBe("usdc");
    expect(body!.get("transaction_details[destination_network]")).toBe(
      "base-sepolia",
    );
    expect(body!.get("transaction_details[destination_amount]")).toBe("50.00");
    expect(body!.get("transaction_details[wallet_address]")).toBe(
      TEST_ENV.ROUTER_ADDRESS_BASE_SEPOLIA,
    );
    expect(body!.get("customer_information[email]")).toBe("donor@example.com");
    expect(body!.get("metadata[campaign_id]")).toBe("pcrf");
  });

  it("maps the Stripe response into a domain OnrampSession with status 'created'", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => HttpResponse.json(STRIPE_OK)),
    );

    const session = await createOnrampSession(VALID_INPUT, TEST_ENV);

    expect(session).toEqual({
      id: "cos_test_123",
      status: "created",
      clientSecret: "cos_test_123_secret_abc",
      redirectUrl: "https://crypto.link.com/session/cos_test_123",
      grossCents: 5000,
      campaignId: "pcrf",
      donorEmail: "donor@example.com",
    });
  });

  it("throws with the status and Stripe error body on a non-2xx response", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () =>
        HttpResponse.json(
          { error: { message: "api_key_invalid" } },
          { status: 500 },
        ),
      ),
    );

    await expect(createOnrampSession(VALID_INPUT, TEST_ENV)).rejects.toThrow(
      /Stripe onramp session create failed: 500.*api_key_invalid/,
    );
  });

  it("throws when the Stripe response is missing required fields", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () =>
        HttpResponse.json({ id: "cos_test_123" }),
      ),
    );

    await expect(createOnrampSession(VALID_INPUT, TEST_ENV)).rejects.toThrow(
      /Unexpected Stripe onramp response/,
    );
  });

  it("throws when redirect_url is not a valid URL", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () =>
        HttpResponse.json({ ...STRIPE_OK, redirect_url: "not-a-url" }),
      ),
    );

    await expect(createOnrampSession(VALID_INPUT, TEST_ENV)).rejects.toThrow(
      /Unexpected Stripe onramp response/,
    );
  });

  it("rejects a non-https redirect_url scheme (javascript:) as a defense against a spoofed upstream (L1)", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () =>
        HttpResponse.json({ ...STRIPE_OK, redirect_url: "javascript:alert(1)" }),
      ),
    );

    await expect(createOnrampSession(VALID_INPUT, TEST_ENV)).rejects.toThrow(
      /Unexpected Stripe onramp response/,
    );
  });

  it("rejects an http:// (non-TLS) redirect_url (L1)", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () =>
        HttpResponse.json({ ...STRIPE_OK, redirect_url: "http://crypto.link.com/x" }),
      ),
    );

    await expect(createOnrampSession(VALID_INPUT, TEST_ENV)).rejects.toThrow(
      /Unexpected Stripe onramp response/,
    );
  });

  it("propagates buildSessionRequest validation errors before any network call", async () => {
    // No handler registered: if a request escaped, MSW's onUnhandledRequest:"error" would
    // throw a different "[MSW]" error. A /grossCents/ error proves we failed fast pre-fetch.
    await expect(
      createOnrampSession({ ...VALID_INPUT, grossCents: 0 }, TEST_ENV),
    ).rejects.toThrow(/grossCents/);
  });
});
