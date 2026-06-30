"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function createInvoice(formData: FormData) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE"]);

  const supplierId = formData.get("supplierId") as string;
  const orderId = (formData.get("orderId") as string) || null;
  const invoiceNumber = formData.get("invoiceNumber") as string;
  const invoiceDate = new Date(formData.get("invoiceDate") as string);
  const dueDate = formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null;
  const amountHT = parseFloat(formData.get("amountHT") as string) || 0;
  const amountTVA = parseFloat(formData.get("amountTVA") as string) || 0;
  const amountTTC = amountHT + amountTVA;
  const note = (formData.get("note") as string) || null;

  await db.supplierInvoice.create({
    data: {
      supplierId,
      orderId: orderId || undefined,
      invoiceNumber,
      invoiceDate,
      dueDate: dueDate || undefined,
      amountHT,
      amountTVA,
      amountTTC,
      note: note || undefined,
    },
  });

  revalidatePath("/dashboard/achats/factures");
}

export async function markInvoicePaid(invoiceId: string) {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);

  await db.supplierInvoice.update({
    where: { id: invoiceId },
    data: { paid: true, paidAt: new Date() },
  });

  revalidatePath("/dashboard/achats/factures");
}

export async function deleteInvoice(invoiceId: string) {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);

  await db.supplierInvoice.delete({ where: { id: invoiceId } });
  revalidatePath("/dashboard/achats/factures");
}
