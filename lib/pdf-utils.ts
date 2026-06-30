import PDFDocument from "pdfkit";

/**
 * Generate a PDF with title, subtitle, and a data table.
 * Returns a Buffer containing the PDF bytes.
 */
export async function generatePDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  filename?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#f97316")
      .text("IVORY ENERGIES CI", { align: "center" });

    doc
      .fontSize(14)
      .fillColor("#1e293b")
      .text(title, { align: "center" });

    doc
      .fontSize(10)
      .fillColor("#64748b")
      .font("Helvetica")
      .text(subtitle, { align: "center" });

    doc.moveDown(1);

    // Table
    const pageWidth = doc.page.width - 80; // margins 40 each side
    const colCount = headers.length;
    const colWidth = pageWidth / colCount;
    const rowHeight = 20;
    let y = doc.y;

    // Draw header row
    doc
      .fillColor("#f97316")
      .rect(40, y, pageWidth, rowHeight)
      .fill();

    headers.forEach((h, i) => {
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(h, 40 + i * colWidth + 4, y + 5, { width: colWidth - 8, lineBreak: false });
    });

    y += rowHeight;

    // Data rows
    rows.forEach((row, rowIdx) => {
      const bgColor = rowIdx % 2 === 0 ? "#f8fafc" : "#ffffff";
      doc.fillColor(bgColor).rect(40, y, pageWidth, rowHeight).fill();

      row.forEach((cell, i) => {
        const text = typeof cell === "number" ? cell.toLocaleString("fr-CI") : String(cell);
        doc
          .fillColor("#1e293b")
          .font("Helvetica")
          .fontSize(8)
          .text(text, 40 + i * colWidth + 4, y + 5, { width: colWidth - 8, lineBreak: false });
      });

      // Check if we need a new page
      y += rowHeight;
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
    });

    // Border around table area
    const tableHeight = Math.min(rows.length, Math.floor((doc.page.height - 80 - doc.y + rows.length * rowHeight)) ) ;
    doc
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .rect(40, doc.y - rows.length * rowHeight - rowHeight, pageWidth, rows.length * rowHeight + rowHeight)
      .stroke();

    // Footer
    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(`Généré le ${new Date().toLocaleDateString("fr-CI")} — IVORY ENERGIES CI ERP`, 40, doc.page.height - 40, { align: "center" });

    doc.end();
  });
}
