import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { SuiviClient } from "./suivi-client";

export type SuiviRow = {
  id: string;
  type: "INITIAL" | "ACHAT" | "BL" | "READING";
  date: string;

  // Achat SIR
  achatSuper?: number;
  achatGasoil?: number;
  achatRef?: string; // lien avec DO/SIR

  // BL
  blNumber?: string;
  bepNumber?: string;
  loadingDate?: string;
  tracteur?: string;
  citerne?: string;
  destination?: string;

  // Quantités
  qtyAmbiSuper?: number;
  qtyAmbiGasoil?: number;
  qtyM15Super?: number;
  qtyM15Gasoil?: number;
  facteurSuper?: number;
  facteurGasoil?: number;
  ecartSuper?: number;    // qtyM15 - volTheo (precision loss)
  ecartGasoil?: number;

  // Solde théorique courant (après cet événement)
  stockTheoSuper: number;
  stockTheoGasoil: number;

  // Relevé GESTOCI
  stockGestociSuper?: number;
  stockGestociGasoil?: number;
  ecartGestociSuper?: number;
  ecartGestociGasoil?: number;

  // Note
  note?: string;
};

export default async function GESTOCISuiviPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; q?: string }>;
}) {
  await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_GENERALE", "DIRECTION_FINANCIERE", "ADMIN"]);
  const params = await searchParams;

  const [fuels, entries, withdrawals, readings] = await Promise.all([
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
    db.gESTOCIEntry.findMany({
      include: {
        fuel: { select: { id: true, code: true } },
        deliveryOrder: { select: { reference: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.gESTOCIWithdrawal.findMany({
      include: {
        items: {
          include: { fuel: { select: { id: true, code: true } } },
        },
        user: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.gESTOCIStockReading.findMany({
      include: { fuel: { select: { id: true, code: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  // Find fuel IDs for SUPER and GASOIL
  const superFuel = fuels.find((f: { id: string; name: string; code: string }) => f.code.toUpperCase() === "SP" || f.name.toLowerCase().includes("super"));
  const gasoilFuel = fuels.find((f: { id: string; name: string; code: string }) => f.code.toUpperCase() === "GO" || f.name.toLowerCase().includes("gasoil"));
  const superFuelId = superFuel?.id ?? "";
  const gasoilFuelId = gasoilFuel?.id ?? "";

  // Build chronological events: group entries by date, withdrawals by withdrawal, readings by date+fuel
  type Event =
    | { type: "ENTRY"; date: Date; superId?: string; gasoilId?: string; superQty: number; gasoilQty: number; ref?: string }
    | { type: "BL"; date: Date; w: typeof withdrawals[0] }
    | { type: "READING"; date: Date; stockSuper?: number; stockGasoil?: number };

  const events: Event[] = [];

  // Group entries by date (purchases)
  const entryByDate = new Map<string, { superQty: number; gasoilQty: number; ref?: string }>();
  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10);
    const cur = entryByDate.get(key) ?? { superQty: 0, gasoilQty: 0 };
    if (e.fuelId === superFuelId) cur.superQty += Number(e.quantityM15);
    if (e.fuelId === gasoilFuelId) cur.gasoilQty += Number(e.quantityM15);
    entryByDate.set(key, cur);
  }
  for (const [dateStr, v] of entryByDate.entries()) {
    events.push({ type: "ENTRY", date: new Date(dateStr), superQty: v.superQty, gasoilQty: v.gasoilQty });
  }

  // Withdrawals
  for (const w of withdrawals) {
    events.push({ type: "BL", date: w.date, w });
  }

  // Group readings by date
  const readingByDate = new Map<string, { stockSuper?: number; stockGasoil?: number }>();
  for (const r of readings) {
    const key = r.date.toISOString().slice(0, 10);
    const cur = readingByDate.get(key) ?? {};
    if (r.fuelId === superFuelId) cur.stockSuper = Number(r.stockM15);
    if (r.fuelId === gasoilFuelId) cur.stockGasoil = Number(r.stockM15);
    readingByDate.set(key, cur);
  }
  for (const [dateStr, v] of readingByDate.entries()) {
    events.push({ type: "READING", date: new Date(dateStr), stockSuper: v.stockSuper, stockGasoil: v.stockGasoil });
  }

  // Sort all events by date, then type (ENTRY before BL on same day, READING last)
  const typeOrder = { ENTRY: 0, BL: 1, READING: 2 };
  events.sort((a, b) => {
    const d = a.date.getTime() - b.date.getTime();
    if (d !== 0) return d;
    return typeOrder[a.type] - typeOrder[b.type];
  });

  // Build rows with running balance
  let balSuper = 0;
  let balGasoil = 0;
  const rows: SuiviRow[] = [];

  // Initial row
  rows.push({
    id: "initial",
    type: "INITIAL",
    date: "2025-12-31",
    stockTheoSuper: 0,
    stockTheoGasoil: 0,
    note: "Stock initial (Fin Déc 2025)",
  });

  let rowIdx = 0;
  for (const evt of events) {
    rowIdx++;
    const dateStr = evt.date.toISOString().slice(0, 10);

    if (evt.type === "ENTRY") {
      balSuper += evt.superQty;
      balGasoil += evt.gasoilQty;
      rows.push({
        id: `entry-${dateStr}-${rowIdx}`,
        type: "ACHAT",
        date: dateStr,
        achatSuper: evt.superQty || undefined,
        achatGasoil: evt.gasoilQty || undefined,
        stockTheoSuper: balSuper,
        stockTheoGasoil: balGasoil,
      });
    } else if (evt.type === "BL") {
      const w = evt.w;
      // Get per-fuel quantities
      const superItem = w.items.find((i: typeof w.items[0]) => i.fuelId === superFuelId);
      const gasoilItem = w.items.find((i: typeof w.items[0]) => i.fuelId === gasoilFuelId);
      const m15Super = Number(superItem?.quantityM15 ?? 0);
      const m15Gasoil = Number(gasoilItem?.quantityM15 ?? 0);
      const reelSuper = Number(superItem?.quantityReel ?? superItem?.quantityM15 ?? 0);
      const reelGasoil = Number(gasoilItem?.quantityReel ?? gasoilItem?.quantityM15 ?? 0);
      const factSuper = superItem?.correctionFactor ? Number(superItem.correctionFactor) : undefined;
      const factGasoil = gasoilItem?.correctionFactor ? Number(gasoilItem.correctionFactor) : undefined;

      balSuper -= m15Super;
      balGasoil -= m15Gasoil;

      // Écart = qtyM15 - volTheo. volTheo = reelAmbiant * facteur
      const volTheoSuper = factSuper ? reelSuper * factSuper : m15Super;
      const volTheoGasoil = factGasoil ? reelGasoil * factGasoil : m15Gasoil;
      const ecartS = m15Super > 0 ? Math.round((m15Super - volTheoSuper) * 100) / 100 : undefined;
      const ecartG = m15Gasoil > 0 ? Math.round((m15Gasoil - volTheoGasoil) * 100) / 100 : undefined;

      const bepNumber = w.bepNumber ?? (w.items[0]?.id ? undefined : undefined);

      rows.push({
        id: `bl-${w.id}`,
        type: "BL",
        date: dateStr,
        blNumber: w.blNumber ?? w.number,
        bepNumber: bepNumber,
        loadingDate: w.loadingDate?.toISOString().slice(0, 10),
        tracteur: w.truckRef ?? undefined,
        citerne: w.citerneRef ?? undefined,
        destination: w.destination ?? undefined,
        qtyAmbiSuper: m15Super > 0 ? reelSuper : undefined,
        qtyAmbiGasoil: m15Gasoil > 0 ? reelGasoil : undefined,
        qtyM15Super: m15Super > 0 ? m15Super : undefined,
        qtyM15Gasoil: m15Gasoil > 0 ? m15Gasoil : undefined,
        facteurSuper: factSuper,
        facteurGasoil: factGasoil,
        ecartSuper: ecartS,
        ecartGasoil: ecartG,
        stockTheoSuper: balSuper,
        stockTheoGasoil: balGasoil,
        note: w.note?.includes("Import") ? undefined : w.note ?? undefined,
      });
    } else if (evt.type === "READING") {
      // Find closest stock balance (from last BL row)
      const lastRow = rows[rows.length - 1];
      const theoS = lastRow?.stockTheoSuper ?? balSuper;
      const theoG = lastRow?.stockTheoGasoil ?? balGasoil;
      rows.push({
        id: `reading-${dateStr}-${rowIdx}`,
        type: "READING",
        date: dateStr,
        stockTheoSuper: theoS,
        stockTheoGasoil: theoG,
        stockGestociSuper: evt.stockSuper,
        stockGestociGasoil: evt.stockGasoil,
        ecartGestociSuper: evt.stockSuper != null ? Math.round((evt.stockSuper - theoS) * 100) / 100 : undefined,
        ecartGestociGasoil: evt.stockGasoil != null ? Math.round((evt.stockGasoil - theoG) * 100) / 100 : undefined,
      });
    }
  }

  // Apply filter
  const filterMois = params.mois;
  const filterQ = params.q?.toLowerCase();

  let filteredRows = rows;
  if (filterMois) {
    filteredRows = filteredRows.filter((r) => r.date.startsWith(filterMois));
  }
  if (filterQ) {
    filteredRows = filteredRows.filter((r) =>
      r.destination?.toLowerCase().includes(filterQ) ||
      r.blNumber?.toLowerCase().includes(filterQ) ||
      r.bepNumber?.toLowerCase().includes(filterQ) ||
      r.tracteur?.toLowerCase().includes(filterQ) ||
      r.note?.toLowerCase().includes(filterQ)
    );
  }

  // Totals
  const totalAchatSuper = rows.filter((r) => r.type === "ACHAT").reduce((s, r) => s + (r.achatSuper ?? 0), 0);
  const totalAchatGasoil = rows.filter((r) => r.type === "ACHAT").reduce((s, r) => s + (r.achatGasoil ?? 0), 0);
  const totalM15Super = rows.filter((r) => r.type === "BL").reduce((s, r) => s + (r.qtyM15Super ?? 0), 0);
  const totalM15Gasoil = rows.filter((r) => r.type === "BL").reduce((s, r) => s + (r.qtyM15Gasoil ?? 0), 0);
  const lastRow = rows[rows.length - 1];

  return (
    <SuiviClient
      rows={serialize(filteredRows)}
      totalRows={rows.length}
      totals={{
        achatSuper: totalAchatSuper,
        achatGasoil: totalAchatGasoil,
        m15Super: totalM15Super,
        m15Gasoil: totalM15Gasoil,
        balanceSuper: lastRow?.stockTheoSuper ?? 0,
        balanceGasoil: lastRow?.stockTheoGasoil ?? 0,
      }}
      filters={{ mois: filterMois, q: filterQ }}
    />
  );
}
