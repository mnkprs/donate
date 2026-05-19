import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { DonorDetails } from "@/components/checkout/DonorDetails";

function noop() {}

const baseProps = {
  email: "",
  note: "",
  noteOpen: false,
  onEmailChange: noop,
  onNoteChange: noop,
  onNoteOpenChange: noop,
};

describe("DonorDetails — email field", () => {
  test("renders an email input with type=email and autoComplete=email", () => {
    const html = renderToString(<DonorDetails {...baseProps} />);
    expect(html).toContain('type="email"');
    expect(html.toLowerCase()).toContain('autocomplete="email"');
  });

  test('renders the "Email for receipt" label associated with the input', () => {
    const html = renderToString(<DonorDetails {...baseProps} />);
    expect(html).toContain("Email for receipt");
    expect(html).toMatch(/<label[^>]*for="[^"]+"/);
  });

  test("renders the current email value in the input", () => {
    const html = renderToString(
      <DonorDetails {...baseProps} email="donor@example.org" />,
    );
    expect(html).toContain('value="donor@example.org"');
  });

  test("renders the email error message and aria-invalid when emailError is set", () => {
    const html = renderToString(
      <DonorDetails {...baseProps} emailError="Enter a valid email" />,
    );
    expect(html).toContain("Enter a valid email");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });

  test("does not render an alert region when emailError is not set", () => {
    const html = renderToString(<DonorDetails {...baseProps} />);
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('aria-invalid="true"');
  });
});

describe("DonorDetails — note toggle", () => {
  test("renders the 'Add a note' toggle as a <button type='button'>", () => {
    const html = renderToString(<DonorDetails {...baseProps} />);
    expect(html).toContain("Add a note");
    expect(html).toMatch(/<button[^>]*type="button"/);
  });

  test("does not render a textarea when noteOpen=false", () => {
    const html = renderToString(<DonorDetails {...baseProps} />);
    expect(html).not.toContain("<textarea");
  });

  test("renders the textarea with 3 rows when noteOpen=true", () => {
    const html = renderToString(
      <DonorDetails {...baseProps} noteOpen={true} />,
    );
    expect(html).toContain("<textarea");
    expect(html).toContain('rows="3"');
  });

  test("renders the note label when noteOpen=true", () => {
    const html = renderToString(
      <DonorDetails {...baseProps} noteOpen={true} />,
    );
    expect(html).toMatch(/Leave a note|Note/);
  });

  test("renders the current note value in the textarea when noteOpen=true", () => {
    const html = renderToString(
      <DonorDetails
        {...baseProps}
        noteOpen={true}
        note="For my grandmother."
      />,
    );
    expect(html).toContain("For my grandmother.");
  });

  test("toggle has aria-expanded reflecting noteOpen", () => {
    const closedHtml = renderToString(<DonorDetails {...baseProps} />);
    expect(closedHtml).toContain('aria-expanded="false"');

    const openHtml = renderToString(
      <DonorDetails {...baseProps} noteOpen={true} />,
    );
    expect(openHtml).toContain('aria-expanded="true"');
  });
});

describe("DonorDetails — Tailwind utility classes (no inline styles)", () => {
  test("does not include style= attributes on rendered elements", () => {
    const html = renderToString(
      <DonorDetails
        {...baseProps}
        noteOpen={true}
        email="x@y.z"
        note="hello"
      />,
    );
    expect(html).not.toMatch(/\sstyle="/);
  });
});
