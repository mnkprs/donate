interface ArrowRightProps {
  size?: number;
  color?: string;
}

export function ArrowRight({ size = 10, color = "currentColor" }: ArrowRightProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      style={{ marginLeft: 2 }}
    >
      <path
        d="M2 8L8 2M8 2H3.5M8 2V6.5"
        stroke={color}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
