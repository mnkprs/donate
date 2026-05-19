import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ArrowRight } from "@/components/ui/ArrowRight";

describe("ArrowRight", () => {
  test("renders an svg with default size 10 and currentColor stroke", () => {
    const html = renderToString(<ArrowRight />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="10"');
    expect(html).toContain('height="10"');
    expect(html).toContain("currentColor");
  });

  test("honors size and color props", () => {
    const html = renderToString(<ArrowRight size={16} color="#533afd" />);
    expect(html).toContain('width="16"');
    expect(html).toContain('height="16"');
    expect(html).toContain("#533afd");
  });

  test("is decorative (aria-hidden) by default", () => {
    const html = renderToString(<ArrowRight />);
    expect(html).toContain('aria-hidden="true"');
  });
});
