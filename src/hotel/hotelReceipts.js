// src/hotel/hotelReceipts.js
//
// Reçus de l'hôtel : contenu (en-tête, lignes, montants, message de
// politesse), logo (personnalisé ou par défaut), impression et partage.
//  - Application installée : ticket ESC/POS envoyé à RawBT (comme les reçus
//    de vente de GestiOne), logo imprimé en noir et blanc.
//  - Navigateur : fenêtre d'impression du téléphone/ordinateur (58 mm,
//    80 mm ou A4), qui permet aussi d'enregistrer en PDF.

import { isPrinterFeatureAvailable, printRawEscPos } from "../printer.js";
import { momoLabel } from "../MomoPicker.jsx";
import { durationLabel, hmOf, isNight, toMs } from "./hotelLogic.js";

export const KIND_TITLE = { start: "", collect: "RÈGLEMENT", resa: "RÉSERVATION" };

export function receiptTitle(r) {
  if (r.kind === "resa") return "REÇU · RÉSERVATION";
  if (r.kind === "collect") return "REÇU · RÈGLEMENT";
  return isNight(r) ? "REÇU · NUITÉE" : "REÇU · PASSAGE";
}

export function politeMessage(r, info) {
  if (info.message && info.message.trim()) return [info.message.trim()];
  if (r.kind === "resa") return ["Votre chambre vous attend !", `Merci pour votre réservation. À très bientôt à ${info.name}.`];
  if (isNight(r)) return ["Bonne nuit et bon repos !", "Merci de votre confiance. Nous serons heureux de vous accueillir à nouveau."];
  return ["Merci pour votre visite !", "Nous vous souhaitons un bon repos. Au plaisir de vous revoir très bientôt."];
}

export const PAY_TXT = { cash: "Espèces", momo: "Mobile Money", later: "À payer plus tard" };

// Informations d'en-tête (réglages › Logo et reçus).
export function receiptInfo(shop, settings) {
  const rc = settings.receipt || {};
  return {
    name: (rc.name || "").trim() || shop?.name || "Mon hôtel",
    address: (rc.address || "").trim(),
    phone: (rc.phone || "").trim(),
    message: rc.message || "",
    logo: rc.logo || null,
    paper: rc.paper || "58",
  };
}

const dateTxt = (ms) => new Date(ms).toLocaleDateString("fr-FR");
const dt = (ms) => `${new Date(ms).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · ${hmOf(ms)}`;

// Détail commun à l'écran, au papier et au partage.
export function receiptModel(r, info, fmt) {
  const night = isNight(r);
  const rows = [
    ["Reçu N°", r.no], ["Date", dateTxt(toMs(r.at))], ["Heure", hmOf(toMs(r.at))], ["Réception", r.by || "—"],
  ];
  if (r.client) rows.push(["Client", r.client]);
  const stay = [
    ["Formule", r.kind === "resa" ? `${r.tariffName} réservé${night ? "e" : ""}` : r.tariffName],
    ["Durée", durationLabel(r)],
    [r.kind === "resa" ? "Arrivée prévue" : "Arrivée", night || r.kind === "resa" ? dt(toMs(r.start)) : hmOf(toMs(r.start))],
    [night ? "Départ" : "Fin prévue", night || r.kind === "resa" ? dt(toMs(r.end)) : hmOf(toMs(r.end))],
  ];
  const lines = (r.lines || []).map((l) => [l.label, fmt(l.amount)]);
  if (r.kind === "resa" && r.amount > 0) lines.push(["Acompte versé", fmt(r.amount)]);
  const totalLbl = r.kind === "resa" ? (r.amount > 0 ? "ACOMPTE" : "TOTAL À PAYER") : "TOTAL";
  const totalVal = r.kind === "resa" && r.amount > 0 ? r.amount : r.total;
  const pay = [];
  if (r.paidBefore > 0) pay.push(["Déjà réglé", fmt(r.paidBefore)]);
  if (r.amount > 0) {
    pay.push(["Mode de paiement", r.mode === "momo" ? momoLabel(r.op) : PAY_TXT[r.mode] || r.mode]);
    pay.push(["Somme reçue", fmt(r.given || r.amount)]);
    pay.push(["Montant encaissé", fmt(r.amount)]);
    pay.push(["Monnaie rendue", fmt(r.change || 0)]);
  }
  if (r.rest > 0) pay.push([r.kind === "resa" ? "Reste à payer à l'arrivée" : "Reste à payer", fmt(r.rest)]);
  return { title: receiptTitle(r), rows, room: `CHAMBRE ${r.roomNum}`, roomType: r.type === "clim" ? "CLIMATISÉE" : "VENTILÉE", stay, lines, totalLbl, totalVal: fmt(totalVal), pay, thanks: politeMessage(r, info), cancelled: r.status === "cancelled" };
}

// ---------- Logo ----------
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Emblème par défaut (bleu nuit et or) avec le nom de l'hôtel.
export function defaultLogoSvg(name = "", mono = false) {
  const base = String(name || "HÔTEL").replace(/^h[ôo]tel\s+/i, "").toUpperCase().trim();
  // Nom long : initiales (ex. « LE GRAND CONFORT » → « LGC »).
  const short = base.length <= 11 ? base : base.split(/[\s'’-]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 5);
  const bg = mono ? "#000" : "url(#g)";
  const fg = mono ? "#fff" : "#F6D27A";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="148" height="148" viewBox="0 0 74 74"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1F3F73"/><stop offset="1" stop-color="#0E1C33"/></linearGradient></defs><circle cx="37" cy="37" r="35" fill="${bg}"/><circle cx="37" cy="37" r="30" fill="none" stroke="${mono ? "#fff" : "#E0A93B"}" stroke-width="1.5"/><path d="M24 50V27l13-7 13 7v23" fill="none" stroke="${fg}" stroke-width="2.6" stroke-linejoin="round"/><path d="M31 50v-8h12v8M30 30h3M41 30h3M30 36h3M41 36h3" stroke="${fg}" stroke-width="2.4" stroke-linecap="round"/><text x="37" y="63" text-anchor="middle" font-family="Arial, sans-serif" font-size="${short.length > 8 ? 6 : 7}" font-weight="700" fill="${fg}" letter-spacing="0.8">${esc(short)}</text></svg>`;
}
export const svgToDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
export const logoSrc = (info) => info.logo || svgToDataUrl(defaultLogoSvg(info.name));

function loadImage(src) {
  return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = src; });
}

// Photo / image de la galerie → logo réduit (≤ 240 px), léger pour la synchro.
export async function fileToLogo(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImage(url);
    const max = 240;
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.drawImage(im, 0, 0, w, h);
    let out = c.toDataURL("image/png");
    if (out.length > 90000) {
      const c2 = document.createElement("canvas"); c2.width = w; c2.height = h;
      const g2 = c2.getContext("2d"); g2.fillStyle = "#fff"; g2.fillRect(0, 0, w, h); g2.drawImage(im, 0, 0, w, h);
      out = c2.toDataURL("image/jpeg", 0.85);
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

// Logo → image noir et blanc ESC/POS (GS v 0).
async function logoRaster(info, widthDots) {
  try {
    const src = info.logo || svgToDataUrl(defaultLogoSvg(info.name, true));
    const im = await loadImage(src);
    const w = Math.min(widthDots, 192);
    const h = Math.max(1, Math.round((im.height / im.width) * w));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    const wb = Math.ceil(w / 8);
    const data = new Array(wb * h).fill(0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (lum < 150) data[y * wb + (x >> 3)] |= 0x80 >> (x & 7);
    }
    return { wb, h, data };
  } catch { return null; }
}

// ---------- Ticket ESC/POS ----------
function strip(str) {
  return String(str ?? "").replace(/[\u00A0\u202F\u2000-\u200A]/g, " ").replace(/\u00B7/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/\u00B0/g, "o").replace(/[\u00AB\u00BB]/g, '"').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
}
export async function buildHotelEscPos(r, info, fmt) {
  const width = info.paper === "80" ? 48 : 32;
  const bytes = [];
  const push = (...a) => bytes.push(...a);
  const line = (t = "") => push(...Array.from(strip(t) + "\n").map((c) => c.charCodeAt(0) & 0xff));
  const two = (l, rr) => { const a = strip(l), b = strip(rr); const sp = width - a.length - b.length; return sp >= 1 ? a + " ".repeat(sp) + b : `${a}\n${" ".repeat(Math.max(0, width - b.length))}${b}`; };
  const dash = () => line("-".repeat(width));
  const wrap = (t) => { const words = strip(t).split(/\s+/); const out = []; let cur = ""; words.forEach((w) => { if ((cur + " " + w).trim().length > width) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }); if (cur) out.push(cur); return out; };
  const m = receiptModel(r, info, fmt);
  push(0x1b, 0x40); // reset
  push(0x1b, 0x61, 0x01); // centré
  const ras = await logoRaster(info, info.paper === "80" ? 576 : 384);
  if (ras) { push(0x1d, 0x76, 0x30, 0x00, ras.wb & 0xff, (ras.wb >> 8) & 0xff, ras.h & 0xff, (ras.h >> 8) & 0xff, ...ras.data); line(""); }
  push(0x1b, 0x45, 0x01); push(0x1d, 0x21, 0x01); line(info.name.toUpperCase()); push(0x1d, 0x21, 0x00); push(0x1b, 0x45, 0x00);
  if (info.address) wrap(info.address).forEach(line);
  if (info.phone) line(`Tel. ${info.phone}`);
  line("");
  push(0x1b, 0x45, 0x01); line(m.cancelled ? `${m.title} - ANNULE` : m.title); push(0x1b, 0x45, 0x00);
  push(0x1b, 0x61, 0x00);
  dash();
  m.rows.forEach(([a, b]) => line(two(a, b)));
  dash();
  push(0x1b, 0x61, 0x01); push(0x1d, 0x21, 0x11); line(m.room); push(0x1d, 0x21, 0x00); line(m.roomType); push(0x1b, 0x61, 0x00);
  m.stay.forEach(([a, b]) => line(two(a, b)));
  dash();
  m.lines.forEach(([a, b]) => line(two(a, b)));
  line("=".repeat(width));
  push(0x1b, 0x45, 0x01); line(two(m.totalLbl, m.totalVal)); push(0x1b, 0x45, 0x00);
  line("=".repeat(width));
  m.pay.forEach(([a, b]) => line(two(a, b)));
  dash();
  push(0x1b, 0x61, 0x01);
  push(0x1b, 0x45, 0x01); wrap(m.thanks[0]).forEach(line); push(0x1b, 0x45, 0x00);
  m.thanks.slice(1).forEach((t) => wrap(t).forEach(line));
  line("Merci de conserver ce recu.");
  line(`${r.no} - GestiOne`);
  line(""); line(""); line("");
  push(0x1d, 0x56, 0x42, 0x00); // découpe
  return new Uint8Array(bytes);
}

// ---------- Ticket HTML (navigateur) ----------
export function receiptHtml(r, info, fmt) {
  const m = receiptModel(r, info, fmt);
  const w = info.paper === "80" ? "80mm" : info.paper === "a4" ? "120mm" : "58mm";
  const row = ([a, b]) => `<div class="r"><span>${esc(a)}</span><b>${esc(b)}</b></div>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${esc(r.no)}</title><style>
@page{size:${info.paper === "a4" ? "A4" : `${w} auto`};margin:${info.paper === "a4" ? "15mm" : "2mm"}}
*{box-sizing:border-box}body{margin:0;font-family:"Courier New",monospace;color:#000;font-size:11.5px}
.t{width:${w};margin:0 auto;padding:4px 2px}.c{text-align:center}.n{font-family:Arial,sans-serif;font-weight:800;font-size:16px;margin-top:6px}
.s{font-size:10.5px}.k{display:inline-block;margin-top:6px;border:1.5px solid #000;padding:2px 8px;font-family:Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:1px}
.d{border-top:1.5px dashed #000;margin:8px 0}.e{border-top:1.5px solid #000;margin:5px 0}.r{display:flex;justify-content:space-between;gap:8px}
.room{font-family:Arial,sans-serif;font-weight:800;font-size:20px}.tot{font-size:14px;font-weight:800}.x{font-family:Arial,sans-serif;font-weight:800;font-size:12.5px}
img{max-width:70px;max-height:70px}.an{color:#000;font-family:Arial,sans-serif;font-weight:800;border:2px solid #000;padding:2px 6px;display:inline-block;margin-top:6px}
</style></head><body><div class="t">
<div class="c"><img src="${esc(logoSrc(info))}" alt=""><div class="n">${esc(info.name.toUpperCase())}</div>
<div class="s">${esc(info.address)}${info.address && info.phone ? "<br>" : ""}${info.phone ? `Tél. ${esc(info.phone)}` : ""}</div>
<div class="k">${esc(m.title)}</div>${m.cancelled ? '<div><span class="an">ANNULÉ</span></div>' : ""}</div>
<div class="d"></div>${m.rows.map(row).join("")}<div class="d"></div>
<div class="c room">${esc(m.room)}</div><div class="c s"><b>${esc(m.roomType)}</b></div>${m.stay.map(row).join("")}
<div class="d"></div>${m.lines.map(row).join("")}<div class="e"></div><div class="r tot"><span>${esc(m.totalLbl)}</span><span>${esc(m.totalVal)}</span></div><div class="e"></div>
${m.pay.map(row).join("")}<div class="d"></div>
<div class="c"><div class="x">${esc(m.thanks[0])}</div>${m.thanks.slice(1).map((t) => `<div class="s">${esc(t)}</div>`).join("")}<div class="s" style="margin-top:6px">Merci de conserver ce reçu.</div><div class="s">${esc(r.no)} · GestiOne</div></div>
</div></body></html>`;
}

export function printHtml(html) {
  return new Promise((resolve) => {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(f);
    const doc = f.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { /* ignore */ } setTimeout(() => { f.remove(); resolve(); }, 1500); };
    const imgs = Array.from(doc.images || []);
    if (!imgs.length) setTimeout(go, 150);
    else Promise.all(imgs.map((im) => (im.complete ? 0 : new Promise((ok) => { im.onload = ok; im.onerror = ok; })))).then(() => setTimeout(go, 100));
  });
}

async function isNativeApp() {
  try { const { Capacitor } = await import("@capacitor/core"); return Capacitor.isNativePlatform(); } catch { return false; }
}

// Imprimante Bluetooth (RawBT) si disponible ; sinon, dans l'application,
// un vrai fichier PDF (la fenêtre d'impression n'existe pas sur Android) ;
// dans un navigateur, la fenêtre d'impression.
export async function printHotelReceipt(r, info, fmt) {
  if (isPrinterFeatureAvailable() && info.paper !== "a4") {
    const bytes = await buildHotelEscPos(r, info, fmt);
    await printRawEscPos(bytes, `recu-${r.no}.prn`);
    return "printer";
  }
  if (await isNativeApp()) {
    const { exportReceiptPdf } = await import("./hotelPdf.js");
    await exportReceiptPdf(r, info, fmt);
    return "pdf";
  }
  await printHtml(receiptHtml(r, info, fmt));
  return "browser";
}

export function receiptShareText(r, info, fmt) {
  const m = receiptModel(r, info, fmt);
  const out = [`*${info.name}*`, m.title + (m.cancelled ? " (ANNULÉ)" : ""), ""];
  m.rows.forEach(([a, b]) => out.push(`${a} : ${b}`));
  out.push("", `*${m.room}* · ${m.roomType}`);
  m.stay.forEach(([a, b]) => out.push(`${a} : ${b}`));
  out.push("");
  m.lines.forEach(([a, b]) => out.push(`${a} : ${b}`));
  out.push(`*${m.totalLbl} : ${m.totalVal}*`);
  m.pay.forEach(([a, b]) => out.push(`${a} : ${b}`));
  out.push("", ...m.thanks);
  return out.join("\n");
}

export async function shareHotelReceipt(r, info, fmt) {
  const text = receiptShareText(r, info, fmt);
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) { const { Share } = await import("@capacitor/share"); await Share.share({ title: `Reçu ${r.no}`, text }); return; }
  } catch { /* navigateur */ }
  if (navigator.share) { try { await navigator.share({ title: `Reçu ${r.no}`, text }); return; } catch { /* annulé */ } }
  const phone = String(r.phone || "").replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}
