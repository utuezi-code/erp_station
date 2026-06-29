"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function markAlertRead(alertId: string) {
  await requireRole(["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  await db.alert.update({ where: { id: alertId }, data: { read: true } });
  revalidatePath("/dashboard/alertes");
}

export async function markAllRead() {
  await requireRole(["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  await db.alert.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/dashboard/alertes");
}

export async function generateAlerts() {
  await requireRole(["ADMIN"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    include: {
      tanks: { where: { active: true } },
      users: { where: { role: "GERANT", active: true } },
    },
  });

  const created: string[] = [];

  for (const station of stations) {
    // Check: versement non effectué (CA yesterday but no versement)
    const [salesYesterday, versementsYesterday] = await Promise.all([
      db.dailyIndex.aggregate({
        where: { stationId: station.id, date: yesterday },
        _sum: { revenue: true },
      }),
      db.versement.aggregate({
        where: { stationId: station.id, date: yesterday, status: { not: "REJETE" } },
        _sum: { amount: true },
      }),
    ]);

    const ca = Number(salesYesterday._sum.revenue || 0);
    const versé = Number(versementsYesterday._sum.amount || 0);

    if (ca > 0 && versé === 0) {
      const existing = await db.alert.findFirst({
        where: {
          stationId: station.id,
          type: "VERSEMENT_NON_EFFECTUE",
          createdAt: { gte: yesterday },
        },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            type: "VERSEMENT_NON_EFFECTUE",
            level: "ORANGE",
            message: `Aucun versement effectué le ${yesterday.toLocaleDateString("fr-CI")} pour un CA de ${ca.toLocaleString("fr-CI")} FCFA.`,
            stationId: station.id,
          },
        });
        created.push(`VERSEMENT_NON_EFFECTUE:${station.name}`);
      }
    }

    // Check: écart stock (gap > 200L on any tank)
    for (const tank of station.tanks) {
      const lastMovement = await db.tankMovement.findFirst({
        where: { tankId: tank.id },
        orderBy: { date: "desc" },
      });
      if (lastMovement && lastMovement.gap !== null && Math.abs(Number(lastMovement.gap)) > 200) {
        const existing = await db.alert.findFirst({
          where: {
            stationId: station.id,
            type: "ECART_STOCK",
            createdAt: { gte: today },
          },
        });
        if (!existing) {
          await db.alert.create({
            data: {
              type: "ECART_STOCK",
              level: Math.abs(Number(lastMovement.gap)) > 500 ? "RED" : "ORANGE",
              message: `Écart de stock de ${Number(lastMovement.gap).toLocaleString("fr-CI")} L détecté sur la cuve ${tank.name}.`,
              stationId: station.id,
            },
          });
          created.push(`ECART_STOCK:${station.name}`);
        }
      }

      // Check: stock faible (physical stock < 20% of capacity)
      if (lastMovement && tank.capacity && Number(lastMovement.physicalStock) < Number(tank.capacity) * 0.2) {
        const existing = await db.alert.findFirst({
          where: {
            stationId: station.id,
            type: "STOCK_FAIBLE",
            createdAt: { gte: today },
          },
        });
        if (!existing) {
          await db.alert.create({
            data: {
              type: "STOCK_FAIBLE",
              level: Number(lastMovement.physicalStock) < Number(tank.capacity) * 0.1 ? "RED" : "ORANGE",
              message: `Stock faible sur la cuve ${tank.name}: ${Number(lastMovement.physicalStock).toLocaleString("fr-CI")} L restants (capacité: ${Number(tank.capacity).toLocaleString("fr-CI")} L).`,
              stationId: station.id,
            },
          });
          created.push(`STOCK_FAIBLE:${station.name}`);
        }
      }
    }

    // Check: retard saisie (no index for yesterday)
    const indexYesterday = await db.dailyIndex.count({
      where: { stationId: station.id, date: yesterday },
    });
    if (indexYesterday === 0) {
      const existing = await db.alert.findFirst({
        where: {
          stationId: station.id,
          type: "RETARD_SAISIE",
          createdAt: { gte: today },
        },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            type: "RETARD_SAISIE",
            level: "ORANGE",
            message: `Aucun index de pompe saisi pour le ${yesterday.toLocaleDateString("fr-CI")}.`,
            stationId: station.id,
          },
        });
        created.push(`RETARD_SAISIE:${station.name}`);
      }
    }
  }

  revalidatePath("/dashboard/alertes");
  return { created };
}
