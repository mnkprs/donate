import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import ReceiptPage from "@/app/receipt/[txid]/page";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/**
 * Mock ReceiptView so the server shell test does not need wagmi/viem
 * infrastructure. The stub renders a marker element containing the txid
 * so we can assert the shell parsed the route param correctly.
 */
vi.mock("@/components/receipt/ReceiptView", () => ({
  ReceiptView: ({ txid, chainId }: { txid: string; chainId?: number }) => (
    <div
      data-testid="receipt-view-stub"
      data-txid={txid}
      data-chain-id={chainId ?? ""}
    />
  ),
}));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TXID = "0xabc1230000000000000000000000000000000000000000000000000000000def" as const;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderShell(txid: string): Promise<string> {
  const element = await ReceiptPage({
    params: Promise.resolve({ txid }),
    searchParams: Promise.resolve({}),
  });
  return renderToString(element);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReceiptPage server shell (/receipt/[txid])", () => {
  // -------------------------------------------------------------------------
  // Core: shell renders ReceiptView with the parsed txid
  // -------------------------------------------------------------------------

  test("renders ReceiptView stub with the parsed txid from route params", async () => {
    const html = await renderShell(TXID);
    expect(html).toContain("receipt-view-stub");
    expect(html).toContain(TXID);
  });

  test("parsed txid is forwarded as the txid prop of ReceiptView", async () => {
    const html = await renderShell(TXID);
    // data-txid attribute carries the parsed param value
    expect(html).toContain(`data-txid="${TXID}"`);
  });

  test("renders with a different txid correctly", async () => {
    const otherTxid = "0xdeadbeef00000000000000000000000000000000000000000000000000000001";
    const html = await renderShell(otherTxid);
    expect(html).toContain(`data-txid="${otherTxid}"`);
  });

  // -------------------------------------------------------------------------
  // Shell structure — does not crash, does not call server-side data loaders
  // -------------------------------------------------------------------------

  test("does not throw for a well-formed txid", async () => {
    await expect(renderShell(TXID)).resolves.toBeDefined();
  });

  test("does not throw for an arbitrary string txid", async () => {
    await expect(renderShell("not-a-hex-hash")).resolves.toBeDefined();
  });
});
