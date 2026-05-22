import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import TermsPage from "@/app/terms/page";
import { formatBpsAsPercent } from "@/components/legal/FeeDisclosure";
import { EUDAIMONIA_FEE_BPS } from "@/lib/checkout/fees";

describe("Terms of Service (/terms)", () => {
  test("renders the page with an <h1> heading", () => {
    const html = renderToString(<TermsPage />);
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain("Terms of Service");
  });

  test("discloses irreversibility and the public ledger", () => {
    const html = renderToString(<TermsPage />);
    expect(html.toLowerCase()).toContain("irreversible");
    expect(html.toLowerCase()).toContain("public");
  });

  test("describes the routing layer over Endaoment", () => {
    const html = renderToString(<TermsPage />);
    expect(html).toContain("Endaoment");
    expect(html.toLowerCase()).toContain("routing layer");
  });

  test("shows the platform fee from fees.ts, not a hardcoded string", () => {
    const html = renderToString(<TermsPage />);
    expect(html).toContain(formatBpsAsPercent(EUDAIMONIA_FEE_BPS));
  });
});
