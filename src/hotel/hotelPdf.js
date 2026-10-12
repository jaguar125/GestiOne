// src/hotel/hotelPdf.js
//
// Vrais fichiers PDF pour l'hôtel (rapports et reçus).
// `window.print()` ne fait rien dans l'application Android : ici on dessine
// chaque page (format A4) puis on l'assemble en PDF avec jsPDF — le même
// procédé que les factures de commande de GestiOne — et le fichier est
// enregistré / partagé par le menu natif du téléphone (exportPdfDoc).

import { exportPdfDoc, sharePdfDoc } from "../nativeExport.js";
import { logoSrc, receiptModel } from "./hotelReceipts.js";

const A4W = 1240, A4H = 1754; // A4 à 150 points par pouce
const M = 80;
const NAVY = "#12233D", NAVY2 = "#1F3F73", GOLD = "#E0A93B", INK = "#0F172A", MUTED = "#64748B", LINE = "#E2E6EC";
const FONT = "Helvetica, Arial, Roboto, sans-serif";
const f = (w, s) => `${w} ${s}px ${FONT}`;

function loadImage(src) {
  return new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = src; });
}
function fit(g, text, max) {
  let t = String(text ?? "");
  if (g.measureText(t).width <= max) return t;
  while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}
function roundRect(g, x, y, w, h, r, fill) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  g.fillStyle = fill; g.fill();
}

// ---------- Rapports (Historique, Inventaire, Bénéfices) ----------
// report = { title, subtitle, kpis: [{ label, value, color }], sections: [{ title, head: [], rows: [[]], widths: [], align: [] }] }
export async function renderReportPages(report, info) {
  const logo = await loadImage(logoSrc(info));
  const pages = [];
  let cv, g, y;
  const newPage = (first) => {
    cv = document.createElement("canvas"); cv.width = A4W; cv.height = A4H;
    g = cv.getContext("2d");
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, A4W, A4H);
    pages.push(cv);
    if (first) {
      const grd = g.createLinearGradient(0, 0, A4W, 260);
      grd.addColorStop(0, "#0E1C33"); grd.addColorStop(1, NAVY2);
      g.fillStyle = grd; g.fillRect(0, 0, A4W, 260);
      g.fillStyle = GOLD; g.fillRect(0, 260, A4W, 6);
      if (logo) { roundRect(g, M, 56, 148, 148, 30, "#FFFFFF"); g.drawImage(logo, M + 14, 70, 120, 120); }
      const tx = logo ? M + 180 : M;
      g.fillStyle = "#E9C77F"; g.font = f(700, 24); g.fillText(fit(g, info.name.toUpperCase(), A4W - tx - M), tx, 92);
      g.fillStyle = "#FFFFFF"; g.font = f(800, 54); g.fillText(fit(g, report.title, A4W - tx - M), tx, 156);
      g.fillStyle = "#C9D3E6"; g.font = f(500, 25); g.fillText(fit(g, report.subtitle || "", A4W - tx - M), tx, 200);
      y = 316;
      if (report.kpis && report.kpis.length) {
        const n = report.kpis.length, gap = 22, bw = (A4W - 2 * M - gap * (n - 1)) / n;
        report.kpis.forEach((k, i) => {
          const x = M + i * (bw + gap);
          roundRect(g, x, y, bw, 132, 22, "#F5F7FB");
          g.fillStyle = k.color || NAVY; g.fillRect(x + 22, y + 22, 44, 6);
          g.fillStyle = MUTED; g.font = f(600, 22); g.fillText(fit(g, k.label, bw - 44), x + 22, y + 62);
          g.fillStyle = k.color || INK; g.font = f(800, 36); g.fillText(fit(g, k.value, bw - 44), x + 22, y + 108);
        });
        y += 180;
      }
    } else {
      g.fillStyle = NAVY; g.fillRect(0, 0, A4W, 90);
      g.fillStyle = "#FFFFFF"; g.font = f(700, 26); g.fillText(fit(g, `${info.name} · ${report.title}`, A4W - 2 * M), M, 56);
      y = 140;
    }
  };
  newPage(true);
  const bottom = A4H - 120;
  (report.sections || []).forEach((sec) => {
    const widths = sec.widths || sec.head.map(() => 1);
    const tot = widths.reduce((a, b) => a + b, 0);
    const colW = widths.map((w) => ((A4W - 2 * M) * w) / tot);
    const align = sec.align || sec.head.map((_, i) => (i === 0 ? "left" : "right"));
    const rowH = 54;
    const drawHead = () => {
      roundRect(g, M, y, A4W - 2 * M, rowH, 12, "#EEF1F6");
      g.fillStyle = MUTED; g.font = f(700, 20);
      let x = M;
      sec.head.forEach((h, i) => { g.textAlign = align[i]; g.fillText(fit(g, String(h).toUpperCase(), colW[i] - 28), align[i] === "right" ? x + colW[i] - 16 : x + 16, y + 34); x += colW[i]; });
      g.textAlign = "left";
      y += rowH;
    };
    if (y + 140 > bottom) newPage(false);
    g.fillStyle = INK; g.font = f(800, 32); g.fillText(sec.title, M, y + 30); y += 56;
    drawHead();
    if (!sec.rows.length) { g.fillStyle = MUTED; g.font = f(500, 23); g.fillText("Aucune donnée sur cette période.", M + 16, y + 38); y += rowH + 10; }
    sec.rows.forEach((row, ri) => {
      if (y + rowH > bottom) { newPage(false); drawHead(); }
      if (ri % 2 === 1) { g.fillStyle = "#FAFBFD"; g.fillRect(M, y, A4W - 2 * M, rowH); }
      g.fillStyle = LINE; g.fillRect(M, y + rowH - 1, A4W - 2 * M, 1);
      let x = M;
      row.forEach((cell, i) => {
        const c = typeof cell === "object" && cell ? cell : { t: cell };
        g.fillStyle = c.color || INK; g.font = f(c.bold ? 800 : i === 0 ? 600 : 500, 22);
        g.textAlign = align[i];
        g.fillText(fit(g, c.t, colW[i] - 28), align[i] === "right" ? x + colW[i] - 16 : x + 16, y + 35);
        x += colW[i];
      });
      g.textAlign = "left";
      y += rowH;
    });
    if (sec.total) {
      if (y + rowH > bottom) newPage(false);
      roundRect(g, M, y + 6, A4W - 2 * M, rowH, 12, "#FCF3E1");
      let x = M;
      sec.total.forEach((cell, i) => { g.fillStyle = "#8A5A0B"; g.font = f(800, 22); g.textAlign = align[i]; g.fillText(fit(g, cell, colW[i] - 28), align[i] === "right" ? x + colW[i] - 16 : x + 16, y + 41); x += colW[i]; });
      g.textAlign = "left";
      y += rowH + 12;
    }
    y += 40;
  });
  const when = `${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  pages.forEach((p, i) => {
    const pg = p.getContext("2d");
    pg.fillStyle = LINE; pg.fillRect(M, A4H - 86, A4W - 2 * M, 2);
    pg.fillStyle = MUTED; pg.font = f(500, 20);
    pg.textAlign = "left"; pg.fillText(`${info.name} · document édité le ${when} · GestiOne`, M, A4H - 50);
    pg.textAlign = "right"; pg.fillText(`Page ${i + 1} / ${pages.length}`, A4W - M, A4H - 50);
    pg.textAlign = "left";
  });
  return pages.map((p) => p.toDataURL("image/jpeg", 0.9));
}

async function pagesToPdf(jpegs) {
  const { jsPDF } = await import("jspdf");
  const pw = 595.28, ph = 841.89;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  jpegs.forEach((j, i) => { if (i) doc.addPage("a4"); doc.addImage(j, "JPEG", 0, 0, pw, ph); });
  return doc;
}

export async function exportReportPdf(fileName, report, info) {
  const pages = await renderReportPages(report, info);
  const doc = await pagesToPdf(pages);
  await exportPdfDoc(fileName, doc);
}

// ---------- Reçu (ticket) en PDF ----------
export async function renderReceiptImage(r, info, fmt) {
  const m = receiptModel(r, info, fmt);
  const W = 640, P = 40;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = 2600;
  const g = cv.getContext("2d");
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, W, cv.height);
  const MONO = "'Courier New', Courier, monospace";
  let y = 40;
  const logo = await loadImage(logoSrc(info));
  if (logo) { g.drawImage(logo, W / 2 - 70, y, 140, 140); y += 160; }
  g.fillStyle = INK; g.textAlign = "center";
  g.font = f(800, 32); g.fillText(fit(g, info.name.toUpperCase(), W - 2 * P), W / 2, y + 10); y += 44;
  g.font = `500 20px ${MONO}`; g.fillStyle = "#4B5563";
  if (info.address) { g.fillText(fit(g, info.address, W - 2 * P), W / 2, y); y += 28; }
  if (info.phone) { g.fillText(`Tél. ${info.phone}`, W / 2, y); y += 28; }
  y += 10;
  g.font = f(800, 22); const tw = g.measureText(m.title).width + 36;
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(W / 2 - tw / 2, y - 4, tw, 40); g.fillStyle = INK; g.fillText(m.title, W / 2, y + 24); y += 52;
  if (m.cancelled) { g.fillStyle = "#BE123C"; g.font = f(800, 26); g.fillText("ANNULÉ", W / 2, y + 10); y += 40; }
  const dash = () => { g.strokeStyle = "#9CA3AF"; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(P, y); g.lineTo(W - P, y); g.stroke(); g.setLineDash([]); y += 26; };
  const solid = () => { g.fillStyle = INK; g.fillRect(P, y, W - 2 * P, 3); y += 22; };
  const row = ([a, b], bold, size = 21) => {
    g.font = `${bold ? 800 : 500} ${size}px ${MONO}`; g.fillStyle = INK;
    g.textAlign = "left"; g.fillText(fit(g, a, (W - 2 * P) * 0.55), P, y + 6);
    g.textAlign = "right"; g.font = `${bold ? 800 : 700} ${size}px ${MONO}`; g.fillText(fit(g, b, (W - 2 * P) * 0.45), W - P, y + 6);
    y += size + 12;
  };
  y += 4; dash();
  m.rows.forEach((x) => row(x));
  dash();
  g.textAlign = "center"; g.fillStyle = INK; g.font = f(800, 40); g.fillText(m.room, W / 2, y + 22); y += 50;
  g.font = f(700, 20); g.fillText(m.roomType, W / 2, y + 4); y += 30;
  m.stay.forEach((x) => row(x));
  dash();
  m.lines.forEach((x) => row(x));
  solid(); row([m.totalLbl, m.totalVal], true, 28); solid();
  m.pay.forEach((x) => row(x));
  dash();
  g.textAlign = "center"; g.fillStyle = INK; g.font = f(800, 24); g.fillText(fit(g, m.thanks[0], W - 2 * P), W / 2, y + 6); y += 34;
  g.font = f(500, 20); g.fillStyle = "#374151";
  m.thanks.slice(1).forEach((t) => {
    const words = t.split(" "); let line = "";
    words.forEach((w) => { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > W - 2 * P) { g.fillText(line, W / 2, y); y += 28; line = w; } else line = test; });
    if (line) { g.fillText(line, W / 2, y); y += 28; }
  });
  g.fillStyle = "#6B7280"; g.font = f(500, 18); g.fillText("Merci de conserver ce reçu.", W / 2, y + 8); y += 30; g.fillText(`${r.no} · GestiOne`, W / 2, y + 4); y += 40;
  const out = document.createElement("canvas"); out.width = W; out.height = Math.ceil(y);
  out.getContext("2d").drawImage(cv, 0, 0);
  return { jpeg: out.toDataURL("image/jpeg", 0.92), w: W, h: out.height };
}

export async function buildReceiptPdf(r, info, fmt) {
  const img = await renderReceiptImage(r, info, fmt);
  const { jsPDF } = await import("jspdf");
  if (info.paper === "a4") {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = 300, h = (img.h / img.w) * w;
    doc.addImage(img.jpeg, "JPEG", (595.28 - w) / 2, 40, w, Math.min(h, 780));
    return doc;
  }
  const mmW = info.paper === "80" ? 80 : 58;
  const ptW = (mmW / 25.4) * 72;
  const ptH = (img.h / img.w) * ptW;
  const doc = new jsPDF({ unit: "pt", format: [ptW, ptH] });
  doc.addImage(img.jpeg, "JPEG", 0, 0, ptW, ptH);
  return doc;
}

export async function exportReceiptPdf(r, info, fmt) {
  const doc = await buildReceiptPdf(r, info, fmt);
  await exportPdfDoc(`Recu-${r.no}.pdf`, doc);
}
export async function shareReceiptPdf(r, info, fmt, text = "") {
  const doc = await buildReceiptPdf(r, info, fmt);
  return sharePdfDoc(`Recu-${r.no}.pdf`, doc, text, r.phone || "");
}
