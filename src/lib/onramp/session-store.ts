/**
 * On-ramp session persistence (Epic 3, Phase 3; made durable in the M2 fix).
 *
 * Repository-pattern store keyed by Stripe session id, now ASYNC and backed by a
 * {@link KvStore}. The in-memory KvStore gives the demo a bounded, TTL'd store
 * (security review M1); the `@vercel/kv` adapter makes it durable + shared across
 * serverless instances (security review M2) without touching a single caller —
 * the route handlers, webhook, and status route all depend on this interface.
 */

import { createInMemoryKvStore, type KvStore } from "@/lib/kv/kv-store";
import type { OnrampSession } from "@/types/onramp";

export interface SessionStore {
  /** Returns the persisted session, or `undefined` if the id is unknown. */
  get(id: string): Promise<OnrampSession | undefined>;
  /** Persists a session, overwriting any existing record with the same id. */
  put(session: OnrampSession): Promise<void>;
  /**
   * Applies `patch` to the stored session and persists the result. Returns a
   * new record (the original is never mutated). Throws if `id` is unknown.
   */
  update(id: string, patch: Partial<OnrampSession>): Promise<OnrampSession>;
  /** Clears all records. Intended for test isolation; a no-op on durable stores. */
  reset(): Promise<void>;
}

/** Key namespace for session records within a (possibly shared) KvStore. */
const SESSION_PREFIX = "sess:";

/**
 * How long a session record lives. Generous enough to outlast settlement on Base
 * (minutes) with huge margin, while still bounding storage so abandoned sessions
 * cannot accumulate forever (the durable side of M1).
 */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Build a SessionStore over any KvStore. `clear` is invoked by `reset()`; durable
 * adapters pass a no-op (we never flush a production KV), the in-memory store
 * passes its `reset` for test isolation.
 */
export function createSessionStore(
  kv: KvStore,
  clear: () => void = () => {},
): SessionStore {
  return {
    async get(id) {
      const found = await kv.get<OnrampSession>(SESSION_PREFIX + id);
      return found ?? undefined;
    },

    async put(session) {
      await kv.set(SESSION_PREFIX + session.id, session, SESSION_TTL_SECONDS);
    },

    async update(id, patch) {
      const existing = await kv.get<OnrampSession>(SESSION_PREFIX + id);
      if (!existing) {
        throw new Error(`Cannot update unknown on-ramp session: ${id}`);
      }
      // Immutable merge; keep the original id as the canonical key.
      const next: OnrampSession = { ...existing, ...patch, id: existing.id };
      await kv.set(SESSION_PREFIX + id, next, SESSION_TTL_SECONDS);
      return next;
    },

    async reset() {
      clear();
    },
  };
}

/** What the idempotency index stores per key: the session id + a payload fingerprint. */
export interface IdempotencyEntry {
  readonly sessionId: string;
  readonly payloadHash: string;
}

/**
 * Maps a client-supplied request id → the session it created. Async + durable so
 * a donor's retry hits the same cached session even across serverless instances
 * (security review M2), preventing a second billable Stripe session.
 */
export interface IdempotencyIndex {
  get(key: string): Promise<IdempotencyEntry | undefined>;
  set(key: string, entry: IdempotencyEntry): Promise<void>;
}

/** Key namespace for idempotency entries within a (possibly shared) KvStore. */
const IDEMPOTENCY_PREFIX = "idem:";

/** Build an IdempotencyIndex over any KvStore; entries expire with the session. */
export function createIdempotencyIndex(
  kv: KvStore,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): IdempotencyIndex {
  return {
    async get(key) {
      const found = await kv.get<IdempotencyEntry>(IDEMPOTENCY_PREFIX + key);
      return found ?? undefined;
    },
    async set(key, entry) {
      await kv.set(IDEMPOTENCY_PREFIX + key, entry, ttlSeconds);
    },
  };
}

/**
 * Process-global in-memory store instance — the demo default. Shared across
 * requests in the same Node process so a session created by the POST route is
 * visible to the webhook and status routes. The production wiring (`onramp-kv.ts`)
 * swaps the backing KvStore for the durable adapter when KV env is configured.
 */
export const inMemorySessionStore: SessionStore = (() => {
  const kv = createInMemoryKvStore({ defaultTtlSeconds: SESSION_TTL_SECONDS });
  return createSessionStore(kv, () => kv.reset());
})();
