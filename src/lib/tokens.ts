/**
 * Design tokens mirrored from DESIGN.md (Stripe Design System).
 *
 * Single source of truth for the inline-style hex values used by the
 * receipt atoms during the port phase. A later sprint sweeps these
 * into `tailwind.config.ts` and replaces inline styles with classes.
 */
export const colors = {
  /** Deep navy — default body text. */
  ink: "#0d253d",
  /** Helper text, captions, table labels. */
  inkMute: "#64748d",
  /** 1px borders on cards and tables. */
  hairline: "#e3e8ee",
  /** Brand indigo — CTA + link emphasis. */
  primary: "#533afd",
  /** Default page background. */
  canvas: "#ffffff",
  /** Dark navy fill — used on fee stage indicators. */
  inkDark: "#1c1e54",
  /** Steel blue — dashed borders / inactive accents. */
  steel: "#a8c3de",
  /** Subtle off-white card surface. */
  surfaceMute: "#fafbfc",
  /** Lighter hairline — inactive card borders. */
  hairlineMute: "#eef2f6",
  /** Pale tint — fee-on-hover overlay background. */
  surfaceTint: "#f6f9fc",
  /** Deep ink — fee tooltip foreground. */
  inkDeep: "#273951",
} as const;

export type ColorToken = keyof typeof colors;
