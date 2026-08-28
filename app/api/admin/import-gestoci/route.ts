import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import importData from "@/lib/gestoci_import_2026.json";

type ImportItem = { fuel: string; qty_reel: number | null; qty_m15: number; factor: number | null };
type ImportBL = {
  date: string | null; loading_date: string | null;
  bl_number: string | null; bep: string | null;
  tracteur: string | null; citerne: string | null; destination: string | null;
  items: ImportItem[];
};
type ImportData = {
  purchases: { date: string; fuel: string; qty_m15: number }[];
  bls: ImportBL[];
  readings: { date: string | null; stock_super: number | null; stock_gasoil: number | null }[];
};

const data = importData as ImportData;

export async function POST() {
  const session = await requireRole(["ADMIN"]);
  const user = session.user as any;

  const existingCount = await db.gESTOCIWithdrawal.count({ where: { note: { contains: "Import historique 2026" } } });
  if (existingCount > 0) {
    return NextResponse.json({ error: `Import déjà effectué (${existingCount} BLs existants).` }, { status: 400 });
  }

  const fuels = await db.fuel.findMany({ select: { id: true, name: true, code: true } });
  function getFuelId(code: string): string | null {
    const lower = code.toLowerCase();
    const f = fuels.find((f) =>
      (lower === "super" && (f.code.toUpperCase() === "SP" || f.name.toLowerCase().includes("super"))) ||
      (lower === "gasoil" && (f.code.toUpperCase() === "GO" || f.name.toLowerCase().includes("gasoil"))) ||
      f.name.toLowerCase().includes(lower) || f.code.toLowerCase() === lower
    );
    return f?.id ?? null;
  }

  const stations = await db.station.findMany({ select: { id: true, name: true } });
  function getStationId(dest: string | null): string | null {
    if (!dest) return null;
    const clean = dest.split("(")[0].trim().toUpperCase();
    const s = stations.find(
      (s) => s.name.toUpperCase() === clean || s.name.toUpperCase().startsWith(clean)
    );
    return s?.id ?? null;
  }

  const stats = { purchases: 0, bls: 0, blItems: 0, readings: 0, errors: [] as string[] };

  // 1. Achats SIR → GESTOCIEntry
  for (const p of data.purchases) {
    const fuelId = getFuelId(p.fuel);
    if (!fuelId) { stats.errors.push(`Carburant non trouvé: ${p.fuel}`); continue; }
    try {
      await db.gESTOCIEntry.create({
        data: { fuelId, quantityM15: p.qty_m15, date: new Date(p.date), note: "Import historique 2026" },
      });
      stats.purchases++;
    } catch (e: any) {
      stats.errors.push(`Achat ${p.date} ${p.fuel}: ${e.message.slice(0, 80)}`);
    }
  }

  // 2. BLs IVORY → GESTOCIWithdrawal
  let blSeq = 0;
  for (const bl of data.bls) {
    const validItems = bl.items.filter((i) => getFuelId(i.fuel) && i.qty_m15 > 0);
    if (validItems.length === 0) continue;
    blSeq++;
    const number = `BL/IVORY/2026/${String(blSeq).padStart(4, "0")}`;
    const blDate = bl.date ?? bl.loading_date ?? "2026-01-01";
    try {
      await db.gESTOCIWithdrawal.create({
        data: {
          number, userId: user.id,
          date: new Date(blDate),
          loadingDate: bl.loading_date ? new Date(bl.loading_date) : null,
          blNumber: bl.bl_number, bepNumber: bl.bep,
          truckRef: bl.tracteur, citerneRef: bl.citerne,
          destination: bl.destination, status: "LIVRE",
          note: "Import historique 2026",
          items: {
            create: validItems.map((item) => ({
              fuelId: getFuelId(item.fuel)!,
              stationId: getStationId(bl.destination),
              quantityM15: item.qty_m15,
              quantityReel: item.qty_reel ?? item.qty_m15,
              correctionFactor: item.factor,
              unitPrice: 0,
            })),
          },
        },
      });
      stats.bls++;
      stats.blItems += validItems.length;
    } catch (e: any) {
      stats.errors.push(`BL ${bl.bl_number}: ${e.message.slice(0, 80)}`);
    }
  }

  // 3. Relevés GESTOCI
  for (const r of data.readings) {
    if (!r.date) continue;
    for (const [key, val] of [["SUPER", r.stock_super], ["GASOIL", r.stock_gasoil]] as [string, number | null][]) {
      if (val === null) continue;
      const fuelId = getFuelId(key);
      if (!fuelId) continue;
      try {
        await db.gESTOCIStockReading.create({
          data: { date: new Date(r.date), fuelId, stockM15: val, userId: user.id, note: "Import historique 2026" },
        });
        stats.readings++;
      } catch (e: any) {
        stats.errors.push(`Relevé ${r.date} ${key}: ${e.message.slice(0, 80)}`);
      }
    }
  }

  return NextResponse.json({ success: true, stats });
}
