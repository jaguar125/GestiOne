// src/cyber/cyberReceipt.js
//
// Reçus du cyber café, sur le même principe que les reçus des boutiques
// GestiOne :
//   - reçu de vente / prestation (avec mention « ANNULÉ » et remboursement),
//   - reçu de paiement de crédit (règlement d'une dette client),
//   - rapport de clôture de caisse.
// Chaque document porte un code-barres (CODE128) avec son numéro, à l'écran,
// sur le papier et dans le PDF. Impression : imprimante Bluetooth via RawBT
// (même réglage que les boutiques), sinon PDF dans l'application, sinon
// fenêtre d'impression du navigateur. Partage : WhatsApp, SMS…

import { isPrinterFeatureAvailable, printRawEscPos } from "../printer.js";
import { exportPdfDoc } from "../nativeExport.js";
import { momoLabel, momoName } from "../MomoPicker.jsx";
import { hmOf, salePaid, saleToPay, saleDue, dmy, isLive } from "./cyberLogic.js";

export const PAY_TXT = { cash: "Espèces", momo: "Mobile Money" };

export function receiptInfo(shop, settings) {
  const rc = settings.receipt || {};
  return { name: (rc.name || "").trim() || shop?.name || "Cyber café", address: (rc.address || "").trim(), phone: (rc.phone || "").trim(), message: (rc.message || "").trim(), paper: rc.paper || "58" };
}
const thanksOf = (info) => (info.message ? [info.message] : ["Merci de votre visite.", `À bientôt chez ${info.name} !`]);

// ---------- Modèles de documents ----------
// Forme commune : { title, cancelled, rows, lines, totalLabel, total, pay, notes, thanks, code }

// Reçu de vente / prestation.
export function saleDoc(s, info, fmt) {
  const rows = [["Reçu N°", s.no], ["Date", `${dmy(s.at)} · ${hmOf(s.at)}`], ["Servi par", s.by || "—"]];
  if (s.client?.name) rows.push(["Client", s.client.name]);
  const lines = (s.lines || []).map((l) => ({ label: `${l.qty} × ${l.label}`, detail: l.detail || "", amount: fmt(l.amount), official: Number(l.official) > 0 ? fmt(l.official) : "" }));
  const pay = [];
  (s.payments || []).filter((p) => p.kind !== "credit").forEach((p) => {
    pay.push([p.mode === "momo" ? momoLabel(p.op) : "Espèces reçues", fmt(p.mode === "cash" && p.given > p.amount ? p.given : p.amount)]);
    if (p.mode === "cash" && p.given > p.amount) pay.push(["Monnaie rendue", fmt(p.given - p.amount)]);
  });
  (s.payments || []).filter((p) => p.kind === "credit").forEach((p) => pay.push([`Paiement du ${dmy(p.at).slice(0, 5)} · ${p.mode === "momo" ? momoName(p.op) || "Mobile Money" : "espèces"}`, fmt(p.amount)]));
  const cancelled = s.status === "cancelled";
  const due = saleDue(s);
  if (due > 0 && !cancelled) pay.push(["Reste à payer (crédit)", fmt(due)]);
  const notes = [];
  if (cancelled) {
    if (s.cancel?.at) notes.push(`Annulé le ${dmy(s.cancel.at)} à ${hmOf(s.cancel.at)}${s.cancel.by ? ` par ${s.cancel.by}` : ""}.`);
    if (s.cancel?.reason) notes.push(`Motif : ${s.cancel.reason}`);
    if (s.refund?.amount > 0) notes.push(`Remboursé au client : ${fmt(s.refund.amount)}`);
  } else if (due > 0) {
    notes.push(`Solde en crédit : ${fmt(due)}`);
    notes.push(`${s.client?.name || "Client"} · à régler lors d'un prochain passage.`);
  }
  return {
    title: cancelled ? "REÇU · ANNULÉ" : "REÇU", cancelled, rows, lines,
    totalLabel: "TOTAL", total: fmt(saleToPay(s)), official: Number(s.official) > 0 ? fmt(s.official) : "", paid: fmt(salePaid(s)),
    pay, notes, thanks: thanksOf(info), code: s.no,
  };
}
// Ancien nom, toujours utilisé par l'écran du reçu.
export const receiptModel = saleDoc;

// Paiements de crédit regroupés : un encaissement réparti sur plusieurs
// tickets d'un même client forme un seul reçu.
const groupKey = (p) => p.grp || `t${p.at}`;
export function creditPaymentGroup(sales, clientId, key) {
  const own = sales.filter((s) => s.client?.id === clientId);
  const items = []; let first = null;
  own.forEach((s) => (s.payments || []).forEach((p) => {
    if (p.kind !== "credit" || groupKey(p) !== key) return;
    items.push({ no: s.no, amount: Number(p.amount) || 0 });
    if (!first) first = p;
  }));
  if (!first) return null;
  const client = own[0]?.client || {};
  const dueAfter = own.filter((s) => isLive(s) && s.at <= first.at).reduce((t, s) => {
    const paid = (s.payments || []).filter((p) => p.at <= first.at).reduce((a, p) => a + (Number(p.amount) || 0), 0);
    return t + Math.max(0, saleToPay(s) - paid);
  }, 0);
  return { key, no: first.rno || `P${String(first.at).slice(-8)}`, at: first.at, by: first.by, mode: first.mode, op: first.op, client, amount: items.reduce((t, i) => t + i.amount, 0), items, dueAfter };
}
export function creditPaymentKeys(sales, clientId) {
  const seen = new Map();
  sales.filter((s) => s.client?.id === clientId).forEach((s) => (s.payments || []).forEach((p) => { if (p.kind === "credit") { const k = groupKey(p); if (!seen.has(k)) seen.set(k, p.at); } }));
  return seen;
}
export { groupKey as creditGroupKey };

// Reçu de paiement de crédit.
export function creditDoc(g, info, fmt) {
  const rows = [["Reçu N°", g.no], ["Date", `${dmy(g.at)} · ${hmOf(g.at)}`], ["Reçu par", g.by || "—"], ["Client", g.client?.name || "Client"]];
  const lines = g.items.map((i) => ({ label: `Ticket ${i.no}`, detail: "Règlement de crédit", amount: fmt(i.amount), official: "" }));
  const pay = [["Mode de paiement", g.mode === "momo" ? momoLabel(g.op) : "Espèces"], ["Reste à payer", fmt(g.dueAfter)]];
  const notes = g.dueAfter > 0 ? [`Solde restant : ${fmt(g.dueAfter)}`] : ["Crédit entièrement réglé. Merci !"];
  return { title: "REÇU DE PAIEMENT", cancelled: false, rows, lines, totalLabel: "MONTANT PAYÉ", total: fmt(g.amount), pay, notes, thanks: thanksOf(info), code: g.no };
}

// Rapport de clôture de caisse.
export function closeDoc(c, info, fmt) {
  const has = (v) => v !== undefined && v !== null;
  const rows = [["Journée", dmy(c.at)], ["Clôturée à", hmOf(c.at)], ["Par", c.by || "—"]];
  const lines = [];
  const L = (label, v, sign = "") => { if (has(v)) lines.push({ label, detail: "", amount: `${sign}${fmt(v)}`, official: "" }); };
  L("Fond de caisse", c.float);
  L("Encaissé en espèces", c.cash, "+ ");
  L("Dépenses en caisse", c.expCash, "- ");
  L("Achats en caisse", c.purchasesCash, "- ");
  L("Remboursements", c.refundsCash, "- ");
  L("Espèces attendues", c.expected);
  const gap = Number(c.gap) || 0;
  const pay = [[gap === 0 ? "Écart" : gap < 0 ? "Manquant" : "Excédent", gap === 0 ? `${fmt(0)} (caisse juste)` : `${gap < 0 ? "- " : "+ "}${fmt(Math.abs(gap))}`]];
  if (has(c.momo)) pay.push([`Mobile Money${c.momoChecked ? " (vérifié)" : ""}`, fmt(c.momo)]);
  if (has(c.ca)) pay.push(["Chiffre d'affaires du jour", fmt(c.ca)]);
  if (has(c.encaisse)) pay.push(["Encaissé du jour", fmt(c.encaisse)]);
  if (has(c.tickets)) pay.push(["Tickets", String(c.tickets)]);
  const notes = c.comment ? [`Commentaire : ${c.comment}`] : [];
  return { title: "CLÔTURE DE CAISSE", cancelled: false, rows, lines, totalLabel: "ESPÈCES COMPTÉES", total: fmt(c.counted), pay, notes, thanks: ["Signature :", "", "......................"], code: "" };
}

// ---------- Code-barres ----------
const BAR_OPTS = { format: "CODE128", height: 42, displayValue: true, fontSize: 12, textMargin: 2, margin: 0, background: "#ffffff", lineColor: "#000000" };
async function jsBarcode() { return (await import("jsbarcode")).default; }
export async function drawBarcode(el, code, width = 1.4) {
  if (!el || !code) return;
  try { (await jsBarcode())(el, String(code), { ...BAR_OPTS, width }); } catch { /* code-barres indisponible */ }
}
async function barcodeSvg(code) {
  if (!code || typeof document === "undefined") return "";
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    (await jsBarcode())(svg, String(code), { ...BAR_OPTS, width: 1.4 });
    return svg.outerHTML;
  } catch { return ""; }
}
async function barcodePng(code) {
  if (!code || typeof document === "undefined") return null;
  try {
    const cv = document.createElement("canvas");
    (await jsBarcode())(cv, String(code), { ...BAR_OPTS, width: 2, height: 60, fontSize: 18 });
    return { data: cv.toDataURL("image/png"), w: cv.width, h: cv.height };
  } catch { return null; }
}

// ---------- Impression ESC/POS (imprimante Bluetooth) ----------
function strip(str) {
  return String(str ?? "").replace(/[\u00A0\u202F\u2000-\u200A]/g, " ").replace(/\u00B7/g, "-").replace(/\u00D7/g, "x").replace(/[\u2018\u2019]/g, "'").replace(/[\u00AB\u00BB]/g, '"').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
}
export function docEscPos(m, info) {
  const width = info.paper === "80" ? 48 : 32;
  const bytes = []; const push = (...a) => bytes.push(...a);
  const line = (t = "") => push(...Array.from(strip(t) + "\n").map((c) => c.charCodeAt(0) & 0xff));
  // Retour à la ligne par mots : aucun mot coupé au milieu, rien ne déborde.
  const wrap = (t, w = width) => {
    const out = [];
    strip(t).split("\n").forEach((par) => {
      let cur = "";
      par.split(" ").forEach((word) => {
        let wd = word;
        while (wd.length > w) { if (cur) { out.push(cur); cur = ""; } out.push(wd.slice(0, w)); wd = wd.slice(w); }
        if (!cur) cur = wd; else if ((cur + " " + wd).length <= w) cur += " " + wd; else { out.push(cur); cur = wd; }
      });
      out.push(cur);
    });
    return out;
  };
  const para = (t) => wrap(t).forEach((l) => line(l));
  const two = (l, r) => {
    const b = strip(r); const ls = wrap(l, Math.max(8, width - 1));
    const last = ls.pop() || "";
    ls.forEach((x) => line(x));
    const sp = width - last.length - b.length;
    if (sp >= 1) line(last + " ".repeat(sp) + b);
    else { line(last); line(" ".repeat(Math.max(0, width - b.length)) + b); }
  };
  push(0x1b, 0x40); push(0x1b, 0x61, 0x01);
  push(0x1b, 0x45, 0x01); push(0x1d, 0x21, 0x01); wrap(info.name.toUpperCase(), Math.floor(width / 2)).forEach((l) => line(l)); push(0x1d, 0x21, 0x00); push(0x1b, 0x45, 0x00);
  if (info.address) para(info.address);
  if (info.phone) line(`Tel. ${info.phone}`);
  line(""); push(0x1b, 0x45, 0x01); para(m.title); push(0x1b, 0x45, 0x00);
  push(0x1b, 0x61, 0x00); line("-".repeat(width));
  m.rows.forEach(([a, b]) => two(a, b));
  line("-".repeat(width));
  m.lines.forEach((l) => { two(l.label, l.amount); if (l.detail) wrap(l.detail, width - 2).forEach((x) => line(`  ${x}`)); if (l.official) two("  Frais officiels", l.official); });
  line("=".repeat(width)); push(0x1b, 0x45, 0x01); two(m.totalLabel, m.total); push(0x1b, 0x45, 0x00); line("=".repeat(width));
  m.pay.forEach(([a, b]) => two(a, b));
  if (m.notes.length) { line(""); m.notes.forEach((n) => para(n)); }
  line("-".repeat(width));
  push(0x1b, 0x61, 0x01);
  if (m.code) {
    const code = strip(m.code);
    const data = Array.from(`{B${code}`).map((c) => c.charCodeAt(0) & 0xff);
    push(0x1d, 0x48, 0x02); // numéro lisible sous le code-barres
    push(0x1d, 0x68, 0x50); // hauteur
    push(0x1d, 0x77, code.length > 12 && width === 32 ? 0x01 : 0x02); // largeur des barres
    push(0x1d, 0x6b, 0x49, data.length, ...data);
    push(0x0a);
  }
  m.thanks.forEach((t) => (t ? para(t) : line(""))); line(""); line(""); line("");
  push(0x1d, 0x56, 0x42, 0x00);
  return new Uint8Array(bytes);
}

// ---------- HTML (impression navigateur) ----------
const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export async function docHtml(m, info) {
  const w = info.paper === "80" ? "80mm" : "58mm";
  const row = ([a, b]) => `<div class="r"><span>${esc(a)}</span><b>${esc(b)}</b></div>`;
  const bar = await barcodeSvg(m.code);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(m.title)} ${esc(m.code)}</title><style>
@page{size:${w} auto;margin:2mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:10.5px;line-height:1.35}
.t{width:${w};max-width:100%;margin:0 auto;padding:3mm 2.5mm}.c{text-align:center}.n{font-weight:800;font-size:13.5px;letter-spacing:.02em}.s{font-size:9.5px}
.ti{display:inline-block;margin-top:4px;padding:2px 8px;border:1px solid #000;border-radius:10px;font-weight:800;font-size:9.5px;letter-spacing:.1em}
.d{border-top:1px solid #000;margin:6px 0}.r{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;padding:1px 0}
.r span{min-width:0;overflow-wrap:anywhere}.r b{text-align:right;max-width:60%;overflow-wrap:anywhere}
.tot{margin-top:4px;padding:5px 6px;border:1.5px solid #000;border-radius:6px;font-size:13px;font-weight:800}.x{font-size:9.5px;padding-left:6px;overflow-wrap:anywhere}
.no{margin-top:6px;padding:4px 6px;border:1px solid #000;border-radius:5px;font-size:9.5px;overflow-wrap:anywhere}.bc svg{max-width:100%;height:auto}
</style></head><body><div class="t"><div class="c"><div class="n">${esc(info.name.toUpperCase())}</div><div class="s">${esc(info.address)}${info.phone ? `<br>Tél. ${esc(info.phone)}` : ""}</div><div class="ti">${esc(m.title)}</div></div>
<div class="d"></div>${m.rows.map(row).join("")}<div class="d"></div>
${m.lines.map((l) => `${row([l.label, l.amount])}${l.detail ? `<div class="x">${esc(l.detail)}</div>` : ""}${l.official ? row(["Frais officiels (reversés)", l.official]) : ""}`).join("")}
<div class="r tot"><span>${esc(m.totalLabel)}</span><span>${esc(m.total)}</span></div>${m.pay.map(row).join("")}
${m.notes.length ? `<div class="no">${m.notes.map(esc).join("<br>")}</div>` : ""}<div class="d"></div>
${bar ? `<div class="c bc">${bar}</div>` : ""}<div class="c s" style="margin-top:4px">${m.thanks.map(esc).join("<br>")}</div></div></body></html>`;
}
function printHtml(html) {
  return new Promise((resolve) => {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(f);
    const doc = f.contentWindow.document; doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { /* ignore */ } setTimeout(() => { f.remove(); resolve(); }, 1500); }, 250);
  });
}
async function isNativeApp() {
  try { const { Capacitor } = await import("@capacitor/core"); return Capacitor.isNativePlatform(); } catch { return false; }
}

// ---------- PDF (application installée, sans imprimante) ----------
// Mise en page en deux passes : on mesure d'abord la hauteur réelle (textes
// repliés sur plusieurs lignes), puis on dessine sur une page de cette taille.
export async function docPdf(m, info) {
  const { jsPDF } = await import("jspdf");
  const W = info.paper === "80" ? 80 : 58; const M = 3.5;
  const bar = await barcodePng(m.code);
  const barW = Math.min(W - 2 * M - 4, 46); const barH = bar ? (bar.h / bar.w) * barW : 0;
  const draw = (doc) => {
    let y = 8;
    const t = (txt, x, opt = {}) => { doc.text(String(txt), x, y, opt); };
    const center = (txt, lh) => { doc.splitTextToSize(String(txt), W - 2 * M).forEach((ln) => { t(ln, W / 2, { align: "center" }); y += lh; }); };
    const two = (a, b, bold, size = 7.5) => {
      doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal");
      const bw = doc.getTextWidth(String(b));
      const la = doc.splitTextToSize(String(a), Math.max(12, W - 2 * M - bw - 3));
      la.forEach((ln, i) => { t(ln, M); if (i === la.length - 1) t(b, W - M, { align: "right" }); y += size * 0.5 + 0.6; });
      y += 0.5;
    };
    const rule = () => { doc.setLineWidth(0.2); doc.line(M, y - 1.5, W - M, y - 1.5); y += 2.5; };
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); center(info.name.toUpperCase(), 4.8);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    if (info.address) center(info.address, 3.6);
    if (info.phone) center(`Tél. ${info.phone}`, 3.6);
    y += 1; doc.setFont("helvetica", "bold"); center(m.title, 3.6); y += 1.5;
    rule();
    m.rows.forEach(([a, b]) => two(a, b));
    rule();
    m.lines.forEach((l) => {
      two(l.label, l.amount, true);
      if (l.detail) { doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.splitTextToSize(l.detail, W - 2 * M - 2).forEach((ln) => { t(ln, M + 1.5); y += 3.2; }); }
      if (l.official) two("Frais officiels (reversés)", l.official, false, 6.8);
    });
    rule();
    two(m.totalLabel, m.total, true, 9.5);
    m.pay.forEach(([a, b]) => two(a, b));
    if (m.notes.length) { y += 1; doc.setFont("helvetica", "normal"); doc.setFontSize(7); m.notes.forEach((x) => { doc.splitTextToSize(x, W - 2 * M).forEach((ln) => { t(ln, M); y += 3.4; }); }); }
    y += 1; rule();
    if (bar) { doc.addImage(bar.data, "PNG", (W - barW) / 2, y - 1, barW, barH); y += barH + 3; }
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    m.thanks.forEach((x) => { if (x) center(x, 3.6); else y += 3.6; });
    return y + 6;
  };
  const probe = new jsPDF({ unit: "mm", format: [W, 2000] });
  const h = Math.max(70, draw(probe));
  const doc = new jsPDF({ unit: "mm", format: [W, h] });
  draw(doc);
  return doc;
}

// ---------- Texte (partage WhatsApp, SMS…) ----------
export function docText(m, info) {
  const out = [`*${info.name}*`, m.title, ""];
  m.rows.forEach(([a, b]) => out.push(`${a} : ${b}`));
  out.push("");
  m.lines.forEach((l) => { out.push(`${l.label} : ${l.amount}`); if (l.official) out.push(`  Frais officiels : ${l.official}`); });
  out.push(`*${m.totalLabel} : ${m.total}*`);
  m.pay.forEach(([a, b]) => out.push(`${a} : ${b}`));
  if (m.notes.length) out.push("", ...m.notes);
  if (m.thanks.length) out.push("", ...m.thanks.filter(Boolean));
  return out.join("\n");
}

// ---------- Actions ----------
const fileBase = (m) => (m.title.startsWith("CL") ? `Cloture-${m.rows[0][1].replace(/\//g, "-")}` : `Recu-${m.code}`);
export async function printDoc(m, info) {
  if (isPrinterFeatureAvailable()) { await printRawEscPos(docEscPos(m, info), `${fileBase(m)}.prn`); return "printer"; }
  if (await isNativeApp()) { const doc = await docPdf(m, info); await exportPdfDoc(`${fileBase(m)}.pdf`, doc); return "pdf"; }
  await printHtml(await docHtml(m, info));
  return "browser";
}
export async function shareDoc(m, info, phone = "") {
  const text = docText(m, info);
  const title = `${m.title} ${m.code || ""}`.trim();
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) { const { Share } = await import("@capacitor/share"); await Share.share({ title, text }); return; }
  } catch { /* navigateur */ }
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch { /* annulé */ } }
  const tel = String(phone || "").replace(/\D/g, "");
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

// Raccourcis pour un reçu de vente (compatibilité).
export const buildEscPos = (s, info, fmt) => docEscPos(saleDoc(s, info, fmt), info);
export const receiptHtml = (s, info, fmt) => docHtml(saleDoc(s, info, fmt), info);
export const receiptPdf = (s, info, fmt) => docPdf(saleDoc(s, info, fmt), info);
export const receiptText = (s, info, fmt) => docText(saleDoc(s, info, fmt), info);
export const printReceipt = (s, info, fmt) => printDoc(saleDoc(s, info, fmt), info);
export const shareReceipt = (s, info, fmt) => shareDoc(saleDoc(s, info, fmt), info, s.client?.phone);
