import { beforeEach, describe, expect, it } from "vitest";
import { inMemorySessionStore } from "@/lib/onramp/session-store";
import type { OnrampSession } from "@/types/onramp";
import { handleGetStatus } from "./route";

/** A fully-populated stored session, including the fields the status route must NOT leak. */
function makeSession(overrides: Partial<OnrampSession> = {}): OnrampSession {
  return {
    id: "cos_test_123",
    status: "created",
    clientSecret: "cos_test_123_secret_abc",
    redirectUrl: "https://crypto.link.com/session/cos_test_123",
    grossCents: 5000,
    campaignId: "pcrf",
    donorEmail: "donor@example.com",
    ...overrides,
  };
}

function paramsFor(sessionId: string): Promise<{ sessionId: string }> {
  return Promise.resolve({ sessionId });
}

describe("GET /api/onramp/status/[sessionId] — handleGetStatus()", () => {
  // Process-global singleton; reset per test for isolation.
  const store = inMemorySessionStore;

  beforeEach(() => {
    store.reset();
  });

  function deps() {
    return { store };
  }

  it("returns 200 with the narrow status projection for a known session", async () => {
    store.put(makeSession());

    const res = await handleGetStatus(paramsFor("cos_test_123"), deps());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      sessionId: "cos_test_123",
      status: "created",
      campaignId: "pcrf",
      grossCents: 5000,
    });
  });

  it("never leaks the clientSecret, donor email, or redirect URL", async () => {
    store.put(makeSession());

    const res = await handleGetStatus(paramsFor("cos_test_123"), deps());
    const body = await res.json();

    expect(body).not.toHaveProperty("clientSecret");
    expect(body).not.toHaveProperty("donorEmail");
    expect(body).not.toHaveProperty("redirectUrl");
  });

  it("includes txHash once the session is settled", async () => {
    store.put(
      makeSession({ status: "settled", txHash: "0xabc123def456" }),
    );

    const res = await handleGetStatus(paramsFor("cos_test_123"), deps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("settled");
    expect(body.txHash).toBe("0xabc123def456");
  });

  it("omits txHash entirely (not null) for a non-settled session", async () => {
    store.put(makeSession({ status: "pending" }));

    const res = await handleGetStatus(paramsFor("cos_test_123"), deps());
    const body = await res.json();

    expect(body.status).toBe("pending");
    expect(body).not.toHaveProperty("txHash");
  });

  it("returns 404 with a typed not_found envelope for an unknown id", async () => {
    const res = await handleGetStatus(paramsFor("cos_does_not_exist"), deps());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("not_found");
    expect(typeof body.error.message).toBe("string");
  });

  it("sets Cache-Control: no-store (user-specific, polled state)", async () => {
    store.put(makeSession());

    const res = await handleGetStatus(paramsFor("cos_test_123"), deps());

    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
