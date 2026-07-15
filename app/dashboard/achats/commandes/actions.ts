"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";

const itemSchema = z.object({
  description: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unit: z.string().default("unité"),
  unitPrice: z.coerce.number().nonnegative(),
  tva: z.coerce.number().nonnegative().default(18),
});

export async function createPurchaseOrder(formData: FormData) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE"]);

  const supplierId = formData.get("supplierId") as string;
  const requestId = formData.get("requestId") as string || null;
  const expectedDelivery = formData.get("expectedDelivery") as string;
  const paymentTerms = formData.get("paymentTerms") as string || "30 jours";
  const note = formData.get("note") as string;

  const itemsJson = formData.get("items") as string;
  const items = z.array(itemSchema).parse(JSON.parse(itemsJson || "[]"));
  if (items.length === 0) throw new Error("Ajoutez au moins un article.");

  let totalHT = 0;
  let totalTVA = 0;

  const orderItems = items.map((i) => {
    const ht = i.quantity * i.unitPrice;
    const tva = ht * (i.tva / 100);
    const ttc = ht + tva;
    totalHT += ht;
    totalTVA += tva;
    return { description: i.description, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, discount: 0, tva: i.tva, totalHT: ht, totalTTC: ttc };
  });

  const count = await db.purchaseOrder.count();
  const number = `BC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const po = await db.purchaseOrder.create({
    data: {
      number,
      supplierId,
      requestId: requestId || null,
      orderDate: new Date(),
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      paymentTerms,
      note: note || null,
      totalHT,
      totalTVA,
      totalTTC: totalHT + totalTVA,
      status: "BROUILLON",
      items: { create: orderItems },
    },
  });

  revalidatePath("/dashboard/achats/commandes");
  redirect(`/dashboard/achats/commandes/${po.id}`);
}

export async function updateOrderStatus(
  id: string,
  status: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE"]);
    const userId = (session.user as any).id;

    // Threshold-based multi-level validation (15.4)
    // Orders > 5M FCFA require DIRECTION_FINANCIERE or ADMIN to validate
    if (status === "VALIDE") {
      const order = await db.purchaseOrder.findUnique({ where: { id }, select: { totalHT: true } });
      const amount = Number(order?.totalHT || 0);
      const role = (session.user as any).role as string;
      if (amount > 5_000_000 && !["ADMIN", "DIRECTION_FINANCIERE"].includes(role)) {
        return { success: false, error: "Les commandes supérieures à 5 000 000 FCFA doivent être validées par la Direction Financière." };
      }
    }

    await db.purchaseOrder.update({ where: { id }, data: { status: status as any } });

    // Record validation history
    if (["VALIDE", "ANNULE"].includes(status)) {
      await db.orderValidation.create({
        data: {
          orderId: id,
          userId,
          action: status === "VALIDE" ? "APPROVED" : "REJECTED",
          comment: comment || null,
        },
      });
    }

    revalidatePath("/dashboard/achats/commandes");
    revalidatePath(`/dashboard/achats/commandes/${id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}
