/**
 * White-label contractor proposal PDF — contractor letterhead first, no Renovessa branding.
 */

import PDFDocument from "pdfkit";

type PdfDoc = InstanceType<typeof PDFDocument>;

const MARGIN = 52;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export type ContractorLetterhead = {
  companyName: string;
  contactPerson?: string | null;
  letterheadPhone?: string | null;
  letterheadEmail?: string | null;
  letterheadAddress?: string | null;
  letterheadTagline?: string | null;
  letterheadLicenseText?: string | null;
  proposalFooterText?: string | null;
};

export type ProposalPdfInput = {
  letterhead: ContractorLetterhead;
  job: {
    referenceNumber: string;
    jobTitle?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
    clientPhone?: string | null;
    bathroomType?: string | null;
    projectObjective?: string | null;
  };
  proposal: {
    totalPrice: number;
    includedScope: string;
    exclusions: string;
    materialAllowances?: string | null;
    fixtureAllowances?: string | null;
    permitHandling?: string | null;
    estimatedStartDate?: string | null;
    estimatedDuration?: string | null;
    paymentSchedule?: string | null;
    warranty?: string | null;
    changeOrderProcess?: string | null;
    optionalUpgrades?: string | null;
    suggestedChanges?: string | null;
    expirationDate?: Date | string | null;
    version?: number | null;
    approvedAt?: Date | string | null;
  };
  generatedAt?: Date;
  /** Watermark as draft — not a client-ready document. */
  draftPreview?: boolean;
};

export function renderContractorProposalPdf(input: ProposalPdfInput): PdfDoc {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  });
  const lh = input.letterhead;
  const p = input.proposal;
  const job = input.job;
  const when = input.generatedAt ?? new Date();

  // Letterhead
  doc.fontSize(22).font("Helvetica-Bold").fillColor("#111").text(lh.companyName, { align: "left" });
  if (lh.letterheadTagline) {
    doc.moveDown(0.15);
    doc.fontSize(10).font("Helvetica-Oblique").fillColor("#555").text(lh.letterheadTagline);
  }
  doc.moveDown(0.35);
  doc.fontSize(9).font("Helvetica").fillColor("#444");
  const contactLines = [
    lh.contactPerson ? `Contact: ${lh.contactPerson}` : null,
    lh.letterheadAddress,
    [lh.letterheadPhone, lh.letterheadEmail].filter(Boolean).join(" · ") || null,
    lh.letterheadLicenseText,
  ].filter(Boolean) as string[];
  contactLines.forEach((line) => doc.text(line));

  doc.moveDown(0.6);
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor("#222").lineWidth(1.25).stroke();
  doc.moveDown(0.8);

  doc.fontSize(16).font("Helvetica-Bold").fillColor("#111").text("Bathroom Remodel Proposal");
  doc.moveDown(0.25);
  doc.fontSize(10).font("Helvetica").fillColor("#555");
  doc.text(`Proposal # ${job.referenceNumber}${p.version ? ` · v${p.version}` : ""}`);
  doc.text(`Date: ${when.toLocaleDateString()}`);
  if (p.approvedAt) {
    doc.text(`Approved: ${new Date(p.approvedAt).toLocaleDateString()}`);
  }
  if (job.jobTitle) doc.text(`Project: ${job.jobTitle}`);
  if (input.draftPreview) {
    doc.moveDown(0.35);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#b45309").text("DRAFT PREVIEW — NOT APPROVED FOR CLIENT");
  }
  doc.moveDown(0.6);

  section(doc, "Prepared for");
  kv(doc, {
    Client: job.clientName || "—",
    Email: job.clientEmail || "—",
    Phone: job.clientPhone || "—",
    "Bathroom type": pretty(job.bathroomType) || "—",
    Objective: pretty(job.projectObjective) || "—",
  });

  section(doc, "Investment");
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#111").text(`$${p.totalPrice.toLocaleString()}`);
  doc.fontSize(9).font("Helvetica").fillColor("#666").text("Proposal total — subject to site verification and signed agreement.");
  doc.moveDown(0.5);

  section(doc, "Included scope");
  body(doc, p.includedScope);

  section(doc, "Exclusions");
  body(doc, p.exclusions);

  if (p.materialAllowances || p.fixtureAllowances) {
    section(doc, "Allowances");
    kv(doc, {
      Materials: p.materialAllowances || "—",
      Fixtures: p.fixtureAllowances || "—",
    });
  }

  if (p.permitHandling) {
    section(doc, "Permits");
    body(doc, p.permitHandling);
  }

  section(doc, "Schedule");
  kv(doc, {
    "Estimated start": p.estimatedStartDate || "—",
    Duration: p.estimatedDuration || "—",
  });

  if (p.paymentSchedule) {
    section(doc, "Payment schedule");
    body(doc, p.paymentSchedule);
  }
  if (p.warranty) {
    section(doc, "Warranty");
    body(doc, p.warranty);
  }
  if (p.changeOrderProcess) {
    section(doc, "Change orders");
    body(doc, p.changeOrderProcess);
  }
  if (p.optionalUpgrades) {
    section(doc, "Optional upgrades");
    body(doc, p.optionalUpgrades);
  }
  if (p.suggestedChanges) {
    section(doc, "Suggested changes / recommendations");
    body(doc, p.suggestedChanges);
  }

  if (p.expirationDate) {
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#666").text(
      `This proposal expires on ${new Date(p.expirationDate).toLocaleDateString()}.`,
    );
  }

  doc.moveDown(1.2);
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor("#ccc").lineWidth(0.75).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor("#777").text(
    lh.proposalFooterText ||
      "This proposal is provided for planning and contracting purposes. Final pricing and scope are confirmed after on-site inspection and a signed agreement.",
    { width: CONTENT_WIDTH },
  );
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor("#999").text(lh.companyName, { align: "right" });

  return doc;
}

function section(doc: PdfDoc, title: string) {
  doc.moveDown(0.55);
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#111").text(title);
  doc.moveDown(0.2);
}

function body(doc: PdfDoc, text: string) {
  doc.fontSize(10).font("Helvetica").fillColor("#222").text(text || "—", { width: CONTENT_WIDTH, lineGap: 2 });
}

function kv(doc: PdfDoc, rows: Record<string, string>) {
  doc.fontSize(10).font("Helvetica").fillColor("#222");
  for (const [k, v] of Object.entries(rows)) {
    doc.text(`${k}: ${v}`);
  }
  doc.moveDown(0.2);
}

function pretty(v?: string | null) {
  if (!v) return null;
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function pdfToBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
