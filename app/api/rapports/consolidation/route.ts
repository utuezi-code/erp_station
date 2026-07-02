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

  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    include: { region: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const [salesByStation, versByStation, exploitations] = await Promise.all([
    db.dailyIndex.groupBy({
      by: ["stationId"],
      where: { date: { gte: start, lte: end } },
      _sum: { revenue: true, volumeSold: true },
    }),
    db.versement.groupBy({
      by: ["stationId"],
      where: { date: { gte: start, lte: end }, status: { not: "REJETE" } },
      _sum: { amount: true },
    }),
    db.exploitationAccount.findMany({ where: { period } }),
  ]);

  const salesMap = Object.fromEntries(salesByStation.map((r) => [r.stationId, { revenue: Number(r._sum.revenue || 0), volume: Number(r._sum.volumeSold || 0) }]));
  const versMap = Object.fromEntries(versByStation.map((r) => [r.stationId, Number(r._sum.amount || 0)]));
  const exMap = Object.fromEntries(exploitations.map((r) => [r.stationId, r]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IVORY ENERGIES ERP";
  const ws = workbook.addWorksheet(`Consolidation ${period}`);

  ws.columns = [
    { header: "#", key: "rank", width: 6 },
    { header: "Station", key: "station", width: 24 },
    { header: "Région", key: "region", width: 16 },
    { header: "CA (FCFA)", key: "ca", width: 18 },
    { header: "Volume (L)", key: "volume", width: 14 },
    { header: "Versé (FCFA)", key: "versé", width: 18 },
    { header: "Écart (FCFA)", key: "ecart", width: 18 },
    { header: "Taux versement", key: "taux", width: 16 },
    { header: "Résultat brut", key: "result", width: 18 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFA500" } };

  const rows = stations.map((s) => {
    const sales = salesMap[s.id] || { revenue: 0, volume: 0 };
    const vers = versMap[s.id] || 0;
    const ex = exMap[s.id];
    return {
      station: s,
      ca: sales.revenue,
      volume: sales.volume,
      vers,
      ecart: sales.revenue - vers,
      taux: sales.revenue > 0 ? (vers / sales.revenue) * 100 : 0,
      result: ex ? Number(ex.grossResult) : null,
    };
  }).sort((a, b) => b.ca - a.ca);

  rows.forEach((r, i) => {
    ws.addRow({
      rank: i + 1,
      station: r.station.name,
      region: r.station.region?.name || "",
      ca: r.ca,
      volume: r.volume,
      "versé": r.vers,
      ecart: r.ecart,
      taux: `${r.taux.toFixed(1)}%`,
      result: r.result !== null ? r.result : "Non saisi",
    });
  });

  // Totals
  const totalCA = rows.reduce((s, r) => s + r.ca, 0);
  const totalVol = rows.reduce((s, r) => s + r.volume, 0);
  const totalVers = rows.reduce((s, r) => s + r.vers, 0);
  const totalEcart = rows.reduce((s, r) => s + r.ecart, 0);
  const totalResult = rows.filter((r) => r.result !== null).reduce((s, r) => s + (r.result as number), 0);

  const sumRow = ws.addRow({
    rank: "", station: "TOTAL", region: "",
    ca: totalCA, volume: totalVol, "versé": totalVers, ecart: totalEcart, taux: "",
    result: totalResult,
  });
  sumRow.font = { bold: true };
  sumRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0B2" } };

  const buf = await workbook.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="consolidation-${period}.xlsx"`,
    },
  });
}
