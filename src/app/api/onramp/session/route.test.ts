import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mswServer } from "../../../../../vitest.setup";
import { createInMemoryKvStore } from "@/lib/kv/kv-store";
import { logger } from "@/lib/log/logger";
import { STRIPE_ONRAMP_URL } from "@/lib/onramp/stripe";
import {
  createIdempotencyIndex,
  inMemorySessionStore,
  type IdempotencyIndex,
} from "@/lib/onramp/session-store";
import { STRIPE_OK, TEST_ENV } from "@/lib/onramp/test-fixtures";
import { createRateLimiter, type RateLimiter } from "@/lib/ratelimit/rate-limiter";
import { CLIENT_REQUEST_ID_HEADER, handleCreateSession } from "./route";

const VALID_BODY = {
  campaignId: "pcrf",
  grossCents: 5000,
  email: "donor@example.com",
} as const;

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/onramp/session", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/onramp/session — handleCreateSession()", () => {
  // The store is a process-global singleton; reset it per test for isolation.
  // The idempotency index is route-level, injected fresh each test.
  const store = inMemorySessionStore;
  let idempotency: IdempotencyIndex;

  beforeEach(async () => {
    await store.reset();
    idempotency = createIdempotencyIndex(createInMemoryKvStore());
  });

  function deps() {
    return { env: TEST_ENV, store, idempotency };
  }

  it("returns 200 with sessionId + redirectUrl and persists a 'created' session", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => HttpResponse.json(STRIPE_OK)),
    );

    const res = await handleCreateSession(makeRequest(VALID_BODY), deps());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      sessionId: "cos_test_123",
      redirectUrl: "https://crypto.link.com/session/cos_test_123",
    });

    const persisted = await store.get("cos_test_123");
    expect(persisted?.status).toBe("created");
    expect(persisted?.grossCents).toBe(5000);
  });

  it("returns 400 invalid_request when email is missing", async () => {
    const noEmail = {
      campaignId: VALID_BODY.campaignId,
      grossCents: VALID_BODY.grossCents,
    };
    const res = await handleCreateSession(makeRequest(noEmail), deps());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
  });

  it("returns 400 invalid_request when grossCents is not positive", async () => {
    const res = await handleCreateSession(
      makeRequest({ ...VALID_BODY, grossCents: 0 }),
      deps(),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it("returns 400 invalid_request when the body is not valid JSON", async () => {
    const res = await handleCreateSession(makeRequest("{not json"), deps());

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it("returns 502 provider_error and persists nothing when Stripe fails", async () => {
    const logSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () =>
        HttpResponse.json({ error: { message: "boom" } }, { status: 500 }),
      ),
    );

    const res = await handleCreateSession(makeRequest(VALID_BODY), deps());

    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("provider_error");
    // Provider failure is logged through the structured logger, not console (L3).
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toMatchObject({ scope: "onramp/session" });
    logSpy.mockRestore();
    // Nothing persisted on the provider-failure path.
    expect(await store.get("cos_test_123")).toBeUndefined();
  });

  it("is idempotent: same clientRequestId returns the cached session and calls Stripe once", async () => {
    let stripeCalls = 0;
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => {
        stripeCalls += 1;
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    const headers = { [CLIENT_REQUEST_ID_HEADER]: "req_abc" };

    const first = await handleCreateSession(
      makeRequest(VALID_BODY, headers),
      deps(),
    );
    const second = await handleCreateSession(
      makeRequest(VALID_BODY, headers),
      deps(),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual(await second.json());
    expect(stripeCalls).toBe(1);
  });

  it("rejects key-reuse with a different payload (409-style conflict) and does not re-call Stripe", async () => {
    let stripeCalls = 0;
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => {
        stripeCalls += 1;
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    const headers = { [CLIENT_REQUEST_ID_HEADER]: "req_conflict" };

    const first = await handleCreateSession(
      makeRequest(VALID_BODY, headers),
      deps(),
    );
    // Same idempotency key, DIFFERENT payload → must not return the first
    // donor's session. Stripe's own contract: reuse-with-different-params errors.
    const conflict = await handleCreateSession(
      makeRequest({ ...VALID_BODY, email: "someone-else@example.com" }, headers),
      deps(),
    );

    expect(first.status).toBe(200);
    expect(conflict.status).toBe(400);
    expect((await conflict.json()).error.code).toBe("invalid_request");
    expect(stripeCalls).toBe(1);
  });

  it("returns 400 for a malformed retry body even when the clientRequestId is present", async () => {
    let stripeCalls = 0;
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => {
        stripeCalls += 1;
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    const headers = { [CLIENT_REQUEST_ID_HEADER]: "req_garbage" };

    const first = await handleCreateSession(
      makeRequest(VALID_BODY, headers),
      deps(),
    );
    // Body is parsed/validated BEFORE the idempotency check, so garbage 400s.
    const retry = await handleCreateSession(
      makeRequest("{not json", headers),
      deps(),
    );

    expect(first.status).toBe(200);
    expect(retry.status).toBe(400);
    expect((await retry.json()).error.code).toBe("invalid_request");
    expect(stripeCalls).toBe(1);
  });

  it("recreates the session when the idempotency entry is dangling (session evicted)", async () => {
    let stripeCalls = 0;
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => {
        stripeCalls += 1;
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    const headers = { [CLIENT_REQUEST_ID_HEADER]: "req_dangle" };

    const first = await handleCreateSession(
      makeRequest(VALID_BODY, headers),
      deps(),
    );
    // Simulate a process restart: the in-memory session is gone, but the
    // route-level idempotency entry still points at it.
    await store.reset();
    const second = await handleCreateSession(
      makeRequest(VALID_BODY, headers),
      deps(),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Fell through and recreated rather than returning a dangling reference.
    expect(stripeCalls).toBe(2);
    expect(await store.get("cos_test_123")).toBeDefined();
  });

  it("under concurrency, two same-key creates call Stripe once and both get the same session (M1 TOCTOU)", async () => {
    // Gate the Stripe response so the FIRST (winning) request is still in-flight
    // when the SECOND arrives — the exact interleaving the TOCTOU race needs.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let stripeCalls = 0;
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, async () => {
        stripeCalls += 1;
        await gate;
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    const headers = { [CLIENT_REQUEST_ID_HEADER]: "req_race" };
    const yieldLoop = () => new Promise((r) => setImmediate(r));

    // A starts, wins the reservation, and parks on the gated Stripe call.
    const a = handleCreateSession(makeRequest(VALID_BODY, headers), deps());
    await yieldLoop();
    // B starts: it must observe A's reservation and wait, not call Stripe again.
    const b = handleCreateSession(makeRequest(VALID_BODY, headers), deps());
    await yieldLoop();
    release();

    const [ra, rb] = await Promise.all([a, b]);

    expect(ra.status).toBe(200);
    expect(rb.status).toBe(200);
    expect(await ra.json()).toEqual(await rb.json());
    expect(stripeCalls).toBe(1);
  });

  it("returns 400 when clientRequestId exceeds the allowed length", async () => {
    const res = await handleCreateSession(
      makeRequest(VALID_BODY, {
        [CLIENT_REQUEST_ID_HEADER]: "x".repeat(129),
      }),
      deps(),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it("rejects an over-cap grossCents above MAX_AMOUNT_CENTS with 400", async () => {
    const res = await handleCreateSession(
      makeRequest({ ...VALID_BODY, grossCents: 2_000_000 }),
      deps(),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it("returns 429 rate_limited and never calls Stripe once the limiter denies (H1)", async () => {
    let stripeCalls = 0;
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => {
        stripeCalls += 1;
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    const denying: RateLimiter = {
      check: async () => ({ allowed: false, limit: 0, remaining: 0, resetAt: 0 }),
    };

    const res = await handleCreateSession(makeRequest(VALID_BODY), {
      ...deps(),
      rateLimiter: denying,
    });

    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("rate_limited");
    // Throttled before any provider work.
    expect(stripeCalls).toBe(0);
  });

  it("allows the request through when within the rate-limit budget", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => HttpResponse.json(STRIPE_OK)),
    );

    const limiter = createRateLimiter(createInMemoryKvStore(), {
      limit: 5,
      windowSeconds: 60,
    });

    const res = await handleCreateSession(makeRequest(VALID_BODY), {
      ...deps(),
      rateLimiter: limiter,
    });

    expect(res.status).toBe(200);
  });

  it("fails open and proceeds to create when the limiter throws (Decision 2)", async () => {
    let stripeCalls = 0;
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => {
        stripeCalls += 1;
        return HttpResponse.json(STRIPE_OK);
      }),
    );

    // A KV blip on the throttle path must never block a donor: the limiter
    // throwing is treated as "allow", logged at warn, and the create proceeds.
    const throwing: RateLimiter = {
      check: async () => {
        throw new Error("kv unreachable");
      },
    };
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    const res = await handleCreateSession(makeRequest(VALID_BODY), {
      ...deps(),
      rateLimiter: throwing,
    });

    expect(res.status).toBe(200);
    expect(stripeCalls).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("sends a Retry-After header (integer seconds from resetAt) on a 429", async () => {
    const resetAt = Date.now() + 45_000;
    const denying: RateLimiter = {
      check: async () => ({ allowed: false, limit: 5, remaining: 0, resetAt }),
    };

    const res = await handleCreateSession(makeRequest(VALID_BODY), {
      ...deps(),
      rateLimiter: denying,
    });

    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    const seconds = Number(retryAfter);
    expect(Number.isInteger(seconds)).toBe(true);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(45);
  });

  it("keys the limiter by IP + campaignId (same IP, different campaign → distinct keys)", async () => {
    mswServer.use(
      http.post(STRIPE_ONRAMP_URL, () => HttpResponse.json(STRIPE_OK)),
    );

    const seen: string[] = [];
    const recording: RateLimiter = {
      check: async (identifier) => {
        seen.push(identifier);
        return { allowed: true, limit: 5, remaining: 4, resetAt: 0 };
      },
    };
    const sharedIp = { "x-forwarded-for": "203.0.113.7" };

    await handleCreateSession(
      makeRequest({ ...VALID_BODY, campaignId: "alpha" }, sharedIp),
      { ...deps(), rateLimiter: recording },
    );
    await handleCreateSession(
      makeRequest({ ...VALID_BODY, campaignId: "bravo" }, sharedIp),
      { ...deps(), rateLimiter: recording },
    );

    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[0]).toContain("203.0.113.7");
    expect(seen[0]).toContain("alpha");
    expect(seen[1]).toContain("bravo");
  });
});
