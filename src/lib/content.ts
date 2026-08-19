import { prisma } from "./db";
import { getTradeEstimatorPath, LANDING_CATEGORIES } from "./landing-data";

export type ContentItem = Awaited<ReturnType<typeof getPublishedContentBySlug>>;

export async function getPublishedContentBySlug(slug: string) {
  return prisma.bathroomContentVersion.findUnique({
    where: { slug, status: "published" },
  });
}

export async function getAllPublishedContent() {
  return prisma.bathroomContentVersion.findMany({
    where: { status: "published" },
    orderBy: { lastUpdatedAt: "desc" },
  });
}

export async function getPublishedContentByTrade(trade: string) {
  return prisma.bathroomContentVersion.findMany({
    where: { status: "published", applicableTrade: trade },
    orderBy: { lastUpdatedAt: "desc" },
  });
}

export function isCostGuide(_slug: string, title: string): boolean {
  const costPatterns = [
    /cost/i,
    /price/i,
    /payback/i,
    /\$/,
  ];
  return costPatterns.some((p) => p.test(title));
}

export function tradeLabel(tradeId: string): string {
  const cat = LANDING_CATEGORIES.find((c) => c.id === (tradeId as any));
  return cat?.label ?? tradeId;
}

export function tradeEstimatorPath(tradeId: string): string {
  return getTradeEstimatorPath(tradeId as any);
}

/**
 * Convert plain-text body content to semantic HTML.
 *
 * Heuristic rules:
 * - The first block is treated as a lead paragraph.
 * - Single short lines without sentence-ending punctuation become <h2>.
 * - Lines starting with "Term: explanation" bold the term.
 * - Everything else becomes <p>, with inner \n as <br/>.
 */
export function bodyTextToHtml(bodyText: string): string {
  const blocks = bodyText.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return "";

  const out: string[] = [];

  blocks.forEach((block) => {
    const lines = block.split("\n");

    // Heading heuristic: single line, no sentence-ending punctuation, 3–100 chars
    const isHeading =
      lines.length === 1 &&
      !block.match(/[.!?;:]\s*$/) &&
      block.length > 3 &&
      block.length < 100;

    if (isHeading) {
      out.push(`<h2 class="text-xl font-semibold text-ink-100 mt-10 mb-4">${escapeHtml(block)}</h2>`);
      return;
    }

    // Paragraph with optional bold lead-in before colon
    const processedLines = lines.map((line) => {
      return line.replace(/^([^:]+):\s+(.+)$/, '<strong>$1:</strong> $2');
    });

    // If a block has multiple lines and each is a complete sentence, make separate paragraphs
    const useSeparateParagraphs =
      processedLines.length > 1 &&
      processedLines.every((l) => l.match(/[.!?]\s*$/));

    if (useSeparateParagraphs) {
      processedLines.forEach((line) => {
        out.push(`<p class="text-sm leading-relaxed text-ink-70 mb-4">${escapeHtml(line)}</p>`);
      });
    } else {
      const inner = processedLines.map(escapeHtml).join("<br/>\n");
      out.push(`<p class="text-sm leading-relaxed text-ink-70 mb-4">${inner}</p>`);
    }
  });

  return out.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function publicPathForContent(slug: string, title: string): string {
  const kind = isCostGuide(slug, title) ? "cost-guides" : "resources";
  return `/${kind}/${slug}`;
}
