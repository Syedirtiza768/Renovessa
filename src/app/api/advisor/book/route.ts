import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateReferenceNumber } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit";
import { getSendGridClient } from "@/lib/sendgrid";
import { matchesPilotCell, matchesPilotTrade } from "@/lib/first-job-config";

/**
 * POST /api/advisor/book — Direct booking from the AI advisor.
 *
 * Creates a homeowner account (or resets password if account exists),
 * creates a ProjectRequest, finds a matching contractor, creates a
 * SCHEDULED appointment, and sends a confirmation email with credentials.
 */

const schema = z.object({
  categoryIds: z.array(z.string()).min(1),
  urgency: z.string().default(""),
  budget: z.string().default(""),
  description: z.string().default(""),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  zipCode: z.string().length(5, "ZIP code must be 5 digits"),
  preferredTime: z.string().default("any"),
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function getNextBusinessDate(preferredTime: string): Date {
  const now = new Date();
  let daysAhead = 1; // tomorrow
  const day = now.getDay();
  // Skip to Monday if it's Friday (5), Saturday (6), or Sunday (0)
  if (day === 5) daysAhead = 3;
  else if (day === 6) daysAhead = 2;
  else if (day === 0) daysAhead = 1;

  const date = new Date(now);
  date.setDate(date.getDate() + daysAhead);

  const hourMap: Record<string, number> = {
    morning: 9,
    afternoon: 13,
    evening: 17,
  };
  date.setHours(hourMap[preferredTime] ?? 10, 0, 0, 0);
  return date;
}

async function findMatchingContractor(trade: string, zipCode: string) {
  // Case-insensitive trade match — the LLM emits lowercase ids (e.g. "hvac")
  // but contractor profiles may store uppercase ("HVAC").
  const contractors = await prisma.contractorProfile.findMany({
    where: {
      trade: { equals: trade, mode: "insensitive" },
      tier: { notIn: ["SUSPENDED", "BANNED"] },
      status: "active",
      serviceZips: { has: zipCode },
    },
    include: {
      user: { select: { id: true, email: true } },
      capacityCells: { select: { appointmentLimit: true } },
    },
    orderBy: { tier: "asc" },
  });

  if (contractors.length === 0) return null;

  // Sort by tier priority: PREFERRED > STANDARD > TRIAL
  const tierOrder: Record<string, number> = { PREFERRED: 0, STANDARD: 1, TRIAL: 2 };
  contractors.sort((a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9));

  // Check capacity for each, return first available
  for (const contractor of contractors) {
    const activeCount = await prisma.appointment.count({
      where: {
        contractorId: contractor.id,
        status: { notIn: ["DECLINED", "CANCELLED", "COMPLETED", "HOMEOWNER_CONFIRMED", "BILLED", "NO_SHOW", "DISPUTED"] },
      },
    });

    const limitCell = contractor.capacityCells?.[0];
    const limit = limitCell?.appointmentLimit ?? 20;
    if (activeCount < limit) return contractor;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const trade = data.categoryIds[0];
    const serviceCellMatch = matchesPilotCell(data.zipCode) && matchesPilotTrade(trade);

    // ── 1. Create or update homeowner account ──
    let homeownerId: string;
    let tempPassword: string;
    let isExistingAccount = false;

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (existingUser?.role === "HOMEOWNER") {
      tempPassword = generateTempPassword();
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash: await bcrypt.hash(tempPassword, 12) },
      });
      homeownerId = existingUser.id;
      isExistingAccount = true;
    } else if (!existingUser) {
      tempPassword = generateTempPassword();
      const newUser = await prisma.user.create({
        data: {
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
          phone: data.phone,
          passwordHash: await bcrypt.hash(tempPassword, 12),
          role: "HOMEOWNER",
        },
      });
      homeownerId = newUser.id;
    } else {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in or use a different email." },
        { status: 409 }
      );
    }

    // ── 2. Create ProjectRequest ──
    const referenceNumber = generateReferenceNumber();

    const project = await prisma.projectRequest.create({
      data: {
        referenceNumber,
        homeownerId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        zipCode: data.zipCode,
        trade,
        description: data.description,
        urgency: data.urgency || "Within 2 weeks",
        budgetRange: data.budget || "Not specified",
        preferredContact: data.preferredTime,
        tcpaConsent: true,
        status: "NEW",
        source: "ai_advisor",
        serviceCellMatch,
      },
    });

    await logAuditEvent({
      eventType: "FORM_SUBMITTED",
      description: `Project request ${referenceNumber} submitted via AI advisor`,
      projectRequestId: project.id,
      actorId: homeownerId,
    });

    await logAuditEvent({
      eventType: "CONSENT_RECORDED",
      description: "TCPA/SMS consent recorded via AI advisor booking",
      projectRequestId: project.id,
    });

    // ── 3. Find matching contractor ──
    const contractor = await findMatchingContractor(trade, data.zipCode);

    let appointment: { id: string; scheduledAt: Date | null; contractor: { companyName: string } } | null = null;

    if (contractor) {
      const scheduledAt = getNextBusinessDate(data.preferredTime);

      appointment = await prisma.appointment.create({
        data: {
          projectRequestId: project.id,
          contractorId: contractor.id,
          status: "SCHEDULED",
          scheduledAt,
          acceptedAt: new Date(),
          opportunitySentAt: new Date(),
        },
        include: { contractor: { select: { companyName: true } } },
      });

      await prisma.projectRequest.update({
        where: { id: project.id },
        data: { status: "APPOINTMENT_CONFIRMED" },
      });

      await logAuditEvent({
        eventType: "CONTRACTOR_ACCEPTED",
        description: `Auto-matched with ${contractor.companyName} for ${scheduledAt.toLocaleString()}`,
        projectRequestId: project.id,
        appointmentId: appointment.id,
        metadata: { contractorId: contractor.id, autoBooked: true },
      });

      // Notify contractor
      try {
        await prisma.notification.create({
          data: {
            userId: contractor.user.id,
            title: "New scheduled appointment",
            message: `You have a new ${trade} appointment on ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. ZIP: ${data.zipCode}.`,
            actionUrl: "/portal/contractor",
          },
        });
      } catch {
        // Notification failure is non-fatal
      }
    }

    // ── 4. Send confirmation email ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://renovessa.com";
    const loginUrl = `${appUrl}/login`;
    const scheduledStr = appointment?.scheduledAt
      ? appointment.scheduledAt.toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      : null;

    const emailSubject = appointment
      ? `Your Renovessa appointment is confirmed — ${referenceNumber}`
      : `Your Renovessa project request — ${referenceNumber}`;

    const emailBody = appointment
      ? `Hi ${data.firstName},

Your ${trade} appointment is booked! Here are the details:

Appointment: ${scheduledStr}
Contractor: ${appointment.contractor.companyName}

Your Renovessa portal login:
  URL: ${loginUrl}
  Email: ${data.email}
  Password: ${tempPassword}

Log in anytime to view your project status, appointment details, and communication history.

If you need to reschedule or have questions, just reply to this email.

Welcome to Renovessa!
Ray Cooper
Renovessa`
      : `Hi ${data.firstName},

Thanks for your ${trade} request with Renovessa! We've received your details and are matching you with a vetted contractor in your area.

Your Renovessa portal login:
  URL: ${loginUrl}
  Email: ${data.email}
  Password: ${tempPassword}

We'll reach out shortly with your appointment details.

If you have questions, just reply to this email.

Welcome to Renovessa!
Ray Cooper
Renovessa`;

    try {
      const sg = getSendGridClient();
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || "ops@renovessa.com";
      const fromName = process.env.SENDGRID_FROM_NAME || "Renovessa";

      await sg.send({
        to: data.email,
        from: { email: fromEmail, name: fromName },
        replyTo: "ray@renovessa.com",
        subject: emailSubject,
        text: emailBody,
      });

      await prisma.emailMessage.create({
        data: {
          fromEmail,
          toEmail: data.email,
          subject: emailSubject,
          body: emailBody,
          status: "sent",
          projectRequestId: project.id,
        },
      });

      await logAuditEvent({
        eventType: "EMAIL_SENT",
        description: `Confirmation email sent to ${data.email} with account credentials`,
        projectRequestId: project.id,
        actorId: homeownerId,
        metadata: { template: "booking_confirmation", appointmentId: appointment?.id },
      });
    } catch (emailErr) {
      console.error("Failed to send confirmation email:", emailErr);
      // Non-fatal: the booking is still valid, email failure is logged but doesn't block
    }

    return NextResponse.json({
      success: true,
      referenceNumber,
      projectId: project.id,
      email: data.email,
      tempPassword,
      isExistingAccount,
      appointment: appointment
        ? {
            id: appointment.id,
            scheduledAt: appointment.scheduledAt,
            contractorName: appointment.contractor.companyName,
          }
        : null,
      contractorMatched: !!contractor,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}
