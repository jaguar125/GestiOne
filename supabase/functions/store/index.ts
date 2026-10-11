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
]);

// Listes fusionnées côté serveur (par id) au lieu d'être écrasées : une vente
// faite sur un téléphone ne peut plus disparaître parce qu'un autre appareil
// a envoyé sa liste un instant plus tard.
const MERGE_KEYS = new Set([
  "sales", "avoirs", "movements", "clients", "expenses", "suppliers", "orders",
  "supplierProducts", "inventories", "snackLots", "products", "categories", "heldSales",
  "hotelRooms", "hotelTariffs", "hotelStays", "hotelReservations", "hotelGuests",
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
): Promise<{ shopId: string } | { error: string; status: number }> {
  if (!deviceId || !deviceSecret) return { error: "Appareil non reconnu", status: 401 };

  let query = supabase.from("devices_shop").select("shop_id, secret_hash").eq("device_id", deviceId);
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

  return { shopId: row.shop_id as string };
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

  if (!key || !ALLOWED_KEYS.has(key)) return jsonResponse({ error: "Clé invalide" }, 400);
  if (action !== "get" && action !== "set") return jsonResponse({ error: "Action invalide" }, 400);

  const auth = await verifyDevice(device_id ?? "", device_secret ?? "", shop_id);
  if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);
  const shopId = auth.shopId;

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

  const value = slimList(key, rawValue);

  if (
    // Seules les versions récentes de l'app envoient deleted_ids (même vide) :
    // les anciennes gardent l'ancien comportement pour que leurs suppressions
    // continuent de fonctionner.
    MERGE_KEYS.has(key) && Array.isArray(deleted_ids) && Array.isArray(value) &&
    value.every((x) => x && typeof x === "object" && (x as { id?: unknown }).id != null && (x as { id?: unknown }).id !== "")
  ) {
    const del = Array.isArray(deleted_ids) ? deleted_ids.filter((x) => typeof x === "string" && x).slice(0, 5000) : [];
    // Produits : fusion « à trois » du stock (seule la différence faite sur
    // l'appareil depuis sa dernière synchro est appliquée au stock serveur).
    // v2 : l'identifiant du téléphone permet de reconnaître un envoi répété
    // (envois parallèles, nouvel essai après délai dépassé) et de ne pas
    // appliquer deux fois la même différence de stock.
    const { data: merged, error: mergeError } = key === "products"
      ? await supabase.rpc("merge_products_3way_v2", { p_shop: shopId, p_value: value, p_deleted: del, p_device: String(device_id ?? "") || null })
      : await supabase.rpc("merge_store_list", { p_shop: shopId, p_key: key, p_value: value, p_deleted: del });
    if (mergeError) return jsonResponse({ error: "Erreur lors de l'enregistrement" }, 500);
    return jsonResponse({ ok: true, merged: true, value: slimList(key, merged) });
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
