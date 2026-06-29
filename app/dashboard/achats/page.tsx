import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, FileText, Package, Truck, Receipt, Building2 } from "lucide-react";

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
  ENVOYE_FOURNISSEUR: { label: "Envoyé", color: "bg-blue-100 text-blue-700" },
  LIVRE_PARTIELLEMENT: { label: "Liv. partielle", color: "bg-orange-100 text-orange-700" },
  LIVRE_TOTALEMENT: { label: "Livré", color: "bg-green-100 text-green-700" },
  ANNULE: { label: "Annulé", color: "bg-red-100 text-red-700" },
};

export default async function AchatsPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const [suppliers, daWaiting, orders, invoicesPending] = await Promise.all([
    db.supplier.count({ where: { active: true } }),
    db.purchaseRequest.count({ where: { status: "EN_ATTENTE" } }),
    db.purchaseOrder.groupBy({
      by: ["status"],
      _count: true,
    }),
    db.supplierInvoice.aggregate({
      where: { paid: false },
      _sum: { amountTTC: true },
      _count: true,
    }),
  ]);

  const ordersByStatus = Object.fromEntries(orders.map((r) => [r.status, r._count]));

  const [recentRequests, recentOrders] = await Promise.all([
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
      include: {
        supplier: { select: { name: true } },
      },
    }),
  ]);

  const activeOrders = (ordersByStatus["ENVOYE_FOURNISSEUR"] || 0) + (ordersByStatus["EN_PREPARATION"] || 0) + (ordersByStatus["EXPEDIE"] || 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des achats</h1>
          <p className="text-gray-500 mt-1">Demandes, bons de commande, livraisons et factures</p>
        </div>
        <Link href="/dashboard/achats/demandes/new">
          <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2">
            <FileText className="w-4 h-4 inline" /> Nouvelle demande
          </button>
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> Fournisseurs actifs</p>
            <p className="text-2xl font-bold">{suppliers}</p>
          </CardContent>
        </Card>
        <Card className={daWaiting > 0 ? "border-blue-300" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><FileText className="w-3 h-3" /> DA en attente</p>
            <p className="text-2xl font-bold text-blue-600">{daWaiting}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> BC en cours</p>
            <p className="text-2xl font-bold">{activeOrders}</p>
          </CardContent>
        </Card>
        <Card className={invoicesPending._count > 0 ? "border-orange-300" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Receipt className="w-3 h-3" /> Factures impayées</p>
            <p className="text-2xl font-bold text-orange-600">{fmt(invoicesPending._sum.amountTTC)}</p>
            <p className="text-xs text-gray-400">FCFA — {invoicesPending._count} facture(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { href: "/dashboard/achats/fournisseurs", icon: Building2, label: "Fournisseurs" },
          { href: "/dashboard/achats/demandes", icon: FileText, label: "Demandes d'achat" },
          { href: "/dashboard/achats/commandes", icon: ShoppingCart, label: "Bons de commande" },
          { href: "/dashboard/achats/receptions", icon: Truck, label: "Réceptions" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-orange-300 hover:bg-orange-50 transition-colors cursor-pointer">
              <CardContent className="pt-4 flex items-center gap-3">
                <item.icon className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">{item.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent DA & BC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Dernières demandes d'achat</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentRequests.map((r) => (
              <Link key={r.id} href={`/dashboard/achats/demandes/${r.id}`}>
                <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2">
                  <div>
                    <p className="text-sm font-medium">{r.number} — {r.service}</p>
                    <p className="text-xs text-gray-400">{r.station?.name} • {r.user?.name}</p>
                  </div>
                  <Badge className={DA_STATUS[r.status]?.color}>{DA_STATUS[r.status]?.label}</Badge>
                </div>
              </Link>
            ))}
            {recentRequests.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucune demande.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Derniers bons de commande</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentOrders.map((o) => (
              <Link key={o.id} href={`/dashboard/achats/commandes/${o.id}`}>
                <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2">
                  <div>
                    <p className="text-sm font-medium">{o.number}</p>
                    <p className="text-xs text-gray-400">{o.supplier?.name} • {fmt(o.totalTTC)} FCFA</p>
                  </div>
                  <Badge className={BC_STATUS[o.status]?.color}>{BC_STATUS[o.status]?.label || o.status}</Badge>
                </div>
              </Link>
            ))}
            {recentOrders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun bon de commande.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
