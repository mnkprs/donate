import { AuthorityStrip } from "@/components/landing/AuthorityStrip";
import { CausesGrid } from "@/components/landing/CausesGrid";
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
        <HowItWorks />
        <CausesGrid campaigns={getCampaigns()} />
      </main>
      <Footer />
    </>
  );
}
