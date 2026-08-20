/**
 * Seed authority content templates for all verticals into BathroomContentVersion.
 * Run with: npx tsx scripts/seed-content-templates.ts
 *
 * Sources content from:
 * - src/lib/content-templates/bathroom.ts
 * - src/lib/content-templates/solar.ts
 * - src/lib/content-templates/roofing.ts
 * - src/lib/content-templates/hvac.ts
 */
import { PrismaClient } from "@prisma/client";
import { BATHROOM_CONTENT_TEMPLATES } from "../src/lib/content-templates/bathroom";
import { SOLAR_CONTENT_TEMPLATES } from "../src/lib/content-templates/solar";
import { ROOFING_CONTENT_TEMPLATES } from "../src/lib/content-templates/roofing";
import { HVAC_CONTENT_TEMPLATES } from "../src/lib/content-templates/hvac";
import { ContentTemplate } from "../src/lib/content-templates/types";

const prisma = new PrismaClient();

const ALL_TEMPLATES: ContentTemplate[] = [
  ...BATHROOM_CONTENT_TEMPLATES,
  ...SOLAR_CONTENT_TEMPLATES,
  ...ROOFING_CONTENT_TEMPLATES,
  ...HVAC_CONTENT_TEMPLATES,
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const template of ALL_TEMPLATES) {
    const bodyHtml = `<div>${template.bodyText.replace(/\n/g, "<br/>")}</div>`;

    const result = await prisma.bathroomContentVersion.upsert({
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

    // Determine if this was a create or update by checking createdAt proximity
    const isNew =
      result.createdAt.getTime() > Date.now() - 5000 ||
      result.lastUpdatedAt.getTime() === result.createdAt.getTime();

    if (isNew && result.lastUpdatedAt.getTime() === result.createdAt.getTime()) {
      created++;
      console.log(`✓ Created: ${template.slug} (${template.applicableTrade})`);
    } else {
      updated++;
      console.log(`↻ Updated: ${template.slug} (${template.applicableTrade})`);
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Total: ${ALL_TEMPLATES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
