"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const fraisSchema = z.object({
  stationId: z.string(),
  date: z.string(),
  type: z.string(),
  libelle: z.string().min(1),
  montant: z.coerce.number().positive(),
});

export async function saveFrais(formData: FormData) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const userId = (session.user as any).id as string;
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
    throw new Error("Accès refusé.");
  }

  await db.fraisJournalier.create({
    data: {
      stationId: data.stationId,
      date: new Date(data.date),
      type: data.type as any,
      libelle: data.libelle,
      montant: data.montant,
      userId,
    },
  });

  revalidatePath("/dashboard/gerant/frais");
  revalidatePath("/dashboard/gerant/versements");
  return { success: true };
}

export async function deleteFrais(id: string) {
  await requireRole(["ADMIN", "GERANT"]);
  await db.fraisJournalier.delete({ where: { id } });
  revalidatePath("/dashboard/gerant/frais");
  revalidatePath("/dashboard/gerant/versements");
  return { success: true };
}
