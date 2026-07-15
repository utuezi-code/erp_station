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
  unitPrice: z.coerce.number().nonnegative().default(0),
  tva: z.coerce.number().nonnegative().default(18),
});

export async function createReceipt(formData: FormData) {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "GERANT"]);
  const userId = (session.user as any).id;

  const orderId = formData.get("orderId") as string;
  const stationId = formData.get("stationId") as string;
  const supplierId = formData.get("supplierId") as string;
  const receiptDate = formData.get("receiptDate") as string;
  const blNumber = formData.get("blNumber") as string;
  const observations = formData.get("observations") as string;
  const commentaireEcart = formData.get("commentaireEcart") as string | null;
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

  const newStatus = allFulfilled ? "LIVRE_TOTALEMENT" : anyReceived ? "LIVRE_PARTIELLEMENT" : order.status;
  await db.purchaseOrder.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  // Auto-génération de la facture fournisseur sur les quantités réellement reçues
  const receivedItems = items.filter((i) => i.quantityReceived > 0);
  if (receivedItems.length > 0) {
    let amountHT = 0;
    let amountTVA = 0;
    for (const i of receivedItems) {
      const ht = i.quantityReceived * i.unitPrice;
      amountHT += ht;
      amountTVA += ht * (i.tva / 100);
    }
    const amountTTC = amountHT + amountTVA;

    // Check if invoice already exists for this order to avoid duplicates on partial deliveries
    const existingInvoice = await db.supplierInvoice.findFirst({ where: { orderId } });

    const invoiceCount = await db.supplierInvoice.count();
    const invoiceNumber = `FACT-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, "0")}`;

    const noteLines: string[] = [];
    if (commentaireEcart) noteLines.push(`Écart constaté : ${commentaireEcart}`);
    if (!allFulfilled) noteLines.push(`Livraison partielle — BC ${order.number}.`);

    if (!existingInvoice) {
      await db.supplierInvoice.create({
        data: {
          orderId,
          supplierId: supplierId || order.supplierId,
          invoiceNumber,
          invoiceDate: new Date(receiptDate),
          amountHT,
          amountTVA,
          amountTTC,
          paid: false,
          note: noteLines.length > 0 ? noteLines.join(" ") : null,
        },
      });
    } else {
      // Update existing invoice with new totals (partial delivery case)
      await db.supplierInvoice.update({
        where: { id: existingInvoice.id },
        data: {
          amountHT: Number(existingInvoice.amountHT) + amountHT,
          amountTVA: Number(existingInvoice.amountTVA) + amountTVA,
          amountTTC: Number(existingInvoice.amountTTC) + amountTTC,
          note: noteLines.length > 0 ? noteLines.join(" ") : existingInvoice.note,
        },
      });
    }
  }

  // 15.8 Gestion des écarts de livraison — alert on significant gap
  const ecarts = items.filter((i) => {
    const gap = i.quantityOrdered - i.quantityReceived;
    const pct = i.quantityOrdered > 0 ? gap / i.quantityOrdered : 0;
    return gap > 0 && pct > 0.05; // alert if received < 95% of ordered
  });
  if (ecarts.length > 0) {
    const orderNum = order.number;
    const stationId = formData.get("stationId") as string | null;
    for (const ec of ecarts) {
      const pct = Math.round((1 - ec.quantityReceived / ec.quantityOrdered) * 100);
      await db.alert.create({
        data: {
          type: "ECART_STOCK",
          level: pct > 20 ? "RED" : "ORANGE",
          message: `Écart de livraison sur BC ${orderNum} — "${ec.description}": commandé ${ec.quantityOrdered}, reçu ${ec.quantityReceived} (manque ${pct}%).`,
          stationId: stationId || null,
        },
      });
    }
  }

  revalidatePath("/dashboard/achats/receptions");
  revalidatePath("/dashboard/achats/factures");
  revalidatePath("/dashboard/alertes");
  revalidatePath(`/dashboard/achats/commandes/${orderId}`);
}
