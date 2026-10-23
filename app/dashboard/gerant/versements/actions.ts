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
  dateRecette: z.string().optional(),
  amount: z.coerce.number().positive(),
  slipNumber: z.string().optional(),
  note: z.string().optional(),
});

export async function createVersement(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "GERANT"]);
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role as string;
    const userStationId = (session.user as any).stationId as string | null;

    const data = versementSchema.parse({
      stationId: formData.get("stationId"),
      bankAccountId: formData.get("bankAccountId") || null,
      date: formData.get("date"),
      dateRecette: formData.get("dateRecette") || undefined,
      amount: formData.get("amount"),
      slipNumber: formData.get("slipNumber") || undefined,
      note: formData.get("note") || undefined,
    });

    if (userRole === "GERANT" && data.stationId !== userStationId) {
      return { success: false, error: "Accès refusé : vous ne pouvez saisir des versements que pour votre propre station." };
    }

    // Gérant can declare versements for up to 7 days back (retard accepté)
    if (userRole === "GERANT") {
      const depositDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxFuture = new Date(today);
      maxFuture.setDate(today.getDate() + 1);
      if (depositDate > maxFuture) {
        return { success: false, error: "La date de versement ne peut pas être dans le futur." };
      }
      if (data.dateRecette) {
        const recetteDate = new Date(data.dateRecette);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        if (recetteDate < sevenDaysAgo) {
          return { success: false, error: "La date de recette ne peut pas remonter à plus de 7 jours." };
        }
      }
    }

    const date = new Date(data.date);
    const dateRecette = data.dateRecette ? new Date(data.dateRecette) : null;

    const versement = await db.versement.create({
      data: {
        stationId: data.stationId,
        userId,
        bankAccountId: data.bankAccountId || null,
        date,
        dateRecette,
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
      after: { amount: data.amount, date: data.date, dateRecette: data.dateRecette },
    });

    revalidatePath("/dashboard/gerant/versements");
    revalidatePath("/dashboard/direction-financiere/versements");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}

export async function validateVersement(id: string, approved: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);
    const userId = (session.user as any).id;

    await db.versement.update({
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
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}

// ─── Frais journaliers ────────────────────────────────────────────────────────

const fraisSchema = z.object({
  stationId: z.string(),
  date: z.string(),
  type: z.enum(["CONTRE_PLEIN", "AUTRE"]),
  libelle: z.string().min(1),
  montant: z.coerce.number().positive(),
});

export async function saveFrais(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "GERANT"]);
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role as string;
    const userStationId = (session.user as any).stationId as string | null;

    const data = fraisSchema.parse({
      stationId: formData.get("stationId"),
      date: formData.get("date"),
      type: formData.get("type"),
      libelle: formData.get("libelle"),
      montant: formData.get("montant"),
    });

    if (userRole === "GERANT" && data.stationId !== userStationId) {
      return { success: false, error: "Accès refusé." };
    }

    await db.fraisJournalier.create({
      data: {
        stationId: data.stationId,
        userId,
        date: new Date(data.date),
        type: data.type,
        libelle: data.libelle,
        montant: data.montant,
      },
    });

    revalidatePath("/dashboard/gerant/versements");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}

export async function deleteFrais(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "GERANT"]);
    const userRole = (session.user as any).role as string;
    const userStationId = (session.user as any).stationId as string | null;

    const frais = await db.fraisJournalier.findUnique({ where: { id } });
    if (!frais) return { success: false, error: "Frais introuvable." };
    if (userRole === "GERANT" && frais.stationId !== userStationId) {
      return { success: false, error: "Accès refusé." };
    }

    await db.fraisJournalier.delete({ where: { id } });
    revalidatePath("/dashboard/gerant/versements");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue." };
  }
}
