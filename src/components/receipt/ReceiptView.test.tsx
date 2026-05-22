import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { RECEIPT_BUNDLE_FIXTURE } from "@/lib/fixtures";

// ---------------------------------------------------------------------------
// Module mocks — declared before the component import
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useReceipt", () => ({
  useReceipt: vi.fn(),
}));

vi.mock("@/components/receipt/ReceiptSkeleton", () => ({
  ReceiptSkeleton: () => <div data-testid="receipt-skeleton">skeleton</div>,
}));

vi.mock("@/components/receipt/ErrorCard", () => ({
  ErrorCard: ({ kind, baseScanUrl }: { kind: string; baseScanUrl?: string }) => (
    <div
      data-testid="error-card"
      data-kind={kind}
      data-basescan-url={baseScanUrl ?? ""}
    >
      error-{kind}
    </div>
  ),
}));

vi.mock("@/components/receipt/EudaimoniaReceipt", () => ({
  EudaimoniaReceipt: ({ bundle }: { bundle: { data: { charity: string } } }) => (
    <div
      data-testid="eudaimonia-receipt"
      data-charity={bundle.data.charity}
    >
      receipt
    </div>
  ),
}));

vi.mock("@/lib/explorer", () => ({
  deriveTxUrl: (txid: string, chainId: number) =>
    `https://sepolia.basescan.org/tx/${txid}?chain=${chainId}`,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useReceipt } from "@/hooks/useReceipt";
import { ReceiptView } from "@/components/receipt/ReceiptView";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TXID = "0xabc1230000000000000000000000000000000000000000000000000000000def" as const;
const CHAIN_ID = 84532; // baseSepolia.id

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReceiptView", () => {
  // -------------------------------------------------------------------------
  // loading state
  // -------------------------------------------------------------------------

  test("loading: renders ReceiptSkeleton", () => {
    vi.mocked(useReceipt).mockReturnValue({
      status: "loading",
      prefersReducedMotion: false,
    });

    const html = renderToString(<ReceiptView txid={TXID} chainId={CHAIN_ID} />);

    expect(html).toContain("receipt-skeleton");
    expect(html).not.toContain("eudaimonia-receipt");
    expect(html).not.toContain("error-card");
  });

  // -------------------------------------------------------------------------
  // pending state
  // -------------------------------------------------------------------------

  test("pending: renders ReceiptSkeleton", () => {
    vi.mocked(useReceipt).mockReturnValue({
      status: "pending",
      attempts: 2,
      prefersReducedMotion: false,
    });

    const html = renderToString(<ReceiptView txid={TXID} chainId={CHAIN_ID} />);

    expect(html).toContain("receipt-skeleton");
    expect(html).not.toContain("eudaimonia-receipt");
    expect(html).not.toContain("error-card");
  });

  // -------------------------------------------------------------------------
  // ready state
  // -------------------------------------------------------------------------

  test("ready: renders EudaimoniaReceipt with the fixture bundle charity", () => {
    vi.mocked(useReceipt).mockReturnValue({
      status: "ready",
      bundle: RECEIPT_BUNDLE_FIXTURE,
      prefersReducedMotion: false,
    });

    const html = renderToString(<ReceiptView txid={TXID} chainId={CHAIN_ID} />);

    expect(html).toContain("eudaimonia-receipt");
    expect(html).toContain("Black Women in Blockchain Inc");
    expect(html).not.toContain("receipt-skeleton");
    expect(html).not.toContain("error-card");
  });

  // -------------------------------------------------------------------------
  // not-found state
  // -------------------------------------------------------------------------

  test("not-found: renders ErrorCard with kind=not-found and baseScanUrl", () => {
    vi.mocked(useReceipt).mockReturnValue({
      status: "not-found",
      prefersReducedMotion: false,
    });

    const html = renderToString(<ReceiptView txid={TXID} chainId={CHAIN_ID} />);

    expect(html).toContain("error-card");
    expect(html).toContain(`data-kind="not-found"`);
    expect(html).toContain(
      `data-basescan-url="https://sepolia.basescan.org/tx/${TXID}?chain=${CHAIN_ID}"`,
    );
    expect(html).not.toContain("receipt-skeleton");
    expect(html).not.toContain("eudaimonia-receipt");
  });

  // -------------------------------------------------------------------------
  // wrong-network state
  // -------------------------------------------------------------------------

  test("wrong-network: renders ErrorCard with kind=wrong-network and baseScanUrl", () => {
    vi.mocked(useReceipt).mockReturnValue({
      status: "wrong-network",
      prefersReducedMotion: false,
    });

    const html = renderToString(<ReceiptView txid={TXID} chainId={CHAIN_ID} />);

    expect(html).toContain("error-card");
    expect(html).toContain(`data-kind="wrong-network"`);
    expect(html).toContain(
      `data-basescan-url="https://sepolia.basescan.org/tx/${TXID}?chain=${CHAIN_ID}"`,
    );
  });

  // -------------------------------------------------------------------------
  // wrong-router state
  // -------------------------------------------------------------------------

  test("wrong-router: renders ErrorCard with kind=wrong-router and baseScanUrl", () => {
    vi.mocked(useReceipt).mockReturnValue({
      status: "wrong-router",
      prefersReducedMotion: false,
    });

    const html = renderToString(<ReceiptView txid={TXID} chainId={CHAIN_ID} />);

    expect(html).toContain("error-card");
    expect(html).toContain(`data-kind="wrong-router"`);
    expect(html).toContain(
      `data-basescan-url="https://sepolia.basescan.org/tx/${TXID}?chain=${CHAIN_ID}"`,
    );
  });

  // -------------------------------------------------------------------------
  // unverified state
  // -------------------------------------------------------------------------

  test("unverified: renders ErrorCard with kind=unverified and baseScanUrl", () => {
    vi.mocked(useReceipt).mockReturnValue({
      status: "unverified",
      reason: "no-routed-log",
      prefersReducedMotion: false,
    });

    const html = renderToString(<ReceiptView txid={TXID} chainId={CHAIN_ID} />);

    expect(html).toContain("error-card");
    expect(html).toContain(`data-kind="unverified"`);
    expect(html).toContain(
      `data-basescan-url="https://sepolia.basescan.org/tx/${TXID}?chain=${CHAIN_ID}"`,
    );
    expect(html).not.toContain("receipt-skeleton");
    expect(html).not.toContain("eudaimonia-receipt");
  });

  // -------------------------------------------------------------------------
  // chainId optional — omitted falls back to hook default
  // -------------------------------------------------------------------------

  test("renders without crashing when chainId is omitted", () => {
    vi.mocked(useReceipt).mockReturnValue({
      status: "loading",
      prefersReducedMotion: false,
    });

    // Should not throw
    expect(() => renderToString(<ReceiptView txid={TXID} />)).not.toThrow();
  });
});
