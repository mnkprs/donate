import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { FieldLabel } from "@/components/ui/FieldLabel";

describe("FieldLabel", () => {
  test("renders a semantic <label> element with the children text", () => {
    const html = renderToString(
      <FieldLabel htmlFor="donor-email">Email</FieldLabel>,
    );
    expect(html).toContain("<label");
    expect(html).toContain("Email");
  });

  test("wires htmlFor through to the underlying label (input association)", () => {
    const html = renderToString(
      <FieldLabel htmlFor="donor-email">Email</FieldLabel>,
    );
    expect(html).toContain('for="donor-email"');
  });

  test("renders the hint slot when provided", () => {
    const html = renderToString(
      <FieldLabel htmlFor="amount" hint="USD only">
        Amount
      </FieldLabel>,
    );
    expect(html).toContain("Amount");
    expect(html).toContain("USD only");
  });

  test("omits the hint markup when no hint prop is supplied", () => {
    const html = renderToString(
      <FieldLabel htmlFor="amount">Amount</FieldLabel>,
    );
    expect(html).not.toContain("USD only");
  });

  test("uses text-ink utility on the label and text-mute on the hint", () => {
    const html = renderToString(
      <FieldLabel htmlFor="x" hint="optional">
        Note
      </FieldLabel>,
    );
    expect(html).toContain("text-ink");
    expect(html).toContain("text-mute");
  });

  test("never renders an inline style attribute", () => {
    const html = renderToString(
      <FieldLabel htmlFor="x" hint="optional">
        Note
      </FieldLabel>,
    );
    expect(html).not.toContain("style=");
  });
});
