/**
 * Next.js instrumentation entrypoint (Epic 7, step 1B).
 *
 * Next 16 App Router loads this module once per runtime at startup and calls
 * `register()`. We lazily import the matching Sentry init so the Node SDK never
 * loads in the edge bundle and vice-versa.
 *
 * `onRequestError` is Next's hook for unhandled errors in Server Components,
 * route handlers, middleware, and the like; `Sentry.captureRequestError`
 * forwards them. With no DSN configured the underlying SDK is a no-op.
 */

import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture unhandled errors from Server Components, route handlers, and
// middleware. No-op when the SDK has no DSN.
export const onRequestError = Sentry.captureRequestError;
