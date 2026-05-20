import { describe, expect, it } from "vitest";
import type { DestinationStream } from "pino";
import { createLogger, REDACTED_KEYS } from "./logger";

/**
 * Captures pino output without touching real stdout: pino serializes each
 * record to a JSON string and calls `write`, so we parse those strings back
 * into objects to assert on structured fields.
 */
function captureSink(): {
  readonly records: Record<string, unknown>[];
  readonly stream: DestinationStream;
} {
  const records: Record<string, unknown>[] = [];
  const stream: DestinationStream = {
    write(line: string) {
      records.push(JSON.parse(line) as Record<string, unknown>);
    },
  };
  return { records, stream };
}

describe("createLogger()", () => {
  it("emits a structured JSON record at the requested level", () => {
    const { records, stream } = captureSink();
    const log = createLogger(stream);

    log.error({ scope: "onramp/session" }, "Stripe session creation failed");

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: 50, // pino numeric level for `error`
      scope: "onramp/session",
      msg: "Stripe session creation failed",
    });
  });

  it("separates levels: info is distinct from error", () => {
    const { records, stream } = captureSink();
    const log = createLogger(stream);

    log.info({ scope: "onramp/session" }, "session created");

    expect(records[0]).toMatchObject({ level: 30, msg: "session created" });
  });

  it("redacts every secret-shaped top-level key", () => {
    const { records, stream } = captureSink();
    const log = createLogger(stream);

    log.info(
      {
        STRIPE_SECRET_KEY: "sk_live_supersecret",
        STRIPE_ONRAMP_WEBHOOK_SECRET: "whsec_supersecret",
        KV_REST_API_TOKEN: "tok_supersecret",
        authorization: "Bearer raw_token",
        clientSecret: "cos_secret_abc",
      },
      "config loaded",
    );

    const record = records[0];
    for (const key of REDACTED_KEYS) {
      expect(record[key]).toBe("[REDACTED]");
    }
  });

  it("redacts secret-shaped keys nested one level deep", () => {
    const { records, stream } = captureSink();
    const log = createLogger(stream);

    log.error(
      { env: { KV_REST_API_TOKEN: "tok_raw_secret" } },
      "kv write failed",
    );

    const env = records[0].env as Record<string, unknown>;
    expect(env.KV_REST_API_TOKEN).toBe("[REDACTED]");
  });

  it("never serializes a raw secret value placed under a redacted key", () => {
    const { records, stream } = captureSink();
    const log = createLogger(stream);

    log.error(
      { STRIPE_SECRET_KEY: "sk_live_NEVER_LEAK_THIS" },
      "provider error",
    );

    expect(JSON.stringify(records[0])).not.toContain("sk_live_NEVER_LEAK_THIS");
  });

  it("serializes an Error passed under `err` into type/message without throwing", () => {
    const { records, stream } = captureSink();
    const log = createLogger(stream);

    log.error({ err: new Error("upstream boom") }, "Stripe call failed");

    const err = records[0].err as Record<string, unknown>;
    expect(err.type).toBe("Error");
    expect(err.message).toBe("upstream boom");
  });
});
