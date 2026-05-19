import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { Footer } from "@/components/landing/Footer";

describe("Footer", () => {
  test("renders as a <footer> landmark", () => {
    const html = renderToString(<Footer />);
    expect(html).toContain("<footer");
  });

  test("contains the Endaoment / 501(c)(3) disclosure copy", () => {
    const html = renderToString(<Footer />);
    expect(html).toContain("Endaoment");
    expect(html).toContain("501(c)(3)");
  });

  test("year is the current year, not hardcoded", () => {
    const html = renderToString(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(html).toContain(currentYear);
  });
});
