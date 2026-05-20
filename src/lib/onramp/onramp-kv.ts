/**
 * The single KvStore every on-ramp route shares for non-session state: the
 * webhook processed-event log, the session idempotency index, and the rate-limit
 * counters (each under its own key prefix).
 *
 * Centralising it here is what makes the M2 durability swap a one-line decision:
 * when Vercel KV REST credentials are configured (production), back everything
 * with the durable, cross-instance `@vercel/kv` adapter; otherwise (local demo,
 * unit tests) fall back to the bounded in-memory store. Callers never know which.
 */

import { createInMemoryKvStore, type KvStore } from "@/lib/kv/kv-store";
import { createVercelKvStoreFromConfig } from "@/lib/kv/vercel-kv-store";

let shared: KvStore | null = null;

/**
 * Use the durable KV only when real REST credentials are present AND we are not
 * inside a unit-test run — tests must never reach a live Redis (MSW would error
 * on the outbound request anyway). Vitest sets `process.env.VITEST`.
 */
function shouldUseVercelKv(): boolean {
  if (process.env.VITEST) return false;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return Boolean(url?.startsWith("https://") && token);
}

/** Lazily-built process-shared KvStore for on-ramp routing state. */
export function onrampKvStore(): KvStore {
  if (shared === null) {
    shared = shouldUseVercelKv()
      ? createVercelKvStoreFromConfig({
          url: process.env.KV_REST_API_URL as string,
          token: process.env.KV_REST_API_TOKEN as string,
        })
      : createInMemoryKvStore();
  }
  return shared;
}
