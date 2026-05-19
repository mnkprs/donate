import { describe, expect, it } from "vitest";
import {
  MIN_AMOUNT_CENTS,
  MAX_AMOUNT_CENTS,
  validateAmount,
  validateEmail,
} from "./validation";

describe("amount bounds", () => {
  it("locks minimum donation at $1.00 (100 cents)", () => {
    expect(MIN_AMOUNT_CENTS).toBe(100);
  });

  it("locks maximum donation at $10,000.00 (1,000,000 cents)", () => {
    expect(MAX_AMOUNT_CENTS).toBe(1_000_000);
  });
});

describe("validateAmount(input)", () => {
  it("accepts a valid dollar amount as a string", () => {
    const result = validateAmount("50");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(5000);
    }
  });

  it("accepts a decimal amount and converts to cents", () => {
    const result = validateAmount("12.34");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(1234);
    }
  });

  it("accepts the minimum amount $1.00", () => {
    const result = validateAmount("1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(100);
    }
  });

  it("accepts the maximum amount $10,000.00", () => {
    const result = validateAmount("10000");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(1_000_000);
    }
  });

  it("rejects amounts below $1.00", () => {
    const result = validateAmount("0.99");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/at least \$1/i);
    }
  });

  it("rejects zero", () => {
    const result = validateAmount("0");
    expect(result.ok).toBe(false);
  });

  it("rejects negative amounts", () => {
    const result = validateAmount("-50");
    expect(result.ok).toBe(false);
  });

  it("rejects amounts above $10,000", () => {
    const result = validateAmount("10000.01");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/10,000|10000/);
    }
  });

  it("rejects non-numeric input", () => {
    const result = validateAmount("twenty");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/valid|number|amount/i);
    }
  });

  it("rejects empty string", () => {
    const result = validateAmount("");
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    const result = validateAmount("   ");
    expect(result.ok).toBe(false);
  });

  it("accepts amount with leading/trailing whitespace", () => {
    const result = validateAmount("  25  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(2500);
    }
  });

  it("rejects scientific notation", () => {
    const result = validateAmount("1e3");
    expect(result.ok).toBe(false);
  });

  it("rejects more than two decimal places", () => {
    const result = validateAmount("10.345");
    expect(result.ok).toBe(false);
  });

  it("accepts numeric type input directly", () => {
    const result = validateAmount(50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(5000);
    }
  });

  it("rejects NaN", () => {
    const result = validateAmount(Number.NaN);
    expect(result.ok).toBe(false);
  });

  it("rejects Infinity", () => {
    const result = validateAmount(Number.POSITIVE_INFINITY);
    expect(result.ok).toBe(false);
  });
});

describe("validateEmail(input)", () => {
  it("accepts a well-formed email", () => {
    const result = validateEmail("donor@example.com");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("donor@example.com");
    }
  });

  it("accepts email with plus-addressing", () => {
    const result = validateEmail("donor+tag@example.com");
    expect(result.ok).toBe(true);
  });

  it("accepts email with subdomain", () => {
    const result = validateEmail("alice@mail.example.com");
    expect(result.ok).toBe(true);
  });

  it("normalizes by trimming and lowercasing", () => {
    const result = validateEmail("  DONOR@Example.COM  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("donor@example.com");
    }
  });

  it("rejects empty string", () => {
    const result = validateEmail("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/required|email/i);
    }
  });

  it("rejects whitespace-only input", () => {
    const result = validateEmail("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects email missing @", () => {
    const result = validateEmail("donorexample.com");
    expect(result.ok).toBe(false);
  });

  it("rejects email missing local part", () => {
    const result = validateEmail("@example.com");
    expect(result.ok).toBe(false);
  });

  it("rejects email missing domain", () => {
    const result = validateEmail("donor@");
    expect(result.ok).toBe(false);
  });

  it("rejects email missing TLD", () => {
    const result = validateEmail("donor@example");
    expect(result.ok).toBe(false);
  });

  it("rejects email with spaces in it", () => {
    const result = validateEmail("donor @example.com");
    expect(result.ok).toBe(false);
  });

  it("rejects multiple @ signs", () => {
    const result = validateEmail("donor@@example.com");
    expect(result.ok).toBe(false);
  });
});
