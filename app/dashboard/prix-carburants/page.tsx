import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PrixClient } from "./prix-client";

export default async function PrixCarburantsPage() {
  await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const fuels = await db.fuel.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, salePrice: true, purchasePrice: true, margin: true, unit: true, active: true },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prix des carburants</h1>
        <p className="text-gray-500 mt-1">Modifier les prix d'achat et de vente par produit</p>
      </div>
      <PrixClient
        fuels={fuels.map((f) => ({
          ...f,
          salePrice: Number(f.salePrice),
          purchasePrice: Number(f.purchasePrice),
          margin: Number(f.margin),
        }))}
      />
    </div>
  );
}
