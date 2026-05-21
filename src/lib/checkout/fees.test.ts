import { describe, expect, it } from "vitest";
import {
  EUDAIMONIA_FEE_BPS,
  ENDAOMENT_FEE_BPS,
  CARD_PROCESSING_BPS,
  CARD_PROCESSING_FLAT_CENTS,
  calculateBreakdown,
} from "./fees";

describe("fee constants", () => {
  it("locks Eudaimonia platform fee at 1.00% (100 bps)", () => {
    expect(EUDAIMONIA_FEE_BPS).toBe(100);
  });

  it("locks Endaoment infrastructure fee at 1.50% (150 bps)", () => {
    expect(ENDAOMENT_FEE_BPS).toBe(150);
  });

  it("locks card processing at 2.90% + 30¢", () => {
    expect(CARD_PROCESSING_BPS).toBe(290);
    expect(CARD_PROCESSING_FLAT_CENTS).toBe(30);
  });
});

describe("calculateBreakdown(grossCents)", () => {
  it("returns no rows and zero amounts when gross is 0", () => {
    const breakdown = calculateBreakdown(0);
    expect(breakdown.grossCents).toBe(0);
    expect(breakdown.rows).toEqual([]);
    expect(breakdown.netToCharityCents).toBe(0);
    expect(breakdown.eudaimoniaFeeCents).toBe(0);
    expect(breakdown.endaomentFeeCents).toBe(0);
    expect(breakdown.cardProcessingFeeCents).toBe(0);
  });

  it("returns no rows when gross is negative (defensive)", () => {
    const breakdown = calculateBreakdown(-100);
    expect(breakdown.rows).toEqual([]);
    expect(breakdown.netToCharityCents).toBe(0);
  });

  it("computes correct fees for a $25 donation", () => {
    // $25.00 → 2500 cents
    const breakdown = calculateBreakdown(2500);
    expect(breakdown.grossCents).toBe(2500);
    // 1% of 2500 = 25 cents
    expect(breakdown.eudaimoniaFeeCents).toBe(25);
    // 1.5% of 2500 = 37.5 → rounds to 38 cents
    expect(breakdown.endaomentFeeCents).toBe(38);
    // 2.9% of 2500 = 72.5 + 30 flat = 102.5 → rounds to 103 cents
    expect(breakdown.cardProcessingFeeCents).toBe(103);
    // Net = gross - eudaimonia - endaoment (card fee paid by processor, not deducted from charity)
    expect(breakdown.netToCharityCents).toBe(2500 - 25 - 38);
  });

  it("computes correct fees for a $100 donation", () => {
    const breakdown = calculateBreakdown(10000);
    expect(breakdown.eudaimoniaFeeCents).toBe(100);
    expect(breakdown.endaomentFeeCents).toBe(150);
    expect(breakdown.cardProcessingFeeCents).toBe(320); // 290 + 30
    expect(breakdown.netToCharityCents).toBe(9750);
  });

  it("computes correct fees for a large $10,000 donation", () => {
    const breakdown = calculateBreakdown(1_000_000);
    expect(breakdown.eudaimoniaFeeCents).toBe(10_000);
    expect(breakdown.endaomentFeeCents).toBe(15_000);
    expect(breakdown.cardProcessingFeeCents).toBe(29_030);
    expect(breakdown.netToCharityCents).toBe(975_000);
  });

  it("rounds half-cents to the nearest cent", () => {
    // $3.33 gross → eudaimonia = 0.0333 dollars = 3.33¢ → rounds to 3
    const breakdown = calculateBreakdown(333);
    expect(breakdown.eudaimoniaFeeCents).toBe(3);
    // endaoment 1.5% of 333 = 4.995¢ → rounds to 5
    expect(breakdown.endaomentFeeCents).toBe(5);
  });

  it("emits ordered rows: gross, eudaimonia, endaoment, cardProcessing, net", () => {
    const breakdown = calculateBreakdown(10000);
    expect(breakdown.rows.map((row) => row.kind)).toEqual([
      "gross",
      "eudaimonia",
      "endaoment",
      "cardProcessing",
      "net",
    ]);
  });

  it("labels rows with copy sourced from designs/checkout.jsx", () => {
    const breakdown = calculateBreakdown(10000);
    const labelByKind = Object.fromEntries(
      breakdown.rows.map((row) => [row.kind, row.label]),
    );
    expect(labelByKind.gross).toBe("Gross donation");
    expect(labelByKind.eudaimonia).toBe("Eudaimonia routing fee");
    expect(labelByKind.endaoment).toBe("Endaoment fee");
    expect(labelByKind.cardProcessing).toBe("Card processing");
    expect(labelByKind.net).toBe("Net to charity");
  });

  it("includes percentage hint copy on the Eudaimonia row", () => {
    const breakdown = calculateBreakdown(10000);
    const eudaimoniaRow = breakdown.rows.find((row) => row.kind === "eudaimonia");
    expect(eudaimoniaRow?.sub).toContain("1.00%");
  });

  it("marks the net row as strong and fee rows as muted", () => {
    const breakdown = calculateBreakdown(10000);
    const byKind = Object.fromEntries(
      breakdown.rows.map((row) => [row.kind, row]),
    );
    expect(byKind.net.strong).toBe(true);
    expect(byKind.eudaimonia.muted).toBe(true);
    expect(byKind.endaoment.muted).toBe(true);
    expect(byKind.cardProcessing.muted).toBe(true);
  });

  it("never returns negative net to charity (clamped at 0)", () => {
    const breakdown = calculateBreakdown(1);
    expect(breakdown.netToCharityCents).toBeGreaterThanOrEqual(0);
  });
});
