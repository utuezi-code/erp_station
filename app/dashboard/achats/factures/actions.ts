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

export async function completeInvoice(
  invoiceId: string,
  amountImposable: number,
  amountNonImposable: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);

    const invoice = await db.supplierInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { success: false, error: "Facture introuvable." };

    const total = amountImposable + amountNonImposable;
    const amountHT = Number(invoice.amountHT);
    if (Math.abs(total - amountHT) > 1) {
      return {
        success: false,
        error: `La somme imposable (${amountImposable}) + non-imposable (${amountNonImposable}) = ${total} ne correspond pas au montant HT de la facture (${amountHT}).`,
      };
    }

    await db.supplierInvoice.update({
      where: { id: invoiceId },
      data: {
        amountImposable,
        amountNonImposable,
        invoiceStatus: "COMPLETE",
      },
    });

    revalidatePath("/dashboard/achats/factures");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur interne." };
  }
}
