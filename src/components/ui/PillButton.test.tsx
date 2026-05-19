import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { PillButton } from "@/components/ui/PillButton";

describe("PillButton", () => {
  test("renders a <button> by default", () => {
    const html = renderToString(<PillButton>Donate</PillButton>);
    expect(html).toContain("<button");
    expect(html).toContain("Donate");
  });

  test("renders an <a> when href prop is provided", () => {
    const html = renderToString(<PillButton href="/donate/pcrf">Donate</PillButton>);
    expect(html).toContain("<a");
    expect(html).toContain('href="/donate/pcrf"');
  });

  test("primary variant carries a primary identifier on the element", () => {
    const html = renderToString(<PillButton variant="primary">Go</PillButton>);
    expect(html).toContain('data-variant="primary"');
  });

  test("secondary variant carries a secondary identifier", () => {
    const html = renderToString(<PillButton variant="secondary">Read</PillButton>);
    expect(html).toContain('data-variant="secondary"');
  });

  test("size prop is reflected as data-size", () => {
    const html = renderToString(
      <PillButton size="lg">Choose a cause</PillButton>,
    );
    expect(html).toContain('data-size="lg"');
  });

  test("aria-disabled is set when disabled prop is true on a link", () => {
    const html = renderToString(
      <PillButton href="/x" disabled>
        Soon
      </PillButton>,
    );
    expect(html).toContain('aria-disabled="true"');
  });

  test("disabled link omits href so keyboard Enter cannot activate it", () => {
    const html = renderToString(
      <PillButton href="/example-receipt" disabled>
        Soon
      </PillButton>,
    );
    expect(html).not.toContain('href="/example-receipt"');
    expect(html).toContain('role="link"');
  });

  test("renders children alongside an optional trailing icon", () => {
    const html = renderToString(
      <PillButton icon={<span data-test="icon">→</span>}>Donate</PillButton>,
    );
    expect(html).toContain("Donate");
    expect(html).toContain('data-test="icon"');
  });
});
