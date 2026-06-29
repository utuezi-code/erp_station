import { requireAuth } from "@/lib/rbac";
import { db } from "@/lib/db";
import { VersementsClientPage } from "./versements-client";

export default async function VersementsPage() {
  const session = await requireAuth();
  const user = session.user as any;
  const stationId = user.stationId;

  if (!stationId) return <p className="text-gray-500">Aucune station assignée.</p>;

  const [station, versements, bankAccounts] = await Promise.all([
    db.station.findUnique({ where: { id: stationId }, select: { id: true, name: true } }),
    db.versement.findMany({
      where: { stationId },
      include: { user: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    db.bankAccount.findMany({ where: { stationId } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Versements bancaires</h1>
        <p className="text-gray-500 mt-1">{station?.name}</p>
      </div>
      <VersementsClientPage
        stationId={stationId}
        versements={versements as any}
        bankAccounts={bankAccounts}
        userRole={user.role}
      />
    </div>
  );
}
