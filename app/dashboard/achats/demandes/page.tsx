import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente", color: "bg-blue-100 text-blue-700" },
  VALIDE: { label: "Validé", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  ANNULE: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

const PRIORITY: Record<string, string> = {
  URGENT: "text-red-600",
  NORMAL: "text-gray-600",
  FAIBLE: "text-gray-400",
};

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const params = await searchParams;
  const user = session.user as any;

  const where: any = {};
  if (params.status) where.status = params.status;
  if (user.role === "GERANT") where.stationId = user.stationId;

  const requests = await db.purchaseRequest.findMany({
    where,
    include: {
      station: { select: { name: true } },
      user: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes d'achat</h1>
          <p className="text-gray-500 mt-1">{requests.length} demande(s)</p>
        </div>
        <Link href="/dashboard/achats/demandes/new">
          <Button className="bg-[#0369A1] hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle DA
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["", "EN_ATTENTE", "VALIDE", "REJETE", "ANNULE"] as const).map((s) => (
          <Link key={s} href={s ? `?status=${s}` : "?"}>
            <button className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${(params.status || "") === s ? "bg-orange-400 text-white border-orange-400" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
              {s ? STATUS[s]?.label : "Tous"}
            </button>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Demandeur</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.number}</TableCell>
                  <TableCell className="font-medium">{r.service}</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.station?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.user?.name}</TableCell>
                  <TableCell className={`text-sm font-medium ${PRIORITY[r.priority]}`}>{r.priority}</TableCell>
                  <TableCell><Badge className={STATUS[r.status]?.color}>{STATUS[r.status]?.label}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString("fr-CI")}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/achats/demandes/${r.id}`}>
                      <Button variant="ghost" size="sm">Voir</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">Aucune demande d'achat.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
