import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import FeePolicyPage from "@/app/fee-policy/page";
import { formatBpsAsPercent } from "@/components/legal/FeeDisclosure";
import { EUDAIMONIA_FEE_BPS } from "@/lib/checkout/fees";

describe("Fee Policy (/fee-policy)", () => {
  test("renders the page with a single <h1> heading", () => {
    const html = renderToString(<FeePolicyPage />);
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain("Fee Policy");
  });

  test("shows the platform fee derived from fees.ts, not a hardcoded string", () => {
    const html = renderToString(<FeePolicyPage />);
    expect(html).toContain(formatBpsAsPercent(EUDAIMONIA_FEE_BPS));
  });

  test("explains the fee is deducted on-chain before funds reach Endaoment", () => {
    const html = renderToString(<FeePolicyPage />);
    expect(html.toLowerCase()).toContain("on-chain");
    expect(html).toContain("Endaoment");
  });

  test("links back to /terms and /privacy", () => {
    const html = renderToString(<FeePolicyPage />);
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
  });
});
