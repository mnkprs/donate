import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { LiveReceiptStripView } from "@/components/receipt/LiveReceiptStrip";
import type { RecentDonation } from "@/lib/receipt/recentDonations";

const DONATIONS: RecentDonation[] = [
  {
    txid: `0x${"a".repeat(64)}`,
    txidShort: "0xaaaa…aaaa",
    donorShort: "0x1111…1111",
    orgShort: "0x2222…2222",
    grossUsdc: "50.00",
    netUsdc: "49.50",
    blockNumber: 200n,
  },
  {
    txid: `0x${"b".repeat(64)}`,
    txidShort: "0xbbbb…bbbb",
    donorShort: "0x3333…3333",
    orgShort: "0x4444…4444",
    grossUsdc: "10.00",
    netUsdc: "9.90",
    blockNumber: 100n,
  },
];

describe("LiveReceiptStripView — ready", () => {
  test("labels the strip and renders one row per donation", () => {
    const html = renderToString(
      <LiveReceiptStripView status={{ kind: "ready", donations: DONATIONS }} />,
    );

    expect(html).toContain("Live receipts");
    // Net (settled) amounts — the honest delivered value, not gross.
    expect(html).toContain("49.50");
    expect(html).toContain("9.90");
    // Counterparty + transaction provenance, shown as on-chain addresses.
    expect(html).toContain("0x2222…2222");
    expect(html).toContain("0xaaaa…aaaa");
  });

  test("never shows the unavailable copy when donations exist", () => {
    const html = renderToString(
      <LiveReceiptStripView status={{ kind: "ready", donations: DONATIONS }} />,
    );
    expect(html).not.toContain("Receipts unavailable");
  });
});

describe("LiveReceiptStripView — unavailable", () => {
  test("shows the honest unavailable message and no fabricated rows", () => {
    const html = renderToString(
      <LiveReceiptStripView status={{ kind: "unavailable" }} />,
    );

    expect(html).toContain("Live receipts");
    expect(html).toContain("Receipts unavailable");
    // No fabricated data: a sample row address must be absent.
    expect(html).not.toContain("0x2222…2222");
  });
});

describe("LiveReceiptStripView — loading", () => {
  test("renders a skeleton placeholder, not real or empty data", () => {
    const html = renderToString(
      <LiveReceiptStripView status={{ kind: "loading" }} />,
    );

    expect(html).toContain("Live receipts");
    expect(html).toContain('data-testid="live-receipt-skeleton"');
    expect(html).not.toContain("Receipts unavailable");
  });
});
