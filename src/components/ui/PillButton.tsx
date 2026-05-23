import type { ReactNode } from "react";

export type PillVariant = "primary" | "secondary" | "dark" | "ghost";
export type PillSize = "sm" | "md" | "lg";

interface PillButtonBaseProps {
  children: ReactNode;
  variant?: PillVariant;
  size?: PillSize;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

interface PillButtonAsButton extends PillButtonBaseProps {
  href?: undefined;
  type?: "button" | "submit";
  onClick?: () => void;
}

interface PillButtonAsLink extends PillButtonBaseProps {
  href: string;
}

type PillButtonProps = PillButtonAsButton | PillButtonAsLink;

// Minimum 24×24 target per WCAG 2.5.8 (Lighthouse target-size audit).
const SIZE_CLASSES: Record<PillSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-[13px]",
  md: "min-h-11 px-4 py-2 text-sm",
  lg: "min-h-12 px-5 py-[11px] text-[15px]",
};

const VARIANT_CLASSES: Record<PillVariant, string> = {
  primary:
    "bg-iris text-white border border-iris hover:bg-iris-hover hover:border-iris-hover",
  secondary:
    "bg-white text-ink border border-rule hover:border-ink",
  dark: "bg-ink text-white border border-ink hover:bg-ink-dark hover:border-ink-dark",
  ghost:
    "bg-transparent text-ink border border-transparent hover:bg-tint",
};

const BASE_CLASSES =
  "inline-flex items-center gap-1.5 rounded-full font-normal tracking-[-0.1px] no-underline transition-all duration-150 cursor-pointer aria-disabled:opacity-60 aria-disabled:pointer-events-none";

export function PillButton(props: PillButtonProps) {
  const {
    children,
    variant = "primary",
    size = "md",
    icon,
    disabled,
    className,
  } = props;

  const classes = [
    BASE_CLASSES,
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dataAttrs = {
    "data-variant": variant,
    "data-size": size,
  };

  if ("href" in props && props.href !== undefined) {
    return (
      <a
        href={disabled ? undefined : props.href}
        role={disabled ? "link" : undefined}
        className={classes}
        aria-disabled={disabled || undefined}
        {...dataAttrs}
      >
        {children}
        {icon}
      </a>
    );
  }

  const buttonType = "type" in props ? props.type : "button";
  const onClick = "onClick" in props ? props.onClick : undefined;

  return (
    <button
      type={buttonType ?? "button"}
      className={classes}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      {...dataAttrs}
    >
      {children}
      {icon}
    </button>
  );
}
