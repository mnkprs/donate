/**
 * POST /api/onramp/session — create a Stripe Crypto Onramp session.
 *
 * Pipeline (Epic 3, Phase 4):
 *   1. Short-circuit idempotent retries (by `x-client-request-id`) BEFORE
 *      touching the body — a completed operation ignores its new payload.
 *   2. Parse + Zod-validate the CheckoutPayload body  → 400 on failure.
 *   3. Call Stripe via `createOnrampSession`           → 502 on failure.
 *   4. Persist the session + index the idempotency key.
 *   5. Return the narrow `{ sessionId, redirectUrl }` the client needs.
 *
 * The pure handler takes its deps injected so it is unit-testable without the
 * Next runtime; `POST` wires the process-global singletons + real env.
 */

import { z } from "zod";
import { serverEnv, type ServerEnv } from "@/lib/env/server";
import { createOnrampSession } from "@/lib/onramp/stripe";
import {
  inMemorySessionStore,
  type SessionStore,
} from "@/lib/onramp/session-store";
import type {
  CreateSessionInput,
  OnrampErrorBody,
  OnrampErrorCode,
  OnrampSession,
  OnrampSessionResponse,
} from "@/types/onramp";

/** Client-supplied idempotency key. A retry with the same value is a no-op. */
export const CLIENT_REQUEST_ID_HEADER = "x-client-request-id";

/** Mirrors `CheckoutPayload`; `note` is accepted but not forwarded to Stripe. */
const createSessionBodySchema = z.object({
  campaignId: z.string().trim().min(1),
  grossCents: z.number().int().positive(),
  email: z.string().trim().email(),
  note: z.string().optional(),
});

export interface CreateSessionDeps {
  readonly env: ServerEnv;
  readonly store: SessionStore;
  /** Maps `clientRequestId` → persisted `session.id` for retry detection. */
  readonly idempotency: Map<string, string>;
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

function errorResponse(
  code: OnrampErrorCode,
  message: string,
  status: number,
): Response {
  const body: OnrampErrorBody = { error: { code, message } };
  return jsonResponse(body, status);
}

function toResponse(session: OnrampSession): OnrampSessionResponse {
  return { sessionId: session.id, redirectUrl: session.redirectUrl };
}

export async function handleCreateSession(
  request: Request,
  deps: CreateSessionDeps,
): Promise<Response> {
  const { env, store, idempotency } = deps;

  // 1. Idempotent-retry short-circuit — must precede body parsing.
  const clientRequestId = request.headers.get(CLIENT_REQUEST_ID_HEADER);
  if (clientRequestId) {
    const existingId = idempotency.get(clientRequestId);
    const existing = existingId ? store.get(existingId) : undefined;
    if (existing) {
      return jsonResponse(toResponse(existing), 200);
    }
    // Dangling index (key known but session gone): fall through and recreate.
  }

  // 2. Parse + validate the donor's checkout payload.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(
      "invalid_request",
      "Request body must be valid JSON",
      400,
    );
  }

  const parsed = createSessionBodySchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid request",
      400,
    );
  }

  const input: CreateSessionInput = {
    campaignId: parsed.data.campaignId,
    grossCents: parsed.data.grossCents,
    email: parsed.data.email,
  };

  // 3. Call Stripe. Any failure here is upstream, not the donor's fault → 502.
  let session: OnrampSession;
  try {
    session = await createOnrampSession(input, env);
  } catch {
    return errorResponse(
      "provider_error",
      "Unable to create on-ramp session with the payment provider",
      502,
    );
  }

  // 4. Persist + index for idempotency (only after a confirmed success).
  store.put(session);
  if (clientRequestId) {
    idempotency.set(clientRequestId, session.id);
  }

  // 5. Return the narrow client contract.
  return jsonResponse(toResponse(session), 200);
}

/** Process-global idempotency index, paired with the singleton session store. */
const sessionIdempotencyIndex = new Map<string, string>();

export function POST(request: Request): Promise<Response> {
  return handleCreateSession(request, {
    env: serverEnv(),
    store: inMemorySessionStore,
    idempotency: sessionIdempotencyIndex,
  });
}
