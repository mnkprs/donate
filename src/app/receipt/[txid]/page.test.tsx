import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { MockedFunction } from "vitest";

import ReceiptPage, { generateMetadata } from "@/app/receipt/[txid]/page";

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

/**
 * Mock the server-side receipt helper so generateMetadata tests do not
 * need a real viem client or network. The mock is hoisted and set per-test.
 */
vi.mock("@/lib/receipt/loadReceiptForMetadata", () => ({
  loadReceiptForMetadata: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocking
// ---------------------------------------------------------------------------

import { base, baseSepolia } from "wagmi/chains";
import { loadReceiptForMetadata } from "@/lib/receipt/loadReceiptForMetadata";

const mockedLoadReceiptForMetadata =
  loadReceiptForMetadata as MockedFunction<typeof loadReceiptForMetadata>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TXID = "0xabc1230000000000000000000000000000000000000000000000000000000def" as const;

const RESOLVED_RECEIPT = {
  charityName: "Palestine Children's Relief Fund",
  amountUsdc: "0.975150",
  verified: true,
} as const;

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
// Tests — server shell (Task 7, kept green)
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

// ---------------------------------------------------------------------------
// Tests — generateMetadata (Task 8)
// ---------------------------------------------------------------------------

describe("generateMetadata (/receipt/[txid])", () => {
  // -------------------------------------------------------------------------
  // Resolved path — helper returns charity + amount
  // -------------------------------------------------------------------------

  test("includes charity name in og:title when helper resolves", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    const title =
      typeof metadata.title === "string"
        ? metadata.title
        : (metadata.title as { default?: string })?.default ?? "";

    expect(title).toContain("Palestine Children's Relief Fund");
  });

  test("includes 'Eudaimonia' in the title when helper resolves", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    const title =
      typeof metadata.title === "string"
        ? metadata.title
        : (metadata.title as { default?: string })?.default ?? "";

    expect(title).toContain("Eudaimonia");
  });

  test("sets openGraph title containing charity name when helper resolves", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    const ogTitle = metadata.openGraph?.title;
    expect(typeof ogTitle === "string" ? ogTitle : "").toContain(
      "Palestine Children's Relief Fund",
    );
  });

  test("sets openGraph description containing the USDC amount when helper resolves", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    const ogDesc = metadata.openGraph?.description ?? "";
    expect(ogDesc).toContain("0.975150");
  });

  test("sets twitter card to summary_large_image when helper resolves", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    const twitter = metadata.twitter as Record<string, unknown> | undefined;
    expect(twitter?.card).toBe("summary_large_image");
  });

  test("sets twitter title containing charity name when helper resolves", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    const twitter = metadata.twitter as Record<string, unknown> | undefined;
    const twitterTitle = (twitter?.title ?? "") as string;
    expect(twitterTitle).toContain("Palestine Children's Relief Fund");
  });

  // -------------------------------------------------------------------------
  // Fallback path — helper returns null
  // -------------------------------------------------------------------------

  test("returns valid metadata (does not throw) when helper returns null", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(null);

    await expect(
      generateMetadata({
        params: Promise.resolve({ txid: TXID }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toBeDefined();
  });

  test("uses generic fallback title when helper returns null", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    const title =
      typeof metadata.title === "string"
        ? metadata.title
        : (metadata.title as { default?: string })?.default ?? "";

    expect(title).toContain("Eudaimonia");
    expect(title.length).toBeGreaterThan(0);
  });

  test("sets twitter card to summary_large_image even on fallback", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    const twitter = metadata.twitter as Record<string, unknown> | undefined;
    expect(twitter?.card).toBe("summary_large_image");
  });

  test("includes openGraph object on fallback", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.openGraph).toBeDefined();
    const ogTitle = metadata.openGraph?.title ?? "";
    expect(typeof ogTitle === "string" ? ogTitle.length : 0).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Does not include og:images manually (Next auto-wires opengraph-image.tsx)
  // -------------------------------------------------------------------------

  test("does not set openGraph.images manually (Next auto-wires the OG image route)", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);

    const metadata = await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.openGraph?.images).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — E6.1: generateMetadata passes correct chainId from NEXT_PUBLIC_CHAIN
// ---------------------------------------------------------------------------

describe("generateMetadata — E6.1 chainId resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  test("passes base.id when NEXT_PUBLIC_CHAIN=base", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN", "base");
    mockedLoadReceiptForMetadata.mockResolvedValue(null);

    await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    expect(mockedLoadReceiptForMetadata).toHaveBeenCalledWith(
      TXID,
      base.id,
    );
  });

  test("passes baseSepolia.id when NEXT_PUBLIC_CHAIN=base-sepolia", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN", "base-sepolia");
    mockedLoadReceiptForMetadata.mockResolvedValue(null);

    await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    expect(mockedLoadReceiptForMetadata).toHaveBeenCalledWith(
      TXID,
      baseSepolia.id,
    );
  });

  test("passes baseSepolia.id when NEXT_PUBLIC_CHAIN is unset (empty string)", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN", "");
    mockedLoadReceiptForMetadata.mockResolvedValue(null);

    await generateMetadata({
      params: Promise.resolve({ txid: TXID }),
      searchParams: Promise.resolve({}),
    });

    expect(mockedLoadReceiptForMetadata).toHaveBeenCalledWith(
      TXID,
      baseSepolia.id,
    );
  });
});
