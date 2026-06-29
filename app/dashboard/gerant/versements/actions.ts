"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const versementSchema = z.object({
  stationId: z.string(),
  bankAccountId: z.string().optional().nullable(),
  date: z.string(),
  amount: z.coerce.number().positive(),
  slipNumber: z.string().optional(),
  note: z.string().optional(),
});

export async function createVersement(formData: FormData) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const userId = (session.user as any).id;

  const data = versementSchema.parse({
    stationId: formData.get("stationId"),
    bankAccountId: formData.get("bankAccountId") || null,
    date: formData.get("date"),
    amount: formData.get("amount"),
    slipNumber: formData.get("slipNumber") || undefined,
    note: formData.get("note") || undefined,
  });

  const date = new Date(data.date);

  // Rule: amount cannot exceed available CA (total revenue - already versed)
  const caResult = await db.dailyIndex.aggregate({
    where: { stationId: data.stationId, date },
    _sum: { revenue: true },
  });
  const totalCA = Number(caResult._sum.revenue || 0);

  const versedResult = await db.versement.aggregate({
    where: { stationId: data.stationId, date, status: { not: "REJETE" } },
    _sum: { amount: true },
  });
  const alreadyVersed = Number(versedResult._sum.amount || 0);
  const available = totalCA - alreadyVersed;

  if (data.amount > available && totalCA > 0) {
    throw new Error(`Le montant dépasse le CA disponible (${available.toLocaleString("fr-CI")} FCFA).`);
  }

  const versement = await db.versement.create({
    data: {
      stationId: data.stationId,
      userId,
      bankAccountId: data.bankAccountId || null,
      date,
      amount: data.amount,
      slipNumber: data.slipNumber,
      note: data.note,
      status: "EN_ATTENTE",
    },
  });

  await writeAuditLog({
    userId,
    entity: "Versement",
    entityId: versement.id,
    action: "CREATE",
    after: { amount: data.amount, date: data.date },
  });

  revalidatePath("/dashboard/gerant/versements");
  revalidatePath("/dashboard/direction-financiere/versements");
  return { success: true };
}

export async function validateVersement(id: string, approved: boolean) {
  const session = await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);
  const userId = (session.user as any).id;

  const versement = await db.versement.update({
    where: { id },
    data: {
      status: approved ? "VALIDE" : "REJETE",
      validatedBy: userId,
      validatedAt: new Date(),
    },
  });

  await writeAuditLog({
    userId,
    entity: "Versement",
    entityId: id,
    action: approved ? "VALIDATE" : "REJECT",
  });

  revalidatePath("/dashboard/gerant/versements");
  revalidatePath("/dashboard/direction-financiere/versements");
  return { success: true };
}
