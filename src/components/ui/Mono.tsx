import type { ReactNode } from "react";

import { colors } from "@/lib/tokens";

interface MonoProps {
  children: ReactNode;
  size?: number;
  color?: string;
}

export function Mono({ children, size = 13, color = colors.ink }: MonoProps) {
  return (
    <span
      style={{
        fontFamily:
          '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
        fontSize: size,
        fontWeight: 400,
        color,
        letterSpacing: "-0.2px",
        fontFeatureSettings: '"tnum","ss01"',
      }}
    >
      {children}
    </span>
  );
}
