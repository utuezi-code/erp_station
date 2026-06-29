"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const receiptItemSchema = z.object({
  description: z.string(),
  quantityOrdered: z.coerce.number().positive(),
  quantityReceived: z.coerce.number().nonnegative(),
  unit: z.string(),
});

export async function createReceipt(formData: FormData) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE"]);

  const orderId = formData.get("orderId") as string;
  const stationId = formData.get("stationId") as string;
  const receiptDate = formData.get("receiptDate") as string;
  const blNumber = formData.get("blNumber") as string;
  const observations = formData.get("observations") as string;
  const itemsJson = formData.get("items") as string;
  const items = z.array(receiptItemSchema).parse(JSON.parse(itemsJson || "[]"));

  const order = await db.purchaseOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Bon de commande introuvable.");

  await db.goodsReceipt.create({
    data: {
      orderId,
      stationId,
      receiptDate: new Date(receiptDate),
      blNumber: blNumber || null,
      observations: observations || null,
      items: {
        create: items.map((i) => ({
          description: i.description,
          quantityOrdered: i.quantityOrdered,
          quantityReceived: i.quantityReceived,
          quantityRejected: 0,
          unit: i.unit,
        })),
      },
    },
  });

  // Check if fully received
  const allReceipts = await db.goodsReceipt.findMany({
    where: { orderId },
    include: { items: true },
  });

  const orderItems = await db.purchaseOrderItem.findMany({ where: { orderId } });
  const receivedMap: Record<string, number> = {};
  for (const r of allReceipts) {
    for (const ri of r.items) {
      receivedMap[ri.description] = (receivedMap[ri.description] || 0) + Number(ri.quantityReceived);
    }
  }

  const allFulfilled = orderItems.every((i) => (receivedMap[i.description] || 0) >= Number(i.quantity));
  const anyReceived = orderItems.some((i) => (receivedMap[i.description] || 0) > 0);

  await db.purchaseOrder.update({
    where: { id: orderId },
    data: {
      status: allFulfilled ? "LIVRE_TOTALEMENT" : anyReceived ? "LIVRE_PARTIELLEMENT" : order.status,
    },
  });

  revalidatePath("/dashboard/achats/receptions");
  revalidatePath(`/dashboard/achats/commandes/${orderId}`);
}
