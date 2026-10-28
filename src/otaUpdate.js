// src/otaUpdate.js — GestiOne
//
// Mises à jour automatiques de l'application Android, sans recréer l'APK.
//
// Fonctionnement :
//   - à chaque envoi sur GitHub, Vercel compile l'application et prépare
//     /ota/latest.json + /ota/bundle-<id>.zip (scripts/make-ota.mjs) ;
//   - le téléphone consulte latest.json à l'ouverture, au retour dans
//     l'application et toutes les 30 minutes ;
//   - si le code a changé, il télécharge le zip en arrière-plan (module natif
//     @capgo/capacitor-updater), puis propose de redémarrer ;
//   - si la nouvelle version ne démarre pas (plantage), le téléphone revient
//     tout seul à la version précédente (otaAppReady() n'a pas été appelé).
//
// Les données (ventes, réglages, session) restent sur le téléphone : elles ne
// font pas partie de la mise à jour.

import { registerPlugin, Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";

const Updater = registerPlugin("CapacitorUpdater");
const OTA_BASE = "https://case-et-comptoir.vercel.app";
const CHECK_EVERY_MS = 30 * 60 * 1000;
const LS_AUTO = "gestione:ota:auto";
const LS_HISTORY = "gestione:ota:history";
const LS_LAST = "gestione:ota:lastCheck";

const isNative = () => { try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"; } catch { return false; } };
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };

// Identifiant du code en cours : nom du JS principal (ex. « index-B8x2Lq »).
export function currentCodeId() {
  try {
    const s = [...document.querySelectorAll("script[type=module][src]")].map((x) => x.getAttribute("src")).find((src) => /\/assets\/index-[^/]+\.js/.test(src));
    return s ? s.match(/(index-[^/]+)\.js/)[1] : null;
  } catch { return null; }
}

function cmpVersion(a, b) {
  const pa = String(a || "0").split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b || "0").split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}

// ---------- État partagé (abonnement par les écrans) ----------
let state = {
  supported: false, // module natif présent (APK récent)
  status: "idle", // idle | checking | downloading | ready | uptodate | error | needApk
  percent: 0,
  remote: null, // contenu de latest.json
  bundle: null, // version téléchargée prête { id, version }
  lastCheck: readJSON(LS_LAST, null),
  auto: readJSON(LS_AUTO, true),
  current: null, // { id, date } du code en cours
  history: readJSON(LS_HISTORY, []),
  bundles: [],
  error: null,
  sheetDismissed: false,
};
const subs = new Set();
const setState = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => { try { f(state); } catch { /* ignore */ } }); };
export const getOtaState = () => state;
export function useOta() {
  const [s, set] = useState(state);
  useEffect(() => { subs.add(set); set(state); return () => { subs.delete(set); }; }, []);
  return s;
}

// ---------- Démarrage ----------
let started = false;
let busy = false;
let lastRun = 0;

// À appeler une fois l'application affichée sans erreur : confirme que la
// version fonctionne (sinon retour automatique à la précédente).
export async function otaAppReady() {
  if (!isNative()) return;
  try { await Updater.notifyAppReady(); setState({ supported: true }); } catch { setState({ supported: false }); return; }
  // Version en cours dans l'historique.
  const id = currentCodeId();
  if (id) {
    const hist = readJSON(LS_HISTORY, []);
    const known = hist.find((h) => h.id === id);
    const pending = readJSON("gestione:ota:pendingMeta", null);
    if (!known) {
      const entry = { id, date: pending && pending.id === id ? pending.date : null, installedAt: new Date().toISOString(), notes: pending && pending.id === id ? pending.notes || [] : [] };
      const next = [entry, ...hist].slice(0, 8);
      writeJSON(LS_HISTORY, next);
      setState({ history: next, current: entry });
    } else setState({ current: known });
  }
  if (!started) {
    started = true;
    otaCheck();
    setInterval(() => { if (document.visibilityState !== "hidden") otaCheck(); }, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Date.now() - lastRun > 5 * 60 * 1000) otaCheck(); });
    try {
      Updater.addListener("download", (e) => { const p = Number(e?.percent); if (Number.isFinite(p)) setState({ percent: Math.max(0, Math.min(100, Math.round(p))) }); });
    } catch { /* ignore */ }
  }
}

async function getBuiltinVersion() {
  try { const r = await Updater.getBuiltinVersion(); return r?.version || null; } catch { return null; }
}

// Vérifie et télécharge (si « Installer automatiquement » ou si force).
export async function otaCheck({ force = false } = {}) {
  if (!isNative() || busy) return;
  if (!state.supported) { try { await Updater.notifyAppReady(); setState({ supported: true }); } catch { return; } }
  busy = true; lastRun = Date.now();
  const prevStatus = state.status;
  if (prevStatus !== "ready" && prevStatus !== "downloading") setState({ status: "checking", error: null });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${OTA_BASE}/ota/latest.json?t=${Date.now()}`, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = await res.json();
    const now = new Date().toISOString();
    writeJSON(LS_LAST, now);
    setState({ remote, lastCheck: now });
    const cur = currentCodeId();
    if (!remote?.id || remote.id === cur) { if (state.status !== "ready") setState({ status: "uptodate", percent: 0 }); return; }
    // Cette mise à jour demande un APK plus récent (nouveau module natif).
    const builtin = await getBuiltinVersion();
    if (remote.minNative && builtin && cmpVersion(builtin, remote.minNative) < 0) { setState({ status: "needApk" }); return; }
    if (state.bundle?.version === remote.id) { setState({ status: "ready" }); return; }
    // Déjà téléchargée lors d'une ouverture précédente ?
    try {
      const l = await Updater.list();
      const found = (l?.bundles || []).find((b) => b.version === remote.id && b.status !== "error");
      if (found) { setState({ status: "ready", bundle: found, percent: 100, sheetDismissed: false }); return; }
    } catch { /* ignore */ }
    if (!state.auto && !force) { setState({ status: "available" }); return; }
    setState({ status: "downloading", percent: 0 });
    const url = /^https?:/.test(remote.url) ? remote.url : `${OTA_BASE}/${String(remote.url).replace(/^\//, "")}`;
    const bundle = await Updater.download({ url, version: remote.id });
    writeJSON("gestione:ota:pendingMeta", { id: remote.id, date: remote.date, notes: remote.notes || [] });
    // Appliquée au prochain démarrage même si on ne redémarre pas tout de suite.
    try { await Updater.next({ id: bundle.id }); } catch { /* ignore */ }
    setState({ status: "ready", bundle, percent: 100, sheetDismissed: false });
  } catch (e) {
    setState({ status: prevStatus === "ready" ? "ready" : "error", error: String(e?.message || e) });
  } finally { busy = false; }
}

// Redémarre tout de suite sur la nouvelle version.
export async function otaApplyNow() {
  if (!state.bundle) return;
  try { await Updater.set({ id: state.bundle.id }); } catch (e) { setState({ error: String(e?.message || e) }); }
}
export const otaLater = () => setState({ sheetDismissed: true });
export function otaSetAuto(on) { writeJSON(LS_AUTO, !!on); setState({ auto: !!on }); if (on) otaCheck(); }

// Versions présentes sur le téléphone (pour revenir en arrière).
export async function otaListBundles() {
  if (!isNative()) return [];
  try { const l = await Updater.list(); const b = (l?.bundles || []).filter((x) => x.status === "success" || x.status === "pending"); setState({ bundles: b }); return b; } catch { return []; }
}
export async function otaUseBundle(id) { try { await Updater.set({ id }); } catch (e) { setState({ error: String(e?.message || e) }); } }
// Revenir à la version d'origine de l'APK.
export async function otaResetToBuiltin() { try { await Updater.reset(); } catch (e) { setState({ error: String(e?.message || e) }); } }
export const otaIsNative = isNative;

// Démonstration / tests visuels uniquement.
export const otaDemo = (patch) => setState(patch);
