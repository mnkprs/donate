/**
 * Sentry edge-runtime initialization (Epic 7, step 1B).
 *
 * Loaded by `src/instrumentation.ts` only when `NEXT_RUNTIME === "edge"`
 * (middleware and edge route handlers run here).
 *
 * Same guarantees as the server config: a missing/empty `SENTRY_DSN` makes the
 * SDK a no-op, and error-capture-only config keeps donor PII out of payloads.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
