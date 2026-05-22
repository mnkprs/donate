import { describe, expect, test } from "vitest";

import {
  buildLiveStages,
  charityInitials,
  computeDonationSplit,
  deriveLiveStages,
  formatDollars,
  formatUsdc,
  LIVE_STAGES_TEMPLATE,
} from "@/lib/onramp/live-stages";

describe("LIVE_STAGES_TEMPLATE", () => {
  test("has the five in-order stages keyed paid→published", () => {
    expect(LIVE_STAGES_TEMPLATE.map((s) => s.key)).toEqual([
      "paid",
      "converted",
      "routed",
      "delivered",
      "published",
    ]);
    expect(LIVE_STAGES_TEMPLATE.map((s) => s.n)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("computeDonationSplit", () => {
  test("matches the documented $5.00 fee strip (1% + 1.5%)", () => {
    const split = computeDonationSplit(500);
    expect(split.grossMicros).toBe(5_000_000);
    expect(split.eudaimoniaFeeMicros).toBe(50_000); // 1% of gross
    expect(split.afterEudaimoniaMicros).toBe(4_950_000);
    expect(split.endaomentFeeMicros).toBe(74_250); // 1.5% of post-Eudaimonia
    expect(split.charityMicros).toBe(4_875_750);
  });

  test("renders the receipt-strip display strings", () => {
    const split = computeDonationSplit(500);
    expect(formatDollars(500)).toBe("5.00");
    expect(formatUsdc(split.eudaimoniaFeeMicros, 2)).toBe("0.05");
    expect(formatUsdc(split.endaomentFeeMicros, 2)).toBe("0.07");
    expect(formatUsdc(split.charityMicros, 3)).toBe("4.876");
  });

  test("USDC formats to 6 decimals for tracker amounts", () => {
    const split = computeDonationSplit(500);
    expect(formatUsdc(split.afterEudaimoniaMicros, 6)).toBe("4.950000");
    expect(formatUsdc(split.charityMicros, 6)).toBe("4.875750");
  });
});

describe("formatDollars", () => {
  test("renders integer cents as 2-dp dollars", () => {
    expect(formatDollars(0)).toBe("0.00");
    expect(formatDollars(1234)).toBe("12.34");
    expect(formatDollars(2500)).toBe("25.00");
  });
});

describe("charityInitials", () => {
  test("takes the first letter of the first two words", () => {
    expect(charityInitials("Palestine Children's Relief Fund")).toBe("PC");
    expect(charityInitials("World Central Kitchen")).toBe("WC");
    expect(charityInitials("Direct Relief")).toBe("DR");
  });

  test("handles a single-word name and empty input", () => {
    expect(charityInitials("Oxfam")).toBe("O");
    expect(charityInitials("")).toBe("");
  });
});

describe("deriveLiveStages", () => {
  test("created/pending sit at the converting stage (2 active)", () => {
    expect(deriveLiveStages("created")).toEqual({
      currentStage: 2,
      failedAt: null,
    });
    expect(deriveLiveStages("pending")).toEqual({
      currentStage: 2,
      failedAt: null,
    });
  });

  test("settled marks every stage done (currentStage past the last)", () => {
    expect(deriveLiveStages("settled")).toEqual({
      currentStage: 6,
      failedAt: null,
    });
  });

  test("failed flags the in-flight stage as failed", () => {
    expect(deriveLiveStages("failed")).toEqual({
      currentStage: 2,
      failedAt: 2,
    });
  });
});

describe("buildLiveStages", () => {
  test("stages before current are done, current is active, rest queued", () => {
    const stages = buildLiveStages({ currentStage: 2, grossCents: 500 });
    expect(stages.map((s) => s.state)).toEqual([
      "done",
      "active",
      "queued",
      "queued",
      "queued",
    ]);
  });

  test("settled (currentStage 6) marks all five done", () => {
    const stages = buildLiveStages({ currentStage: 6, grossCents: 500 });
    expect(stages.every((s) => s.state === "done")).toBe(true);
  });

  test("failedAt marks that stage failed, prior done, later queued", () => {
    const stages = buildLiveStages({
      currentStage: 2,
      failedAt: 3,
      grossCents: 500,
    });
    expect(stages.map((s) => s.state)).toEqual([
      "done",
      "done",
      "failed",
      "queued",
      "queued",
    ]);
  });

  test("computes per-stage amounts from the real gross", () => {
    const stages = buildLiveStages({ currentStage: 6, grossCents: 500 });
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s]));
    expect(byKey.paid.amount).toBe("5.00");
    expect(byKey.paid.unit).toBe("USD");
    expect(byKey.converted.amount).toBe("5.000000");
    expect(byKey.routed.amount).toBe("4.950000");
    expect(byKey.delivered.amount).toBe("4.875750");
    expect(byKey.published.amount).toBe("—");
  });

  test("does not mutate the shared template", () => {
    buildLiveStages({ currentStage: 3, grossCents: 1000 });
    expect(LIVE_STAGES_TEMPLATE.every((s) => !("state" in s))).toBe(true);
  });
});
