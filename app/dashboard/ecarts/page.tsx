import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { EcartsClient } from "./ecarts-client";

export default async function EcartsPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string; from?: string; to?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const params = await searchParams;
  const user = session.user as any;

  const isGerant = user.role === "GERANT";
  const stationFilter = isGerant ? user.stationId : params.stationId;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = params.from || firstOfMonth.toISOString().split("T")[0];
  const to = params.to || today.toISOString().split("T")[0];

  const stations = isGerant
    ? []
    : await db.station.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

  // Get all stations to compute for (one or all)
  const stationsToQuery = stationFilter
    ? [{ id: stationFilter }]
    : await db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } });

  const results = await Promise.all(
    stationsToQuery.map(async (st) => {
      const stationName = stations.find((s) => s.id === st.id)?.name || st.id;

      const [salesAgg, versementsAgg] = await Promise.all([
        db.dailyIndex.aggregate({
          where: {
            stationId: st.id,
            date: { gte: new Date(from), lte: new Date(to) },
          },
          _sum: { revenue: true },
        }),
        db.versement.aggregate({
          where: {
            stationId: st.id,
            date: { gte: new Date(from), lte: new Date(to) },
            status: { not: "REJETE" },
          },
          _sum: { amount: true },
        }),
      ]);

      const totalSales = Number(salesAgg._sum.revenue || 0);
      const totalVersements = Number(versementsAgg._sum.amount || 0);
      const resteAVerser = totalSales - totalVersements;
      const tauxVersement = totalSales > 0 ? (totalVersements / totalSales) * 100 : 0;

      let level: "OK" | "ORANGE" | "RED" = "OK";
      if (resteAVerser > 0) {
        level = tauxVersement < 50 ? "RED" : "ORANGE";
      }

      return {
        stationId: st.id,
        stationName,
        totalSales,
        totalVersements,
        resteAVerser,
        tauxVersement,
        level,
      };
    })
  );

  // Daily breakdown for selected station
  const dailyData = stationFilter
    ? await getDailyEcarts(stationFilter, from, to)
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suivi des écarts</h1>
        <p className="text-gray-500 mt-1">Ventes − Versements = Reste à verser</p>
      </div>
      <EcartsClient
        results={results}
        dailyData={dailyData}
        stations={stations}
        selectedStation={stationFilter || ""}
        from={from}
        to={to}
        isGerant={isGerant}
      />
    </div>
  );
}

async function getDailyEcarts(stationId: string, from: string, to: string) {
  const [dailySales, dailyVersements] = await Promise.all([
    db.dailyIndex.groupBy({
      by: ["date"],
      where: {
        stationId,
        date: { gte: new Date(from), lte: new Date(to) },
      },
      _sum: { revenue: true, volumeSold: true },
      orderBy: { date: "asc" },
    }),
    db.versement.groupBy({
      by: ["date"],
      where: {
        stationId,
        date: { gte: new Date(from), lte: new Date(to) },
        status: { not: "REJETE" },
      },
      _sum: { amount: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const salesMap: Record<string, number> = {};
  const volumeMap: Record<string, number> = {};
  for (const s of dailySales) {
    const key = new Date(s.date).toISOString().split("T")[0];
    salesMap[key] = Number(s._sum.revenue || 0);
    volumeMap[key] = Number(s._sum.volumeSold || 0);
  }

  const versMap: Record<string, number> = {};
  for (const v of dailyVersements) {
    const key = new Date(v.date).toISOString().split("T")[0];
    versMap[key] = Number(v._sum.amount || 0);
  }

  // Generate all dates in range
  const dates: string[] = [];
  const d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }

  return dates.map((date) => ({
    date,
    sales: salesMap[date] || 0,
    volume: volumeMap[date] || 0,
    versements: versMap[date] || 0,
    ecart: (salesMap[date] || 0) - (versMap[date] || 0),
  }));
}
