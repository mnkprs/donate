/**
 * Sentry server-runtime initialization (Epic 7, step 1B).
 *
 * Loaded by `src/instrumentation.ts` only when `NEXT_RUNTIME === "nodejs"`.
 *
 * Safe no-op without a DSN: when `SENTRY_DSN` is unset/empty, `dsn` is
 * `undefined` and the SDK initializes but transmits no events (documented
 * behavior). This keeps local dev and CI builds green without provisioning a
 * real DSN, which is human-gated.
 *
 * Error-capture only by design — no tracing, no session replay — so no donor
 * PII (email, client secret, tx hash) is ever attached to outgoing payloads.
 * `sendDefaultPii` stays `false` so request headers/IP are not collected.
 */

import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, scrubSentryBreadcrumb } from "@/lib/sentry/scrubPii";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Never attach request headers / IP / cookies. Keep PII out of payloads.
  sendDefaultPii: false,
  // Disable performance tracing — we only need error events for this epic.
  tracesSampleRate: 0,
  // Defense-in-depth: strip Stripe session ids, wallet addresses, tx hashes,
  // and emails from event payloads before they leave the process (#29).
  // Returns the scrubbed event (never null) so no errors are silently dropped.
  // Cast needed: scrubPii uses structural types to stay SDK-import-free; the
  // SDK's `Exception`/`Breadcrumb` lack the index signature but are compatible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSend: scrubSentryEvent as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeBreadcrumb: scrubSentryBreadcrumb as any,
});
