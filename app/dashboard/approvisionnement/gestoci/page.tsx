import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { serialize } from "@/lib/serialize";
import { GESTOCIClient } from "./gestoci-client";

export default async function GESTOCIPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const [fuels, movements] = await Promise.all([
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true, unit: true } }),
    db.gESTOCIMovement.findMany({
      orderBy: { date: "desc" },
      include: {
        fuel: { select: { name: true, code: true, unit: true } },
        sirPurchase: { select: { reference: true } },
        miseADispo: { select: { number: true, station: { select: { name: true } } } },
      },
    }),
  ]);

  // Calcul stocks
  const stockByFuel: Record<string, { name: string; code: string; unit: string; entree: number; sortie: number }> = {};
  for (const f of fuels) {
    stockByFuel[f.id] = { name: f.name, code: f.code, unit: f.unit, entree: 0, sortie: 0 };
  }
  for (const m of movements) {
    if (stockByFuel[m.fuelId]) {
      if (m.type === "ENTREE") stockByFuel[m.fuelId].entree += Number(m.quantity);
      if (m.type === "SORTIE") stockByFuel[m.fuelId].sortie += Number(m.quantity);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/dashboard/approvisionnement" className="hover:underline">Approvisionnement</Link> / Stock GESTOCI
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Stock GESTOCI</h1>
        <p className="text-gray-500 text-sm mt-0.5">État du dépôt pétrolier et historique des mouvements</p>
      </div>

      {/* Stock actuel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(stockByFuel).map(([id, st]) => {
          const dispo = st.entree - st.sortie;
          const pct = st.entree > 0 ? (dispo / st.entree) * 100 : 0;
          const low = dispo < 10_000;
          return (
            <div key={id} className={`bg-white rounded-2xl border shadow-sm p-6 ${low ? "border-orange-300" : "border-gray-100"}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{st.code}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{st.name}</p>
                </div>
                {low && (
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">Stock bas</span>
                )}
              </div>
              <p className={`text-3xl font-bold tabular-nums ${low ? "text-orange-600" : "text-gray-900"}`}>
                {dispo.toLocaleString("fr-CI")}
              </p>
              <p className="text-xs text-gray-400 mt-1">{st.unit} disponibles</p>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Taux de remplissage</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${low ? "bg-orange-400" : "bg-blue-500"}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>
                  <p>Entrées totales</p>
                  <p className="font-semibold text-green-600">{st.entree.toLocaleString("fr-CI")} {st.unit}</p>
                </div>
                <div>
                  <p>Sorties totales</p>
                  <p className="font-semibold text-red-500">{st.sortie.toLocaleString("fr-CI")} {st.unit}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <GESTOCIClient movements={serialize(movements)} />
    </div>
  );
}
