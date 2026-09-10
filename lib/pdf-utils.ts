import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

// Company legal info for footer
const FOOTER_LINES = [
  ["FORME JURIDIQUE", "SARL au capital de 200.000.000 FCFA"],
  ["SIÈGE SOCIAL", "Plateau Immeuble Le Mali, 3ème étage"],
  ["ADRESSE POSTALE", "09 BP 2549 ABJ 09  *  TÉL. : (225) 07 08 59 44 11 / 07 08 79 27 79"],
  ["RCCM N°", "CI-ABJ-2018-B-32342  -  N°CC : 1866284 U"],
  ["COMPTES BANCAIRES", "BACI : 140466980001707"],
  ["E-MAIL", "infos@ivoryenergies.ci"],
];

function logoBuffer(): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", "Logo_IVORY_CI.png");
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

function symboleBuffer(): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", "symbole-1.png");
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

/**
 * Draw the Ivory Energies CI letterhead (header + footer) on the current page.
 * Returns the Y coordinate where document content should start.
 */
export function addLetterhead(doc: InstanceType<typeof PDFDocument>): number {
  const logo = logoBuffer();
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 50;

  // ── Header ────────────────────────────────────────────────────────────────
  // Full logo contains the symbol + company name + tagline
  if (logo) {
    doc.image(logo, margin, 14, { width: 130 });
  } else {
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#1a1a1a")
      .text("IVORY ENERGIES CI", margin, 42, { lineBreak: false });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerTop = pageH - 78;
  const symbole = symboleBuffer();
  const symSize = 36;

  if (symbole) {
    doc.image(symbole, margin, footerTop, { width: symSize, height: symSize });
  }

  // Blue separator line
  const lineX = margin + (symbole ? symSize + 10 : 0);
  doc
    .moveTo(lineX, footerTop + 2)
    .lineTo(pageW - margin, footerTop + 2)
    .lineWidth(1.5)
    .strokeColor("#0369A1")
    .stroke();

  // Legal info
  let fy = footerTop + 8;
  doc.lineWidth(0.5);
  for (const [label, value] of FOOTER_LINES) {
    doc
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .fillColor("#1a1a1a")
      .text(`${label} : `, lineX, fy, { continued: true, lineBreak: false });
    doc
      .font("Helvetica")
      .fontSize(6.5)
      .fillColor("#1a1a1a")
      .text(value, { lineBreak: false });
    fy += 10;
  }

  // Content starts below header
  return 115;
}

/**
 * Generate a PDF with the Ivory Energies CI letterhead, a title, and a data table.
 */
export async function generatePDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  _filename?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const margin = 50;
    const pageW = doc.page.width - margin * 2;
    let contentY = addLetterhead(doc);

    // Title block
    doc.rect(margin, contentY, pageW, 26).fill("#f97316");
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#ffffff")
      .text(title, margin, contentY + 7, { width: pageW, align: "center", lineBreak: false });
    contentY += 30;

    if (subtitle) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#64748b")
        .text(subtitle, margin, contentY, { align: "center" });
      contentY += 18;
    }

    // Table
    const colCount = headers.length;
    const colWidth = pageW / colCount;
    const rowH = 20;
    let y = contentY;

    // Header row
    doc.rect(margin, y, pageW, rowH).fill("#f97316");
    headers.forEach((h, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#ffffff")
        .text(h, margin + i * colWidth + 4, y + 5, { width: colWidth - 8, lineBreak: false });
    });
    y += rowH;

    rows.forEach((row, rowIdx) => {
      // New page check (leave room for footer ~80px)
      if (y > doc.page.height - 100) {
        doc.addPage();
        addLetterhead(doc);
        y = 115;
      }
      const bg = rowIdx % 2 === 0 ? "#f8fafc" : "#ffffff";
      doc.fillColor(bg).rect(margin, y, pageW, rowH).fill();
      row.forEach((cell, i) => {
        const text = typeof cell === "number" ? Math.round(cell).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : String(cell);
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#1e293b")
          .text(text, margin + i * colWidth + 4, y + 5, { width: colWidth - 8, lineBreak: false });
      });
      y += rowH;
    });

    // Table border
    doc.strokeColor("#e2e8f0").lineWidth(0.5).rect(margin, contentY + (subtitle ? 18 : 0), pageW, y - contentY - (subtitle ? 18 : 0)).stroke();

    doc.end();
  });
}
