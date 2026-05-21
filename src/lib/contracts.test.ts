import { afterEach, describe, expect, it, vi } from "vitest";
import { keccak256, toBytes, toEventHash, type Address } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import {
  DONATION_ROUTED_EVENT,
  ROUTER_SUPPORTED_CHAIN_IDS,
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
