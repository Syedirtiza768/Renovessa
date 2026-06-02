import {
  PrismaClient,
  UserRole,
  LeadStatus,
  AppointmentStatus,
  ContractorTier,
  CapacityCellStatus,
  DisputeStatus,
  InvoiceStatus,
  AuditEventType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const passwordHash = bcrypt.hashSync("demo1234", 10);

async function main() {
  console.log("Seeding Renovessa database...");

  await prisma.auditEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.projectRequest.deleteMany();
  await prisma.contractorInquiry.deleteMany();
  await prisma.capacityCell.deleteMany();
  await prisma.contractorProfile.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@renovessa.com",
      passwordHash,
      name: "Demo Admin — Renovessa Super Admin",
      role: UserRole.SUPER_ADMIN,
      isDemo: true,
    },
  });

  const opsAgent = await prisma.user.create({
    data: {
      email: "agent@renovessa.com",
      passwordHash,
      name: "Demo Agent — Qualification Agent",
      role: UserRole.OPS_AGENT,
      isDemo: true,
    },
  });

  const financeManager = await prisma.user.create({
    data: {
      email: "finance@renovessa.com",
      passwordHash,
      name: "Demo Manager — Finance Manager",
      role: UserRole.FINANCE_MANAGER,
      isDemo: true,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: "sarah.mitchell@demo.renovessa.com",
      passwordHash,
      name: "Demo Homeowner — Sarah Mitchell",
      phone: "2025550101",
      role: UserRole.HOMEOWNER,
      isDemo: true,
    },
  });

  const james = await prisma.user.create({
    data: {
      email: "james.carter@demo.renovessa.com",
      passwordHash,
      name: "Demo Homeowner — James Carter",
      phone: "2025550102",
      role: UserRole.HOMEOWNER,
      isDemo: true,
    },
  });

  const lena = await prisma.user.create({
    data: {
      email: "lena.brooks@demo.renovessa.com",
      passwordHash,
      name: "Demo Homeowner — Lena Brooks",
      phone: "2025550103",
      role: UserRole.HOMEOWNER,
      isDemo: true,
    },
  });

  const capitalHvacUser = await prisma.user.create({
    data: {
      email: "hvac@demo.renovessa.com",
      passwordHash,
      name: "Demo Contractor — Capital Comfort HVAC",
      phone: "7035550201",
      role: UserRole.CONTRACTOR,
      isDemo: true,
    },
  });

  const fairfaxRoofUser = await prisma.user.create({
    data: {
      email: "roofing@demo.renovessa.com",
      passwordHash,
      name: "Demo Contractor — Fairfax Roof and Exterior",
      phone: "7035550202",
      role: UserRole.CONTRACTOR,
      isDemo: true,
    },
  });

  const bethesdaBathUser = await prisma.user.create({
    data: {
      email: "bath@demo.renovessa.com",
      passwordHash,
      name: "Demo Contractor — Bethesda Bath Studio",
      phone: "3015550203",
      role: UserRole.CONTRACTOR,
      isDemo: true,
    },
  });

  const hvacCell = await prisma.capacityCell.create({
    data: {
      name: "HVAC — Arlington VA Cluster",
      trade: "HVAC",
      zipCluster: ["22201", "22202", "22203"],
      jobSizeMin: 5000,
      jobSizeMax: 50000,
      maxSlots: 2,
      appointmentLimit: 25,
      status: CapacityCellStatus.OPEN,
      isDemo: true,
    },
  });

  const roofingCell = await prisma.capacityCell.create({
    data: {
      name: "Roofing — Fairfax VA Cluster",
      trade: "Roofing",
      zipCluster: ["22030", "22031", "22032"],
      jobSizeMin: 8000,
      jobSizeMax: 50000,
      maxSlots: 2,
      status: CapacityCellStatus.OPEN,
      isDemo: true,
    },
  });

  const bathroomCell = await prisma.capacityCell.create({
    data: {
      name: "Bathroom — Bethesda MD Cluster",
      trade: "Bathroom",
      zipCluster: ["20814", "20815", "20816"],
      jobSizeMin: 10000,
      jobSizeMax: 50000,
      maxSlots: 2,
      status: CapacityCellStatus.FULL,
      isDemo: true,
    },
  });

  const capitalHvac = await prisma.contractorProfile.create({
    data: {
      userId: capitalHvacUser.id,
      companyName: "Capital Comfort HVAC",
      trade: "HVAC",
      tier: ContractorTier.PREFERRED,
      licenseVerified: true,
      insuranceVerified: true,
      yearsInBusiness: 12,
      employeeCount: 18,
      avgJobSize: "$8,000-$15,000",
      serviceZips: ["22201", "22202", "22203", "22204"],
      showRate: 96,
      acceptanceRate: 94,
      disputeRate: 2,
      isDemo: true,
      capacityCells: { connect: [{ id: hvacCell.id }] },
    },
  });

  const fairfaxRoof = await prisma.contractorProfile.create({
    data: {
      userId: fairfaxRoofUser.id,
      companyName: "Fairfax Roof and Exterior",
      trade: "Roofing",
      tier: ContractorTier.STANDARD,
      licenseVerified: true,
      insuranceVerified: true,
      yearsInBusiness: 8,
      employeeCount: 10,
      serviceZips: ["22030", "22031"],
      isDemo: true,
      capacityCells: { connect: [{ id: roofingCell.id }] },
    },
  });

  const bethesdaBath = await prisma.contractorProfile.create({
    data: {
      userId: bethesdaBathUser.id,
      companyName: "Bethesda Bath Studio",
      trade: "Bathroom",
      tier: ContractorTier.WATCH,
      licenseVerified: true,
      insuranceVerified: true,
      yearsInBusiness: 6,
      employeeCount: 8,
      serviceZips: ["20814", "20815"],
      showRate: 72,
      disputeRate: 18,
      isDemo: true,
      capacityCells: { connect: [{ id: bathroomCell.id }] },
    },
  });

  const sarahProject = await prisma.projectRequest.create({
    data: {
      referenceNumber: "RNV-2026-04821",
      homeownerId: sarah.id,
      assignedAgentId: opsAgent.id,
      firstName: "Sarah",
      lastName: "Mitchell",
      email: sarah.email,
      phone: "2025550101",
      zipCode: "22201",
      trade: "HVAC",
      description: "Need full HVAC system replacement for 2,200 sq ft home in Arlington.",
      urgency: "Within 2 weeks",
      budgetRange: "$8,000-$15,000",
      preferredContact: "Morning",
      tcpaConsent: true,
      status: LeadStatus.APPOINTMENT_CONFIRMED,
      source: "meta_ads",
      qualificationNotes: "Homeowner reached, project confirmed, budget plausible.",
      disposition: "Qualified",
      isDemo: true,
    },
  });

  const jamesProject = await prisma.projectRequest.create({
    data: {
      referenceNumber: "RNV-2026-04822",
      homeownerId: james.id,
      assignedAgentId: opsAgent.id,
      firstName: "James",
      lastName: "Carter",
      email: james.email,
      phone: "2025550102",
      zipCode: "20814",
      trade: "Kitchen",
      description: "Full kitchen remodel including cabinets, countertops, and layout change.",
      urgency: "Within 1 month",
      budgetRange: "$25,000-$50,000",
      tcpaConsent: true,
      status: LeadStatus.QUALIFICATION_IN_PROGRESS,
      source: "google_lsa",
      isDemo: true,
    },
  });

  const lenaProject = await prisma.projectRequest.create({
    data: {
      referenceNumber: "RNV-2026-04823",
      homeownerId: lena.id,
      assignedAgentId: opsAgent.id,
      firstName: "Lena",
      lastName: "Brooks",
      email: lena.email,
      phone: "2025550103",
      zipCode: "20815",
      trade: "Bathroom",
      description: "Master bathroom remodel with walk-in shower.",
      urgency: "ASAP",
      budgetRange: "$12,000-$20,000",
      tcpaConsent: true,
      status: LeadStatus.DISPUTED,
      source: "organic",
      isDemo: true,
    },
  });

  const sarahAppt = await prisma.appointment.create({
    data: {
      projectRequestId: sarahProject.id,
      contractorId: capitalHvac.id,
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: AppointmentStatus.SCHEDULED,
      calendarInviteSent: true,
      amount: 350,
      isDemo: true,
    },
  });

  const lenaAppt = await prisma.appointment.create({
    data: {
      projectRequestId: lenaProject.id,
      contractorId: bethesdaBath.id,
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: AppointmentStatus.DISPUTED,
      amount: 275,
      isDemo: true,
    },
  });

  await prisma.dispute.create({
    data: {
      projectRequestId: lenaProject.id,
      contractorId: bethesdaBath.id,
      status: DisputeStatus.OPEN,
      reason: "Homeowner reports contractor did not arrive for scheduled appointment.",
      evidenceScore: 35,
      isDemo: true,
    },
  });

  await prisma.invoice.create({
    data: {
      appointmentId: sarahAppt.id,
      contractorId: capitalHvac.id,
      amount: 350,
      status: InvoiceStatus.PENDING,
      isDemo: true,
    },
  });

  const newLead = await prisma.projectRequest.create({
    data: {
      referenceNumber: "RNV-2026-04824",
      firstName: "Marcus",
      lastName: "Webb",
      email: "marcus.webb@example.com",
      phone: "7035550199",
      zipCode: "22301",
      trade: "Windows",
      description: "Replace 8 windows in Alexandria townhouse.",
      urgency: "Within 2 weeks",
      budgetRange: "$5,000-$15,000",
      tcpaConsent: true,
      status: LeadStatus.NEW,
      source: "organic",
      isDemo: true,
    },
  });

  const auditEvents = [
    { eventType: AuditEventType.FORM_SUBMITTED, description: "Project request submitted via landing page", projectRequestId: sarahProject.id },
    { eventType: AuditEventType.CONSENT_RECORDED, description: "TCPA/SMS consent recorded", projectRequestId: sarahProject.id },
    { eventType: AuditEventType.SMS_SENT, description: "Confirmation SMS sent to homeowner", projectRequestId: sarahProject.id },
    { eventType: AuditEventType.CALL_MADE, description: "Qualification call completed — homeowner reached", projectRequestId: sarahProject.id, actorId: opsAgent.id },
    { eventType: AuditEventType.QUALIFICATION_DECISION, description: "Lead marked Qualified", projectRequestId: sarahProject.id, actorId: opsAgent.id },
    { eventType: AuditEventType.CONTRACTOR_OFFERED, description: "Appointment offered to Capital Comfort HVAC", projectRequestId: sarahProject.id, appointmentId: sarahAppt.id },
    { eventType: AuditEventType.CONTRACTOR_ACCEPTED, description: "Contractor accepted appointment", projectRequestId: sarahProject.id, appointmentId: sarahAppt.id },
    { eventType: AuditEventType.CALENDAR_INVITE_SENT, description: "Calendar invite sent to homeowner and contractor", projectRequestId: sarahProject.id, appointmentId: sarahAppt.id },
    { eventType: AuditEventType.FORM_SUBMITTED, description: "New project request submitted", projectRequestId: newLead.id },
    { eventType: AuditEventType.DISPUTE_OPENED, description: "Dispute opened — contractor no-show reported", projectRequestId: lenaProject.id, appointmentId: lenaAppt.id },
  ];

  for (const event of auditEvents) {
    await prisma.auditEvent.create({ data: event });
  }

  await prisma.contractorInquiry.create({
    data: {
      companyName: "Demo Plumbing Co",
      contactName: "Mike Johnson",
      phone: "3015550301",
      email: "mike@demoplumbing.com",
      trade: "Plumbing",
      serviceZips: "20814, 20815, 20816",
      yearsInBusiness: 10,
      employeeCount: 6,
      licensedInsured: true,
      usesLeadGen: true,
      avgJobSize: "$2k-$10k",
      referralSource: "Google search",
      isDemo: true,
    },
  });

  await prisma.notification.createMany({
    data: [
      { userId: sarah.id, title: "Appointment Scheduled", message: "Your HVAC appointment with Capital Comfort HVAC is confirmed.", actionUrl: "/portal/homeowner" },
      { userId: capitalHvacUser.id, title: "New Appointment", message: "You have a confirmed appointment for Sarah Mitchell — HVAC.", actionUrl: "/portal/contractor" },
      { userId: admin.id, title: "New Lead", message: "New project request RNV-2026-04824 from Marcus Webb.", actionUrl: "/portal/admin/leads" },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo login: admin@renovessa.com / demo1234");
  console.log("Homeowner: sarah.mitchell@demo.renovessa.com / demo1234");
  console.log("Contractor: hvac@demo.renovessa.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
