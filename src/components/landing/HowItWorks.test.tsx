import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { HowItWorks, STEPS } from "@/components/landing/HowItWorks";

function render(): string {
  return renderToString(<HowItWorks />);
}

describe("HowItWorks", () => {
  test("renders as a <section> landmark", () => {
    expect(render()).toMatch(/<section\b/);
  });

  test('renders the "How it works" eyebrow + headline', () => {
    const html = render();
    expect(html).toContain("How it works");
    expect(html).toContain("Five seconds. Five steps.");
  });

  test("exports a STEPS constant with exactly five steps numbered 1..5", () => {
    expect(STEPS).toHaveLength(5);
    expect(STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5]);
  });

  test("each step has the four required fields (n, title, short, detail)", () => {
    for (const step of STEPS) {
      expect(typeof step.n).toBe("number");
      expect(typeof step.title).toBe("string");
      expect(typeof step.short).toBe("string");
      expect(typeof step.detail).toBe("string");
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.detail.length).toBeGreaterThan(0);
    }
  });

  test("renders every step's title in the output", () => {
    const html = render();
    for (const step of STEPS) {
      expect(html).toContain(step.title);
    }
  });

  test("renders every step's detail copy in the output", () => {
    const html = render();
    for (const step of STEPS) {
      // The Endaoment detail contains a curly apostrophe; SSR encodes it as &#x2019;.
      const encoded = step.detail.replace(/’/g, "&#x2019;");
      expect(html.includes(step.detail) || html.includes(encoded)).toBe(true);
    }
  });

  test("renders the fee strip with all four fee labels", () => {
    const html = render();
    expect(html).toContain("Fees, in plain sight");
    expect(html).toContain("Philotimo");
    expect(html).toContain("Endaoment");
    expect(html).toContain("Card processing");
    expect(html).toContain("Network");
  });

  test('renders the "Full fee breakdown" link', () => {
    expect(render()).toContain("Full fee breakdown");
  });

  test("uses Tailwind tokens (bg-tint background, iris connecting line)", () => {
    const html = render();
    expect(html).toMatch(/bg-tint/);
    expect(html).toMatch(/bg-iris/);
  });

  test("group-hover lifts the active step card (server-side hover, no client JS)", () => {
    expect(render()).toMatch(/group\/step/);
  });
});
