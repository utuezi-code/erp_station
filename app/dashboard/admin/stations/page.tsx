import { serialize } from "@/lib/serialize";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { StationsClientPage } from "./stations-client";

export default async function StationsPage() {
  await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const [stations, regions] = await Promise.all([
    db.station.findMany({
      include: {
        region: true,
        _count: { select: { users: true, pumps: true, tanks: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.region.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des stations</h1>
        <p className="text-gray-500 mt-1">{stations.length} station(s) enregistrée(s)</p>
      </div>
      <StationsClientPage stations={serialize(stations)} regions={regions} />
    </div>
  );
}
