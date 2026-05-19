import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CreamBand } from "@/components/landing/CreamBand";

function render(): string {
  return renderToString(<CreamBand />);
}

describe("CreamBand", () => {
  test("renders as a <section> with an accessible name", () => {
    const html = render();
    expect(html).toMatch(/<section\b/);
    expect(html).toMatch(/aria-labelledby="[^"]+"/);
  });

  test("renders the eyebrow 'The wedge'", () => {
    expect(render()).toContain("The wedge");
  });

  test("renders the headline about shareable verifiable receipts", () => {
    expect(render()).toContain("receipt you can share");
  });

  test("renders the body copy explaining the receipt is a public page on Base", () => {
    const html = render();
    expect(html).toContain("public page on Base");
  });

  test("renders both CTAs", () => {
    const html = render();
    expect(html).toContain("See an example receipt");
    expect(html).toContain("Read the fee policy");
  });

  test("uses the cream tone background token", () => {
    expect(render()).toMatch(/bg-cream/);
  });

  test("no client JS state — pure server component", () => {
    const html = render();
    expect(html).not.toContain("useState");
  });
});
