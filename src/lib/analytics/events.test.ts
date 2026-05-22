import { afterEach, describe, expect, test, vi } from "vitest";

import {
  AMOUNT_TRACK_THRESHOLD_CENTS,
  amountBucket,
  shouldTrackAmountEntered,
  trackAmountEntered,
  trackDonateIntent,
  trackLandingView,
  trackOnrampCompleted,
  trackOnrampStarted,
  trackReceiptViewed,
  trackShared,
} from "@/lib/analytics/events";
import { track } from "@vercel/analytics";

vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
}));

const trackMock = vi.mocked(track);

// PII keys that must NEVER appear in any event payload.
const PII_KEYS = [
  "email",
  "name",
  "donorName",
  "donorEmail",
  "sessionId",
  "txHash",
  "txid",
  "wallet",
  "address",
  "amount",
  "amountCents",
  "grossCents",
  "cents",
  "url",
  "shareUrl",
];

function lastProps(): Record<string, unknown> {
  const call = trackMock.mock.calls.at(-1);
  expect(call).toBeDefined();
  return (call?.[1] as Record<string, unknown>) ?? {};
}

function assertNoPii(props: Record<string, unknown>): void {
  for (const key of Object.keys(props)) {
    expect(PII_KEYS).not.toContain(key);
  }
}

afterEach(() => {
  trackMock.mockClear();
});

describe("amountBucket", () => {
  test("maps known presets to their dollar label", () => {
    expect(amountBucket(2500)).toBe("25");
    expect(amountBucket(5000)).toBe("50");
    expect(amountBucket(10000)).toBe("100");
  });

  test("maps any non-preset value (including custom) to 'custom'", () => {
    expect(amountBucket(3700)).toBe("custom");
    expect(amountBucket(0)).toBe("custom");
    expect(amountBucket(99)).toBe("custom");
    expect(amountBucket(1_000_000)).toBe("custom");
  });
});

describe("shouldTrackAmountEntered", () => {
  test("fires once at/above the threshold when not yet fired", () => {
    expect(shouldTrackAmountEntered(AMOUNT_TRACK_THRESHOLD_CENTS, false)).toBe(
      true,
    );
    expect(shouldTrackAmountEntered(2500, false)).toBe(true);
  });

  test("does not fire below the threshold", () => {
    expect(shouldTrackAmountEntered(99, false)).toBe(false);
    expect(shouldTrackAmountEntered(0, false)).toBe(false);
  });

  test("does not fire again once already fired (debounce per session)", () => {
    expect(shouldTrackAmountEntered(5000, true)).toBe(false);
  });
});

describe("funnel event emitters — names, props, and PII contract", () => {
  test("landing_view fires with the right name and NO props", () => {
    trackLandingView();
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("landing_view");
    // No second argument → no chance of PII.
    expect(trackMock.mock.calls[0]?.[1]).toBeUndefined();
  });

  test("donate_intent fires with campaignId only (no PII)", () => {
    trackDonateIntent("clean-water-fund");
    expect(trackMock).toHaveBeenCalledWith("donate_intent", {
      campaignId: "clean-water-fund",
    });
    assertNoPii(lastProps());
  });

  test("amount_entered fires with campaignId + bucket, never raw amount", () => {
    trackAmountEntered("clean-water-fund", "50");
    expect(trackMock).toHaveBeenCalledWith("amount_entered", {
      campaignId: "clean-water-fund",
      bucket: "50",
    });
    const props = lastProps();
    assertNoPii(props);
    // Explicitly prove the raw value never leaks.
    expect(props).not.toHaveProperty("amountCents");
    expect(props).not.toHaveProperty("cents");
  });

  test("onramp_started fires with campaignId + bucket (no PII)", () => {
    trackOnrampStarted("clean-water-fund", "custom");
    expect(trackMock).toHaveBeenCalledWith("onramp_started", {
      campaignId: "clean-water-fund",
      bucket: "custom",
    });
    assertNoPii(lastProps());
  });

  test("onramp_completed fires with campaignId only — no sessionId/txHash", () => {
    trackOnrampCompleted("clean-water-fund");
    expect(trackMock).toHaveBeenCalledWith("onramp_completed", {
      campaignId: "clean-water-fund",
    });
    const props = lastProps();
    assertNoPii(props);
    expect(props).not.toHaveProperty("sessionId");
    expect(props).not.toHaveProperty("txHash");
  });

  test("receipt_viewed fires with the right name and NO props", () => {
    trackReceiptViewed();
    expect(trackMock).toHaveBeenCalledWith("receipt_viewed");
    expect(trackMock.mock.calls[0]?.[1]).toBeUndefined();
  });

  test("shared fires with channel only — never the link/txid", () => {
    trackShared("twitter");
    expect(trackMock).toHaveBeenCalledWith("shared", { channel: "twitter" });
    const props = lastProps();
    assertNoPii(props);
    expect(props).not.toHaveProperty("url");
    expect(props).not.toHaveProperty("shareUrl");
  });
});
