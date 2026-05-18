import type { ReactNode } from "react";

import { colors } from "@/lib/tokens";

interface NumProps {
  children: ReactNode;
  size?: number;
  weight?: number;
  color?: string;
  /** CSS letter-spacing — kept as a token so the tabular numerals align. */
  track?: string;
}

export function Num({
  children,
  size = 14,
  weight = 400,
  color = colors.ink,
  track = "-0.42px",
}: NumProps) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing: track,
        fontFeatureSettings: '"tnum","ss01"',
      }}
    >
      {children}
    </span>
  );
}
