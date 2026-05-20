/**
 * Generic async key-value primitive shared by the on-ramp pipeline.
 *
 * Every stateful seam in Epic 3 — session records, the webhook processed-event
 * log, the idempotency index, and the rate-limit counter — is a thin facade over
 * this one interface. That gives us a single place to swap durability:
 *   - {@link createInMemoryKvStore} — process-local, TTL + bounded size (fixes M1).
 *   - the `@vercel/kv` adapter (`vercel-kv-store.ts`) — durable + shared (fixes M2).
 *
 * `increment` is first-class because fixed-window rate limiting needs an atomic
 * counter; it maps directly onto Redis `INCR` + `EXPIRE` in the durable adapter.
 */

export interface KvStore {
  /** Returns the stored value, or `null` if absent/expired. */
  get<T>(key: string): Promise<T | null>;
  /** Stores `value`, optionally expiring it after `ttlSeconds`. */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** True iff the key is present and unexpired. */
  has(key: string): Promise<boolean>;
  /** Removes the key (no-op if absent). */
  delete(key: string): Promise<void>;
  /**
   * Atomically increments the integer counter at `key`, returning the new value.
   * On the FIRST increment (key absent) the TTL is armed; later increments do
   * NOT slide the window — that is the fixed-window guarantee the limiter relies on.
   */
  increment(key: string, ttlSeconds?: number): Promise<number>;
}

export interface InMemoryKvStore extends KvStore {
  /** Test-only: drop every entry. */
  reset(): void;
  /** Current live+stale entry count (used by tests to assert eviction). */
  size(): number;
}

export interface InMemoryKvOptions {
  /** Hard cap on entries; oldest-inserted are evicted past this (bounds memory). */
  readonly maxEntries?: number;
  /** TTL applied when `set`/`increment` is called without an explicit one. */
  readonly defaultTtlSeconds?: number;
  /** Injectable clock (ms epoch) so TTL/eviction are deterministic in tests. */
  readonly now?: () => number;
}

interface Entry {
  value: unknown;
  /** Epoch ms at which this entry expires, or `null` to live forever. */
  expiresAt: number | null;
}

/** Default ceiling: generous for a busy single node, fatal to unbounded growth. */
const DEFAULT_MAX_ENTRIES = 10_000;

export function createInMemoryKvStore(
  options: InMemoryKvOptions = {},
): InMemoryKvStore {
  const {
    maxEntries = DEFAULT_MAX_ENTRIES,
    defaultTtlSeconds,
    now = Date.now,
  } = options;

  // Map preserves insertion order, so the first key is always the oldest.
  const entries = new Map<string, Entry>();

  function expiryFor(ttlSeconds: number | undefined): number | null {
    const ttl = ttlSeconds ?? defaultTtlSeconds;
    return ttl === undefined ? null : now() + ttl * 1000;
  }

  /** Read a still-live entry, lazily evicting it if expired. */
  function readLive(key: string): Entry | undefined {
    const entry = entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt !== null && now() >= entry.expiresAt) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  /** Evict oldest-inserted entries until within the size cap (FIFO). */
  function enforceCap(): void {
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  /** Re-insert so the key moves to the newest position (keeps FIFO honest). */
  function write(key: string, entry: Entry): void {
    entries.delete(key);
    entries.set(key, entry);
    enforceCap();
  }

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = readLive(key);
      return entry === undefined ? null : (entry.value as T);
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      write(key, { value, expiresAt: expiryFor(ttlSeconds) });
    },

    async has(key: string): Promise<boolean> {
      return readLive(key) !== undefined;
    },

    async delete(key: string): Promise<void> {
      entries.delete(key);
    },

    async increment(key: string, ttlSeconds?: number): Promise<number> {
      const existing = readLive(key);
      const current =
        existing !== undefined && typeof existing.value === "number"
          ? existing.value
          : 0;
      const next = current + 1;
      // Preserve the original window: only arm TTL when the key was absent.
      const expiresAt =
        existing !== undefined ? existing.expiresAt : expiryFor(ttlSeconds);
      write(key, { value: next, expiresAt });
      return next;
    },

    reset(): void {
      entries.clear();
    },

    size(): number {
      return entries.size;
    },
  };
}
