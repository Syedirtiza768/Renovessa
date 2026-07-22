"use client";

import { CategoryProvider } from "./CategoryContext";
import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";
import { EstimateWizard } from "./EstimateWizard";
import { HouseSelector } from "./HouseSelector";
import {
  HowItWorksSection,
  CategoriesSection,
  WhySection,
  FAQSection,
  FinalCTASection,
} from "./LandingSections";
import { LandingFooter } from "./LandingFooter";
import { MobileCTABar } from "./MobileCTABar";

export function LandingPage() {
  return (
    <CategoryProvider>
      <div className="landing-page min-h-screen pb-20 md:pb-0">
        <LandingHeader />
        <main>
          <LandingHero />
          <HouseSelector />
          <EstimateWizard />
          <HowItWorksSection />
          <CategoriesSection />
          <WhySection />
          <FAQSection />
          <FinalCTASection />
        </main>
        <LandingFooter />
        <MobileCTABar />
      </div>
    </CategoryProvider>
  );
}
