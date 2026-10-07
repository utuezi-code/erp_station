"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { ADVClient } from "./adv-client";

export default async function ADVPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_GENERALE", "DIRECTION_FINANCIERE", "ADMIN"]);
  const sp = await searchParams;

  const now = new Date();
  const annee = Number(sp.annee || now.getFullYear());
  const moisFilter = sp.mois || ""; // "" = all months of year

  const dateFrom = moisFilter
    ? new Date(annee, Number(moisFilter) - 1, 1)
    : new Date(annee, 0, 1);
  const dateTo = moisFilter
    ? new Date(annee, Number(moisFilter), 0)
    : new Date(annee, 11, 31);

  const [stations, fuels] = await Promise.all([
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true }, orderBy: { code: "asc" } }),
  ]);

  // ── Volumes & CA par station/produit/mois ──────────────────────────────────
  const indexData = await db.dailyIndex.groupBy({
    by: ["stationId", "nozzleId"],
    where: { date: { gte: dateFrom, lte: dateTo }, validated: true },
    _sum: { volumeSold: true, revenue: true },
  });

  // Nozzle → fuel mapping
  const nozzles = await db.nozzle.findMany({
    select: { id: true, fuelId: true },
  });
  const nozzleFuel = new Map(nozzles.map((n) => [n.id, n.fuelId]));

  // Monthly breakdown
  const monthlyData = await db.$queryRaw<{ station_id: string; fuel_id: string; mois: string; volume: number; revenue: number }[]>`
    SELECT
      di."stationId" AS station_id,
      n."fuelId" AS fuel_id,
      TO_CHAR(di.date, 'YYYY-MM') AS mois,
      SUM(di."volumeSold")::float AS volume,
      SUM(di.revenue)::float AS revenue
    FROM "DailyIndex" di
    JOIN "Nozzle" n ON n.id = di."nozzleId"
    WHERE di.date >= ${dateFrom} AND di.date <= ${dateTo}
      AND di.validated = true
    GROUP BY di."stationId", n."fuelId", TO_CHAR(di.date, 'YYYY-MM')
    ORDER BY mois ASC
  `;

  // ── Objectifs mensuels (ExploitationAccount fuelRevenue) ──────────────────
  const exploitation = await db.exploitationAccount.findMany({
    where: {
      period: moisFilter
        ? `${annee}-${String(moisFilter).padStart(2, "0")}`
        : { startsWith: String(annee) },
    },
    select: { stationId: true, period: true, fuelRevenue: true, shopRevenue: true, grossResult: true, netResult: true },
  });

  // ── Livraisons (dépotages) ─────────────────────────────────────────────────
  const depotages = await db.fuelDelivery.groupBy({
    by: ["stationId", "fuelId"],
    where: { date: { gte: dateFrom, lte: dateTo } },
    _sum: { quantity: true },
  });

  // ── Mises à disposition GESTOCI → stations ─────────────────────────────────
  const misesADispo = await db.gESTOCIWithdrawalItem.groupBy({
    by: ["stationId", "fuelId"],
    where: { withdrawal: { date: { gte: dateFrom, lte: dateTo } } },
    _sum: { quantityM15: true },
  });

  // ── Ventes crédit (cartes) ─────────────────────────────────────────────────
  const creditsADV = await db.transactionCarte.groupBy({
    by: ["stationId", "fuelId"],
    where: { date: { gte: dateFrom, lte: dateTo } },
    _sum: { amount: true, volume: true },
    _count: { id: true },
  });

  // ── Versements ─────────────────────────────────────────────────────────────
  const versements = await db.versement.groupBy({
    by: ["stationId", "status"],
    where: { date: { gte: dateFrom, lte: dateTo } },
    _sum: { amount: true },
  });

  return (
    <ADVClient
      stations={serialize(stations)}
      fuels={serialize(fuels)}
      annee={annee}
      moisFilter={moisFilter}
      indexData={serialize(indexData)}
      nozzleFuel={Object.fromEntries(nozzleFuel)}
      monthlyData={serialize(monthlyData)}
      exploitation={serialize(exploitation)}
      depotages={serialize(depotages)}
      misesADispo={serialize(misesADispo)}
      creditsADV={serialize(creditsADV)}
      versements={serialize(versements)}
    />
  );
}
