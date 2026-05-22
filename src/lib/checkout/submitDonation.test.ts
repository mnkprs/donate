import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CheckoutPayload } from "@/types/checkout";

// Mock only realSubmit; keep OnrampError (and everything else) real so the
// adapter's error propagation is tested against the genuine error type.
vi.mock("./realSubmit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./realSubmit")>();
  return { ...actual, realSubmit: vi.fn() };
});

import { OnrampError, realSubmit } from "./realSubmit";
import { submitDonation } from "./submitDonation";

const mockRealSubmit = vi.mocked(realSubmit);

const PAYLOAD: CheckoutPayload = Object.freeze({
  campaignId: "pcrf",
  grossCents: 5000,
  email: "donor@example.com",
});

describe("submitDonation()", () => {
  beforeEach(() => {
    mockRealSubmit.mockReset();
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

  it("resolves to void on success (matches CheckoutForm's onSubmit seam)", async () => {
    mockRealSubmit.mockResolvedValue({
      sessionId: "cos_x",
      redirectUrl: "https://crypto.link.com/session/cos_x",
    });

    const result = await submitDonation(PAYLOAD, { redirect: vi.fn() });

    expect(result).toBeUndefined();
  });
});
