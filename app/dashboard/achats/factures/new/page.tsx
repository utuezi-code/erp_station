import { requireAuth } from "@/lib/rbac";
import { db } from "@/lib/db";
import { NewFactureClient } from "./new-facture-client";

export default async function NewFacturePage() {
  await requireAuth();

  const [suppliers, orders] = await Promise.all([
    db.supplier.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.purchaseOrder.findMany({
      where: { status: { in: ["LIVRE_PARTIELLEMENT", "LIVRE_TOTALEMENT", "CLOTURE", "VALIDE", "ENVOYE_FOURNISSEUR"] } },
      select: { id: true, number: true, totalTTC: true, supplier: { select: { name: true } } },
      orderBy: { orderDate: "desc" },
    }),
  ]);

  return <NewFactureClient suppliers={suppliers} orders={orders as any} />;
}
