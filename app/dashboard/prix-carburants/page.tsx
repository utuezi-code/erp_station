import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PrixClient } from "./prix-client";
import { serialize } from "@/lib/serialize";

export default async function PrixCarburantsPage() {
  const session = await requireRole(["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const user = session.user as any;

  const [fuels, proposals] = await Promise.all([
    db.fuel.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, salePrice: true, purchasePrice: true, margin: true, unit: true, active: true },
    }),
    db.fuelPriceProposal.findMany({
      where: { status: { in: ["EN_ATTENTE", "VALIDE", "REJETE"] } },
      include: {
        fuel: { select: { id: true, name: true, code: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prix des carburants</h1>
        <p className="text-gray-500 mt-1">
          {user.role === "DIRECTION_COMMERCIALE"
            ? "Proposer de nouveaux prix — validés par la Direction Financière"
            : user.role === "DIRECTION_FINANCIERE"
            ? "Valider les propositions de prix émises par la Direction Commerciale"
            : "Consulter et gérer les prix carburants"}
        </p>
      </div>
      <PrixClient
        fuels={serialize(fuels)}
        proposals={serialize(proposals)}
        userRole={user.role}
      />
    </div>
  );
}
