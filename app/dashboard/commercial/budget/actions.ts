"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";

export async function createBudgetRequest() {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const count = await db.budgetRequest.count();
  const number = `BR/${new Date().getFullYear()}/${String(count + 1).padStart(3, "0")}`;

  const br = await db.budgetRequest.create({
    data: { number, userId: user.id },
  });

  await writeAuditLog({ userId: user.id, entity: "BudgetRequest", entityId: br.id, action: "CREATE", meta: { number } });

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

  const [, allocation] = await db.$transaction([
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

  await writeAuditLog({ userId: user.id, entity: "BudgetAllocation", entityId: allocation.id, action: "CREATE", meta: { budgetRequestId: id, allocatedAmount: availableAmount } });

  revalidatePath("/dashboard/commercial/budget");
  return { success: true };
}
