import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { StocksClientPage } from "./stocks-client";

export default async function StocksPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const user = session.user as any;
  const stationId = user.stationId;

  const today = new Date().toISOString().split("T")[0];
  const selectedDate = (await searchParams).date || today;

  if (!stationId) {
    return <p className="text-gray-500">Aucune station assignée.</p>;
  }

  const [station, tanks, movements] = await Promise.all([
    db.station.findUnique({ where: { id: stationId }, select: { id: true, name: true } }),
    db.tank.findMany({
      where: { stationId, active: true },
      include: { fuel: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    db.tankMovement.findMany({
      where: { stationId, date: new Date(selectedDate) },
    }),
  ]);

  const movementMap = Object.fromEntries(movements.map((m) => [m.tankId, m]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des stocks cuves</h1>
        <p className="text-gray-500 mt-1">{station?.name}</p>
      </div>
      <StocksClientPage
        stationId={stationId}
        selectedDate={selectedDate}
        tanks={tanks as any}
        movementMap={movementMap as any}
      />
    </div>
  );
}
