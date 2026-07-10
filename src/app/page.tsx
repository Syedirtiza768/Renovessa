import { LandingPage } from "@/components/landing/LandingPage";

// Render at request time so the advisor flag is read from the container's runtime
// env (env_file), not baked at build — .env is dockerignored, so a statically
// prerendered homepage would never see NEXT_PUBLIC_AI_ADVISOR_ENABLED in prod.
export const dynamic = "force-dynamic";

export default function HomePage() {
  // Read at runtime in this Server Component (env_file provides it in the
  // container) and pass down as a prop. NEXT_PUBLIC_* is NOT reliably inlined at
  // Docker build time here (.env is dockerignored), so gating on it inside a
  // client component would evaluate false in prod. Passing a prop is build-safe
  // and lets you toggle the advisor with an env change + restart (no rebuild).
  const aiAdvisorEnabled = process.env.NEXT_PUBLIC_AI_ADVISOR_ENABLED === "true";
  return <LandingPage aiAdvisorEnabled={aiAdvisorEnabled} />;
}
