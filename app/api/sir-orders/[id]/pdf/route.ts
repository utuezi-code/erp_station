import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { addLetterhead } from "@/lib/pdf-utils";
import PDFDocument from "pdfkit";

function fmt(n: any) {
  return Math.round(Number(n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const UNITS = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function belowHundred(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7 || t === 9) return TENS[t] + (u === 1 && t === 7 ? "-et-" : "-") + UNITS[10 + u];
  if (t === 8) return "quatre-vingt" + (u === 0 ? "s" : "-" + UNITS[u]);
  return TENS[t] + (u === 1 ? "-et-un" : u > 0 ? "-" + UNITS[u] : "");
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const hStr = (h === 1 ? "cent" : UNITS[h] + " cent") + (r === 0 && h > 1 ? "s" : "");
  return r === 0 ? hStr : hStr + " " + belowHundred(r);
}

function nombreEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const milliards = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1_000);
  const reste = n % 1_000;
  if (milliards > 0) parts.push(belowThousand(milliards) + " milliard" + (milliards > 1 ? "s" : ""));
  if (millions > 0) parts.push(belowThousand(millions) + " million" + (millions > 1 ? "s" : ""));
  if (milliers > 0) parts.push((milliers === 1 ? "mille" : belowThousand(milliers) + " mille"));
  if (reste > 0) parts.push(belowThousand(reste));
  return parts.join(" ");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "ADMIN"]);
  const { id } = await params;

  const order = await db.sIROrder.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      supplier: { select: { name: true, address: true, email: true, phone: true } },
      items: { include: { fuel: { select: { name: true, code: true } } } },
    },
  });

  if (!order) return new NextResponse("Not found", { status: 404 });

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", resolve);
    doc.on("error", reject);

    const margin = 50;
    const pageW = doc.page.width - margin * 2;

    // ── Letterhead ────────────────────────────────────────────────────────────
    let y = addLetterhead(doc);

    // ── Titre BC ──────────────────────────────────────────────────────────────
    doc.rect(margin, y, pageW, 26).fill("#0369A1");
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#ffffff")
      .text("BON DE COMMANDE SIR", margin, y + 7, { width: pageW, align: "center" });
    y += 34;

    // ── Références ────────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1a1a").text("N° : ", margin, y, { continued: true });
    doc.font("Helvetica").text(order.number);
    y += 13;
    doc.font("Helvetica-Bold").text("Date : ", margin, y, { continued: true });
    doc.font("Helvetica").text(new Date(order.createdAt).toLocaleDateString("fr-FR"));
    y += 18;

    // ── Destinataire ──────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0369A1").text("DESTINATAIRE :", margin, y);
    y += 15;
    doc.font("Helvetica").fontSize(9).fillColor("#1a1a1a")
      .text(order.supplier?.name ?? "SIR — Société Ivoirienne de Raffinage", margin, y);
    y += 13;
    if (order.supplier?.address) { doc.text(order.supplier.address, margin, y); y += 13; }
    if (order.supplier?.email) { doc.text(`E-mail : ${order.supplier.email}`, margin, y); y += 13; }
    y += 10;

    // ── Tableau articles ──────────────────────────────────────────────────────
    // 4 colonnes : Désignation | Quantité | P.U. | Prix total
    const colW = pageW / 4;
    const cDesig = margin;
    const cQty   = margin + colW;
    const cPU    = margin + colW * 2;
    const cTotal = margin + colW * 3;
    const rowH = 18;
    const tableStartY = y;

    // En-tête tableau
    doc.rect(margin, y, pageW, rowH).fill("#dbeafe");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1e3a5f");
    doc.text("Désignation",  cDesig + 4, y + 4, { width: colW - 8, lineBreak: false });
    doc.text("Quantité",     cQty   + 4, y + 4, { width: colW - 8, lineBreak: false });
    doc.text("P.U. (FCFA)",  cPU    + 4, y + 4, { width: colW - 8, lineBreak: false });
    doc.text("Prix total",   cTotal + 4, y + 4, { width: colW - 8, lineBreak: false });
    y += rowH;

    // Lignes
    doc.font("Helvetica").fontSize(9);
    let total = 0;
    order.items.forEach((item, idx) => {
      const t = Number(item.totalAmount);
      total += t;
      doc.fillColor(idx % 2 === 0 ? "#f8fafc" : "#ffffff").rect(margin, y, pageW, rowH).fill();
      doc.fillColor("#1a1a1a");
      doc.text(item.fuel.name,          cDesig + 4, y + 3, { width: colW - 8, lineBreak: false });
      doc.text(fmt(item.quantityM15),   cQty   + 4, y + 3, { width: colW - 8, lineBreak: false });
      doc.text(fmt(item.unitPrice),     cPU    + 4, y + 3, { width: colW - 8, lineBreak: false });
      doc.text(fmt(t),                  cTotal + 4, y + 3, { width: colW - 8, lineBreak: false });
      y += rowH;
    });

    // Ligne total
    y += 2;
    doc.rect(margin, y, pageW, rowH + 2).fill("#0369A1");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff")
      .text("TOTAL GÉNÉRAL", cDesig + 4, y + 5, { width: colW * 3 - 8, lineBreak: false })
      .text(`${fmt(total)} FCFA`, cTotal + 4, y + 5, { width: colW - 8, lineBreak: false });
    doc.fillColor("#1a1a1a");
    y += rowH + 4;

    // Bordure tableau
    doc.strokeColor("#93c5fd").lineWidth(0.5)
      .rect(margin, tableStartY, pageW, y - tableStartY)
      .stroke();

    // ── Arrêtée la présente commande ─────────────────────────────────────────
    y += 12;
    const totalEnLettres = nombreEnLettres(Math.round(total));
    doc.font("Helvetica").fontSize(9).fillColor("#1a1a1a")
      .text("Arrêtée la présente commande à la somme de : ", margin, y, { continued: true });
    doc
      .font("Helvetica-Bold")
      .text(`${totalEnLettres} francs CFA`, { lineBreak: false });
    y += 24;

    // ── Note ──────────────────────────────────────────────────────────────────
    if (order.note) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1a1a").text("Observations :", margin, y);
      y += 14;
      doc.font("Helvetica").text(order.note, margin, y, { width: pageW });
      y += 30;
    }

    // ── Zone signature ────────────────────────────────────────────────────────
    const sigY = Math.max(y + 20, doc.page.height - 160);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1a1a")
      .text("Signature et cachet", margin, sigY)
      .text("Direction Générale", margin, sigY + 12);
    doc.rect(margin, sigY + 26, 160, 50).strokeColor("#1a1a1a").lineWidth(0.5).stroke();

    doc.end();
  });

  const pdf = Buffer.concat(chunks);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.number.replace(/\//g, "-")}.pdf"`,
    },
  });
}
