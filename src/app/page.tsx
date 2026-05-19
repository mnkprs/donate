import { CausesGrid } from "@/components/landing/CausesGrid";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { NavBar } from "@/components/landing/NavBar";
import { getCampaigns } from "@/lib/campaigns";

export default function Home() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <CausesGrid campaigns={getCampaigns()} />
      </main>
      <Footer />
    </>
  );
}
