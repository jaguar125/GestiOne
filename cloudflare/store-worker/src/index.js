// GestiOne — serveur de synchronisation sur Cloudflare Workers.
//
// Remplace la fonction Supabase « store » (mêmes actions, mêmes réponses) :
// la base de données reste chez Supabase, seuls les APPELS passent par
// Cloudflare (10 millions d'appels inclus pour 5 $/mois, au lieu de 500 000
// en gratuit chez Supabase).
//
// En plus : synchronisation EN DIRECT. Chaque entreprise a son « relais »
// (Durable Object ShopHub). Les téléphones y restent connectés ; dès qu'un
// téléphone enregistre une donnée, le relais prévient les autres, qui ne
// relisent QUE ce qui a changé. Plus besoin d'interroger le serveur toutes
// les 25 secondes.
//
// Aucune dépendance : fonctionne tel quel (copier-coller dans le tableau de
// bord Cloudflare, ou « npx wrangler deploy »).
//
// Variables à définir dans Cloudflare :
//   SUPABASE_URL               (variable)  https://<projet>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  (secret)    clé « service_role » (ou « secret ») du projet
// Liaison Durable Object : SHOP_HUB -> classe ShopHub

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const ALLOWED_KEYS = new Set([
  "shopMeta", "vendors", "products", "sales", "categories",
  "suppliers", "expenses", "movements", "inventories", "clients", "shopLicense", "orders", "supplierProducts", "avoirs", "cashRegisterEntries",
  "versements", "auditLog", "snackLots", "heldSales",
  "hotelRooms", "hotelTariffs", "hotelStays", "hotelReservations", "hotelGuests",
  "cyberServices", "cyberSales", "cyberClients", "cyberStock", "cyberMoves", "cyberEvents", "cyberCloses",
  "barProducts", "barSales", "barSessions", "barMoves", "barLosses", "barAssigns", "barControls", "barInventories", "barSuppliers", "barOrders", "barExpenses", "barAttendance", "barAudit", "barNotifs", "barSettings",
  "aluClients", "aluCategories", "aluServices", "aluPhotos", "aluPrices", "aluQuotes", "aluAudit", "aluSettings", "aluMaterials", "aluOrders", "aluProjects", "aluWorkers",
]);

const MERGE_KEYS = new Set([
  "sales", "avoirs", "movements", "clients", "expenses", "suppliers", "orders",
  "supplierProducts", "inventories", "snackLots", "products", "categories", "heldSales",
  "hotelRooms", "hotelTariffs", "hotelStays", "hotelReservations", "hotelGuests",
  "cyberServices", "cyberSales", "cyberClients", "cyberStock", "cyberMoves", "cyberEvents", "cyberCloses",
  "barProducts", "barSales", "barSessions", "barMoves", "barLosses", "barAssigns", "barControls", "barInventories", "barSuppliers", "barOrders", "barExpenses", "barAttendance", "barAudit", "barNotifs",
  "aluClients", "aluCategories", "aluServices", "aluPhotos", "aluPrices", "aluQuotes", "aluAudit", "aluMaterials", "aluOrders", "aluProjects", "aluWorkers",
]);
const TOMB_FILTER_KEYS = new Set(["versements", "cashRegisterEntries"]);
const BACKUP_ACTIONS = new Set(["list_backups", "get_backup", "backup_now"]);

const SLIM_KEYS = new Set(["sales", "avoirs", "orders"]);
const HEAVY_FIELDS = ["image", "images", "description"];
function slimProduct(p) {
  if (!p || typeof p !== "object" || Array.isArray(p)) return p;
  if (!HEAVY_FIELDS.some((f) => f in p)) return p;
  const c = { ...p };
  for (const f of HEAVY_FIELDS) delete c[f];
  return c;
}
function slimLines(lines) {
  if (!Array.isArray(lines)) return lines;
  return lines.map((it) => (it && typeof it === "object" && "product" in it ? { ...it, product: slimProduct(it.product) } : it));
}
function slimList(key, value) {
  if (!SLIM_KEYS.has(key) || !Array.isArray(value)) return value;
  return value.map((row) => {
    if (!row || typeof row !== "object") return row;
    const r = { ...row };
    for (const f of ["items", "products", "lines"]) if (Array.isArray(r[f])) r[f] = slimLines(r[f]);
    return r;
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

/* ---------- Accès à la base Supabase (API REST, sans bibliothèque) ---------- */

function makeDb(env) {
  const base = String(env.SUPABASE_URL || "").trim().replace(/\/+$/, "") + "/rest/v1";
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const headers = { apikey: key, "Content-Type": "application/json" };
  // Les anciennes clés service_role sont des JWT ; les nouvelles « sb_secret_… » non.
  if (key.split(".").length === 3) headers.Authorization = `Bearer ${key}`;
  const q = (v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

  async function call(path, { method = "GET", body, prefer } = {}) {
    let res;
    try {
      res = await fetch(`${base}/${path}`, {
        method,
        headers: prefer ? { ...headers, Prefer: prefer } : headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      return { data: null, error: { message: String(e && e.message || e) } };
    }
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!res.ok) return { data: null, error: { status: res.status, message: (data && data.message) || text || `HTTP ${res.status}` } };
    return { data, error: null };
  }

  // Petit constructeur de requêtes : select / filtres eq & in / order / limit.
  function from(table) {
    const filters = [];
    let sel = "*"; let order = ""; let limit = "";
    const api = {
      select(cols) { sel = cols; return api; },
      eq(col, v) { filters.push(`${col}=eq.${encodeURIComponent(String(v))}`); return api; },
      in(col, list) { filters.push(`${col}=in.(${encodeURIComponent(list.map(q).join(","))})`); return api; },
      order(col, asc) { order = `order=${col}.${asc ? "asc" : "desc"}`; return api; },
      limit(n) { limit = `limit=${n}`; return api; },
      qs(extra = []) { return [...filters, ...extra].filter(Boolean).join("&"); },
      async many() {
        return call(`${table}?${api.qs([`select=${encodeURIComponent(sel)}`, order, limit])}`);
      },
      async one() {
        const r = await call(`${table}?${api.qs([`select=${encodeURIComponent(sel)}`, order, "limit=1"])}`);
        if (r.error) return r;
        return { data: Array.isArray(r.data) && r.data.length ? r.data[0] : null, error: null };
      },
      async del() { return call(`${table}?${api.qs()}`, { method: "DELETE", prefer: "return=minimal" }); },
    };
    return api;
  }
  async function upsert(table, row) {
    return call(table, { method: "POST", body: row, prefer: "resolution=merge-duplicates,return=minimal" });
  }
  async function rpc(name, args) {
    return call(`rpc/${name}`, { method: "POST", body: args });
  }
  return { from, upsert, rpc };
}

/* ---------- Limitation de débit (par adresse IP, par instance) ---------- */

const attempts = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    if (attempts.size > 5000) for (const [k, v] of attempts) if (now > v.resetAt) attempts.delete(k);
    return false;
  }
  e.count += 1;
  return e.count > 600;
}

/* ---------- Vérification de l'appareil ---------- */
// Le mot de passe de l'appareil est vérifié PAR LA BASE (pgcrypto), pas ici :
// le calcul bcrypt est trop lourd pour la limite de temps processeur d'un
// Worker. Une vérification réussie est gardée 2 minutes en mémoire.

const authCache = new Map();
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyDevice(db, deviceId, deviceSecret, shopId, appV) {
  if (!deviceId || !deviceSecret) return { error: "Appareil non reconnu", status: 401 };
  const app = appV == null ? "" : String(appV).slice(0, 20);
  const ck = await sha256(`${deviceId}|${shopId || ""}|${deviceSecret}|${app}`);
  const hit = authCache.get(ck);
  if (hit && hit.exp > Date.now()) return hit.auth;
  // v2 enregistre aussi la version de l'application du téléphone.
  let { data, error } = await db.rpc("verify_device_secret_v2", { p_device: deviceId, p_secret: deviceSecret, p_shop: shopId || null, p_app: app || null });
  if (error && error.status === 404) ({ data, error } = await db.rpc("verify_device_secret", { p_device: deviceId, p_secret: deviceSecret, p_shop: shopId || null }));
  if (error) return { error: "Erreur serveur", status: 500 };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.status === "unknown") return { error: "Appareil non reconnu", status: 401 };
  if (row.status === "multi") return { error: "Boutique non précisée (shop_id requis)", status: 400 };
  const auth = { shopId: String(row.shop_id), role: String(row.role || "admin"), vendorId: row.vendor_id ? String(row.vendor_id) : null };
  authCache.set(ck, { auth, exp: Date.now() + 120_000 });
  if (authCache.size > 20000) authCache.clear();
  return auth;
}

/* ---------- Aluminium : droits appliqués par le serveur ---------- */

const ALU_PERMS = {
  devis_creer: ["administrateur", "responsable", "commercial"],
  devis_modifier: ["administrateur", "responsable", "commercial"],
  clients: ["administrateur", "responsable", "commercial"],
  catalogue: ["administrateur", "responsable", "commercial", "technicien"],
  tarifs: ["administrateur", "responsable", "commercial"],
  documents: ["administrateur", "responsable", "commercial", "technicien", "comptable", "consultation"],
  employes: ["administrateur"],
  restaurer: ["administrateur"],
  parametres: ["administrateur"],
  materiel: ["administrateur", "responsable"],
  achats: ["administrateur", "responsable"],
  chantiers: ["administrateur", "responsable", "comptable"],
  ouvriers: ["administrateur"],
};
const ALU_KEY_PERMS = {
  aluSettings: ["parametres"], aluPrices: ["tarifs"], aluServices: ["catalogue"], aluCategories: ["catalogue"], aluPhotos: ["catalogue"],
  aluClients: ["clients", "devis_creer"], aluQuotes: ["devis_creer", "devis_modifier"],
  aluMaterials: ["materiel"], aluOrders: ["achats"], aluProjects: ["chantiers"], aluWorkers: ["ouvriers"],
};
async function readStore(db, shopId, key) {
  const { data } = await db.from("shop_store").select("value").eq("shop_id", shopId).eq("key", key).one();
  return data ? data.value : null;
}
async function aluWho(db, shopId, auth) {
  const st = await readStore(db, shopId, "aluSettings");
  const perms = (Array.isArray(st) && st[0] && typeof st[0] === "object" ? st[0].perms : null) || {};
  if (auth.role !== "vendeur") return { admin: true, role: "administrateur", blocked: false, perms };
  const vendors = await readStore(db, shopId, "vendors");
  const v = Array.isArray(vendors) ? vendors.find((x) => String(x.id) === auth.vendorId) : null;
  return { admin: false, role: v && typeof v.aluRole === "string" ? v.aluRole : "commercial", blocked: !v || !!v.blocked, perms };
}
function aluCan(w, perm) {
  if (w.admin) return true;
  if (w.blocked) return false;
  const o = w.perms[w.role];
  if (o && typeof o[perm] === "boolean") return o[perm];
  return (ALU_PERMS[perm] || []).includes(w.role);
}
function onlyDocsChanged(incoming, current) {
  const cur = new Map((current || []).map((x) => [String(x && x.id), x]));
  const strip = (o) => { const { docs: _d, updatedAt: _u, ...rest } = o; return JSON.stringify(rest); };
  return incoming.every((i) => { const c = cur.get(String(i && i.id)); return !!c && strip(i) === strip(c); });
}
function quoteYear(q) { const t = Number(q.finalAt || q.createdAt || Date.now()); return new Date(t).getUTCFullYear(); }
async function numberQuotes(db, shopId, merged) {
  const list = merged;
  const todo = list.filter((q) => q && !q.num && q.status && q.status !== "brouillon" && !q.deleted)
    .sort((a, b) => Number(a.finalAt || a.createdAt || 0) - Number(b.finalAt || b.createdAt || 0));
  if (!todo.length) return merged;
  const maxBy = {};
  list.forEach((q) => { const m = /^DV-(\d{4})-(\d+)$/.exec(String((q && q.num) || "")); if (m) { const y = Number(m[1]); maxBy[y] = Math.max(maxBy[y] || 0, Number(m[2])); } });
  const updated = todo.map((q) => { const y = quoteYear(q); maxBy[y] = (maxBy[y] || 0) + 1; return { ...q, num: `DV-${y}-${String(maxBy[y]).padStart(4, "0")}`, numAt: new Date().toISOString(), pendingNum: false }; });
  const { data, error } = await db.rpc("merge_store_list", { p_shop: shopId, p_key: "aluQuotes", p_value: updated, p_deleted: [] });
  return error || !Array.isArray(data) ? merged : data;
}

/* ---------- Bar Manager : table bar_store ---------- */

const isBarKey = (k) => /^bar[A-Z]/.test(k);
let barReady = null; let barCheckedAt = 0;
async function barStoreReady(db) {
  if (barReady === true) return true;
  if (barReady === false && Date.now() - barCheckedAt < 60_000) return false;
  const { error } = await db.from("bar_store").select("key").limit(1).many();
  barReady = !error; barCheckedAt = Date.now();
  return barReady;
}
async function barGet(db, shopId, key) {
  const { data, error } = await db.from("bar_store").select("value").eq("shop_id", shopId).eq("key", key).one();
  if (error) return { error };
  if (data) return { value: data.value };
  const { data: old } = await db.from("shop_store").select("value").eq("shop_id", shopId).eq("key", key).one();
  return { value: old ? old.value : null };
}

/* ---------- Synchronisation en direct : prévenir les autres téléphones ---------- */

function notifyShop(env, ctx, shopId, keys, fromDevice) {
  if (!env.SHOP_HUB || !shopId || !keys.length) return;
  const stub = env.SHOP_HUB.get(env.SHOP_HUB.idFromName(String(shopId)));
  const p = stub.fetch("https://hub/notify", { method: "POST", body: JSON.stringify({ keys, from: fromDevice || "" }) }).catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

/* ---------- Action « store » (identique à la fonction Supabase) ---------- */

async function handleStore(req, env, ctx) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) return json({ error: "Trop de requêtes, ralentissez." }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Requête invalide" }, 400);
  const db = makeDb(env);
  const { device_id, device_secret, shop_id, action, key, value: rawValue, backup_id, deleted_ids } = body;

  if (action && BACKUP_ACTIONS.has(action)) {
    const auth = await verifyDevice(db, device_id, device_secret, shop_id, body.app_v);
    if (auth.error) return json({ error: auth.error }, auth.status);
    const shopId = auth.shopId;
    if (action === "backup_now") {
      const { error } = await db.rpc("snapshot_shop", { p_shop_id: shopId });
      if (error) return json({ error: "Sauvegarde impossible" }, 500);
    }
    if (action === "list_backups" || action === "backup_now") {
      const { data, error } = await db.from("shop_backups").select("id,day,created_at,size_bytes,summary").eq("shop_id", shopId).order("day", false).limit(31).many();
      if (error) return json({ error: "Erreur serveur" }, 500);
      return json({ backups: data || [] });
    }
    const { data, error } = await db.from("shop_backups").select("id,day,created_at,data").eq("shop_id", shopId).eq("id", Number(backup_id) || 0).one();
    if (error) return json({ error: "Erreur serveur" }, 500);
    if (!data) return json({ error: "Sauvegarde introuvable" }, 404);
    return json({ backup: data });
  }

  if (action === "alu_photo_put" || action === "alu_photo_get" || action === "alu_photo_del") {
    const auth = await verifyDevice(db, device_id, device_secret, shop_id, body.app_v);
    if (auth.error) return json({ error: auth.error }, auth.status);
    const shopId = auth.shopId;
    if (action === "alu_photo_get") {
      const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string" && /^[\w-]{3,64}$/.test(x)).slice(0, 12) : [];
      if (!ids.length) return json({ photos: [] });
      const { data, error } = await db.from("shop_store").select("key,value").eq("shop_id", shopId).in("key", ids.map((i) => `aluPhoto:${i}`)).many();
      if (error) return json({ error: "Erreur serveur" }, 500);
      return json({ photos: (data || []).map((r) => ({ id: String(r.key).slice(9), data: r.value })) });
    }
    const who = await aluWho(db, shopId, auth);
    if (!aluCan(who, "catalogue")) return json({ error: "Droits insuffisants : photos du catalogue" }, 403);
    const id = String(body.id ?? "");
    if (!/^[\w-]{3,64}$/.test(id)) return json({ error: "Photo invalide" }, 400);
    if (action === "alu_photo_del") { await db.from("shop_store").eq("shop_id", shopId).eq("key", `aluPhoto:${id}`).del(); return json({ ok: true }); }
    const img = String(body.data ?? "");
    if (!img.startsWith("data:image/")) return json({ error: "Photo invalide" }, 400);
    if (img.length > 900_000) return json({ error: "Photo trop lourde" }, 413);
    const { error } = await db.upsert("shop_store", { shop_id: shopId, key: `aluPhoto:${id}`, value: img, updated_at: new Date().toISOString() });
    if (error) return json({ error: "Enregistrement impossible" }, 500);
    return json({ ok: true });
  }

  if (action === "get_many") {
    const auth = await verifyDevice(db, device_id, device_secret, shop_id, body.app_v);
    if (auth.error) return json({ error: auth.error }, auth.status);
    const shopId = auth.shopId;
    const keys = Array.isArray(body.keys) ? [...new Set(body.keys.filter((k) => typeof k === "string" && ALLOWED_KEYS.has(k)))].slice(0, 120) : [];
    const since = body.since && typeof body.since === "object" ? body.since : {};
    if (!keys.length) return json({ values: {}, stamps: {}, unchanged: [] });
    const rows = new Map();
    const shopKeys = keys.filter((k) => !isBarKey(k));
    const barKeys = keys.filter((k) => isBarKey(k));
    // 1) Dates de mise à jour seulement (léger) ; 2) valeurs des seules clés modifiées.
    const loadChanged = async (table, list) => {
      if (!list.some((k) => since[k])) {
        const { data, error } = await db.from(table).select("key,value,updated_at").eq("shop_id", shopId).in("key", list).many();
        if (error) return error;
        (data || []).forEach((r) => rows.set(String(r.key), { value: r.value, updated_at: String(r.updated_at) }));
        return null;
      }
      const { data: st, error } = await db.from(table).select("key,updated_at").eq("shop_id", shopId).in("key", list).many();
      if (error) return error;
      const changed = [];
      (st || []).forEach((r) => {
        const k = String(r.key); const u = String(r.updated_at);
        if (since[k] === u) rows.set(k, { updated_at: u, unchanged: true });
        else changed.push(k);
      });
      if (changed.length) {
        const { data, error: e2 } = await db.from(table).select("key,value,updated_at").eq("shop_id", shopId).in("key", changed).many();
        if (e2) return e2;
        (data || []).forEach((r) => rows.set(String(r.key), { value: r.value, updated_at: String(r.updated_at) }));
      }
      return null;
    };
    if (shopKeys.length) { const e = await loadChanged("shop_store", shopKeys); if (e) return json({ error: "Erreur serveur" }, 500); }
    if (barKeys.length) {
      const ready = await barStoreReady(db);
      const e = await loadChanged(ready ? "bar_store" : "shop_store", barKeys);
      if (e) return json({ error: "Erreur serveur" }, 500);
      if (ready) {
        const missing = barKeys.filter((k) => !rows.has(k));
        if (missing.length) { const e3 = await loadChanged("shop_store", missing); if (e3) return json({ error: "Erreur serveur" }, 500); }
      }
    }
    const values = {}; const stamps = {}; const unchanged = [];
    keys.forEach((k) => {
      const r = rows.get(k);
      const st = r ? r.updated_at : "";
      stamps[k] = st;
      if (r && r.unchanged) { unchanged.push(k); return; }
      values[k] = r ? slimList(k, r.value) : null;
    });
    return json({ values, stamps, unchanged });
  }

  if (!key || !ALLOWED_KEYS.has(key)) return json({ error: "Clé invalide" }, 400);
  if (action !== "get" && action !== "set") return json({ error: "Action invalide" }, 400);

  const auth = await verifyDevice(db, device_id, device_secret, shop_id, body.app_v);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const shopId = auth.shopId;
  const done = (payload) => { notifyShop(env, ctx, shopId, [key], device_id); return json(payload); };

  if (action === "set" && key.startsWith("alu") && key !== "aluAudit") {
    const who = await aluWho(db, shopId, auth);
    const needed = ALU_KEY_PERMS[key] || [];
    if (!needed.some((p) => aluCan(who, p))) {
      const docsOnly = key === "aluQuotes" && aluCan(who, "documents") && Array.isArray(rawValue) && onlyDocsChanged(rawValue, (await readStore(db, shopId, "aluQuotes")) || []);
      if (!docsOnly) return json({ error: "Droits insuffisants pour modifier ces données" }, 403);
    }
  }
  let aluValue;
  if (action === "set" && key === "aluQuotes" && Array.isArray(rawValue)) {
    const cur = await readStore(db, shopId, "aluQuotes");
    const nums = new Map((Array.isArray(cur) ? cur : []).filter((q) => q && q.num).map((q) => [String(q.id), q]));
    aluValue = rawValue.map((q) => { const c = q && !q.num ? nums.get(String(q.id)) : null; return c ? { ...q, num: c.num, numAt: c.numAt, pendingNum: false } : q; });
  }
  const barSide = isBarKey(key) && await barStoreReady(db);

  if (action === "get" && barSide) {
    const r = await barGet(db, shopId, key);
    if (r.error) return json({ error: "Erreur serveur" }, 500);
    return json({ value: r.value ?? null });
  }
  const hasIds = (v) => Array.isArray(v) && v.every((x) => x && typeof x === "object" && x.id != null && x.id !== "");

  if (action === "set" && barSide) {
    const v = rawValue;
    if (MERGE_KEYS.has(key) && Array.isArray(deleted_ids) && hasIds(v)) {
      const del = deleted_ids.filter((x) => typeof x === "string" && x).slice(0, 5000);
      const { data: merged, error } = await db.rpc("merge_bar_list", { p_shop: shopId, p_key: key, p_value: v, p_deleted: del });
      if (error) return json({ error: "Erreur lors de l'enregistrement" }, 500);
      return done({ ok: true, merged: true, value: merged });
    }
    const { error } = await db.upsert("bar_store", { shop_id: shopId, key, value: v, updated_at: new Date().toISOString() });
    if (error) return json({ error: "Erreur lors de l'enregistrement" }, 500);
    return done({ ok: true });
  }

  if (action === "get") {
    const { data, error } = await db.from("shop_store").select("value").eq("shop_id", shopId).eq("key", key).one();
    if (error) return json({ error: "Erreur serveur" }, 500);
    return json({ value: slimList(key, data ? data.value : null) });
  }

  if (key === "auditLog" && Array.isArray(rawValue)) {
    const clean = rawValue.filter((x) => x && typeof x === "object" && x.id != null && x.id !== "");
    const { data: merged, error } = await db.rpc("merge_store_list", { p_shop: shopId, p_key: key, p_value: clean, p_deleted: [] });
    if (error) return json({ error: "Erreur lors de l'enregistrement" }, 500);
    return done({ ok: true, merged: true, value: merged });
  }

  const value = slimList(key, aluValue !== undefined ? aluValue : rawValue);

  if (MERGE_KEYS.has(key) && Array.isArray(deleted_ids) && hasIds(value)) {
    const del = key === "aluAudit" ? [] : deleted_ids.filter((x) => typeof x === "string" && x).slice(0, 5000);
    const { data: merged, error } = key === "products"
      ? await db.rpc("merge_products_3way_v2", { p_shop: shopId, p_value: value, p_deleted: del, p_device: String(device_id ?? "") || null })
      : await db.rpc("merge_store_list", { p_shop: shopId, p_key: key, p_value: value, p_deleted: del });
    if (error) return json({ error: "Erreur lors de l'enregistrement" }, 500);
    const finalMerged = key === "aluQuotes" && Array.isArray(merged) ? await numberQuotes(db, shopId, merged) : merged;
    return done({ ok: true, merged: true, value: slimList(key, finalMerged) });
  }

  let finalValue = value;
  if (TOMB_FILTER_KEYS.has(key) && Array.isArray(value)) {
    const tomb = await readStore(db, shopId, `tomb:${key}`);
    const dead = new Set(Array.isArray(tomb) ? tomb.map(String) : []);
    if (dead.size) finalValue = value.filter((x) => !(x && typeof x === "object" && dead.has(String(x.id))));
  }
  const { error } = await db.upsert("shop_store", { shop_id: shopId, key, value: finalValue, updated_at: new Date().toISOString() });
  if (error) return json({ error: "Erreur lors de l'enregistrement" }, 500);
  return done({ ok: true });
}

/* ---------- Relais d'une entreprise (Durable Object) ---------- */
// Garde les connexions WebSocket des téléphones de l'entreprise. Mode
// « hibernation » : une connexion ouverte mais silencieuse ne coûte presque
// rien. Les « ping » des téléphones reçoivent « pong » automatiquement, sans
// réveiller le relais.
//
// Protocole (texte JSON) :
//   téléphone -> relais : {"type":"auth","device_id","device_secret","shop_id"}
//   relais -> téléphone : {"type":"ready"} | {"type":"changed","keys":[...]} | {"type":"denied"}

export class ShopHub {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong")); } catch { /* ancien runtime */ }
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/notify" && req.method === "POST") {
      let b = {};
      try { b = await req.json(); } catch { /* vide */ }
      const keys = Array.isArray(b.keys) ? b.keys.filter((k) => typeof k === "string").slice(0, 50) : [];
      const msg = JSON.stringify({ type: "changed", keys });
      let sent = 0;
      for (const ws of this.ctx.getWebSockets()) {
        const a = ws.deserializeAttachment() || {};
        if (!a.ok || (b.from && a.device === b.from)) continue;
        try { ws.send(msg); sent += 1; } catch { /* fermée */ }
      }
      return json({ ok: true, sent });
    }
    if (req.headers.get("Upgrade") !== "websocket") return new Response("WebSocket attendu", { status: 426 });
    const shop = url.searchParams.get("shop") || "";
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ ok: false, shop, at: Date.now() });
    // Une connexion non identifiée sous 20 s est fermée.
    const cur = await this.ctx.storage.getAlarm();
    if (!cur) await this.ctx.storage.setAlarm(Date.now() + 20_000);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== "string") return;
    let m;
    try { m = JSON.parse(message); } catch { return; }
    if (!m || m.type !== "auth") return;
    const a = ws.deserializeAttachment() || {};
    const db = makeDb(this.env);
    const auth = await verifyDevice(db, m.device_id, m.device_secret, a.shop, m.app_v);
    if (auth.error || String(auth.shopId) !== String(a.shop)) {
      try { ws.send(JSON.stringify({ type: "denied" })); ws.close(4001, "denied"); } catch { /* déjà fermée */ }
      return;
    }
    ws.serializeAttachment({ ok: true, shop: a.shop, device: String(m.device_id), at: Date.now() });
    ws.send(JSON.stringify({ type: "ready" }));
  }

  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 ? 1000 : code, "bye"); } catch { /* déjà fermée */ }
  }
  async webSocketError(ws) {
    try { ws.close(1011, "error"); } catch { /* déjà fermée */ }
  }

  async alarm() {
    let pending = false;
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() || {};
      if (a.ok) continue;
      if (Date.now() - (a.at || 0) > 20_000) { try { ws.close(4000, "timeout"); } catch { /* déjà fermée */ } }
      else pending = true;
    }
    if (pending) await this.ctx.storage.setAlarm(Date.now() + 20_000);
  }
}

/* ---------- Point d'entrée ---------- */

let versionCache = null;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    if (url.pathname === "/health") return json({ ok: true, service: "gestione-store", live: !!env.SHOP_HUB });
    if (url.pathname === "/version") {
      try {
        if (!versionCache || versionCache.exp < Date.now()) {
          const { data } = await makeDb(env).from("app_config").select("value").eq("key", "version").one();
          versionCache = { value: (data && data.value) || {}, exp: Date.now() + 120_000 };
        }
        return new Response(JSON.stringify(versionCache.value), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=120", ...CORS_HEADERS } });
      } catch { return json({}); }
    }
    if (url.pathname === "/live") {
      const shop = url.searchParams.get("shop") || "";
      if (!/^[0-9a-f-]{36}$/i.test(shop)) return new Response("Entreprise invalide", { status: 400 });
      if (!env.SHOP_HUB) return new Response("Direct indisponible", { status: 503 });
      return env.SHOP_HUB.get(env.SHOP_HUB.idFromName(shop)).fetch(req);
    }
    if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
    if (url.pathname === "/" || url.pathname === "/store") {
      try { return await handleStore(req, env, ctx); }
      catch (e) { return json({ error: "Erreur serveur", detail: String(e && e.message || e).slice(0, 200) }, 500); }
    }
    return json({ error: "Introuvable" }, 404);
  },
};
