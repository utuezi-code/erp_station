"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const proposalSchema = z.object({
  fuelId: z.string(),
  salePrice: z.coerce.number().positive(),
  purchasePrice: z.coerce.number().positive(),
  justification: z.string().optional(),
  effectiveDate: z.string().optional(),
});

// DC proposes new prices
export async function proposePrix(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DIRECTION_COMMERCIALE"]);
    const userId = (session.user as any).id;

    const data = proposalSchema.parse({
      fuelId: formData.get("fuelId"),
      salePrice: formData.get("salePrice"),
      purchasePrice: formData.get("purchasePrice"),
      justification: formData.get("justification") || undefined,
      effectiveDate: formData.get("effectiveDate") || undefined,
    });

    // Cancel any existing pending proposal for same fuel
    await db.fuelPriceProposal.updateMany({
      where: { fuelId: data.fuelId, status: "EN_ATTENTE" },
      data: { status: "REMPLACE" },
    });

    await db.fuelPriceProposal.create({
      data: {
        fuelId: data.fuelId,
        userId,
        salePrice: data.salePrice,
        purchasePrice: data.purchasePrice,
        justification: data.justification,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        status: "EN_ATTENTE",
      },
    });

    revalidatePath("/dashboard/prix-carburants");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}

// DF validates or rejects a proposal
export async function validerPrix(
  id: string,
  approved: boolean,
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);
    const userId = (session.user as any).id;

    const proposal = await db.fuelPriceProposal.findUnique({
      where: { id },
      include: { fuel: true },
    });
    if (!proposal) return { success: false, error: "Proposition introuvable." };
    if (proposal.status !== "EN_ATTENTE") return { success: false, error: "Cette proposition a déjà été traitée." };

    await db.fuelPriceProposal.update({
      where: { id },
      data: {
        status: approved ? "VALIDE" : "REJETE",
        validatedBy: userId,
        validatedAt: new Date(),
        rejectionReason: !approved ? rejectionReason : null,
      },
    });

    if (approved) {
      const margin = Number(proposal.salePrice) - Number(proposal.purchasePrice);
      await db.fuel.update({
        where: { id: proposal.fuelId },
        data: {
          salePrice: proposal.salePrice,
          purchasePrice: proposal.purchasePrice,
          margin,
        },
      });

      await writeAuditLog({
        userId,
        entity: "Fuel",
        entityId: proposal.fuelId,
        action: "UPDATE",
        before: { salePrice: proposal.fuel.salePrice, purchasePrice: proposal.fuel.purchasePrice },
        after: { salePrice: proposal.salePrice, purchasePrice: proposal.purchasePrice, margin },
      });

      revalidatePath("/dashboard/admin/fuels");
      revalidatePath("/dashboard/gerant/index");
    }

    revalidatePath("/dashboard/prix-carburants");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}

// Admin direct update (kept for backward compat)
export async function updateFuelPrice(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const salePrice = parseFloat(formData.get("salePrice") as string);
  const purchasePrice = parseFloat(formData.get("purchasePrice") as string);

  if (isNaN(salePrice) || isNaN(purchasePrice) || salePrice <= 0 || purchasePrice <= 0) {
    return { error: "Prix invalides." };
  }

  const before = await db.fuel.findUnique({ where: { id }, select: { salePrice: true, purchasePrice: true, margin: true } });
  const margin = salePrice - purchasePrice;

  await db.fuel.update({ where: { id }, data: { salePrice, purchasePrice, margin } });

  await writeAuditLog({
    userId: (session.user as any).id,
    entity: "Fuel",
    entityId: id,
    action: "UPDATE",
    before: { salePrice: before?.salePrice, purchasePrice: before?.purchasePrice },
    after: { salePrice, purchasePrice, margin },
  });

  revalidatePath("/dashboard/prix-carburants");
  revalidatePath("/dashboard/admin/fuels");
  return { success: true };
}
