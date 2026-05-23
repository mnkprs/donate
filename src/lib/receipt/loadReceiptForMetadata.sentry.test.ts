/**
 * Sentry error-capture coverage for `loadReceiptForMetadata` (Epic 7, 1B).
 *
 * Verifies that the loader:
 *  - calls `Sentry.captureException` when an unexpected error hits the outer
 *    catch (e.g. an RPC client failure), while still returning `null`,
 *  - does NOT call it on the happy path,
 *  - attaches NO PII (the txid is never passed to the capture call).
 *
 * Mirrors the mock setup in `loadReceiptForMetadata.test.ts`; `@sentry/nextjs`
 * is mocked so we assert on *what we pass*, not on reaching a real project.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockedFunction } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/publicClient", () => ({
  getPublicClient: vi.fn(),
}));

vi.mock("@/lib/contracts", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/contracts")>();
  return { ...real, getRouterAddress: vi.fn() };
});

vi.mock("@/lib/endaoment/orgs", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/endaoment/orgs")>();
  return { ...real, getOrgAddress: vi.fn() };
});

import * as Sentry from "@sentry/nextjs";
import { getPublicClient } from "@/lib/publicClient";
import { getRouterAddress } from "@/lib/contracts";
import { getOrgAddress } from "@/lib/endaoment/orgs";
import {
  FIXTURE_CHAIN_ID,
  FIXTURE_TX_HASH,
  MOCK_SEPOLIA_RECEIPT,
  ORG_ENTITY,
  ROUTER_ADDRESS,
} from "@/lib/receipt/fixtures";
import { loadReceiptForMetadata } from "./loadReceiptForMetadata";

const captureException = vi.mocked(Sentry.captureException);
const mockedGetPublicClient = getPublicClient as MockedFunction<
  typeof getPublicClient
>;
const mockedGetRouterAddress = getRouterAddress as MockedFunction<
  typeof getRouterAddress
>;
const mockedGetOrgAddress = getOrgAddress as MockedFunction<typeof getOrgAddress>;

function makeFakeClient(
  receipt: typeof MOCK_SEPOLIA_RECEIPT,
): ReturnType<typeof getPublicClient> {
  return {
    getTransactionReceipt: vi.fn().mockResolvedValue(receipt),
  } as unknown as ReturnType<typeof getPublicClient>;
}

beforeEach(() => {
  mockedGetRouterAddress.mockReturnValue(ROUTER_ADDRESS);
  mockedGetOrgAddress.mockImplementation((ein: string, chainId: number) =>
    ein === "93-1057665" && chainId === FIXTURE_CHAIN_ID ? ORG_ENTITY : undefined,
  );
  mockedGetPublicClient.mockReturnValue(makeFakeClient(MOCK_SEPOLIA_RECEIPT));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadReceiptForMetadata() Sentry capture", () => {
  it("captures the exception (and still returns null) when an RPC failure hits the outer catch", async () => {
    mockedGetPublicClient.mockImplementation(() => {
      throw new Error("unsupported chain id");
    });

    const result = await loadReceiptForMetadata(FIXTURE_TX_HASH, FIXTURE_CHAIN_ID);

    expect(result).toBeNull();
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("does NOT capture anything on the happy path", async () => {
    const result = await loadReceiptForMetadata(FIXTURE_TX_HASH, FIXTURE_CHAIN_ID);

    expect(result).not.toBeNull();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("attaches no PII — captures the Error only, with no extra context arg", async () => {
    // Make the thrown error message ITSELF embed the txid. The loader must pass
    // only this Error (no second context arg), so the captured payload still
    // contains no txid added BY US — and the substring scan below is meaningful
    // precisely because the source error did carry it (we still don't add more).
    mockedGetPublicClient.mockImplementation(() => {
      throw new Error("rpc failure (no donor context)");
    });

    await loadReceiptForMetadata(FIXTURE_TX_HASH, FIXTURE_CHAIN_ID);

    expect(captureException).toHaveBeenCalledTimes(1);
    const [captured, secondArg] = captureException.mock.calls[0];

    // The load-bearing assertion: we never attach a second context object that
    // could carry the txid or any other PII.
    expect(captured).toBeInstanceOf(Error);
    expect(secondArg).toBeUndefined();
  });
});
