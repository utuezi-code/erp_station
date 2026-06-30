import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";
import { generatePDF } from "@/lib/pdf-utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
  const stationId = searchParams.get("stationId") || "";
  const format = searchParams.get("format") || "excel";

  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const where: any = { date: { gte: start, lte: end } };
  if (stationId) where.stationId = stationId;

  const data = await db.dailyIndex.findMany({
    where,
    include: {
      station: { select: { name: true } },
      nozzle: { include: { fuel: { select: { name: true, code: true } }, pump: { select: { name: true } } } },
    },
    orderBy: [{ date: "asc" }, { stationId: "asc" }],
  });

  if (format === "pdf") {
    const headers = ["Date", "Station", "Pompe", "Carburant", "Volume (L)", "CA (FCFA)"];
    const rows = data.map((row) => [
      new Date(row.date).toLocaleDateString("fr-CI"),
      row.station.name,
      row.nozzle.pump.name,
      row.nozzle.fuel.name,
      Number(row.volumeSold),
      Number(row.revenue),
    ]);
    const buf = await generatePDF(
      `Rapport des ventes — ${period}`,
      stationId ? `Station filtrée` : "Toutes les stations",
      headers,
      rows
    );
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ventes-${period}.pdf"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IVORY ENERGIES ERP";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Ventes");
  ws.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Station", key: "station", width: 24 },
    { header: "Pompe", key: "pump", width: 14 },
    { header: "Pistolet", key: "nozzle", width: 12 },
    { header: "Carburant", key: "fuel", width: 16 },
    { header: "Index début", key: "indexStart", width: 14 },
    { header: "Index fin", key: "indexEnd", width: 14 },
    { header: "Volume (L)", key: "volume", width: 14 },
    { header: "CA (FCFA)", key: "revenue", width: 16 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFA500" } };

  for (const row of data) {
    ws.addRow({
      date: new Date(row.date).toLocaleDateString("fr-CI"),
      station: row.station.name,
      pump: row.nozzle.pump.name,
      nozzle: `Pistolet ${row.nozzleId.slice(-4)}`,
      fuel: row.nozzle.fuel.name,
      indexStart: Number(row.indexStart),
      indexEnd: Number(row.indexEnd),
      volume: Number(row.volumeSold),
      revenue: Number(row.revenue),
    });
  }

  // Summary row
  const totalVolume = data.reduce((s, r) => s + Number(r.volumeSold), 0);
  const totalRevenue = data.reduce((s, r) => s + Number(r.revenue), 0);
  const summaryRow = ws.addRow({ date: "TOTAL", volume: totalVolume, revenue: totalRevenue });
  summaryRow.font = { bold: true };
  summaryRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0B2" } };

  const buf = await workbook.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ventes-${period}.xlsx"`,
    },
  });
}
