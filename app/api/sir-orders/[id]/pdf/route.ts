import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { addLetterhead } from "@/lib/pdf-utils";
import PDFDocument from "pdfkit";

function fmt(n: any) {
  return Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
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
      proposal: {
        include: {
          budgetAllocation: {
            include: { budgetRequest: { select: { number: true } } },
          },
        },
      },
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
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1a1a").text(`N° : `, margin, y, { continued: true });
    doc.font("Helvetica").text(order.number);
    y += 13;
    doc.font("Helvetica-Bold").text(`Date : `, margin, y, { continued: true });
    doc.font("Helvetica").text(new Date(order.createdAt).toLocaleDateString("fr-FR"));
    y += 13;
    doc.font("Helvetica-Bold").text(`Émetteur : `, margin, y, { continued: true });
    doc.font("Helvetica").text(order.user.name);
    y += 13;
    if (order.proposal?.budgetAllocation?.budgetRequest) {
      doc.font("Helvetica-Bold").text(`Réf. demande budget : `, margin, y, { continued: true });
      doc.font("Helvetica").text(order.proposal.budgetAllocation.budgetRequest.number);
      y += 13;
    }
    y += 8;

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
    const cols = { produit: margin, code: margin + 170, qty: margin + 240, pu: margin + 320, total: margin + 400 };
    const rowH = 18;

    // En-tête tableau
    doc.rect(margin, y, pageW, rowH).fill("#dbeafe");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1e3a5f");
    doc.text("Produit", cols.produit + 4, y + 4);
    doc.text("Code", cols.code, y + 4);
    doc.text("Qté M15 (L)", cols.qty, y + 4);
    doc.text("P.U. FCFA", cols.pu, y + 4);
    doc.text("Total FCFA", cols.total, y + 4);
    y += rowH;

    // Lignes
    doc.font("Helvetica").fontSize(9);
    let total = 0;
    order.items.forEach((item, idx) => {
      const t = Number(item.totalAmount);
      total += t;
      doc.fillColor(idx % 2 === 0 ? "#f8fafc" : "#ffffff").rect(margin, y, pageW, rowH).fill();
      doc.fillColor("#1a1a1a");
      doc.text(item.fuel.name, cols.produit + 4, y + 3, { width: 160, lineBreak: false });
      doc.text(item.fuel.code, cols.code, y + 3);
      doc.text(fmt(item.quantityM15), cols.qty, y + 3);
      doc.text(fmt(item.unitPrice), cols.pu, y + 3);
      doc.text(fmt(t), cols.total, y + 3);
      y += rowH;
    });

    // Total
    y += 2;
    doc.rect(margin, y, pageW, rowH + 2).fill("#0369A1");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff")
      .text("TOTAL GÉNÉRAL", cols.produit + 4, y + 5)
      .text(`${fmt(total)} FCFA`, cols.total, y + 5);
    doc.fillColor("#1a1a1a");
    y += rowH + 10;

    // Table border
    doc.strokeColor("#93c5fd").lineWidth(0.5)
      .rect(margin, y - (order.items.length * rowH + rowH * 2 + 14), pageW, order.items.length * rowH + rowH * 2 + 14)
      .stroke();

    // ── Note ──────────────────────────────────────────────────────────────────
    if (order.note) {
      y += 6;
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1a1a").text("Observations :", margin, y);
      y += 14;
      doc.font("Helvetica").text(order.note, margin, y, { width: pageW });
      y += 30;
    }

    // ── Zone signature ────────────────────────────────────────────────────────
    const sigY = Math.max(y + 20, doc.page.height - 160);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1a1a")
      .text("Signature et cachet", margin, sigY)
      .text("Direction Commerciale", margin, sigY + 12);
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
