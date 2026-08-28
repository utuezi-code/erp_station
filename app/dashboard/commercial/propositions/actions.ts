"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProposal(data: {
  budgetAllocationId: string;
  justification?: string;
  items: { fuelId: string; quantityM15: number; estimatedUnitPrice: number }[];
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  if (!data.items.length) return { success: false, error: "Au moins un produit requis." };

  const totalAmount = data.items.reduce((s, i) => s + i.quantityM15 * i.estimatedUnitPrice, 0);

  // Vérifier que le total ne dépasse pas le budget DF disponible
  const allocation = await db.budgetAllocation.findUnique({ where: { id: data.budgetAllocationId } });
  if (!allocation) return { success: false, error: "Budget introuvable." };
  if (totalAmount > Number(allocation.allocatedAmount)) {
    return { success: false, error: `Le total (${totalAmount.toLocaleString("fr-CI")} FCFA) dépasse le budget disponible (${Number(allocation.allocatedAmount).toLocaleString("fr-CI")} FCFA).` };
  }

  const count = await db.purchaseProposal.count();
  const number = `PP/${new Date().getFullYear()}/${String(count + 1).padStart(3, "0")}`;

  await db.purchaseProposal.create({
    data: {
      number,
      budgetAllocationId: data.budgetAllocationId,
      userId: user.id,
      totalAmount,
      justification: data.justification || null,
      items: {
        create: data.items.map((i) => ({
          fuelId: i.fuelId,
          quantityM15: i.quantityM15,
          estimatedUnitPrice: i.estimatedUnitPrice,
          totalAmount: i.quantityM15 * i.estimatedUnitPrice,
        })),
      },
    },
  });

  revalidatePath("/dashboard/commercial/propositions");
  return { success: true };
}

export async function validateProposal(id: string, approved: boolean, reason?: string) {
  const session = await requireRole(["DIRECTION_GENERALE", "ADMIN"]);
  const user = session.user as any;

  const proposal = await db.purchaseProposal.findUnique({ where: { id } });
  if (!proposal || proposal.status !== "EN_ATTENTE") return { success: false, error: "Proposition introuvable ou déjà traitée." };

  await db.purchaseProposal.update({
    where: { id },
    data: {
      status: approved ? "VALIDE" : "REJETE",
      rejectionReason: approved ? null : (reason || null),
      validatedAt: new Date(),
      validatedBy: user.id,
    },
  });

  revalidatePath("/dashboard/commercial/propositions");
  return { success: true };
}
