import { describe, expect, it, vi } from "vitest";
import { createVercelKvStore, type VercelKvClient } from "./vercel-kv-store";

/**
 * Map-backed fake of the @vercel/kv client surface. Lets us assert the adapter's
 * call shape (notably: TTL is armed via `expire` only on the first `incr`)
 * without a live Redis or network.
 */
function fakeClient(): VercelKvClient & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    async get<T>(key: string): Promise<T | null> {
      return (store.get(key) as T) ?? null;
    },
    async set(key, value, opts) {
      // Mirror Upstash semantics: with { nx: true } the write is rejected when
      // the key already exists, signalled by a null reply (vs "OK" on success).
      if (opts?.nx && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return "OK";
    },
    async exists(key) {
      return store.has(key) ? 1 : 0;
    },
    async del(key) {
      store.delete(key);
    },
    async incr(key) {
      const next = ((store.get(key) as number) ?? 0) + 1;
      store.set(key, next);
      return next;
    },
    async expire() {
      // no-op in the fake; spied on per-test
    },
  };
}

describe("createVercelKvStore()", () => {
  it("round-trips get/set", async () => {
    const kv = createVercelKvStore(fakeClient());
    await kv.set("k", { a: 1 });
    expect(await kv.get<{ a: number }>("k")).toEqual({ a: 1 });
  });

  it("returns null for a missing key", async () => {
    const kv = createVercelKvStore(fakeClient());
    expect(await kv.get("missing")).toBeNull();
  });

  it("passes TTL through to set as the `ex` option", async () => {
    const client = fakeClient();
    const setSpy = vi.spyOn(client, "set");
    const kv = createVercelKvStore(client);

    await kv.set("k", "v", 30);

    expect(setSpy).toHaveBeenCalledWith("k", "v", { ex: 30 });
  });

  it("omits the options object when no TTL is given", async () => {
    const client = fakeClient();
    const setSpy = vi.spyOn(client, "set");
    const kv = createVercelKvStore(client);

    await kv.set("k", "v");

    expect(setSpy).toHaveBeenCalledWith("k", "v", undefined);
  });

  it("has() maps the numeric exists() result to a boolean", async () => {
    const kv = createVercelKvStore(fakeClient());
    expect(await kv.has("k")).toBe(false);
    await kv.set("k", 1);
    expect(await kv.has("k")).toBe(true);
  });

  it("delete() removes the key", async () => {
    const kv = createVercelKvStore(fakeClient());
    await kv.set("k", 1);
    await kv.delete("k");
    expect(await kv.has("k")).toBe(false);
  });

  it("increment() counts up via incr()", async () => {
    const kv = createVercelKvStore(fakeClient());
    expect(await kv.increment("c")).toBe(1);
    expect(await kv.increment("c")).toBe(2);
  });

  it("arms the window TTL via expire() ONLY on the first increment", async () => {
    const client = fakeClient();
    const expireSpy = vi.spyOn(client, "expire");
    const kv = createVercelKvStore(client);

    await kv.increment("c", 60); // first hit → arm window
    await kv.increment("c", 60); // later hit → must NOT re-arm

    expect(expireSpy).toHaveBeenCalledTimes(1);
    expect(expireSpy).toHaveBeenCalledWith("c", 60);
  });

  it("does not call expire() when no TTL is provided", async () => {
    const client = fakeClient();
    const expireSpy = vi.spyOn(client, "expire");
    const kv = createVercelKvStore(client);

    await kv.increment("c");

    expect(expireSpy).not.toHaveBeenCalled();
  });

  it("setNx() sets with { nx: true, ex } and returns true on the 'OK' reply", async () => {
    const client = fakeClient();
    const setSpy = vi.spyOn(client, "set");
    const kv = createVercelKvStore(client);

    expect(await kv.setNx("k", "v", 60)).toBe(true);
    expect(setSpy).toHaveBeenCalledWith("k", "v", { nx: true, ex: 60 });
  });

  it("setNx() returns false when the key already exists (null reply)", async () => {
    const kv = createVercelKvStore(fakeClient());
    expect(await kv.setNx("k", "winner", 60)).toBe(true);
    expect(await kv.setNx("k", "loser", 60)).toBe(false);
    expect(await kv.get("k")).toBe("winner");
  });

  it("setNx() omits ex when no TTL is given (still nx)", async () => {
    const client = fakeClient();
    const setSpy = vi.spyOn(client, "set");
    const kv = createVercelKvStore(client);

    await kv.setNx("k", "v");

    expect(setSpy).toHaveBeenCalledWith("k", "v", { nx: true });
  });
});
