import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CheckoutPayload } from "@/types/checkout";

// Mock only realSubmit; keep OnrampError (and everything else) real so the
// adapter's error propagation is tested against the genuine error type.
vi.mock("./realSubmit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./realSubmit")>();
  return { ...actual, realSubmit: vi.fn() };
});

// Mock the analytics chokepoint so we assert the onramp_started funnel event
// without hitting Vercel Analytics. amountBucket stays real (pure mapping).
vi.mock("@/lib/analytics/events", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/analytics/events")>();
  return { ...actual, trackOnrampStarted: vi.fn() };
});

import { trackOnrampStarted } from "@/lib/analytics/events";
import { OnrampError, realSubmit } from "./realSubmit";
import { submitDonation } from "./submitDonation";

const mockRealSubmit = vi.mocked(realSubmit);
const mockTrackOnrampStarted = vi.mocked(trackOnrampStarted);

const PAYLOAD: CheckoutPayload = Object.freeze({
  campaignId: "pcrf",
  grossCents: 5000,
  email: "donor@example.com",
});

describe("submitDonation()", () => {
  beforeEach(() => {
    mockRealSubmit.mockReset();
    mockTrackOnrampStarted.mockReset();
  });

  it("redirects the donor to the server-provided redirectUrl on success", async () => {
    mockRealSubmit.mockResolvedValue({
      sessionId: "cos_test_123",
      redirectUrl: "https://crypto.link.com/session/cos_test_123",
    });
    const redirect = vi.fn();

    await submitDonation(PAYLOAD, { redirect });

    expect(mockRealSubmit).toHaveBeenCalledWith(PAYLOAD);
    expect(redirect).toHaveBeenCalledExactlyOnceWith(
      "https://crypto.link.com/session/cos_test_123",
    );
  });

  it("propagates the OnrampError and does NOT redirect when realSubmit fails", async () => {
    mockRealSubmit.mockRejectedValue(
      new OnrampError("provider_error", "provider down"),
    );
    const redirect = vi.fn();

    await expect(submitDonation(PAYLOAD, { redirect })).rejects.toMatchObject({
      name: "OnrampError",
      code: "provider_error",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("fires onramp_started with campaignId + amount bucket on success", async () => {
    mockRealSubmit.mockResolvedValue({
      sessionId: "cos_test_123",
      redirectUrl: "https://crypto.link.com/session/cos_test_123",
    });

    await submitDonation(PAYLOAD, { redirect: vi.fn() });

    // PAYLOAD.grossCents === 5000 → bucket "50". Raw cents never sent.
    expect(mockTrackOnrampStarted).toHaveBeenCalledExactlyOnceWith("pcrf", "50");
    const props = mockTrackOnrampStarted.mock.calls[0];
    // Only (campaignId, bucket) — no email, no session id, no raw amount.
    expect(props).toEqual(["pcrf", "50"]);
    expect(JSON.stringify(props)).not.toContain("donor@example.com");
  });

  it("does NOT fire onramp_started when realSubmit fails (success-only funnel)", async () => {
    mockRealSubmit.mockRejectedValue(
      new OnrampError("provider_error", "provider down"),
    );

    await expect(
      submitDonation(PAYLOAD, { redirect: vi.fn() }),
    ).rejects.toMatchObject({ name: "OnrampError" });

    expect(mockTrackOnrampStarted).not.toHaveBeenCalled();
  });

  it("resolves to void on success (matches CheckoutForm's onSubmit seam)", async () => {
    mockRealSubmit.mockResolvedValue({
      sessionId: "cos_x",
      redirectUrl: "https://crypto.link.com/session/cos_x",
    });

    const result = await submitDonation(PAYLOAD, { redirect: vi.fn() });

    expect(result).toBeUndefined();
  });
});
