import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/**
 * Paginated, filtered, searchable list of prospect contacts (ContractorInquiry).
 * Includes email stats (last sent, reply count) via EmailMessage join.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const url = req.nextUrl;
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "50", 10), 200);
    const search = url.searchParams.get("search") || "";
    const trade = url.searchParams.get("trade") || "";
    const city = url.searchParams.get("city") || "";
    const status = url.searchParams.get("status") || "";
    const tag = url.searchParams.get("tag") || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    const where: any = { isDemo: false };
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }
    if (trade) where.trade = trade;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (status) where.status = status;
    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }

    const [total, rows] = await Promise.all([
      prisma.contractorInquiry.count({ where }),
      prisma.contractorInquiry.findMany({
        where,
        orderBy: { [sortBy]: sortOrder as "asc" | "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tags: { include: { tag: true } },
        },
      }),
    ]);

    // Get email stats for each contact in one batch
    const emails = rows.map((r) => r.email.toLowerCase());
    const emailStats = emails.length
      ? await prisma.$queryRaw<{ email: string; last_sent: Date | null; outbound_count: bigint; inbound_count: bigint }[]>`
          SELECT
            LOWER("toEmail") as email,
            MAX(CASE WHEN direction='outbound' THEN "createdAt" END) as last_sent,
            COUNT(CASE WHEN direction='outbound' THEN 1 END)::bigint as outbound_count,
            COUNT(CASE WHEN direction='inbound' THEN 1 END)::bigint as inbound_count
          FROM "EmailMessage"
          WHERE LOWER("toEmail") IN (${emails.map((e) => `'${e}'`).join(",")})
          GROUP BY LOWER("toEmail")
        `
      : [];
    const statsMap = new Map(emailStats.map((s) => [s.email, s]));

    const contacts = rows.map((r) => {
      const stats = statsMap.get(r.email.toLowerCase());
      return {
        ...r,
        tags: r.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
        lastContacted: stats?.last_sent || null,
        emailsSent: Number(stats?.outbound_count || 0),
        repliesReceived: Number(stats?.inbound_count || 0),
      };
    });

    return NextResponse.json({ contacts, total, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load contacts" }, { status: e?.status || 500 });
  }
}

/**
 * Create a single contact (ContractorInquiry).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const body = await req.json();
    const {
      companyName, contactName, email, phone, trade, serviceZips,
      city, state, website, status, yearsInBusiness, employeeCount,
      licensedInsured, usesLeadGen, avgJobSize, referralSource, source,
    } = body;

    if (!email || !companyName) {
      return NextResponse.json({ error: "Company name and email are required" }, { status: 400 });
    }

    const existing = await prisma.contractorInquiry.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A contact with this email already exists", existingId: existing.id },
        { status: 409 }
      );
    }

    const contact = await prisma.contractorInquiry.create({
      data: {
        companyName: companyName || "",
        contactName: contactName || "",
        email: email.toLowerCase(),
        phone: phone || "",
        trade: trade || "contractor",
        serviceZips: serviceZips || "",
        city: city || null,
        state: state || null,
        website: website || null,
        status: status || "new",
        yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness, 10) : null,
        employeeCount: employeeCount ? parseInt(employeeCount, 10) : null,
        licensedInsured: !!licensedInsured,
        usesLeadGen: !!usesLeadGen,
        avgJobSize: avgJobSize || null,
        referralSource: referralSource || null,
        source: source || "manual",
        isDemo: false,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create contact" }, { status: e?.status || 500 });
  }
}
