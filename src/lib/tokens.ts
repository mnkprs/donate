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
  /** Helper text, captions, table labels. Darkened from #64748d to clear WCAG AA 4.5:1 on tint (#f6f9fc) surfaces. */
  inkMute: "#56627a",
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
  /** Iris hover state — primary CTA :hover / :active fill. */
  irisHover: "#4434d4",
  /** Iris pressed — eyebrow text on iris-tinted pills (in-flight tracker). */
  irisPress: "#2e2b8c",
  /** Iris wash — status-pill background on the live tracker. */
  irisBg: "#eef0fe",
  /** Lighter urgent — failure card borders (in-flight tracker). */
  urgentSoft: "#f4cfcf",
  /** Urgent wash — failure error-strip background. */
  urgentBg: "#fbecec",
  /** Cream band background — warm accent for editorial sections. */
  cream: "#f5e9d4",
  /** Urgent red — used sparingly for time-sensitive campaign badges. */
  urgent: "#c14040",
} as const;

export type ColorToken = keyof typeof colors;
