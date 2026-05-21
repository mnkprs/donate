import { CharityCard } from "@/components/receipt/CharityCard";
import { Footer } from "@/components/receipt/Footer";
import { Hero } from "@/components/receipt/Hero";
import { PizzaTracker } from "@/components/receipt/PizzaTracker";
import { ShareRow } from "@/components/receipt/ShareRow";
import { VerificationCard } from "@/components/receipt/VerificationCard";
import { colors } from "@/lib/tokens";
import type { ReceiptBundle } from "@/types/receipt";

interface EudaimoniaReceiptProps {
  bundle: ReceiptBundle;
  trackerVariant?: "card" | "minimal";
  showFeeStrip?: boolean;
}

export function EudaimoniaReceipt({
  bundle,
  trackerVariant = "card",
  showFeeStrip = true,
}: EudaimoniaReceiptProps) {
  return (
    <div
      style={{
        background: colors.canvas,
        color: colors.ink,
        fontFamily:
          '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
        fontWeight: 300,
        fontFeatureSettings: '"ss01"',
        WebkitFontSmoothing: "antialiased",
        minHeight: "100%",
      }}
    >
      <Hero data={bundle.data} />
      <PizzaTracker stages={bundle.stages} variant={trackerVariant} />
      <CharityCard data={bundle.data} />
      <VerificationCard data={bundle.data} showFeeStrip={showFeeStrip} />
      <ShareRow />
      <Footer />
    </div>
  );
}
