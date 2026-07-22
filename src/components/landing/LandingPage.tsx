"use client";

import { CategoryProvider } from "./CategoryContext";
import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";
import { EstimateWizard } from "./EstimateWizard";
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

export function LandingPage() {
  return (
    <CategoryProvider>
      <div className="landing-page min-h-screen pb-20 md:pb-0">
        <LandingHeader />
        <main>
          <LandingHero />
          <EstimateWizard />
          <HouseSelector />
          <HowItWorksSection />
          <StatsStrip />
          <CategoriesSection />
          <WhySection />

          <section id="request" className="scroll-mt-20 bg-bone-0 px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <p className="landing-eyebrow">V. Prefer a short form?</p>
              <h2 className="landing-h2 mt-3">Quick project request</h2>
              <p className="mt-3 text-ink-70">
                Already know what you need? Use the short form — or{" "}
                <a href="#estimate" className="font-medium text-ink-100 underline underline-offset-2">
                  go back to the estimate wizard
                </a>{" "}
                for a ballpark and full RFQ.
              </p>
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
