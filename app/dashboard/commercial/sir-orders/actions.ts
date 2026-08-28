"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";

export async function createSIROrder(data: {
  proposalId: string;
  supplierId?: string;
  items: { fuelId: string; quantityM15: number; unitPrice: number }[];
  note?: string;
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const count = await db.sIROrder.count();
  const year = new Date().getFullYear();
  const number = `BC/DC/${year}/${String(count + 1).padStart(3, "0")}`;

  const order = await db.sIROrder.create({
    data: {
      number,
      proposalId: data.proposalId,
      userId: user.id,
      supplierId: data.supplierId || null,
      note: data.note || null,
      items: {
        create: data.items.map((item) => ({
          fuelId: item.fuelId,
          quantityM15: item.quantityM15,
          unitPrice: item.unitPrice,
          totalAmount: item.quantityM15 * item.unitPrice,
        })),
      },
    },
  });

  await writeAuditLog({ userId: user.id, entity: "SIROrder", entityId: order.id, action: "CREATE", meta: { number } });

  revalidatePath("/dashboard/commercial/sir-orders");
  return { success: true, id: order.id };
}

export async function sendSIROrder(id: string) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const order = await db.sIROrder.findUnique({ where: { id }, select: { number: true } });

  await db.sIROrder.update({
    where: { id },
    data: { status: "ENVOYE", sentAt: new Date() },
  });

  await writeAuditLog({ userId: user.id, entity: "SIROrder", entityId: id, action: "SEND", meta: { number: order?.number } });

  revalidatePath("/dashboard/commercial/sir-orders");
  revalidatePath(`/dashboard/commercial/sir-orders/${id}`);
  return { success: true };
}

export async function recordSIROffer(data: {
  sirOrderId: string;
  offerNumber?: string;
  pdfUrl?: string;
  validFrom?: string;
  validTo?: string;
  totalAmount?: number;
  note?: string;
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const [offer] = await db.$transaction([
    db.sIROffer.create({
      data: {
        sirOrderId: data.sirOrderId,
        offerNumber: data.offerNumber || null,
        pdfUrl: data.pdfUrl || null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        totalAmount: data.totalAmount || null,
        note: data.note || null,
      },
    }),
    db.sIROrder.update({
      where: { id: data.sirOrderId },
      data: { status: "OFFRE_RECUE" },
    }),
  ]);

  await writeAuditLog({ userId: user.id, entity: "SIROffer", entityId: offer.id, action: "RECORD_OFFER", meta: { sirOrderId: data.sirOrderId, offerNumber: data.offerNumber } });

  revalidatePath("/dashboard/commercial/sir-orders");
  revalidatePath(`/dashboard/commercial/sir-orders/${data.sirOrderId}`);
  return { success: true };
}

export async function recordSIRPayment(data: {
  sirOrderId: string;
  beneficiary: string;
  checkNumber: string;
  bankName?: string;
  amount: number;
  paidAt: string;
  note?: string;
}) {
  const session = await requireRole(["DIRECTION_FINANCIERE", "ADMIN"]);
  const user = session.user as any;

  const payment = await db.sIRPayment.create({
    data: {
      sirOrderId: data.sirOrderId,
      beneficiary: data.beneficiary,
      checkNumber: data.checkNumber,
      bankName: data.bankName || null,
      amount: data.amount,
      paidAt: new Date(data.paidAt),
      userId: user.id,
      note: data.note || null,
    },
  });

  await writeAuditLog({ userId: user.id, entity: "SIRPayment", entityId: payment.id, action: "RECORD_PAYMENT", meta: { sirOrderId: data.sirOrderId, amount: data.amount, checkNumber: data.checkNumber } });

  const order = await db.sIROrder.findUnique({
    where: { id: data.sirOrderId },
    include: { items: true, payments: true },
  });
  if (order) {
    const orderTotal = order.items.reduce((s, i) => s + Number(i.totalAmount), 0);
    const paidTotal = [...order.payments, { amount: data.amount }].reduce((s, p) => s + Number(p.amount), 0);
    if (paidTotal >= orderTotal) {
      await db.sIROrder.update({ where: { id: data.sirOrderId }, data: { status: "PAYE" } });
    }
  }

  revalidatePath("/dashboard/commercial/sir-orders");
  revalidatePath(`/dashboard/commercial/sir-orders/${data.sirOrderId}`);
  return { success: true };
}

export async function recordDeliveryOrder(data: {
  sirOrderId: string;
  reference?: string;
  depotName?: string;
  deliveryDate?: string;
  pdfUrl?: string;
  note?: string;
  entries: { fuelId: string; quantityM15: number }[];
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "ADMIN"]);
  const user = session.user as any;

  const deliveryOrder = await db.sIRDeliveryOrder.create({
    data: {
      sirOrderId: data.sirOrderId,
      reference: data.reference || null,
      depotName: data.depotName || null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      pdfUrl: data.pdfUrl || null,
      note: data.note || null,
      gestociEntries: {
        create: data.entries.map((e) => ({
          fuelId: e.fuelId,
          quantityM15: e.quantityM15,
          date: data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
        })),
      },
    },
  });

  await writeAuditLog({ userId: user.id, entity: "SIRDeliveryOrder", entityId: deliveryOrder.id, action: "RECORD_DELIVERY", meta: { sirOrderId: data.sirOrderId, reference: data.reference } });

  await db.sIROrder.update({ where: { id: data.sirOrderId }, data: { status: "LIVRE" } });

  revalidatePath("/dashboard/commercial/sir-orders");
  revalidatePath(`/dashboard/commercial/sir-orders/${data.sirOrderId}`);
  revalidatePath("/dashboard/commercial/gestoci");
  return { success: true };
}
