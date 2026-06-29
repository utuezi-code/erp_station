import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function fmt(n: any) {
  return Number(n || 0).toLocaleString("fr-CI", { minimumFractionDigits: 0 });
}

export default async function DirectionCommercialePage() {
  await requireRole(["ADMIN", "DIRECTION_COMMERCIALE"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const salesByStation = await db.dailyIndex.groupBy({
    by: ["stationId"],
    where: { date: { gte: today } },
    _sum: { volumeSold: true, revenue: true },
  });

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const stationMap = Object.fromEntries(stations.map((s) => [s.id, s.name]));

  const totalRevenue = salesByStation.reduce((s, r) => s + Number(r._sum.revenue || 0), 0);
  const totalVolume = salesByStation.reduce((s, r) => s + Number(r._sum.volumeSold || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suivi commercial</h1>
        <p className="text-gray-500 mt-1">Ventes du jour — {today.toLocaleDateString("fr-CI", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">CA total du jour</p>
            <p className="text-3xl font-bold">{fmt(totalRevenue)} <span className="text-base font-normal text-gray-400">FCFA</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Volume total vendu</p>
            <p className="text-3xl font-bold">{fmt(totalVolume)} <span className="text-base font-normal text-gray-400">L</span></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Classement des stations — Aujourd'hui</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Volume (L)</TableHead>
                <TableHead className="text-right">CA (FCFA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesByStation
                .sort((a, b) => Number(b._sum.revenue || 0) - Number(a._sum.revenue || 0))
                .map((row, i) => (
                  <TableRow key={row.stationId}>
                    <TableCell className="font-medium text-gray-500">{i + 1}</TableCell>
                    <TableCell className="font-medium">{stationMap[row.stationId] || row.stationId}</TableCell>
                    <TableCell className="text-right">{fmt(row._sum.volumeSold)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(row._sum.revenue)}</TableCell>
                  </TableRow>
                ))}
              {salesByStation.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 py-6">Aucune vente enregistrée pour aujourd'hui.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
