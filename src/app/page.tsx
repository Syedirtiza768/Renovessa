import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: { absolute: "Home Improvement Cost Estimator & Contractor Bids | DMV | Renovessa" },
  description:
    "Scope your HVAC, roofing, kitchen, bathroom, or repair project, see a DMV planning range, and ask Renovessa to coordinate relevant contractor bids.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingPage />;
}
