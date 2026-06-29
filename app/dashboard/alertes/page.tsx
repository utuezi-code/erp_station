import { requireAuth } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";

const ALERT_TYPE_LABELS: Record<string, string> = {
  VERSEMENT_NON_EFFECTUE: "Versement non effectué",
  ECART_STOCK: "Écart de stock",
  STOCK_FAIBLE: "Stock faible",
  OBJECTIF_NON_ATTEINT: "Objectif non atteint",
  RETARD_SAISIE: "Retard de saisie",
  CONNEXION_SUSPECTE: "Connexion suspecte",
};

export default async function AlertesPage() {
  await requireAuth();

  const alerts = await db.alert.findMany({
    include: { station: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
        <p className="text-gray-500 mt-1">{alerts.filter(a => !a.read).length} alerte(s) non lue(s)</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className={alert.read ? "opacity-60" : ""}>
            <CardContent className="pt-4 flex items-start gap-3">
              <div className={`mt-0.5 ${alert.level === "RED" ? "text-red-500" : alert.level === "ORANGE" ? "text-orange-500" : "text-blue-500"}`}>
                {alert.level === "INFO" ? <Info className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{ALERT_TYPE_LABELS[alert.type] || alert.type}</Badge>
                  {alert.station && <span className="text-xs text-gray-500">{alert.station.name}</span>}
                  <span className="text-xs text-gray-400 ml-auto">{new Date(alert.createdAt).toLocaleString("fr-CI")}</span>
                </div>
                <p className="text-sm">{alert.message}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {alerts.length === 0 && (
          <p className="text-gray-500 text-center py-12">Aucune alerte pour le moment.</p>
        )}
      </div>
    </div>
  );
}
