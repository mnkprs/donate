import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { AmountSelector } from "@/components/checkout/AmountSelector";

function noop() {}

const baseProps = {
  valueCents: 0,
  customMode: false,
  onValueChange: noop,
  onCustomModeChange: noop,
};

describe("AmountSelector — structure", () => {
  test("renders the FieldLabel with the donation-amount copy + hint", () => {
    const html = renderToString(<AmountSelector {...baseProps} />);
    expect(html).toContain("Donation amount");
    expect(html).toContain("Choose a preset or set a custom amount");
    expect(html).toContain("<label");
  });

  test("renders the three preset chips with $25, $50, $100", () => {
    const html = renderToString(<AmountSelector {...baseProps} />);
    expect(html).toContain(">25<");
    expect(html).toContain(">50<");
    expect(html).toContain(">100<");
    const dollarCount = (html.match(/\$/g) ?? []).length;
    expect(dollarCount).toBeGreaterThanOrEqual(3);
  });

  test("renders a Custom chip as a <button type='button'>", () => {
    const html = renderToString(<AmountSelector {...baseProps} />);
    expect(html).toContain("Custom");
    const buttonCount = (html.match(/<button[^>]*type="button"/g) ?? []).length;
    expect(buttonCount).toBe(4);
  });
});

describe("AmountSelector — active chip reflects valueCents", () => {
  test("no preset chip is aria-pressed when valueCents=0 and customMode=false", () => {
    const html = renderToString(<AmountSelector {...baseProps} />);
    expect(html).not.toContain('aria-pressed="true"');
  });

  test("$25 chip is aria-pressed when valueCents=2500", () => {
    const html = renderToString(
      <AmountSelector {...baseProps} valueCents={2500} />,
    );
    expect(html).toContain('aria-pressed="true"');
    const pressedCount = (html.match(/aria-pressed="true"/g) ?? []).length;
    expect(pressedCount).toBe(1);
  });

  test("$50 chip is aria-pressed when valueCents=5000", () => {
    const html = renderToString(
      <AmountSelector {...baseProps} valueCents={5000} />,
    );
    expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
  });

  test("$100 chip is aria-pressed when valueCents=10000", () => {
    const html = renderToString(
      <AmountSelector {...baseProps} valueCents={10000} />,
    );
    expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
  });

  test("non-preset valueCents with customMode=false leaves preset chips unpressed", () => {
    const html = renderToString(
      <AmountSelector {...baseProps} valueCents={3700} />,
    );
    expect(html).not.toContain('aria-pressed="true"');
  });
});

describe("AmountSelector — custom mode", () => {
  test("custom input is not rendered when customMode=false", () => {
    const html = renderToString(<AmountSelector {...baseProps} />);
    expect(html).not.toContain("<input");
  });

  test("custom input is rendered when customMode=true", () => {
    const html = renderToString(
      <AmountSelector {...baseProps} customMode={true} />,
    );
    expect(html).toContain("<input");
    expect(html).toContain("$");
  });

  test("custom input uses inputmode='decimal' for mobile-friendly numeric keypad", () => {
    const html = renderToString(
      <AmountSelector {...baseProps} customMode={true} />,
    );
    expect(html.toLowerCase()).toContain('inputmode="decimal"');
  });

  test("Custom chip is aria-pressed when customMode=true", () => {
    const html = renderToString(
      <AmountSelector {...baseProps} customMode={true} />,
    );
    const pressedCount = (html.match(/aria-pressed="true"/g) ?? []).length;
    expect(pressedCount).toBe(1);
  });

  test("preset chip is NOT pressed when customMode=true even if valueCents matches a preset", () => {
    const html = renderToString(
      <AmountSelector
        {...baseProps}
        customMode={true}
        valueCents={2500}
      />,
    );
    const pressedCount = (html.match(/aria-pressed="true"/g) ?? []).length;
    expect(pressedCount).toBe(1);
  });
});

describe("AmountSelector — error surfacing", () => {
  test("renders no error region when error prop is not provided", () => {
    const html = renderToString(<AmountSelector {...baseProps} />);
    expect(html).not.toContain('role="alert"');
  });

  test("renders the error copy in a role='alert' region when error prop is set", () => {
    const html = renderToString(
      <AmountSelector
        {...baseProps}
        error="Enter at least $1.00"
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Enter at least $1.00");
  });

  test("error region uses the urgent token (not a hardcoded hex)", () => {
    const html = renderToString(
      <AmountSelector {...baseProps} error="bad" />,
    );
    expect(html).toContain("text-urgent");
  });
});

describe("AmountSelector — no inline-style residue from the design file", () => {
  test("never renders an inline style attribute", () => {
    const htmlIdle = renderToString(<AmountSelector {...baseProps} />);
    const htmlCustom = renderToString(
      <AmountSelector {...baseProps} customMode={true} valueCents={1234} />,
    );
    expect(htmlIdle).not.toContain("style=");
    expect(htmlCustom).not.toContain("style=");
  });
});
