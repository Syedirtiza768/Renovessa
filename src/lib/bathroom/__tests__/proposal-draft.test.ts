import { describe, it, expect } from "vitest";
import { draftProposalFromPrompt } from "@/lib/bathroom/proposal-draft";

describe("draftProposalFromPrompt", () => {
  it("seeds a contractor-owned price and editable scope", () => {
    const draft = draftProposalFromPrompt({
      prompt: "Tub to shower conversion in Rockville condo, mid-range tile, budget around $22k",
      companyName: "Acme Bath Co",
      clientName: "Jordan Lee",
      bathroomType: "primary",
      projectObjective: "tub_to_shower",
      estimateMid: 20000,
    });
    expect(draft.totalPrice).toBe(22000);
    expect(draft.includedScope.toLowerCase()).toContain("tub");
    expect(draft.exclusions.length).toBeGreaterThan(20);
    expect(draft.note.toLowerCase()).toContain("edit");
  });
});
