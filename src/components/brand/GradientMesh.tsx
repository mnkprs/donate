interface GradientMeshProps {
  /** Backdrop height in px. */
  height?: number;
  /** Overall opacity (calmer surfaces dial this down, e.g. 0.85). */
  opacity?: number;
}

/**
 * Atmospheric gradient-mesh backdrop for the top third of a surface. Purely
 * decorative — absolutely positioned behind content, `aria-hidden`, and
 * non-interactive. Blurred radial blobs in cream / iris / accent-pink.
 */
export function GradientMesh({ height = 520, opacity = 1 }: GradientMeshProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: "-200px -200px auto -200px",
        height,
        background:
          "radial-gradient(60% 80% at 20% 30%, rgba(245,233,212,0.55), transparent 60%), radial-gradient(50% 70% at 80% 20%, rgba(249,107,238,0.10), transparent 60%), radial-gradient(60% 80% at 60% 40%, rgba(83,58,253,0.10), transparent 65%)",
        filter: "blur(40px)",
        pointerEvents: "none",
        zIndex: 0,
        opacity,
      }}
    />
  );
}
