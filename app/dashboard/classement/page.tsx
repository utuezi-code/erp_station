import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ClassementClient } from "./classement-client";
import { PeriodSelect } from "./period-select";
import { ComparisonChart } from "./comparison-chart";
import { Trophy } from "lucide-react";


function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

const FUEL_COST_PER_LITER = 550; // Approximation coût carburant FCFA/L

export default async function ClassementPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireRole(["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_GENERALE"]);

  const params = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (params.period) {
    const [y, m] = params.period.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) { year = y; month = m - 1; }
  }

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
  const periodLabel = startOfMonth.toLocaleDateString("fr-CI", { month: "long", year: "numeric" });

  const [stations, caData, versementsData] = await Promise.all([
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } }),
    db.dailyIndex.groupBy({
      by: ["stationId"],
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { revenue: true, volumeSold: true },
    }),
    db.versement.groupBy({
      by: ["stationId"],
      where: { date: { gte: startOfMonth, lte: endOfMonth }, status: "VALIDE" },
      _sum: { amount: true },
    }),
  ]);

  const caByStation = Object.fromEntries(caData.map((r) => [r.stationId, { ca: Number(r._sum.revenue || 0), vol: Number(r._sum.volumeSold || 0) }]));
  const versementsByStation = Object.fromEntries(versementsData.map((r) => [r.stationId, Number(r._sum.amount || 0)]));

  const rows = stations.map((s) => {
    const ca = caByStation[s.id]?.ca ?? 0;
    const volume = caByStation[s.id]?.vol ?? 0;
    const versements = versementsByStation[s.id] ?? 0;
    const tauxVersement = ca > 0 ? Math.round((versements / ca) * 100) : 0;
    const marge = ca - volume * FUEL_COST_PER_LITER;
    return { stationId: s.id, stationName: s.name, ca, volume, versements, tauxVersement, marge };
  });

  const byCA = [...rows].sort((a, b) => b.ca - a.ca);
  const byMarge = [...rows].sort((a, b) => b.marge - a.marge);

  // Build period options (last 12 months)
  const periods = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("fr-CI", { month: "long", year: "numeric" }) };
  });

  const currentPeriodValue = params.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classement des stations</h1>
            <p className="text-gray-500 mt-0.5">Performance inter-stations — {periodLabel}</p>
          </div>
        </div>
        <PeriodSelect periods={periods} current={currentPeriodValue} />
      </div>

      {/* Top 3 summary */}
      {byCA.length >= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {byCA.slice(0, 3).map((row, idx) => {
            const medals = ["🥇", "🥈", "🥉"];
            const colors = ["bg-yellow-50 border-yellow-200", "bg-gray-50 border-gray-200", "bg-orange-50 border-orange-200"];
            return (
              <div key={row.stationId} className={`rounded-2xl border shadow-sm p-5 ${colors[idx]}`}>
                <p className="font-bold text-gray-900">{row.stationName}</p>
                <p className="text-lg font-bold text-orange-600 mt-1">{fmt(row.ca)} FCFA</p>
                <p className="text-xs text-gray-500">{fmt(row.volume)} L vendus</p>
              </div>
            );
          })}
        </div>
      )}

      <ClassementClient byCA={byCA} byMarge={byMarge} period={currentPeriodValue} />

      {/* Comparison chart */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Comparaison CA &amp; Versements</h2>
        <ComparisonChart data={rows} />
      </div>
    </div>
  );
}
