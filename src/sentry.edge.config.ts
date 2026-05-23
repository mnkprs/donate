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
import { scrubSentryEvent, scrubSentryBreadcrumb } from "@/lib/sentry/scrubPii";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  // Defense-in-depth: strip Stripe session ids, wallet addresses, tx hashes,
  // and emails from event payloads before they leave the process (#29).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSend: scrubSentryEvent as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeBreadcrumb: scrubSentryBreadcrumb as any,
});
