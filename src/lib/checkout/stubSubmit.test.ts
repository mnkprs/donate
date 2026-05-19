import { describe, expect, test } from "vitest";

import { stubSubmit } from "@/lib/checkout/stubSubmit";
import type { CheckoutPayload } from "@/types/checkout";

const samplePayload: CheckoutPayload = {
  campaignId: "pcrf",
  grossCents: 5000,
  email: "donor@example.com",
  note: "",
};

describe("stubSubmit", () => {
  test("returns a Promise so CheckoutForm's await works", () => {
    const result = stubSubmit(samplePayload);
    expect(result).toBeInstanceOf(Promise);
    // Swallow rejection so vitest doesn't flag it as unhandled.
    result.catch(() => undefined);
  });

  test("rejects with an Error instance (so errorMessage() can read .message)", async () => {
    await expect(stubSubmit(samplePayload)).rejects.toBeInstanceOf(Error);
  });

  test("error message names the missing on-ramp wiring", async () => {
    await expect(stubSubmit(samplePayload)).rejects.toThrow(/wired|Epic 3|on-ramp/i);
  });

  test("accepts a payload with an omitted note (note is optional)", async () => {
    const minimal: CheckoutPayload = {
      campaignId: "wck",
      grossCents: 2500,
      email: "donor@example.com",
    };
    await expect(stubSubmit(minimal)).rejects.toBeInstanceOf(Error);
  });
});
