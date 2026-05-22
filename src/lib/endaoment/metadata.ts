/**
 * Org metadata resolution with committed offline snapshot fallback.
 *
 * Resolution order:
 *   1. Live Endaoment API (if `env` is provided) — preferred, always fresh.
 *   2. Committed snapshot (snapshot.json) — fallback on ANY API failure.
 *   3. Throw `OrgNotFoundError` — when neither source resolves the EIN.
 *
 * Fallback policy:
 *   - ANY error from `fetchOrgByEin` triggers snapshot lookup: network errors,
 *     timeouts (AbortError), non-200 responses, and Zod validation failures.
 *   - On fallback: logs a structured warning via the project logger with the
 *     EIN, failure reason, and `source: "snapshot"` — never silently swallowed.
 *   - When `env` is omitted the live API is skipped entirely; the snapshot is
 *     the only source (useful in build-time / CI contexts with no API key).
 *
 * NOTE (decision point for human review):
 *   `mainnetAddress` in snapshot entries is `null` for all three curated orgs
 *   because their Base mainnet contract addresses have not been independently
 *   verified. The field in `EndaomentOrgMetadata` has been widened to
 *   `Address | null` accordingly. Callers (e.g. the verification step in Task 4)
 *   must handle the null case. Once verified addresses are known, update
 *   snapshot.json and narrow the type back if desired.
 */

import type { EndaomentOrgMetadata } from "@/types/charity";
import { logger } from "@/lib/log/logger";
import { fetchOrgByEin } from "./api";
import snapshot from "./snapshot.json";

// ---------------------------------------------------------------------------
// Typed snapshot
// ---------------------------------------------------------------------------

/**
 * The snapshot is keyed by EIN. We cast it to a typed index signature so
 * TypeScript can verify the shape of each entry at compile time.
 */
type SnapshotRecord = Record<string, EndaomentOrgMetadata>;

const SNAPSHOT: SnapshotRecord = snapshot as SnapshotRecord;

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

/**
 * Thrown when neither the live Endaoment API nor the committed snapshot can
 * resolve the requested EIN. Carries a user-safe message (no internal URL,
 * stack trace, or server detail).
 */
export class OrgNotFoundError extends Error {
  readonly ein: string;

  constructor(ein: string) {
    super(
      `Charity with EIN "${ein}" could not be found. ` +
        `It may not be registered with Endaoment or may not be supported by this platform.`,
    );
    this.name = "OrgNotFoundError";
    this.ein = ein;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Resolve org metadata for the given EIN.
 *
 * @param ein  IRS EIN, format "NN-NNNNNNN".
 * @param env  Optional injected env. When omitted the live API is skipped and
 *             only the snapshot is consulted.
 * @returns    `EndaomentOrgMetadata` — from live API (capturedAt = now) or
 *             snapshot (capturedAt = commit date).
 * @throws     `OrgNotFoundError` when neither source resolves the EIN.
 */
export async function resolveOrgMetadata(
  ein: string,
  env?: { ENDAOMENT_API_URL: string },
): Promise<EndaomentOrgMetadata> {
  // ------------------------------------------------------------------
  // 1. Try live API (only when env is provided)
  // ------------------------------------------------------------------
  if (env !== undefined) {
    try {
      const liveOrg = await fetchOrgByEin(ein, env);
      return {
        name: liveOrg.name,
        ein: liveOrg.ein,
        mission: liveOrg.mission,
        logoUrl: liveOrg.logoUrl,
        mainnetAddress: liveOrg.mainnetAddress,
        capturedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      // Log server-side context before falling back — never silently swallow.
      logger.warn(
        {
          ein,
          source: "snapshot",
          reason: err instanceof Error ? err.message : String(err),
          err,
        },
        "Endaoment live API failed; falling back to committed snapshot",
      );
    }
  }

  // ------------------------------------------------------------------
  // 2. Consult committed snapshot
  // ------------------------------------------------------------------
  const entry = SNAPSHOT[ein];
  if (entry !== undefined) {
    return entry;
  }

  // ------------------------------------------------------------------
  // 3. Neither source resolved — throw typed user-safe error
  // ------------------------------------------------------------------
  throw new OrgNotFoundError(ein);
}
