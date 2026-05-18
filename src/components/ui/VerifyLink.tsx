import { colors } from "@/lib/tokens";

interface VerifyLinkProps {
  label?: string;
  href?: string;
}

export function VerifyLink({
  label = "Verify on BaseScan",
  href = "#",
}: VerifyLinkProps) {
  return (
    <a
      href={href}
      style={{
        color: colors.primary,
        fontSize: 12,
        fontWeight: 400,
        textDecoration: "none",
        letterSpacing: "-0.1px",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      {label}
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path
          d="M2 7L7 2M7 2H3.2M7 2V5.8"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
    </a>
  );
}
