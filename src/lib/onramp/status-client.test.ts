import { afterEach, describe, expect, test, vi } from "vitest";

import { fetchOnrampStatus } from "@/lib/onramp/status-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOnrampStatus", () => {
  test("GETs the status route for the session and returns the parsed body", async () => {
    const body = {
      sessionId: "cos_test_123",
      status: "pending",
      campaignId: "pcrf",
      grossCents: 500,
    };
    const fetchMock = vi.fn(
      async (_url: string) => new Response(JSON.stringify(body), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOnrampStatus("cos_test_123");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/onramp/status/cos_test_123");
    expect(result).toEqual(body);
  });

  test("encodes the session id into the path", async () => {
    const fetchMock = vi.fn(
      async (_url: string) =>
        new Response(JSON.stringify({ status: "created" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchOnrampStatus("cos/with space");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/onramp/status/cos%2Fwith%20space");
  });

  test("throws on a non-OK response", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOnrampStatus("missing")).rejects.toThrow(/404/);
  });
});
