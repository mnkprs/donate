import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ReceiptPage from "@/app/receipt/[txid]/page";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that pull the modules
// ---------------------------------------------------------------------------

vi.mock("@/lib/endaoment/registry", () => ({
  getCharity: vi.fn(),
}));

vi.mock("@/lib/endaoment/metadata", () => ({
  resolveOrgMetadata: vi.fn(),
}));

vi.mock("@/lib/endaoment/verify", () => ({
  verifyDonation: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import mocked modules for type-safe spy access
// ---------------------------------------------------------------------------

import { getCharity } from "@/lib/endaoment/registry";
import { resolveOrgMetadata } from "@/lib/endaoment/metadata";
import { verifyDonation } from "@/lib/endaoment/verify";
import type { Charity } from "@/types/charity";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TXID = "0xabc1230000000000000000000000000000000000000000000000000000000def" as const;
const CHAIN_ID = 8453; // base.id

const CHARITY_FIXTURE: Charity = {
  id: "pcrf",
  name: "Palestine Children's Relief Fund",
  ein: "95-4115109",
  endaomentOrgAddress: "0xOrgAddr0000000000000000000000000000000001",
  baseScanUrl: "https://basescan.org/address/0xOrgAddr0000000000000000000000000000000001",
};

const METADATA_FIXTURE = {
  name: "Palestine Children's Relief Fund",
  ein: "95-4115109",
  mission: "Providing medical care to children in the Middle East.",
  logoUrl: null,
  mainnetAddress: null,
  capturedAt: "2026-05-22",
};

const VERIFICATION_VERIFIED = {
  verified: true as const,
  org: "0xOrgAddr0000000000000000000000000000000001" as `0x${string}`,
  gross: BigInt("10000000"),
  fee: BigInt("150000"),
  net: BigInt("9850000"),
  endaomentFee: BigInt("0"),
};

const VERIFICATION_FAILED = {
  verified: false as const,
  reason: "no-routed-log" as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paramsFor(txid: string): Promise<{ txid: string }> {
  return Promise.resolve({ txid });
}

function searchParamsFor(campaign: string, chain?: number): Promise<Record<string, string>> {
  const sp: Record<string, string> = { campaign };
  if (chain !== undefined) sp.chain = String(chain);
  return Promise.resolve(sp);
}

async function renderReceiptPage(
  txid: string,
  campaign: string,
  chain?: number,
): Promise<string> {
  const element = await ReceiptPage({
    params: paramsFor(txid),
    searchParams: searchParamsFor(campaign, chain),
  });
  return renderToString(element);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReceiptPage (/receipt/[txid])", () => {
  beforeEach(() => {
    vi.mocked(getCharity).mockReturnValue(CHARITY_FIXTURE);
    vi.mocked(resolveOrgMetadata).mockResolvedValue(METADATA_FIXTURE);
    vi.mocked(verifyDonation).mockResolvedValue(VERIFICATION_VERIFIED);
  });

  // -------------------------------------------------------------------------
  // (a) Verified transaction
  // -------------------------------------------------------------------------

  test("verified tx: renders the charity name", async () => {
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(html).toContain("Palestine Children&#x27;s Relief Fund");
  });

  test('verified tx: renders "Verified by Endaoment" badge', async () => {
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(html).toContain("Verified by Endaoment");
  });

  test("verified tx: renders on-chain gross amount (USDC base units formatted)", async () => {
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    // gross = 10_000_000 micro-USDC = 10.000000 USDC
    expect(html).toContain("10.000000");
  });

  test("verified tx: renders on-chain fee amount", async () => {
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    // fee = 150_000 micro-USDC = 0.150000 USDC
    expect(html).toContain("0.150000");
  });

  test("verified tx: renders on-chain net amount", async () => {
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    // net = 9_850_000 micro-USDC = 9.850000 USDC
    expect(html).toContain("9.850000");
  });

  test("verified tx: renders mission text from metadata", async () => {
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(html).toContain("Providing medical care to children in the Middle East.");
  });

  test("verified tx: renders txid in the page", async () => {
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    // txid rendered in the on-chain amounts section data-txid attribute or text
    expect(html).toContain("0xabc123");
  });

  test("verified tx: renders BaseScan link", async () => {
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(html).toContain("basescan.org/address/");
  });

  test("verified tx: calls getCharity with correct id and chainId", async () => {
    await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(vi.mocked(getCharity)).toHaveBeenCalledWith("pcrf", CHAIN_ID);
  });

  test("verified tx: calls verifyDonation with txid and charity", async () => {
    await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(vi.mocked(verifyDonation)).toHaveBeenCalledWith(
      TXID,
      CHARITY_FIXTURE,
      CHAIN_ID,
    );
  });

  // -------------------------------------------------------------------------
  // (b) Unverified transaction — verified:false
  // -------------------------------------------------------------------------

  test("unverified tx: does NOT crash — renders without throwing", async () => {
    vi.mocked(verifyDonation).mockResolvedValue(VERIFICATION_FAILED);
    await expect(renderReceiptPage(TXID, "pcrf", CHAIN_ID)).resolves.toBeDefined();
  });

  test("unverified tx: renders charity name (page is still useful)", async () => {
    vi.mocked(verifyDonation).mockResolvedValue(VERIFICATION_FAILED);
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(html).toContain("Palestine Children&#x27;s Relief Fund");
  });

  test("unverified tx: renders explicit unverified message", async () => {
    vi.mocked(verifyDonation).mockResolvedValue(VERIFICATION_FAILED);
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(html).toContain("Unverified");
  });

  test("unverified tx: renders the failure reason", async () => {
    vi.mocked(verifyDonation).mockResolvedValue(VERIFICATION_FAILED);
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(html).toContain("no-routed-log");
  });

  test("unverified tx: does NOT render on-chain amounts section", async () => {
    vi.mocked(verifyDonation).mockResolvedValue(VERIFICATION_FAILED);
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    // On-chain amounts dl is only rendered in the verified path
    expect(html).not.toContain("Gross (USDC)");
  });

  // -------------------------------------------------------------------------
  // (c) Null org address → treated as unverified
  // -------------------------------------------------------------------------

  test("null org address: renders unverified state, no crash", async () => {
    const charityNoAddr: Charity = { ...CHARITY_FIXTURE, endaomentOrgAddress: null, baseScanUrl: null };
    vi.mocked(getCharity).mockReturnValue(charityNoAddr);
    vi.mocked(verifyDonation).mockResolvedValue({
      verified: false,
      reason: "no-org-address-for-chain",
    });
    const html = await renderReceiptPage(TXID, "pcrf", CHAIN_ID);
    expect(html).toContain("Unverified");
    expect(html).toContain("Palestine Children&#x27;s Relief Fund");
  });

  // -------------------------------------------------------------------------
  // (d) Missing campaign param → renders gracefully (no crash, shows error)
  // -------------------------------------------------------------------------

  test("unknown campaign slug: renders gracefully without throwing", async () => {
    vi.mocked(getCharity).mockReturnValue(undefined);
    const element = await ReceiptPage({
      params: paramsFor(TXID),
      searchParams: Promise.resolve({ campaign: "does-not-exist" }),
    });
    const html = renderToString(element);
    expect(html).toBeDefined();
    expect(html).toContain("not found");
  });

  // -------------------------------------------------------------------------
  // (e) Default chain — no chain searchParam defaults to Base mainnet
  // -------------------------------------------------------------------------

  test("defaults to base mainnet (8453) when chain param is absent", async () => {
    await renderReceiptPage(TXID, "pcrf");
    expect(vi.mocked(getCharity)).toHaveBeenCalledWith("pcrf", 8453);
  });
});
