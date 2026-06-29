import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusActions } from "./order-status-actions";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  BROUILLON: { label: "Brouillon", color: "bg-gray-100 text-gray-600" },
  EN_ATTENTE_VALIDATION: { label: "À valider", color: "bg-yellow-100 text-yellow-700" },
  VALIDE: { label: "Validé", color: "bg-purple-100 text-purple-700" },
  ENVOYE_FOURNISSEUR: { label: "Envoyé", color: "bg-blue-100 text-blue-700" },
  EN_PREPARATION: { label: "En préparation", color: "bg-orange-100 text-orange-700" },
  EXPEDIE: { label: "Expédié", color: "bg-teal-100 text-teal-700" },
  LIVRE_PARTIELLEMENT: { label: "Liv. partielle", color: "bg-orange-100 text-orange-700" },
  LIVRE_TOTALEMENT: { label: "Livré", color: "bg-green-100 text-green-700" },
  CLOTURE: { label: "Clôturé", color: "bg-gray-100 text-gray-600" },
  ANNULE: { label: "Annulé", color: "bg-red-100 text-red-700" },
};

export default async function CommandePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const user = session.user as any;
  const canEdit = ["ADMIN", "RESPONSABLE_SERVICE"].includes(user.role);

  const order = await db.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      supplier: true,
      items: true,
      receipts: { include: { items: true }, orderBy: { receiptDate: "desc" } },
      invoices: { take: 1 },
      request: { select: { id: true, number: true } },
    },
  });

  if (!order) notFound();

  const s = STATUS[order.status] || { label: order.status, color: "" };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">Bon de commande</p>
          <h1 className="text-2xl font-bold text-gray-900">{order.number}</h1>
          <p className="text-gray-500 mt-1">
            {order.supplier?.name} • {new Date(order.orderDate).toLocaleDateString("fr-CI")}
            {order.request && (
              <span className="ml-2 text-xs">
                DA: <Link href={`/dashboard/achats/demandes/${order.request.id}`} className="text-orange-600 hover:underline">{order.request.number}</Link>
              </span>
            )}
          </p>
        </div>
        <Badge className={s.color}>{s.label}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Articles commandés</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead className="text-right">Prix HT</TableHead>
                    <TableHead className="text-right">TVA%</TableHead>
                    <TableHead className="text-right">TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{Number(item.tva)}%</TableCell>
                      <TableCell className="text-right font-medium">{fmt(item.totalTTC)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold">Total TTC</TableCell>
                    <TableCell className="text-right font-bold">{fmt(order.totalTTC)} FCFA</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {order.receipts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Réceptions ({order.receipts.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {order.receipts.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div>
                      <p className="font-medium">{new Date(r.receiptDate).toLocaleDateString("fr-CI")}</p>
                      {r.blNumber && <p className="text-xs text-gray-400">BL: {r.blNumber}</p>}
                    </div>
                    <Badge className="bg-green-100 text-green-700">{r.items.length} ligne(s)</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {canEdit && <OrderStatusActions orderId={order.id} currentStatus={order.status} />}

          <Card>
            <CardHeader><CardTitle className="text-sm">Résumé financier</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Total HT</span><span>{fmt(order.totalHT)} FCFA</span></div>
              <div className="flex justify-between text-gray-500"><span>TVA</span><span>{fmt(order.totalTVA)} FCFA</span></div>
              <div className="flex justify-between font-bold border-t pt-2"><span>Total TTC</span><span>{fmt(order.totalTTC)} FCFA</span></div>
              {order.paymentTerms && <p className="text-xs text-gray-400 mt-1">Paiement: {order.paymentTerms}</p>}
            </CardContent>
          </Card>

          {order.status === "LIVRE_TOTALEMENT" && order.invoices.length === 0 && (
            <Link href={`/dashboard/achats/receptions/new?orderId=${order.id}`}>
              <Button variant="outline" className="w-full">Nouvelle réception</Button>
            </Link>
          )}

          {["ENVOYE_FOURNISSEUR", "EN_PREPARATION", "EXPEDIE", "LIVRE_PARTIELLEMENT"].includes(order.status) && (
            <Link href={`/dashboard/achats/receptions/new?orderId=${order.id}`}>
              <Button variant="outline" className="w-full">Enregistrer réception</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
