import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { FournisseursClient } from "./fournisseurs-client";

export default async function FournisseursPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE"]);

  const suppliers = await db.supplier.findMany({
    include: { _count: { select: { purchaseOrders: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
        <p className="text-gray-500 mt-1">{suppliers.filter((s) => s.active).length} fournisseur(s) actif(s)</p>
      </div>
      <FournisseursClient suppliers={suppliers.map((s) => ({ ...s, ordersCount: s._count.purchaseOrders }))} />
    </div>
  );
}
