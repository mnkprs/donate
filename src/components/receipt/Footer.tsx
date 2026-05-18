import { Wordmark } from "@/components/brand/Wordmark";
import { colors } from "@/lib/tokens";

export function Footer() {
  return (
    <footer style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 64px 72px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: colors.inkMute,
          fontSize: 13,
          letterSpacing: "-0.1px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Wordmark size={13} color={colors.inkMute} />
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <FooterLink href="#" emphasis>
            What is Philotimo? →
          </FooterLink>
          <FooterLink href="#">How fees work</FooterLink>
          <FooterLink href="#">Contact</FooterLink>
        </div>
      </div>
      <p
        style={{
          marginTop: 18,
          marginBottom: 0,
          fontSize: 11,
          color: colors.inkMute,
          letterSpacing: "-0.1px",
          maxWidth: 720,
          lineHeight: 1.5,
        }}
      >
        Philotimo is a non-custodial donation router. Donations are tax-deductible
        to the extent allowed by law, processed through Endaoment Inc. (EIN
        84-3104578). This receipt is generated from on-chain data and is
        verifiable independently.
      </p>
    </footer>
  );
}

interface FooterLinkProps {
  href: string;
  emphasis?: boolean;
  children: React.ReactNode;
}

function FooterLink({ href, emphasis = false, children }: FooterLinkProps) {
  return (
    <a
      href={href}
      style={{
        color: emphasis ? colors.primary : colors.inkMute,
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}
