"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createBudgetRequest(data: {
  fuelId?: string;
  estimatedQty: number;
  estimatedAmount: number;
  justification?: string;
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const count = await db.budgetRequest.count();
  const number = `BR/${new Date().getFullYear()}/${String(count + 1).padStart(3, "0")}`;

  await db.budgetRequest.create({
    data: {
      number,
      userId: user.id,
      fuelId: data.fuelId || null,
      estimatedQty: data.estimatedQty,
      estimatedAmount: data.estimatedAmount,
      justification: data.justification || null,
    },
  });

  revalidatePath("/dashboard/commercial/budget");
  return { success: true };
}

export async function respondBudgetRequest(
  id: string,
  approved: boolean,
  allocatedAmount?: number,
  note?: string
) {
  const session = await requireRole(["DIRECTION_FINANCIERE", "ADMIN"]);
  const user = session.user as any;

  const br = await db.budgetRequest.findUnique({ where: { id } });
  if (!br || br.status !== "EN_ATTENTE") return { success: false, error: "Demande introuvable ou déjà traitée." };

  if (!approved) {
    await db.budgetRequest.update({
      where: { id },
      data: { status: "REJETE", rejectionReason: note || null },
    });
    revalidatePath("/dashboard/commercial/budget");
    return { success: true };
  }

  if (!allocatedAmount || allocatedAmount <= 0) return { success: false, error: "Montant accordé requis." };

  await db.$transaction([
    db.budgetRequest.update({ where: { id }, data: { status: "ACCORDE" } }),
    db.budgetAllocation.create({
      data: {
        budgetRequestId: id,
        userId: user.id,
        allocatedAmount,
        note: note || null,
      },
    }),
  ]);

  revalidatePath("/dashboard/commercial/budget");
  return { success: true };
}
