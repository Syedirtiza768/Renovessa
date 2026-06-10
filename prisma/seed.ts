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

  // Clean in dependency order
  await prisma.feedback.deleteMany();
  await prisma.caseStudy.deleteMany();
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

  // ── Users ──
  const admin = await prisma.user.create({
    data: {
      email: "admin@renovessa.com",
      passwordHash,
      name: "Admin — Renovessa Super Admin",
      role: UserRole.SUPER_ADMIN,
      isDemo: true,
    },
  });

  const opsAgent = await prisma.user.create({
    data: {
      email: "agent@renovessa.com",
      passwordHash,
      name: "Agent — Qualification Agent",
      role: UserRole.OPS_AGENT,
      isDemo: true,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: "sarah.mitchell@demo.renovessa.com",
      passwordHash,
      name: "Sarah Mitchell",
      phone: "2025550101",
      role: UserRole.HOMEOWNER,
      isDemo: true,
    },
  });

  const pilotContractorUser = await prisma.user.create({
    data: {
      email: "hvac@demo.renovessa.com",
      passwordHash,
      name: "Capital Comfort HVAC",
      phone: "7035550201",
      role: UserRole.CONTRACTOR,
      isDemo: true,
    },
  });

  // ── Capacity cell (pilot) ──
  const pilotCell = await prisma.capacityCell.create({
    data: {
      name: "HVAC — Fairfax VA Pilot Cell",
      trade: "HVAC",
      zipCluster: ["22030", "22031", "22032", "22033"],
      jobSizeMin: 1000,
      jobSizeMax: 50000,
      maxSlots: 1,
      appointmentLimit: 20,
      status: CapacityCellStatus.OPEN,
      isDemo: true,
    },
  });

  // ── Pilot contractor profile ──
  const pilotContractor = await prisma.contractorProfile.create({
    data: {
      userId: pilotContractorUser.id,
      companyName: "Capital Comfort HVAC",
      trade: "HVAC",
      tier: ContractorTier.PREFERRED,
      licenseVerified: true,
      insuranceVerified: true,
      yearsInBusiness: 12,
      employeeCount: 18,
      avgJobSize: "$5,000-$15,000",
      serviceZips: ["22030", "22031", "22032", "22033"],
      showRate: 96,
      acceptanceRate: 94,
      disputeRate: 2,
      contactPerson: "Mike Chen",
      pilotTerms: "First appointment free for pilot phase",
      firstAppointmentPricing: "free",
      pilotPriceAmount: 0,
      responseTimeHours: 4,
      availabilityNotes: "Weekdays 9am-5pm, Saturdays by appointment",
      isDemo: true,
      capacityCells: { connect: [{ id: pilotCell.id }] },
    },
  });

  // ── Demo lead: complete flow (Sarah → scheduled appointment) ──
  const sarahProject = await prisma.projectRequest.create({
    data: {
      referenceNumber: "RNV-2026-04821",
      homeownerId: sarah.id,
      assignedAgentId: opsAgent.id,
      firstName: "Sarah",
      lastName: "Mitchell",
      email: sarah.email,
      phone: "2025550101",
      zipCode: "22030",
      trade: "HVAC",
      description: "Need full HVAC system replacement for 2,200 sq ft home in Fairfax.",
      urgency: "Within 2 weeks",
      budgetRange: "$8,000-$15,000",
      preferredContact: "Morning",
      tcpaConsent: true,
      address: "1234 Main St, Fairfax, VA 22030",
      ownershipAuthority: "owner",
      preferredAppointmentWindows: "Weekday mornings",
      serviceCellMatch: true,
      reachable: true,
      status: LeadStatus.APPOINTMENT_CONFIRMED,
      source: "organic",
      qualificationNotes: "Homeowner reached, project confirmed, budget plausible, ZIP in pilot cell.",
      disposition: "hot",
      isDemo: true,
    },
  });

  const sarahAppt = await prisma.appointment.create({
    data: {
      projectRequestId: sarahProject.id,
      contractorId: pilotContractor.id,
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      opportunitySentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: AppointmentStatus.SCHEDULED,
      calendarInviteSent: true,
      location: "1234 Main St, Fairfax, VA 22030",
      amount: 0,
      isDemo: true,
    },
  });

  await prisma.invoice.create({
    data: {
      appointmentId: sarahAppt.id,
      contractorId: pilotContractor.id,
      amount: 0,
      status: InvoiceStatus.PENDING,
      pilotProof: true,
      isDemo: true,
    },
  });

  // ── Demo lead: in-progress (new lead) ──
  await prisma.projectRequest.create({
    data: {
      referenceNumber: "RNV-2026-04824",
      firstName: "Marcus",
      lastName: "Webb",
      email: "marcus.webb@example.com",
      phone: "7035550199",
      zipCode: "22031",
      trade: "HVAC",
      description: "AC is blowing warm air, two-story colonial in Fairfax.",
      urgency: "ASAP",
      budgetRange: "$1,000-$5,000",
      tcpaConsent: true,
      address: "5678 Oak Ave, Fairfax, VA 22031",
      ownershipAuthority: "owner",
      serviceCellMatch: true,
      status: LeadStatus.NEW,
      source: "organic",
      isDemo: true,
    },
  });

  // ── Audit trail for Sarah's flow ──
  const auditEvents = [
    { eventType: AuditEventType.FORM_SUBMITTED, description: "Project request RNV-2026-04821 submitted via landing page", projectRequestId: sarahProject.id },
    { eventType: AuditEventType.CONSENT_RECORDED, description: "TCPA/SMS consent recorded", projectRequestId: sarahProject.id },
    { eventType: AuditEventType.SMS_SENT, description: "Confirmation SMS sent to homeowner", projectRequestId: sarahProject.id, metadata: { template: "project_received" } },
    { eventType: AuditEventType.STATUS_CHANGED, description: "Lead status changed from NEW to ASSIGNED", actorId: admin.id, projectRequestId: sarahProject.id, metadata: { from: "NEW", to: "ASSIGNED" } },
    { eventType: AuditEventType.CALL_MADE, description: "Call completed — homeowner reached, project confirmed", actorId: opsAgent.id, projectRequestId: sarahProject.id, metadata: { channel: "call_completed", outcome: "answered" } },
    { eventType: AuditEventType.QUALIFICATION_DECISION, description: "Lead marked Qualified", actorId: opsAgent.id, projectRequestId: sarahProject.id },
    { eventType: AuditEventType.CONTRACTOR_OFFERED, description: "Opportunity sent to Capital Comfort HVAC", actorId: admin.id, projectRequestId: sarahProject.id, appointmentId: sarahAppt.id },
    { eventType: AuditEventType.CONTRACTOR_ACCEPTED, description: "Contractor accepted appointment", projectRequestId: sarahProject.id, appointmentId: sarahAppt.id },
    { eventType: AuditEventType.CALENDAR_INVITE_SENT, description: "Appointment scheduled for 3 days from now", actorId: admin.id, projectRequestId: sarahProject.id, appointmentId: sarahAppt.id },
    { eventType: AuditEventType.REMINDER_SENT, description: "Reminder sent to homeowner and contractor", actorId: admin.id, projectRequestId: sarahProject.id, appointmentId: sarahAppt.id },
  ];

  for (const event of auditEvents) {
    await prisma.auditEvent.create({ data: event });
  }

  await prisma.notification.createMany({
    data: [
      { userId: sarah.id, title: "Appointment Scheduled", message: "Your HVAC appointment with Capital Comfort HVAC is confirmed for 3 days from now.", actionUrl: "/portal/homeowner" },
      { userId: pilotContractorUser.id, title: "New Appointment", message: "You have a confirmed HVAC appointment for Sarah Mitchell.", actionUrl: "/portal/contractor" },
      { userId: admin.id, title: "New Lead", message: "New project request RNV-2026-04824 from Marcus Webb.", actionUrl: "/portal/admin/leads" },
    ],
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Demo accounts (password: demo1234):");
  console.log("  Admin:       admin@renovessa.com");
  console.log("  Ops Agent:   agent@renovessa.com");
  console.log("  Homeowner:   sarah.mitchell@demo.renovessa.com");
  console.log("  Contractor:  hvac@demo.renovessa.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
