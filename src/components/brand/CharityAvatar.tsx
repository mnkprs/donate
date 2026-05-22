import { colors } from "@/lib/tokens";

interface CharityAvatarProps {
  /** 1–2 letter charity initials, e.g. "PC". */
  initials: string;
  /** Square size in px. ≤32 renders a circle; larger renders a rounded square. */
  size?: number;
}

/**
 * Gradient-fill initial chip used in hero anchors and summary rows. Decorative:
 * the charity name always renders adjacent, so this is `aria-hidden`.
 */
export function CharityAvatar({ initials, size = 28 }: CharityAvatarProps) {
  const isCircle = size <= 32;
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: isCircle ? 9999 : 12,
        background: `linear-gradient(135deg, ${colors.inkDark} 0%, ${colors.primary} 100%)`,
        color: colors.canvas,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: isCircle ? 11 : size * 0.32,
        fontWeight: 400,
        letterSpacing: "0.05em",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
