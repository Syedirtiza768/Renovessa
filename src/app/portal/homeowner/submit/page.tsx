import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HomeownerSubmitClient } from "./submit-client";

export default async function HomeownerSubmitPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { phone: true },
  });

  return (
    <div className="landing-page">
      <Link href="/portal/homeowner" className="text-sm text-copper hover:underline">
        ← Back to My Projects
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-ink-100">Submit an RFQ</h1>
      <p className="mt-1 max-w-[58ch] text-sm text-ink-70">
        Use the estimate wizard — get a DMV ballpark, preview your request for quote, then submit.
        This is the only way to request contractor bids through Renovessa.
      </p>
      <div className="mt-6">
        <HomeownerSubmitClient
          prefill={{
            name: session.name,
            email: session.email,
            phone: user?.phone ?? "",
          }}
        />
      </div>
    </div>
  );
}
