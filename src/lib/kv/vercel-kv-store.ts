/**
 * Durable {@link KvStore} backed by `@vercel/kv` (Upstash Redis over REST) —
 * the production answer to security review M2.
 *
 * State lives outside any single serverless instance, so:
 *   - the webhook processed-event log survives cold starts and is shared across
 *     lambdas (no cross-instance replay window),
 *   - the idempotency index makes a donor retry hit the same session on any
 *     instance (no duplicate billable Stripe session),
 *   - rate-limit counters throttle a client globally, not per-lambda.
 *
 * The client is injected so the adapter is unit-testable against a fake; the
 * `from*` factory builds the real client from config.
 */

import { createClient } from "@vercel/kv";
import type { KvStore } from "@/lib/kv/kv-store";

/** The subset of the `@vercel/kv` client surface this adapter depends on. */
export interface VercelKvClient {
  get<T>(key: string): Promise<T | null>;
  set(
    key: string,
    value: unknown,
    opts?: { ex?: number; nx?: boolean },
  ): Promise<unknown>;
  exists(key: string): Promise<number>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export function createVercelKvStore(client: VercelKvClient): KvStore {
  return {
    async get<T>(key: string): Promise<T | null> {
      return (await client.get<T>(key)) ?? null;
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      await client.set(
        key,
        value,
        ttlSeconds !== undefined ? { ex: ttlSeconds } : undefined,
      );
    },

    async setNx<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
      // Upstash returns "OK" when the NX write lands and null when the key
      // already exists; a non-null reply means we won the reservation.
      const opts =
        ttlSeconds !== undefined ? { nx: true, ex: ttlSeconds } : { nx: true };
      const result = await client.set(key, value, opts);
      return result !== null;
    },

    async has(key: string): Promise<boolean> {
      return (await client.exists(key)) > 0;
    },

    async delete(key: string): Promise<void> {
      await client.del(key);
    },

    async increment(key: string, ttlSeconds?: number): Promise<number> {
      const next = await client.incr(key);
      // Arm the window TTL only on the first hit so later hits don't slide it
      // (the fixed-window guarantee). INCR creates the key at 1 when absent.
      if (next === 1 && ttlSeconds !== undefined) {
        await client.expire(key, ttlSeconds);
      }
      return next;
    },
  };
}

/** Build a durable KvStore from explicit Upstash/Vercel KV REST credentials. */
export function createVercelKvStoreFromConfig(config: {
  url: string;
  token: string;
}): KvStore {
  return createVercelKvStore(createClient(config) as unknown as VercelKvClient);
}
