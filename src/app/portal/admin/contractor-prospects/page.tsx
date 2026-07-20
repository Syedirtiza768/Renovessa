import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { filterProspects } from "@/lib/contractor-prospects";
import { ContractorProspectsClient } from "./page-client";

export default async function ContractorProspectsPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");

  const initial = filterProspects({ page: 1, pageSize: 40, sort: "fit" });

  return (
    <ContractorProspectsClient
      initialItems={initial.items}
      initialTotal={initial.total}
      initialStats={initial.stats}
      globalStats={initial.globalStats}
      options={initial.options}
    />
  );
}
