import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ReconciliationClient } from "./reconciliation-client";

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string; from?: string; to?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const params = await searchParams;
  const user = session.user as any;
  const isGerant = user.role === "GERANT";

  const stationId = isGerant ? user.stationId : (params.stationId || "");

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = params.from || firstOfMonth.toISOString().split("T")[0];
  const to = params.to || now.toISOString().split("T")[0];

  const stations = isGerant
    ? []
    : await db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  const movements = stationId
    ? await db.tankMovement.findMany({
        where: {
          stationId,
          date: { gte: new Date(from), lte: new Date(to) },
        },
        include: {
          tank: { select: { name: true, capacity: true } },
          fuel: { select: { name: true, code: true } },
        },
        orderBy: [{ date: "desc" }, { tankId: "asc" }],
      })
    : [];

  // Compute anomaly stats
  const totalGap = movements.reduce((s, m) => s + (m.gap ? Number(m.gap) : 0), 0);
  const anomalies = movements.filter((m) => m.gap && Math.abs(Number(m.gap)) > 50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Réconciliation des cuves</h1>
        <p className="text-gray-500 mt-1">Stock théorique vs physique — détection des écarts et fuites</p>
      </div>
      <ReconciliationClient
        movements={movements.map((m) => ({
          id: m.id,
          date: m.date.toISOString(),
          tankName: m.tank.name,
          tankCapacity: Number(m.tank.capacity),
          fuelName: m.fuel.name,
          fuelCode: m.fuel.code,
          openingStock: Number(m.openingStock),
          delivery: Number(m.delivery),
          transfer: Number(m.transfer),
          theoreticalStock: Number(m.theoreticalStock),
          physicalStock: m.physicalStock ? Number(m.physicalStock) : null,
          gap: m.gap ? Number(m.gap) : null,
        }))}
        stations={stations}
        selectedStation={stationId}
        from={from}
        to={to}
        isGerant={isGerant}
        totalGap={totalGap}
        anomalyCount={anomalies.length}
      />
    </div>
  );
}
