import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { NavBar } from "@/components/landing/NavBar";

describe("NavBar", () => {
  test("renders a <nav> with the Primary aria-label landmark", () => {
    const html = renderToString(<NavBar />);
    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="Primary"');
  });

  test("wordmark links back to /", () => {
    const html = renderToString(<NavBar />);
    expect(html).toContain('href="/"');
    expect(html).toContain("Philotimo");
  });

  test("renders the four primary section links", () => {
    const html = renderToString(<NavBar />);
    expect(html).toContain("Causes");
    expect(html).toContain("How it works");
    expect(html).toContain("Receipts");
    expect(html).toContain("For nonprofits");
  });

  test('Donate CTA links to /donate', () => {
    const html = renderToString(<NavBar />);
    expect(html).toContain('href="/donate"');
    expect(html).toContain("Donate");
  });
});
