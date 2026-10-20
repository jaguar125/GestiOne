import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_KEYS = new Set([
  "shopMeta", "vendors", "products", "sales", "categories",
  "suppliers", "expenses", "movements", "inventories", "clients", "shopLicense", "orders", "supplierProducts", "avoirs", "cashRegisterEntries",
  "versements", "auditLog", "snackLots", "heldSales",
  // Hôtel
  "hotelRooms", "hotelTariffs", "hotelStays", "hotelReservations", "hotelGuests",
  // Cyber café
  "cyberServices", "cyberSales", "cyberClients", "cyberStock", "cyberMoves", "cyberEvents", "cyberCloses",
  // Bar Manager
  "barProducts", "barSales", "barSessions", "barMoves", "barLosses", "barAssigns", "barControls", "barInventories", "barSuppliers", "barOrders", "barExpenses", "barAttendance", "barAudit", "barNotifs", "barSettings",
  // Aluminium
  "aluClients", "aluCategories", "aluServices", "aluPhotos", "aluPrices", "aluQuotes", "aluAudit", "aluSettings", "aluMaterials", "aluOrders", "aluProjects", "aluWorkers",
]);

// Listes fusionnées côté serveur (par id) au lieu d'être écrasées : une vente
// faite sur un téléphone ne peut plus disparaître parce qu'un autre appareil
// a envoyé sa liste un instant plus tard.
const MERGE_KEYS = new Set([
  "sales", "avoirs", "movements", "clients", "expenses", "suppliers", "orders",
  "supplierProducts", "inventories", "snackLots", "products", "categories", "heldSales",
  "hotelRooms", "hotelTariffs", "hotelStays", "hotelReservations", "hotelGuests",
  // Cyber café
  "cyberServices", "cyberSales", "cyberClients", "cyberStock", "cyberMoves", "cyberEvents", "cyberCloses",
  // Bar Manager (barSettings est remplacé en entier)
  "barProducts", "barSales", "barSessions", "barMoves", "barLosses", "barAssigns", "barControls", "barInventories", "barSuppliers", "barOrders", "barExpenses", "barAttendance", "barAudit", "barNotifs",
  // Aluminium (aluSettings est remplacé en entier)
  "aluClients", "aluCategories", "aluServices", "aluPhotos", "aluPrices", "aluQuotes", "aluAudit", "aluMaterials", "aluOrders", "aluProjects", "aluWorkers",
]);

// Listes remplacées en entier, mais dont les lignes annulées restent annulées.
const TOMB_FILTER_KEYS = new Set(["versements", "cashRegisterEntries"]);

// Sauvegardes quotidiennes (table shop_backups, remplie chaque nuit à 03:00 UTC).
const BACKUP_ACTIONS = new Set(["list_backups", "get_backup", "backup_now"]);

// Lignes de vente / avoir / commande : la fiche produit copiée dans chaque
// ligne n'a pas besoin de sa photo (elle reste dans « products »). Sans ce
// nettoyage, chaque vente embarquait la photo en entier (plusieurs Mo par
// boutique) et la synchronisation finissait en « délai dépassé ».
const SLIM_KEYS = new Set(["sales", "avoirs", "orders"]);
const HEAVY_FIELDS = ["image", "images", "description"];
function slimProduct(p: unknown): unknown {
  if (!p || typeof p !== "object" || Array.isArray(p)) return p;
  const o = p as Record<string, unknown>;
  if (!HEAVY_FIELDS.some((f) => f in o)) return p;
  const c: Record<string, unknown> = { ...o };
  for (const f of HEAVY_FIELDS) delete c[f];
  return c;
}
function slimLines(lines: unknown): unknown {
  if (!Array.isArray(lines)) return lines;
  return lines.map((it) => {
    if (!it || typeof it !== "object") return it;
    const i = it as Record<string, unknown>;
    return "product" in i ? { ...i, product: slimProduct(i.product) } : it;
  });
}
function slimList(key: string, value: unknown): unknown {
  if (!SLIM_KEYS.has(key) || !Array.isArray(value)) return value;
  return value.map((row) => {
    if (!row || typeof row !== "object") return row;
    const r = { ...(row as Record<string, unknown>) };
    for (const f of ["items", "products", "lines"]) if (Array.isArray(r[f])) r[f] = slimLines(r[f]);
    return r;
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  // Plusieurs téléphones d'une même entreprise partagent souvent la même
  // connexion (Wi-Fi de l'hôtel) : la limite est par adresse IP.
  return entry.count > 600;
}

async function verifyDevice(
  deviceId: string,
  deviceSecret: string,
  shopId?: string,
): Promise<{ shopId: string; role: string; vendorId: string | null } | { error: string; status: number }> {
  if (!deviceId || !deviceSecret) return { error: "Appareil non reconnu", status: 401 };

  let query = supabase.from("devices_shop").select("shop_id, secret_hash, role, vendor_id").eq("device_id", deviceId);
  if (shopId) query = query.eq("shop_id", shopId);

  const { data: rows, error } = await query;
  if (error) return { error: "Erreur serveur", status: 500 };
  if (!rows || rows.length === 0) return { error: "Appareil non reconnu", status: 401 };
  if (!shopId && rows.length > 1) {
    return { error: "Boutique non précisée (shop_id requis)", status: 400 };
  }

  const row = rows[0];
  if (!bcrypt.compareSync(deviceSecret, row.secret_hash)) {
    return { error: "Appareil non reconnu", status: 401 };
  }

  supabase
    .from("devices_shop")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("device_id", deviceId)
    .eq("shop_id", row.shop_id)
    .then(() => {});

  return { shopId: row.shop_id as string, role: String(row.role ?? "admin"), vendorId: row.vendor_id ? String(row.vendor_id) : null };
}

// ---------- Aluminium : droits appliqués par le serveur ----------
// Mêmes permissions par défaut que l'application ; l'administrateur peut les
// modifier (aluSettings.perms). Un téléphone d'employé ne peut écrire une clé
// que si son rôle le permet.
const ALU_PERMS: Record<string, string[]> = {
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
const ALU_KEY_PERMS: Record<string, string[]> = {
  aluSettings: ["parametres"], aluPrices: ["tarifs"], aluServices: ["catalogue"], aluCategories: ["catalogue"], aluPhotos: ["catalogue"],
  aluClients: ["clients", "devis_creer"], aluQuotes: ["devis_creer", "devis_modifier"],
  aluMaterials: ["materiel"], aluOrders: ["achats"], aluProjects: ["chantiers"], aluWorkers: ["ouvriers"],
};
async function readStore(shopId: string, key: string): Promise<unknown> {
  const { data } = await supabase.from("shop_store").select("value").eq("shop_id", shopId).eq("key", key).maybeSingle();
  return data?.value ?? null;
}
type AluWho = { admin: boolean; role: string; blocked: boolean; perms: Record<string, Record<string, boolean>> };
async function aluWho(shopId: string, auth: { role: string; vendorId: string | null }): Promise<AluWho> {
  const st = await readStore(shopId, "aluSettings");
  const perms = (Array.isArray(st) && st[0] && typeof st[0] === "object" ? (st[0] as { perms?: Record<string, Record<string, boolean>> }).perms : null) || {};
  if (auth.role !== "vendeur") return { admin: true, role: "administrateur", blocked: false, perms };
  const vendors = await readStore(shopId, "vendors");
  const v = Array.isArray(vendors) ? (vendors as Array<Record<string, unknown>>).find((x) => String(x.id) === auth.vendorId) : null;
  return { admin: false, role: v && typeof v.aluRole === "string" ? v.aluRole : "commercial", blocked: !v || !!v.blocked, perms };
}
function aluCan(w: AluWho, perm: string): boolean {
  if (w.admin) return true;
  if (w.blocked) return false;
  const o = w.perms[w.role];
  if (o && typeof o[perm] === "boolean") return o[perm];
  return (ALU_PERMS[perm] || []).includes(w.role);
}
// Sans droit de modifier les devis, seul l'archivage des documents (docs) est accepté.
function onlyDocsChanged(incoming: unknown[], current: unknown[]): boolean {
  const cur = new Map((current || []).map((x) => [String((x as { id?: unknown }).id), x as Record<string, unknown>]));
  return incoming.every((x) => {
    const i = x as Record<string, unknown>; const c = cur.get(String(i.id)); if (!c) return false;
    const strip = (o: Record<string, unknown>) => { const { docs: _d, updatedAt: _u, ...rest } = o; return JSON.stringify(rest); };
    return strip(i) === strip(c);
  });
}
// Numéro officiel des devis : attribué par le serveur, une seule fois, jamais modifié.
function quoteYear(q: Record<string, unknown>): number { const t = Number(q.finalAt || q.createdAt || Date.now()); return new Date(t).getUTCFullYear(); }
async function numberQuotes(shopId: string, merged: unknown[]): Promise<unknown[]> {
  const list = merged as Array<Record<string, unknown>>;
  const todo = list.filter((q) => q && !q.num && q.status && q.status !== "brouillon" && !q.deleted)
    .sort((a, b) => Number(a.finalAt || a.createdAt || 0) - Number(b.finalAt || b.createdAt || 0));
  if (!todo.length) return merged;
  const maxBy: Record<number, number> = {};
  list.forEach((q) => { const m = /^DV-(\d{4})-(\d+)$/.exec(String(q.num || "")); if (m) { const y = Number(m[1]); maxBy[y] = Math.max(maxBy[y] || 0, Number(m[2])); } });
  const updated = todo.map((q) => { const y = quoteYear(q); maxBy[y] = (maxBy[y] || 0) + 1; return { ...q, num: `DV-${y}-${String(maxBy[y]).padStart(4, "0")}`, numAt: new Date().toISOString(), pendingNum: false }; });
  const { data, error } = await supabase.rpc("merge_store_list", { p_shop: shopId, p_key: "aluQuotes", p_value: updated, p_deleted: [] });
  return error || !Array.isArray(data) ? merged : (data as unknown[]);
}


// ---------- Bar Manager : espace de données dédié (tables bar_store / bar_backups) ----------
// Les clés bar* vont dans bar_store, séparé de shop_store, une partition par bar.
// Tant que la migration n'est pas appliquée (table absente), on reste sur
// shop_store pour ne jamais bloquer la synchronisation.
const isBarKey = (k: string) => /^bar[A-Z]/.test(k);
let barReady: boolean | null = null;
let barCheckedAt = 0;
async function barStoreReady(): Promise<boolean> {
  if (barReady === true) return true;
  if (barReady === false && Date.now() - barCheckedAt < 60_000) return false;
  const { error } = await supabase.from("bar_store").select("key").limit(1);
  barReady = !error; barCheckedAt = Date.now();
  return barReady;
}
async function barGet(shopId: string, key: string) {
  const { data, error } = await supabase.from("bar_store").select("value").eq("shop_id", shopId).eq("key", key).maybeSingle();
  if (error) return { error };
  if (data) return { value: data.value };
  // Première lecture : reprise d'une valeur déjà envoyée dans shop_store.
  const { data: old } = await supabase.from("shop_store").select("value").eq("shop_id", shopId).eq("key", key).maybeSingle();
  return { value: old?.value ?? null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée" }, 405);

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) return jsonResponse({ error: "Trop de requêtes, ralentissez." }, 429);

  let body: {
    device_id?: string; device_secret?: string; shop_id?: string;
    action?: string; key?: string; value?: unknown; backup_id?: number; deleted_ids?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Requête invalide" }, 400);
  }

  const { device_id, device_secret, shop_id, action, key, value: rawValue, backup_id, deleted_ids } = body;

  if (action && BACKUP_ACTIONS.has(action)) {
    const auth = await verifyDevice(device_id ?? "", device_secret ?? "", shop_id);
    if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);
    const shopId = auth.shopId;

    if (action === "backup_now") {
      const { error } = await supabase.rpc("snapshot_shop", { p_shop_id: shopId });
      if (error) return jsonResponse({ error: "Sauvegarde impossible" }, 500);
    }
    if (action === "list_backups" || action === "backup_now") {
      const { data, error } = await supabase
        .from("shop_backups")
        .select("id, day, created_at, size_bytes, summary")
        .eq("shop_id", shopId)
        .order("day", { ascending: false })
        .limit(31);
      if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
      return jsonResponse({ backups: data ?? [] });
    }
    const { data, error } = await supabase
      .from("shop_backups")
      .select("id, day, created_at, data")
      .eq("shop_id", shopId)
      .eq("id", Number(backup_id) || 0)
      .maybeSingle();
    if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
    if (!data) return jsonResponse({ error: "Sauvegarde introuvable" }, 404);
    return jsonResponse({ backup: data });
  }

  if (action === "alu_photo_put" || action === "alu_photo_get" || action === "alu_photo_del") {
    const auth = await verifyDevice(device_id ?? "", device_secret ?? "", shop_id);
    if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);
    const shopId = auth.shopId;
    const b2 = body as { id?: unknown; data?: unknown; ids?: unknown };
    if (action === "alu_photo_get") {
      const ids = Array.isArray(b2.ids) ? b2.ids.filter((x) => typeof x === "string" && /^[\w-]{3,64}$/.test(x)).slice(0, 12) : [];
      if (!ids.length) return jsonResponse({ photos: [] });
      const { data, error } = await supabase.from("shop_store").select("key, value").eq("shop_id", shopId).in("key", ids.map((i) => `aluPhoto:${i}`));
      if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
      return jsonResponse({ photos: (data ?? []).map((r) => ({ id: String(r.key).slice(9), data: r.value })) });
    }
    const who = await aluWho(shopId, auth);
    if (!aluCan(who, "catalogue")) return jsonResponse({ error: "Droits insuffisants : photos du catalogue" }, 403);
    const id = String(b2.id ?? "");
    if (!/^[\w-]{3,64}$/.test(id)) return jsonResponse({ error: "Photo invalide" }, 400);
    if (action === "alu_photo_del") { await supabase.from("shop_store").delete().eq("shop_id", shopId).eq("key", `aluPhoto:${id}`); return jsonResponse({ ok: true }); }
    const img = String(b2.data ?? "");
    if (!img.startsWith("data:image/")) return jsonResponse({ error: "Photo invalide" }, 400);
    if (img.length > 900_000) return jsonResponse({ error: "Photo trop lourde" }, 413);
    const { error } = await supabase.from("shop_store").upsert({ shop_id: shopId, key: `aluPhoto:${id}`, value: img, updated_at: new Date().toISOString() });
    if (error) return jsonResponse({ error: "Enregistrement impossible" }, 500);
    return jsonResponse({ ok: true });
  }

  // Lecture groupée : toutes les clés demandées en UN SEUL appel (au lieu d'un
  // appel par clé). `since` (clé → date de mise à jour déjà connue) permet de ne
  // renvoyer que les clés modifiées depuis la dernière lecture.
  if (action === "get_many") {
    const auth = await verifyDevice(device_id ?? "", device_secret ?? "", shop_id);
    if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);
    const shopId = auth.shopId;
    const b3 = body as { keys?: unknown; since?: unknown };
    const keys = Array.isArray(b3.keys) ? [...new Set(b3.keys.filter((k): k is string => typeof k === "string" && ALLOWED_KEYS.has(k)))].slice(0, 120) : [];
    const since = (b3.since && typeof b3.since === "object" ? b3.since : {}) as Record<string, unknown>;
    if (!keys.length) return jsonResponse({ values: {}, stamps: {}, unchanged: [] });
    const rows = new Map<string, { value: unknown; updated_at: string }>();
    const shopKeys = keys.filter((k) => !isBarKey(k));
    const barKeys = keys.filter((k) => isBarKey(k));
    if (shopKeys.length) {
      const { data, error } = await supabase.from("shop_store").select("key, value, updated_at").eq("shop_id", shopId).in("key", shopKeys);
      if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
      (data ?? []).forEach((r) => rows.set(String(r.key), { value: r.value, updated_at: String(r.updated_at) }));
    }
    if (barKeys.length) {
      const ready = await barStoreReady();
      const table = ready ? "bar_store" : "shop_store";
      const { data, error } = await supabase.from(table).select("key, value, updated_at").eq("shop_id", shopId).in("key", barKeys);
      if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
      (data ?? []).forEach((r) => rows.set(String(r.key), { value: r.value, updated_at: String(r.updated_at) }));
      if (ready) {
        const missing = barKeys.filter((k) => !rows.has(k));
        if (missing.length) {
          const { data: old } = await supabase.from("shop_store").select("key, value, updated_at").eq("shop_id", shopId).in("key", missing);
          (old ?? []).forEach((r) => rows.set(String(r.key), { value: r.value, updated_at: String(r.updated_at) }));
        }
      }
    }
    const values: Record<string, unknown> = {}; const stamps: Record<string, string> = {}; const unchanged: string[] = [];
    keys.forEach((k) => {
      const r = rows.get(k);
      const st = r ? r.updated_at : "";
      stamps[k] = st;
      if (st && since[k] === st) { unchanged.push(k); return; }
      values[k] = r ? slimList(k, r.value) : null;
    });
    return jsonResponse({ values, stamps, unchanged });
  }

  if (!key || !ALLOWED_KEYS.has(key)) return jsonResponse({ error: "Clé invalide" }, 400);
  if (action !== "get" && action !== "set") return jsonResponse({ error: "Action invalide" }, 400);

  const auth = await verifyDevice(device_id ?? "", device_secret ?? "", shop_id);
  if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);
  const shopId = auth.shopId;

  if (action === "set" && key.startsWith("alu") && key !== "aluAudit") {
    const who = await aluWho(shopId, auth);
    const needed = ALU_KEY_PERMS[key] || [];
    const ok = needed.some((p) => aluCan(who, p));
    if (!ok) {
      const docsOnly = key === "aluQuotes" && aluCan(who, "documents") && Array.isArray(rawValue) && onlyDocsChanged(rawValue as unknown[], (await readStore(shopId, "aluQuotes") as unknown[]) || []);
      if (!docsOnly) return jsonResponse({ error: "Droits insuffisants pour modifier ces données" }, 403);
    }
  }
  // Devis : un numéro officiel déjà attribué n'est jamais perdu, même si un
  // téléphone renvoie une ancienne copie du devis.
  let aluValue: unknown = undefined;
  if (action === "set" && key === "aluQuotes" && Array.isArray(rawValue)) {
    const cur = await readStore(shopId, "aluQuotes");
    const nums = new Map((Array.isArray(cur) ? cur as Array<Record<string, unknown>> : []).filter((q) => q && q.num).map((q) => [String(q.id), q]));
    aluValue = (rawValue as Array<Record<string, unknown>>).map((q) => { const c = q && !q.num ? nums.get(String(q.id)) : null; return c ? { ...q, num: c.num, numAt: c.numAt, pendingNum: false } : q; });
  }
  const barSide = isBarKey(key) && await barStoreReady();

  if (action === "get" && barSide) {
    const r = await barGet(shopId, key);
    if ("error" in r && r.error) return jsonResponse({ error: "Erreur serveur" }, 500);
    return jsonResponse({ value: (r as { value: unknown }).value ?? null });
  }

  if (action === "set" && barSide) {
    const v = rawValue;
    if (MERGE_KEYS.has(key) && Array.isArray(deleted_ids) && Array.isArray(v) &&
      v.every((x) => x && typeof x === "object" && (x as { id?: unknown }).id != null && (x as { id?: unknown }).id !== "")) {
      const del = deleted_ids.filter((x) => typeof x === "string" && x).slice(0, 5000);
      const { data: merged, error } = await supabase.rpc("merge_bar_list", { p_shop: shopId, p_key: key, p_value: v, p_deleted: del });
      if (error) return jsonResponse({ error: "Erreur lors de l'enregistrement" }, 500);
      return jsonResponse({ ok: true, merged: true, value: merged });
    }
    const { error } = await supabase.from("bar_store").upsert({ shop_id: shopId, key, value: v, updated_at: new Date().toISOString() });
    if (error) return jsonResponse({ error: "Erreur lors de l'enregistrement" }, 500);
    return jsonResponse({ ok: true });
  }

  if (action === "get") {
    const { data, error } = await supabase
      .from("shop_store")
      .select("value")
      .eq("shop_id", shopId)
      .eq("key", key)
      .maybeSingle();
    if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
    return jsonResponse({ value: slimList(key, data?.value ?? null) });
  }

  // Journal d'activité : TOUJOURS fusionné (jamais écrasé). Chaque appareil
  // (administrateur ET vendeurs) envoie sa propre liste ; avant, le dernier
  // appareil qui envoyait effaçait les lignes des autres. Aucune suppression
  // possible : le journal ne peut être ni modifié ni effacé.
  if (key === "auditLog" && Array.isArray(rawValue)) {
    const clean = rawValue.filter((x) => x && typeof x === "object" && (x as { id?: unknown }).id != null && (x as { id?: unknown }).id !== "");
    const { data: merged, error: mergeError } = await supabase.rpc("merge_store_list", {
      p_shop: shopId, p_key: key, p_value: clean, p_deleted: [],
    });
    if (mergeError) return jsonResponse({ error: "Erreur lors de l'enregistrement" }, 500);
    return jsonResponse({ ok: true, merged: true, value: merged });
  }

  const value = slimList(key, aluValue !== undefined ? aluValue : rawValue);

  if (
    // Seules les versions récentes de l'app envoient deleted_ids (même vide) :
    // les anciennes gardent l'ancien comportement pour que leurs suppressions
    // continuent de fonctionner.
    MERGE_KEYS.has(key) && Array.isArray(deleted_ids) && Array.isArray(value) &&
    value.every((x) => x && typeof x === "object" && (x as { id?: unknown }).id != null && (x as { id?: unknown }).id !== "")
  ) {
    const del = key === "aluAudit" ? [] : Array.isArray(deleted_ids) ? deleted_ids.filter((x) => typeof x === "string" && x).slice(0, 5000) : [];
    // Produits : fusion « à trois » du stock (seule la différence faite sur
    // l'appareil depuis sa dernière synchro est appliquée au stock serveur).
    // v2 : l'identifiant du téléphone permet de reconnaître un envoi répété
    // (envois parallèles, nouvel essai après délai dépassé) et de ne pas
    // appliquer deux fois la même différence de stock.
    const { data: merged, error: mergeError } = key === "products"
      ? await supabase.rpc("merge_products_3way_v2", { p_shop: shopId, p_value: value, p_deleted: del, p_device: String(device_id ?? "") || null })
      : await supabase.rpc("merge_store_list", { p_shop: shopId, p_key: key, p_value: value, p_deleted: del });
    if (mergeError) return jsonResponse({ error: "Erreur lors de l'enregistrement" }, 500);
    const finalMerged = key === "aluQuotes" && Array.isArray(merged) ? await numberQuotes(shopId, merged as unknown[]) : merged;
    return jsonResponse({ ok: true, merged: true, value: slimList(key, finalMerged) });
  }

  // Versements et ouvertures de caisse : la liste envoyée remplace celle du
  // serveur. Une ligne annulée (inscrite dans « tomb:<clé> ») est retirée de
  // l'envoi, pour qu'un téléphone qui l'a encore en mémoire ne la recrée pas.
  let finalValue = value;
  if (TOMB_FILTER_KEYS.has(key) && Array.isArray(value)) {
    const { data: tomb } = await supabase.from("shop_store").select("value")
      .eq("shop_id", shopId).eq("key", `tomb:${key}`).maybeSingle();
    const dead = new Set(Array.isArray(tomb?.value) ? (tomb!.value as unknown[]).map(String) : []);
    if (dead.size) finalValue = value.filter((x) => !(x && typeof x === "object" && dead.has(String((x as { id?: unknown }).id))));
  }

  const { error: upsertError } = await supabase
    .from("shop_store")
    .upsert({ shop_id: shopId, key, value: finalValue, updated_at: new Date().toISOString() });
  if (upsertError) return jsonResponse({ error: "Erreur lors de l'enregistrement" }, 500);

  return jsonResponse({ ok: true });
});
