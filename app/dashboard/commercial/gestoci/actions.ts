"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";

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

  const withdrawal = await db.gESTOCIWithdrawal.create({
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

  await writeAuditLog({ userId: user.id, entity: "GESTOCIWithdrawal", entityId: withdrawal.id, action: "CREATE", meta: { number, destination: data.destination, blNumber: data.blNumber } });

  revalidatePath("/dashboard/commercial/gestoci");
  return { success: true };
}

export async function confirmerBL(withdrawalId: string) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const user = session.user as any;

  const withdrawal = await db.gESTOCIWithdrawal.findUnique({
    where: { id: withdrawalId },
    include: { items: { include: { fuel: true } } },
  });
  if (!withdrawal) throw new Error("BL introuvable.");
  if (withdrawal.status === "CONFIRME") throw new Error("Ce BL est déjà confirmé.");

  const deliveryDate = withdrawal.loadingDate ?? withdrawal.date;

  await db.$transaction(async (tx) => {
    // 1. Mettre à jour le statut du BL
    await tx.gESTOCIWithdrawal.update({
      where: { id: withdrawalId },
      data: { status: "CONFIRME" },
    });

    // 2. Créer un FuelDelivery par item (par station + carburant)
    for (const item of withdrawal.items) {
      if (!item.stationId) continue;

      // Vérifier qu'un dépotage n'existe pas déjà pour ce BL + station + fuel
      const existing = await tx.fuelDelivery.findFirst({
        where: {
          stationId: item.stationId,
          fuelId: item.fuelId,
          blNumber: withdrawal.blNumber ?? withdrawal.number,
          date: deliveryDate,
        },
      });
      if (existing) continue;

      await tx.fuelDelivery.create({
        data: {
          stationId: item.stationId,
          fuelId: item.fuelId,
          date: deliveryDate,
          quantity: item.quantityReel,
          blNumber: withdrawal.blNumber ?? withdrawal.number,
          truckNumber: withdrawal.truckRef ?? null,
          note: `BL GESTOCI ${withdrawal.number}${withdrawal.bepNumber ? ` · BEP ${withdrawal.bepNumber}` : ""}`,
        },
      });
    }
  });

  await writeAuditLog({
    userId: user.id,
    entity: "GESTOCIWithdrawal",
    entityId: withdrawalId,
    action: "UPDATE",
    meta: { number: withdrawal.number },
  });

  revalidatePath("/dashboard/commercial/gestoci");
  revalidatePath("/dashboard/gerant/livraisons");
  revalidatePath("/dashboard/gerant/stocks");
  return { success: true };
}

export async function marquerLivre(withdrawalId: string) {
  await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);

  const withdrawal = await db.gESTOCIWithdrawal.findUnique({ where: { id: withdrawalId } });
  if (!withdrawal) throw new Error("BL introuvable.");
  if (withdrawal.status === "CONFIRME") throw new Error("Ce BL est déjà confirmé.");

  await db.gESTOCIWithdrawal.update({
    where: { id: withdrawalId },
    data: { status: "LIVRE" },
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

  const records = await db.$transaction(
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

  if (records[0]) {
    await writeAuditLog({ userId: user.id, entity: "GESTOCIStockReading", entityId: records[0].id, action: "RECORD_READING", meta: { date: data.date, count: data.readings.length } });
  }

  revalidatePath("/dashboard/commercial/gestoci");
  return { success: true };
}
