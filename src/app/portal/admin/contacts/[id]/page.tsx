import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContactDetailClient } from "./detail-client";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const { id } = await params;
  const contact = await prisma.contractorInquiry.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });
  if (!contact) notFound();

  // Get all email messages for this contact
  const messages = await prisma.emailMessage.findMany({
    where: { toEmail: { equals: contact.email, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { id: true, name: true } } },
  });

  // Get all available tags for assignment
  const allTags = await prisma.contactTag.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <Link href="/portal/admin/contacts" className="text-sm text-copper hover:underline">← Back to Contacts</Link>

      <ContactDetailClient
        contact={{
          ...contact,
          tags: contact.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
        }}
        messages={messages.map((m) => ({
          id: m.id,
          direction: m.direction,
          subject: m.subject,
          body: m.body,
          status: m.status,
          campaignId: m.campaignId,
          campaignName: m.campaign?.name || null,
          createdAt: m.createdAt.toISOString(),
        }))}
        allTags={allTags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      />
    </div>
  );
}
