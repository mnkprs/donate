/**
 * TDD tests for decodeRouterReceipt (Task 1, Epic 6).
 *
 * RED → GREEN → REFACTOR per the project testing rules.
 * All tests are pure: no I/O, no network, no mocks needed.
 * Input fixtures are built from the canonical constants in fixtures.ts.
 */
import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, parseAbiItem, type Log } from "viem";

import { DONATION_ROUTED_EVENT } from "@/lib/contracts";
import {
  DONOR,
  ENDAOMENT_FEE,
  ENDAOMENT_TREASURY,
  EUDAIMONIA_FEE,
  EUDAIMONIA_TREASURY,
  FIXTURE_LOGS,
  GROSS,
  MOCK_SEPOLIA_RECEIPT,
  NET,
  NET_TO_ENTITY,
  ORG_ENTITY,
  ROUTER_ADDRESS,
  USDC_BASE_SEPOLIA,
} from "@/lib/receipt/fixtures";

import { decodeRouterReceipt } from "./decodeReceipt";

// ---------------------------------------------------------------------------
// Helpers for constructing custom log sets in individual tests
// ---------------------------------------------------------------------------

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const UINT256 = [{ type: "uint256" as const }];

const baseLogFields = {
  blockHash: "0xb10c0000000000000000000000000000000000000000000000000000000000ed" as `0x${string}`,
  blockNumber: 30_918_548n,
  transactionHash: "0xdc67000000000000000000000000000000000000000000000000000000ab78ed" as `0x${string}`,
  transactionIndex: 0,
  removed: false,
} as const;

function makeTransferLog(
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
  logIndex: number,
): Log {
  return {
    ...baseLogFields,
    address: USDC_BASE_SEPOLIA,
    logIndex,
    topics: encodeEventTopics({
      abi: [TRANSFER_EVENT],
      eventName: "Transfer",
      args: { from, to },
    }) as [`0x${string}`, ...`0x${string}`[]],
    data: encodeAbiParameters(UINT256, [value]),
  } as Log;
}

function makeDonationRoutedLog(
  routerAddr: `0x${string}`,
  donor: `0x${string}`,
  org: `0x${string}`,
  gross: bigint,
  fee: bigint,
  net: bigint,
  logIndex: number,
): Log {
  return {
    ...baseLogFields,
    address: routerAddr,
    logIndex,
    topics: encodeEventTopics({
      abi: [DONATION_ROUTED_EVENT],
      eventName: "DonationRouted",
      args: { donor, org },
    }) as [`0x${string}`, ...`0x${string}`[]],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [gross, fee, net],
    ),
  } as Log;
}

// ---------------------------------------------------------------------------
// Test 1 — 4-transfer happy path (the canonical fixture)
// ---------------------------------------------------------------------------

describe("decodeRouterReceipt — 4-transfer happy path", () => {
  it("returns ok: true with amounts matching the fixture constants", () => {
    // Arrange
    const receipt = MOCK_SEPOLIA_RECEIPT;

    // Act
    const result = decodeRouterReceipt(receipt, ROUTER_ADDRESS, ORG_ENTITY);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrow for type safety

    expect(result.gross).toBe(GROSS);
    expect(result.eudaimoniaFee).toBe(EUDAIMONIA_FEE);
    expect(result.endaomentFee).toBe(ENDAOMENT_FEE);
    expect(result.netToEntity).toBe(NET_TO_ENTITY);
  });

  it("extracts donor and org addresses", () => {
    const result = decodeRouterReceipt(MOCK_SEPOLIA_RECEIPT, ROUTER_ADDRESS, ORG_ENTITY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.donor).toBe(DONOR);
    expect(result.org).toBe(ORG_ENTITY);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Fee-skimming entity invariants (the fixture IS this case)
// ---------------------------------------------------------------------------

describe("decodeRouterReceipt — fee-skimming entity", () => {
  it("satisfies the two-transfer pull invariant: endaomentFee + netToEntity === net", () => {
    const result = decodeRouterReceipt(MOCK_SEPOLIA_RECEIPT, ROUTER_ADDRESS, ORG_ENTITY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The entity received less than net: both fees were deducted
    expect(result.endaomentFee).toBeGreaterThan(0n);
    expect(result.netToEntity).toBe(NET - ENDAOMENT_FEE);
    expect(result.endaomentFee + result.netToEntity).toBe(NET);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Legacy: no Endaoment skim (router → org for the full net)
// ---------------------------------------------------------------------------

describe("decodeRouterReceipt — legacy single-transfer (no Endaoment skim, R5)", () => {
  it("returns endaomentFee === 0n and netToEntity === net when no skim transfer present", () => {
    // Arrange: only 3 Transfer logs — donor→router, router→eudaimoniaTreasury, router→org(net)
    // No router→endaomentTreasury leg.
    const customLogs: Log[] = [
      makeTransferLog(DONOR, ROUTER_ADDRESS, GROSS, 0),
      makeTransferLog(ROUTER_ADDRESS, EUDAIMONIA_TREASURY, EUDAIMONIA_FEE, 1),
      makeTransferLog(ROUTER_ADDRESS, ORG_ENTITY, NET, 2),
      makeDonationRoutedLog(ROUTER_ADDRESS, DONOR, ORG_ENTITY, GROSS, EUDAIMONIA_FEE, NET, 3),
    ];

    const receipt = { ...MOCK_SEPOLIA_RECEIPT, logs: customLogs };

    // Act
    const result = decodeRouterReceipt(receipt, ROUTER_ADDRESS, ORG_ENTITY);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.endaomentFee).toBe(0n);
    expect(result.netToEntity).toBe(NET);
    expect(result.gross).toBe(GROSS);
    expect(result.eudaimoniaFee).toBe(EUDAIMONIA_FEE);
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Foreign router address → wrong-router
// ---------------------------------------------------------------------------

describe("decodeRouterReceipt — wrong router address", () => {
  it("returns ok: false with reason 'wrong-router' when routerAddress does not match the DonationRouted emitter", () => {
    // Arrange: pass a different address; FIXTURE_LOGS has DonationRouted from ROUTER_ADDRESS
    const foreignRouter: `0x${string}` = "0x9999999999999999999999999999999999999999";

    // Act
    const result = decodeRouterReceipt(MOCK_SEPOLIA_RECEIPT, foreignRouter, ORG_ENTITY);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.reason).toBe("wrong-router");
  });
});

// ---------------------------------------------------------------------------
// Test 5 — Missing leg → missing-legs
// ---------------------------------------------------------------------------

describe("decodeRouterReceipt — missing required transfer leg", () => {
  it("returns ok: false with reason 'missing-legs' when the donor→router transfer is absent", () => {
    // Arrange: drop log index 0 (the donor→router gross-in transfer)
    const truncatedLogs = FIXTURE_LOGS.filter((log) => log.logIndex !== 0);
    const receipt = { ...MOCK_SEPOLIA_RECEIPT, logs: truncatedLogs };

    // Act
    const result = decodeRouterReceipt(receipt, ROUTER_ADDRESS, ORG_ENTITY);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.reason).toBe("missing-legs");
  });

  it("returns ok: false with reason 'missing-legs' when the router→org transfer is absent", () => {
    // Drop log index 3 (the router→org net-to-entity transfer)
    const truncatedLogs = FIXTURE_LOGS.filter((log) => log.logIndex !== 3);
    const receipt = { ...MOCK_SEPOLIA_RECEIPT, logs: truncatedLogs };

    const result = decodeRouterReceipt(receipt, ROUTER_ADDRESS, ORG_ENTITY);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.reason).toBe("missing-legs");
  });

  it("returns ok: false with reason 'missing-legs' when no DonationRouted event is present", () => {
    // Drop log index 4 (the DonationRouted event)
    const truncatedLogs = FIXTURE_LOGS.filter((log) => log.logIndex !== 4);
    const receipt = { ...MOCK_SEPOLIA_RECEIPT, logs: truncatedLogs };

    const result = decodeRouterReceipt(receipt, ROUTER_ADDRESS, ORG_ENTITY);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.reason).toBe("missing-legs");
  });
});

// ---------------------------------------------------------------------------
// Test 6 — Gross-side invariant guard (M4)
//
// The leg-classification discriminator matches transfer VALUE against
// `event.fee` to exclude the platform-fee leg. The decoder must enforce the
// FULL split — eudaimoniaFee + endaomentFee + netToEntity === gross — not just
// the net side. These tests prove the gross-side total is enforced.
// ---------------------------------------------------------------------------

describe("decodeRouterReceipt — gross-side invariant (M4)", () => {
  it("rejects with 'missing-legs' when the legs do not sum to gross (corrupt event)", () => {
    // Arrange: net-side reconciles (endaomentFee + netToEntity === eventNet) but
    // the event's gross is inflated so eudaimoniaFee + endaomentFee + net != gross.
    // The legacy net-only check would pass; the new gross-side guard must reject.
    const BAD_GROSS = GROSS + 1n; // gross no longer equals fee + net
    const customLogs: Log[] = [
      makeTransferLog(DONOR, ROUTER_ADDRESS, BAD_GROSS, 0),
      makeTransferLog(ROUTER_ADDRESS, EUDAIMONIA_TREASURY, EUDAIMONIA_FEE, 1),
      makeTransferLog(ROUTER_ADDRESS, ENDAOMENT_TREASURY, ENDAOMENT_FEE, 2),
      makeTransferLog(ROUTER_ADDRESS, ORG_ENTITY, NET_TO_ENTITY, 3),
      makeDonationRoutedLog(
        ROUTER_ADDRESS,
        DONOR,
        ORG_ENTITY,
        BAD_GROSS,
        EUDAIMONIA_FEE,
        NET, // endaomentFee + netToEntity === NET still holds (net-side reconciles)
        4,
      ),
    ];
    const receipt = { ...MOCK_SEPOLIA_RECEIPT, logs: customLogs };

    // Act
    const result = decodeRouterReceipt(receipt, ROUTER_ADDRESS, ORG_ENTITY);

    // Assert: gross-side invariant catches the inconsistency the net check missed.
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("missing-legs");
  });

  it("still reconciles when the platform fee equals the endaoment skim (discriminator misfire is value-symmetric)", () => {
    // Arrange: construct a synthetic receipt where eudaimoniaFee === endaomentFee.
    // The value-based discriminator cannot tell the two legs apart, but because
    // the values are equal, swapping their labels is a no-op for the sum — the
    // gross-side invariant still holds and the decode succeeds with correct totals.
    const EQUAL_FEE = 10_000n;
    const equalGross = EQUAL_FEE + EQUAL_FEE + NET_TO_ENTITY; // fee + skim + net
    const equalNet = equalGross - EQUAL_FEE; // = EQUAL_FEE + NET_TO_ENTITY
    const customLogs: Log[] = [
      makeTransferLog(DONOR, ROUTER_ADDRESS, equalGross, 0),
      makeTransferLog(ROUTER_ADDRESS, EUDAIMONIA_TREASURY, EQUAL_FEE, 1),
      makeTransferLog(ROUTER_ADDRESS, ENDAOMENT_TREASURY, EQUAL_FEE, 2),
      makeTransferLog(ROUTER_ADDRESS, ORG_ENTITY, NET_TO_ENTITY, 3),
      makeDonationRoutedLog(
        ROUTER_ADDRESS,
        DONOR,
        ORG_ENTITY,
        equalGross,
        EQUAL_FEE,
        equalNet,
        4,
      ),
    ];
    const receipt = { ...MOCK_SEPOLIA_RECEIPT, logs: customLogs };

    // Act
    const result = decodeRouterReceipt(receipt, ROUTER_ADDRESS, ORG_ENTITY);

    // Assert: invariant holds — eudaimoniaFee + endaomentFee + netToEntity === gross.
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.eudaimoniaFee + result.endaomentFee + result.netToEntity,
    ).toBe(result.gross);
    expect(result.gross).toBe(equalGross);
    expect(result.netToEntity).toBe(NET_TO_ENTITY);
  });
});

// ---------------------------------------------------------------------------
// Invariant sanity check — fixture constants are self-consistent
// ---------------------------------------------------------------------------

describe("fixture constant invariants", () => {
  it("EUDAIMONIA_FEE + NET === GROSS", () => {
    expect(EUDAIMONIA_FEE + NET).toBe(GROSS);
  });

  it("ENDAOMENT_FEE + NET_TO_ENTITY === NET", () => {
    expect(ENDAOMENT_FEE + NET_TO_ENTITY).toBe(NET);
  });
});
