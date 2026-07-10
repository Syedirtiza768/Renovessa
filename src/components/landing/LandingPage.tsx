"use client";

import { CategoryProvider } from "./CategoryContext";
import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";
import { HouseSelector } from "./HouseSelector";
import {
  HowItWorksSection,
  StatsStrip,
  CategoriesSection,
  WhySection,
  FAQSection,
  FinalCTASection,
} from "./LandingSections";
import { LandingProjectForm } from "./LandingProjectForm";
import { LandingFooter } from "./LandingFooter";
import { MobileCTABar } from "./MobileCTABar";

export function LandingPage({ aiAdvisorEnabled = false }: { aiAdvisorEnabled?: boolean }) {
  return (
    <CategoryProvider>
      <div className="landing-page min-h-screen pb-20 md:pb-0">
        <LandingHeader />
        <main>
          <LandingHero aiAdvisorEnabled={aiAdvisorEnabled} />
          <HouseSelector />
          <HowItWorksSection />
          <StatsStrip />
          <CategoriesSection />
          <WhySection />

          <section id="request" className="scroll-mt-20 bg-bone-0 px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <p className="landing-eyebrow">V. Submit your project</p>
              <div className="mt-6">
                <LandingProjectForm />
              </div>
            </div>
          </section>

          <FAQSection />
          <FinalCTASection />
        </main>
        <LandingFooter />
        <MobileCTABar />
      </div>
    </CategoryProvider>
  );
}
