import { serialize } from "@/lib/serialize";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { CommercialClient } from "./commercial-client";

export default async function DirectionCommercialePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; stationId?: string }>;
}) {
  await requireRole(["ADMIN", "DIRECTION_COMMERCIALE"]);
  const params = await searchParams;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = params.from || firstOfMonth.toISOString().split("T")[0];
  const to = params.to || today.toISOString().split("T")[0];
  const stationId = params.stationId || "";

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const stationFilter = stationId ? { stationId } : {};

  // Per-station aggregates
  const salesByStation = await db.dailyIndex.groupBy({
    by: ["stationId"],
    where: {
      date: { gte: new Date(from), lte: new Date(to) },
      ...stationFilter,
    },
    _sum: { volumeSold: true, revenue: true },
  });

  const stationMap = Object.fromEntries(stations.map((s) => [s.id, s.name]));

  const stationResults = salesByStation.map((r) => ({
    stationId: r.stationId,
    stationName: stationMap[r.stationId] || r.stationId,
    volume: Number(r._sum.volumeSold || 0),
    revenue: Number(r._sum.revenue || 0),
  })).sort((a, b) => b.revenue - a.revenue);

  // Daily evolution
  const dailySales = await db.dailyIndex.groupBy({
    by: ["date"],
    where: {
      date: { gte: new Date(from), lte: new Date(to) },
      ...stationFilter,
    },
    _sum: { volumeSold: true, revenue: true },
    orderBy: { date: "asc" },
  });

  const dailyData = dailySales.map((d) => ({
    date: new Date(d.date).toISOString().split("T")[0],
    volume: Number(d._sum.volumeSold || 0),
    revenue: Number(d._sum.revenue || 0),
  }));

  // Per-fuel breakdown
  const salesByFuel = await db.dailyIndex.groupBy({
    by: ["nozzleId"],
    where: {
      date: { gte: new Date(from), lte: new Date(to) },
      ...stationFilter,
    },
    _sum: { volumeSold: true, revenue: true },
  });

  const nozzles = await db.nozzle.findMany({
    where: { id: { in: salesByFuel.map((s) => s.nozzleId) } },
    include: { fuel: { select: { name: true, code: true } } },
  });
  const nozzleMap = Object.fromEntries(nozzles.map((n) => [n.id, n.fuel]));

  const fuelTotals: Record<string, { name: string; volume: number; revenue: number }> = {};
  for (const r of salesByFuel) {
    const fuel = nozzleMap[r.nozzleId];
    if (!fuel) continue;
    const key = fuel.code;
    if (!fuelTotals[key]) fuelTotals[key] = { name: fuel.name, volume: 0, revenue: 0 };
    fuelTotals[key].volume += Number(r._sum.volumeSold || 0);
    fuelTotals[key].revenue += Number(r._sum.revenue || 0);
  }
  const fuelData = Object.values(fuelTotals).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = stationResults.reduce((s, r) => s + r.revenue, 0);
  const totalVolume = stationResults.reduce((s, r) => s + r.volume, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suivi commercial</h1>
        <p className="text-gray-500 mt-1">CA, volumes et classement des stations</p>
      </div>
      <CommercialClient
        stations={stations}
        selectedStation={stationId}
        from={from}
        to={to}
        stationResults={stationResults}
        dailyData={dailyData}
        fuelData={fuelData}
        totalRevenue={totalRevenue}
        totalVolume={totalVolume}
      />
    </div>
  );
}
