/**
 * Tests for the `/receipt/[txid]/opengraph-image` route (Epic 6, Task 8).
 *
 * `next/og`'s `ImageResponse` cannot run under Node/happy-dom (it relies on
 * the Vercel OG runtime). We mock it so the test suite can assert:
 *   1. The default export returns a value (doesn't throw).
 *   2. `ImageResponse` is constructed (invoked) on the resolved path.
 *   3. The JSX tree passed to `ImageResponse` contains the charity name and
 *      formatted USDC amount.
 *   4. On the fallback path (helper returns null) `ImageResponse` is still
 *      invoked with a generic card.
 */

import { describe, expect, it, vi } from "vitest";
import type { MockedFunction } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — before static imports (vitest hoisting)
// ---------------------------------------------------------------------------

vi.mock("next/og", () => {
  class MockImageResponse {
    _imageResponseNode: unknown;
    _imageResponseOpts: unknown;
    constructor(node: unknown, opts: unknown) {
      this._imageResponseNode = node;
      this._imageResponseOpts = opts;
    }
  }
  return {
    ImageResponse: vi.fn().mockImplementation(function (
      node: unknown,
      opts: unknown,
    ) {
      return new MockImageResponse(node, opts);
    }),
  };
});

vi.mock("@/lib/receipt/loadReceiptForMetadata", () => ({
  loadReceiptForMetadata: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocking
// ---------------------------------------------------------------------------

import { ImageResponse } from "next/og";
import { loadReceiptForMetadata } from "@/lib/receipt/loadReceiptForMetadata";
import OgImage, { size, contentType } from "@/app/receipt/[txid]/opengraph-image";

const mockedLoadReceiptForMetadata =
  loadReceiptForMetadata as MockedFunction<typeof loadReceiptForMetadata>;
const MockedImageResponse = ImageResponse as MockedFunction<typeof ImageResponse>;

const TXID = "0xabc1230000000000000000000000000000000000000000000000000000000def" as const;

const RESOLVED_RECEIPT = {
  charityName: "Palestine Children's Relief Fund",
  amountUsdc: "0.975150",
  verified: true,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts the React node passed as the first arg to ImageResponse. */
function getCapturedNode(): unknown {
  const calls = MockedImageResponse.mock.calls;
  return calls[calls.length - 1]?.[0];
}

/** Recursively stringify a React element tree to plain text for assertions. */
function flattenNode(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node !== "object") return "";

  const obj = node as Record<string, unknown>;

  // React element — recurse into props.children
  if (obj.props) {
    const { children, ...rest } = obj.props as Record<string, unknown>;
    const propsText = Object.values(rest)
      .filter((v) => typeof v === "string")
      .join(" ");
    return propsText + flattenNode(children);
  }

  // Array of nodes
  if (Array.isArray(node)) {
    return (node as unknown[]).map(flattenNode).join("");
  }

  return "";
}

// ---------------------------------------------------------------------------
// Module-level exports
// ---------------------------------------------------------------------------

describe("opengraph-image module exports", () => {
  it("exports size with width and height", () => {
    expect(size).toHaveProperty("width");
    expect(size).toHaveProperty("height");
    expect(typeof size.width).toBe("number");
    expect(typeof size.height).toBe("number");
  });

  it("exports contentType as image/png", () => {
    expect(contentType).toBe("image/png");
  });

  it("exports a default async function", () => {
    expect(typeof OgImage).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Resolved path
// ---------------------------------------------------------------------------

describe("opengraph-image — resolved receipt", () => {
  it("returns a response (does not throw)", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);
    MockedImageResponse.mockClear();

    const result = await OgImage({ params: Promise.resolve({ txid: TXID }) });

    expect(result).toBeDefined();
  });

  it("constructs ImageResponse (invokes the constructor)", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);
    MockedImageResponse.mockClear();

    await OgImage({ params: Promise.resolve({ txid: TXID }) });

    expect(MockedImageResponse).toHaveBeenCalledTimes(1);
  });

  it("passes size options to ImageResponse", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);
    MockedImageResponse.mockClear();

    await OgImage({ params: Promise.resolve({ txid: TXID }) });

    const opts = MockedImageResponse.mock.calls[0]?.[1] as
      | { width: number; height: number }
      | undefined;
    expect(opts?.width).toBe(size.width);
    expect(opts?.height).toBe(size.height);
  });

  it("includes charity name in the JSX tree", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);
    MockedImageResponse.mockClear();

    await OgImage({ params: Promise.resolve({ txid: TXID }) });

    const text = flattenNode(getCapturedNode());
    expect(text).toContain("Palestine Children's Relief Fund");
  });

  it("includes the USDC amount in the JSX tree", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);
    MockedImageResponse.mockClear();

    await OgImage({ params: Promise.resolve({ txid: TXID }) });

    const text = flattenNode(getCapturedNode());
    expect(text).toContain("0.975150");
  });

  it("includes a 'Verified' label in the JSX tree", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(RESOLVED_RECEIPT);
    MockedImageResponse.mockClear();

    await OgImage({ params: Promise.resolve({ txid: TXID }) });

    const text = flattenNode(getCapturedNode());
    expect(text.toLowerCase()).toContain("verified");
  });
});

// ---------------------------------------------------------------------------
// Fallback path — helper returns null
// ---------------------------------------------------------------------------

describe("opengraph-image — fallback (helper returns null)", () => {
  it("returns a response and does not throw on fallback", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(null);
    MockedImageResponse.mockClear();

    const result = await OgImage({ params: Promise.resolve({ txid: TXID }) });

    expect(result).toBeDefined();
  });

  it("still constructs ImageResponse on fallback", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(null);
    MockedImageResponse.mockClear();

    await OgImage({ params: Promise.resolve({ txid: TXID }) });

    expect(MockedImageResponse).toHaveBeenCalledTimes(1);
  });

  it("includes 'Eudaimonia' in the fallback JSX tree", async () => {
    mockedLoadReceiptForMetadata.mockResolvedValue(null);
    MockedImageResponse.mockClear();

    await OgImage({ params: Promise.resolve({ txid: TXID }) });

    const text = flattenNode(getCapturedNode());
    expect(text).toContain("Eudaimonia");
  });
});

// ---------------------------------------------------------------------------
// Error resilience — loadReceiptForMetadata throws
// ---------------------------------------------------------------------------

describe("opengraph-image — error resilience", () => {
  it("does not throw when helper throws; still returns ImageResponse", async () => {
    mockedLoadReceiptForMetadata.mockRejectedValue(new Error("RPC timeout"));
    MockedImageResponse.mockClear();

    const result = await OgImage({ params: Promise.resolve({ txid: TXID }) });

    expect(result).toBeDefined();
    expect(MockedImageResponse).toHaveBeenCalledTimes(1);
  });
});
