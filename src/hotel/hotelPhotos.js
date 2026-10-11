// src/hotel/hotelPhotos.js
//
// Photos des pièces d'identité : compression, recadrage au format de la
// pièce, rangement sur le téléphone et envoi au serveur une par une
// (fonctionne hors connexion : les photos partent dès que le réseau revient).
// Conservation : 12 mois (sur le téléphone et sur le serveur).

import * as api from "../api.js";

export const KEEP_MS = 365 * 24 * 3600 * 1000;

// Formats réels des pièces (largeur / hauteur) et faces à photographier.
export const ID_DOCS = {
  cni: { id: "cni", label: "CNI", long: "Carte nationale d'identité", numLabel: "N° de la CNI", ratio: 85.6 / 54, sides: [["recto", "Recto"], ["verso", "Verso"]], format: "Format carte (85,6 × 54 mm)", accent: "#E0A93B", title: "CARTE NATIONALE D'IDENTITÉ" },
  permis: { id: "permis", label: "Permis", long: "Permis de conduire", numLabel: "N° du permis", ratio: 85.6 / 54, sides: [["recto", "Recto"], ["verso", "Verso"]], format: "Format carte (85,6 × 54 mm)", accent: "#5EEAD4", title: "PERMIS DE CONDUIRE" },
  passeport: { id: "passeport", label: "Passeport", long: "Passeport", numLabel: "N° du passeport", ratio: 125 / 88, sides: [["page", "Page photo"]], format: "Format passeport (125 × 88 mm)", accent: "#93C5FD", title: "PASSEPORT · PAGE D'IDENTITÉ" },
};

const photosKey = (shopId) => `hotelPhotos:${shopId}`;
const queueKey = (shopId) => `hotelPhotoQueue:${shopId}`;

async function readMap(shopId) {
  try { const r = await window.storage.get(photosKey(shopId)); return JSON.parse(r.value) || {}; } catch { return {}; }
}
async function writeMap(shopId, map) {
  try { await window.storage.set(photosKey(shopId), JSON.stringify(map)); } catch { /* stockage plein */ }
}
function readQueue(shopId) { try { return JSON.parse(localStorage.getItem(queueKey(shopId)) || "[]"); } catch { return []; } }
function writeQueue(shopId, q) { try { localStorage.setItem(queueKey(shopId), JSON.stringify(q)); } catch { /* ignore */ } }

// Recadre une image (ou une vidéo en cours) sur un rectangle, la réduit à
// 1100 px de large au plus et la compresse en JPEG (~100-200 Ko).
export function cropToJpeg(source, sx, sy, sw, sh, maxW = 1100, quality = 0.72) {
  const scale = Math.min(1, maxW / sw);
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
  let out = c.toDataURL("image/jpeg", quality);
  if (out.length > 600000) out = c.toDataURL("image/jpeg", 0.55);
  return out;
}

// Fichier choisi dans la galerie (ou pris avec l'appareil du téléphone) :
// recadré au centre au format de la pièce.
export function fileToDocJpeg(file, ratio) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let sw = img.naturalWidth, sh = img.naturalHeight;
        if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
        const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
        resolve(cropToJpeg(img, sx, sy, sw, sh));
      } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

// Enregistre les photos d'un client sur le téléphone et les met en file
// d'envoi. Renvoie les références (sans l'image) à garder dans la fiche.
export async function savePhotos(shopId, guestId, shots) {
  const map = await readMap(shopId);
  const q = readQueue(shopId);
  const refs = [];
  const now = Date.now();
  Object.entries(shots).forEach(([side, data]) => {
    if (!data) return;
    const id = `${guestId}-${side}-${now.toString(36)}`;
    map[id] = { data, at: now, guestId, side };
    q.push(id);
    refs.push({ id, side, at: now });
  });
  await writeMap(shopId, map);
  writeQueue(shopId, [...new Set(q)]);
  flushPhotos(shopId).catch(() => {});
  return refs;
}

let flushing = false;
export async function flushPhotos(shopId) {
  if (flushing || !api.hotelShopLinked(shopId)) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  try {
    const map = await readMap(shopId);
    let q = readQueue(shopId);
    for (const id of [...q]) {
      const p = map[id];
      if (!p) { q = q.filter((x) => x !== id); continue; }
      try {
        await api.hotelPhotoPut({ id, guestId: p.guestId, side: p.side, data: p.data }, shopId);
        q = q.filter((x) => x !== id);
        writeQueue(shopId, q);
      } catch { break; }
    }
  } finally { flushing = false; }
}
export const pendingPhotoCount = (shopId) => readQueue(shopId).length;

// Lit les photos (téléphone d'abord, sinon serveur).
export async function loadPhotos(shopId, refs) {
  const map = await readMap(shopId);
  const out = {};
  const missing = [];
  (refs || []).forEach((r) => { if (map[r.id]) out[r.side] = map[r.id].data; else missing.push(r); });
  if (missing.length && api.hotelShopLinked(shopId)) {
    try {
      const got = await api.hotelPhotoGet(missing.map((r) => r.id), shopId);
      got.forEach((p) => { out[p.side] = p.data; map[p.id] = { data: p.data, at: Date.parse(p.created_at) || Date.now(), guestId: p.guest_id, side: p.side }; });
      if (got.length) await writeMap(shopId, map);
    } catch { /* hors ligne */ }
  }
  return out;
}

// Efface sur le téléphone les photos de plus de 12 mois.
export async function purgeOldPhotos(shopId, now = Date.now()) {
  const map = await readMap(shopId);
  let changed = false;
  Object.keys(map).forEach((k) => { if (now - (map[k].at || 0) > KEEP_MS) { delete map[k]; changed = true; } });
  if (changed) await writeMap(shopId, map);
}

// ---------- Fiche client : contrôles ----------
export function ageOf(birth, now = Date.now()) {
  const d = Date.parse(birth);
  if (!Number.isFinite(d)) return null;
  const b = new Date(d), n = new Date(now);
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1;
  return a;
}
export function docValidity(expiry, now = Date.now()) {
  const d = Date.parse(expiry);
  if (!Number.isFinite(d)) return null;
  const end = d + 24 * 3600 * 1000 - 1;
  if (end < now) return { expired: true, text: `Pièce expirée depuis le ${new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} : demandez une autre pièce.` };
  const months = Math.floor((end - now) / (30.44 * 24 * 3600 * 1000));
  const y = Math.floor(months / 12), m = months % 12;
  const txt = y ? `${y} an${y > 1 ? "s" : ""}${m ? ` et ${m} mois` : ""}` : m ? `${m} mois` : "moins d'un mois";
  return { expired: false, text: `Pièce valide encore ${txt}.` };
}
export function guestErrors(g, now = Date.now()) {
  const e = {};
  if (!String(g.lastName || "").trim()) e.lastName = "Nom obligatoire";
  if (!String(g.firstName || "").trim()) e.firstName = "Prénoms obligatoires";
  const age = ageOf(g.birthDate, now);
  if (age == null) e.birthDate = "Date obligatoire";
  else if (age < 0 || age > 120) e.birthDate = "Date incorrecte";
  if (!String(g.birthPlace || "").trim()) e.birthPlace = "Lieu obligatoire";
  if (String(g.phone || "").replace(/\D/g, "").length < 8) e.phone = "Numéro incomplet";
  if (!String(g.city || "").trim()) e.city = "Ville obligatoire";
  if (!String(g.district || "").trim()) e.district = "Quartier obligatoire";
  if (!String(g.docNumber || "").trim()) e.docNumber = "Numéro obligatoire";
  const v = docValidity(g.docExpiry, now);
  if (!v) e.docExpiry = "Date obligatoire";
  else if (v.expired) e.docExpiry = "Pièce expirée";
  return e;
}
export const guestFullName = (g) => [String(g?.lastName || "").toUpperCase(), g?.firstName].filter(Boolean).join(" ").trim();
export const normPhone = (p) => String(p || "").replace(/\D/g, "").replace(/^(225|00225)/, "");
