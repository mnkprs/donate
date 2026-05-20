/**
 * GET /api/onramp/status/[sessionId] — read the current on-ramp session state.
 *
 * Pipeline (Epic 3, Phase 6):
 *   1. Resolve the dynamic `sessionId` route param.
 *   2. Look it up in the session store.
 *   3. Unknown id → 404 with a typed `not_found` envelope.
 *   4. Known id  → 200 with a NARROW public projection.
 *
 * A `sessionId` is an unauthenticated, guessable capability handle (the same
 * boundary the Phase 4 idempotency hardening drew, commit 6e1e34c), so this
 * route returns `OnrampStatusResponse` — never the raw `OnrampSession`, which
 * holds the Stripe `clientSecret` and donor PII. The response is `no-store`
 * because it is user-specific and polled.
 *
 * The pure handler takes its store injected so it is unit-testable without the
 * Next runtime; `GET` wires the process-global singleton.
 */

import {
  inMemorySessionStore,
  type SessionStore,
} from "@/lib/onramp/session-store";
import type {
  OnrampErrorBody,
  OnrampErrorCode,
  OnrampSession,
  OnrampStatusResponse,
} from "@/types/onramp";

export interface GetStatusDeps {
  readonly store: SessionStore;
}

/** Status responses are user-specific and polled — never cache them. */
const NO_STORE_HEADERS = { "cache-control": "no-store" } as const;

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

function errorResponse(
  code: OnrampErrorCode,
  message: string,
  status: number,
): Response {
  const body: OnrampErrorBody = { error: { code, message } };
  return jsonResponse(body, status);
}

/**
 * Narrow the stored session to the public projection. `txHash` is spread in
 * only when present (a settled session), so a non-settled status omits the key
 * entirely rather than serializing `null`.
 */
function toStatusResponse(session: OnrampSession): OnrampStatusResponse {
  const base: OnrampStatusResponse = {
    sessionId: session.id,
    status: session.status,
    campaignId: session.campaignId,
    grossCents: session.grossCents,
  };
  return session.txHash !== undefined
    ? { ...base, txHash: session.txHash }
    : base;
}

export async function handleGetStatus(
  params: Promise<{ sessionId: string }>,
  deps: GetStatusDeps,
): Promise<Response> {
  const { sessionId } = await params;

  const session = deps.store.get(sessionId);
  if (!session) {
    return errorResponse("not_found", "On-ramp session not found", 404);
  }

  return jsonResponse(toStatusResponse(session), 200);
}

export function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  return handleGetStatus(context.params, { store: inMemorySessionStore });
}
