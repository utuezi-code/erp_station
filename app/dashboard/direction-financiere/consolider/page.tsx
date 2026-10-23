import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { ConsoliderGlobalClient } from "./consolider-global-client";

export default async function ConsoliderGlobalPage() {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const annee = new Date().getFullYear();
  const yearStart = new Date(annee, 0, 1);
  const today = new Date();

  const CREDIT_TYPES = new Set(["NOTE_CREDIT", "REMISE", "AUTRE_CREDIT"]);

  // ── Fuels ───────────────────────────────────────────────────────────────────
  const fuels = await db.fuel.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true, salePrice: true },
    orderBy: { name: "asc" },
  });

  // ── Stations ─────────────────────────────────────────────────────────────────
  const rawStations = await db.station.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      soldesInitiaux: { where: { annee } },
      mouvementsCompte: {
        where: { date: { gte: yearStart } },
        select: { type: true, montant: true },
      },
      versements: {
        where: { date: { gte: yearStart } },
        select: { amount: true, status: true },
      },
      dailyIndexes: {
        where: { date: { gte: yearStart } },
        include: { nozzle: { select: { fuelId: true } } },
      },
    },
  });

  const stationIds = rawStations.map((s) => s.id);

  // Encaissements par station pour calculer le non-encaissé
  const cashCollectionsAgg = await db.cashCollection.groupBy({
    by: ["stationId"],
    where: { stationId: { in: stationIds }, date: { gte: yearStart } },
    _sum: { amount: true },
  });
  const encaisseByStation: Record<string, number> = Object.fromEntries(
    cashCollectionsAgg.map((r) => [r.stationId, Number(r._sum.amount ?? 0)])
  );

  // Latest physicalStock per stationId+fuelId
  const tankMovements = await db.tankMovement.findMany({
    where: { stationId: { in: stationIds }, date: { lte: today } },
    orderBy: { date: "desc" },
    select: { stationId: true, fuelId: true, physicalStock: true, theoreticalStock: true, date: true },
  });

  // Build latest stock map: stationId+fuelId -> stock
  const stockMap: Record<string, number> = {};
  for (const tm of tankMovements) {
    const key = `${tm.stationId}:${tm.fuelId}`;
    if (!(key in stockMap)) {
      stockMap[key] = Number(tm.physicalStock ?? tm.theoreticalStock ?? 0);
    }
  }

  const stationRows = rawStations.map((s, i) => {
    const soldeInitial = Number(s.soldesInitiaux[0]?.solde ?? 0);
    const debit = (s.dailyIndexes as any[]).reduce((sum: number, di: any) => sum + Number(di.revenue ?? 0), 0);
    // Versements validés seulement comptent comme crédit réel
    const creditVersements = s.versements.filter((v: any) => v.status === "VALIDE").reduce((sum, v) => sum + Number(v.amount), 0);
    const creditMouvements = s.mouvementsCompte.reduce((sum, m) => {
      const amt = Number(m.montant);
      return CREDIT_TYPES.has(m.type) ? sum + amt : sum - amt;
    }, 0);
    const credit = creditVersements + creditMouvements;
    const solde = soldeInitial + debit - credit;
    // Encaissé vs CA (pour afficher le delta non-encaissé)
    const totalEncaisse = encaisseByStation[s.id] ?? 0;
    const nonEncaisse = debit - totalEncaisse;

    const volByFuel: Record<string, number> = {};
    let derniereLivraison: string | null = null;
    for (const di of s.dailyIndexes as any[]) {
      const fuelId = di.nozzle?.fuelId;
      if (fuelId) {
        volByFuel[fuelId] = (volByFuel[fuelId] ?? 0) + Number(di.volumeSold ?? 0);
      }
      const d = new Date(di.date).toISOString().slice(0, 10);
      if (!derniereLivraison || d > derniereLivraison) derniereLivraison = d;
    }

    const stockByFuel: Record<string, number> = {};
    for (const f of fuels) {
      const key = `${s.id}:${f.id}`;
      if (key in stockMap) stockByFuel[f.id] = stockMap[key];
    }

    const puByFuel: Record<string, number> = {};
    for (const f of fuels) puByFuel[f.id] = Number(f.salePrice);

    return {
      num: i + 1,
      id: s.id,
      nom: s.name,
      type: "SS" as const,
      active: s.status === "ACTIVE",
      typeContrat: "DIRECT",
      href: `/dashboard/direction-financiere/stations?stationId=${s.id}`,
      soldeInitial,
      debit,
      credit,
      solde,
      totalEncaisse,
      nonEncaisse,
      volByFuel,
      stockByFuel,
      puByFuel,
      remiseByFuel: {} as Record<string, number>,
      creditStation: 0,
      delais: "",
      derniereLivraison,
    };
  });

  // ── Credit clients ───────────────────────────────────────────────────────────
  const rawClients = await db.clientCreditCompte.findMany({
    orderBy: { nom: "asc" },
    include: {
      soldeInitiaux: { where: { annee } },
      livraisons: {
        where: { date: { gte: yearStart } },
        select: { montant: true, quantite: true, fuelId: true, date: true },
      },
      mouvements: { select: { type: true, montant: true } },
      conditionsCarb: {
        include: { fuel: { select: { id: true, code: true, salePrice: true } } },
      },
    },
  });

  const clientRows = rawClients.map((c, i) => {
    const soldeInitial = Number(c.soldeInitiaux[0]?.solde ?? 0);
    const debit = c.livraisons.reduce((s, l) => s + Number(l.montant), 0);
    const credit = c.mouvements.reduce((s, m) => {
      const amt = Number(m.montant);
      return CREDIT_TYPES.has(m.type) ? s + amt : s - amt;
    }, 0);
    const solde = soldeInitial + debit - credit;

    const volByFuel: Record<string, number> = {};
    let derniereLivraison: string | null = null;
    for (const l of c.livraisons) {
      volByFuel[l.fuelId] = (volByFuel[l.fuelId] ?? 0) + Number(l.quantite);
      const d = new Date(l.date).toISOString().slice(0, 10);
      if (!derniereLivraison || d > derniereLivraison) derniereLivraison = d;
    }

    const puByFuel: Record<string, number> = {};
    const remiseByFuel: Record<string, number> = {};
    const stockByFuel: Record<string, number> = {};
    for (const cc of c.conditionsCarb) {
      puByFuel[cc.fuelId] = Number(cc.puPompe);
      remiseByFuel[cc.fuelId] = Number(cc.remise);
      stockByFuel[cc.fuelId] = Number(cc.stockActuel);
    }

    return {
      num: stationRows.length + i + 1,
      id: c.id,
      nom: c.nom,
      type: "CLIENT" as const,
      active: c.active,
      typeContrat: c.typeContrat ?? "",
      href: `/dashboard/direction-financiere/clients-credit/${c.id}`,
      soldeInitial,
      debit,
      credit,
      solde,
      volByFuel,
      stockByFuel,
      puByFuel,
      remiseByFuel,
      creditStation: Number(c.creditStation ?? 0),
      delais: c.delaiReglement ?? "",
      derniereLivraison,
    };
  });

  const rows = [...stationRows, ...clientRows];

  return (
    <ConsoliderGlobalClient
      rows={serialize(rows)}
      fuels={serialize(fuels)}
      annee={annee}
    />
  );
}
