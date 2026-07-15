import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { LivraisonsClient } from "./livraisons-client";
import { serialize } from "@/lib/serialize";

export default async function LivraisonsPage() {
  const session = await requireRole(["ADMIN", "GERANT", "DIRECTION_GENERALE"]);
  const user = session.user as any;
  const stationId = user.stationId;

  if (!stationId) return <p className="text-gray-500">Aucune station assignée.</p>;

  const [station, deliveries, fuels] = await Promise.all([
    db.station.findUnique({ where: { id: stationId }, select: { id: true, name: true } }),
    db.fuelDelivery.findMany({
      where: { stationId },
      include: { fuel: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 30,
    }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Livraisons carburant</h1>
        <p className="text-gray-500 mt-1">{station?.name}</p>
      </div>
      <LivraisonsClient stationId={stationId} deliveries={serialize(deliveries)} fuels={fuels} />
    </div>
  );
}
