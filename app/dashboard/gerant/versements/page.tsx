import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { VersementsClientPage } from "./versements-client";
import { serialize } from "@/lib/serialize";

export default async function VersementsPage() {
  const session = await requireRole(["ADMIN", "GERANT", "DIRECTION_FINANCIERE"]);
  const user = session.user as any;
  const stationId = user.stationId;

  if (!stationId) return <p className="text-gray-500">Aucune station assignée.</p>;

  const today = new Date();
  const tenDaysAgo = new Date(today);
  tenDaysAgo.setDate(today.getDate() - 10);

  const [station, versements, bankAccounts, frais, caParJour] = await Promise.all([
    db.station.findUnique({ where: { id: stationId }, select: { id: true, name: true } }),
    db.versement.findMany({
      where: { stationId },
      include: { user: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 60,
    }),
    db.bankAccount.findMany({ where: { stationId } }),
    db.fraisJournalier.findMany({
      where: { stationId, date: { gte: tenDaysAgo } },
      orderBy: { date: "desc" },
    }),
    // CA (revenue) aggregated per day from daily indexes
    db.dailyIndex.groupBy({
      by: ["date"],
      where: { stationId, date: { gte: tenDaysAgo } },
      _sum: { revenue: true },
    }),
  ]);

  // Build a map: dateStr -> totalCA
  const caMap: Record<string, number> = {};
  for (const row of caParJour) {
    const key = row.date.toISOString().split("T")[0];
    caMap[key] = Number(row._sum.revenue ?? 0);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Versements bancaires</h1>
        <p className="text-gray-500 mt-1">{station?.name}</p>
      </div>
      <VersementsClientPage
        stationId={stationId}
        versements={serialize(versements)}
        bankAccounts={serialize(bankAccounts)}
        frais={serialize(frais)}
        caMap={caMap}
        userRole={user.role}
      />
    </div>
  );
}
