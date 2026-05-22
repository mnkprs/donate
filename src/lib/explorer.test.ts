import { describe, expect, test } from "vitest";
import { base, baseSepolia } from "wagmi/chains";

import { deriveLogUrl, deriveTxUrl } from "@/lib/explorer";

const TX =
  "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123" as const;

describe("deriveTxUrl", () => {
  test("returns Base mainnet tx URL for base.id", () => {
    expect(deriveTxUrl(TX, base.id)).toBe(
      `https://basescan.org/tx/${TX}`,
    );
  });

  test("returns Base Sepolia tx URL for baseSepolia.id", () => {
    expect(deriveTxUrl(TX, baseSepolia.id)).toBe(
      `https://sepolia.basescan.org/tx/${TX}`,
    );
  });

  test("falls back to Base mainnet for an unrecognised chain id (matches deriveBaseScanUrl convention)", () => {
    // deriveBaseScanUrl falls back to mainnet for unknown chains — mirror that.
    expect(deriveTxUrl(TX, 1)).toBe(`https://basescan.org/tx/${TX}`);
  });

  test("tx URL does not contain a fragment", () => {
    const url = deriveTxUrl(TX, base.id);
    expect(url).not.toContain("#");
  });
});

describe("deriveLogUrl", () => {
  test("returns Base mainnet tx URL with #eventlog anchor for base.id", () => {
    expect(deriveLogUrl(TX, base.id)).toBe(
      `https://basescan.org/tx/${TX}#eventlog`,
    );
  });

  test("returns Base Sepolia tx URL with #eventlog anchor for baseSepolia.id", () => {
    expect(deriveLogUrl(TX, baseSepolia.id)).toBe(
      `https://sepolia.basescan.org/tx/${TX}#eventlog`,
    );
  });

  test("falls back to Base mainnet for an unrecognised chain id", () => {
    expect(deriveLogUrl(TX, 1)).toBe(`https://basescan.org/tx/${TX}#eventlog`);
  });

  test("logIndex parameter does not change the returned URL (BaseScan #eventlog is a tab, not a per-log anchor)", () => {
    const withoutIndex = deriveLogUrl(TX, base.id);
    const withIndex0 = deriveLogUrl(TX, base.id, 0);
    const withIndex3 = deriveLogUrl(TX, base.id, 3);
    expect(withIndex0).toBe(withoutIndex);
    expect(withIndex3).toBe(withoutIndex);
  });

  test("log URL always ends with #eventlog", () => {
    const url = deriveLogUrl(TX, base.id, 2);
    expect(url.endsWith("#eventlog")).toBe(true);
  });
});
