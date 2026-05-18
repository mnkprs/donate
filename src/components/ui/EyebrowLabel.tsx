import type { ReactNode } from "react";

import { colors } from "@/lib/tokens";

interface EyebrowLabelProps {
  children: ReactNode;
  color?: string;
}

export function EyebrowLabel({
  children,
  color = colors.inkMute,
}: EyebrowLabelProps) {
  return (
    <div
      style={{
        textTransform: "uppercase",
        fontSize: 10,
        letterSpacing: "0.12em",
        fontWeight: 400,
        color,
        fontFeatureSettings: '"ss01"',
      }}
    >
      {children}
    </div>
  );
}
