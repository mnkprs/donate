import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";

function asyncNoop(): Promise<void> {
  return Promise.resolve();
}

const baseProps = {
  campaignId: "pcrf",
  onSubmit: asyncNoop,
};

describe("CheckoutForm — initial render contract", () => {
  test("renders as a <form> element with submit semantics", () => {
    const html = renderToString(<CheckoutForm {...baseProps} />);
    expect(html).toMatch(/<form[\s>]/);
  });

  test("renders the AmountSelector (donation amount label)", () => {
    const html = renderToString(<CheckoutForm {...baseProps} />);
    expect(html).toContain("Donation amount");
  });

  test("renders the DonorDetails (email-for-receipt label)", () => {
    const html = renderToString(<CheckoutForm {...baseProps} />);
    expect(html).toContain("Email for receipt");
  });

  test("renders the OrderSummary (empty state on first render)", () => {
    const html = renderToString(<CheckoutForm {...baseProps} />);
    expect(html).toContain("Order summary");
    expect(html).toContain("Enter an amount to see the breakdown.");
  });

  test("renders a submit button labelled Donate", () => {
    const html = renderToString(<CheckoutForm {...baseProps} />);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>/);
    expect(html).toContain("Donate");
  });

  test("does NOT surface validation errors on first render (errors hide until submit)", () => {
    const html = renderToString(<CheckoutForm {...baseProps} />);
    expect(html).not.toMatch(/role="alert"/);
  });

  test("does NOT show the top-level submit-error region on first render", () => {
    const html = renderToString(<CheckoutForm {...baseProps} />);
    expect(html).not.toContain("Something went wrong");
  });

  test("OrderSummary is not in submitting state on first render (aria-busy=false)", () => {
    const html = renderToString(<CheckoutForm {...baseProps} />);
    expect(html).toContain('aria-busy="false"');
  });
});

describe("CheckoutForm — Tailwind utility classes (no inline styles)", () => {
  test("does not include style= attributes outside the OrderSummary subtree", () => {
    // The pre-existing EyebrowLabel atom (rendered inside OrderSummary's
    // <aside>) and OrderSummary's row labels use inline `style` for the
    // uppercase eyebrow and muted-label color respectively — both are out of
    // scope for Phase 7. Scope this assertion to the form's first column.
    const html = renderToString(<CheckoutForm {...baseProps} />);
    const beforeAside = html.split("<aside")[0] ?? "";
    expect(beforeAside).not.toMatch(/\sstyle="/);
  });
});
