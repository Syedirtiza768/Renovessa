/**
 * Customer-facing proposal share helpers (Proposal Studio).
 * Never expose internal costs, margins, or line-item unit costs.
 */

import { randomBytes } from "crypto";

export function generateProposalShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export type CustomerFacingProposal = {
  status: string;
  version: number;
  totalPrice: number;
  includedScope: string;
  exclusions: string;
  materialAllowances: string | null;
  fixtureAllowances: string | null;
  permitHandling: string | null;
  estimatedStartDate: string | null;
  estimatedDuration: string | null;
  paymentSchedule: string | null;
  warranty: string | null;
  changeOrderProcess: string | null;
  optionalUpgrades: string | null;
  suggestedChanges: string | null;
  expirationDate: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  job: {
    referenceNumber: string;
    jobTitle: string | null;
    clientName: string | null;
    bathroomType: string | null;
    projectObjective: string | null;
  };
  contractor: {
    companyName: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    tagline: string | null;
    licenseText: string | null;
    footerText: string | null;
  };
  messages: Array<{
    id: string;
    kind: string;
    body: string;
    authorName: string | null;
    createdAt: string;
  }>;
  locked: boolean;
  canAccept: boolean;
  canDecline: boolean;
  canAskQuestion: boolean;
  expired: boolean;
};

const VIEWABLE = new Set(["SENT", "REVISION_REQUESTED", "ACCEPTED", "DECLINED"]);

export function isProposalShareViewable(status: string): boolean {
  return VIEWABLE.has(status);
}

export function buildCustomerFacingProposal(input: {
  proposal: {
    status: string;
    version: number;
    totalPrice: number;
    includedScope: string;
    exclusions: string;
    materialAllowances: string | null;
    fixtureAllowances: string | null;
    permitHandling: string | null;
    estimatedStartDate: string | null;
    estimatedDuration: string | null;
    paymentSchedule: string | null;
    warranty: string | null;
    changeOrderProcess: string | null;
    optionalUpgrades: string | null;
    suggestedChanges: string | null;
    expirationDate: Date | null;
    shareExpiresAt: Date | null;
    sentAt: Date | null;
    acceptedAt: Date | null;
    declinedAt: Date | null;
  };
  project: {
    referenceNumber: string;
    jobTitle: string | null;
    clientName: string | null;
    bathroomType: string | null;
    projectObjective: string | null;
  };
  contractor: {
    companyName: string;
    contactPerson: string | null;
    letterheadPhone: string | null;
    letterheadEmail: string | null;
    letterheadAddress: string | null;
    letterheadTagline: string | null;
    letterheadLicenseText: string | null;
    proposalFooterText: string | null;
  };
  messages?: Array<{
    id: string;
    kind: string;
    body: string;
    authorName: string | null;
    createdAt: Date;
  }>;
}): CustomerFacingProposal {
  const p = input.proposal;
  const now = Date.now();
  const expired =
    (p.shareExpiresAt != null && p.shareExpiresAt.getTime() < now) ||
    (p.expirationDate != null && p.expirationDate.getTime() < now);
  const locked = p.status === "ACCEPTED" || p.status === "DECLINED" || expired;
  const interactive = p.status === "SENT" || p.status === "REVISION_REQUESTED";

  return {
    status: p.status,
    version: p.version,
    totalPrice: p.totalPrice,
    includedScope: p.includedScope,
    exclusions: p.exclusions,
    materialAllowances: p.materialAllowances,
    fixtureAllowances: p.fixtureAllowances,
    permitHandling: p.permitHandling,
    estimatedStartDate: p.estimatedStartDate,
    estimatedDuration: p.estimatedDuration,
    paymentSchedule: p.paymentSchedule,
    warranty: p.warranty,
    changeOrderProcess: p.changeOrderProcess,
    optionalUpgrades: p.optionalUpgrades,
    suggestedChanges: p.suggestedChanges,
    expirationDate: p.expirationDate?.toISOString() ?? null,
    sentAt: p.sentAt?.toISOString() ?? null,
    acceptedAt: p.acceptedAt?.toISOString() ?? null,
    declinedAt: p.declinedAt?.toISOString() ?? null,
    job: {
      referenceNumber: input.project.referenceNumber,
      jobTitle: input.project.jobTitle,
      clientName: input.project.clientName,
      bathroomType: input.project.bathroomType,
      projectObjective: input.project.projectObjective,
    },
    contractor: {
      companyName: input.contractor.companyName,
      contactPerson: input.contractor.contactPerson,
      phone: input.contractor.letterheadPhone,
      email: input.contractor.letterheadEmail,
      address: input.contractor.letterheadAddress,
      tagline: input.contractor.letterheadTagline,
      licenseText: input.contractor.letterheadLicenseText,
      footerText: input.contractor.proposalFooterText,
    },
    messages: (input.messages || [])
      .filter((m) => m.kind !== "internal")
      .map((m) => ({
        id: m.id,
        kind: m.kind,
        body: m.body,
        authorName: m.authorName,
        createdAt: m.createdAt.toISOString(),
      })),
    locked,
    canAccept: interactive && !expired,
    canDecline: interactive && !expired,
    canAskQuestion: interactive && !expired,
    expired,
  };
}

/** Snapshot stored at acceptance — exact customer-facing content. */
export function buildAcceptanceSnapshot(view: CustomerFacingProposal) {
  return {
    version: view.version,
    totalPrice: view.totalPrice,
    includedScope: view.includedScope,
    exclusions: view.exclusions,
    materialAllowances: view.materialAllowances,
    fixtureAllowances: view.fixtureAllowances,
    permitHandling: view.permitHandling,
    estimatedStartDate: view.estimatedStartDate,
    estimatedDuration: view.estimatedDuration,
    paymentSchedule: view.paymentSchedule,
    warranty: view.warranty,
    changeOrderProcess: view.changeOrderProcess,
    optionalUpgrades: view.optionalUpgrades,
    suggestedChanges: view.suggestedChanges,
    job: view.job,
    contractor: {
      companyName: view.contractor.companyName,
      licenseText: view.contractor.licenseText,
    },
    snapshotAt: new Date().toISOString(),
  };
}
