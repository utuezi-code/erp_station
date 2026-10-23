import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { VersementsDFClient } from "./versements-df-client";
import { serialize } from "@/lib/serialize";

export default async function FinancierVersementsPage() {
  const session = await requireRole(["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const user = session.user as any;

  const versements = await db.versement.findMany({
    include: {
      user: { select: { name: true } },
      station: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  const totalPending = versements
    .filter((v) => v.status === "EN_ATTENTE")
    .reduce((s, v) => s + Number(v.amount), 0);
  const totalValidated = versements
    .filter((v) => v.status === "VALIDE")
    .reduce((s, v) => s + Number(v.amount), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suivi des versements</h1>
        <p className="text-gray-500 mt-1">Toutes les stations</p>
      </div>
      <VersementsDFClient
        versements={serialize(versements.map((v) => ({
          ...v,
          stationName: v.station?.name ?? "—",
        })))}
        totalPending={totalPending}
        totalValidated={totalValidated}
        userRole={user.role}
      />
    </div>
  );
}
