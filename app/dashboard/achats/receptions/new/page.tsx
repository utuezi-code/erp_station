import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { NewReceptionClient } from "./new-reception-client";

export default async function NewReceptionPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "GERANT"]);
  const { orderId } = await searchParams;

  const [pendingOrders, stations] = await Promise.all([
    db.purchaseOrder.findMany({
      where: {
        status: {
          in: ["ENVOYE_FOURNISSEUR", "EN_PREPARATION", "EXPEDIE", "LIVRE_PARTIELLEMENT"],
        },
      },
      include: {
        supplier: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.station.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle réception</h1>
      </div>
      <NewReceptionClient
        orders={pendingOrders.map((o) => ({
          id: o.id,
          number: o.number,
          supplierName: o.supplier?.name || "",
          supplierId: o.supplierId,
          items: o.items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unit: i.unit,
            unitPrice: Number(i.unitPrice),
            tva: Number(i.tva),
          })),
        }))}
        stations={stations}
        preSelectedOrderId={orderId || ""}
      />
    </div>
  );
}
