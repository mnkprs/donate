import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import Home from "@/app/page";
import { CAMPAIGNS } from "@/lib/campaigns";

describe("Home (landing /)", () => {
  test("renders a single <main> landmark", () => {
    const html = renderToString(<Home />);
    const mainOpen = html.match(/<main\b/g) ?? [];
    expect(mainOpen.length).toBe(1);
  });

  test("renders exactly one <h1>, one <nav>, and one <footer>", () => {
    const html = renderToString(<Home />);
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect((html.match(/<nav\b/g) ?? []).length).toBe(1);
    expect((html.match(/<footer\b/g) ?? []).length).toBe(1);
  });

  test("renders one donate link per campaign", () => {
    const html = renderToString(<Home />);
    for (const c of CAMPAIGNS) {
      expect(html).toContain(`href="/donate/${c.id}"`);
    }
  });

  test("includes the causes section anchor target", () => {
    const html = renderToString(<Home />);
    expect(html).toContain('id="causes"');
  });
});
