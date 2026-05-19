import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { TextArea } from "@/components/ui/TextArea";

describe("TextArea", () => {
  test("renders a semantic <textarea> element", () => {
    const html = renderToString(<TextArea value="" onChange={() => {}} />);
    expect(html).toContain("<textarea");
  });

  test("rows defaults to 3 but is overridable", () => {
    const defaultRows = renderToString(
      <TextArea value="" onChange={() => {}} />,
    );
    const customRows = renderToString(
      <TextArea value="" onChange={() => {}} rows={6} />,
    );

    expect(defaultRows).toContain('rows="3"');
    expect(customRows).toContain('rows="6"');
  });

  test("reflects the current value as textarea content", () => {
    const html = renderToString(
      <TextArea value="Thanks for your work." onChange={() => {}} />,
    );
    expect(html).toContain("Thanks for your work.");
  });

  test("passes placeholder and id through", () => {
    const html = renderToString(
      <TextArea
        value=""
        onChange={() => {}}
        placeholder="Optional note"
        id="donor-note"
      />,
    );
    expect(html).toContain('placeholder="Optional note"');
    expect(html).toContain('id="donor-note"');
  });

  test("invalid state surfaces aria-invalid=true", () => {
    const html = renderToString(
      <TextArea value="" onChange={() => {}} invalid />,
    );
    expect(html).toContain('aria-invalid="true"');
  });

  test("default state omits aria-invalid=true", () => {
    const html = renderToString(<TextArea value="" onChange={() => {}} />);
    expect(html).not.toContain('aria-invalid="true"');
  });

  test("uses Tailwind border + focus utilities", () => {
    const html = renderToString(<TextArea value="" onChange={() => {}} />);
    expect(html).toContain("border");
    expect(html).toContain("focus:border-iris");
  });

  test("never renders an inline style attribute", () => {
    const html = renderToString(<TextArea value="" onChange={() => {}} />);
    expect(html).not.toContain("style=");
  });
});
