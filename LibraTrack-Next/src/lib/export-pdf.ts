/* Makes a real PDF file (a table report) without any extra package, using the built-in Helvetica font. */
import type { ReportData } from "./types";

const enc = new TextEncoder();

/** Replace characters the built-in font cannot show. */
const tidy = (s: unknown): string =>
  String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/₱/g, "PHP ");

/** PDF text as a hex string. Characters above 255 become "?". */
const hex = (s: unknown): string =>
  "<" +
  Array.from(tidy(s))
    .map((ch) => {
      let c = ch.charCodeAt(0);
      if (c > 255) c = 63;
      return c.toString(16).padStart(2, "0");
    })
    .join("") +
  ">";

/** Rough text width in points for Helvetica. */
function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of tidy(s)) {
    if ("ilj.,:;|'!() []/".includes(ch)) w += 0.28;
    else if ("mwMW@".includes(ch)) w += 0.82;
    else if (ch >= "A" && ch <= "Z") w += 0.66;
    else if (ch >= "0" && ch <= "9") w += 0.556;
    else w += 0.5;
  }
  return w * size * (bold ? 1.06 : 1);
}

function fit(value: string, maxWidth: number, size: number): string {
  let s = tidy(value);
  if (textWidth(s, size) <= maxWidth) return s;
  while (s.length > 1 && textWidth(`${s}...`, size) > maxWidth) s = s.slice(0, -1);
  return `${s}...`;
}

export function buildPdf(report: ReportData, info: string, generatedAt: string): Uint8Array {
  const W = 842; // A4 landscape
  const H = 595;
  const M = 36;
  const FS = 8;
  const RH = 17;

  const cellText = (v: string | number, i: number): string => (report.money.includes(i) ? Number(v).toFixed(2) : String(v ?? ""));
  const rows = report.rows.map((r) => r.map(cellText));
  const avail = W - 2 * M;
  const natural = report.columns.map((h, i) => Math.min(230, Math.max(textWidth(h, FS, true), ...rows.map((r) => textWidth(r[i], FS))) + 12));
  const total = natural.reduce((a, b) => a + b, 0);
  const colW = natural.map((w) => (w * avail) / total);
  const colX: number[] = [];
  colW.reduce((x, w, i) => {
    colX[i] = x;
    return x + w;
  }, M);

  /* split rows into pages */
  const firstTop = M + 78;
  const nextTop = M + 6;
  const bottom = H - M - 16;
  const pages: string[][][] = [];
  let index = 0;
  for (;;) {
    const top = pages.length === 0 ? firstTop : nextTop;
    const capacity = Math.max(1, Math.floor((bottom - top - RH) / RH));
    pages.push(rows.slice(index, index + capacity));
    index += capacity;
    if (index >= rows.length) break;
  }
  const lastTop = pages.length === 1 ? firstTop : nextTop;
  const lastRows = pages[pages.length - 1].length;
  if (lastTop + RH * (lastRows + 1) + 14 * (report.summary.length + 1) > bottom + 12) pages.push([]);

  const Y = (top: number): string => (H - top).toFixed(2); // top-based -> PDF coordinates
  const text = (x: number, top: number, s: string, font: "F1" | "F2", size: number, color: string): string =>
    `${color} BT /${font} ${size} Tf ${x.toFixed(2)} ${Y(top)} Td ${hex(s)} Tj ET\n`;
  const rect = (x: number, top: number, w: number, h: number, rgb: string): string =>
    `${rgb} rg ${x.toFixed(2)} ${Y(top + h)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;

  const streams = pages.map((chunk, p) => {
    let s = "";
    const top = p === 0 ? firstTop : nextTop;
    if (p === 0) {
      s += text(M, M + 16, `LibraTrack - ${report.title}`, "F2", 16, "0.06 0.16 0.36 rg");
      s += text(M, M + 33, info, "F1", 9, "0.35 g");
      s += text(M, M + 46, `Generated: ${generatedAt}`, "F1", 9, "0.35 g");
      s += text(M, M + 62, report.summary.map((x) => `${x[0]}: ${x[1]}`).join("   |   "), "F2", 9, "0 g");
    }
    s += rect(M, top, avail, RH, "0.06 0.16 0.36");
    report.columns.forEach((h, i) => {
      s += text(colX[i] + 5, top + 12, fit(h, colW[i] - 8, FS), "F2", FS, "1 g");
    });
    chunk.forEach((r, ri) => {
      const t = top + RH * (ri + 1);
      if (ri % 2 === 1) s += rect(M, t, avail, RH, "0.95 0.97 0.99");
      r.forEach((v, i) => {
        s += text(colX[i] + 5, t + 12, fit(v, colW[i] - 8, FS), "F1", FS, "0 g");
      });
    });
    if (p === pages.length - 1) {
      let y = top + RH * (chunk.length + 1) + 18;
      s += text(M, y, "Summary", "F2", 10, "0 g");
      for (const x of report.summary) {
        y += 14;
        s += text(M, y, `${x[0]}: ${x[1]}`, "F1", 9, "0 g");
      }
    }
    s += text(M, H - M + 4, "LibraTrack - Library Resource Management and Analytics System", "F1", 8, "0.45 g");
    s += text(W - M - 60, H - M + 4, `Page ${p + 1} of ${pages.length}`, "F1", 8, "0.45 g");
    return s;
  });

  /* assemble the PDF objects */
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  const kids: string[] = [];
  streams.forEach((s, p) => {
    const pageId = 5 + p * 2;
    const contentId = 6 + p * 2;
    kids.push(`${pageId} 0 R`);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${s.length} >>\nstream\n${s}endstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return enc.encode(out);
}
