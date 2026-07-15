import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { CheckCircle, Clock, XCircle, TrendingUp, ArrowRight } from "lucide-react";

function fmt(n: { toNumber?: () => number } | number | null | undefined) {
  const num = n == null ? 0 : typeof n === "object" && typeof n.toNumber === "function" ? n.toNumber() : Number(n);
  return num.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

export default async function DirectionFinancierePage() {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [versementsMonth, versementsPending, versementsValidated, dailyMonth, stations, recentPending, disponibleBancaire] = await Promise.all([
    db.versement.aggregate({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    db.versement.aggregate({
      where: { status: "EN_ATTENTE" },
      _sum: { amount: true },
      _count: true,
    }),
    db.versement.aggregate({
      where: { status: "VALIDE", date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    db.dailyIndex.aggregate({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { revenue: true },
    }),
    db.station.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    }),
    db.versement.findMany({
      where: { status: "EN_ATTENTE" },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        station: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    db.versement.aggregate({
      where: { status: "VALIDE" },
      _sum: { amount: true },
    }),
  ]);

  // Per-station summary
  const stationIds = stations.map((s) => s.id);
  const [stationCA, stationVersements] = await Promise.all([
    db.dailyIndex.groupBy({
      by: ["stationId"],
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { revenue: true },
    }),
    db.versement.groupBy({
      by: ["stationId"],
      where: { date: { gte: startOfMonth, lte: endOfMonth }, status: "VALIDE" },
      _sum: { amount: true },
    }),
  ]);

  const caByStation = Object.fromEntries(stationCA.map((r) => [r.stationId, Number(r._sum.revenue || 0)]));
  const versementsByStation = Object.fromEntries(stationVersements.map((r) => [r.stationId, Number(r._sum.amount || 0)]));

  const totalCA = Number(dailyMonth._sum.revenue || 0);
  const totalVersements = Number(versementsMonth._sum.amount || 0);
  const ecart = totalCA - Number(versementsValidated._sum.amount || 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Direction Financière</h1>
          <p className="text-gray-500 mt-1">Tableau de bord — {now.toLocaleDateString("fr-CI", { month: "long", year: "numeric" })}</p>
        </div>
        <Link href="/dashboard/direction-financiere/versements" className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium">
          Tous les versements <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-medium text-gray-500">Total versements du mois</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalVersements)}</p>
          <p className="text-xs text-gray-400 mt-1">FCFA — {versementsMonth._count} versement(s)</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-medium text-gray-500">En attente de validation</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{fmt(Number(versementsPending._sum.amount || 0))}</p>
          <p className="text-xs text-gray-400 mt-1">FCFA — {versementsPending._count} versement(s)</p>
        </div>

        <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-xs font-medium text-gray-500">Versements validés (mois)</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{fmt(Number(versementsValidated._sum.amount || 0))}</p>
          <p className="text-xs text-gray-400 mt-1">FCFA — {versementsValidated._count} versement(s)</p>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${ecart > 0 ? "border-red-200" : "border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className={`w-4 h-4 ${ecart > 0 ? "text-red-500" : "text-gray-400"}`} />
            <p className="text-xs font-medium text-gray-500">Écart CA — versements</p>
          </div>
          <p className={`text-2xl font-bold ${ecart > 0 ? "text-red-600" : "text-gray-900"}`}>{fmt(ecart)}</p>
          <p className="text-xs text-gray-400 mt-1">FCFA</p>
        </div>
      </div>

      {/* Disponible bancaire */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Disponible bancaire (total historique validé)</p>
            <p className="text-3xl font-bold text-blue-800">{fmt(Number(disponibleBancaire._sum.amount || 0))} FCFA</p>
            <p className="text-xs text-blue-500 mt-0.5">Cumul de tous les versements validés toutes périodes confondues</p>
          </div>
        </div>
      </div>

      {/* Recent pending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Versements en attente de validation</h2>
          {recentPending.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun versement en attente.</p>
          ) : (
            <div className="space-y-2">
              {recentPending.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{(v as any).station?.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(v.date).toLocaleDateString("fr-CI")} • {(v as any).user?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{fmt(Number(v.amount))} FCFA</p>
                    <Link
                      href="/dashboard/direction-financiere/versements"
                      className="text-xs text-orange-500 hover:text-orange-600"
                    >
                      Valider →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Station summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Résumé par station (mois en cours)</h2>
          {stations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune station active.</p>
          ) : (
            <div className="space-y-3">
              {stations.map((station) => {
                const ca = caByStation[station.id] || 0;
                const versement = versementsByStation[station.id] || 0;
                const stEcart = ca - versement;
                const taux = ca > 0 ? Math.round((versement / ca) * 100) : 0;
                return (
                  <div key={station.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-700">{station.name}</p>
                      <p className="text-xs text-gray-400">{taux}% versé</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-blue-50 rounded-lg px-2 py-1">
                        <p className="text-blue-500 font-medium text-[10px]">CA</p>
                        <p className="font-bold text-blue-700">{fmt(ca)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg px-2 py-1">
                        <p className="text-green-500 font-medium text-[10px]">Versements</p>
                        <p className="font-bold text-green-700">{fmt(versement)}</p>
                      </div>
                      <div className={`rounded-lg px-2 py-1 ${stEcart > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                        <p className={`font-medium text-[10px] ${stEcart > 0 ? "text-red-500" : "text-gray-400"}`}>Écart</p>
                        <p className={`font-bold ${stEcart > 0 ? "text-red-700" : "text-gray-600"}`}>{fmt(stEcart)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(taux, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
