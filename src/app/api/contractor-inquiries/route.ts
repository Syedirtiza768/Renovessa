import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendContractorApplicationConfirmationEmail } from "@/lib/confirmationEmails";

const schema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email(),
  trade: z.string().min(1),
  serviceZips: z.string().min(1),
  yearsInBusiness: z.string().optional(),
  employeeCount: z.string().optional(),
  licensedInsured: z.boolean(),
  usesLeadGen: z.boolean(),
  avgJobSize: z.string().optional(),
  referralSource: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    await prisma.contractorInquiry.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        trade: data.trade,
        serviceZips: data.serviceZips,
        yearsInBusiness: data.yearsInBusiness ? parseInt(data.yearsInBusiness) : null,
        employeeCount: data.employeeCount ? parseInt(data.employeeCount) : null,
        licensedInsured: data.licensedInsured,
        usesLeadGen: data.usesLeadGen,
        avgJobSize: data.avgJobSize,
        referralSource: data.referralSource,
      },
    });

    const confirmationEmailSent = await sendContractorApplicationConfirmationEmail({
      to: data.email,
      contactName: data.contactName,
      companyName: data.companyName,
      trade: data.trade,
      serviceZips: data.serviceZips,
    });

    return NextResponse.json({ success: true, confirmationEmailSent });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}
