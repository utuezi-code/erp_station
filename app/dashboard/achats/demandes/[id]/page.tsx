import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ValidateActions } from "./validate-actions";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente de validation", color: "bg-blue-100 text-blue-700" },
  VALIDE: { label: "Validé", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  ANNULE: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

export default async function DemandePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const user = session.user as any;
  const canValidate = ["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"].includes(user.role);

  const request = await db.purchaseRequest.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      station: { select: { name: true } },
      user: { select: { name: true } },
      orders: { select: { id: true, number: true, status: true } },
    },
  });

  if (!request) notFound();

  const s = STATUS[request.status] || { label: request.status, color: "" };
  const total = request.items.reduce((s, i) => s + Number(i.quantity) * Number(i.estimatedCost || 0), 0);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">Demande d'achat</p>
          <h1 className="text-2xl font-bold text-gray-900">{request.number}</h1>
          <p className="text-gray-500 mt-1">
            {request.station?.name} • {request.service} •{" "}
            Par {request.user?.name} le {new Date(request.createdAt).toLocaleDateString("fr-CI")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${request.priority === "URGENT" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
            {request.priority}
          </Badge>
          <Badge className={s.color}>{s.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {request.justification && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Justification</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-gray-600">{request.justification}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Articles demandés</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead className="text-right">Coût estimé</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{item.estimatedCost ? `${fmt(item.estimatedCost)} FCFA` : "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.estimatedCost ? `${fmt(Number(item.quantity) * Number(item.estimatedCost))} FCFA` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {total > 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold">Total estimé</TableCell>
                      <TableCell className="text-right font-bold">{fmt(total)} FCFA</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {request.orders.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Bons de commande liés</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {request.orders.map((o) => (
                  <div key={o.id} className="text-sm">
                    <span className="font-mono font-medium">{o.number}</span>
                    <span className="ml-2 text-gray-400">{o.status}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {canValidate && request.status === "EN_ATTENTE" && (
          <ValidateActions requestId={request.id} />
        )}
      </div>
    </div>
  );
}
