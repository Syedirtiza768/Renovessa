import { describe, it, expect } from "vitest";
import { hasCaptureContent } from "@/lib/bathroom/layout-templates";
import { rfpSubmissionSchema } from "@/lib/bathroom/schemas";

describe("hasCaptureContent (Capture step gating)", () => {
  it("blocks a completely empty capture", () => {
    expect(hasCaptureContent({})).toBe(false);
  });

  it("passes with a room size band alone (minimum-effort homeowner)", () => {
    expect(hasCaptureContent({ roomSizeBand: "medium" })).toBe(true);
  });

  it("passes with a bathroom type alone", () => {
    expect(hasCaptureContent({ bathroomType: "primary" })).toBe(true);
  });

  it("passes with a description of 10+ characters", () => {
    expect(hasCaptureContent({ requirementsPrompt: "replace the tub please" })).toBe(true);
  });

  it("rejects a too-short description with nothing else", () => {
    expect(hasCaptureContent({ requirementsPrompt: "tub" })).toBe(false);
  });

  it("passes with uploaded photos", () => {
    expect(hasCaptureContent({ photo_count: "3" })).toBe(true);
  });

  it("does not pass when photo_count is zero", () => {
    expect(hasCaptureContent({ photo_count: "0" })).toBe(false);
  });
});

describe("rfpSubmissionSchema", () => {
  const valid = {
    firstName: "Jane",
    email: "jane@example.com",
    phone: "3015551234",
    zipCode: "20850",
    tcpaConsent: false,
    termsAccepted: true as const,
    privacyAcknowledged: true as const,
  };

  it("accepts a valid minimal payload (last name optional)", () => {
    const parsed = rfpSubmissionSchema.parse(valid);
    expect(parsed.firstName).toBe("Jane");
    expect(parsed.lastName).toBeUndefined();
    expect(parsed.tcpaConsent).toBe(false);
  });

  it("accepts the full payload with optional fields", () => {
    const parsed = rfpSubmissionSchema.parse({
      ...valid,
      lastName: "Doe",
      preferredContact: "text",
      timeline: "1-3 months",
      tcpaConsent: true,
      notes: "HOA requires approval",
    });
    expect(parsed.lastName).toBe("Doe");
    expect(parsed.timeline).toBe("1-3 months");
  });

  it("rejects a non-10-digit phone", () => {
    expect(() => rfpSubmissionSchema.parse({ ...valid, phone: "555" })).toThrow();
  });

  it("rejects a non-5-digit ZIP", () => {
    expect(() => rfpSubmissionSchema.parse({ ...valid, zipCode: "2085" })).toThrow();
  });

  it("rejects an invalid email", () => {
    expect(() => rfpSubmissionSchema.parse({ ...valid, email: "not-an-email" })).toThrow();
  });

  it("requires terms acceptance (literal true)", () => {
    expect(() => rfpSubmissionSchema.parse({ ...valid, termsAccepted: false })).toThrow();
  });

  it("requires privacy acknowledgement (literal true)", () => {
    expect(() => rfpSubmissionSchema.parse({ ...valid, privacyAcknowledged: false })).toThrow();
  });

  it("requires first name", () => {
    expect(() => rfpSubmissionSchema.parse({ ...valid, firstName: "" })).toThrow();
  });
});
