/**
 * Sentry client (browser) initialization (Epic 7, step 1B).
 *
 * Next 16 App Router loads `instrumentation-client.ts` in the browser before
 * the app hydrates (the modern replacement for `sentry.client.config.ts`).
 *
 * Safe no-op without a DSN: when `NEXT_PUBLIC_SENTRY_DSN` is unset/empty the
 * SDK initializes but transmits nothing, so local and preview builds work
 * without a real DSN.
 *
 * Error-capture only — no session replay, no tracing — and `sendDefaultPii`
 * stays `false` so user IP/headers are never collected.
 */

import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, scrubSentryBreadcrumb } from "@/lib/sentry/scrubPii";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  // Defense-in-depth: strip Stripe session ids, wallet addresses, tx hashes,
  // and emails from event payloads before they leave the browser (#29).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSend: scrubSentryEvent as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeBreadcrumb: scrubSentryBreadcrumb as any,
});

// Instruments client-side App Router navigations for error context. No-op
// without a DSN.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
