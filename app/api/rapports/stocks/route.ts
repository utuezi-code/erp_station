export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
  const stationId = searchParams.get("stationId") || "";

  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const where: any = { date: { gte: start, lte: end } };
  if (stationId) where.tank = { stationId };

  const movements = await db.tankMovement.findMany({
    where,
    include: {
      tank: {
        include: {
          station: { select: { name: true } },
          fuel: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IVORY ENERGIES ERP";
  const ws = workbook.addWorksheet(`Stocks ${period}`);

  ws.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Station", key: "station", width: 24 },
    { header: "Cuve", key: "tank", width: 16 },
    { header: "Carburant", key: "fuel", width: 16 },
    { header: "Stock ouverture (L)", key: "opening", width: 20 },
    { header: "Livraison (L)", key: "delivery", width: 16 },
    { header: "Transfert (L)", key: "transfer", width: 16 },
    { header: "Stock théorique (L)", key: "theoretical", width: 20 },
    { header: "Stock physique (L)", key: "physical", width: 20 },
    { header: "Écart (L)", key: "gap", width: 14 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFA500" } };

  for (const m of movements) {
    const row = ws.addRow({
      date: new Date(m.date).toLocaleDateString("fr-CI"),
      station: m.tank.station.name,
      tank: m.tank.name,
      fuel: m.tank.fuel?.name || "",
      opening: Number(m.openingStock),
      delivery: Number(m.delivery),
      transfer: Number(m.transfer),
      theoretical: Number(m.theoreticalStock),
      physical: m.physicalStock !== null ? Number(m.physicalStock) : "",
      gap: m.gap !== null ? Number(m.gap) : "",
    });
    if (m.gap !== null && Math.abs(Number(m.gap)) > 200) {
      row.getCell("gap").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC0C0" } };
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="stocks-${period}.xlsx"`,
    },
  });
}
