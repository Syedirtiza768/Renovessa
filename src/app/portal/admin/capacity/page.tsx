import { prisma } from "@/lib/db";

export default async function CapacityPage() {
  const cells = await prisma.capacityCell.findMany({
    include: { contractors: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Renovessa Capacity Map</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cells.map((cell) => (
          <div key={cell.id} className="card-accent p-4">
            <h2 className="font-semibold">{cell.name}</h2>
            <p className="text-sm text-muted">{cell.trade}</p>
            <p className="mt-2 text-xs">ZIPs: {cell.zipCluster.join(", ")}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className={`badge-${cell.status === "OPEN" ? "green" : cell.status === "FULL" ? "amber" : "neutral"}`}>{cell.status}</span>
              <span>{cell.contractors.length} / {cell.maxSlots} slots</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
