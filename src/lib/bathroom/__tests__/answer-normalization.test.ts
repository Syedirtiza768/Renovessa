import { describe, it, expect } from "vitest";
import {
  normalizeAnswers,
  getCanonical,
  setCanonical,
  hasLocation,
  resolveLocationId,
  isSupportedZip,
} from "@/lib/bathroom/answer-normalization";

describe("answer-normalization", () => {
  it("normalizes legacy keys to canonical keys", () => {
    const raw = {
      length: "8",
      width: "5",
      ceilingHeight: "9",
      measurement_method: "simple",
      zip: "20850",
    };
    const normalized = normalizeAnswers(raw);
    expect(normalized.lengthFt).toBe("8");
    expect(normalized.widthFt).toBe("5");
    expect(normalized.ceilingFt).toBe("9");
    expect(normalized.measurementMethod).toBe("simple");
    expect(normalized.zipCode).toBe("20850");
    // Original keys preserved
    expect(normalized.length).toBe("8");
    expect(normalized.width).toBe("5");
  });

  it("does not overwrite canonical keys with legacy values", () => {
    const raw = {
      lengthFt: "10",
      length: "8",
    };
    const normalized = normalizeAnswers(raw);
    expect(normalized.lengthFt).toBe("10");
    expect(normalized.length).toBe("8");
  });

  it("getCanonical reads canonical key first", () => {
    const answers = { lengthFt: "10", length: "8" };
    expect(getCanonical(answers, "lengthFt")).toBe("10");
  });

  it("getCanonical falls back to legacy key", () => {
    const answers = { length: "8" };
    expect(getCanonical(answers, "lengthFt")).toBe("8");
  });

  it("setCanonical writes canonical and legacy keys", () => {
    const answers = {};
    const next = setCanonical(answers, "lengthFt", "12");
    expect(next.lengthFt).toBe("12");
    expect(next.length).toBe("12");
  });

  it("hasLocation detects zipCode", () => {
    expect(hasLocation({ zipCode: "20850" })).toBe(true);
    expect(hasLocation({ zip: "20850" })).toBe(true);
    expect(hasLocation({})).toBe(false);
  });

  it("resolveLocationId returns rockville-md for Rockville ZIPs", () => {
    expect(resolveLocationId({ zipCode: "20850" })).toBe("rockville-md");
    expect(resolveLocationId({ zipCode: "20852" })).toBe("rockville-md");
    expect(resolveLocationId({ city: "Rockville" })).toBe("rockville-md");
  });

  it("resolveLocationId returns unknown for unsupported ZIPs", () => {
    expect(resolveLocationId({ zipCode: "90210" })).toBe("unknown");
    expect(resolveLocationId({})).toBe("unknown");
  });

  it("isSupportedZip matches Rockville ZIPs only", () => {
    expect(isSupportedZip("20850")).toBe(true);
    expect(isSupportedZip("90210")).toBe(false);
  });
});
