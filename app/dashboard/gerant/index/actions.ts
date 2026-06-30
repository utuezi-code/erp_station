"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const indexSchema = z.object({
  nozzleId: z.string(),
  stationId: z.string(),
  date: z.string(),
  indexStart: z.coerce.number().nonnegative(),
  indexEnd: z.coerce.number().nonnegative().optional(),
});

export async function saveIndex(formData: FormData) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const userRole = (session.user as any).role as string;
  const userStationId = (session.user as any).stationId as string | null;

  const data = indexSchema.parse({
    nozzleId: formData.get("nozzleId"),
    stationId: formData.get("stationId"),
    date: formData.get("date"),
    indexStart: formData.get("indexStart"),
    indexEnd: formData.get("indexEnd") || undefined,
  });

  // IDOR guard: GERANT can only save indexes for their own station
  if (userRole === "GERANT" && data.stationId !== userStationId) {
    throw new Error("Accès refusé : vous ne pouvez saisir des index que pour votre propre station.");
  }

  if (data.indexEnd !== undefined && data.indexEnd < data.indexStart) {
    throw new Error("L'index de fin doit être supérieur à l'index de début.");
  }

  const date = new Date(data.date);

  // Check if the day is already validated
  const existing = await db.dailyIndex.findUnique({
    where: { nozzleId_date: { nozzleId: data.nozzleId, date } },
  });

  if (existing?.validated) {
    throw new Error("Cette journée est validée et ne peut plus être modifiée.");
  }

  // Get nozzle + fuel sale price
  const nozzle = await db.nozzle.findUnique({
    where: { id: data.nozzleId },
    include: { fuel: { select: { salePrice: true } } },
  });
  if (!nozzle) throw new Error("Pistolet introuvable.");

  let volumeSold: number | undefined;
  let revenue: number | undefined;

  if (data.indexEnd !== undefined) {
    volumeSold = data.indexEnd - data.indexStart;
    revenue = volumeSold * Number(nozzle.fuel.salePrice);
  }

  await db.dailyIndex.upsert({
    where: { nozzleId_date: { nozzleId: data.nozzleId, date } },
    create: {
      nozzleId: data.nozzleId,
      stationId: data.stationId,
      date,
      indexStart: data.indexStart,
      indexEnd: data.indexEnd,
      volumeSold,
      revenue,
    },
    update: {
      indexStart: data.indexStart,
      indexEnd: data.indexEnd,
      volumeSold,
      revenue,
    },
  });

  revalidatePath("/dashboard/gerant/index");
  return { success: true };
}

export async function validateDay(stationId: string, date: string) {
  await requireRole(["ADMIN", "DIRECTION_COMMERCIALE"]);

  const d = new Date(date);
  await db.dailyIndex.updateMany({
    where: { stationId, date: d },
    data: { validated: true, validatedAt: new Date() },
  });

  revalidatePath("/dashboard/gerant/index");
  return { success: true };
}
