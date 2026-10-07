"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { StationsCompteClient } from "./stations-client";

export default async function StationsComptePage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; stationId?: string }>;
}) {
  await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_GENERALE", "DIRECTION_FINANCIERE", "ADMIN"]);
  const sp = await searchParams;

  const now = new Date();
  const mois = sp.mois || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = mois.split("-").map(Number);
  const dateFrom = new Date(year, month - 1, 1);
  const dateTo = new Date(year, month, 0); // last day of month

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, code: true, city: true },
    orderBy: { name: "asc" },
  });

  const stationIds = sp.stationId ? [sp.stationId] : stations.map((s) => s.id);

  // ── Index (volumes vendus par station) ───────────────────────────────────────
  const dailyIndexes = await db.dailyIndex.groupBy({
    by: ["stationId"],
    where: {
      stationId: { in: stationIds },
      date: { gte: dateFrom, lte: dateTo },
      validated: true,
    },
    _sum: { volumeSold: true, revenue: true },
  });

  // ── Jauges / stocks cuves ────────────────────────────────────────────────────
  // Latest tank movement per tank per station
  const tankMovements = await db.tankMovement.findMany({
    where: {
      stationId: { in: stationIds },
      date: { gte: dateFrom, lte: dateTo },
    },
    include: { tank: { select: { name: true, capacity: true } }, fuel: { select: { name: true, code: true } } },
    orderBy: { date: "desc" },
  });

  // ── Recettes (encaissements) ─────────────────────────────────────────────────
  const encaissements = await db.cashCollection.groupBy({
    by: ["stationId", "type"],
    where: {
      stationId: { in: stationIds },
      date: { gte: dateFrom, lte: dateTo },
    },
    _sum: { amount: true },
  });

  // ── Versements ───────────────────────────────────────────────────────────────
  const versements = await db.versement.groupBy({
    by: ["stationId", "status"],
    where: {
      stationId: { in: stationIds },
      date: { gte: dateFrom, lte: dateTo },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  // ── Dépenses (ExploitationAccount) ──────────────────────────────────────────
  const exploitation = await db.exploitationAccount.findMany({
    where: {
      stationId: { in: stationIds },
      period: mois,
    },
  });

  // ── Crédits (transactions cartes carburant) ──────────────────────────────────
  const credits = await db.transactionCarte.groupBy({
    by: ["stationId"],
    where: {
      stationId: { in: stationIds },
      date: { gte: dateFrom, lte: dateTo },
    },
    _sum: { amount: true, volume: true },
    _count: { id: true },
  });

  // ── Dépotages (livraisons carburant) ─────────────────────────────────────────
  const depotages = await db.fuelDelivery.findMany({
    where: {
      stationId: { in: stationIds },
      date: { gte: dateFrom, lte: dateTo },
    },
    include: { fuel: { select: { name: true, code: true } } },
    orderBy: { date: "desc" },
  });

  // ── Mises à dispo (GESTOCI → station) ────────────────────────────────────────
  const misesADispo = await db.gESTOCIWithdrawalItem.findMany({
    where: {
      stationId: { in: stationIds },
      withdrawal: { date: { gte: dateFrom, lte: dateTo } },
    },
    include: {
      fuel: { select: { name: true, code: true } },
      withdrawal: { select: { date: true, blNumber: true, bepNumber: true } },
    },
    orderBy: { withdrawal: { date: "desc" } },
  });

  return (
    <StationsCompteClient
      stations={serialize(stations)}
      mois={mois}
      stationId={sp.stationId || ""}
      dailyIndexes={serialize(dailyIndexes)}
      tankMovements={serialize(tankMovements)}
      encaissements={serialize(encaissements)}
      versements={serialize(versements)}
      exploitation={serialize(exploitation)}
      credits={serialize(credits)}
      depotages={serialize(depotages)}
      misesADispo={serialize(misesADispo)}
    />
  );
}
