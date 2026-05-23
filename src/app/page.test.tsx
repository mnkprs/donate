import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

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

describe("Home — LiveReceiptStrip mainnet-only mount (#27)", () => {
  const originalChain = process.env.NEXT_PUBLIC_CHAIN;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_CHAIN;
  });

  afterEach(() => {
    if (originalChain === undefined) {
      delete process.env.NEXT_PUBLIC_CHAIN;
    } else {
      process.env.NEXT_PUBLIC_CHAIN = originalChain;
    }
  });

  test("mounts the Live receipts strip when chain is Base mainnet", () => {
    process.env.NEXT_PUBLIC_CHAIN = "base";
    const html = renderToString(<Home />);
    expect(html).toContain("Live receipts");
  });

  test("does not mount the Live receipts strip on Base Sepolia", () => {
    process.env.NEXT_PUBLIC_CHAIN = "base-sepolia";
    const html = renderToString(<Home />);
    expect(html).not.toContain("Live receipts");
  });

  test("does not mount the Live receipts strip when chain env is unset", () => {
    const html = renderToString(<Home />);
    expect(html).not.toContain("Live receipts");
  });
});
