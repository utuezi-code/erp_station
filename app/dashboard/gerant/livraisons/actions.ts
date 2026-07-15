"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  stationId: z.string(),
  fuelId: z.string(),
  date: z.string(),
  quantity: z.coerce.number().positive(),
  blNumber: z.string().optional(),
  truckNumber: z.string().optional(),
  depot: z.string().optional(),
  miseADispoId: z.string().optional(),
});

export async function saveLivraison(formData: FormData) {
  const session = await requireRole(["ADMIN", "GERANT", "DIRECTION_GENERALE"]);
  const userRole = (session.user as any).role as string;
  const userStationId = (session.user as any).stationId as string | null;

  const data = schema.parse({
    stationId: formData.get("stationId"),
    fuelId: formData.get("fuelId"),
    date: formData.get("date"),
    quantity: formData.get("quantity"),
    blNumber: formData.get("blNumber") || undefined,
    truckNumber: formData.get("truckNumber") || undefined,
    depot: formData.get("depot") || undefined,
    miseADispoId: formData.get("miseADispoId") || undefined,
  });

  if (userRole === "GERANT" && data.stationId !== userStationId) {
    throw new Error("Accès refusé : vous ne pouvez saisir des livraisons que pour votre propre station.");
  }

  await db.fuelDelivery.create({
    data: {
      stationId: data.stationId,
      fuelId: data.fuelId,
      date: new Date(data.date),
      quantity: data.quantity,
      blNumber: data.blNumber,
      truckNumber: data.truckNumber,
      depot: data.depot,
      miseADispoId: data.miseADispoId || null,
    },
  });

  // Si liée à une MD → passer la MD à LIVREE
  if (data.miseADispoId) {
    await db.miseADisposition.update({
      where: { id: data.miseADispoId },
      data: { status: "LIVREE" },
    });
    revalidatePath("/dashboard/approvisionnement/mises-a-disposition");
  }

  revalidatePath("/dashboard/gerant/livraisons");
  return { success: true };
}
