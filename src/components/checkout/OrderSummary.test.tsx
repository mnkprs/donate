import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { OrderSummary } from "@/components/checkout/OrderSummary";
import { calculateBreakdown } from "@/lib/checkout/fees";

describe("OrderSummary — empty state", () => {
  test("renders an instructional empty state when grossCents is 0", () => {
    const breakdown = calculateBreakdown(0);
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).toMatch(/Enter an amount/i);
  });

  test("does not render fee rows when breakdown has no rows", () => {
    const breakdown = calculateBreakdown(0);
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).not.toContain("Philotimo routing fee");
    expect(html).not.toContain("Net to charity");
  });

  test('renders the "Order summary" eyebrow even in empty state', () => {
    const breakdown = calculateBreakdown(0);
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html.toLowerCase()).toContain("order summary");
  });
});

describe("OrderSummary — ready state with breakdown rows", () => {
  const breakdown = calculateBreakdown(5000); // $50.00

  test("renders the gross donation row label and amount", () => {
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).toContain("Gross donation");
    expect(html).toContain("$50.00");
  });

  test('renders the Philotimo routing fee row with "1.00%" disclosure', () => {
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).toContain("Philotimo routing fee");
    expect(html).toContain("1.00%");
  });

  test("renders the Endaoment fee row", () => {
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).toContain("Endaoment fee");
    expect(html).toContain("1.50%");
  });

  test("renders the card processing row with both percent and flat disclosure", () => {
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).toContain("Card processing");
    expect(html).toContain("2.90%");
    expect(html).toContain("$0.30");
  });

  test('renders the emphasized "Net to charity" row with the net amount', () => {
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).toContain("Net to charity");
    // $50.00 - 1% ($0.50) - 1.5% ($0.75) = $48.75
    expect(html).toContain("$48.75");
  });

  test("does not render the empty-state copy when rows are present", () => {
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).not.toMatch(/Enter an amount/i);
  });

  test("renders one entry per row in the breakdown", () => {
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    for (const row of breakdown.rows) {
      expect(html).toContain(row.label);
    }
  });
});

describe("OrderSummary — submitting (skeleton) state", () => {
  const breakdown = calculateBreakdown(5000);

  test('renders aria-busy="true" when state is "submitting"', () => {
    const html = renderToString(
      <OrderSummary breakdown={breakdown} state="submitting" />,
    );
    expect(html).toContain('aria-busy="true"');
  });

  test("renders the animate-pulse skeleton when submitting", () => {
    const html = renderToString(
      <OrderSummary breakdown={breakdown} state="submitting" />,
    );
    expect(html).toContain("animate-pulse");
  });

  test("does not render the fee row labels when submitting", () => {
    const html = renderToString(
      <OrderSummary breakdown={breakdown} state="submitting" />,
    );
    expect(html).not.toContain("Philotimo routing fee");
    expect(html).not.toContain("Net to charity");
  });

  test("renders the Order summary eyebrow even when submitting", () => {
    const html = renderToString(
      <OrderSummary breakdown={breakdown} state="submitting" />,
    );
    expect(html.toLowerCase()).toContain("order summary");
  });
});

describe("OrderSummary — accessibility & default state", () => {
  test('aria-busy is "false" when state is unset or "ready"', () => {
    const breakdown = calculateBreakdown(5000);
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).toContain('aria-busy="false"');
  });

  test("renders inside a semantic aside element (or region role)", () => {
    const breakdown = calculateBreakdown(5000);
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    expect(html).toMatch(/<aside|role="region"/);
  });
});

describe("OrderSummary — no inline styles on the wrapper", () => {
  test("the root wrapper has no style attribute", () => {
    const breakdown = calculateBreakdown(5000);
    const html = renderToString(<OrderSummary breakdown={breakdown} />);
    const firstTag = html.slice(0, html.indexOf(">") + 1);
    expect(firstTag).not.toMatch(/\sstyle="/);
  });
});
