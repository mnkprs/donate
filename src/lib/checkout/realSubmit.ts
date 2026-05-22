"use client";

import { CLIENT_REQUEST_ID_HEADER } from "@/lib/onramp/idempotency";
import type { CheckoutPayload } from "@/types/checkout";
import type {
  OnrampErrorBody,
  OnrampErrorCode,
  OnrampSessionResponse,
} from "@/types/onramp";

/**
 * Same-origin path of the session-create route. Exported so tests (which run in
 * a `node` env where `fetch` needs an ABSOLUTE URL) can prefix it with a base.
 */
export const SESSION_ENDPOINT = "/api/onramp/session";

/**
 * Failure taxonomy for `realSubmit`. The server's three `OnrampErrorCode`s pass
 * through untouched; two client-only codes cover the modes the server never
 * reports — see {@link OnrampError}.
 */
export type OnrampSubmitErrorCode =
  | OnrampErrorCode
  | "network_error"
  | "unexpected_response";

/**
 * Typed error thrown by {@link realSubmit}. Carries a `code` so the redirect
 * adapter (and the Epic 5 receipt UI) can branch on *why* a submit failed —
 * e.g. retry on `"network_error"`, surface the message on `"invalid_request"`.
 *
 * Extends `Error` (with an explicit prototype fix-up for transpile targets that
 * break `instanceof` on subclassed builtins) so `CheckoutForm.errorMessage()`
 * can read `.message` unchanged.
 */
export class OnrampError extends Error {
  readonly code: OnrampSubmitErrorCode;

  constructor(code: OnrampSubmitErrorCode, message: string) {
    super(message);
    this.name = "OnrampError";
    this.code = code;
    Object.setPrototypeOf(this, OnrampError.prototype);
  }
}

export interface RealSubmitOptions {
  /**
   * Origin prefixed to {@link SESSION_ENDPOINT}. Defaults to `""` — a
   * same-origin relative request in the browser. Tests inject an absolute base.
   */
  readonly baseUrl?: string;
}

/** Server-issued error codes we trust to pass straight through as `OnrampError.code`. */
const SERVER_ERROR_CODES: ReadonlySet<string> = new Set<OnrampErrorCode>([
  "invalid_request",
  "provider_error",
  "not_found",
  "rate_limited",
]);

function isOnrampErrorBody(value: unknown): value is OnrampErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const error = (value as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    typeof code === "string" &&
    SERVER_ERROR_CODES.has(code) &&
    typeof message === "string"
  );
}

function isSessionResponse(value: unknown): value is OnrampSessionResponse {
  if (typeof value !== "object" || value === null) return false;
  const { sessionId, redirectUrl } = value as {
    sessionId?: unknown;
    redirectUrl?: unknown;
  };
  return typeof sessionId === "string" && typeof redirectUrl === "string";
}

/**
 * Client → server bridge for the donation checkout. POSTs the validated
 * `CheckoutPayload` to `/api/onramp/session` and returns where to send the
 * donor next.
 *
 * Idempotency: a fresh `crypto.randomUUID()` is sent per call. The key protects
 * an in-flight retry of THIS submit attempt (e.g. a double network flush), not
 * a user-driven resubmit after a visible error — that should be a new attempt.
 *
 * @throws {OnrampError} `network_error` if `fetch` rejects (offline/DNS),
 *   `unexpected_response` for a non-envelope or malformed body, or the server's
 *   own `code` (`invalid_request` / `provider_error` / `not_found`) otherwise.
 */
export async function realSubmit(
  payload: CheckoutPayload,
  options: RealSubmitOptions = {},
): Promise<OnrampSessionResponse> {
  const url = `${options.baseUrl ?? ""}${SESSION_ENDPOINT}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [CLIENT_REQUEST_ID_HEADER]: crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new OnrampError(
      "network_error",
      "Couldn't reach the donation service. Check your connection and try again.",
    );
  }

  // Read the body exactly once; a non-JSON error page makes this throw → null.
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    if (isOnrampErrorBody(parsed)) {
      throw new OnrampError(parsed.error.code, parsed.error.message);
    }
    throw new OnrampError(
      "unexpected_response",
      `The donation service responded unexpectedly (HTTP ${response.status}).`,
    );
  }

  if (!isSessionResponse(parsed)) {
    throw new OnrampError(
      "unexpected_response",
      "The donation service returned an unrecognized response.",
    );
  }

  return { sessionId: parsed.sessionId, redirectUrl: parsed.redirectUrl };
}
