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
  "avoirs", "cashRegisterEntries",
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

async function pushOne(shopId, key, value) {
  await callFunction("store", { ...shopAuthFields(shopId), action: "set", key, value });
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
    keys.map((key) => pushOne(id, key, getLocalValue(key)).then(() => key))
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
    await pushOne(id, key, value);
    const q = getSyncQueue(id);
    delete q[key];
    setSyncQueue(id, q);
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
