import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { AmountChip } from "@/components/ui/AmountChip";

describe("AmountChip", () => {
  test("renders a <button> with type=button", () => {
    const html = renderToString(<AmountChip value={25} currency="$" />);
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
  });

  test("renders the currency prefix alongside the value", () => {
    const html = renderToString(<AmountChip value={50} currency="$" />);
    expect(html).toContain("$");
    expect(html).toContain("50");
  });

  test("aria-pressed reflects the active prop", () => {
    const inactive = renderToString(<AmountChip value={25} currency="$" />);
    const active = renderToString(<AmountChip value={25} currency="$" active />);

    expect(inactive).toContain('aria-pressed="false"');
    expect(active).toContain('aria-pressed="true"');
  });

  test("active variant uses ink background and white foreground utilities", () => {
    const html = renderToString(<AmountChip value={100} currency="$" active />);
    expect(html).toContain("bg-ink");
    expect(html).toContain("text-white");
  });

  test("inactive variant uses surface background and ink foreground utilities", () => {
    const html = renderToString(<AmountChip value={100} currency="$" />);
    expect(html).toContain("bg-white");
    expect(html).toContain("text-ink");
    expect(html).toContain("border-rule");
  });

  test("uses tabular numeral utility for stable digit width", () => {
    const html = renderToString(<AmountChip value={100} currency="$" />);
    expect(html).toContain("tabular-nums");
  });

  test("disabled prop disables the button at the DOM level", () => {
    const html = renderToString(
      <AmountChip value={25} currency="$" disabled />,
    );
    expect(html).toContain("disabled");
  });

  test("never renders an inline style attribute (no design-doc styling residue)", () => {
    const html = renderToString(<AmountChip value={25} currency="$" active />);
    expect(html).not.toContain("style=");
  });
});
