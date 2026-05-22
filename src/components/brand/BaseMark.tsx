/** Coinbase Base network mark — the official Base brand blue. */
const BASE_BLUE = "#0052ff";

interface BaseMarkProps {
  /** Diameter in px. */
  size?: number;
}

/**
 * The blue Coinbase Base network mark (a white disc on Base blue). Decorative:
 * always labelled by adjacent "Base · Ethereum L2" text, so `aria-hidden`.
 */
export function BaseMark({ size = 20 }: BaseMarkProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: BASE_BLUE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: 9999,
          background: "#ffffff",
        }}
      />
    </div>
  );
}
