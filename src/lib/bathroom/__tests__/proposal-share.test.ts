import { describe, it, expect } from "vitest";
import {
  buildAcceptanceSnapshot,
  buildCustomerFacingProposal,
  isProposalShareViewable,
} from "@/lib/bathroom/proposal-share";

const base = {
  proposal: {
    status: "SENT",
    version: 1,
    totalPrice: 22000,
    includedScope: "Scope",
    exclusions: "Exclusions",
    materialAllowances: null,
    fixtureAllowances: null,
    permitHandling: null,
    estimatedStartDate: null,
    estimatedDuration: null,
    paymentSchedule: null,
    warranty: null,
    changeOrderProcess: null,
    optionalUpgrades: null,
    suggestedChanges: null,
    expirationDate: null as Date | null,
    shareExpiresAt: new Date(Date.now() + 86400000),
    sentAt: new Date(),
    acceptedAt: null as Date | null,
    declinedAt: null as Date | null,
  },
  project: {
    referenceNumber: "BR-1",
    jobTitle: "Primary bath",
    clientName: "Jordan",
    bathroomType: "primary",
    projectObjective: "tub_to_shower",
  },
  contractor: {
    companyName: "Acme Bath",
    contactPerson: "Alex",
    letterheadPhone: "3015550100",
    letterheadEmail: "alex@acme.test",
    letterheadAddress: "Rockville, MD",
    letterheadTagline: null,
    letterheadLicenseText: "MHIC #123",
    proposalFooterText: null,
  },
};

describe("proposal-share", () => {
  it("only allows customer viewing for issued statuses", () => {
    expect(isProposalShareViewable("SENT")).toBe(true);
    expect(isProposalShareViewable("DRAFT")).toBe(false);
    expect(isProposalShareViewable("APPROVED")).toBe(false);
    expect(isProposalShareViewable("ACCEPTED")).toBe(true);
  });

  it("strips internal fields and enables accept on SENT", () => {
    const view = buildCustomerFacingProposal(base);
    expect(view.canAccept).toBe(true);
    expect(view.totalPrice).toBe(22000);
    expect(view.contractor.companyName).toBe("Acme Bath");
    expect((view as any).lineItemsJson).toBeUndefined();
    expect((view as any).directCostTotal).toBeUndefined();
    expect((view as any).grossMarginPercent).toBeUndefined();
  });

  it("locks accepted proposals", () => {
    const view = buildCustomerFacingProposal({
      ...base,
      proposal: {
        ...base.proposal,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
    expect(view.locked).toBe(true);
    expect(view.canAccept).toBe(false);
    const snap = buildAcceptanceSnapshot(view);
    expect(snap.version).toBe(1);
    expect(snap.totalPrice).toBe(22000);
  });

  it("marks expired shares", () => {
    const view = buildCustomerFacingProposal({
      ...base,
      proposal: {
        ...base.proposal,
        shareExpiresAt: new Date(Date.now() - 1000),
      },
    });
    expect(view.expired).toBe(true);
    expect(view.canAccept).toBe(false);
  });
});
