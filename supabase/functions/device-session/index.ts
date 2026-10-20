// GestiOne — Session du téléphone (appelée par le téléphone lui-même).
//   start : la vendeuse s'est connectée avec son code PIN sur ce téléphone
//           (même ligne qu'avant : on efface « Déconnectée » et on compte
//           une ouverture de session de plus)
//   end   : la vendeuse s'est déconnectée → « Déconnectée le … » chez l'admin
//   ping  : l'app est ouverte → dernière activité ; renvoie logged_out=true
//           si l'administrateur a déconnecté ce téléphone entre-temps
// Chaque appel peut aussi mettre à jour la description du téléphone
// (nom, modèle, version) pour les appareils liés avant cette mise à jour.
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

const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.resetAt) { attempts.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  e.count += 1;
  return e.count > 60;
}

const clip = (v: unknown, n: number) => {
  const s = String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);
  return s || null;
};

// Champs de description à enregistrer — seulement ceux réellement fournis,
// pour ne jamais effacer une information déjà connue.
function infoPatch(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  const set = (col: string, v: string | null) => { if (v) out[col] = v; };
  set("device_model", clip(r.model, 60));
  set("device_name", clip(r.name, 60));
  set("device_brand", clip(r.brand, 30));
  set("os_version", clip(r.os_version, 30));
  const kind = String(r.app_kind ?? "");
  if (kind === "app" || kind === "navigateur") out.app_kind = kind;
  const hw = String(r.hw_key ?? "");
  if (/^[a-f0-9]{64}$/.test(hw)) out.hw_key = hw;
  return out;
}

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

  const { data: dev } = await supabase.from("devices_shop")
    .select("secret_hash, logged_out_at, logout_reason, session_count")
    .eq("device_id", deviceId).eq("shop_id", shopId).maybeSingle();
  if (!dev || !bcrypt.compareSync(deviceSecret, dev.secret_hash)) return json({ error: "Appareil non reconnu" }, 401);

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { ...infoPatch(body.device_info), last_seen_at: nowIso };
  const where = (q: any) => q.eq("device_id", deviceId).eq("shop_id", shopId);

  if (action === "start") {
    if (dev.logged_out_at) {
      patch.session_count = (dev.session_count || 1) + 1;
      patch.session_started_at = nowIso;
    }
    patch.logged_out_at = null;
    patch.logout_reason = null;
    await where(supabase.from("devices_shop").update(patch));
    return json({ ok: true, logged_out: false });
  }

  if (action === "end") {
    if (!dev.logged_out_at) {
      patch.logged_out_at = nowIso;
      patch.logout_reason = "self";
    }
    await where(supabase.from("devices_shop").update(patch));
    return json({ ok: true, logged_out: true });
  }

  if (action === "ping") {
    await where(supabase.from("devices_shop").update(patch));
    return json({ ok: true, logged_out: !!dev.logged_out_at, reason: dev.logout_reason || null });
  }

  return json({ error: "Action invalide" }, 400);
});
