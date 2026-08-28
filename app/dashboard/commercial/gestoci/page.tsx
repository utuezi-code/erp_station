import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { GESTOCIStockClient } from "./gestoci-client";

export default async function GESTOCIStockPage() {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "ADMIN"]);
  const user = session.user as any;
  const role = user.role as string;

  const [fuels, entries, withdrawals, stockReadings, stations] = await Promise.all([
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
    db.gESTOCIEntry.findMany({
      include: {
        fuel: { select: { id: true, name: true, code: true } },
        deliveryOrder: { select: { reference: true, sirOrder: { select: { number: true } } } },
      },
      orderBy: { date: "asc" },
    }),
    db.gESTOCIWithdrawal.findMany({
      include: {
        user: { select: { name: true } },
        items: {
          include: {
            fuel: { select: { id: true, name: true, code: true } },
            station: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    db.gESTOCIStockReading.findMany({
      include: {
        fuel: { select: { id: true, name: true, code: true } },
        user: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } }),
  ]);

  // Compute running theoretical stock per fuel
  const stockByFuel: Record<string, { fuel: { id: string; name: string; code: string }; enteredM15: number; withdrawnM15: number; balance: number }> = {};

  for (const e of entries) {
    if (!stockByFuel[e.fuelId]) {
      stockByFuel[e.fuelId] = { fuel: e.fuel as any, enteredM15: 0, withdrawnM15: 0, balance: 0 };
    }
    stockByFuel[e.fuelId].enteredM15 += Number(e.quantityM15);
  }
  for (const w of withdrawals) {
    for (const item of w.items) {
      if (!stockByFuel[item.fuelId]) {
        stockByFuel[item.fuelId] = { fuel: item.fuel as any, enteredM15: 0, withdrawnM15: 0, balance: 0 };
      }
      stockByFuel[item.fuelId].withdrawnM15 += Number(item.quantityM15);
    }
  }
  for (const key of Object.keys(stockByFuel)) {
    stockByFuel[key].balance = stockByFuel[key].enteredM15 - stockByFuel[key].withdrawnM15;
  }

  return (
    <GESTOCIStockClient
      stockByFuel={Object.values(stockByFuel)}
      entries={serialize(entries)}
      withdrawals={serialize(withdrawals)}
      stockReadings={serialize(stockReadings)}
      stations={stations}
      fuels={fuels}
      role={role}
    />
  );
}
