/**
 * The single KvStore every on-ramp route shares for non-session state: the
 * webhook processed-event log, the session idempotency index, and the rate-limit
 * counters (each under its own key prefix).
 *
 * Centralising it here is what makes the M2 durability swap a one-line change:
 * Unit C returns the `@vercel/kv` adapter when KV env is configured, otherwise
 * this in-memory store. Callers never know which backs them.
 */

import { createInMemoryKvStore, type KvStore } from "@/lib/kv/kv-store";

let shared: KvStore | null = null;

/** Lazily-built process-shared KvStore for on-ramp routing state. */
export function onrampKvStore(): KvStore {
  if (shared === null) {
    shared = createInMemoryKvStore();
  }
  return shared;
}
