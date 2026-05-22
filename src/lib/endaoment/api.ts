/**
 * Thin Endaoment REST client. The ONLY place that calls the Endaoment API
 * for live org metadata.
 *
 * Deliberately uses `fetch` rather than any Endaoment SDK: the endpoint is a
 * simple GET, and a raw call is trivially interceptable by MSW in tests. Env
 * is injected (never read from process.env here) so the wrapper stays
 * unit-testable without touching real infrastructure.
 *
 * Wire field names from Endaoment's API:
 *   name           → name
 *   ein            → ein
 *   description    → mission
 *   logo           → logoUrl  (nullable)
 *   contractAddress → mainnetAddress
 */

import { z } from "zod";
import type { Address } from "viem";

/** Base path for org lookup; exported so tests can pin exact URL. */
export const ENDAOMENT_ORG_URL = "/v1/orgs";

/** Abort the call if Endaoment has not responded in this window (ms). */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Cap how much of Endaoment's error body we echo into a thrown message. */
const ERROR_BODY_MAX_CHARS = 300;

/**
 * EVM address pattern. Mirrors the regex used in server.ts rather than
 * importing viem's `isAddress` (which accepts checksummed only) to keep this
 * a pure string check that Zod can apply synchronously.
 */
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Wire-shape schema — only the subset Eudaimonia depends on.
 * Endaoment sends additional fields (categories, NTEE codes, etc.) that are
 * intentionally ignored here.
 */
const endaomentOrgSchema = z.object({
  name: z.string().min(1),
  ein: z.string().min(1),
  /** Mission / description text from Endaoment. */
  description: z.string().min(1),
  /** Logo URL or null when the org has no logo on record. */
  logo: z.string().url().nullable(),
  /** Mainnet (Base) org Entity contract address. */
  contractAddress: z.string().regex(EVM_ADDRESS_RE, "must be a valid EVM address"),
});

/**
 * Domain type returned by `fetchOrgByEin`.
 *
 * This is `EndaomentOrgMetadata` from `src/types/charity.ts` minus
 * `capturedAt` — that field belongs to the committed snapshot (Task 3),
 * not the live API response.
 */
export interface EndaomentLiveOrg {
  name: string;
  ein: string;
  /** One-paragraph mission / description sourced from Endaoment. */
  mission: string;
  /** Logo URL, or null when the org has none. */
  logoUrl: string | null;
  /** Mainnet (Base) org Entity address. */
  mainnetAddress: Address;
}

/**
 * Fetch live org metadata from Endaoment's REST API by EIN.
 *
 * @param ein        IRS EIN, format "NN-NNNNNNN".
 * @param env        Injected env object; NEVER reads process.env internally.
 * @param timeoutMs  Optional override for the abort timeout (useful in tests).
 * @returns          Typed `EndaomentLiveOrg` validated by Zod.
 * @throws           Error with status + truncated body on non-2xx.
 * @throws           Error on malformed / missing required fields.
 * @throws           AbortError (or subclass) on timeout.
 */
export async function fetchOrgByEin(
  ein: string,
  env: { ENDAOMENT_API_URL: string },
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<EndaomentLiveOrg> {
  const url = `${env.ENDAOMENT_API_URL}${ENDAOMENT_ORG_URL}/${ein}`;

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, ERROR_BODY_MAX_CHARS);
    throw new Error(
      `Endaoment org fetch failed: ${response.status} - ${detail}`,
    );
  }

  const parsed = endaomentOrgSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      "Unexpected Endaoment org response: missing or invalid required fields",
    );
  }

  return {
    name: parsed.data.name,
    ein: parsed.data.ein,
    mission: parsed.data.description,
    logoUrl: parsed.data.logo,
    mainnetAddress: parsed.data.contractAddress as Address,
  };
}
