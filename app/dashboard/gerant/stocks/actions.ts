"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const movementSchema = z.object({
  tankId: z.string(),
  stationId: z.string(),
  fuelId: z.string(),
  date: z.string(),
  openingStock: z.coerce.number().nonnegative(),
  delivery: z.coerce.number().nonnegative().default(0),
  transfer: z.coerce.number().default(0),
  physicalStock: z.coerce.number().nonnegative().optional(),
});

export async function saveTankMovement(formData: FormData) {
  await requireRole(["ADMIN", "GERANT"]);

  const data = movementSchema.parse({
    tankId: formData.get("tankId"),
    stationId: formData.get("stationId"),
    fuelId: formData.get("fuelId"),
    date: formData.get("date"),
    openingStock: formData.get("openingStock"),
    delivery: formData.get("delivery") || 0,
    transfer: formData.get("transfer") || 0,
    physicalStock: formData.get("physicalStock") || undefined,
  });

  const date = new Date(data.date);

  // Calculate theoretical stock from daily sales for this fuel/station
  const salesVolume = await db.dailyIndex.aggregate({
    where: {
      stationId: data.stationId,
      date,
      nozzle: { fuelId: data.fuelId },
    },
    _sum: { volumeSold: true },
  });
  const sold = Number(salesVolume._sum.volumeSold || 0);
  const theoreticalStock = data.openingStock + data.delivery + data.transfer - sold;
  const gap = data.physicalStock !== undefined ? data.physicalStock - theoreticalStock : undefined;

  await db.tankMovement.upsert({
    where: { tankId_date: { tankId: data.tankId, date } },
    create: {
      tankId: data.tankId,
      stationId: data.stationId,
      fuelId: data.fuelId,
      date,
      openingStock: data.openingStock,
      delivery: data.delivery,
      transfer: data.transfer,
      theoreticalStock,
      physicalStock: data.physicalStock,
      gap,
    },
    update: {
      openingStock: data.openingStock,
      delivery: data.delivery,
      transfer: data.transfer,
      theoreticalStock,
      physicalStock: data.physicalStock,
      gap,
    },
  });

  revalidatePath("/dashboard/gerant/stocks");
  return { success: true, theoreticalStock };
}
