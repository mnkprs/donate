import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
  type Address,
  type Hex,
} from "viem";
import { describe, expect, test, vi } from "vitest";

import { DONATION_ROUTED_EVENT } from "@/lib/contracts";
import {
  DEFAULT_LOOKBACK_BLOCKS,
  fetchRecentDonations,
  type OnChainLog,
  type RecentDonationsClient,
} from "@/lib/receipt/recentDonations";

// ---------------------------------------------------------------------------
// Test helpers — build genuine DonationRouted logs (no hand-rolled hex)
// ---------------------------------------------------------------------------

// Numeric-only addresses: no letters means EIP-55 checksumming cannot change
// case, so the truncated display value is deterministic regardless of viem's
// checksum step in decodeEventLog.
const DONOR: Address = "0x1111111111111111111111111111111111111111";
const ORG: Address = "0x2222222222222222222222222222222222222222";
const ROUTER: Address = "0x3333333333333333333333333333333333333333";

interface LogParts {
  gross: bigint;
  fee: bigint;
  net: bigint;
  blockNumber: bigint | null;
  logIndex: number | null;
  transactionHash: Hex | null;
  donor?: Address;
  org?: Address;
}

function makeLog(parts: LogParts): OnChainLog {
  const topics = encodeEventTopics({
    abi: [DONATION_ROUTED_EVENT],
    eventName: "DonationRouted",
    args: { donor: parts.donor ?? DONOR, org: parts.org ?? ORG },
  }) as [Hex, ...Hex[]];

  const data = encodeAbiParameters(
    parseAbiParameters("uint256 gross, uint256 fee, uint256 net"),
    [parts.gross, parts.fee, parts.net],
  );

  return {
    topics,
    data,
    blockNumber: parts.blockNumber,
    logIndex: parts.logIndex,
    transactionHash: parts.transactionHash,
  };
}

interface FakeClient extends RecentDonationsClient {
  lastGetLogsArgs: Parameters<RecentDonationsClient["getLogs"]>[0] | null;
}

function fakeClient(
  logs: readonly OnChainLog[],
  latestBlock = 1_000_000n,
): FakeClient {
  const client: FakeClient = {
    lastGetLogsArgs: null,
    getBlockNumber: async () => latestBlock,
    getLogs: async (args) => {
      client.lastGetLogsArgs = args;
      return logs;
    },
  };
  return client;
}

const TX_A: Hex = `0x${"a".repeat(64)}`;
const TX_B: Hex = `0x${"b".repeat(64)}`;
const TX_C: Hex = `0x${"c".repeat(64)}`;

// ---------------------------------------------------------------------------

describe("fetchRecentDonations — decoding & formatting", () => {
  test("maps a DonationRouted log into a display-ready RecentDonation", async () => {
    const client = fakeClient([
      makeLog({
        gross: 50_000_000n, // 50.00 USDC
        fee: 500_000n, //  0.50 USDC
        net: 49_500_000n, // 49.50 USDC
        blockNumber: 100n,
        logIndex: 0,
        transactionHash: TX_A,
      }),
    ]);

    const [donation] = await fetchRecentDonations(client, {
      routerAddress: ROUTER,
    });

    expect(donation).toEqual({
      txid: TX_A,
      txidShort: "0xaaaa…aaaa",
      donorShort: "0x1111…1111",
      orgShort: "0x2222…2222",
      grossUsdc: "50.00",
      netUsdc: "49.50",
      blockNumber: 100n,
    });
  });

  test("rounds USDC to cents and applies thousands separators", async () => {
    const client = fakeClient([
      makeLog({
        gross: 1_234_567_890n, // 1,234.56789 → 1,234.57
        fee: 0n,
        net: 49_999_999n, // 49.999999 → 50.00
        blockNumber: 10n,
        logIndex: 0,
        transactionHash: TX_A,
      }),
    ]);

    const [donation] = await fetchRecentDonations(client, {
      routerAddress: ROUTER,
    });

    expect(donation.grossUsdc).toBe("1,234.57");
    expect(donation.netUsdc).toBe("50.00");
  });
});

describe("fetchRecentDonations — ordering & limit", () => {
  test("returns newest first by (blockNumber, logIndex) and respects limit", async () => {
    const logA = makeLog({
      gross: 1n,
      fee: 0n,
      net: 1n,
      blockNumber: 100n,
      logIndex: 0,
      transactionHash: TX_A,
    });
    const logB = makeLog({
      gross: 1n,
      fee: 0n,
      net: 1n,
      blockNumber: 200n,
      logIndex: 1,
      transactionHash: TX_B,
    });
    const logC = makeLog({
      gross: 1n,
      fee: 0n,
      net: 1n,
      blockNumber: 200n,
      logIndex: 3, // same block as B, higher index → newer
      transactionHash: TX_C,
    });

    // Supplied in ascending order (as viem returns them).
    const result = await fetchRecentDonations(fakeClient([logA, logB, logC]), {
      routerAddress: ROUTER,
      limit: 2,
    });

    expect(result.map((d) => d.txid)).toEqual([TX_C, TX_B]);
  });

  test("returns an empty array when there are no logs", async () => {
    const result = await fetchRecentDonations(fakeClient([]), {
      routerAddress: ROUTER,
    });
    expect(result).toEqual([]);
  });
});

describe("fetchRecentDonations — robustness", () => {
  test("skips logs without a confirmed block or tx hash", async () => {
    const pending = makeLog({
      gross: 1n,
      fee: 0n,
      net: 1n,
      blockNumber: null, // not yet mined
      logIndex: null,
      transactionHash: null,
    });
    const confirmed = makeLog({
      gross: 1n,
      fee: 0n,
      net: 1n,
      blockNumber: 100n,
      logIndex: 0,
      transactionHash: TX_A,
    });

    const result = await fetchRecentDonations(
      fakeClient([pending, confirmed]),
      { routerAddress: ROUTER },
    );

    expect(result).toHaveLength(1);
    expect(result[0].txid).toBe(TX_A);
  });

  test("propagates RPC errors so the caller can show an unavailable state", async () => {
    const client: RecentDonationsClient = {
      getBlockNumber: async () => 1_000n,
      getLogs: vi.fn().mockRejectedValue(new Error("rpc range too large")),
    };

    await expect(
      fetchRecentDonations(client, { routerAddress: ROUTER }),
    ).rejects.toThrow("rpc range too large");
  });
});

describe("fetchRecentDonations — block window", () => {
  test("queries only the recent lookback window of blocks", async () => {
    const client = fakeClient([], 1_000_000n);

    await fetchRecentDonations(client, { routerAddress: ROUTER });

    expect(client.lastGetLogsArgs).toMatchObject({
      address: ROUTER,
      fromBlock: 1_000_000n - DEFAULT_LOOKBACK_BLOCKS,
      toBlock: "latest",
    });
  });

  test("clamps fromBlock to 0 on a young chain", async () => {
    const client = fakeClient([], 500n);

    await fetchRecentDonations(client, {
      routerAddress: ROUTER,
      lookbackBlocks: 2_000n,
    });

    expect(client.lastGetLogsArgs?.fromBlock).toBe(0n);
  });
});
