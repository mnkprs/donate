/**
 * Tests for the thin Endaoment REST client.
 *
 * All HTTP is intercepted by MSW — no real network calls occur. Covers:
 *   - success: valid wire body → typed EndaomentLiveOrg
 *   - non-200: 404 → clear thrown error with status + truncated body
 *   - non-200: 500 → same error contract
 *   - malformed body: missing required fields → Zod parse failure thrown
 *   - timeout: AbortSignal.timeout fires → rejects with timeout error
 */

import { http, HttpResponse, delay } from "msw";
import { describe, expect, it } from "vitest";
import { mswServer } from "../../../vitest.setup";
import { fetchOrgByEin, ENDAOMENT_ORG_URL } from "./api";
import type { EndaomentLiveOrg } from "./api";

const TEST_ENV = { ENDAOMENT_API_URL: "https://api.endaoment.org" };

/** Minimal valid wire response from Endaoment's GET /v1/orgs/{ein}. */
const WIRE_ORG_OK = Object.freeze({
  name: "Palestine Children's Relief Fund",
  ein: "91-2031237",
  description: "Medical and humanitarian relief for children.",
  logo: "https://cdn.endaoment.org/pcrf.png",
  contractAddress: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
});

/** Expected mapped domain object. */
const EXPECTED_ORG: EndaomentLiveOrg = {
  name: "Palestine Children's Relief Fund",
  ein: "91-2031237",
  mission: "Medical and humanitarian relief for children.",
  logoUrl: "https://cdn.endaoment.org/pcrf.png",
  mainnetAddress: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
};

describe("fetchOrgByEin()", () => {
  it("GETs the correct URL derived from the injected base and EIN", async () => {
    let capturedUrl: string | null = null;

    mswServer.use(
      http.get(`${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/:ein`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(WIRE_ORG_OK);
      }),
    );

    await fetchOrgByEin("91-2031237", TEST_ENV);

    expect(capturedUrl).toBe(
      `${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/91-2031237`,
    );
  });

  it("returns a typed EndaomentLiveOrg with fields mapped from the wire body", async () => {
    mswServer.use(
      http.get(
        `${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/:ein`,
        () => HttpResponse.json(WIRE_ORG_OK),
      ),
    );

    const result = await fetchOrgByEin("91-2031237", TEST_ENV);

    expect(result).toEqual(EXPECTED_ORG);
  });

  it("maps a null logo to null logoUrl", async () => {
    mswServer.use(
      http.get(
        `${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/:ein`,
        () => HttpResponse.json({ ...WIRE_ORG_OK, logo: null }),
      ),
    );

    const result = await fetchOrgByEin("91-2031237", TEST_ENV);

    expect(result.logoUrl).toBeNull();
  });

  it("throws with status and truncated body on a 404 response", async () => {
    mswServer.use(
      http.get(
        `${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/:ein`,
        () =>
          HttpResponse.json(
            { error: "org_not_found", message: "No org with that EIN." },
            { status: 404 },
          ),
      ),
    );

    await expect(fetchOrgByEin("00-0000000", TEST_ENV)).rejects.toThrow(
      /Endaoment org fetch failed: 404/,
    );
  });

  it("throws with status and truncated body on a 500 response", async () => {
    mswServer.use(
      http.get(
        `${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/:ein`,
        () =>
          HttpResponse.json(
            { error: "internal_error" },
            { status: 500 },
          ),
      ),
    );

    await expect(fetchOrgByEin("91-2031237", TEST_ENV)).rejects.toThrow(
      /Endaoment org fetch failed: 500/,
    );
  });

  it("throws when the response body is missing required fields (malformed)", async () => {
    mswServer.use(
      http.get(
        `${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/:ein`,
        () =>
          HttpResponse.json({
            // Missing: description, contractAddress
            name: "Incomplete Org",
            ein: "91-2031237",
          }),
      ),
    );

    await expect(fetchOrgByEin("91-2031237", TEST_ENV)).rejects.toThrow(
      /Unexpected Endaoment org response/,
    );
  });

  it("throws when contractAddress is not a valid EVM address string", async () => {
    mswServer.use(
      http.get(
        `${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/:ein`,
        () =>
          HttpResponse.json({
            ...WIRE_ORG_OK,
            contractAddress: "not-an-address",
          }),
      ),
    );

    await expect(fetchOrgByEin("91-2031237", TEST_ENV)).rejects.toThrow(
      /Unexpected Endaoment org response/,
    );
  });

  it("rejects when the request times out", async () => {
    mswServer.use(
      http.get(
        `${TEST_ENV.ENDAOMENT_API_URL}/v1/orgs/:ein`,
        async () => {
          // Hold the response longer than our test timeout budget.
          await delay(5_000);
          return HttpResponse.json(WIRE_ORG_OK);
        },
      ),
    );

    // Use a 1ms timeout env to guarantee expiry without waiting 5 seconds.
    await expect(
      fetchOrgByEin("91-2031237", TEST_ENV, 1),
    ).rejects.toThrow();
  });

  it("exports the ENDAOMENT_ORG_URL base path constant", () => {
    expect(ENDAOMENT_ORG_URL).toBe("/v1/orgs");
  });
});
