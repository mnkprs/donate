import { PhiMark } from "@/components/brand/PhiMark";
import { colors } from "@/lib/tokens";

interface WordmarkProps {
  size?: number;
  color?: string;
}

export function Wordmark({ size = 16, color = colors.ink }: WordmarkProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color }}>
      <PhiMark size={size + 6} color={color} />
      <span
        style={{
          fontSize: size,
          fontWeight: 300,
          letterSpacing: "-0.2px",
          fontFeatureSettings: '"ss01"',
          color,
        }}
      >
        Philotimo
      </span>
    </div>
  );
}
