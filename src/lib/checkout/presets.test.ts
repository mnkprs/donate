import { describe, expect, test } from "vitest";

import {
  DONATION_PRESETS_CENTS,
  formatCentsAsAmountInput,
  parseAmountInputToCents,
} from "@/lib/checkout/presets";

describe("DONATION_PRESETS_CENTS", () => {
  test("exposes the three preset amounts in cents", () => {
    expect(DONATION_PRESETS_CENTS).toEqual([2500, 5000, 10000]);
  });

  test("is a frozen array so callers cannot mutate it", () => {
    expect(Object.isFrozen(DONATION_PRESETS_CENTS)).toBe(true);
  });
});

describe("parseAmountInputToCents", () => {
  test("parses a whole-dollar integer to cents", () => {
    expect(parseAmountInputToCents("25")).toBe(2500);
  });

  test("parses dollars with two decimals to cents", () => {
    expect(parseAmountInputToCents("25.50")).toBe(2550);
  });

  test("parses dollars with one decimal to cents", () => {
    expect(parseAmountInputToCents("7.5")).toBe(750);
  });

  test("strips currency symbols, spaces, and letters before parsing", () => {
    expect(parseAmountInputToCents("$50")).toBe(5000);
    expect(parseAmountInputToCents("  $ 12.34  ")).toBe(1234);
    expect(parseAmountInputToCents("12abc")).toBe(1200);
  });

  test("truncates (not rounds) beyond two decimal places to stay donor-honest", () => {
    expect(parseAmountInputToCents("12.349")).toBe(1234);
    expect(parseAmountInputToCents("12.345")).toBe(1234);
  });

  test("returns 0 for empty string", () => {
    expect(parseAmountInputToCents("")).toBe(0);
  });

  test("returns 0 for pure non-numeric input", () => {
    expect(parseAmountInputToCents("abc")).toBe(0);
    expect(parseAmountInputToCents("$")).toBe(0);
    expect(parseAmountInputToCents(".")).toBe(0);
  });

  test("returns 0 for negative input (strips the sign)", () => {
    expect(parseAmountInputToCents("-25")).toBe(2500);
  });

  test("ignores a second decimal point (treats the rest as garbage)", () => {
    expect(parseAmountInputToCents("12.34.56")).toBe(1234);
  });

  test("handles a leading decimal point", () => {
    expect(parseAmountInputToCents(".5")).toBe(50);
    expect(parseAmountInputToCents(".05")).toBe(5);
  });

  test("returns 0 for non-finite numbers (NaN safety)", () => {
    expect(parseAmountInputToCents("NaN")).toBe(0);
    expect(parseAmountInputToCents("Infinity")).toBe(0);
  });
});

describe("formatCentsAsAmountInput", () => {
  test("returns empty string for zero or negative cents", () => {
    expect(formatCentsAsAmountInput(0)).toBe("");
    expect(formatCentsAsAmountInput(-50)).toBe("");
  });

  test("renders whole-dollar amounts without a decimal", () => {
    expect(formatCentsAsAmountInput(2500)).toBe("25");
  });

  test("renders sub-dollar remainders with two-digit padding", () => {
    expect(formatCentsAsAmountInput(2550)).toBe("25.50");
    expect(formatCentsAsAmountInput(2505)).toBe("25.05");
  });

  test("round-trips through parseAmountInputToCents", () => {
    [50, 700, 1234, 999999].forEach((cents) => {
      expect(parseAmountInputToCents(formatCentsAsAmountInput(cents))).toBe(
        cents,
      );
    });
  });
});
