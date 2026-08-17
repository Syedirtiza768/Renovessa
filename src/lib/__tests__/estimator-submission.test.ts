import { describe, expect, it } from "vitest";
import { buildStandardEstimatorSnapshot, buildAnswerMapEstimatorSnapshot, snapshotFromLegacyQualificationNotes } from "@/lib/estimator-submission";

describe("estimator submission snapshots", () => {
  it("stores every standard wizard field with its display label and ZIP", () => {
    const snapshot = buildStandardEstimatorSnapshot({
      trade: "roofing",
      tradeLabel: "Roofing",
      answers: {
        job_type: "full_replace",
        roof_squares: "24",
        stories: "2",
        pitch: "moderate",
        material: "architectural",
        property_type: "sfh",
        ownership: "owner",
        urgency: "Within 1 month",
        access: "easy",
      },
      zip: "20850",
      notes: "Replace before winter.",
      contact: { firstName: "Jane", maxContractors: 3 },
      estimate: {
        low: 10000,
        mid: 14000,
        high: 19000,
        confidence: "rough",
        summary: "Roof replacement",
        drivers: ["Material"],
        disclaimer: "Planning only",
        claimId: "claim",
        modelVersion: "v1",
        substantiationStatus: "APPROVED",
        publicationApproved: true,
      },
    });

    const fields = snapshot.sections.flatMap((section) => section.fields);
    expect(fields.find((field) => field.id === "material")).toMatchObject({
      value: "architectural",
      displayValue: "Architectural asphalt",
    });
    expect(fields.find((field) => field.id === "zipCode")).toMatchObject({
      value: "20850",
      displayValue: "20850",
    });
    expect(snapshot.answers.access).toBe("easy");
    expect(snapshot.contact.maxContractors).toBe(3);
  });

  it("keeps specialized answer maps and contact fields together", () => {
    const snapshot = buildAnswerMapEstimatorSnapshot({
      estimatorId: "bathroom",
      estimatorLabel: "Bathroom Remodeling",
      source: "bathroom",
      answers: { bathroomType: "primary", lengthFt: "8", photo_count: "2" },
      contact: { firstName: "Jane", zipCode: "20850", privacyAcknowledged: true },
    });

    expect(snapshot.answers).toMatchObject({ bathroomType: "primary", lengthFt: "8", photo_count: "2" });
    expect(snapshot.contact).toMatchObject({ zipCode: "20850", privacyAcknowledged: true });
    expect(snapshot.sections[0].fields).toHaveLength(3);
  });

  it("reads legacy standard answer blobs without exposing internal IDs", () => {
    const snapshot = snapshotFromLegacyQualificationNotes(
      JSON.stringify({ answers: { job_type: "repair" }, notes: "Call after 5." }),
      "HVAC",
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.answers.job_type).toBe("repair");
    expect(snapshot?.notes).toBe("Call after 5.");
    expect(snapshot?.estimate).not.toHaveProperty("id");
  });
});
