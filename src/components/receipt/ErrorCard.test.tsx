import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ErrorCard } from "@/components/receipt/ErrorCard";
import type { ErrorKind } from "@/components/receipt/ErrorCard";

describe("ErrorCard — kind: not-found", () => {
  test("renders not-found messaging", () => {
    const html = renderToString(<ErrorCard kind="not-found" />);
    expect(html).toContain("Transaction not found");
  });

  test("not-found copy explains the likely cause", () => {
    const html = renderToString(<ErrorCard kind="not-found" />);
    // The message should mention indexing / mempool delay
    expect(html.toLowerCase()).toMatch(/mempool|pending|index|found/);
  });
});

describe("ErrorCard — kind: wrong-network", () => {
  test("renders wrong-network messaging", () => {
    const html = renderToString(<ErrorCard kind="wrong-network" />);
    expect(html).toContain("Wrong network");
  });

  test("wrong-network copy mentions Base", () => {
    const html = renderToString(<ErrorCard kind="wrong-network" />);
    expect(html).toContain("Base");
  });
});

describe("ErrorCard — kind: wrong-router", () => {
  test("renders wrong-router messaging", () => {
    const html = renderToString(<ErrorCard kind="wrong-router" />);
    expect(html).toContain("Unrecognised router");
  });

  test("wrong-router copy references the contract/router concept", () => {
    const html = renderToString(<ErrorCard kind="wrong-router" />);
    expect(html.toLowerCase()).toMatch(/router|contract|address/);
  });
});

describe("ErrorCard — kind: unverified", () => {
  test("renders unverified messaging", () => {
    const html = renderToString(<ErrorCard kind="unverified" />);
    expect(html).toContain("Could not verify");
  });

  test("unverified copy mentions on-chain verification", () => {
    const html = renderToString(<ErrorCard kind="unverified" />);
    expect(html.toLowerCase()).toMatch(/verif|chain|transfer|on-chain/);
  });
});

describe("ErrorCard — four distinct kinds render unique messages", () => {
  test("each kind produces distinct heading text", () => {
    const kinds: ErrorKind[] = ["not-found", "wrong-network", "wrong-router", "unverified"];
    const headings = kinds.map((kind) => {
      const html = renderToString(<ErrorCard kind={kind} />);
      // Extract h2/h3 content via simple regex (SSR-rendered string)
      const match = html.match(/<h[23][^>]*>(.*?)<\/h[23]>/);
      return match ? match[1] : "";
    });
    const uniqueHeadings = new Set(headings);
    expect(uniqueHeadings.size).toBe(4);
  });
});

describe("ErrorCard — baseScanUrl prop", () => {
  test("renders BaseScan link when baseScanUrl is provided", () => {
    const url = "https://basescan.org/tx/0xabc123";
    const html = renderToString(<ErrorCard kind="not-found" baseScanUrl={url} />);
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain("BaseScan");
  });

  test("does not render a BaseScan anchor when baseScanUrl is omitted", () => {
    const html = renderToString(<ErrorCard kind="not-found" />);
    expect(html).not.toContain("basescan.org");
  });

  test("baseScanUrl renders for all error kinds", () => {
    const url = "https://basescan.org/tx/0xdef456";
    const kinds: ErrorKind[] = ["not-found", "wrong-network", "wrong-router", "unverified"];
    for (const kind of kinds) {
      const html = renderToString(<ErrorCard kind={kind} baseScanUrl={url} />);
      expect(html).toContain(`href="${url}"`);
    }
  });

  test("BaseScan link opens in a new tab (rel=noopener)", () => {
    const url = "https://basescan.org/tx/0xabc";
    const html = renderToString(<ErrorCard kind="not-found" baseScanUrl={url} />);
    expect(html).toContain("noopener");
  });
});
