/**
 * Pure PII scrubber for Sentry event payloads (Epic 7, issue #29).
 *
 * Intentionally has NO @sentry/nextjs import — it is a plain data transformer
 * so it can be unit-tested without the Sentry SDK.
 *
 * Patterns scrubbed
 * -----------------
 * - Stripe checkout session ids : cs_test_… / cs_live_…  → "[REDACTED]"
 * - Stripe onramp session ids   : cos_test_… / cos_live_… → "[REDACTED]"
 * - Ethereum wallet addresses   : 0x + 40 hex chars → "0xABCD…WXYZ" (first 6 + last 4)
 * - Transaction hashes          : 0x + 64 hex chars → "0xABCD…WXYZ" (first 6 + last 4)
 * - Email addresses             : local@domain.tld → "[REDACTED]"
 *
 * Design decisions
 * ----------------
 * - Always returns the event (never null): returning null from Sentry's
 *   beforeSend silently drops the event, which would create blind spots in
 *   error monitoring. We redact and forward.
 * - Tx hashes are matched BEFORE wallet addresses because a tx hash (66 chars)
 *   also matches the 42-char wallet prefix — longest match wins by ordering.
 * - Wallet addresses are matched before the 0x catch-all generic hex to avoid
 *   double-substitution.
 */

const REDACTED = "[REDACTED]";

/**
 * Stripe session id patterns.
 * - cs_test_… / cs_live_… : Checkout Session IDs
 * - cos_test_… / cos_live_… : Crypto Onramp Session IDs
 */
const STRIPE_SESSION_RE =
  /\b(?:cs|cos)_(?:test|live)_[A-Za-z0-9]+/g;

/**
 * Ethereum transaction hash: 0x followed by exactly 64 hex chars (66 total).
 * Must be tested BEFORE the wallet address pattern (which is shorter).
 */
const TX_HASH_RE = /\b0x[0-9a-fA-F]{64}\b/g;

/**
 * Ethereum wallet address: 0x followed by exactly 40 hex chars (42 total).
 */
const WALLET_RE = /\b0x[0-9a-fA-F]{40}\b/g;

/**
 * Email address pattern — intentionally simple; false-positives are acceptable
 * because over-scrubbing is safer than under-scrubbing in error payloads.
 */
const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

/** Truncate a hex value to "0xABCD…WXYZ" (first 6 + last 4 chars). */
function truncateHex(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** Scrub all known PII patterns from a string value. */
function scrubString(input: string): string {
  return input
    .replace(STRIPE_SESSION_RE, REDACTED)
    .replace(TX_HASH_RE, (match) => truncateHex(match))
    .replace(WALLET_RE, (match) => truncateHex(match))
    .replace(EMAIL_RE, REDACTED);
}

/** Scrub string values inside a plain object one level deep. */
function scrubRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [
      k,
      typeof v === "string" ? scrubString(v) : v,
    ]),
  );
}

// ── Public structural types (no @sentry/nextjs dependency) ────────────────────

export interface ScrubbableExceptionValue {
  value?: string;
  [key: string]: unknown;
}

export interface ScrubbableBreadcrumb {
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ScrubbableEvent {
  message?: string;
  exception?: { values?: ScrubbableExceptionValue[] };
  request?: { url?: string; query_string?: string; [key: string]: unknown };
  tags?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, Record<string, unknown>>;
  breadcrumbs?: { values?: ScrubbableBreadcrumb[] };
  [key: string]: unknown;
}

// ── Exported scrubbers ────────────────────────────────────────────────────────

/**
 * Scrub PII from a Sentry event. Wire this as `beforeSend` in `Sentry.init`.
 *
 * Returns the (mutated) event — never null, so no events are silently dropped.
 * If `event` is null/undefined (should not happen in practice) it is returned
 * as-is so Sentry can handle the edge case itself.
 */
export function scrubSentryEvent(event: ScrubbableEvent): ScrubbableEvent | null {
  if (event == null) return null;

  // message
  if (typeof event.message === "string") {
    event.message = scrubString(event.message);
  }

  // exception.values[*].value
  if (Array.isArray(event.exception?.values)) {
    for (const ev of event.exception!.values) {
      if (typeof ev.value === "string") {
        ev.value = scrubString(ev.value);
      }
    }
  }

  // request.url and request.query_string
  if (event.request != null) {
    if (typeof event.request.url === "string") {
      event.request.url = scrubString(event.request.url);
    }
    if (typeof event.request.query_string === "string") {
      event.request.query_string = scrubString(event.request.query_string);
    }
  }

  // tags
  if (event.tags != null) {
    event.tags = scrubRecord(event.tags);
  }

  // extra
  if (event.extra != null) {
    event.extra = scrubRecord(event.extra);
  }

  // contexts (one level of nesting: contexts[name][field])
  if (event.contexts != null) {
    event.contexts = Object.fromEntries(
      Object.entries(event.contexts).map(([name, ctx]) => [
        name,
        scrubRecord(ctx),
      ]),
    );
  }

  // breadcrumbs on the event
  if (Array.isArray(event.breadcrumbs?.values)) {
    for (const crumb of event.breadcrumbs!.values) {
      if (typeof crumb.message === "string") {
        crumb.message = scrubString(crumb.message);
      }
      if (crumb.data != null) {
        crumb.data = scrubRecord(crumb.data);
      }
    }
  }

  return event;
}

/**
 * Scrub PII from a Sentry breadcrumb. Wire this as `beforeBreadcrumb` in
 * `Sentry.init`.
 *
 * Returns the (mutated) breadcrumb — never null.
 */
export function scrubSentryBreadcrumb(
  breadcrumb: ScrubbableBreadcrumb,
): ScrubbableBreadcrumb | null {
  if (breadcrumb == null) return null;

  if (typeof breadcrumb.message === "string") {
    breadcrumb.message = scrubString(breadcrumb.message);
  }

  if (breadcrumb.data != null) {
    breadcrumb.data = scrubRecord(breadcrumb.data);
  }

  return breadcrumb;
}
