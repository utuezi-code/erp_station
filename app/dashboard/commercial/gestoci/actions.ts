"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createWithdrawal(data: {
  date: string;
  truckRef?: string;
  driverName?: string;
  note?: string;
  items: { fuelId: string; stationId: string; quantityM15: number; quantityReel: number; unitPrice: number }[];
}) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const count = await db.gESTOCIWithdrawal.count();
  const number = `RET/GESTOCI/${new Date().getFullYear()}/${String(count + 1).padStart(3, "0")}`;

  await db.gESTOCIWithdrawal.create({
    data: {
      number,
      userId: user.id,
      date: new Date(data.date),
      truckRef: data.truckRef || null,
      driverName: data.driverName || null,
      note: data.note || null,
      items: {
        create: data.items.map((i) => ({
          fuelId: i.fuelId,
          stationId: i.stationId,
          quantityM15: i.quantityM15,
          quantityReel: i.quantityReel,
          unitPrice: i.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/dashboard/commercial/gestoci");
  return { success: true };
}
