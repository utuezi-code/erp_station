"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ROLES = ["ADMIN" as const, "DIRECTION_FINANCIERE" as const, "DIRECTION_GENERALE" as const];
const PATH = "/dashboard/direction-financiere/clients-credit";

// ── Conditions tarifaires (remise, stock, PU pompe) ───────────────────────────

const conditionSchema = z.object({
  clientId: z.string().min(1),
  fuelId: z.string().min(1),
  remise: z.coerce.number().min(0),
  stockActuel: z.coerce.number().min(0),
  puPompe: z.coerce.number().min(0),
});

export async function saveConditionCarburant(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(ROLES);
    const data = conditionSchema.parse({
      clientId: formData.get("clientId"),
      fuelId: formData.get("fuelId"),
      remise: formData.get("remise") || 0,
      stockActuel: formData.get("stockActuel") || 0,
      puPompe: formData.get("puPompe") || 0,
    });

    await db.clientConditionCarburant.upsert({
      where: { clientId_fuelId: { clientId: data.clientId, fuelId: data.fuelId } },
      create: data,
      update: { remise: data.remise, stockActuel: data.stockActuel, puPompe: data.puPompe },
    });

    revalidatePath(PATH);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}

// ── Paramètres contrat client ─────────────────────────────────────────────────

const contratSchema = z.object({
  clientId: z.string().min(1),
  delaiReglement: z.string().optional(),
  typeContrat: z.string().optional(),
  creditStation: z.coerce.number().min(0).optional(),
});

export async function saveContratClient(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(ROLES);
    const data = contratSchema.parse({
      clientId: formData.get("clientId"),
      delaiReglement: (formData.get("delaiReglement") as string) || undefined,
      typeContrat: (formData.get("typeContrat") as string) || undefined,
      creditStation: formData.get("creditStation") || undefined,
    });

    await db.clientCreditCompte.update({
      where: { id: data.clientId },
      data: {
        delaiReglement: data.delaiReglement,
        typeContrat: data.typeContrat,
        creditStation: data.creditStation ?? null,
      },
    });

    revalidatePath(PATH);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}
