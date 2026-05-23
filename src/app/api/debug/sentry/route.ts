/**
 * GET /api/debug/sentry — deliberate test-error trigger (Epic 7, step 1B).
 *
 * Satisfies the acceptance criterion "Sentry receiving events from a deliberate
 * test error". Hitting this route explicitly captures an error, flushes it to
 * Sentry, then throws so the global `onRequestError` instrumentation also fires.
 *
 * Guarded: returns 404 in production unless `SENTRY_DEBUG_ROUTE_ENABLED` is set
 * to `"true"`, so it can never be an accidental error source in prod. With no
 * DSN configured the capture/flush are no-ops and only the throw is observable.
 */

import * as Sentry from "@sentry/nextjs";

/** Always run on the Node runtime so the server SDK init applies. */
export const runtime = "nodejs";
/** Never cache or statically optimize a route whose whole job is to throw. */
export const dynamic = "force-dynamic";

function isEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.SENTRY_DEBUG_ROUTE_ENABLED === "true"
  );
}

export async function GET(): Promise<Response> {
  if (!isEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const error = new Error("Sentry debug route: deliberate test error");

  // Explicit capture (no PII) + flush so the event is sent even though the
  // request is about to terminate with a throw.
  Sentry.captureException(error);
  await Sentry.flush(2000);

  throw error;
}
