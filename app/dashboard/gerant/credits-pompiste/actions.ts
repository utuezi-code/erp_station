"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const venteSchema = z.object({
  stationId: z.string(),
  pompisteId: z.string(),
  date: z.string(),
  clientNom: z.string().min(1),
  montant: z.coerce.number().positive(),
  volume: z.coerce.number().nonnegative().optional(),
  description: z.string().optional(),
});

export async function createVenteCredit(formData: FormData) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const userRole = (session.user as any).role as string;
  const userStationId = (session.user as any).stationId as string | null;

  const data = venteSchema.parse({
    stationId: formData.get("stationId"),
    pompisteId: formData.get("pompisteId"),
    date: formData.get("date"),
    clientNom: formData.get("clientNom"),
    montant: formData.get("montant"),
    volume: formData.get("volume") || undefined,
    description: formData.get("description") || undefined,
  });

  if (userRole === "GERANT" && data.stationId !== userStationId) {
    throw new Error("Accès refusé.");
  }

  await db.venteCreditPompiste.create({
    data: {
      stationId: data.stationId,
      pompisteId: data.pompisteId,
      date: new Date(data.date),
      clientNom: data.clientNom,
      montant: data.montant,
      volume: data.volume,
      description: data.description,
    },
  });

  revalidatePath("/dashboard/gerant/credits-pompiste");
  return { success: true };
}

export async function encaisserVenteCredit(id: string, paidAmount: number) {
  await requireRole(["ADMIN", "GERANT"]);

  await db.venteCreditPompiste.update({
    where: { id },
    data: {
      paid: true,
      paidAt: new Date(),
      paidAmount,
    },
  });

  revalidatePath("/dashboard/gerant/credits-pompiste");
  return { success: true };
}

export async function deleteVenteCredit(id: string) {
  await requireRole(["ADMIN", "GERANT"]);
  await db.venteCreditPompiste.delete({ where: { id } });
  revalidatePath("/dashboard/gerant/credits-pompiste");
  return { success: true };
}
