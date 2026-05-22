import { describe, expect, test } from "vitest";

import {
  buildProcessingView,
  formatStartedAt,
  maskEmail,
} from "@/lib/onramp/processing-view";

describe("maskEmail", () => {
  test("keeps the first local-part char and the domain", () => {
    expect(maskEmail("manos@protonmail.com")).toBe("m***@protonmail.com");
    expect(maskEmail("a@b.com")).toBe("a***@b.com");
  });

  test("returns a safe fallback for a malformed address", () => {
    expect(maskEmail("not-an-email")).toBe("***");
    expect(maskEmail("")).toBe("***");
  });
});

describe("formatStartedAt", () => {
  test("formats a UTC instant as 'h:mm:ss A UTC · Month D, YYYY'", () => {
    const d = new Date(Date.UTC(2026, 4, 21, 17, 34, 1));
    expect(formatStartedAt(d)).toBe("5:34:01 PM UTC · May 21, 2026");
  });

  test("renders midnight as 12:00:05 AM", () => {
    const d = new Date(Date.UTC(2026, 0, 1, 0, 0, 5));
    expect(formatStartedAt(d)).toBe("12:00:05 AM UTC · January 1, 2026");
  });
});

describe("buildProcessingView", () => {
  test("assembles the screen view-model from session + campaign", () => {
    const view = buildProcessingView({
      session: {
        id: "cos_test_123",
        grossCents: 500,
        donorEmail: "manos@protonmail.com",
        campaignId: "pcrf",
      },
      campaign: { name: "Palestine Children's Relief Fund", ein: "95-4374418" },
      now: new Date(Date.UTC(2026, 4, 21, 17, 34, 1)),
    });

    expect(view).toEqual({
      sessionId: "cos_test_123",
      amountDisplay: "5.00",
      grossCents: 500,
      charityName: "Palestine Children's Relief Fund",
      charityInitials: "PC",
      ein: "95-4374418",
      donorEmailMasked: "m***@protonmail.com",
      startedAt: "5:34:01 PM UTC · May 21, 2026",
    });
  });
});
