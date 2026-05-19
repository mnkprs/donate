"use client";

interface AmountChipProps {
  value: number;
  currency: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const BASE_CLASSES =
  "flex-1 inline-flex items-center justify-center gap-0.5 rounded-lg px-3 py-3.5 text-xl font-light tracking-[-0.3px] tabular-nums border transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-default";

const ACTIVE_CLASSES = "bg-ink text-white border-ink";

const INACTIVE_CLASSES = "bg-white text-ink border-rule hover:bg-tint";

export function AmountChip({
  value,
  currency,
  active = false,
  disabled = false,
  onClick,
}: AmountChipProps) {
  const classes = [
    BASE_CLASSES,
    active ? ACTIVE_CLASSES : INACTIVE_CLASSES,
  ].join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={classes}
    >
      <span>{currency}</span>
      <span>{value}</span>
    </button>
  );
}
