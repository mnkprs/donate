import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { HeroReceiptMockup } from "@/components/landing/HeroReceiptMockup";

describe("HeroReceiptMockup", () => {
  test("renders the receipt URL in the browser chrome", () => {
    const html = renderToString(<HeroReceiptMockup />);
    expect(html).toContain("eudaimonia.app/receipt");
  });

  test("renders the donor headline", () => {
    const html = renderToString(<HeroReceiptMockup />);
    expect(html).toContain("Anonymous donor gave");
    expect(html).toContain("Black Women in Blockchain");
  });

  test("renders the three fee columns", () => {
    const html = renderToString(<HeroReceiptMockup />);
    expect(html).toContain("Donor paid");
    expect(html).toContain("Eudaimonia fee");
    expect(html).toContain("Charity received");
  });

  test("renders the four-stage mini tracker", () => {
    const html = renderToString(<HeroReceiptMockup />);
    expect(html).toContain("Donated");
    expect(html).toContain("Converted");
    expect(html).toContain("Routed");
    expect(html).toContain("Settled");
  });

  test("renders the tx-hash strip with a BaseScan link", () => {
    const html = renderToString(<HeroReceiptMockup />);
    expect(html).toContain("0xdc671195");
    expect(html).toContain("BaseScan");
  });

  test("introduces no heading landmark (decorative product mock)", () => {
    const html = renderToString(<HeroReceiptMockup />);
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<h2");
  });
});
