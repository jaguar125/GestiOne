// src/cyber/cyberReceipt.js
//
// Reçu d'un ticket du cyber café : contenu, impression (imprimante
// Bluetooth via RawBT, PDF dans l'application, fenêtre d'impression dans un
// navigateur) et partage (WhatsApp, SMS…).

import { isPrinterFeatureAvailable, printRawEscPos } from "../printer.js";
import { exportPdfDoc } from "../nativeExport.js";
import { hmOf, salePaid, saleToPay, saleDue, dmy } from "./cyberLogic.js";

export const PAY_TXT = { cash: "Espèces", momo: "Mobile Money" };

export function receiptInfo(shop, settings) {
  const rc = settings.receipt || {};
  return { name: (rc.name || "").trim() || shop?.name || "Cyber café", address: (rc.address || "").trim(), phone: (rc.phone || "").trim(), message: (rc.message || "").trim(), paper: rc.paper || "58" };
}

export function receiptModel(s, info, fmt) {
  const rows = [["Reçu N°", s.no], ["Date", `${dmy(s.at)} · ${hmOf(s.at)}`], ["Servi par", s.by || "—"]];
  if (s.client?.name) rows.push(["Client", s.client.name]);
  const lines = (s.lines || []).map((l) => ({ label: `${l.qty} × ${l.label}`, detail: l.detail || "", amount: fmt(l.amount), official: Number(l.official) > 0 ? fmt(l.official) : "" }));
  const pay = [];
  const sale = (s.payments || []).filter((p) => p.kind !== "credit");
  sale.forEach((p) => {
    pay.push([p.mode === "momo" ? `Mobile Money${p.op ? ` (${p.op})` : ""}` : "Espèces reçues", fmt(p.mode === "cash" && p.given > p.amount ? p.given : p.amount)]);
    if (p.mode === "cash" && p.given > p.amount) pay.push(["Monnaie rendue", fmt(p.given - p.amount)]);
  });
  (s.payments || []).filter((p) => p.kind === "credit").forEach((p) => pay.push([`Paiement du ${dmy(p.at).slice(0, 5)}`, fmt(p.amount)]));
  const due = saleDue(s);
  if (due > 0) pay.push(["Reste à payer (crédit)", fmt(due)]);
  const thanks = info.message ? [info.message] : ["Merci de votre visite.", `À bientôt chez ${info.name} !`];
  return { rows, lines, total: fmt(saleToPay(s)), official: Number(s.official) > 0 ? fmt(s.official) : "", paid: fmt(salePaid(s)), pay, thanks, cancelled: s.status === "cancelled" };
}

function strip(str) {
  return String(str ?? "").replace(/[\u00A0\u202F\u2000-\u200A]/g, " ").replace(/\u00B7/g, "-").replace(/\u00D7/g, "x").replace(/[\u2018\u2019]/g, "'").replace(/[\u00AB\u00BB]/g, '"').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
}
export function buildEscPos(s, info, fmt) {
  const width = info.paper === "80" ? 48 : 32;
  const bytes = []; const push = (...a) => bytes.push(...a);
  const line = (t = "") => push(...Array.from(strip(t) + "\n").map((c) => c.charCodeAt(0) & 0xff));
  const two = (l, r) => { const a = strip(l), b = strip(r); const sp = width - a.length - b.length; return sp >= 1 ? a + " ".repeat(sp) + b : `${a}\n${" ".repeat(Math.max(0, width - b.length))}${b}`; };
  const m = receiptModel(s, info, fmt);
  push(0x1b, 0x40); push(0x1b, 0x61, 0x01);
  push(0x1b, 0x45, 0x01); push(0x1d, 0x21, 0x01); line(info.name.toUpperCase()); push(0x1d, 0x21, 0x00); push(0x1b, 0x45, 0x00);
  if (info.address) line(info.address);
  if (info.phone) line(`Tel. ${info.phone}`);
  line(""); push(0x1b, 0x45, 0x01); line(m.cancelled ? "RECU - ANNULE" : "RECU"); push(0x1b, 0x45, 0x00);
  push(0x1b, 0x61, 0x00); line("-".repeat(width));
  m.rows.forEach(([a, b]) => line(two(a, b)));
  line("-".repeat(width));
  m.lines.forEach((l) => { line(two(l.label, l.amount)); if (l.detail) line(`  ${l.detail}`); if (l.official) line(two("  Frais officiels", l.official)); });
  line("=".repeat(width)); push(0x1b, 0x45, 0x01); line(two("TOTAL", m.total)); push(0x1b, 0x45, 0x00); line("=".repeat(width));
  m.pay.forEach(([a, b]) => line(two(a, b)));
  line("-".repeat(width)); push(0x1b, 0x61, 0x01);
  m.thanks.forEach(line); line(s.no); line(""); line(""); line("");
  push(0x1d, 0x56, 0x42, 0x00);
  return new Uint8Array(bytes);
}

const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function receiptHtml(s, info, fmt) {
  const m = receiptModel(s, info, fmt);
  const w = info.paper === "80" ? "80mm" : "58mm";
  const row = ([a, b]) => `<div class="r"><span>${esc(a)}</span><b>${esc(b)}</b></div>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${esc(s.no)}</title><style>
@page{size:${w} auto;margin:2mm}*{box-sizing:border-box}body{margin:0;font-family:"Courier New",monospace;color:#000;font-size:11.5px}
.t{width:${w};margin:0 auto;padding:4px 2px}.c{text-align:center}.n{font-family:Arial,sans-serif;font-weight:800;font-size:15px}.s{font-size:10.5px}
.d{border-top:1.5px dashed #000;margin:7px 0}.r{display:flex;justify-content:space-between;gap:8px}.tot{font-size:14px;font-weight:800}.x{font-size:10px;padding-left:8px}
</style></head><body><div class="t"><div class="c"><div class="n">${esc(info.name.toUpperCase())}</div><div class="s">${esc(info.address)}${info.phone ? `<br>Tél. ${esc(info.phone)}` : ""}</div><div style="margin-top:4px;font-weight:800">${m.cancelled ? "REÇU · ANNULÉ" : "REÇU"}</div></div>
<div class="d"></div>${m.rows.map(row).join("")}<div class="d"></div>
${m.lines.map((l) => `${row([l.label, l.amount])}${l.detail ? `<div class="x">${esc(l.detail)}</div>` : ""}${l.official ? row(["  Frais officiels", l.official]) : ""}`).join("")}
<div class="d"></div><div class="r tot"><span>TOTAL</span><span>${esc(m.total)}</span></div><div class="d"></div>${m.pay.map(row).join("")}<div class="d"></div>
<div class="c s">${m.thanks.map(esc).join("<br>")}<br>${esc(s.no)}</div></div></body></html>`;
}
function printHtml(html) {
  return new Promise((resolve) => {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(f);
    const doc = f.contentWindow.document; doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { /* ignore */ } setTimeout(() => { f.remove(); resolve(); }, 1500); }, 150);
  });
}
async function isNativeApp() {
  try { const { Capacitor } = await import("@capacitor/core"); return Capacitor.isNativePlatform(); } catch { return false; }
}
export async function receiptPdf(s, info, fmt) {
  const { jsPDF } = await import("jspdf");
  const m = receiptModel(s, info, fmt);
  const rows = 14 + m.rows.length + m.lines.length * 2 + m.pay.length + m.thanks.length;
  const doc = new jsPDF({ unit: "mm", format: [58, Math.max(90, rows * 5 + 20)] });
  let y = 8; const W = 58;
  const t = (txt, x, opt = {}) => { doc.text(String(txt), x, y, opt); };
  const two = (a, b, bold) => { doc.setFont("helvetica", bold ? "bold" : "normal"); t(a, 3); t(b, W - 3, { align: "right" }); y += 4.6; };
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); t(info.name.toUpperCase(), W / 2, { align: "center" }); y += 5;
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  if (info.address) { t(info.address, W / 2, { align: "center" }); y += 3.8; }
  if (info.phone) { t(`Tél. ${info.phone}`, W / 2, { align: "center" }); y += 3.8; }
  doc.setFont("helvetica", "bold"); t(m.cancelled ? "REÇU · ANNULÉ" : "REÇU", W / 2, { align: "center" }); y += 3;
  doc.setLineDashPattern([1, 1], 0); doc.line(3, y, W - 3, y); y += 4.5;
  m.rows.forEach(([a, b]) => two(a, b));
  doc.line(3, y - 2, W - 3, y - 2); y += 2;
  m.lines.forEach((l) => { two(l.label.slice(0, 30), l.amount); if (l.detail) { doc.setFont("helvetica", "normal"); t(l.detail.slice(0, 40), 5); y += 4; } if (l.official) two("  Frais officiels", l.official); });
  doc.line(3, y - 2, W - 3, y - 2); y += 2.5;
  doc.setFontSize(9.5); two("TOTAL", m.total, true); doc.setFontSize(7.5);
  m.pay.forEach(([a, b]) => two(a, b));
  y += 2; doc.setFont("helvetica", "normal");
  m.thanks.forEach((x) => { t(x, W / 2, { align: "center" }); y += 3.8; });
  t(s.no, W / 2, { align: "center" });
  return doc;
}
export async function printReceipt(s, info, fmt) {
  if (isPrinterFeatureAvailable()) { await printRawEscPos(buildEscPos(s, info, fmt), `recu-${s.no}.prn`); return "printer"; }
  if (await isNativeApp()) { const doc = await receiptPdf(s, info, fmt); await exportPdfDoc(`Recu-${s.no}.pdf`, doc); return "pdf"; }
  await printHtml(receiptHtml(s, info, fmt));
  return "browser";
}
export function receiptText(s, info, fmt) {
  const m = receiptModel(s, info, fmt);
  const out = [`*${info.name}*`, m.cancelled ? "Reçu (ANNULÉ)" : "Reçu", ""];
  m.rows.forEach(([a, b]) => out.push(`${a} : ${b}`));
  out.push("");
  m.lines.forEach((l) => { out.push(`${l.label} : ${l.amount}`); if (l.official) out.push(`  Frais officiels : ${l.official}`); });
  out.push(`*TOTAL : ${m.total}*`);
  m.pay.forEach(([a, b]) => out.push(`${a} : ${b}`));
  out.push("", ...m.thanks);
  return out.join("\n");
}
export async function shareReceipt(s, info, fmt) {
  const text = receiptText(s, info, fmt);
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) { const { Share } = await import("@capacitor/share"); await Share.share({ title: `Reçu ${s.no}`, text }); return; }
  } catch { /* navigateur */ }
  if (navigator.share) { try { await navigator.share({ title: `Reçu ${s.no}`, text }); return; } catch { /* annulé */ } }
  const phone = String(s.client?.phone || "").replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}
