// src/api.js
//
// Client réseau + moteur de synchronisation "hors-ligne d'abord".
// Principe : l'application écrit TOUJOURS en local en premier (jamais bloquée
// par une coupure réseau). Chaque clé modifiée est marquée "à synchroniser".
// Dès que la connexion est là, une synchronisation en arrière-plan envoie les
// changements en attente au serveur, silencieusement.

import bcrypt from "bcryptjs";

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

async function callFunction(name, body) {
  let res;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    res = await fetch(`${API_BASE}/${name}`, {
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
  if (!res.ok) throw new Error(data.error || `Erreur (${name})`);
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

/* ---------- Propriétaire (page Abonnement, inchangé) ---------- */

export async function getOwnerShops({ email, secret }) {
  return callFunction("owner-shops", { email, secret });
}

export async function ownerDeleteShop({ email, secret, shopId }) {
  return callFunction("owner-shops", { email, secret, action: "delete-shop", shop_id: shopId });
}
export async function ownerActivateShop({ email, secret, shopId, code }) {
  return callFunction("owner-shops", { email, secret, action: "activate-shop", shop_id: shopId, code });
}
export async function ownerResetAdminPin({ email, secret, shopId }) {
  return callFunction("owner-shops", { email, secret, action: "reset-admin-pin", shop_id: shopId });
}
export async function ownerResetVendorPin({ email, secret, shopId, vendorId }) {
  return callFunction("owner-shops", { email, secret, action: "reset-vendor-pin", shop_id: shopId, vendor_id: vendorId });
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
    device_id: getDeviceId(),
  });
  linkShop(data.shop_id, data.device_secret);
  return data;
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
  "avoirs", "cashRegisterEntries", "versements", "auditLog", "snackLots",
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
  "supplierProducts", "inventories", "snackLots", "products", "categories",
]);
const allHaveIds = (list) => Array.isArray(list) && list.every((x) => x && typeof x === "object" && x.id != null && x.id !== "");
const knownKey = (shopId, key) => `synced_ids:${shopId}:${key}`;
function getKnown(shopId, key) {
  try { const raw = localStorage.getItem(knownKey(shopId, key)); return raw ? new Set(JSON.parse(raw)) : null; } catch { return null; }
}
function setKnown(shopId, key, ids) {
  try { localStorage.setItem(knownKey(shopId, key), JSON.stringify([...ids])); } catch { /* quota : non bloquant */ }
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
  if (!MERGE_KEYS.has(key) || !Array.isArray(fresh)) return fresh;
  if (!Array.isArray(local) || !allHaveIds(local) || !allHaveIds(fresh)) return fresh;
  const id = resolveShop(shopId);
  if (!id) return fresh;
  const known = getKnown(id, key);
  const dirty = !!getSyncQueue(id)[key];
  const localMap = new Map(local.map((x) => [String(x.id), x]));
  const freshIds = new Set(fresh.map((x) => String(x.id)));
  const out = [];
  fresh.forEach((x) => {
    const k = String(x.id);
    // Supprimé sur cet appareil, suppression pas encore envoyée.
    if (dirty && known && known.has(k) && !localMap.has(k)) return;
    out.push(dirty && localMap.has(k) ? localMap.get(k) : x);
  });
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
    const data = await callFunction("store", { ...shopAuthFields(shopId), action: "set", key, value, deleted_ids: deleted });
    if (data && data.merged && Array.isArray(data.value)) {
      setKnown(shopId, key, new Set(data.value.map((x) => String(x.id))));
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
async function pullOne(shopId, key) {
  const data = await callFunction("store", { ...shopAuthFields(shopId), action: "get", key });
  return data.value;
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
  const keys = Object.keys(queue);
  let lastError = null;

  const results = await Promise.allSettled(
    keys.map((key) => pushOne(id, key, getLocalValue(key)).then((merged) => { notifyMerged(id, key, merged); return key; }))
  );

  let synced = 0;
  const freshQueue = getSyncQueue(id);
  results.forEach((r, i) => {
    const key = keys[i];
    if (r.status === "fulfilled") {
      delete freshQueue[key];
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
export async function syncKeyNow(key, value, shopId) {
  const id = resolveShop(shopId);
  if (!id) return false;
  try {
    const merged = await pushOne(id, key, value);
    const q = getSyncQueue(id);
    delete q[key];
    setSyncQueue(id, q);
    notifyMerged(id, key, merged);
    return true;
  } catch {
    return false;
  }
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
  for (const key of ALL_SYNC_KEYS) {
    try {
      result[key] = await pullOne(id, key);
    } catch {
      result[key] = undefined; // hors-ligne — on gardera les valeurs locales
    }
  }
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

export async function supportSend({ name, phone, email, shopName, message }) {
  return callFunction("support-client", { action: "send", device_id: getDeviceId(), name, phone, email, shop_name: shopName, message });
}
export async function supportPoll() {
  return callFunction("support-client", { action: "poll", device_id: getDeviceId() });
}
export async function supportHeartbeat({ name, phone, email, shopName } = {}) {
  return callFunction("support-client", { action: "heartbeat", device_id: getDeviceId(), name, phone, email, shop_name: shopName });
}
export async function ownerSupportList({ email, secret }) {
  return callFunction("support-owner", { action: "list", email, secret });
}
export async function ownerSupportMessages({ email, secret, deviceId }) {
  return callFunction("support-owner", { action: "messages", email, secret, device_id: deviceId });
}
export async function ownerSupportReply({ email, secret, deviceId, message }) {
  return callFunction("support-owner", { action: "reply", email, secret, device_id: deviceId, message });
}
export async function ownerSupportDelete({ email, secret, deviceId }) {
  return callFunction("support-owner", { action: "delete", email, secret, device_id: deviceId });
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
