import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { Hero } from "@/components/landing/Hero";

describe("Hero", () => {
  test("renders an <h1> landmark heading", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("<h1");
  });

  test("includes the Philotimo value-prop copy", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("See exactly where it goes");
    expect(html).toContain("Philotimo routes");
  });

  test('primary CTA "Choose a cause" anchors to #causes', () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("Choose a cause");
    expect(html).toContain('href="#causes"');
  });

  test('secondary "example receipt" CTA is aria-disabled (Epic 6 not shipped)', () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("See an example receipt");
    expect(html).toContain('aria-disabled="true"');
  });

  test("renders the trust micro-row with the three trust signals", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain("$1 minimum");
    expect(html).toContain("Apple Pay");
    expect(html).toContain("tax-deductible");
  });

  test("decorative gradient backdrop is aria-hidden", () => {
    const html = renderToString(<Hero />);
    expect(html).toContain('aria-hidden="true"');
  });
});
