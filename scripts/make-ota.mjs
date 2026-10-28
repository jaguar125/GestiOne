// scripts/make-ota.mjs — GestiOne
//
// Mises à jour automatiques (sans recréer l'APK).
// Lancé juste après « vite build » (voir package.json → "build") :
//   1. met tout le dossier dist/ dans dist/ota/bundle-<id>.zip
//   2. écrit dist/ota/latest.json, que les téléphones consultent.
//
// <id> est le nom du fichier JavaScript principal produit par Vite
// (ex. « index-B8x2Lq.js ») : il ne change QUE si le code change. Un même
// code compilé deux fois donne donc le même <id> : pas de téléchargement
// inutile.
//
// Aucun module à installer : le zip est fabriqué avec zlib (inclus dans Node).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { deflateRawSync } from "node:zlib";

const DIST = "dist";
const OTA_DIR = join(DIST, "ota");
// Version minimale de l'application Android (versionName) capable de
// recevoir ces mises à jour. À augmenter seulement quand on ajoute un
// nouveau module natif (empreinte, imprimante…) : il faut alors un nouvel APK.
const MIN_NATIVE = process.env.OTA_MIN_NATIVE || "1.2";

// Seulement sur Vercel (ou si OTA=1) : inutile de mettre le zip dans l'APK
// quand vous compilez sur votre ordinateur.
if (!process.env.VERCEL && process.env.OTA !== "1") {
  console.log("[ota] compilation locale : pas de paquet de mise à jour (seulement sur Vercel)");
  process.exit(0);
}

if (!existsSync(join(DIST, "index.html"))) {
  console.error("[ota] dist/index.html introuvable : lancez d'abord vite build");
  process.exit(1);
}

// ---------- Identifiant du code (nom du JS principal) ----------
const html = readFileSync(join(DIST, "index.html"), "utf8");
const m = html.match(/<script[^>]+type="module"[^>]+src="[^"]*\/assets\/(index-[^"/]+\.js)"/) || html.match(/\/assets\/(index-[^"/]+\.js)/);
if (!m) { console.error("[ota] script principal introuvable dans index.html"); process.exit(1); }
const id = m[1].replace(/\.js$/, "");

// ---------- Liste des fichiers à mettre dans le zip ----------
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (relative(DIST, p) === "ota") continue; out.push(...walk(p)); }
    else if (!name.endsWith(".map")) out.push(p);
  }
  return out;
}
const files = walk(DIST);

// ---------- Fabrication du zip (format ZIP standard, compression deflate) ----------
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

const locals = [];
const centrals = [];
let offset = 0;
for (const f of files) {
  const name = Buffer.from(relative(DIST, f).split(sep).join("/"), "utf8");
  const data = readFileSync(f);
  const crc = crc32(data);
  const comp = deflateRawSync(data, { level: 9 });
  const useStore = comp.length >= data.length;
  const body = useStore ? data : comp;
  const method = useStore ? 0 : 8;
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8);
  lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  locals.push(lh, name, body);
  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10);
  ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36);
  ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
  centrals.push(ch, name);
  offset += lh.length + name.length + body.length;
}
const centralBuf = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
const zip = Buffer.concat([...locals, centralBuf, end]);

// ---------- Écriture ----------
if (existsSync(OTA_DIR)) rmSync(OTA_DIR, { recursive: true, force: true });
mkdirSync(OTA_DIR, { recursive: true });
const zipName = `bundle-${id}.zip`;
writeFileSync(join(OTA_DIR, zipName), zip);

// Nouveautés : message du dernier envoi GitHub (fourni par Vercel), sauf
// les messages automatiques (« Add files via upload »…).
const msg = String(process.env.VERCEL_GIT_COMMIT_MESSAGE || "").split("\n")[0].trim();
const generic = !msg || /^(add|update|create|delete|upload)\b.*(via upload|files?)/i.test(msg) || /^merge\b/i.test(msg);
const notes = generic ? [] : msg.split(/\s*[;•]\s*/).map((s) => s.trim()).filter(Boolean).slice(0, 6);

const latest = {
  id,
  date: new Date().toISOString(),
  url: `ota/${zipName}`,
  size: zip.length,
  minNative: MIN_NATIVE,
  notes,
};
writeFileSync(join(OTA_DIR, "latest.json"), JSON.stringify(latest, null, 2));
console.log(`[ota] ${zipName} · ${files.length} fichiers · ${(zip.length / 1024 / 1024).toFixed(2)} Mo`);
