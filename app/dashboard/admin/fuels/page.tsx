import { serialize } from "@/lib/serialize";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { FuelsClientPage } from "./fuels-client";

export default async function FuelsPage() {
  await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const fuels = await db.fuel.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des carburants</h1>
        <p className="text-gray-500 mt-1">{fuels.length} produit(s) enregistré(s)</p>
      </div>
      <FuelsClientPage fuels={serialize(fuels)} />
    </div>
  );
}
