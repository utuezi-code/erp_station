"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createBudgetRequest(data: {
  estimatedAmount?: number;
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
      estimatedAmount: data.estimatedAmount || null,
      justification: data.justification || null,
    },
  });

  revalidatePath("/dashboard/commercial/budget");
  return { success: true };
}

export async function communicateBudget(
  id: string,
  availableAmount: number,
  note?: string
) {
  const session = await requireRole(["DIRECTION_FINANCIERE", "ADMIN"]);
  const user = session.user as any;

  const br = await db.budgetRequest.findUnique({ where: { id } });
  if (!br || br.status !== "EN_ATTENTE") return { success: false, error: "Demande introuvable ou déjà traitée." };
  if (!availableAmount || availableAmount <= 0) return { success: false, error: "Montant disponible requis." };

  await db.$transaction([
    db.budgetRequest.update({ where: { id }, data: { status: "ACCORDE" } }),
    db.budgetAllocation.create({
      data: {
        budgetRequestId: id,
        userId: user.id,
        allocatedAmount: availableAmount,
        note: note || null,
      },
    }),
  ]);

  revalidatePath("/dashboard/commercial/budget");
  return { success: true };
}
