import { AuthorityStrip } from "@/components/landing/AuthorityStrip";
import { CausesGrid } from "@/components/landing/CausesGrid";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { CreamBand } from "@/components/landing/CreamBand";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { NavBar } from "@/components/landing/NavBar";
import { getCampaigns } from "@/lib/campaigns";

export default function Home() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <AuthorityStrip />
        <CausesGrid campaigns={getCampaigns()} />
        <CreamBand />
        <HowItWorks />
        <ClosingCTA />
      </main>
      <Footer />
    </>
  );
}
