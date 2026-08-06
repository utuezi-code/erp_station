import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { RapprochementClient } from "./rapprochement-client";

export default async function RapprochementPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE"]);

  // Load all orders with their receipts and invoices for 3-way matching
  const orders = await db.purchaseOrder.findMany({
    where: {
      status: { notIn: ["BROUILLON", "ANNULE"] },
    },
    include: {
      supplier: { select: { name: true } },
      receipts: {
        include: {
          items: true,
        },
      },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          amountHT: true,
          amountTTC: true,
          paid: true,
        },
      },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPrice: true,
          totalHT: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rapprochement BC / BL / Facture</h1>
        <p className="text-gray-500 mt-1">Vérification 3 voies : bon de commande, bon de livraison et facture fournisseur</p>
      </div>
      <RapprochementClient orders={serialize(orders)} />
    </div>
  );
}
