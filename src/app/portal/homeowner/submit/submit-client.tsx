"use client";

import { EstimateWizard } from "@/components/landing/EstimateWizard";

export function HomeownerSubmitClient({
  prefill,
}: {
  prefill: { name: string; email: string; phone: string };
}) {
  return <EstimateWizard variant="embedded" prefill={prefill} lockEmail />;
}
