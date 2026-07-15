import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Truck, Warehouse, PackageCheck, TrendingDown, TrendingUp, ArrowRight, AlertTriangle } from "lucide-react";

function fmt(n: number) {
  return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

export default async function ApprovisionnementPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [fuels, movements, sirThisMoth, mdPending, recentMD, recentSIR] = await Promise.all([
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true, unit: true } }),
    db.gESTOCIMovement.groupBy({
      by: ["fuelId", "type"],
      _sum: { quantity: true },
    }),
    db.sIRPurchase.aggregate({
      where: { purchaseDate: { gte: startOfMonth } },
      _sum: { totalAmount: true, quantity: true },
      _count: true,
    }),
    db.miseADisposition.count({ where: { status: "EMISE" } }),
    db.miseADisposition.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        station: { select: { name: true } },
        fuel: { select: { name: true, code: true } },
      },
    }),
    db.sIRPurchase.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { fuel: { select: { name: true, code: true } } },
    }),
  ]);

  // Calcul stock GESTOCI par carburant
  const stockByFuel: Record<string, { entree: number; sortie: number }> = {};
  for (const m of movements) {
    if (!stockByFuel[m.fuelId]) stockByFuel[m.fuelId] = { entree: 0, sortie: 0 };
    if (m.type === "ENTREE") stockByFuel[m.fuelId].entree += Number(m._sum.quantity || 0);
    if (m.type === "SORTIE") stockByFuel[m.fuelId].sortie += Number(m._sum.quantity || 0);
  }

  const totalStockValeur = fuels.reduce((s, f) => {
    const st = stockByFuel[f.id];
    return s + (st ? (st.entree - st.sortie) : 0) * 650; // prix moyen approximatif
  }, 0);

  const MD_STATUS: Record<string, { label: string; color: string }> = {
    EMISE: { label: "Émise", color: "bg-blue-100 text-blue-700" },
    LIVREE: { label: "Livrée", color: "bg-green-100 text-green-700" },
    CONFIRMEE: { label: "Confirmée", color: "bg-gray-100 text-gray-600" },
  };

  const SIR_STATUS: Record<string, { label: string; color: string }> = {
    COMMANDE: { label: "Commandé", color: "bg-amber-100 text-amber-700" },
    LIVRE: { label: "Livré", color: "bg-blue-100 text-blue-700" },
    FACTURE: { label: "Facturé", color: "bg-green-100 text-green-700" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvisionnement</h1>
        <p className="text-gray-500 mt-1">Achats à la SIR · Stock GESTOCI · Mises à disposition stations</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {fuels.map((fuel) => {
          const st = stockByFuel[fuel.id] || { entree: 0, sortie: 0 };
          const dispo = st.entree - st.sortie;
          const low = dispo < 10_000;
          return (
            <div key={fuel.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${low ? "border-orange-300" : "border-gray-100"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{fuel.code}</p>
                {low && <AlertTriangle className="w-4 h-4 text-orange-500" />}
              </div>
              <p className={`text-2xl font-bold tabular-nums ${low ? "text-orange-600" : "text-gray-900"}`}>
                {fmt(dispo)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{fuel.unit} disponibles — GESTOCI</p>
            </div>
          );
        })}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500">Achats SIR ce mois</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{sirThisMoth._count}</p>
          <p className="text-xs text-gray-400 mt-1">{fmt(Number(sirThisMoth._sum.totalAmount || 0))} FCFA</p>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${mdPending > 0 ? "border-blue-200" : "border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Truck className={`w-4 h-4 ${mdPending > 0 ? "text-blue-500" : "text-gray-400"}`} />
            <p className="text-xs text-gray-500">MD en cours</p>
          </div>
          <p className={`text-2xl font-bold ${mdPending > 0 ? "text-blue-600" : "text-gray-900"}`}>{mdPending}</p>
          <p className="text-xs text-gray-400 mt-1">Mises à disposition émises</p>
        </div>
      </div>

      {/* Liens rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/dashboard/approvisionnement/sir", icon: TrendingDown, label: "Achats à la SIR", sub: "Historique des approvisionnements", color: "text-purple-500" },
          { href: "/dashboard/approvisionnement/gestoci", icon: Warehouse, label: "Stock GESTOCI", sub: "État du dépôt et mouvements", color: "text-blue-500" },
          { href: "/dashboard/approvisionnement/mises-a-disposition", icon: PackageCheck, label: "Mises à disposition", sub: "Livraisons vers les stations", color: "text-green-500" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-orange-300 hover:bg-orange-50/50 transition-colors cursor-pointer p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gray-50 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Derniers achats SIR</h2>
            <Link href="/dashboard/approvisionnement/sir" className="text-xs text-blue-500 hover:underline">Tout voir</Link>
          </div>
          <div className="space-y-1">
            {recentSIR.map((s) => {
              const st = SIR_STATUS[s.status] || { label: s.status, color: "bg-gray-100 text-gray-600" };
              return (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.reference}</p>
                    <p className="text-xs text-gray-400">{s.fuel.name} · {fmt(Number(s.quantity))} L · {new Date(s.purchaseDate).toLocaleDateString("fr-CI")}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
              );
            })}
            {recentSIR.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun achat SIR.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Dernières mises à disposition</h2>
            <Link href="/dashboard/approvisionnement/mises-a-disposition" className="text-xs text-blue-500 hover:underline">Tout voir</Link>
          </div>
          <div className="space-y-1">
            {recentMD.map((md) => {
              const st = MD_STATUS[md.status] || { label: md.status, color: "bg-gray-100 text-gray-600" };
              return (
                <div key={md.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{md.number}</p>
                    <p className="text-xs text-gray-400">{md.station.name} · {md.fuel.code} · {fmt(Number(md.quantity))} L</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
              );
            })}
            {recentMD.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucune mise à disposition.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
