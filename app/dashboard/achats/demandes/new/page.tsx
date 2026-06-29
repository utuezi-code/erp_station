import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { NewDemandeClient } from "./new-demande-client";

export default async function NewDemandePage() {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "GERANT"]);
  const user = session.user as any;

  const stations = user.role === "GERANT"
    ? await db.station.findMany({ where: { id: user.stationId }, select: { id: true, name: true } })
    : await db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande d'achat</h1>
      </div>
      <NewDemandeClient stations={stations} defaultStationId={user.role === "GERANT" ? user.stationId : ""} />
    </div>
  );
}
