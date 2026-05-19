import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  AUTHORITY_ITEMS,
  AuthorityStrip,
} from "@/components/landing/AuthorityStrip";

function render(): string {
  return renderToString(<AuthorityStrip />);
}

function encodeForSsr(value: string): string {
  return value.replace(/·/g, "·");
}

describe("AuthorityStrip", () => {
  test("renders as a <section> landmark with an accessible name", () => {
    const html = render();
    expect(html).toMatch(/<section\b/);
    expect(html).toMatch(/aria-label="[^"]+"/);
  });

  test("exports AUTHORITY_ITEMS with exactly five entries", () => {
    expect(AUTHORITY_ITEMS).toHaveLength(5);
  });

  test("each item has non-empty label and value strings", () => {
    for (const item of AUTHORITY_ITEMS) {
      expect(typeof item.label).toBe("string");
      expect(typeof item.value).toBe("string");
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.value.length).toBeGreaterThan(0);
    }
  });

  test("includes the five required partner facts in declared order", () => {
    expect(AUTHORITY_ITEMS.map((i) => i.label)).toEqual([
      "Built on",
      "Settles on",
      "Stablecoin",
      "Payments",
      "Audits",
    ]);
  });

  test("renders every item's label in the output", () => {
    const html = render();
    for (const item of AUTHORITY_ITEMS) {
      expect(html).toContain(item.label);
    }
  });

  test("renders every item's value in the output", () => {
    const html = render();
    for (const item of AUTHORITY_ITEMS) {
      const encoded = encodeForSsr(item.value);
      expect(html.includes(item.value) || html.includes(encoded)).toBe(true);
    }
  });

  test("uses semantic Tailwind tokens (rule borders, ink text)", () => {
    const html = render();
    expect(html).toMatch(/border-rule/);
    expect(html).toMatch(/text-ink/);
  });

  test("renders a 5-column grid at lg breakpoint", () => {
    expect(render()).toMatch(/lg:grid-cols-5/);
  });

  test("no client JS state — pure server component", () => {
    const html = render();
    expect(html).not.toContain("useState");
    expect(html).not.toContain("onClick");
  });
});
