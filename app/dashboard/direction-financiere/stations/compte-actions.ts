"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MouvementCompteType } from "@prisma/client";

const soldeInitialSchema = z.object({
  stationId: z.string().min(1),
  annee: z.coerce.number().int().min(2000).max(2100),
  solde: z.coerce.number(),
  note: z.string().optional(),
});

export async function saveCompteStationSoldeInitial(
  stationId: string,
  annee: number,
  solde: number,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole([
      "ADMIN",
      
      "DIRECTION_FINANCIERE",
      "DIRECTION_GENERALE",
    ]);
    const userId = (session.user as any).id as string;

    const data = soldeInitialSchema.parse({ stationId, annee, solde, note });

    const existing = await db.compteStationSoldeInitial.findUnique({
      where: { stationId_annee: { stationId: data.stationId, annee: data.annee } },
    });

    let record;
    if (existing) {
      record = await db.compteStationSoldeInitial.update({
        where: { id: existing.id },
        data: { solde: data.solde, note: data.note, userId },
      });
    } else {
      record = await db.compteStationSoldeInitial.create({
        data: {
          stationId: data.stationId,
          annee: data.annee,
          solde: data.solde,
          note: data.note,
          userId,
        },
      });
    }

    await writeAuditLog({
      userId,
      entity: "CompteStationSoldeInitial",
      entityId: record.id,
      action: existing ? "UPDATE" : "CREATE",
      after: { stationId: data.stationId, annee: data.annee, solde: data.solde },
    });

    revalidatePath("/dashboard/direction-financiere/stations");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}

const mouvementSchema = z.object({
  stationId: z.string().min(1),
  date: z.string().min(1),
  type: z.nativeEnum(MouvementCompteType),
  montant: z.coerce.number(),
  libelle: z.string().min(1),
  reference: z.string().optional(),
});

export async function addMouvementCompteStation(
  stationId: string,
  date: string,
  type: MouvementCompteType,
  montant: number,
  libelle: string,
  reference?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole([
      "ADMIN",
      
      "DIRECTION_FINANCIERE",
      "DIRECTION_GENERALE",
    ]);
    const userId = (session.user as any).id as string;

    const data = mouvementSchema.parse({ stationId, date, type, montant, libelle, reference });

    const mouvement = await db.mouvementCompteStation.create({
      data: {
        stationId: data.stationId,
        date: new Date(data.date),
        type: data.type,
        montant: data.montant,
        libelle: data.libelle,
        reference: data.reference,
        userId,
      },
    });

    await writeAuditLog({
      userId,
      entity: "MouvementCompteStation",
      entityId: mouvement.id,
      action: "CREATE",
      after: { stationId, date, type, montant, libelle },
    });

    revalidatePath("/dashboard/direction-financiere/stations");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}
