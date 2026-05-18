import { colors } from "@/lib/tokens";

interface PhiMarkProps {
  size?: number;
  color?: string;
}

/**
 * Philotimo monogram — stylized φ inside a thin circle, hand-set to feel
 * like a wall-label monogram rather than a logo lockup.
 */
export function PhiMark({ size = 22, color = colors.ink }: PhiMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      aria-label="Philotimo"
    >
      <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1" />
      <line x1="11" y1="3.5" x2="11" y2="18.5" stroke={color} strokeWidth="1" />
      <ellipse
        cx="11"
        cy="11"
        rx="4.2"
        ry="3.2"
        stroke={color}
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}
