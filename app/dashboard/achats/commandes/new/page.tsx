import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { NewCommandeClient } from "./new-commande-client";

export default async function NewCommandePage({
  searchParams,
}: {
  searchParams: { daId?: string };
}) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE"]);

  const [suppliers, validatedRequests] = await Promise.all([
    db.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.purchaseRequest.findMany({
      where: { status: "VALIDE" },
      include: {
        items: true,
        station: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau bon de commande</h1>
      </div>
      <NewCommandeClient
        suppliers={suppliers}
        approvedRequests={validatedRequests.map((r) => ({
          id: r.id,
          number: r.number,
          stationName: r.station?.name || "",
          items: r.items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unit: i.unit,
            unitPrice: Number(i.estimatedCost || 0),
            tva: 18,
          })),
        }))}
        preSelectedDA={searchParams.daId || ""}
      />
    </div>
  );
}
