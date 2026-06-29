import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

export default async function ReceptionsPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE"]);

  const receipts = await db.goodsReceipt.findMany({
    include: {
      order: {
        include: { supplier: { select: { name: true } } },
      },
      station: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { receiptDate: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réceptions</h1>
          <p className="text-gray-500 mt-1">{receipts.length} réception(s)</p>
        </div>
        <Link href="/dashboard/achats/receptions/new">
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle réception
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date réception</TableHead>
                <TableHead>BC</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>BL fournisseur</TableHead>
                <TableHead className="text-right">Lignes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.receiptDate).toLocaleDateString("fr-CI")}</TableCell>
                  <TableCell className="font-mono text-sm">{r.order.number}</TableCell>
                  <TableCell>{r.order.supplier?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.station?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.blNumber || "—"}</TableCell>
                  <TableCell className="text-right">{r._count.items}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/achats/commandes/${r.orderId}`}>
                      <Button variant="ghost" size="sm">Voir BC</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {receipts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">Aucune réception.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
