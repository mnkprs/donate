/**
 * Donation amount preset chips + a custom-input parser. Both pieces live in
 * one module because the AmountSelector composes them and tests want them
 * independently verifiable.
 *
 * Source of truth for the preset values:
 *   designs/checkout.jsx line 35 — `PRESETS = [25, 50, 100]` (dollars).
 *
 * Cents (not dollars) cross the API boundary so the rest of the checkout
 * pipeline — fees, validation, payload — never has to deal with floats.
 */

const CENTS_PER_DOLLAR = 100;
const MAX_CENT_DECIMALS = 2;

export const DONATION_PRESETS_CENTS: readonly number[] = Object.freeze([
  25 * CENTS_PER_DOLLAR,
  50 * CENTS_PER_DOLLAR,
  100 * CENTS_PER_DOLLAR,
]);

/**
 * Convert a free-form donor input string ("$25", "12.50", "  7.5 ") into
 * integer cents. Returns 0 for anything that does not parse to a finite,
 * non-negative number — the validation layer surfaces user-facing errors,
 * not this parser.
 *
 * Truncates (does not round) beyond two decimal places: a donor typing
 * "12.349" gets $12.34 charged, never the unexpected $12.35.
 */
export function parseAmountInputToCents(raw: string): number {
  const stripped = raw.replace(/[^\d.]/g, "");
  if (stripped === "" || stripped === ".") return 0;

  const firstDot = stripped.indexOf(".");
  const normalized =
    firstDot === -1
      ? stripped
      : `${stripped.slice(0, firstDot)}.${stripped.slice(firstDot + 1).replace(/\./g, "")}`;

  const [whole, fraction = ""] = normalized.split(".");
  const truncatedFraction = fraction.slice(0, MAX_CENT_DECIMALS).padEnd(
    MAX_CENT_DECIMALS,
    "0",
  );
  const wholePart = whole === "" ? 0 : Number(whole);
  const fractionPart = truncatedFraction === "" ? 0 : Number(truncatedFraction);

  if (!Number.isFinite(wholePart) || !Number.isFinite(fractionPart)) return 0;

  const cents = wholePart * CENTS_PER_DOLLAR + fractionPart;
  return cents < 0 ? 0 : Math.trunc(cents);
}

/**
 * Inverse of {@link parseAmountInputToCents}: render integer cents as the
 * string the donor would see in the custom input. Zero/negative → empty
 * string so the placeholder ("0.00") remains visible.
 */
export function formatCentsAsAmountInput(cents: number): string {
  if (cents <= 0) return "";
  const dollars = Math.floor(cents / CENTS_PER_DOLLAR);
  const remainder = cents % CENTS_PER_DOLLAR;
  if (remainder === 0) return String(dollars);
  return `${dollars}.${remainder.toString().padStart(2, "0")}`;
}
