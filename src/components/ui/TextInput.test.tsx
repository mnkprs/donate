import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { TextInput } from "@/components/ui/TextInput";

describe("TextInput", () => {
  test("renders a semantic <input> element", () => {
    const html = renderToString(<TextInput value="" onChange={() => {}} />);
    expect(html).toContain("<input");
  });

  test("type defaults to text but is overridable", () => {
    const text = renderToString(<TextInput value="" onChange={() => {}} />);
    const email = renderToString(
      <TextInput value="" onChange={() => {}} type="email" />,
    );

    expect(text).toContain('type="text"');
    expect(email).toContain('type="email"');
  });

  test("passes through placeholder, autoComplete, and id", () => {
    const html = renderToString(
      <TextInput
        value=""
        onChange={() => {}}
        placeholder="you@example.com"
        autoComplete="email"
        id="donor-email"
      />,
    );

    expect(html).toContain('placeholder="you@example.com"');
    expect(html.toLowerCase()).toContain('autocomplete="email"');
    expect(html).toContain('id="donor-email"');
  });

  test("reflects the current value", () => {
    const html = renderToString(
      <TextInput value="25.50" onChange={() => {}} />,
    );
    expect(html).toContain('value="25.50"');
  });

  test("renders a prefix slot when provided", () => {
    const html = renderToString(
      <TextInput
        value=""
        onChange={() => {}}
        prefix={<span data-test="px">$</span>}
      />,
    );
    expect(html).toContain('data-test="px"');
    expect(html).toContain("$");
  });

  test("renders a suffix slot when provided", () => {
    const html = renderToString(
      <TextInput
        value=""
        onChange={() => {}}
        suffix={<span data-test="sx">USD</span>}
      />,
    );
    expect(html).toContain('data-test="sx"');
    expect(html).toContain("USD");
  });

  test("invalid state surfaces aria-invalid=true", () => {
    const html = renderToString(
      <TextInput value="bad" onChange={() => {}} invalid />,
    );
    expect(html).toContain('aria-invalid="true"');
  });

  test("default state omits aria-invalid=true", () => {
    const html = renderToString(<TextInput value="" onChange={() => {}} />);
    expect(html).not.toContain('aria-invalid="true"');
  });

  test("uses Tailwind border + focus utilities", () => {
    const html = renderToString(<TextInput value="" onChange={() => {}} />);
    expect(html).toContain("border");
    expect(html).toContain("focus-within:border-iris");
  });

  test("mono prop opts into monospace font utility", () => {
    const html = renderToString(
      <TextInput value="" onChange={() => {}} mono />,
    );
    expect(html).toContain("font-mono");
  });

  test("aria-describedby is wired when describedBy prop is set", () => {
    const html = renderToString(
      <TextInput value="" onChange={() => {}} describedBy="amount-help" />,
    );
    expect(html).toContain('aria-describedby="amount-help"');
  });
});
