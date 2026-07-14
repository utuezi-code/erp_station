import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, FileText, Package, Truck, Receipt, Building2,
  AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp,
} from "lucide-react";

function fmt(n: any) {
  return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

const DA_STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente", color: "bg-blue-100 text-blue-700" },
  VALIDE: { label: "Validé", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  ANNULE: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

const BC_STATUS: Record<string, { label: string; color: string }> = {
  BROUILLON: { label: "Brouillon", color: "bg-gray-100 text-gray-600" },
  EN_ATTENTE_VALIDATION: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  VALIDE: { label: "Validé", color: "bg-blue-100 text-blue-700" },
  ENVOYE_FOURNISSEUR: { label: "Envoyé", color: "bg-blue-100 text-blue-700" },
  LIVRE_PARTIELLEMENT: { label: "Liv. partielle", color: "bg-orange-100 text-orange-700" },
  LIVRE_TOTALEMENT: { label: "Livré", color: "bg-green-100 text-green-700" },
  ANNULE: { label: "Annulé", color: "bg-red-100 text-red-700" },
};

export default async function AchatsPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    daTotal,
    daWaiting,
    bcEnCours,
    bcWaiting,
    bcRetard,
    bcMontantMois,
    invoicesPending,
    recentRequests,
    recentOrders,
    topSuppliers,
    suppliers,
  ] = await Promise.all([
    db.purchaseRequest.count(),
    db.purchaseRequest.count({ where: { status: "EN_ATTENTE" } }),
    db.purchaseOrder.count({
      where: { status: { in: ["ENVOYE_FOURNISSEUR", "EN_ATTENTE_VALIDATION", "VALIDE"] } },
    }),
    db.purchaseOrder.count({ where: { status: "EN_ATTENTE_VALIDATION" } }),
    db.purchaseOrder.count({
      where: {
        expectedDelivery: { lt: now },
        status: { notIn: ["LIVRE_TOTALEMENT", "ANNULE"] },
      },
    }),
    db.purchaseOrder.aggregate({
      where: { orderDate: { gte: startOfMonth } },
      _sum: { totalTTC: true },
    }),
    db.supplierInvoice.aggregate({
      where: { paid: false },
      _sum: { amountTTC: true },
      _count: true,
    }),
    db.purchaseRequest.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        station: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    db.purchaseOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { supplier: { select: { name: true } } },
    }),
    db.purchaseOrder.groupBy({
      by: ["supplierId"],
      where: { orderDate: { gte: startOfMonth } },
      _sum: { totalTTC: true },
      orderBy: { _sum: { totalTTC: "desc" } },
      take: 5,
    }),
    db.supplier.count({ where: { active: true } }),
  ]);

  // Fetch supplier names for top suppliers
  const supplierIds = topSuppliers.map((s) => s.supplierId);
  const supplierNames = await db.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  });
  const supplierMap = Object.fromEntries(supplierNames.map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des achats</h1>
          <p className="text-gray-500 mt-1">Demandes, bons de commande, livraisons et factures</p>
        </div>
        <Link href="/dashboard/achats/demandes/new">
          <button className="bg-[#0369A1] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
            <FileText className="w-4 h-4" /> Nouvelle demande
          </button>
        </Link>
      </div>

      {/* Indicateurs opérationnels */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Indicateurs opérationnels</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500">DA total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{daTotal}</p>
          <p className="text-xs text-gray-400 mt-1">{daWaiting} en attente</p>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${bcWaiting > 0 ? "border-amber-200" : "border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-4 h-4 ${bcWaiting > 0 ? "text-amber-500" : "text-gray-400"}`} />
            <p className="text-xs text-gray-500">BC en attente validation</p>
          </div>
          <p className={`text-2xl font-bold ${bcWaiting > 0 ? "text-amber-600" : "text-gray-900"}`}>{bcWaiting}</p>
          <p className="text-xs text-gray-400 mt-1">{bcEnCours} BC en cours</p>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${bcRetard > 0 ? "border-red-200" : "border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${bcRetard > 0 ? "text-red-500" : "text-gray-400"}`} />
            <p className="text-xs text-gray-500">BC en retard</p>
          </div>
          <p className={`text-2xl font-bold ${bcRetard > 0 ? "text-red-600" : "text-gray-900"}`}>{bcRetard}</p>
          <p className="text-xs text-gray-400 mt-1">Livraison dépassée</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500">Fournisseurs actifs</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{suppliers}</p>
        </div>
      </div>

      {/* Indicateurs financiers */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Indicateurs financiers</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500">Montant total BC du mois</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(bcMontantMois._sum.totalTTC)}</p>
          <p className="text-xs text-gray-400 mt-1">FCFA</p>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${invoicesPending._count > 0 ? "border-orange-200" : "border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Receipt className={`w-4 h-4 ${invoicesPending._count > 0 ? "text-orange-500" : "text-gray-400"}`} />
            <p className="text-xs text-gray-500">Factures non payées</p>
          </div>
          <p className={`text-2xl font-bold ${invoicesPending._count > 0 ? "text-orange-600" : "text-gray-900"}`}>
            {fmt(invoicesPending._sum.amountTTC)}
          </p>
          <p className="text-xs text-gray-400 mt-1">FCFA — {invoicesPending._count} facture(s)</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500">Top 5 fournisseurs (mois)</p>
          </div>
          <div className="space-y-1.5">
            {topSuppliers.map((s, idx) => (
              <div key={s.supplierId} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate max-w-[60%]">
                  <span className="font-bold text-gray-400 mr-1">#{idx + 1}</span>
                  {supplierMap[s.supplierId] ?? "—"}
                </span>
                <span className="font-semibold text-gray-800">{fmt(s._sum.totalTTC)} FCFA</span>
              </div>
            ))}
            {topSuppliers.length === 0 && <p className="text-xs text-gray-400">Aucune commande ce mois.</p>}
          </div>
        </div>
      </div>

      {/* Liens rapides */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Liens rapides</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { href: "/dashboard/achats/fournisseurs", icon: Building2, label: "Fournisseurs" },
          { href: "/dashboard/achats/demandes", icon: FileText, label: "Demandes d'achat" },
          { href: "/dashboard/achats/commandes", icon: ShoppingCart, label: "Bons de commande" },
          { href: "/dashboard/achats/receptions", icon: Truck, label: "Réceptions" },
          { href: "/dashboard/achats/factures", icon: Receipt, label: "Factures" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-orange-300 hover:bg-orange-50 transition-colors cursor-pointer p-4 flex items-center gap-3">
              <item.icon className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent DA & BC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Dernières demandes d'achat</h2>
          <div className="space-y-1">
            {recentRequests.map((r) => (
              <Link key={r.id} href={`/dashboard/achats/demandes/${r.id}`}>
                <div className="flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.number} — {r.service}</p>
                    <p className="text-xs text-gray-400">{(r as any).station?.name} • {(r as any).user?.name}</p>
                  </div>
                  <Badge className={DA_STATUS[r.status]?.color}>{DA_STATUS[r.status]?.label}</Badge>
                </div>
              </Link>
            ))}
            {recentRequests.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucune demande.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Derniers bons de commande</h2>
          <div className="space-y-1">
            {recentOrders.map((o) => (
              <Link key={o.id} href={`/dashboard/achats/commandes/${o.id}`}>
                <div className="flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{o.number}</p>
                    <p className="text-xs text-gray-400">{(o as any).supplier?.name} • {fmt(o.totalTTC)} FCFA</p>
                  </div>
                  <Badge className={BC_STATUS[o.status]?.color}>{BC_STATUS[o.status]?.label || o.status}</Badge>
                </div>
              </Link>
            ))}
            {recentOrders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun bon de commande.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
