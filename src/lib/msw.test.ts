import { describe, expect, it } from "vitest";

describe("MSW interception", () => {
  it("blocks unhandled outbound HTTP with the [MSW] error signature", async () => {
    // Without MSW, this either succeeds (real DNS) or fails with ENOTFOUND.
    // With MSW + onUnhandledRequest: 'error', it must reject with a "[MSW]" prefixed error.
    await expect(
      fetch("https://example.com/should-be-intercepted-by-msw"),
    ).rejects.toThrow(/\[MSW\]/);
  });
});
