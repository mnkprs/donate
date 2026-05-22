import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { colors } from "@/lib/tokens";

describe("design tokens — JS source (tokens.ts)", () => {
  test("exposes existing receipt-era tokens unchanged", () => {
    expect(colors.ink).toBe("#0d253d");
    expect(colors.primary).toBe("#533afd");
    expect(colors.inkMute).toBe("#56627a");
    expect(colors.hairline).toBe("#e3e8ee");
  });

  test("exposes new landing-page tokens added in Phase 3", () => {
    expect(colors.irisHover).toBe("#4434d4");
    expect(colors.cream).toBe("#f5e9d4");
    expect(colors.urgent).toBe("#c14040");
  });

  test("exposes in-flight tracker tokens added in Epic 5", () => {
    expect(colors.irisPress).toBe("#2e2b8c");
    expect(colors.irisBg).toBe("#eef0fe");
    expect(colors.urgentSoft).toBe("#f4cfcf");
    expect(colors.urgentBg).toBe("#fbecec");
  });

  test("all hex values are 6-digit lowercase", () => {
    const hexPattern = /^#[0-9a-f]{6}$/;
    for (const [name, value] of Object.entries(colors)) {
      expect(value, `${name} must be 6-digit lowercase hex`).toMatch(hexPattern);
    }
  });
});

describe("design tokens — CSS source (globals.css @theme)", () => {
  const css = readFileSync(
    resolve(__dirname, "../app/globals.css"),
    "utf8",
  );

  test("declares an @theme block with semantic color variables", () => {
    expect(css).toMatch(/@theme\s*\{[\s\S]*--color-iris:\s*#533afd/);
    expect(css).toMatch(/--color-iris-hover:\s*#4434d4/);
    expect(css).toMatch(/--color-ink:\s*#0d253d/);
    expect(css).toMatch(/--color-mute:\s*#56627a/);
    expect(css).toMatch(/--color-rule:\s*#e3e8ee/);
    expect(css).toMatch(/--color-cream:\s*#f5e9d4/);
    expect(css).toMatch(/--color-tint:\s*#f6f9fc/);
    expect(css).toMatch(/--color-urgent:\s*#c14040/);
  });

  test("declares the in-flight tracker keyframes (Epic 5)", () => {
    expect(css).toMatch(/@keyframes\s+euda-pulse/);
    expect(css).toMatch(/@keyframes\s+euda-dot-pulse/);
    expect(css).toMatch(/@keyframes\s+euda-skel/);
  });

  test("CSS tokens stay in sync with JS tokens for shared values", () => {
    const extract = (name: string): string | null => {
      const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`));
      return match ? match[1] : null;
    };
    expect(extract("ink")).toBe(colors.ink);
    expect(extract("iris")).toBe(colors.primary);
    expect(extract("iris-hover")).toBe(colors.irisHover);
    expect(extract("mute")).toBe(colors.inkMute);
    expect(extract("rule")).toBe(colors.hairline);
    expect(extract("cream")).toBe(colors.cream);
    expect(extract("urgent")).toBe(colors.urgent);
  });
});
