import { colors } from "@/lib/tokens";

interface StripedPlaceholderProps {
  caption: string;
  height?: number;
  tint?: string;
  accent?: string;
}

export function StripedPlaceholder({
  caption,
  height = 200,
  tint = colors.surfaceTint,
  accent = colors.hairline,
}: StripedPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={caption}
      className="relative w-full overflow-hidden rounded-xl border border-rule"
      style={{
        height,
        background: `repeating-linear-gradient(135deg, ${tint} 0 14px, ${accent}40 14px 16px)`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(180deg, transparent 40%, ${tint} 100%)`,
        }}
      />
      <span
        className="absolute bottom-3 left-3.5 inline-flex items-center gap-1.5 rounded border border-rule bg-white px-2 py-1 text-[10px]"
        style={{
          fontFamily:
            '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
          color: colors.inkMute,
          letterSpacing: "-0.2px",
          fontFeatureSettings: '"tnum","ss01"',
        }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        {caption}
      </span>
    </div>
  );
}
