/**
 * On-ramp session persistence (Epic 3, Phase 3).
 *
 * Repository-pattern store keyed by Stripe session id. The MVP impl is an
 * in-memory `Map`, which loses state on process restart — acceptable for the
 * demo, NOT for production (see prompts/epic-3-onramp-plan.md, "Risks"). The
 * `SessionStore` interface is the seam: a Postgres/Redis impl can drop in
 * without touching callers (the session route, webhook handler, status route).
 */

import type { OnrampSession } from "@/types/onramp";

export interface SessionStore {
  /** Returns the persisted session, or `undefined` if the id is unknown. */
  get(id: string): OnrampSession | undefined;
  /** Persists a session, overwriting any existing record with the same id. */
  put(session: OnrampSession): void;
  /**
   * Applies `patch` to the stored session and persists the result. Returns a
   * new record (the original is never mutated). Throws if `id` is unknown.
   */
  update(id: string, patch: Partial<OnrampSession>): OnrampSession;
  /** Clears all records. Intended for test isolation. */
  reset(): void;
}

function createInMemorySessionStore(): SessionStore {
  const records = new Map<string, OnrampSession>();

  return {
    get(id) {
      return records.get(id);
    },

    put(session) {
      records.set(session.id, session);
    },

    update(id, patch) {
      const existing = records.get(id);
      if (!existing) {
        throw new Error(`Cannot update unknown on-ramp session: ${id}`);
      }
      // Immutable merge; keep the original id as the canonical key.
      const next: OnrampSession = { ...existing, ...patch, id: existing.id };
      records.set(id, next);
      return next;
    },

    reset() {
      records.clear();
    },
  };
}

/**
 * Process-global store instance. Shared across requests in the same Node
 * process so a session created by the POST route is visible to the webhook
 * and status routes.
 */
export const inMemorySessionStore: SessionStore = createInMemorySessionStore();
