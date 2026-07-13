import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { ContactsPageClient } from "./page-client";
import { prisma } from "@/lib/db";

/**
 * Contacts Manager — the central hub for managing prospective contractors,
 * viewing communication history, and segmenting contacts for campaigns.
 */
export default async function ContactsPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  // Load tags for the filter sidebar
  const tags = await prisma.contactTag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  // Load distinct trades and cities for filter dropdowns
  const trades = await prisma.contractorInquiry.findMany({
    where: { isDemo: false },
    select: { trade: true },
    distinct: ["trade"],
    orderBy: { trade: "asc" },
  });

  const cities = await prisma.contractorInquiry.findMany({
    where: { isDemo: false },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return (
    <ContactsPageClient
      initialTags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.assignments }))}
      trades={trades.map((t) => t.trade).filter((t): t is string => !!t)}
      cities={cities.map((c) => c.city).filter((c): c is string => !!c)}
    />
  );
}
