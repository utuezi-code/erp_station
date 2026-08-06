import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ValidateActions } from "./validate-actions";
import { CheckCircle, Clock, PackageCheck } from "lucide-react";
import Link from "next/link";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente — validation Direction Commerciale", color: "bg-blue-100 text-blue-700" },
  VALIDE_DC: { label: "Validé DC — en attente Direction Financière", color: "bg-orange-100 text-orange-700" },
  VALIDE_DF: { label: "Validé DF — en attente Direction Générale", color: "bg-yellow-100 text-yellow-700" },
  VALIDE: { label: "Validé (DG)", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  ANNULE: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

export default async function DemandePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
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

  const linkedMDs = request
    ? await db.miseADisposition.findMany({
        where: { orderId: request.id },
        include: { fuel: { select: { name: true, code: true } }, station: { select: { name: true } } },
        orderBy: { date: "desc" },
      })
    : [];

  if (!request) notFound();

  const s = STATUS[request.status] || { label: request.status, color: "" };
  const total = request.items.reduce((s, i) => s + Number(i.quantity) * Number(i.estimatedCost || 0), 0);

  // Determine what action this user can take
  const canValidateDC = ["ADMIN", "DIRECTION_COMMERCIALE"].includes(role) && request.status === "EN_ATTENTE";
  const canValidateDF = ["ADMIN", "DIRECTION_FINANCIERE"].includes(role) && (request.status as string) === "VALIDE_DC";
  const canValidateDG = ["ADMIN", "DIRECTION_GENERALE"].includes(role) && (request.status as string) === "VALIDE_DF";
  const canReject = ["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"].includes(role)
    && ["EN_ATTENTE", "VALIDE_DC", "VALIDE_DF"].includes(request.status as string);

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
          label="Dir. Commerciale"
          sublabel="1ère validation"
          done={["VALIDE_DC", "VALIDE_DF", "VALIDE"].includes(request.status as string)}
          active={request.status === "EN_ATTENTE"}
          rejected={request.status === "REJETE"}
          icon={request.status === "EN_ATTENTE" ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        />
        <div className="h-px w-8 bg-gray-300 flex-shrink-0" />
        <Step
          label="Dir. Financière"
          sublabel="2ème validation"
          done={["VALIDE_DF", "VALIDE"].includes(request.status as string)}
          active={(request.status as string) === "VALIDE_DC"}
          rejected={request.status === "REJETE"}
          icon={(request.status as string) === "VALIDE_DC" ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        />
        <div className="h-px w-8 bg-gray-300 flex-shrink-0" />
        <Step
          label="Dir. Générale"
          sublabel="Validation finale"
          done={request.status === "VALIDE"}
          active={(request.status as string) === "VALIDE_DF"}
          rejected={request.status === "REJETE"}
          icon={(request.status as string) === "VALIDE_DF" ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        />
        <div className="h-px w-8 bg-gray-300 flex-shrink-0" />
        <Step
          label="BC"
          sublabel="Bon de commande"
          done={request.orders.length > 0}
          active={request.status === "VALIDE" && linkedMDs.length === 0}
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <div className="h-px w-8 bg-gray-300 flex-shrink-0" />
        <Step
          label="Mise à dispo"
          sublabel="Livraison GESTOCI"
          done={linkedMDs.some((m) => ["LIVREE", "CONFIRMEE"].includes(m.status))}
          active={request.status === "VALIDE" || linkedMDs.some((m) => m.status === "EMISE")}
          icon={<PackageCheck className="w-4 h-4" />}
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
                  <Link key={o.id} href={`/dashboard/achats/commandes/${o.id}`} className="flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 py-1.5">
                    <span className="font-mono font-medium text-sm">{o.number}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{o.status}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {linkedMDs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PackageCheck className="w-4 h-4 text-blue-500" />Mises à disposition liées</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {linkedMDs.map((md) => {
                  const mdStatus: Record<string, { label: string; color: string }> = {
                    EMISE: { label: "Émise", color: "bg-blue-100 text-blue-700" },
                    LIVREE: { label: "Livrée", color: "bg-green-100 text-green-700" },
                    CONFIRMEE: { label: "Confirmée", color: "bg-gray-100 text-gray-600" },
                  };
                  const s = mdStatus[md.status] || { label: md.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <div key={md.id} className="flex items-center justify-between px-2 py-1.5">
                      <div>
                        <span className="font-mono font-medium text-sm">{md.number}</span>
                        <span className="ml-2 text-xs text-gray-400">{md.fuel.code} · {Number(md.quantity).toLocaleString("fr-CI")} L · {md.station.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {request.status === "VALIDE" && linkedMDs.length === 0 && (
            <Card className="border-dashed border-blue-300 bg-blue-50/50">
              <CardContent className="pt-4 flex items-center justify-between">
                <p className="text-sm text-blue-700">DA validée — créer une mise à disposition carburant ou un bon de commande fournisseur.</p>
                <Link
                  href={`/dashboard/approvisionnement/mises-a-disposition/new?orderId=${request.id}`}
                  className="text-xs px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 whitespace-nowrap ml-3"
                >
                  Créer une MD
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {(canValidateDC || canValidateDF || canValidateDG || canReject) && (
          <ValidateActions
            requestId={request.id}
            canValidate={canValidateDC || canValidateDF || canValidateDG}
            canReject={canReject}
            step={canValidateDC ? "DC" : canValidateDF ? "DF" : "DG"}
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
