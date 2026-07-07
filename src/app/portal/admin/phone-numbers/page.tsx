import { redirect } from "next/navigation";
import { getSession, canManageTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PhoneNumberAssignment } from "@/components/admin/PhoneNumberAssignment";

export default async function PhoneNumbersPage() {
  const session = await getSession();
  if (!session || !canManageTeam(session.role)) redirect("/portal/admin");

  const [numbers, agents] = await Promise.all([
    prisma.twilioPhoneNumber.findMany({
      include: { assignedUser: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "OPS_AGENT", "SCHEDULER", "OPS_MANAGER"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Phone Numbers</h1>
      <p className="mt-2 text-sm text-muted">
        Twilio numbers agents call contractors and homeowners from. Assign a number to an agent so their
        caller ID stays consistent; an agent can hold more than one number.
      </p>

      <div className="mt-6">
        <PhoneNumberAssignment
          numbers={numbers.map((n) => ({
            id: n.id,
            phoneNumber: n.phoneNumber,
            label: n.label,
            isActive: n.isActive,
            assignedUserId: n.assignedUserId,
            assignedUserName: n.assignedUser?.name ?? null,
          }))}
          agents={agents}
        />
      </div>
    </div>
  );
}
