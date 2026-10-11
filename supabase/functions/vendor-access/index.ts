// GestiOne — Accès vendeur sécurisés.
// Réservé aux appareils administrateur d'une boutique.
//   invite        : nouveau code d'invitation WhatsApp (15 min, usage unique)
//   live          : code « en personne » affiché à l'écran (2 min, usage unique)
//   status        : état des invitations + téléphones autorisés, par vendeur
//                   (un téléphone = une ligne, avec son état de connexion)
//   logout_device : déconnecte un téléphone vendeur (il reste dans la liste ;
//                   la vendeuse peut se reconnecter avec ses identifiants)
//   revoke_device : retire l'autorisation d'un téléphone vendeur
//   revoke_invites: annule les invitations encore valables d'un vendeur
//   events        : journal de sécurité récent (connexions, tentatives refusées)
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

const INVITE_MINUTES = 15;
const LIVE_SECONDS = 120;
// Un téléphone vu il y a moins de ce délai est affiché « En ligne ».
const ONLINE_MINUTES = 10;
// Sans I, L, O, 0, 1 : impossibles à confondre en lisant le message.
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(kind: "invite" | "live"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  if (kind === "live") return Array.from(bytes, (b) => String(b % 10)).join("");
  return Array.from(bytes, (b) => ALPHA[b % ALPHA.length]).join("");
}

const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.resetAt) { attempts.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  e.count += 1;
  return e.count > 120;
}

async function storeValue(shopId: string, key: string) {
  const { data } = await supabase.from("shop_store").select("value").eq("shop_id", shopId).eq("key", key).maybeSingle();
  return data?.value;
}

const DEVICE_COLS = "device_id, vendor_id, device_model, device_name, device_brand, os_version, app_kind, label, linked_at, first_linked_at, session_started_at, session_count, last_seen_at, logged_out_at, logout_reason";

// Nom lisible du téléphone : nom donné par le téléphone (« Galaxy A15 »),
// sinon marque + modèle, sinon « Téléphone ».
function phoneTitle(d: Record<string, any>): string {
  if (d.device_name) {
    const brand = d.device_brand && !String(d.device_name).toLowerCase().includes(String(d.device_brand).toLowerCase()) ? `${d.device_brand} ` : "";
    return `${brand}${d.device_name}`;
  }
  const parts = [d.device_brand, d.device_model].filter(Boolean);
  return parts.length ? parts.join(" ") : "Téléphone";
}

function deviceView(d: Record<string, any>, nowMs: number) {
  const seen = d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0;
  const state = d.logged_out_at ? "logged_out" : seen && nowMs - seen < ONLINE_MINUTES * 60_000 ? "online" : "idle";
  return {
    device_id: d.device_id,
    title: phoneTitle(d),
    // « model » reste un libellé toujours rempli, comme avant (ancien écran).
    model: phoneTitle(d),
    model_code: d.device_model || null,
    os_version: d.os_version || null,
    app_kind: d.app_kind || null,
    first_linked_at: d.first_linked_at || d.linked_at,
    session_started_at: d.session_started_at || d.linked_at,
    session_count: d.session_count || 1,
    last_seen_at: d.last_seen_at,
    logged_out_at: d.logged_out_at,
    logout_reason: d.logout_reason,
    state, // online | idle | logged_out
    // Compatibilité avec l'ancien écran
    linked_at: d.linked_at,
  };
}

const STATE_ORDER: Record<string, number> = { online: 0, idle: 1, logged_out: 2 };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  if (isRateLimited(req.headers.get("x-forwarded-for") ?? "unknown")) return json({ error: "Trop de requêtes, ralentissez." }, 429);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const deviceId = String(body.device_id ?? "");
  const deviceSecret = String(body.device_secret ?? "");
  const shopId = String(body.shop_id ?? "");
  const action = String(body.action ?? "");
  if (!deviceId || !deviceSecret || !shopId) return json({ error: "Appareil non reconnu" }, 401);

  // 1) Appareil lié à la boutique
  const { data: dev } = await supabase.from("devices_shop").select("secret_hash, role")
    .eq("device_id", deviceId).eq("shop_id", shopId).maybeSingle();
  if (!dev || !bcrypt.compareSync(deviceSecret, dev.secret_hash)) return json({ error: "Appareil non reconnu" }, 401);

  // 2) Appareil administrateur — ou preuve par le code administrateur (une
  //    seule fois : l'appareil est ensuite reconnu comme administrateur).
  const meta = (await storeValue(shopId, "shopMeta")) || {};
  if (dev.role !== "admin") {
    const pin = String(body.admin_pin ?? "");
    if (!/^\d{4}$/.test(pin)) return json({ error: "Code administrateur requis", need_admin_pin: true }, 403);
    if (!meta.adminPinHash || !bcrypt.compareSync(pin, meta.adminPinHash)) {
      return json({ error: "Code administrateur incorrect", need_admin_pin: true }, 403);
    }
    await supabase.from("devices_shop").update({ role: "admin" }).eq("device_id", deviceId).eq("shop_id", shopId);
  }

  const rawVendors = await storeValue(shopId, "vendors");
  const vendors: Array<Record<string, unknown>> = Array.isArray(rawVendors) ? rawVendors : [];
  const vendorId = String(body.vendor_id ?? "");
  const vendor = vendors.find((v) => String(v.id) === vendorId);
  const nowIso = new Date().toISOString();
  const vendorNameOf = (id: string | null) => vendors.find((v) => String(v.id) === id)?.name ?? null;

  if (action === "invite" || action === "live") {
    if (!vendor) return json({ error: "Vendeur introuvable sur le serveur. Patientez quelques secondes (synchronisation) puis réessayez." }, 404);
    if (vendor.blocked) return json({ error: "Ce vendeur est bloqué." }, 403);
    const kind = action as "invite" | "live";
    // Une nouvelle invitation annule les précédentes encore valables.
    await supabase.from("vendor_invites").update({ revoked_at: nowIso })
      .eq("shop_id", shopId).eq("vendor_id", vendorId).is("used_at", null).is("revoked_at", null);
    const code = randomCode(kind);
    const expires = new Date(Date.now() + (kind === "live" ? LIVE_SECONDS * 1000 : INVITE_MINUTES * 60_000)).toISOString();
    const { data: row, error } = await supabase.from("vendor_invites")
      .insert({ shop_id: shopId, vendor_id: vendorId, kind, code, expires_at: expires })
      .select("id, kind, code, expires_at, created_at").single();
    if (error) return json({ error: "Erreur serveur" }, 500);
    return json({ invite: row, server_time: nowIso });
  }

  if (action === "status") {
    const [{ data: inv }, { data: devs }] = await Promise.all([
      supabase.from("vendor_invites").select("id, vendor_id, kind, code, expires_at, used_at, used_device_model, revoked_at, created_at")
        .eq("shop_id", shopId).order("created_at", { ascending: false }).limit(200),
      supabase.from("devices_shop").select(DEVICE_COLS).eq("shop_id", shopId).eq("role", "vendeur"),
    ]);
    const nowMs = Date.now();
    const out: Record<string, unknown> = {};
    for (const v of vendors) {
      const id = String(v.id);
      const last = (inv || []).find((i) => i.vendor_id === id) || null;
      const devices = (devs || []).filter((d) => d.vendor_id === id).map((d) => deviceView(d, nowMs))
        .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")));
      out[id] = {
        // Le code n'est renvoyé que tant qu'il est encore utilisable.
        last_invite: last ? { ...last, code: !last.used_at && !last.revoked_at && last.expires_at > nowIso ? last.code : null } : null,
        devices,
        online_count: devices.filter((d) => d.state === "online").length,
      };
    }
    return json({ vendors: out, uses_invites: (inv || []).length > 0, server_time: nowIso });
  }

  if (action === "logout_device" || action === "revoke_device") {
    const target = String(body.target_device_id ?? "");
    if (!target || target === deviceId) return json({ error: "Appareil invalide" }, 400);
    const { data: d } = await supabase.from("devices_shop").select("device_model, device_name, device_brand, role, vendor_id")
      .eq("device_id", target).eq("shop_id", shopId).maybeSingle();
    if (!d || d.role === "admin") return json({ error: "Appareil introuvable" }, 404);

    if (action === "logout_device") {
      await supabase.from("devices_shop").update({ logged_out_at: nowIso, logout_reason: "admin" })
        .eq("device_id", target).eq("shop_id", shopId).is("logged_out_at", null);
    } else {
      await supabase.from("devices_shop").delete().eq("device_id", target).eq("shop_id", shopId);
    }
    await supabase.from("shop_security_events").insert({
      shop_id: shopId, vendor_id: d.vendor_id, vendor_name: vendorNameOf(d.vendor_id),
      kind: action === "logout_device" ? "device_logged_out" : "device_revoked", device_model: phoneTitle(d),
    });
    return json({ ok: true });
  }

  if (action === "revoke_invites") {
    if (!vendorId) return json({ error: "Vendeur requis" }, 400);
    await supabase.from("vendor_invites").update({ revoked_at: nowIso })
      .eq("shop_id", shopId).eq("vendor_id", vendorId).is("used_at", null).is("revoked_at", null);
    return json({ ok: true });
  }

  if (action === "events") {
    const since = Number(body.since_id) || 0;
    const { data } = await supabase.from("shop_security_events")
      .select("id, vendor_id, vendor_name, kind, device_model, detail, created_at")
      .eq("shop_id", shopId).gt("id", since).order("id", { ascending: false }).limit(30);
    return json({ events: data || [] });
  }

  return json({ error: "Action invalide" }, 400);
});
