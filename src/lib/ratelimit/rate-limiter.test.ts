import { describe, expect, it } from "vitest";
import { createInMemoryKvStore } from "@/lib/kv/kv-store";
import { createRateLimiter } from "./rate-limiter";

/** Mutable fake clock so window rollover is deterministic. */
function fakeClock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

describe("createRateLimiter()", () => {
  it("allows requests up to the limit, then denies", async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter(createInMemoryKvStore({ now: clock.now }), {
      limit: 3,
      windowSeconds: 60,
      now: clock.now,
    });

    expect((await limiter.check("ip-1")).allowed).toBe(true); // 1
    expect((await limiter.check("ip-1")).allowed).toBe(true); // 2
    const third = await limiter.check("ip-1"); // 3 — the last allowed
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = await limiter.check("ip-1"); // over the limit
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("reports decreasing remaining and a fixed limit", async () => {
    const limiter = createRateLimiter(createInMemoryKvStore(), {
      limit: 5,
      windowSeconds: 60,
    });

    const first = await limiter.check("ip-2");
    expect(first.limit).toBe(5);
    expect(first.remaining).toBe(4);
  });

  it("isolates counters per identifier", async () => {
    const limiter = createRateLimiter(createInMemoryKvStore(), {
      limit: 1,
      windowSeconds: 60,
    });

    expect((await limiter.check("ip-a")).allowed).toBe(true);
    expect((await limiter.check("ip-a")).allowed).toBe(false);
    // A different caller has its own fresh budget.
    expect((await limiter.check("ip-b")).allowed).toBe(true);
  });

  it("resets the budget when the window rolls over", async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter(createInMemoryKvStore({ now: clock.now }), {
      limit: 1,
      windowSeconds: 60,
      now: clock.now,
    });

    expect((await limiter.check("ip-3")).allowed).toBe(true);
    expect((await limiter.check("ip-3")).allowed).toBe(false);

    clock.advance(60_000); // next fixed window
    expect((await limiter.check("ip-3")).allowed).toBe(true);
  });
});
