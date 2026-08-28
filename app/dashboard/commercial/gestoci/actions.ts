"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createWithdrawal(data: {
  date: string;
  loadingDate?: string;
  blNumber?: string;
  bepNumber?: string;
  truckRef?: string;
  citerneRef?: string;
  driverName?: string;
  destination?: string;
  note?: string;
  items: {
    fuelId: string;
    stationId: string;
    quantityM15: number;
    quantityReel: number;
    correctionFactor?: number;
    unitPrice: number;
  }[];
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const count = await db.gESTOCIWithdrawal.count();
  const number = `BL/IVORY/${new Date().getFullYear()}/${String(count + 1).padStart(3, "0")}`;

  await db.gESTOCIWithdrawal.create({
    data: {
      number,
      userId: user.id,
      date: new Date(data.date),
      loadingDate: data.loadingDate ? new Date(data.loadingDate) : null,
      blNumber: data.blNumber || null,
      bepNumber: data.bepNumber || null,
      truckRef: data.truckRef || null,
      citerneRef: data.citerneRef || null,
      driverName: data.driverName || null,
      destination: data.destination || null,
      note: data.note || null,
      items: {
        create: data.items.map((i) => ({
          fuelId: i.fuelId,
          stationId: i.stationId,
          quantityM15: i.quantityM15,
          quantityReel: i.quantityReel,
          correctionFactor: i.correctionFactor || null,
          unitPrice: i.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/dashboard/commercial/gestoci");
  return { success: true };
}

export async function recordStockReading(data: {
  date: string;
  readings: { fuelId: string; stockM15: number }[];
  note?: string;
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  await db.$transaction(
    data.readings.map((r) =>
      db.gESTOCIStockReading.create({
        data: {
          date: new Date(data.date),
          fuelId: r.fuelId,
          stockM15: r.stockM15,
          note: data.note || null,
          userId: user.id,
        },
      })
    )
  );

  revalidatePath("/dashboard/commercial/gestoci");
  return { success: true };
}
