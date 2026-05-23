import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import PrivacyPage from "@/app/privacy/page";

describe("Privacy Policy (/privacy)", () => {
  test("renders the page with an <h1> heading", () => {
    const html = renderToString(<PrivacyPage />);
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain("Privacy Policy");
  });

  test("states that card data is handled by Stripe and the on-ramp", () => {
    const html = renderToString(<PrivacyPage />);
    expect(html).toContain("Stripe");
    expect(html.toLowerCase()).toContain("on-ramp");
    expect(html.toLowerCase()).toContain("card");
  });

  test("clarifies the platform does not store full card data", () => {
    const html = renderToString(<PrivacyPage />);
    expect(html.toLowerCase()).toContain("never");
    expect(html.toLowerCase()).toContain("store");
  });

  test("discloses the public nature of on-chain transaction data", () => {
    const html = renderToString(<PrivacyPage />);
    expect(html.toLowerCase()).toContain("on-chain");
    expect(html.toLowerCase()).toContain("public");
  });
});
