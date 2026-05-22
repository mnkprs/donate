/**
 * Fixed-window rate limiter over a {@link KvStore} (security review H1).
 *
 * The unauthenticated `POST /api/onramp/session` triggers a billable Stripe call
 * per request, so it must be throttled per client. A fixed window is the simplest
 * correct strategy and maps to a single atomic `increment`: the window is encoded
 * in the key (`prefix:id:windowIndex`), so a new window is just a new key — no
 * sweeping, no read-modify-write race.
 *
 * Backed by the in-memory KvStore it is single-node (fine for the demo); backed by
 * the `@vercel/kv` adapter the same code throttles correctly across instances.
 */

import type { KvStore } from "@/lib/kv/kv-store";

export interface RateLimitResult {
  /** Whether this request is within the budget. */
  readonly allowed: boolean;
  /** Configured ceiling per window. */
  readonly limit: number;
  /** Requests left in the current window (never negative). */
  readonly remaining: number;
  /** Epoch ms when the current window ends and the budget resets. */
  readonly resetAt: number;
}

export interface RateLimiterOptions {
  /** Max allowed requests per window per identifier. */
  readonly limit: number;
  /** Window length in seconds. */
  readonly windowSeconds: number;
  /** Injectable clock (ms epoch) for deterministic tests. */
  readonly now?: () => number;
  /** Key namespace, so multiple limiters can share one store. */
  readonly prefix?: string;
}

export interface RateLimiter {
  /** Record one request from `identifier` and report whether it is allowed. */
  check(identifier: string): Promise<RateLimitResult>;
}

export function createRateLimiter(
  store: KvStore,
  options: RateLimiterOptions,
): RateLimiter {
  const { limit, windowSeconds, now = Date.now, prefix = "rl" } = options;

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const windowIndex = Math.floor(now() / 1000 / windowSeconds);
      const key = `${prefix}:${identifier}:${windowIndex}`;

      // Arm the TTL on the first hit of the window; later hits keep it.
      const count = await store.increment(key, windowSeconds);

      const resetAt = (windowIndex + 1) * windowSeconds * 1000;
      return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    },
  };
}
