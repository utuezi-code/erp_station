import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DGClient } from "./dg-client";

export default async function DirectionGeneralePage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const today = new Date();
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const period = searchParams.period || defaultPeriod;
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    include: { region: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  // Revenue per station for the period
  const salesByStation = await db.dailyIndex.groupBy({
    by: ["stationId"],
    where: { date: { gte: start, lte: end } },
    _sum: { revenue: true, volumeSold: true },
  });

  const versementsByStation = await db.versement.groupBy({
    by: ["stationId"],
    where: {
      date: { gte: start, lte: end },
      status: { not: "REJETE" },
    },
    _sum: { amount: true },
  });

  const exploitationAccounts = await db.exploitationAccount.findMany({
    where: { period },
    select: { stationId: true, grossResult: true, netResult: true },
  });

  const salesMap = Object.fromEntries(salesByStation.map((r) => [r.stationId, { revenue: Number(r._sum.revenue || 0), volume: Number(r._sum.volumeSold || 0) }]));
  const versMap = Object.fromEntries(versementsByStation.map((r) => [r.stationId, Number(r._sum.amount || 0)]));
  const exMap = Object.fromEntries(exploitationAccounts.map((r) => [r.stationId, r]));

  const stationData = stations.map((s) => {
    const sales = salesMap[s.id] || { revenue: 0, volume: 0 };
    const versements = versMap[s.id] || 0;
    const ex = exMap[s.id];
    return {
      id: s.id,
      name: s.name,
      region: s.region?.name || "",
      revenue: sales.revenue,
      volume: sales.volume,
      versements,
      ecart: sales.revenue - versements,
      grossResult: ex ? Number(ex.grossResult) : null,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = stationData.reduce((s, r) => s + r.revenue, 0);
  const totalVolume = stationData.reduce((s, r) => s + r.volume, 0);
  const totalVersements = stationData.reduce((s, r) => s + r.versements, 0);
  const totalEcart = totalRevenue - totalVersements;
  const totalGrossResult = exploitationAccounts.reduce((s, r) => s + Number(r.grossResult || 0), 0);

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const monthlyTrend = await db.dailyIndex.groupBy({
    by: ["date"],
    where: { date: { gte: sixMonthsAgo } },
    _sum: { revenue: true },
    orderBy: { date: "asc" },
  });

  // Aggregate by month
  const monthMap: Record<string, number> = {};
  for (const d of monthlyTrend) {
    const key = new Date(d.date).toISOString().slice(0, 7);
    monthMap[key] = (monthMap[key] || 0) + Number(d._sum.revenue || 0);
  }
  const trendData = Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }));

  // Unread alerts count
  const alertsCount = await db.alert.count({ where: { read: false } });
  const pendingVersements = await db.versement.count({ where: { status: "EN_ATTENTE" } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Direction Générale</h1>
        <p className="text-gray-500 mt-1">Vue consolidée de toutes les stations</p>
      </div>
      <DGClient
        period={period}
        stationData={stationData}
        trendData={trendData}
        totalRevenue={totalRevenue}
        totalVolume={totalVolume}
        totalVersements={totalVersements}
        totalEcart={totalEcart}
        totalGrossResult={totalGrossResult}
        alertsCount={alertsCount}
        pendingVersements={pendingVersements}
      />
    </div>
  );
}
