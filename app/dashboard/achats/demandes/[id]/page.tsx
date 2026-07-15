import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ValidateActions } from "./validate-actions";
import { CheckCircle, Clock } from "lucide-react";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente — validation Direction Financière", color: "bg-blue-100 text-blue-700" },
  VALIDE_DF: { label: "Validé DF — en attente Direction Générale", color: "bg-yellow-100 text-yellow-700" },
  VALIDE: { label: "Validé (DG)", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  ANNULE: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

export default async function DemandePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const user = session.user as any;
  const role = user.role as string;

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

  // Determine what action this user can take
  const canValidateDF = ["ADMIN", "DIRECTION_FINANCIERE"].includes(role) && request.status === "EN_ATTENTE";
  const canValidateDG = ["ADMIN", "DIRECTION_GENERALE"].includes(role) && (request.status as string) === "VALIDE_DF";
  const canReject = ["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"].includes(role)
    && ["EN_ATTENTE", "VALIDE_DF"].includes(request.status as string);

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

      {/* Circuit de validation visuel */}
      <div className="flex items-center gap-2 mb-6 bg-white border rounded-xl p-4 overflow-x-auto">
        <Step
          label="Gérant"
          sublabel="Initiation"
          done
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <div className="h-px w-8 bg-gray-300 flex-shrink-0" />
        <Step
          label="Direction Financière"
          sublabel="1ère validation"
          done={["VALIDE_DF", "VALIDE"].includes(request.status as string)}
          active={request.status === "EN_ATTENTE"}
          rejected={request.status === "REJETE"}
          icon={request.status === "EN_ATTENTE" ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        />
        <div className="h-px w-8 bg-gray-300 flex-shrink-0" />
        <Step
          label="Direction Générale"
          sublabel="Validation finale"
          done={request.status === "VALIDE"}
          active={(request.status as string) === "VALIDE_DF"}
          rejected={request.status === "REJETE"}
          icon={(request.status as string) === "VALIDE_DF" ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        />
        <div className="h-px w-8 bg-gray-300 flex-shrink-0" />
        <Step
          label="BC"
          sublabel="Création commande"
          done={request.orders.length > 0}
          active={request.status === "VALIDE"}
          icon={<CheckCircle className="w-4 h-4" />}
        />
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

        {(canValidateDF || canValidateDG || canReject) && (
          <ValidateActions
            requestId={request.id}
            canValidate={canValidateDF || canValidateDG}
            canReject={canReject}
            step={canValidateDF ? "DF" : "DG"}
          />
        )}
      </div>
    </div>
  );
}

function Step({
  label, sublabel, done, active, rejected, icon,
}: {
  label: string; sublabel: string; done?: boolean; active?: boolean; rejected?: boolean; icon: React.ReactNode;
}) {
  const color = rejected ? "text-red-500 border-red-300 bg-red-50"
    : done ? "text-green-600 border-green-300 bg-green-50"
    : active ? "text-blue-600 border-blue-300 bg-blue-50"
    : "text-gray-400 border-gray-200 bg-gray-50";

  return (
    <div className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-xl border px-3 py-2 min-w-[110px] ${color}`}>
      {icon}
      <p className="text-xs font-semibold text-center leading-tight">{label}</p>
      <p className="text-[10px] text-center opacity-70">{sublabel}</p>
    </div>
  );
}
