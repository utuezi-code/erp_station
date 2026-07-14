import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

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

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const params = await searchParams;

  const where: any = {};
  if (params.status) where.status = params.status;

  const orders = await db.purchaseOrder.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
      request: { select: { number: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de commande</h1>
          <p className="text-gray-500 mt-1">{orders.length} commande(s)</p>
        </div>
        <Link href="/dashboard/achats/commandes/new">
          <Button className="bg-[#0369A1] hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Nouveau BC
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["", "BROUILLON", "ENVOYE_FOURNISSEUR", "LIVRE_PARTIELLEMENT", "LIVRE_TOTALEMENT", "ANNULE"] as const).map((s) => (
          <Link key={s} href={s ? `?status=${s}` : "?"}>
            <button className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${(params.status || "") === s ? "bg-orange-400 text-white border-orange-400" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
              {s ? STATUS[s]?.label : "Tous"}
            </button>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° BC</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>DA liée</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm">{o.number}</TableCell>
                  <TableCell className="font-medium">{o.supplier?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{o.request?.number || "—"}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(o.totalTTC)} FCFA</TableCell>
                  <TableCell><Badge className={STATUS[o.status]?.color}>{STATUS[o.status]?.label || o.status}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-400">{new Date(o.createdAt).toLocaleDateString("fr-CI")}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/achats/commandes/${o.id}`}>
                      <Button variant="ghost" size="sm">Voir</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">Aucun bon de commande.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
