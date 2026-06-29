import { requireAuth } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileSpreadsheet } from "lucide-react";

export default async function RapportsPage() {
  await requireAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-gray-500 mt-1">Génération et export de rapports</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5" />Rapports PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Export PDF des ventes, versements et comptes d'exploitation.</p>
            <p className="text-xs text-orange-500 mt-2">Module disponible dans le Lot 3</p>
          </CardContent>
        </Card>
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />Rapports Excel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Export Excel des données comptables et de performance.</p>
            <p className="text-xs text-orange-500 mt-2">Module disponible dans le Lot 3</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
