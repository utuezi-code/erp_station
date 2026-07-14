import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { VersementsClientPage } from "@/app/dashboard/gerant/versements/versements-client";
import { serialize } from "@/lib/serialize";

export default async function FinancierVersementsPage() {
  const session = await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);
  const user = session.user as any;

  const [versements, stations] = await Promise.all([
    db.versement.findMany({
      include: {
        user: { select: { name: true } },
        station: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } }),
  ]);

  const totalPending = versements.filter(v => v.status === "EN_ATTENTE").reduce((s, v) => s + Number(v.amount), 0);
  const totalValidated = versements.filter(v => v.status === "VALIDE").reduce((s, v) => s + Number(v.amount), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suivi des versements</h1>
        <p className="text-gray-500 mt-1">Toutes les stations</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm text-yellow-700">En attente de validation</p>
          <p className="text-2xl font-bold text-yellow-800">{Number(totalPending).toLocaleString("fr-CI")} FCFA</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-700">Total validé</p>
          <p className="text-2xl font-bold text-green-800">{Number(totalValidated).toLocaleString("fr-CI")} FCFA</p>
        </div>
      </div>
      <VersementsClientPage
        stationId=""
        versements={serialize(versements.map(v => ({ ...v, stationName: (v as any).station?.name })))}
        bankAccounts={[]}
        userRole={user.role}
      />
    </div>
  );
}
