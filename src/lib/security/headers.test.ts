import { describe, expect, it } from "vitest";
import {
  SECURITY_HEADERS,
  baseRpcConnectHosts,
  buildCsp,
  securityHeaders,
} from "./headers";

/**
 * `securityHeaders()` carries the egress-INDEPENDENT headers (HSTS, X-CTO, etc.).
 * The egress-DEPENDENT Content-Security-Policy is built per-request by `buildCsp`
 * (consumed by src/middleware.ts), so it is intentionally absent from this static
 * list — that separation is asserted below.
 */
describe("securityHeaders()", () => {
  function headerMap(): Map<string, string> {
    return new Map(securityHeaders().map((h) => [h.key, h.value]));
  }

  it("sets HSTS with a long max-age, subdomains, and preload", () => {
    const value = headerMap().get("Strict-Transport-Security");
    expect(value).toMatch(/max-age=\d{7,}/); // >= ~4 months
    expect(value).toContain("includeSubDomains");
    expect(value).toContain("preload");
  });

  it("disables MIME sniffing", () => {
    expect(headerMap().get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("forbids framing (clickjacking defense)", () => {
    expect(headerMap().get("X-Frame-Options")).toBe("DENY");
  });

  it("sets a privacy-preserving Referrer-Policy", () => {
    expect(headerMap().get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("locks down powerful features via Permissions-Policy", () => {
    const value = headerMap().get("Permissions-Policy");
    expect(value).toContain("camera=()");
    expect(value).toContain("microphone=()");
    expect(value).toContain("geolocation=()");
  });

  it("exposes the same list as the SECURITY_HEADERS constant", () => {
    expect(securityHeaders()).toEqual(SECURITY_HEADERS);
  });

  it("does NOT set a Content-Security-Policy in the static list (CSP is per-request in middleware)", () => {
    expect(headerMap().has("Content-Security-Policy")).toBe(false);
  });
});

/**
 * The CSP host allowlist is the security-critical surface: a host missing from
 * connect-src / script-src / frame-src silently breaks wallet RPC, the Stripe
 * onramp, or Endaoment in production (risk R1). These tests pin every audited
 * host to its directive so a regression is caught at build time, not in prod.
 */
describe("buildCsp()", () => {
  const NONCE = "test-nonce-AbC123==";

  /** Parse the CSP string into { directiveName: [sources...] }. */
  function directives(csp: string): Map<string, string[]> {
    return new Map(
      csp
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => {
          const [name, ...sources] = d.split(/\s+/);
          return [name, sources] as const;
        }),
    );
  }

  it("embeds the per-request nonce in script-src", () => {
    const csp = buildCsp(NONCE);
    expect(csp).toContain(`'nonce-${NONCE}'`);
    expect(directives(csp).get("script-src")).toContain(`'nonce-${NONCE}'`);
  });

  it("locks down default-src, object-src, base-uri, framing, and form-action", () => {
    const d = directives(buildCsp(NONCE));
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    // form-action does not inherit from default-src; must be explicit.
    expect(d.get("form-action")).toEqual(["'self'"]);
  });

  it("includes upgrade-insecure-requests", () => {
    expect(buildCsp(NONCE)).toContain("upgrade-insecure-requests");
  });

  it("permits inline styles (Next/Tailwind concession) and self images/fonts", () => {
    const d = directives(buildCsp(NONCE));
    expect(d.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get("img-src")).toEqual(["'self'", "data:", "https:"]);
    expect(d.get("font-src")).toEqual(["'self'"]);
  });

  it("does NOT use strict-dynamic (host allowlist must stay enforceable)", () => {
    expect(buildCsp(NONCE)).not.toContain("strict-dynamic");
  });

  it("allows the Stripe script + frame hosts in script-src and frame-src", () => {
    const d = directives(buildCsp(NONCE));
    for (const host of ["https://js.stripe.com", "https://crypto-js.stripe.com"]) {
      expect(d.get("script-src")).toContain(host);
      expect(d.get("frame-src")).toContain(host);
    }
  });

  it("allows the Stripe API hosts in connect-src", () => {
    const connect = directives(buildCsp(NONCE)).get("connect-src") ?? [];
    expect(connect).toContain("https://api.stripe.com");
    expect(connect).toContain("https://crypto-api.stripe.com");
    expect(connect).toContain("https://*.stripe.com");
  });

  it("allows the Endaoment API host in connect-src", () => {
    expect(directives(buildCsp(NONCE)).get("connect-src")).toContain(
      "https://api.endaoment.org",
    );
  });

  it("allows the Vercel Analytics script + vitals ingest hosts", () => {
    const d = directives(buildCsp(NONCE));
    expect(d.get("script-src")).toContain("https://va.vercel-scripts.com");
    expect(d.get("connect-src")).toContain("https://vitals.vercel-insights.com");
  });

  it("allows the Sentry ingest wildcards in connect-src", () => {
    const connect = directives(buildCsp(NONCE)).get("connect-src") ?? [];
    expect(connect).toContain("https://*.ingest.sentry.io");
    expect(connect).toContain("https://*.ingest.us.sentry.io");
  });

  it("includes the configured Base RPC hosts in connect-src", () => {
    const csp = buildCsp(NONCE, {
      NEXT_PUBLIC_BASE_RPC_URL: "https://base-mainnet.g.alchemy.com/v2/key",
      NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: "https://sepolia.base.org",
    });
    const connect = directives(csp).get("connect-src") ?? [];
    // Origin only — the path/key is stripped.
    expect(connect).toContain("https://base-mainnet.g.alchemy.com");
    expect(connect).toContain("https://sepolia.base.org");
    expect(connect).not.toContain("https://base-mainnet.g.alchemy.com/v2/key");
  });

  it("falls back to the public *.base.org RPC origins when env is unset", () => {
    const hosts = baseRpcConnectHosts({});
    expect(hosts).toContain("https://mainnet.base.org");
    expect(hosts).toContain("https://sepolia.base.org");
  });

  it("falls back to defaults when an RPC URL is malformed", () => {
    const hosts = baseRpcConnectHosts({
      NEXT_PUBLIC_BASE_RPC_URL: "not a url",
      NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: undefined,
    });
    expect(hosts).toContain("https://mainnet.base.org");
    expect(hosts).toContain("https://sepolia.base.org");
  });

  it("deduplicates a shared RPC endpoint", () => {
    const hosts = baseRpcConnectHosts({
      NEXT_PUBLIC_BASE_RPC_URL: "https://shared.example.com/rpc",
      NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: "https://shared.example.com/rpc",
    });
    expect(hosts).toEqual(["https://shared.example.com"]);
  });
});
