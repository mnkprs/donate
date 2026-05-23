/**
 * Baseline HTTP security headers applied to every response (security review L2).
 *
 * The egress-independent headers below (HSTS, X-CTO, X-Frame, Referrer,
 * Permissions) depend on no origins and cannot break the app, so `next.config.ts`
 * `headers()` applies them to every route unconditionally.
 *
 * The Content-Security-Policy is the egress-DEPENDENT half (Epic 7, step 1D). It
 * is built per-request in `src/proxy.ts` via `buildCsp(nonce)` rather than here,
 * because it needs a fresh nonce on every request. The host allowlist lives in
 * this module (`buildCsp`) so it is unit-testable and the proxy stays thin.
 *
 * Egress audit (sources: S = static codebase analysis, L = live Playwright pass,
 * K = documented SDK known-list included defensively):
 *   - Base RPC (connect-src): `NEXT_PUBLIC_BASE_RPC_URL` /
 *     `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` (S — src/lib/wagmi.ts, publicClient.ts),
 *     default `https://mainnet.base.org` / `https://sepolia.base.org` (S — env example).
 *     No WalletConnect connector is configured, so NO WC relay/explorer hosts (S).
 *   - Stripe (script-src + frame-src + connect-src): js.stripe.com,
 *     crypto-js.stripe.com, api.stripe.com, crypto-api.stripe.com, *.stripe.com (K).
 *     Session creation is server-side (S — src/lib/onramp/stripe.ts); the onramp
 *     redirect is a full-page navigation to crypto.link.com (S — submitDonation.ts),
 *     but Stripe's onramp UI also loads its own scripts/iframes, so the documented
 *     hosts are included rather than dropped.
 *   - Endaoment (connect-src): api.endaoment.org (S/K — src/lib/endaoment/api.ts).
 *   - Vercel Analytics: va.vercel-scripts.com (script-src),
 *     vitals.vercel-insights.com (connect-src) (S — <Analytics/> in layout.tsx + K).
 *   - Sentry ingest (connect-src): *.ingest.sentry.io, *.ingest.us.sentry.io (K —
 *     the DSN host the SDK posts to; no tunnel route configured, so the wildcards
 *     cover the as-shipped ingest).
 *   - Fonts: next/font/google self-hosts Geist at build time, so NO
 *     fonts.googleapis.com / fonts.gstatic.com egress — `font-src 'self'` suffices (S).
 */

export interface SecurityHeader {
  readonly key: string;
  readonly value: string;
}

/** Two years; the duration the HSTS preload list expects. */
const HSTS_MAX_AGE_SECONDS = 63_072_000;

export const SECURITY_HEADERS: readonly SecurityHeader[] = [
  // Force HTTPS for this host + subdomains; `preload` opts into browser presets.
  {
    key: "Strict-Transport-Security",
    value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains; preload`,
  },
  // Refuse to reinterpret a response as a different MIME type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No framing anywhere — the donate flow is never meant to be embedded.
  { key: "X-Frame-Options", value: "DENY" },
  // Send origin (not full path/query) on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop access to powerful device features the app never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
] as const;

/** The header list to spread into a Next.js route header descriptor. */
export function securityHeaders(): readonly SecurityHeader[] {
  return SECURITY_HEADERS;
}

// ───────────────────────────────────────────────────────────────────────────
// Content-Security-Policy (Epic 7, step 1D)
// ───────────────────────────────────────────────────────────────────────────

/** Default Base RPC origins when the env vars are unset (matches env example). */
const DEFAULT_BASE_RPC_ORIGIN = "https://mainnet.base.org";
const DEFAULT_BASE_SEPOLIA_RPC_ORIGIN = "https://sepolia.base.org";

/** Stripe hosts that serve onramp scripts (script-src) and iframes (frame-src). */
const STRIPE_FRAME_AND_SCRIPT_HOSTS = [
  "https://js.stripe.com",
  "https://crypto-js.stripe.com",
] as const;

/** Stripe hosts the browser talks to over XHR/fetch (connect-src). */
const STRIPE_CONNECT_HOSTS = [
  "https://api.stripe.com",
  "https://crypto-api.stripe.com",
  // Catch-all for Stripe's many onramp subdomains so a renamed beta host can
  // never silently break the flow in production (security risk R1).
  "https://*.stripe.com",
] as const;

/** Vercel Analytics: script host + the vitals ingest host it posts to. */
const VERCEL_SCRIPT_HOST = "https://va.vercel-scripts.com";
const VERCEL_CONNECT_HOST = "https://vitals.vercel-insights.com";

/** Endaoment REST API origin (server fetch, but allowlisted defensively). */
const ENDAOMENT_CONNECT_HOST = "https://api.endaoment.org";

/** Sentry DSN ingest wildcards — the hosts the browser SDK posts events to. */
const SENTRY_CONNECT_HOSTS = [
  "https://*.ingest.sentry.io",
  "https://*.ingest.us.sentry.io",
] as const;

/**
 * Reduce a full RPC URL to its `scheme://host[:port]` origin for CSP. Returns
 * `null` when the value is unset or unparseable so a malformed env var simply
 * falls back to the documented default rather than emitting a broken source.
 */
function rpcOrigin(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

/**
 * The Base RPC origins to allow in `connect-src`: the configured mainnet and
 * sepolia hosts, falling back to the public `*.base.org` defaults when unset.
 * Deduplicated so a single shared endpoint is not listed twice.
 */
export function baseRpcConnectHosts(
  env: {
    NEXT_PUBLIC_BASE_RPC_URL?: string;
    NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL?: string;
  } = {
    NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
    NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL:
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
  },
): readonly string[] {
  const mainnet = rpcOrigin(env.NEXT_PUBLIC_BASE_RPC_URL) ?? DEFAULT_BASE_RPC_ORIGIN;
  const sepolia =
    rpcOrigin(env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL) ??
    DEFAULT_BASE_SEPOLIA_RPC_ORIGIN;
  return Array.from(new Set([mainnet, sepolia]));
}

/**
 * Build the per-request Content-Security-Policy string from the audited host
 * allowlist. The caller (middleware) supplies a fresh nonce per request; Next.js
 * reads the `'nonce-…'` token from this header and injects the same nonce into
 * its own framework/bundle scripts during SSR.
 *
 * Concessions, by design:
 *   - `style-src 'self' 'unsafe-inline'` — Next.js and Tailwind inject inline
 *     `<style>`/`style=` content that cannot be nonced practically, so inline
 *     styles are permitted. Styles are a far weaker XSS vector than scripts.
 *   - No `'strict-dynamic'` — it makes the explicit host allowlist inert, but the
 *     audited Stripe/Vercel script hosts must remain enforceable, so the policy
 *     uses nonce + host allowlist instead (verified live with zero violations).
 *   - `img-src` allows `https:` broadly so Endaoment/charity logos from any TLS
 *     origin render; images are not a script-execution vector.
 *
 * @param nonce  Opaque per-request nonce (already base64/hex encoded).
 * @param env    Optional env override (for tests); defaults to process.env.
 */
export function buildCsp(
  nonce: string,
  env?: {
    NEXT_PUBLIC_BASE_RPC_URL?: string;
    NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL?: string;
  },
): string {
  const rpcHosts = baseRpcConnectHosts(env);

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    ...STRIPE_FRAME_AND_SCRIPT_HOSTS,
    VERCEL_SCRIPT_HOST,
  ];

  const connectSrc = [
    "'self'",
    ...rpcHosts,
    ...STRIPE_CONNECT_HOSTS,
    ENDAOMENT_CONNECT_HOST,
    VERCEL_CONNECT_HOST,
    ...SENTRY_CONNECT_HOSTS,
  ];

  const frameSrc = ["'self'", ...STRIPE_FRAME_AND_SCRIPT_HOSTS];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src ${frameSrc.join(" ")}`,
    "img-src 'self' data: https:",
    "font-src 'self'",
    // Inline styles permitted — see concession note above.
    "style-src 'self' 'unsafe-inline'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // form-action does NOT fall back to default-src, so it must be set
    // explicitly — otherwise an injected <form action="https://evil"> would
    // be free to exfiltrate POST data despite the rest of the policy.
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}
