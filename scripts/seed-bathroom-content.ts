/**
 * Seed authority content templates into BathroomContentVersion.
 * Run with: npx tsx scripts/seed-bathroom-content.ts
 */
import { PrismaClient } from "@prisma/client";
import { BATHROOM_CONTENT_TEMPLATES } from "../src/lib/bathroom/content-templates";

const prisma = new PrismaClient();

async function main() {
  for (const template of BATHROOM_CONTENT_TEMPLATES) {
    const bodyHtml = `<div>${template.bodyText.replace(/\n/g, "<br/>")}</div>`;
    await prisma.bathroomContentVersion.upsert({
      where: { slug: template.slug },
      create: {
        slug: template.slug,
        title: template.title,
        bodyHtml,
        bodyText: template.bodyText,
        author: template.author,
        reviewer: template.reviewer,
        methodology: template.methodology ?? null,
        sourceLinks: [],
        applicableLocation: template.applicableLocation,
        applicableTrade: template.applicableTrade,
        status: template.status,
        lastReviewedAt: new Date(),
      },
      update: {
        title: template.title,
        bodyHtml,
        bodyText: template.bodyText,
        author: template.author,
        reviewer: template.reviewer,
        methodology: template.methodology ?? null,
        applicableLocation: template.applicableLocation,
        applicableTrade: template.applicableTrade,
        status: template.status,
        lastReviewedAt: new Date(),
      },
    });
    console.log(`✓ ${template.slug} (${template.status})`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
