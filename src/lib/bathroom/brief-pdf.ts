/**
 * Project brief PDF renderer (PRD §21.3).
 * Takes a structured ProjectBrief and writes it to a PDFKit document.
 * Pure function — no DB access, no network.
 */

import PDFDocument from "pdfkit";
import type { ProjectBrief } from "./project-brief";

type PdfDoc = InstanceType<typeof PDFDocument>;

const MARGIN = 56;
const PAGE_WIDTH = 612; // US Letter
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function renderBriefPdf(brief: ProjectBrief): PdfDoc {
  const doc = new PDFDocument({ size: "LETTER", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
  const ref = brief.project.referenceNumber;

  // Header
  doc.fontSize(20).font("Helvetica-Bold").text("Renovessa Bathroom Project Brief", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor("#666").text(`Reference: ${ref}`, { align: "center" });
  doc.text(`Generated: ${new Date(brief.generatedAt).toLocaleString()}`, { align: "center" });
  doc.fillColor("#000");
  doc.moveDown(1);

  // Project overview
  sectionTitle(doc, "Project Overview");
  const overview: Record<string, string> = {
    "Bathroom type": prettify(brief.project.bathroomType) ?? "—",
    "Project objective": prettify(brief.project.projectObjective) ?? "—",
    "Property type": prettify(brief.project.propertyType) ?? "—",
    "Ownership": prettify(brief.project.ownershipStatus) ?? "—",
    "Occupancy": prettify(brief.project.occupancyStatus) ?? "—",
  };
  keyValueTable(doc, overview);
  doc.moveDown(0.8);

  // Location
  sectionTitle(doc, "Location");
  const loc = brief.location;
  keyValueTable(doc, {
    "City": loc.city,
    "State": loc.state,
    "ZIP": loc.zip ?? "—",
    "In Rockville service area": loc.inRockville ? "Yes" : "No",
  });
  doc.moveDown(0.8);

  // Existing bathroom
  sectionTitle(doc, "Existing Bathroom");
  if (brief.existingBathroom.measurements) {
    const m = brief.existingBathroom.measurements;
    keyValueTable(doc, {
      "Measurement method": prettify(m.method) ?? "—",
      "Floor area": m.floorAreaSqft ? `${m.floorAreaSqft} sq ft` : "—",
      "Ceiling height": m.ceilingHeight ? `${m.ceilingHeight} ft` : "—",
      "Measurements confirmed": m.confirmed ? "Yes" : "No",
    });
    doc.moveDown(0.4);
  }
  if (brief.existingBathroom.conditions.length > 0) {
    doc.fontSize(11).font("Helvetica-Bold").text("Known conditions:");
    doc.font("Helvetica").fontSize(10);
    brief.existingBathroom.conditions.forEach((c) => {
      const label = `${prettify(c.type) ?? c.type}${c.severity ? ` (${c.severity})` : ""}`;
      doc.text(`  • ${label}${c.notes ? ` — ${c.notes}` : ""}`);
    });
    doc.moveDown(0.4);
  }
  if (brief.existingBathroom.mediaCount > 0) {
    doc.fontSize(10).text(`Photos uploaded: ${brief.existingBathroom.mediaCount}`);
    doc.moveDown(0.4);
  }
  doc.moveDown(0.8);

  // Proposed project
  sectionTitle(doc, "Proposed Project");
  if (brief.proposedProject.selections.length > 0) {
    doc.fontSize(11).font("Helvetica-Bold").text("Selections:");
    doc.font("Helvetica").fontSize(10);
    brief.proposedProject.selections.forEach((s) => {
      const parts = [prettify(s.category) ?? s.category];
      if (s.qualityTier) parts.push(prettify(s.qualityTier) ?? s.qualityTier);
      if (s.brand) parts.push(s.brand);
      if (s.model) parts.push(s.model);
      doc.text(`  • ${parts.join(" — ")}`);
    });
    doc.moveDown(0.4);
  }
  if (brief.proposedProject.scopePriorities.length > 0) {
    doc.fontSize(11).font("Helvetica-Bold").text("Scope priorities:");
    doc.font("Helvetica").fontSize(10);
    brief.proposedProject.scopePriorities.forEach((s) => doc.text(`  • ${s}`));
    doc.moveDown(0.4);
  }
  doc.moveDown(0.8);

  // Planning estimate
  sectionTitle(doc, "Planning Estimate");
  const e = brief.planningEstimate;
  keyValueTable(doc, {
    "Planning range": `$${e.lowAmount.toLocaleString()} – $${e.highComplexityAmount.toLocaleString()}`,
    "Expected low": `$${e.expectedLowAmount.toLocaleString()}`,
    "Expected high": `$${e.expectedHighAmount.toLocaleString()}`,
    "Contingency": `$${e.contingencyAmount.toLocaleString()}`,
    "Confidence": e.confidenceLevel,
    "Config version": e.configVersion,
  });
  doc.moveDown(0.4);

  if (e.costDrivers.length > 0) {
    doc.fontSize(11).font("Helvetica-Bold").text("Cost drivers:");
    doc.font("Helvetica").fontSize(10);
    e.costDrivers.forEach((s) => doc.text(`  • ${s}`));
    doc.moveDown(0.4);
  }
  if (e.assumptions.length > 0) {
    doc.fontSize(11).font("Helvetica-Bold").text("Assumptions:");
    doc.font("Helvetica").fontSize(10);
    e.assumptions.forEach((s) => doc.text(`  • ${s}`));
    doc.moveDown(0.4);
  }
  if (e.unknowns.length > 0) {
    doc.fontSize(11).font("Helvetica-Bold").text("Unknowns:");
    doc.font("Helvetica").fontSize(10);
    e.unknowns.forEach((s) => doc.text(`  • ${s}`));
    doc.moveDown(0.4);
  }
  if (e.exclusions.length > 0) {
    doc.fontSize(11).font("Helvetica-Bold").text("Exclusions:");
    doc.font("Helvetica").fontSize(10);
    e.exclusions.forEach((s) => doc.text(`  • ${s}`));
    doc.moveDown(0.4);
  }
  doc.moveDown(0.8);

  // Permit guidance
  sectionTitle(doc, "Permit Guidance");
  const p = brief.permitGuidance;
  keyValueTable(doc, {
    "Jurisdiction": p.jurisdiction,
    "Building permit": p.building,
    "Plumbing permit": p.plumbing,
    "Electrical permit": p.electrical,
    "Mechanical permit": p.mechanical,
    "HOA review": p.hoa,
    "Review required": p.reviewRequired ? "Yes" : "No",
  });
  doc.moveDown(0.4);
  if (p.questionsForContractor.length > 0) {
    doc.fontSize(11).font("Helvetica-Bold").text("Questions for contractor:");
    doc.font("Helvetica").fontSize(10);
    p.questionsForContractor.forEach((s) => doc.text(`  • ${s}`));
    doc.moveDown(0.4);
  }
  doc.moveDown(0.8);

  // Homeowner priorities
  if (brief.homeownerPriorities.length > 0) {
    sectionTitle(doc, "Homeowner Priorities");
    doc.font("Helvetica").fontSize(10);
    brief.homeownerPriorities.forEach((s) => doc.text(`  • ${s}`));
    doc.moveDown(0.8);
  }

  // Contractor questions
  sectionTitle(doc, "Standard Contractor Questions");
  doc.font("Helvetica").fontSize(10);
  brief.contractorQuestions.forEach((q) => doc.text(`  • ${q}`));
  doc.moveDown(0.8);

  // Disclaimers
  sectionTitle(doc, "Disclaimers");
  doc.font("Helvetica").fontSize(9).fillColor("#444");
  brief.disclaimers.forEach((d) => {
    doc.text(d);
    doc.moveDown(0.3);
  });
  doc.fillColor("#000");

  // Footer page numbers
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor("#999").text(
      `Renovessa · ${ref} · Page ${i - pages.start + 1} of ${pages.count}`,
      MARGIN,
      750,
      { width: CONTENT_WIDTH, align: "center" },
    );
    doc.fillColor("#000");
  }

  doc.end();
  return doc;
}

function sectionTitle(doc: PdfDoc, title: string) {
  doc.moveDown(0.4);
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a1a").text(title);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).strokeColor("#ddd").lineWidth(1).stroke();
  doc.moveDown(0.3);
  doc.fillColor("#000");
}

function keyValueTable(doc: PdfDoc, rows: Record<string, string>) {
  doc.font("Helvetica").fontSize(10);
  for (const [key, value] of Object.entries(rows)) {
    const y = doc.y;
    doc.font("Helvetica-Bold").text(key, MARGIN, y, { width: 180 });
    doc.font("Helvetica").text(value, MARGIN + 190, y, { width: CONTENT_WIDTH - 190 });
    doc.moveDown(0.25);
  }
}

function prettify(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
