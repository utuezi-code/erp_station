export const runtime = "nodejs";

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

  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const format = searchParams.get("format") || "excel";

  const where: any = { date: { gte: start, lte: end } };
  if (stationId) where.stationId = stationId;

  const versements = await db.versement.findMany({
    where,
    include: {
      station: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }],
  });

  const STATUS_LABELS_PDF: Record<string, string> = {
    EN_ATTENTE: "En attente",
    VALIDE: "Validé",
    REJETE: "Rejeté",
  };

  if (format === "pdf") {
    const headers = ["Date", "Station", "Montant (FCFA)", "Référence", "Statut", "Saisi par"];
    const rows = versements.map((v) => [
      new Date(v.date).toLocaleDateString("fr-CI"),
      v.station.name,
      Number(v.amount),
      v.slipNumber || "",
      STATUS_LABELS_PDF[v.status] || v.status,
      v.user?.name || "",
    ]);
    const buf = await generatePDF(
      `Rapport des versements — ${period}`,
      stationId ? "Station filtrée" : "Toutes les stations",
      headers,
      rows
    );
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="versements-${period}.pdf"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IVORY ENERGIES ERP";
  const ws = workbook.addWorksheet("Versements");

  ws.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Station", key: "station", width: 24 },
    { header: "Montant (FCFA)", key: "amount", width: 18 },
    { header: "Mode", key: "mode", width: 16 },
    { header: "Référence", key: "reference", width: 20 },
    { header: "Banque", key: "bank", width: 20 },
    { header: "Statut", key: "status", width: 14 },
    { header: "Saisi par", key: "user", width: 20 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFA500" } };

  const STATUS_LABELS = STATUS_LABELS_PDF;

  for (const v of versements) {
    ws.addRow({
      date: new Date(v.date).toLocaleDateString("fr-CI"),
      station: v.station.name,
      amount: Number(v.amount),
      mode: "—",
      reference: v.slipNumber || "",
      bank: (v as any).bankAccount?.bankName || "",
      status: STATUS_LABELS[v.status] || v.status,
      user: v.user?.name || "",
    });
  }

  const total = versements.filter(v => v.status !== "REJETE").reduce((s, v) => s + Number(v.amount), 0);
  const sumRow = ws.addRow({ date: "TOTAL VALIDÉ+EN ATTENTE", amount: total });
  sumRow.font = { bold: true };
  sumRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0B2" } };

  const buf = await workbook.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="versements-${period}.xlsx"`,
    },
  });
}
