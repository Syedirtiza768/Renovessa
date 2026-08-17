import { describe, expect, it } from "vitest";
import {
  briefAccessExpiresAt,
  buildBriefPdfUrl,
  generateBriefAccessToken,
  isValidBriefAccessToken,
} from "../brief-access";

describe("brief access", () => {
  it("generates a tokenized PDF URL", () => {
    const url = buildBriefPdfUrl("project/1", "token/with+chars");
    expect(url).toContain("/api/bathroom-projects/project%2F1/brief/pdf");
    expect(url).toContain("token=token%2Fwith%2Bchars");
  });

  it("accepts an unexpired matching token only", () => {
    const now = new Date("2026-08-17T00:00:00.000Z");
    const token = generateBriefAccessToken();
    const expiresAt = briefAccessExpiresAt(now);

    expect(isValidBriefAccessToken({ token, storedToken: token, expiresAt, now })).toBe(true);
    expect(isValidBriefAccessToken({ token: "wrong", storedToken: token, expiresAt, now })).toBe(false);
    expect(
      isValidBriefAccessToken({
        token,
        storedToken: token,
        expiresAt: new Date(now.getTime() - 1),
        now,
      }),
    ).toBe(false);
  });
});
