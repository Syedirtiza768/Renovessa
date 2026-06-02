import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProjectRequestForm } from "@/components/ProjectRequestForm";

export default function ForHomeownersPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-slate">For Homeowners</h1>
        <p className="mt-4 text-lg text-muted">
          Get home improvement help without the contractor search chaos. One request, one vetted contractor, one confirmed appointment.
        </p>
        <div className="mt-10">
          <ProjectRequestForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
