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

  const stations = stationId
    ? await db.station.findMany({ where: { id: stationId }, select: { id: true, name: true } })
    : await db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  // Gather data for all stations
  const stationData: { name: string; ca: number; vers: number; ecart: number; taux: string; level: string }[] = [];

  for (const st of stations) {
    const [salesAgg, versAgg] = await Promise.all([
      db.dailyIndex.aggregate({
        where: { stationId: st.id, date: { gte: start, lte: end } },
        _sum: { revenue: true },
      }),
      db.versement.aggregate({
        where: { stationId: st.id, date: { gte: start, lte: end }, status: { not: "REJETE" } },
        _sum: { amount: true },
      }),
    ]);

    const ca = Number(salesAgg._sum.revenue || 0);
    const vers = Number(versAgg._sum.amount || 0);
    const ecart = ca - vers;
    const taux = ca > 0 ? (vers / ca) * 100 : 0;
    const level = ecart <= 0 ? "OK" : taux >= 90 ? "OK" : taux >= 50 ? "ORANGE" : "RED";

    stationData.push({ name: st.name, ca, vers, ecart, taux: taux.toFixed(1), level });
  }

  if (format === "pdf") {
    const headers = ["Station", "CA (FCFA)", "Versements (FCFA)", "Reste à verser (FCFA)", "Taux (%)", "Niveau"];
    const rows = stationData.map((d) => [d.name, d.ca, d.vers, d.ecart, d.taux, d.level]);
    const buf = await generatePDF(
      `Rapport des écarts — ${period}`,
      "Analyse CA vs Versements",
      headers,
      rows
    );
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ecarts-${period}.pdf"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IVORY ENERGIES ERP";
  const ws = workbook.addWorksheet(`Écarts ${period}`);

  ws.columns = [
    { header: "Station", key: "station", width: 24 },
    { header: "CA (FCFA)", key: "ca", width: 18 },
    { header: "Versements (FCFA)", key: "versements", width: 20 },
    { header: "Reste à verser (FCFA)", key: "ecart", width: 22 },
    { header: "Taux versement (%)", key: "taux", width: 20 },
    { header: "Niveau", key: "level", width: 12 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFA500" } };

  for (const d of stationData) {
    ws.addRow({ station: d.name, ca: d.ca, versements: d.vers, ecart: d.ecart, taux: d.taux, level: d.level });
  }

  const buf = await workbook.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ecarts-${period}.xlsx"`,
    },
  });
}
