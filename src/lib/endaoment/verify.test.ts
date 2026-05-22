import { afterEach, describe, expect, it, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  parseAbiItem,
  toEventHash,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia } from "wagmi/chains";

import { DONATION_ROUTED_EVENT } from "@/lib/contracts";
import {
  DONOR as FIXTURE_DONOR,
  ENDAOMENT_FEE,
  EUDAIMONIA_FEE,
  FIXTURE_CHAIN_ID,
  FIXTURE_TX_HASH,
  GROSS as FIXTURE_GROSS,
  NET as FIXTURE_NET,
  NET_TO_ENTITY,
  ORG_ENTITY,
  ROUTER_ADDRESS,
  ENDAOMENT_TREASURY,
  EUDAIMONIA_TREASURY,
  USDC_BASE_SEPOLIA,
} from "@/lib/receipt/fixtures";
import type { Charity } from "@/types/charity";
import { verifyDonation } from "./verify";

// ---------------------------------------------------------------------------
// Shared test fixtures (mock-only suite — no env router address)
// ---------------------------------------------------------------------------

const DONOR = getAddress("0xe0adb1b3c4d5e6f708192a3b4c5d6e7f8a097bb0");
const ORG = getAddress("0x10fda5891234567890abcdef1234567890abcdef");
const OTHER_ORG = getAddress("0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");

// 100 USDC: 1% fee → 1e6, net → 99e6
const GROSS = BigInt(100_000_000);
const FEE = BigInt(1_000_000);
const NET = BigInt(99_000_000);

const TX_HASH =
  "0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899" as Hex;

// ERC20 Transfer event ABI item
const ERC20_TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

/**
 * Builds a properly encoded `DonationRouted` log for use in receipt mocks.
 * Mirrors the fixture encoding strategy used in contracts.test.ts.
 */
function buildDonationRoutedLog(overrides?: {
  org?: Address;
  gross?: bigint;
  fee?: bigint;
  net?: bigint;
  address?: Address;
}) {
  const org = overrides?.org ?? ORG;
  const gross = overrides?.gross ?? GROSS;
  const fee = overrides?.fee ?? FEE;
  const net = overrides?.net ?? NET;
  const logAddress = overrides?.address ?? "0x0000000000000000000000000000000000000000" as Address;

  const topics = encodeEventTopics({
    abi: [DONATION_ROUTED_EVENT],
    eventName: "DonationRouted",
    args: { donor: DONOR, org },
  }) as [Hex, Hex, Hex];

  const data = encodeAbiParameters(
    [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
    [gross, fee, net],
  ) as Hex;

  return { topics, data, address: logAddress };
}

/**
 * Builds an ERC20 Transfer log from `from` to `to` for `value`.
 */
function buildTransferLog(from: Address, to: Address, value: bigint, address?: Address) {
  const topics = encodeEventTopics({
    abi: [ERC20_TRANSFER_EVENT],
    eventName: "Transfer",
    args: { from, to },
  }) as [Hex, Hex, Hex];

  const data = encodeAbiParameters(
    [{ type: "uint256" }],
    [value],
  ) as Hex;

  return { topics, data, address: address ?? "0x0000000000000000000000000000000000000000" as Address };
}

// ---------------------------------------------------------------------------
// Mock public client via vi.mock
// ---------------------------------------------------------------------------

vi.mock("@/lib/publicClient", () => ({
  getPublicClient: vi.fn(),
}));

// Import after mock is registered so we can control the return value per test.
const { getPublicClient } = await import("@/lib/publicClient");
const mockGetPublicClient = vi.mocked(getPublicClient);

/**
 * Helper: wire `getPublicClient` to return a mock client that resolves the
 * given logs as the transaction receipt.
 */
function mockReceiptWithLogs(logs: ReturnType<typeof buildDonationRoutedLog>[]) {
  mockGetPublicClient.mockReturnValue({
    getTransactionReceipt: vi.fn().mockResolvedValue({ logs }),
  } as unknown as ReturnType<typeof getPublicClient>);
}

// ---------------------------------------------------------------------------
// Sample charity
// ---------------------------------------------------------------------------

const CHARITY: Charity = {
  id: "pcrf",
  name: "Palestine Children's Relief Fund",
  ein: "91-1876985",
  endaomentOrgAddress: ORG,
  baseScanUrl: `https://basescan.org/address/${ORG}`,
};

// Charity matching the fixture ORG_ENTITY address (for real-Entity tests).
const FIXTURE_CHARITY: Charity = {
  id: "pcrf",
  name: "Palestine Children's Relief Fund",
  ein: "91-1876985",
  endaomentOrgAddress: ORG_ENTITY,
  baseScanUrl: `https://basescan.org/address/${ORG_ENTITY}`,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("verifyDonation", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // Happy path — verified: true (legacy single-transfer mock, no env router)
  // -------------------------------------------------------------------------

  it("returns verified:true with org/gross/fee/net when both assertions pass", async () => {
    // Arrange
    const routedLog = buildDonationRoutedLog();
    const transferLog = buildTransferLog(
      "0x0000000000000000000000000000000000000001" as Address, // router
      ORG,
      NET,
    );
    mockReceiptWithLogs([routedLog, transferLog]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, baseSepolia.id);

    // Assert
    expect(result).toEqual({
      verified: true,
      org: ORG,
      gross: GROSS,
      fee: FEE,
      net: NET,
      endaomentFee: 0n,
    });
  });

  // -------------------------------------------------------------------------
  // Failure: no-org-address-for-chain
  // -------------------------------------------------------------------------

  it("returns verified:false reason=no-org-address-for-chain when charity has no org address", async () => {
    // Arrange
    const charityNoAddress: Charity = { ...CHARITY, endaomentOrgAddress: null, baseScanUrl: null };
    // Client should never be called — no network required for this guard.
    mockGetPublicClient.mockReturnValue({
      getTransactionReceipt: vi.fn().mockResolvedValue({ logs: [] }),
    } as unknown as ReturnType<typeof getPublicClient>);

    // Act
    const result = await verifyDonation(TX_HASH, charityNoAddress, baseSepolia.id);

    // Assert
    expect(result).toEqual({ verified: false, reason: "no-org-address-for-chain" });
  });

  // -------------------------------------------------------------------------
  // Failure: no-routed-log
  // -------------------------------------------------------------------------

  it("returns verified:false reason=no-routed-log when receipt contains only irrelevant logs", async () => {
    // Arrange: receipt has a Transfer log but NO DonationRouted log.
    // This proves log-filtering works — we don't accidentally try to decode a
    // Transfer as DonationRouted.
    const transferLog = buildTransferLog(
      "0x0000000000000000000000000000000000000001" as Address,
      ORG,
      NET,
    );
    mockReceiptWithLogs([transferLog]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, baseSepolia.id);

    // Assert
    expect(result).toEqual({ verified: false, reason: "no-routed-log" });
  });

  it("returns verified:false reason=no-routed-log for an empty receipt", async () => {
    // Arrange
    mockReceiptWithLogs([]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, baseSepolia.id);

    // Assert
    expect(result).toEqual({ verified: false, reason: "no-routed-log" });
  });

  // -------------------------------------------------------------------------
  // Failure: org-mismatch
  // -------------------------------------------------------------------------

  it("returns verified:false reason=org-mismatch when DonationRouted.org differs from charity address", async () => {
    // Arrange: the on-chain log targets OTHER_ORG, but charity expects ORG.
    const routedLog = buildDonationRoutedLog({ org: OTHER_ORG });
    const transferLog = buildTransferLog(
      "0x0000000000000000000000000000000000000001" as Address,
      OTHER_ORG,
      NET,
    );
    mockReceiptWithLogs([routedLog, transferLog]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, baseSepolia.id);

    // Assert
    expect(result).toEqual({ verified: false, reason: "org-mismatch" });
  });

  // -------------------------------------------------------------------------
  // Failure: missing-transfer (no matching ERC20 Transfer to org)
  // -------------------------------------------------------------------------

  it("returns verified:false reason=missing-transfer when no Transfer to org is present", async () => {
    // Arrange: DonationRouted is correct, but there is no Transfer to ORG.
    // Transfer goes to a different address (OTHER_ORG), not to ORG.
    const routedLog = buildDonationRoutedLog();
    const transferLog = buildTransferLog(
      "0x0000000000000000000000000000000000000001" as Address,
      OTHER_ORG,
      NET,
    );
    mockReceiptWithLogs([routedLog, transferLog]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, baseSepolia.id);

    // Assert
    expect(result).toEqual({ verified: false, reason: "missing-transfer" });
  });

  it("returns verified:false reason=missing-transfer when Transfer amount does not match net", async () => {
    // Arrange: Transfer is to ORG but with wrong amount (not net).
    const routedLog = buildDonationRoutedLog();
    const wrongAmountTransfer = buildTransferLog(
      "0x0000000000000000000000000000000000000001" as Address,
      ORG,
      GROSS, // wrong: should be NET
    );
    mockReceiptWithLogs([routedLog, wrongAmountTransfer]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, baseSepolia.id);

    // Assert
    expect(result).toEqual({ verified: false, reason: "missing-transfer" });
  });

  // -------------------------------------------------------------------------
  // Idempotency / not throwing on mismatches
  // -------------------------------------------------------------------------

  it("never throws on a mismatch — always returns a VerificationResult", async () => {
    // Arrange: receipt with org-mismatch scenario
    const routedLog = buildDonationRoutedLog({ org: OTHER_ORG });
    mockReceiptWithLogs([routedLog]);

    // Act + Assert: must not throw
    await expect(verifyDonation(TX_HASH, CHARITY, baseSepolia.id)).resolves.toMatchObject({
      verified: false,
    });
  });

  // -------------------------------------------------------------------------
  // Correct event hash used — only DonationRouted signature matches
  // -------------------------------------------------------------------------

  it("does not confuse a Transfer log with DonationRouted when topics[0] differs", async () => {
    // Arrange: receipt has only a Transfer; topics[0] is Transfer's hash
    const transferLog = buildTransferLog(DONOR, ORG, NET);
    // Sanity: Transfer's event hash differs from DonationRouted's
    expect(transferLog.topics[0]).not.toBe(toEventHash(DONATION_ROUTED_EVENT));
    mockReceiptWithLogs([transferLog]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, baseSepolia.id);

    // Assert: must not pick up the Transfer as DonationRouted
    expect(result).toEqual({ verified: false, reason: "no-routed-log" });
  });

  // -------------------------------------------------------------------------
  // NEW: Failure: wrong-router
  // -------------------------------------------------------------------------

  it("returns verified:false reason=wrong-router when DonationRouted is emitted by a non-router address", async () => {
    // Arrange: stub the env so getRouterAddress returns ROUTER_ADDRESS from fixtures.
    // The routed log is emitted from a DIFFERENT address — a foreign contract.
    const FOREIGN_ROUTER = getAddress("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
    vi.stubEnv("NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA", ROUTER_ADDRESS);

    const routedLog = buildDonationRoutedLog({
      org: ORG,
      address: FOREIGN_ROUTER, // emitted from a non-router address
    });
    const transferLog = buildTransferLog(FOREIGN_ROUTER, ORG, NET);
    mockReceiptWithLogs([routedLog, transferLog]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, FIXTURE_CHAIN_ID);

    // Assert
    expect(result).toEqual({ verified: false, reason: "wrong-router" });
  });

  it("passes the wrong-router check when DonationRouted is emitted by the configured router", async () => {
    // Arrange: stub env so getRouterAddress returns ROUTER_ADDRESS; the routed
    // log is emitted by that same address — should NOT trigger wrong-router.
    vi.stubEnv("NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA", ROUTER_ADDRESS);

    const routedLog = buildDonationRoutedLog({
      org: ORG,
      address: ROUTER_ADDRESS, // emitted by the correct router
    });
    // Single transfer from router to org — classic mock shape.
    const transferLog = buildTransferLog(ROUTER_ADDRESS, ORG, NET);
    mockReceiptWithLogs([routedLog, transferLog]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, FIXTURE_CHAIN_ID);

    // Assert: should be verified (not wrong-router)
    expect(result).toMatchObject({ verified: true });
  });

  // -------------------------------------------------------------------------
  // NEW: Real Endaoment Entity — two-transfer pull model
  // -------------------------------------------------------------------------

  it("verifies a real-Entity two-transfer pull and surfaces endaomentFee", async () => {
    // Arrange: use the fixture amounts and the two-transfer Entity pull model.
    // The Entity pulls its own protocol fee (router → Endaoment treasury) and
    // the remainder (router → org entity), summing to NET.
    //
    // Fixture invariants:
    //   EUDAIMONIA_FEE + NET === GROSS               (DonationRouted accounting)
    //   ENDAOMENT_FEE + NET_TO_ENTITY === NET         (Entity two-transfer pull)
    expect(EUDAIMONIA_FEE + FIXTURE_NET).toBe(FIXTURE_GROSS);
    expect(ENDAOMENT_FEE + NET_TO_ENTITY).toBe(FIXTURE_NET);

    // Stub env so verify.ts resolves the router address.
    vi.stubEnv("NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA", ROUTER_ADDRESS);

    // Build the four-log receipt matching the fixture on-chain reality:
    //   1. donor → router  (gross in — Transfer from donor)
    //   2. router → Eudaimonia treasury  (1% platform fee)
    //   3. router → Endaoment treasury  (1.5% Endaoment fee — Entity's first pull)
    //   4. router → org Entity  (net − endaomentFee — Entity's second pull)
    //   5. DonationRouted emitted by router
    const donorInLog = buildTransferLog(
      FIXTURE_DONOR,
      ROUTER_ADDRESS,
      FIXTURE_GROSS,
      USDC_BASE_SEPOLIA,
    );
    const eudaimoniaFeeLog = buildTransferLog(
      ROUTER_ADDRESS,
      EUDAIMONIA_TREASURY,
      EUDAIMONIA_FEE,
      USDC_BASE_SEPOLIA,
    );
    const endaomentFeeLog = buildTransferLog(
      ROUTER_ADDRESS,
      ENDAOMENT_TREASURY,
      ENDAOMENT_FEE,
      USDC_BASE_SEPOLIA,
    );
    const entityReceiptLog = buildTransferLog(
      ROUTER_ADDRESS,
      ORG_ENTITY,
      NET_TO_ENTITY,
      USDC_BASE_SEPOLIA,
    );
    const routedLog = buildDonationRoutedLog({
      org: ORG_ENTITY,
      gross: FIXTURE_GROSS,
      fee: EUDAIMONIA_FEE,
      net: FIXTURE_NET,
      address: ROUTER_ADDRESS,
    });

    mockReceiptWithLogs([
      donorInLog,
      eudaimoniaFeeLog,
      endaomentFeeLog,
      entityReceiptLog,
      routedLog,
    ]);

    // Act
    const result = await verifyDonation(FIXTURE_TX_HASH, FIXTURE_CHARITY, FIXTURE_CHAIN_ID);

    // Assert: verified with the correct on-chain values and endaomentFee decoded.
    expect(result).toEqual({
      verified: true,
      org: ORG_ENTITY,
      gross: FIXTURE_GROSS,
      fee: EUDAIMONIA_FEE,
      net: FIXTURE_NET,
      endaomentFee: ENDAOMENT_FEE,
    });
  });

  it("verifies an Entity with zero endaoment fee (endaomentFee === 0n)", async () => {
    // Arrange: Entity takes no protocol fee — only one settlement transfer:
    //   router → org entity for exactly NET.
    // This exercises R5: zero-fee Entity.
    vi.stubEnv("NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA", ROUTER_ADDRESS);

    const eudaimoniaFeeLog = buildTransferLog(
      ROUTER_ADDRESS,
      EUDAIMONIA_TREASURY,
      FEE,
      USDC_BASE_SEPOLIA,
    );
    // Single settlement: full net goes directly to org (no Endaoment fee split).
    const entityReceiptLog = buildTransferLog(
      ROUTER_ADDRESS,
      ORG,
      NET,
      USDC_BASE_SEPOLIA,
    );
    const routedLog = buildDonationRoutedLog({
      org: ORG,
      gross: GROSS,
      fee: FEE,
      net: NET,
      address: ROUTER_ADDRESS,
    });

    mockReceiptWithLogs([eudaimoniaFeeLog, entityReceiptLog, routedLog]);

    // Act
    const result = await verifyDonation(TX_HASH, CHARITY, FIXTURE_CHAIN_ID);

    // Assert: verified; endaomentFee is 0n because all settlement went to org.
    expect(result).toEqual({
      verified: true,
      org: ORG,
      gross: GROSS,
      fee: FEE,
      net: NET,
      endaomentFee: 0n,
    });
  });
});
