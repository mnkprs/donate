import { beforeEach, describe, expect, it } from "vitest";
import { inMemorySessionStore } from "./session-store";
import type { OnrampSession } from "@/types/onramp";

/** A persisted session in its initial "created" state. */
const SESSION: OnrampSession = Object.freeze({
  id: "cos_test_123",
  status: "created",
  clientSecret: "cos_test_123_secret_abc",
  redirectUrl: "https://crypto.link.com/session/cos_test_123",
  grossCents: 5000,
  campaignId: "pcrf",
  donorEmail: "donor@example.com",
});

describe("inMemorySessionStore", () => {
  // Map-backed store is process-global; isolate every test.
  beforeEach(() => {
    inMemorySessionStore.reset();
  });

  it("returns undefined for an unknown id", () => {
    expect(inMemorySessionStore.get("cos_nope")).toBeUndefined();
  });

  it("round-trips a record: put then get returns the same session", () => {
    inMemorySessionStore.put(SESSION);
    expect(inMemorySessionStore.get(SESSION.id)).toEqual(SESSION);
  });

  it("applies a patch on update and returns the merged record", () => {
    inMemorySessionStore.put(SESSION);

    const updated = inMemorySessionStore.update(SESSION.id, {
      status: "settled",
      txHash: "0xabc",
    });

    expect(updated.status).toBe("settled");
    expect(updated.txHash).toBe("0xabc");
    // Untouched fields carry over.
    expect(updated.grossCents).toBe(5000);
    expect(updated.campaignId).toBe("pcrf");
  });

  it("does not mutate the original record on update (immutability)", () => {
    inMemorySessionStore.put(SESSION);

    const updated = inMemorySessionStore.update(SESSION.id, {
      status: "settled",
    });

    // New reference, and the originally-put object is untouched.
    expect(updated).not.toBe(SESSION);
    expect(SESSION.status).toBe("created");
    // The store now holds the new record, not the old one.
    expect(inMemorySessionStore.get(SESSION.id)).toBe(updated);
  });

  it("throws when updating an unknown id", () => {
    expect(() =>
      inMemorySessionStore.update("cos_nope", { status: "settled" }),
    ).toThrow(/cos_nope/);
  });

  it("persists records across calls until reset() clears them", () => {
    inMemorySessionStore.put(SESSION);
    expect(inMemorySessionStore.get(SESSION.id)).toBeDefined();

    inMemorySessionStore.reset();
    expect(inMemorySessionStore.get(SESSION.id)).toBeUndefined();
  });
});
