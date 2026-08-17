"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProposal(data: {
  budgetAllocationId: string;
  fuelId: string;
  quantityM15: number;
  estimatedUnitPrice: number;
  justification?: string;
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const totalAmount = data.quantityM15 * data.estimatedUnitPrice;
  const count = await db.purchaseProposal.count();
  const number = `PP/${new Date().getFullYear()}/${String(count + 1).padStart(3, "0")}`;

  await db.purchaseProposal.create({
    data: {
      number,
      budgetAllocationId: data.budgetAllocationId,
      userId: user.id,
      fuelId: data.fuelId,
      quantityM15: data.quantityM15,
      estimatedUnitPrice: data.estimatedUnitPrice,
      totalAmount,
      justification: data.justification || null,
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
