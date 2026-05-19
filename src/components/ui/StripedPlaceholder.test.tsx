import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { StripedPlaceholder } from "@/components/ui/StripedPlaceholder";

describe("StripedPlaceholder", () => {
  test("exposes the caption as an accessible image name", () => {
    const html = renderToString(
      <StripedPlaceholder caption="photo · field clinic, rafah" />,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="photo · field clinic, rafah"');
  });

  test("renders the caption visibly in markup", () => {
    const html = renderToString(
      <StripedPlaceholder caption="photo · kitchen line, kharkiv" />,
    );
    expect(html).toContain("photo · kitchen line, kharkiv");
  });

  test("applies the requested swatch colors via inline styles", () => {
    const html = renderToString(
      <StripedPlaceholder caption="x" tint="#abcdef" accent="#fedcba" />,
    );
    expect(html).toContain("#abcdef");
    expect(html).toContain("#fedcba");
  });
});
