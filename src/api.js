// src/api.js
//
// Client réseau + moteur de synchronisation "hors-ligne d'abord".
// Principe : l'application écrit TOUJOURS en local en premier (jamais bloquée
// par une coupure réseau). Chaque clé modifiée est marquée "à synchroniser".
// Dès que la connexion est là, une synchronisation en arrière-plan envoie les
// changements en attente au serveur, silencieusement.

import bcrypt from "bcryptjs";
import { WORKER_URL } from "./serverConfig.js";
import { APP_VERSION } from "./appVersion.js";

const API_BASE = "https://wcpbrejdznoiodspcedn.supabase.co/functions/v1";

/* ---------- Identifiant d'appareil ---------- */

function getDeviceId() {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
}

/* ---------- Appel réseau de base ---------- */

const REQUEST_TIMEOUT_MS = 20000;

// Synchronisation (« store ») : passe par le serveur Cloudflare quand il est
// configuré (src/serverConfig.js). S'il ne répond pas, retour automatique à
// Supabase pendant 1 minute : aucune vente ne reste bloquée.
let workerDownUntil = 0;
export function workerUrl() { return WORKER_URL; }
async function callFunction(name, body, timeoutMs = REQUEST_TIMEOUT_MS) {
  // La version de l'application accompagne chaque synchronisation : le serveur
  // sait ainsi quels téléphones doivent être mis à jour.
  if (name === "store") body = { ...body, app_v: APP_VERSION };
  if (name === "store" && WORKER_URL && Date.now() > workerDownUntil) {
    try {
      return await callUrl(`${WORKER_URL}/store`, name, body, timeoutMs);
    } catch (e) {
      if (!String(e?.message || "").startsWith("SERVER_DOWN")) throw e;
      workerDownUntil = Date.now() + 60_000;
    }
  }
  return callUrl(`${API_BASE}/${name}`, name, body, timeoutMs);
}

async function callUrl(url, name, body, timeoutMs) {
  let res;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    // Deux causes très différentes, longtemps confondues :
    //   - l'appareil n'a pas de réseau           -> OFFLINE
    //   - l'appareil est connecté mais le serveur ne répond pas
    //     (projet Supabase en pause, panne, DNS) -> SERVER_DOWN
    const detail = e?.name === "AbortError" ? "délai dépassé" : e?.message || "réseau";
    const deviceOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new Error(`${deviceOffline ? "OFFLINE" : "SERVER_DOWN"} (${detail})`);
  } finally {
    clearTimeout(timer);
  }
  // 5xx / 502 / 503 : le serveur existe mais n'est pas en état de répondre
  // (typiquement un projet en cours de redémarrage après une mise en pause).
  if (res.status >= 500) throw new Error(`SERVER_DOWN (HTTP ${res.status})`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Erreur (${name})`);
    err.status = res.status; err.data = data;
    // Fonction absente du serveur (pas encore déployée).
    err.missing = res.status === 404 && !data.error;
    throw err;
  }
  return data;
}

/* ---------- Messages d'erreur réseau ---------- */

// Renvoie un message clair si l'erreur est d'origine réseau/serveur,
// sinon null (l'appelant affiche alors son propre message métier).
export function networkErrorText(e, action) {
  const m = e?.message || "";
  if (m.startsWith("OFFLINE")) return `Connexion internet requise pour ${action}.`;
  if (m.startsWith("SERVER_DOWN")) {
    return "Serveur temporairement indisponible. Votre connexion fonctionne — réessayez dans quelques minutes.";
  }
  return null;
}

export function isNetworkError(e) {
  const m = e?.message || "";
  return m.startsWith("OFFLINE") || m.startsWith("SERVER_DOWN");
}

/* ---------- Licence (inchangé) ---------- */

export async function activateLicense({ code, shopName }) {
  return callFunction("activate", { code, device_id: getDeviceId(), shop_name: shopName });
}
export async function checkLicense() {
  return callFunction("check", { device_id: getDeviceId() });
}

/* ---------- Propriétaire (page Abonnement) ---------- */

// Mot de passe personnel de l'éditeur : gardé UNIQUEMENT en mémoire le temps
// de la visite (jamais sur le téléphone), ajouté à chaque appel propriétaire.
let ownerPassword = "";
export function setOwnerPassword(pw) { ownerPassword = pw || ""; }
export async function ownerPasswordStatus({ email, secret }) {
  return callFunction("owner-shops", { email, secret, action: "password-status" });
}
export async function ownerSetPassword({ email, secret, currentPassword, newPassword }) {
  return callFunction("owner-shops", { email, secret, action: "set-password", password: currentPassword || "", new_password: newPassword });
}

export async function getOwnerShops({ email, secret }) {
  return callFunction("owner-shops", { email, secret, password: ownerPassword });
}

export async function ownerDeleteShop({ email, secret, shopId }) {
  return callFunction("owner-shops", { email, secret, password: ownerPassword, action: "delete-shop", shop_id: shopId });
}
export async function ownerActivateShop({ email, secret, shopId, code }) {
  return callFunction("owner-shops", { email, secret, password: ownerPassword, action: "activate-shop", shop_id: shopId, code });
}
export async function ownerResetAdminPin({ email, secret, shopId }) {
  return callFunction("owner-shops", { email, secret, password: ownerPassword, action: "reset-admin-pin", shop_id: shopId });
}
export async function ownerResetVendorPin({ email, secret, shopId, vendorId }) {
  return callFunction("owner-shops", { email, secret, password: ownerPassword, action: "reset-vendor-pin", shop_id: shopId, vendor_id: vendorId });
}
// Code PIN du propriétaire de l'application (validation des jours bonus).
export async function ownerPinStatus({ email, secret }) {
  return callFunction("owner-shops", { email, secret, password: ownerPassword, action: "pin-status" });
}
export async function ownerSetPin({ email, secret, pin, newPin }) {
  return callFunction("owner-shops", { email, secret, password: ownerPassword, action: "set-pin", pin, new_pin: newPin });
}
// Jours bonus ajoutés au temps d'activation d'une entreprise (PIN exigé).
export async function ownerAddBonusDays({ email, secret, shopId, days, reason, pin }) {
  return callFunction("owner-shops", { email, secret, password: ownerPassword, action: "add-bonus-days", shop_id: shopId, days, reason, pin });
}

/* ---------- Liaison boutique <-> appareil (multi-boutique) ---------- */
//
// Un appareil peut être lié à plusieurs boutiques. On conserve donc un secret
// par boutique dans une table locale `shop_links` :
//     { "<shop_id>": "<device_secret>", ... }
// et l'identifiant de la boutique actuellement ouverte dans `active_shop_id`.
//
// L'ancien schéma (une seule boutique : `backend_shop_id` + `shop_device_secret`)
// est migré automatiquement au premier chargement, afin que les installations
// déjà en service ne perdent pas leur liaison.

const LINKS_KEY = "shop_links";
const ACTIVE_KEY = "active_shop_id";

function getShopLinks() {
  try { return JSON.parse(localStorage.getItem(LINKS_KEY) || "{}"); } catch { return {}; }
}
function setShopLinks(links) {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

function migrateLegacyLink() {
  if (localStorage.getItem("legacy_link_migrated")) return;
  const oldShopId = localStorage.getItem("backend_shop_id");
  const oldSecret = localStorage.getItem("shop_device_secret");
  if (oldShopId && oldSecret) {
    const links = getShopLinks();
    if (!links[oldShopId]) {
      links[oldShopId] = oldSecret;
      setShopLinks(links);
    }
    if (!localStorage.getItem(ACTIVE_KEY)) localStorage.setItem(ACTIVE_KEY, oldShopId);
    // L'ancienne file d'attente était globale : elle appartient à cette boutique.
    const oldQueue = localStorage.getItem("sync_queue");
    if (oldQueue && !localStorage.getItem(`sync_queue:${oldShopId}`)) {
      localStorage.setItem(`sync_queue:${oldShopId}`, oldQueue);
    }
  }
  localStorage.setItem("legacy_link_migrated", "1");
}
migrateLegacyLink();

export function setActiveShop(shopId) {
  if (shopId) localStorage.setItem(ACTIVE_KEY, shopId);
  else localStorage.removeItem(ACTIVE_KEY);
}
export function getActiveShop() {
  return localStorage.getItem(ACTIVE_KEY);
}
function resolveShop(shopId) {
  return shopId || getActiveShop();
}

function linkShop(shopId, deviceSecret) {
  const links = getShopLinks();
  links[shopId] = deviceSecret;
  setShopLinks(links);
}

// Retire la liaison locale d'une boutique (suppression côté appareil).
export function unlinkShop(shopId) {
  const links = getShopLinks();
  delete links[shopId];
  setShopLinks(links);
  localStorage.removeItem(`sync_queue:${shopId}`);
  if (getActiveShop() === shopId) localStorage.removeItem(ACTIVE_KEY);
}

export function isShopLinked(shopId) {
  const id = resolveShop(shopId);
  return !!(id && getShopLinks()[id]);
}

export function getLinkedShopIds() {
  return Object.keys(getShopLinks());
}

function shopAuthFields(shopId) {
  const id = resolveShop(shopId);
  return { device_id: getDeviceId(), device_secret: getShopLinks()[id], shop_id: id };
}

// Identifiants pour la synchronisation en direct (src/live.js).
export function liveCredentials(shopId) {
  const id = resolveShop(shopId);
  if (!id || !getShopLinks()[id]) return null;
  return { ...shopAuthFields(id), app_v: APP_VERSION };
}

// Version minimale / dernière version publiées (serveur Cloudflare).
// Renvoie null si l'information n'est pas disponible (hors ligne…).
export async function fetchVersionInfo() {
  if (!WORKER_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${WORKER_URL}/version`, { signal: controller.signal });
    if (!res.ok) return null;
    const d = await res.json();
    return d && typeof d === "object" ? d : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Crée une boutique côté serveur (device + shop_id uniquement — le contenu
// réel de la boutique, lui, est poussé ensuite via le moteur de synchro).
// N'écrase pas la boutique active : c'est à l'appelant de basculer s'il le veut.
export async function createShopBackend({ name, type, currency, adminPin, vendorName, vendorPin }) {
  const data = await callFunction("create-shop", {
    name, type, currency, device_id: getDeviceId(),
    admin_pin: adminPin, vendor_name: vendorName, vendor_pin: vendorPin,
  });
  linkShop(data.shop_id, data.device_secret);
  return data; // { shop_id, join_code, device_secret, shop_license, vendor }
}

export async function joinShopBackend({ joinCode }) {
  const data = await callFunction("join-shop", { join_code: joinCode, device_id: getDeviceId() });
  linkShop(data.shop_id, data.device_secret);
  return data; // { shop_id, device_secret }
}

export async function reconnectShopBackend({ role, shopName, adminPin, vendorPin, vendorName, joinCode }) {
  const data = await callFunction("reconnect-shop", {
    role, shop_name: shopName, admin_pin: adminPin, vendor_pin: vendorPin, vendor_name: vendorName, join_code: joinCode,
    device_id: getDeviceId(), device_model: await getDeviceModel(),
  });
  linkShop(data.shop_id, data.device_secret);
  return data;
}

// Nom lisible du téléphone (« TECNO Spark 10 ») — affiché à l'administrateur
// dans la liste des appareils autorisés et dans les alertes de sécurité.
export async function getDeviceModel() {
  try {
    if (navigator.userAgentData?.getHighEntropyValues) {
      const v = await navigator.userAgentData.getHighEntropyValues(["model"]);
      if (v.model) return String(v.model).slice(0, 60);
    }
  } catch { /* ignore */ }
  const ua = String(navigator.userAgent || "");
  const m = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build\/|\))/);
  if (m && m[1] && m[1] !== "K") return m[1].trim().slice(0, 60);
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Téléphone Android";
  return "Ordinateur";
}

// Accès vendeur sécurisés (invitations à usage unique, appareils autorisés,
// journal de sécurité). Réservé à l'administrateur ; `adminPin` n'est demandé
// qu'une fois si le serveur ne reconnaît pas encore cet appareil comme admin.
export async function vendorAccess(action, payload = {}, shopId) {
  return callFunction("vendor-access", { ...shopAuthFields(shopId), action, ...payload });
}

// Suppression définitive d'une entreprise (serveur) : le code administrateur
// est vérifié par le serveur à chaque appel.
export async function checkShopDeletePin(shopId, pin) {
  return callFunction("vendor-access", { ...shopAuthFields(shopId), action: "check_admin_pin", admin_pin: pin });
}
export async function deleteShopEverywhere(shopId, pin) {
  return callFunction("vendor-access", { ...shopAuthFields(shopId), action: "delete_shop", admin_pin: pin, confirm: "SUPPRIMER" });
}

export async function getShopInfo(shopId) {
  return callFunction("get-shop-info", { ...shopAuthFields(shopId) });
}

// Liste les boutiques auxquelles CET appareil est rattaché côté serveur.
export async function listDeviceShops() {
  return callFunction("get-shop-info", { device_id: getDeviceId(), list: true });
}

export async function startTrialBackend() {
  return callFunction("start-trial", { device_id: getDeviceId() });
}

/* ---------- Synchronisation générique (clé/valeur) ---------- */

// "avoirs" ajouté : sans cette clé ici, `pullAll` (utilisé quand un appareil
// rejoint ou se reconnecte à une boutique) ne rapatriait jamais l'historique
// des avoirs — l'envoi vers le serveur fonctionnait (markDirty/syncKeyNow ne
// dépendent pas de cette liste), mais un nouvel appareil ne le retrouvait
// jamais au premier chargement.
const ALL_SYNC_KEYS = [
  "shopMeta", "vendors", "products", "sales", "categories",
  "suppliers", "expenses", "movements", "inventories", "clients", "orders", "supplierProducts",
  "avoirs", "cashRegisterEntries", "versements", "auditLog", "snackLots", "heldSales",
  // Hôtel : chambres, forfaits, séjours, réservations
  "hotelRooms", "hotelTariffs", "hotelStays", "hotelReservations", "hotelGuests",
  // Cyber café : prestations, tickets, clients, stock, mouvements, annonces, clôtures
  "cyberServices", "cyberSales", "cyberClients", "cyberStock", "cyberMoves", "cyberEvents", "cyberCloses",  // Bar Manager : catalogue, ventes, caisses, stock, achats, charges, équipe, journal, réglages
  "barProducts", "barSales", "barSessions", "barMoves", "barLosses", "barAssigns", "barControls", "barInventories", "barSuppliers", "barOrders", "barExpenses", "barAttendance", "barAudit", "barNotifs", "barSettings",
  // Aluminium : clients, catégories, prestations, photos (fiches), tarifs, devis, journal, réglages
  "aluClients", "aluCategories", "aluServices", "aluPhotos", "aluPrices", "aluQuotes", "aluAudit", "aluSettings", "aluMaterials", "aluOrders", "aluProjects", "aluWorkers",
];

// Une file par boutique : deux boutiques peuvent avoir la clé "products"
// en attente sans que l'une écrase l'autre.
function queueKey(shopId) {
  return `sync_queue:${shopId}`;
}
function getSyncQueue(shopId) {
  try { return JSON.parse(localStorage.getItem(queueKey(shopId)) || "{}"); } catch { return {}; }
}
function setSyncQueue(shopId, q) {
  localStorage.setItem(queueKey(shopId), JSON.stringify(q));
}
export function markDirty(key, shopId) {
  const id = resolveShop(shopId);
  if (!id) return;
  const q = getSyncQueue(id);
  q[key] = true;
  setSyncQueue(id, q);
}
export function getPendingCount(shopId) {
  const id = resolveShop(shopId);
  if (!id) return 0;
  return Object.keys(getSyncQueue(id)).length;
}

/* ---------- Fusion des listes (anti-perte de ventes) ----------
   Avant, chaque envoi REMPLAÇAIT toute la liste sur le serveur, et chaque
   relecture remplaçait toute la liste locale. Une relecture partie juste
   avant une vente revenait juste après… et effaçait la vente de l'appareil,
   puis l'envoi suivant l'effaçait du serveur. Désormais :
   - le serveur FUSIONNE par id (il ne perd jamais un élément qu'il ne sait
     pas supprimé) ;
   - l'appareil envoie explicitement les ids qu'il a supprimés ;
   - à la relecture, les éléments créés sur l'appareil et pas encore
     confirmés par le serveur sont CONSERVÉS (et renvoyés). */
export const MERGE_KEYS = new Set([
  "sales", "avoirs", "movements", "clients", "expenses", "suppliers", "orders",
  "supplierProducts", "inventories", "snackLots", "products", "categories", "heldSales",
  "hotelRooms", "hotelTariffs", "hotelStays", "hotelReservations", "hotelGuests",
  "cyberServices", "cyberSales", "cyberClients", "cyberStock", "cyberMoves", "cyberEvents", "cyberCloses",
  // Bar Manager (les réglages barSettings sont remplacés en entier)
  "barProducts", "barSales", "barSessions", "barMoves", "barLosses", "barAssigns", "barControls", "barInventories", "barSuppliers", "barOrders", "barExpenses", "barAttendance", "barAudit", "barNotifs",
  // Aluminium (aluSettings est remplacé en entier)
  "aluClients", "aluCategories", "aluServices", "aluPhotos", "aluPrices", "aluQuotes", "aluAudit", "aluMaterials", "aluOrders", "aluProjects", "aluWorkers",
]);
const allHaveIds = (list) => Array.isArray(list) && list.every((x) => x && typeof x === "object" && x.id != null && x.id !== "");
const knownKey = (shopId, key) => `synced_ids:${shopId}:${key}`;
function getKnown(shopId, key) {
  try { const raw = localStorage.getItem(knownKey(shopId, key)); return raw ? new Set(JSON.parse(raw)) : null; } catch { return null; }
}
function setKnown(shopId, key, ids) {
  try { localStorage.setItem(knownKey(shopId, key), JSON.stringify([...ids])); } catch { /* quota : non bloquant */ }
}
// L'élément a-t-il été confirmé par le serveur ? (null = pas encore de
// référence sur cet appareil : on ne peut pas savoir, on ne signale rien.)
export function isServerConfirmed(key, id, shopId) {
  const sid = resolveShop(shopId);
  if (!sid || !isShopLinked(sid)) return null;
  const known = getKnown(sid, key);
  if (!known) return null;
  return known.has(String(id));
}
/* ---------- Stock : fusion « à trois » ----------
   Pour chaque produit, l'appareil retient la dernière valeur de stock dont
   le serveur a déjà tenu compte (« base »). À l'envoi, il joint cette base
   (_sb, _sbb pour les variantes) : le serveur n'applique que la DIFFÉRENCE
   faite ici (stock local − base) à son propre stock. Un téléphone resté
   hors ligne ne peut donc plus effacer une livraison, un inventaire ou une
   vente enregistrés entre-temps sur un autre appareil. */
const stockBaseKey = (shopId) => `stock_base:${shopId}`;
function getStockBase(shopId) {
  try { return JSON.parse(localStorage.getItem(stockBaseKey(shopId)) || "{}"); } catch { return {}; }
}
function setStockBase(shopId, base) {
  try { localStorage.setItem(stockBaseKey(shopId), JSON.stringify(base)); } catch { /* quota : non bloquant */ }
}
function stockOf(p) { const n = Number(p && p.stock); return Number.isFinite(n) ? n : null; }
function stockByOf(p) { const sb = p && p.boutique && p.boutique.stockBy; return sb && typeof sb === "object" && !Array.isArray(sb) ? sb : null; }
// Retient comme base les produits donnés (valeurs alignées avec le serveur).
function rememberStockBase(shopId, products, onlyIds = null) {
  if (!Array.isArray(products)) return;
  const base = getStockBase(shopId);
  products.forEach((p) => {
    if (!p || p.id == null) return;
    const k = String(p.id);
    if (onlyIds && !onlyIds.has(k)) return;
    const s = stockOf(p);
    if (s == null) return;
    base[k] = { s, ...(stockByOf(p) ? { b: { ...stockByOf(p) } } : {}) };
  });
  setStockBase(shopId, base);
}
function withStockBase(shopId, products) {
  const base = getStockBase(shopId);
  return products.map((p) => {
    const b = p && base[String(p.id)];
    if (!b || stockOf(p) == null) return p;
    return { ...p, _sb: b.s, ...(b.b && stockByOf(p) ? { _sbb: b.b } : {}) };
  });
}

let mergedListener = null;
export function onMergedValue(fn) { mergedListener = fn; return () => { if (mergedListener === fn) mergedListener = null; }; }

// Trie comme la liste locale (ancienne → récente, ou l'inverse) quand tous
// les éléments sont datés ; sinon garde l'ordre, nouveaux éléments à la fin.
function orderLike(reference, items) {
  const dated = items.length > 1 && items.every((x) => x && typeof x.date === "string" && !Number.isNaN(Date.parse(x.date)));
  if (!dated) return items;
  const ref = (reference || []).filter((x) => x && typeof x.date === "string");
  const asc = ref.length < 2 ? true : Date.parse(ref[0].date) <= Date.parse(ref[ref.length - 1].date);
  return items.map((x, i) => [x, i]).sort((a, b) => { const d = Date.parse(a[0].date) - Date.parse(b[0].date); return (asc ? d : -d) || a[1] - b[1]; }).map((p) => p[0]);
}

// Fusionne la liste locale avec celle du serveur, sans jamais perdre un
// élément créé sur cet appareil et pas encore envoyé.
export function mergeLocalWithServer(key, local, fresh, shopId) {
  if (!MERGE_KEYS.has(key) || !Array.isArray(fresh)) {
    // Clé remplacée en entier (réglages) : tant que la version de cet appareil
    // n'est pas arrivée au serveur, une relecture (plus ancienne) ne l'écrase jamais.
    const sid = resolveShop(shopId);
    if (sid && local !== undefined && (getSyncQueue(sid)[key] || isPushing(sid, key))) return local;
    return fresh;
  }
  if (!Array.isArray(local) || !allHaveIds(local) || !allHaveIds(fresh)) return fresh;
  const id = resolveShop(shopId);
  if (!id) return fresh;
  const known = getKnown(id, key);
  const dirty = !!getSyncQueue(id)[key];
  const localMap = new Map(local.map((x) => [String(x.id), x]));
  const freshIds = new Set(fresh.map((x) => String(x.id)));
  const out = [];
  const adopted = new Set();
  fresh.forEach((x) => {
    const k = String(x.id);
    // Supprimé sur cet appareil, suppression pas encore envoyée.
    if (dirty && known && known.has(k) && !localMap.has(k)) return;
    const useLocal = dirty && localMap.has(k);
    if (!useLocal) adopted.add(k);
    out.push(useLocal ? localMap.get(k) : x);
  });
  // Stock : les produits repris du serveur deviennent la nouvelle base.
  if (key === "products" && adopted.size) rememberStockBase(id, fresh, adopted);
  // Créés ici et jamais vus par le serveur : on les garde et on les renverra.
  const pending = local.filter((x) => !freshIds.has(String(x.id)) && !(known && known.has(String(x.id))));
  setKnown(id, key, freshIds);
  if (pending.length > 0) markDirty(key, id);
  if (pending.length === 0) return out;
  return orderLike(local, [...out, ...pending]);
}

async function pushOne(shopId, key, value) {
  if (MERGE_KEYS.has(key) && allHaveIds(value)) {
    const known = getKnown(shopId, key);
    const current = new Set(value.map((x) => String(x.id)));
    const deleted = known ? [...known].filter((k) => !current.has(k)) : [];
    const sent = key === "products" ? withStockBase(shopId, value) : value;
    const data = await callFunction("store", { ...shopAuthFields(shopId), action: "set", key, value: sent, deleted_ids: deleted });
    // Le serveur a absorbé la différence : la valeur envoyée devient la base.
    if (key === "products") rememberStockBase(shopId, value);
    if (data && data.merged && Array.isArray(data.value)) {
      // Les ids envoyés mais absents de la réponse ont été refusés par le
      // serveur (supprimés ailleurs) : on les garde « connus » pour que la
      // prochaine fusion les retire au lieu de les renvoyer sans fin.
      setKnown(shopId, key, new Set([...data.value.map((x) => String(x.id)), ...current]));
      return data.value;
    }
    setKnown(shopId, key, current);
    return null;
  }
  await callFunction("store", { ...shopAuthFields(shopId), action: "set", key, value });
  return null;
}
function notifyMerged(shopId, key, merged) {
  if (!merged || !mergedListener) return;
  try { mergedListener(key, merged, shopId); } catch { /* jamais bloquant */ }
}
async function pullSingle(shopId, key) {
  const data = await callFunction("store", { ...shopAuthFields(shopId), action: "get", key });
  return data.value;
}
// Lectures GROUPÉES : toutes les lectures demandées au même moment partent en
// UN SEUL appel serveur (action get_many), au lieu d'un appel par clé. Le
// serveur ne renvoie que les clés modifiées depuis la dernière lecture : les
// autres sont reprises de la copie gardée en mémoire. Divise par 20 à 40 le
// nombre d'appels (quota de l'hébergeur).
const pullBatches = new Map();
const pullCache = new Map();
let getManyUnsupported = false;
function pullOne(shopId, key) {
  if (getManyUnsupported) return pullSingle(shopId, key);
  return new Promise((resolve, reject) => {
    let b = pullBatches.get(shopId);
    if (!b) { b = new Map(); pullBatches.set(shopId, b); setTimeout(() => runPullBatch(shopId, b), 0); }
    if (!b.has(key)) b.set(key, []);
    b.get(key).push({ resolve, reject });
  });
}
async function runPullBatch(shopId, b) {
  if (pullBatches.get(shopId) === b) pullBatches.delete(shopId);
  const keys = [...b.keys()];
  const since = {};
  keys.forEach((k) => { const c = pullCache.get(`${shopId}|${k}`); if (c && c.stamp) since[k] = c.stamp; });
  try {
    const data = await callFunction("store", { ...shopAuthFields(shopId), action: "get_many", keys, since });
    if (!data || typeof data.values !== "object") throw Object.assign(new Error("Action invalide"), { status: 400 });
    const unchanged = new Set(data.unchanged || []);
    keys.forEach((k) => {
      const ck = `${shopId}|${k}`;
      let json;
      if (unchanged.has(k) && pullCache.has(ck)) json = pullCache.get(ck).json;
      else {
        const v = data.values[k] === undefined ? null : data.values[k];
        json = JSON.stringify(v);
        pullCache.set(ck, { stamp: (data.stamps && data.stamps[k]) || "", json });
      }
      const value = JSON.parse(json);
      b.get(k).forEach((r) => r.resolve(value));
    });
  } catch (e) {
    // Serveur pas encore à jour : retour aux lectures une par une.
    if (e && e.status === 400 && /Action invalide|Clé invalide/.test(e.message || "")) {
      getManyUnsupported = true;
      keys.forEach((k) => pullSingle(shopId, k).then((v) => b.get(k).forEach((r) => r.resolve(v)), (err) => b.get(k).forEach((r) => r.reject(err))));
      return;
    }
    keys.forEach((k) => b.get(k).forEach((r) => r.reject(e)));
  }
}

// Exposé pour l'auto-réparation silencieuse côté App.jsx : relit une clé
// précise depuis le serveur (ex: shopMeta, vendors) sans toucher aux autres.
export async function pullKey(key, shopId) {
  return pullOne(resolveShop(shopId), key);
}

// Tente d'envoyer toutes les clés en attente. Ne jette jamais d'erreur :
// en cas d'échec (hors-ligne), les clés restent en attente pour la prochaine
// tentative. `getLocalValue(key)` doit renvoyer la valeur locale actuelle.
//
// Envoi EN PARALLÈLE (pas séquentiel) : avant, un simple accroc réseau sur
// une seule clé arrêtait immédiatement l'envoi de TOUTES les clés suivantes
// (ex : "shopMeta" partait bien, puis "vendors" et tout le reste restaient
// bloqués) — exactement le genre de coupure qu'un réseau mobile un peu
// instable déclenche facilement, surtout juste après la création d'une
// boutique où une dizaine de clés partent d'un coup. Chaque clé a maintenant
// sa propre chance indépendante de réussir.
export async function flushSyncQueue(getLocalValue, shopId) {
  const id = resolveShop(shopId);
  if (!id || !isShopLinked(id)) return { synced: 0, remaining: 0, lastError: null };
  const queue = getSyncQueue(id);
  // Une clé déjà en cours d'envoi (enregistrement immédiat) n'est pas renvoyée en parallèle.
  const keys = Object.keys(queue).filter((k) => !isPushing(id, k));
  let lastError = null;

  const results = await Promise.allSettled(
    keys.map((key) => pushOne(id, key, getLocalValue(key)).then((merged) => { notifyMerged(id, key, merged); return key; }))
  );

  let synced = 0;
  const freshQueue = getSyncQueue(id);
  results.forEach((r, i) => {
    const key = keys[i];
    if (r.status === "fulfilled") {
      if (!isPushing(id, key)) delete freshQueue[key];
      synced += 1;
    } else {
      lastError = `${key} : ${r.reason?.message || "erreur inconnue"}`;
    }
  });
  setSyncQueue(id, freshQueue);

  return { synced, remaining: Object.keys(getSyncQueue(id)).length, lastError };
}

// Synchronise IMMÉDIATEMENT une valeur précise (passée explicitement, jamais lue
// depuis l'état React) — évite tout risque d'envoyer une version périmée à cause
// du délai de mise à jour de l'état. En cas d'échec (hors-ligne), la clé reste
// "à synchroniser" et la prochaine synchro de fond (avec l'état à jour) prendra le relais.
// Une seule requête à la fois par clé : si l'utilisateur enregistre de nouveau
// pendant un envoi, seule la DERNIÈRE version part ensuite. Une réponse lente ne
// peut donc jamais remplacer sur le serveur une version plus récente.
const pushLanes = new Map();
function isPushing(shopId, key) { const l = pushLanes.get(`${shopId}|${key}`); return !!(l && (l.busy || l.next)); }
export async function syncKeyNow(key, value, shopId) {
  const id = resolveShop(shopId);
  if (!id) return false;
  const lk = `${id}|${key}`;
  let lane = pushLanes.get(lk);
  if (!lane) { lane = { busy: false, next: null, waiters: [] }; pushLanes.set(lk, lane); }
  if (lane.busy) {
    lane.next = { value };
    return new Promise((ok) => lane.waiters.push(ok));
  }
  lane.busy = true;
  let current = { value }; let ok = false;
  while (current) {
    try {
      const merged = await pushOne(id, key, current.value);
      ok = true;
      if (!lane.next) {
        const q = getSyncQueue(id);
        delete q[key];
        setSyncQueue(id, q);
        notifyMerged(id, key, merged);
      }
    } catch {
      ok = false;
    }
    current = lane.next; lane.next = null;
  }
  lane.busy = false;
  const w = lane.waiters.splice(0); w.forEach((f) => f(ok));
  return ok;
}

export async function syncLicenseToShop(license, shopId) {
  const id = resolveShop(shopId);
  if (!isShopLinked(id)) return false;
  return syncKeyNow("shopLicense", license, id);
}

// Récupère l'intégralité des données de la boutique depuis le serveur
// (utilisé juste après avoir rejoint une boutique existante, ou pour
// resynchroniser un appareil).
export async function pullAll(shopId) {
  const id = resolveShop(shopId);
  const result = {};
  // Toutes les clés en même temps : elles partent en un seul appel groupé.
  const settled = await Promise.allSettled(ALL_SYNC_KEYS.map((key) => pullOne(id, key)));
  ALL_SYNC_KEYS.forEach((key, i) => {
    const r = settled[i];
    result[key] = r.status === "fulfilled" ? r.value : undefined; // hors-ligne — on gardera les valeurs locales
    if (key === "products" && r.status === "fulfilled" && !getSyncQueue(id)[key]) rememberStockBase(id, result[key]);
  });
  return result;
}

/* ---------- Mots de passe (hachage local, sécurité conservée) ---------- */

export function hashPin(pin) {
  return bcrypt.hashSync(pin, 8);
}
export function verifyPin(pin, hash) {
  if (!hash) return false;
  try { return bcrypt.compareSync(pin, hash); } catch { return false; }
}

/* ---------- Assistance (chat) ---------- */

// Lecture (sans effet de bord) : délai court + une nouvelle tentative automatique,
// pour absorber un démarrage à froid du serveur ou une coupure réseau brève.
async function callRead(name, body) {
  try {
    return await callFunction(name, body, 12000);
  } catch (e) {
    if (!isNetworkError(e) || (typeof navigator !== "undefined" && navigator.onLine === false)) throw e;
    await new Promise((r) => setTimeout(r, 800));
    return callFunction(name, body, 15000);
  }
}
export async function supportSend({ name, phone, email, shopName, message }) {
  return callFunction("support-client", { action: "send", device_id: getDeviceId(), name, phone, email, shop_name: shopName, message }, 30000);
}
export async function supportPoll() {
  return callRead("support-client", { action: "poll", device_id: getDeviceId() });
}
export async function supportHeartbeat({ name, phone, email, shopName } = {}) {
  return callFunction("support-client", { action: "heartbeat", device_id: getDeviceId(), name, phone, email, shop_name: shopName }, 15000);
}
export async function ownerSupportList({ email, secret }) {
  return callRead("support-owner", { action: "list", email, secret, password: ownerPassword });
}
export async function ownerSupportMessages({ email, secret, deviceId }) {
  return callRead("support-owner", { action: "messages", email, secret, password: ownerPassword, device_id: deviceId });
}
export async function ownerSupportReply({ email, secret, deviceId, message }) {
  return callFunction("support-owner", { action: "reply", email, secret, password: ownerPassword, device_id: deviceId, message }, 30000);
}
// Message groupé : nombre de destinataires possibles, puis envoi à tous les
// administrateurs (target "all"), aux connectés ("online") ou à une sélection
// ("devices" + deviceIds). Chacun le reçoit dans sa propre conversation.
export async function ownerBroadcastTargets({ email, secret }) {
  return callRead("support-owner", { action: "broadcast-targets", email, secret, password: ownerPassword });
}
export async function ownerBroadcast({ email, secret, target = "all", deviceIds = [], message }) {
  return callFunction("support-owner", { action: "broadcast", email, secret, password: ownerPassword, target, device_ids: deviceIds, message }, 45000);
}
export async function ownerSupportDelete({ email, secret, deviceId }) {
  return callFunction("support-owner", { action: "delete", email, secret, password: ownerPassword, device_id: deviceId });
}

// ---------- Sauvegardes automatiques (une par jour, 30 jours conservés) ----------
// Le serveur photographie chaque nuit à 03:00 (UTC) toutes les données de
// l'entreprise. Ces fonctions listent ces sauvegardes, en déclenchent une
// tout de suite, ou récupèrent le contenu complet d'une sauvegarde.
export async function listBackups(shopId) {
  const data = await callFunction("store", { ...shopAuthFields(resolveShop(shopId)), action: "list_backups" });
  return Array.isArray(data?.backups) ? data.backups : [];
}
export async function backupNow(shopId) {
  const data = await callFunction("store", { ...shopAuthFields(resolveShop(shopId)), action: "backup_now" });
  return Array.isArray(data?.backups) ? data.backups : [];
}
export async function getBackup(backupId, shopId) {
  const data = await callFunction("store", { ...shopAuthFields(resolveShop(shopId)), action: "get_backup", backup_id: backupId });
  return data?.backup || null;
}

// ---------- Messages de l'assistance : alertes propriétaire ----------
// Jeton propre à cet appareil, délivré après le déverrouillage de l'espace
// propriétaire. Il permet UNIQUEMENT de connaître le nombre de nouveaux
// messages (ni noms, ni contenu), pour prévenir même quand l'espace est
// verrouillé.
export async function ownerSupportIssueToken({ email, secret }) {
  return callFunction("support-owner", { action: "issue-token", email, secret, password: ownerPassword });
}
export async function ownerSupportCount({ token, since }) {
  return callRead("support-owner", { action: "count", token, since });
}

/* ---------- Hôtel : photos des pièces d'identité ----------
   Envoyées une par une (hors synchronisation générale, trop lourde). */
export async function hotelPhotoPut({ id, guestId, side, data }, shopId) {
  return callFunction("hotel-photos", { ...shopAuthFields(shopId), action: "put", id, guest_id: guestId, side, data }, 45000);
}
export async function hotelPhotoGet(ids, shopId) {
  const d = await callFunction("hotel-photos", { ...shopAuthFields(shopId), action: "get", ids }, 30000);
  return Array.isArray(d?.photos) ? d.photos : [];
}
/* ---------- Aluminium : photos des prestations ----------
   Envoyées une par une (hors synchronisation générale), lues à la demande. */
export async function aluPhotoPut(id, data, shopId) {
  return callFunction("store", { ...shopAuthFields(shopId), action: "alu_photo_put", id, data }, 45000);
}
export async function aluPhotoGet(ids, shopId) {
  const d = await callFunction("store", { ...shopAuthFields(shopId), action: "alu_photo_get", ids }, 30000);
  return Array.isArray(d?.photos) ? d.photos : [];
}
export async function aluPhotoDel(id, shopId) {
  return callFunction("store", { ...shopAuthFields(shopId), action: "alu_photo_del", id });
}
export function hotelShopLinked(shopId) {
  const id = resolveShop(shopId);
  return !!(id && isShopLinked(id));
}
