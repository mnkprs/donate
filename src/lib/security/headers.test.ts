import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, securityHeaders } from "./headers";

/**
 * The header policy is egress-independent on purpose: no CSP this pass. A strict
 * `connect-src` would have to enumerate the env-driven RPC host
 * (`NEXT_PUBLIC_BASE_RPC_URL`) + Stripe redirect host, and getting it wrong
 * silently breaks wallet calls in prod — so CSP is deferred to a follow-up after
 * auditing the loaded page (security review L2).
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

  it("does NOT set a Content-Security-Policy this pass (deferred — see module doc)", () => {
    expect(headerMap().has("Content-Security-Policy")).toBe(false);
  });
});
