import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
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

    const pageW = doc.page.width - 100;

    // ── En-tête société ──────────────────────────────────────────────────────
    doc.fontSize(18).font("Helvetica-Bold").text("IVORY ENERGIES CI", 50, 50);
    doc.fontSize(9).font("Helvetica").fillColor("#555555")
      .text("Gestion des stations-service", 50, 73);

    // ── Titre BC ─────────────────────────────────────────────────────────────
    doc.rect(50, 95, pageW, 28).fill("#0369A1");
    doc.fillColor("#ffffff").fontSize(13).font("Helvetica-Bold")
      .text("BON DE COMMANDE SIR", 50, 102, { width: pageW, align: "center" });
    doc.fillColor("#000000");

    doc.moveDown(0.5);
    const y1 = 135;
    doc.fontSize(9).font("Helvetica")
      .text(`N° : ${order.number}`, 50, y1)
      .text(`Date : ${new Date(order.createdAt).toLocaleDateString("fr-FR")}`, 50, y1 + 14)
      .text(`Émetteur : ${order.user.name}`, 50, y1 + 28);

    if (order.proposal?.budgetAllocation?.budgetRequest) {
      doc.text(`Réf. demande budget : ${order.proposal.budgetAllocation.budgetRequest.number}`, 50, y1 + 42);
    }

    // ── Fournisseur ───────────────────────────────────────────────────────────
    const fy = y1 + 70;
    doc.fontSize(10).font("Helvetica-Bold").text("DESTINATAIRE :", 50, fy);
    doc.fontSize(9).font("Helvetica")
      .text(order.supplier?.name ?? "SIR — Société Ivoirienne de Raffinage", 50, fy + 14);
    if (order.supplier?.address) doc.text(order.supplier.address, 50, fy + 26);
    if (order.supplier?.email) doc.text(`E-mail : ${order.supplier.email}`, 50, fy + 38);

    // ── Tableau articles ──────────────────────────────────────────────────────
    const ty = fy + 70;
    const cols = { produit: 50, code: 220, qty: 280, pu: 360, total: 450 };

    // En-tête tableau
    doc.rect(50, ty, pageW, 18).fill("#e0f2fe");
    doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold");
    doc.text("Produit", cols.produit, ty + 4);
    doc.text("Code", cols.code, ty + 4);
    doc.text("Qté M15 (L)", cols.qty, ty + 4);
    doc.text("P.U. FCFA", cols.pu, ty + 4);
    doc.text("Total FCFA", cols.total, ty + 4);

    // Lignes
    let cy = ty + 18;
    doc.font("Helvetica").fontSize(9);
    let total = 0;
    for (const item of order.items) {
      const t = Number(item.totalAmount);
      total += t;
      doc.fillColor(cy % 2 === 0 ? "#f8fafc" : "#ffffff");
      doc.rect(50, cy, pageW, 16).fill();
      doc.fillColor("#000000");
      doc.text(item.fuel.name, cols.produit, cy + 3, { width: 160 });
      doc.text(item.fuel.code, cols.code, cy + 3);
      doc.text(fmt(item.quantityM15), cols.qty, cy + 3);
      doc.text(fmt(item.unitPrice), cols.pu, cy + 3);
      doc.text(fmt(t), cols.total, cy + 3);
      cy += 16;
    }

    // Total
    cy += 4;
    doc.rect(50, cy, pageW, 18).fill("#0369A1");
    doc.fillColor("#ffffff").font("Helvetica-Bold")
      .text("TOTAL GÉNÉRAL", cols.produit, cy + 4)
      .text(`${fmt(total)} FCFA`, cols.total, cy + 4);
    doc.fillColor("#000000");

    // ── Note ─────────────────────────────────────────────────────────────────
    if (order.note) {
      const ny = cy + 36;
      doc.fontSize(9).font("Helvetica-Bold").text("Observations :", 50, ny);
      doc.font("Helvetica").text(order.note, 50, ny + 14, { width: pageW });
    }

    // ── Signature ─────────────────────────────────────────────────────────────
    const sy = doc.page.height - 120;
    doc.fontSize(9).font("Helvetica")
      .text("Signature et cachet", 50, sy)
      .text("Direction Commerciale", 50, sy + 12);
    doc.rect(50, sy + 28, 160, 50).stroke();

    // ── Pied de page ──────────────────────────────────────────────────────────
    doc.fontSize(7).fillColor("#aaaaaa")
      .text(`Document généré le ${new Date().toLocaleDateString("fr-FR")} — IVORY ENERGIES CI`, 50, doc.page.height - 40, { width: pageW, align: "center" });

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
