import { describe, expect, it } from "vitest";
import { createInMemoryKvStore } from "./kv-store";

/** A mutable fake clock so TTL/eviction are deterministic, never wall-clock. */
function fakeClock(start = 1_000_000): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

describe("createInMemoryKvStore()", () => {
  it("round-trips a value: set then get returns it", async () => {
    const kv = createInMemoryKvStore();
    await kv.set("k", { a: 1 });
    expect(await kv.get<{ a: number }>("k")).toEqual({ a: 1 });
  });

  it("returns null for a missing key", async () => {
    const kv = createInMemoryKvStore();
    expect(await kv.get("missing")).toBeNull();
  });

  it("has() reflects presence and absence", async () => {
    const kv = createInMemoryKvStore();
    expect(await kv.has("k")).toBe(false);
    await kv.set("k", 1);
    expect(await kv.has("k")).toBe(true);
  });

  it("delete() removes a key", async () => {
    const kv = createInMemoryKvStore();
    await kv.set("k", 1);
    await kv.delete("k");
    expect(await kv.has("k")).toBe(false);
  });

  it("expires a key once the per-set TTL elapses (lazy on read)", async () => {
    const clock = fakeClock();
    const kv = createInMemoryKvStore({ now: clock.now });

    await kv.set("k", "v", 10); // 10s TTL
    expect(await kv.get("k")).toBe("v");

    clock.advance(9_999);
    expect(await kv.get("k")).toBe("v"); // still inside the window

    clock.advance(1); // now exactly at expiry
    expect(await kv.get("k")).toBeNull();
    expect(await kv.has("k")).toBe(false);
  });

  it("applies defaultTtlSeconds when no per-set TTL is given", async () => {
    const clock = fakeClock();
    const kv = createInMemoryKvStore({ now: clock.now, defaultTtlSeconds: 5 });

    await kv.set("k", "v");
    clock.advance(5_000);
    expect(await kv.get("k")).toBeNull();
  });

  it("keeps a key with no TTL and no default forever", async () => {
    const clock = fakeClock();
    const kv = createInMemoryKvStore({ now: clock.now });

    await kv.set("k", "v");
    clock.advance(10_000_000);
    expect(await kv.get("k")).toBe("v");
  });

  it("evicts the oldest entries once maxEntries is exceeded (bounded growth, M1)", async () => {
    const kv = createInMemoryKvStore({ maxEntries: 3 });

    await kv.set("a", 1);
    await kv.set("b", 2);
    await kv.set("c", 3);
    await kv.set("d", 4); // pushes out the oldest ("a")

    expect(kv.size()).toBe(3);
    expect(await kv.has("a")).toBe(false);
    expect(await kv.has("d")).toBe(true);
  });

  it("increment() starts at 1 and counts up", async () => {
    const kv = createInMemoryKvStore();
    expect(await kv.increment("c")).toBe(1);
    expect(await kv.increment("c")).toBe(2);
    expect(await kv.increment("c")).toBe(3);
  });

  it("increment() sets the window TTL on first hit and does NOT extend it on later hits", async () => {
    const clock = fakeClock();
    const kv = createInMemoryKvStore({ now: clock.now });

    await kv.increment("c", 10); // window opens, expires at +10s
    clock.advance(6_000);
    await kv.increment("c", 10); // must NOT slide the window
    clock.advance(4_000); // now +10s from the first hit
    expect(await kv.get("c")).toBeNull(); // window closed despite later hit
  });

  it("setNx() writes and returns true when the key is absent", async () => {
    const kv = createInMemoryKvStore();
    expect(await kv.setNx("k", { v: 1 })).toBe(true);
    expect(await kv.get<{ v: number }>("k")).toEqual({ v: 1 });
  });

  it("setNx() returns false and does NOT overwrite when the key is present", async () => {
    const kv = createInMemoryKvStore();
    await kv.set("k", "winner");
    expect(await kv.setNx("k", "loser")).toBe(false);
    expect(await kv.get("k")).toBe("winner");
  });

  it("setNx() arms the TTL so the reservation can expire", async () => {
    const clock = fakeClock();
    const kv = createInMemoryKvStore({ now: clock.now });

    expect(await kv.setNx("k", "v", 10)).toBe(true);
    clock.advance(10_000); // window closes
    expect(await kv.get("k")).toBeNull();
    // Once expired, a fresh setNx wins again (crashed-winner recovery).
    expect(await kv.setNx("k", "v2", 10)).toBe(true);
    expect(await kv.get("k")).toBe("v2");
  });

  it("reset() clears all entries", async () => {
    const kv = createInMemoryKvStore();
    await kv.set("a", 1);
    kv.reset();
    expect(await kv.has("a")).toBe(false);
    expect(kv.size()).toBe(0);
  });
});
