import { afterEach, describe, expect, it, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  isAddress,
  keccak256,
  parseAbiItem,
  toBytes,
  toEventHash,
  type Address,
} from "viem";
import { base, baseSepolia } from "wagmi/chains";
import {
  DONATION_ROUTED_EVENT,
  ROUTER_SUPPORTED_CHAIN_IDS,
  decodeDonationRoutedLog,
  getRouterAddress,
} from "./contracts";

// Canonical Solidity event signature from TransparentDonationRouter.sol.
// The frontend ABI must hash to exactly this or the receipt decoder (Epic 5)
// would silently fail to match real logs.
const CANONICAL_SIGNATURE =
  "DonationRouted(address,address,uint256,uint256,uint256)";

const SAMPLE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;

describe("DONATION_ROUTED_EVENT", () => {
  it("hashes to the canonical Solidity event signature", () => {
    // Mechanical binding: drift in arg types/order/name breaks this.
    expect(toEventHash(DONATION_ROUTED_EVENT)).toBe(
      keccak256(toBytes(CANONICAL_SIGNATURE)),
    );
  });

  it("is a named DonationRouted event with indexed donor and org", () => {
    expect(DONATION_ROUTED_EVENT.type).toBe("event");
    expect(DONATION_ROUTED_EVENT.name).toBe("DonationRouted");

    // Non-indexed inputs omit the `indexed` key entirely in viem's literal
    // type, so narrow with `in` before reading it.
    const indexedByName = new Map(
      DONATION_ROUTED_EVENT.inputs.map((i) => [
        i.name,
        "indexed" in i && i.indexed === true,
      ]),
    );
    expect(indexedByName.get("donor")).toBe(true);
    expect(indexedByName.get("org")).toBe(true);
    expect(indexedByName.get("gross")).toBe(false);
    expect(indexedByName.get("fee")).toBe(false);
    expect(indexedByName.get("net")).toBe(false);
  });
});

describe("ROUTER_SUPPORTED_CHAIN_IDS", () => {
  it("covers exactly Base mainnet and Base Sepolia", () => {
    expect([...ROUTER_SUPPORTED_CHAIN_IDS].sort()).toEqual(
      [base.id, baseSepolia.id].sort(),
    );
  });
});

describe("getRouterAddress", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when the env var is unset (not yet deployed)", () => {
    vi.stubEnv("NEXT_PUBLIC_ROUTER_ADDRESS_BASE", "");
    expect(getRouterAddress(base.id)).toBeUndefined();
  });

  it("returns the configured address for Base mainnet", () => {
    vi.stubEnv("NEXT_PUBLIC_ROUTER_ADDRESS_BASE", SAMPLE_ADDRESS);
    expect(getRouterAddress(base.id)).toBe(SAMPLE_ADDRESS);
  });

  it("returns the configured address for Base Sepolia", () => {
    vi.stubEnv("NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA", SAMPLE_ADDRESS);
    expect(getRouterAddress(baseSepolia.id)).toBe(SAMPLE_ADDRESS);
  });

  it("returns undefined for an unsupported chain id", () => {
    expect(getRouterAddress(1)).toBeUndefined();
  });

  it("returns undefined for a malformed env address rather than a bad value", () => {
    vi.stubEnv("NEXT_PUBLIC_ROUTER_ADDRESS_BASE", "not-an-address");
    expect(getRouterAddress(base.id)).toBeUndefined();
  });
});

describe("decodeDonationRoutedLog", () => {
  // Canonical (EIP-55 checksummed) form — viem decodes addresses to this, so
  // using it here makes the round-trip exact rather than case-sensitive-fragile.
  const DONOR = getAddress("0xe0adb1b3c4d5e6f708192a3b4c5d6e7f8a097bb0");
  const ORG = getAddress("0x10fda5891234567890abcdef1234567890abcdef");

  // 100 USDC donation (6 decimals): 1% fee, 99% net. Mirrors the Foundry
  // previewSplit fixture (100e6 → 1e6 / 99e6) so the on-chain math and the
  // off-chain decode share one canonical example.
  // `BigInt(...)` rather than `n` literals: tsconfig targets ES2017, where
  // BigInt literal syntax is a compile error (TS2737) even though the type works.
  const GROSS = BigInt(100_000_000);
  const FEE = BigInt(1_000_000);
  const NET = BigInt(99_000_000);

  // viem 2.x has no single `encodeEventLog`; a real log is the indexed topics
  // (signature + donor + org) plus ABI-encoded non-indexed data (gross/fee/net).
  const UINT256_TRIPLE = [
    { type: "uint256" },
    { type: "uint256" },
    { type: "uint256" },
  ] as const;

  /** Encode a real-shaped DonationRouted log fixture from typed args. */
  const encodeFixtureLog = (
    args: { donor: Address; org: Address; gross: bigint; fee: bigint; net: bigint } = {
      donor: DONOR,
      org: ORG,
      gross: GROSS,
      fee: FEE,
      net: NET,
    },
  ) => ({
    topics: encodeEventTopics({
      abi: [DONATION_ROUTED_EVENT],
      eventName: "DonationRouted",
      args: { donor: args.donor, org: args.org },
    }),
    data: encodeAbiParameters(UINT256_TRIPLE, [args.gross, args.fee, args.net]),
  });

  it("round-trips encode → decode back to the original typed args", () => {
    // Catches ABI/topic/order drift that the hash-binding test cannot:
    // a log encoded from the event must decode to exactly its inputs.
    const { topics, data } = encodeFixtureLog();

    const decoded = decodeDonationRoutedLog({ topics, data });

    expect(decoded).toEqual({
      donor: DONOR,
      org: ORG,
      gross: GROSS,
      fee: FEE,
      net: NET,
    });
  });

  it("preserves the fee + net == gross conservation invariant", () => {
    // Same invariant the Foundry suite fuzzes on-chain (Task 2). The decoder
    // must surface raw bigints faithfully so this holds off-chain too.
    const { topics, data } = encodeFixtureLog();

    const { gross, fee, net } = decodeDonationRoutedLog({ topics, data });

    expect(fee + net).toBe(gross);
  });

  it("returns the indexed args as checksummed addresses", () => {
    const { topics, data } = encodeFixtureLog();

    const { donor, org } = decodeDonationRoutedLog({ topics, data });

    expect(isAddress(donor)).toBe(true);
    expect(isAddress(org)).toBe(true);
  });

  it("throws on a log whose signature topic is a different event", () => {
    // A foreign event's log must not be silently mis-decoded as DonationRouted.
    const foreignEvent = parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    );
    const topics = encodeEventTopics({
      abi: [foreignEvent],
      eventName: "Transfer",
      args: { from: DONOR, to: ORG },
    });
    const data = encodeAbiParameters([{ type: "uint256" }], [GROSS]);

    // Assert on the signature-mismatch throw specifically: a bare `.toThrow()`
    // would still pass if `strict` were dropped and the decoder silently
    // returned a malformed result instead of rejecting the foreign log.
    expect(() => decodeDonationRoutedLog({ topics, data })).toThrow(
      /signature/i,
    );
  });
});
