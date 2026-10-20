import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Lus depuis les secrets Supabase (Project Settings > Edge Functions >
// Secrets) — plus aucune valeur en dur dans le code source.
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL");
const OWNER_SECRET = Deno.env.get("OWNER_SECRET");

const PLAN_DAYS: Record<string, number | null> = {
  "1m": 30, "3m": 90, "6m": 180, "12m": 365, lifetime: null,
};

function normalize(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Limite générale : 30 requêtes par minute et par adresse.
const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 30;
}

// Protection contre les essais d'identifiants : 5 échecs en 15 minutes
// depuis la même adresse bloquent l'accès pendant 15 minutes.
const FAIL_MAX = 5;
const FAIL_WINDOW_MS = 15 * 60_000;
const FAIL_BLOCK_MS = 15 * 60_000;
const failures = new Map<string, { count: number; firstAt: number; blockedUntil: number }>();
function isBlocked(ip: string): boolean {
  const f = failures.get(ip);
  return !!f && f.blockedUntil > Date.now();
}
function recordFailure(ip: string) {
  const now = Date.now();
  const f = failures.get(ip);
  if (!f || now - f.firstAt > FAIL_WINDOW_MS) { failures.set(ip, { count: 1, firstAt: now, blockedUntil: 0 }); return; }
  f.count += 1;
  if (f.count >= FAIL_MAX) f.blockedUntil = now + FAIL_BLOCK_MS;
}

// ---------- Mot de passe personnel de l'éditeur ----------
// Troisième élément de l'accès (avec l'email et la question secrète).
// Haché (bcrypt) dans la table app_owner_auth, jamais renvoyé.
//  - action "password-status" : { hasPassword }
//  - action "set-password"    : création (première fois) ou changement
//    (mot de passe actuel exigé)
//  - toute autre action        : mot de passe obligatoire
async function passwordGate(body: { action?: string; password?: string; new_password?: string }, ip: string): Promise<Response | null> {
  const { data: row, error } = await supabase.from("app_owner_auth").select("password_hash").eq("id", 1).maybeSingle();
  if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
  const hash = row?.password_hash || null;
  if (body.action === "password-status") return jsonResponse({ hasPassword: !!hash });
  if (body.action === "set-password") {
    const next = String(body.new_password ?? "");
    if (next.length < 8) return jsonResponse({ error: "Le mot de passe doit contenir au moins 8 caractères." }, 400);
    if (hash && !(await bcrypt.compare(String(body.password ?? ""), hash))) {
      recordFailure(ip);
      return jsonResponse({ error: "Mot de passe actuel incorrect" }, 403);
    }
    const newHash = await bcrypt.hash(next, 10);
    const { error: upErr } = await supabase.from("app_owner_auth").upsert({ id: 1, password_hash: newHash, updated_at: new Date().toISOString() });
    if (upErr) return jsonResponse({ error: "Erreur lors de l'enregistrement" }, 500);
    return jsonResponse({ ok: true });
  }
  if (!hash) return jsonResponse({ error: "PASSWORD_SETUP_REQUIRED" }, 428);
  if (!(await bcrypt.compare(String(body.password ?? ""), hash))) {
    recordFailure(ip);
    return jsonResponse({ error: "Accès refusé" }, 403);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée" }, 405);

  if (!OWNER_EMAIL || !OWNER_SECRET) {
    return jsonResponse({ error: "Configuration serveur incomplète (secrets OWNER_EMAIL / OWNER_SECRET manquants)" }, 500);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (isRateLimited(ip)) return jsonResponse({ error: "Trop de tentatives, réessayez dans une minute." }, 429);
  if (isBlocked(ip)) return jsonResponse({ error: "Trop de tentatives, réessayez dans 15 minutes." }, 429);

  let body: { email?: string; secret?: string; password?: string; new_password?: string; action?: string; shop_id?: string; code?: string; vendor_id?: string };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Requête invalide" }, 400); }

  const email = normalize(body.email);
  const secret = normalize(body.secret);
  if (email !== normalize(OWNER_EMAIL) || secret !== normalize(OWNER_SECRET)) {
    recordFailure(ip);
    return jsonResponse({ error: "Accès refusé" }, 403);
  }
  const gate = await passwordGate(body, ip);
  if (gate) return gate;
  failures.delete(ip);

  if (body.action === "delete-shop") {
    if (!body.shop_id) return jsonResponse({ error: "shop_id requis" }, 400);
    const { error } = await supabase.from("shops").delete().eq("id", body.shop_id);
    if (error) return jsonResponse({ error: "Erreur lors de la suppression" }, 500);
    return jsonResponse({ ok: true });
  }

  if (body.action === "activate-shop") {
    if (!body.shop_id) return jsonResponse({ error: "shop_id requis" }, 400);
    const code = (body.code ?? "").replace(/\D/g, "");
    if (!/^\d{12}$/.test(code)) return jsonResponse({ error: "Code invalide" }, 400);

    const { data: license, error: licError } = await supabase.from("licenses").select("*").eq("code", code).maybeSingle();
    if (licError) return jsonResponse({ error: "Erreur serveur" }, 500);
    if (!license) return jsonResponse({ error: "Code invalide" }, 404);
    if (license.status === "revoked") return jsonResponse({ error: "Ce code a été révoqué" }, 403);
    if (license.status !== "unused") {
      return jsonResponse({ error: "Ce code a déjà été activé et ne peut pas être réutilisé" }, 409);
    }

    const now = new Date();
    const isLifetime = license.plan === "lifetime";
    const days = PLAN_DAYS[license.plan];

    const { data: existing } = await supabase.from("shop_store").select("value").eq("shop_id", body.shop_id).eq("key", "shopLicense").maybeSingle();
    const existingExpiry = existing?.value?.expiresAt ? new Date(existing.value.expiresAt) : null;
    const startFrom = existingExpiry && existingExpiry > now ? existingExpiry : now;
    const expiresAt = isLifetime ? null : new Date(startFrom.getTime() + (days as number) * 86_400_000);

    const marker = `shop:${body.shop_id}`;
    const { error: updateError } = await supabase.from("licenses").update({
      status: "active",
      activated_at: now.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      device_id: marker,
    }).eq("code", code);
    if (updateError) return jsonResponse({ error: "Erreur lors de l'activation" }, 500);

    const shopLicense = {
      code, planId: license.plan, lifetime: isLifetime,
      activatedAt: now.toISOString(), expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
    const { error: storeError } = await supabase.from("shop_store").upsert({
      shop_id: body.shop_id, key: "shopLicense", value: shopLicense, updated_at: now.toISOString(),
    });
    if (storeError) return jsonResponse({ error: "Licence validée mais échec de l'enregistrement sur la boutique" }, 500);

    return jsonResponse({ ok: true, subscription: { plan: license.plan, status: "active", isTrial: false, expiresAt: shopLicense.expiresAt, activatedAt: shopLicense.activatedAt, code } });
  }

  if (body.action === "reset-admin-pin") {
    if (!body.shop_id) return jsonResponse({ error: "shop_id requis" }, 400);
    const { data: metaRow } = await supabase.from("shop_store").select("value").eq("shop_id", body.shop_id).eq("key", "shopMeta").maybeSingle();
    const newPin = randomPin();
    const newHash = await bcrypt.hash(newPin, 10);
    const nextMeta = { ...(metaRow?.value || {}), adminPinHash: newHash };
    const { error } = await supabase.from("shop_store").upsert({ shop_id: body.shop_id, key: "shopMeta", value: nextMeta, updated_at: new Date().toISOString() });
    if (error) return jsonResponse({ error: "Erreur lors de la réinitialisation" }, 500);
    return jsonResponse({ ok: true, newPin });
  }

  if (body.action === "reset-vendor-pin") {
    if (!body.shop_id || !body.vendor_id) return jsonResponse({ error: "shop_id et vendor_id requis" }, 400);
    const { data: vendorsRow } = await supabase.from("shop_store").select("value").eq("shop_id", body.shop_id).eq("key", "vendors").maybeSingle();
    const vendors = Array.isArray(vendorsRow?.value) ? vendorsRow.value : [];
    const idx = vendors.findIndex((v: { id?: string }) => v.id === body.vendor_id);
    if (idx === -1) return jsonResponse({ error: "Vendeur introuvable" }, 404);
    const newPin = randomPin();
    const newHash = await bcrypt.hash(newPin, 10);
    vendors[idx] = { ...vendors[idx], pinHash: newHash };
    const { error } = await supabase.from("shop_store").upsert({ shop_id: body.shop_id, key: "vendors", value: vendors, updated_at: new Date().toISOString() });
    if (error) return jsonResponse({ error: "Erreur lors de la réinitialisation" }, 500);
    return jsonResponse({ ok: true, newPin, vendorName: vendors[idx].name });
  }

  // action par défaut : "list"
  const { data: shops, error } = await supabase
    .from("shops")
    .select("id, name, type, currency, join_code, created_at")
    .order("created_at", { ascending: false });
  if (error) return jsonResponse({ error: "Erreur serveur" }, 500);

  // Statistiques d'activité (calculées dans la base, une seule requête).
  // En cas d'échec, la liste reste affichée sans les chiffres.
  const statsById = new Map<string, Record<string, unknown>>();
  try {
    const { data: stats } = await supabase.rpc("owner_shop_stats");
    for (const r of stats ?? []) {
      statsById.set(r.shop_id, {
        lastActivity: r.last_activity ?? null,
        products: r.products ?? 0,
        salesCount: r.sales_count ?? 0,
        sales30d: Number(r.sales_30d) || 0,
        adminName: r.admin_name ?? null,
        phone: r.phone ?? null,
      });
    }
  } catch { /* statistiques indisponibles */ }

  const results = [];
  for (const shop of shops ?? []) {
    let subscription = { plan: null, status: "none", isTrial: false, expiresAt: null, activatedAt: null, code: null };

    const { data: licenseRow } = await supabase
      .from("shop_store")
      .select("value")
      .eq("shop_id", shop.id)
      .eq("key", "shopLicense")
      .maybeSingle();
    const shopLicense = licenseRow?.value;

    if (shopLicense && shopLicense.planId) {
      if (shopLicense.planId === "trial") {
        const notExpired = shopLicense.expiresAt ? new Date(shopLicense.expiresAt).getTime() > Date.now() : false;
        subscription = { plan: "trial", status: notExpired ? "trial" : "expired", isTrial: true, expiresAt: shopLicense.expiresAt ?? null, activatedAt: shopLicense.activatedAt ?? null, code: null };
      } else if (shopLicense.lifetime) {
        subscription = { plan: shopLicense.planId, status: "active", isTrial: false, expiresAt: null, activatedAt: shopLicense.activatedAt ?? null, code: shopLicense.code ?? null };
      } else {
        const notExpired = shopLicense.expiresAt ? new Date(shopLicense.expiresAt).getTime() > Date.now() : false;
        subscription = { plan: shopLicense.planId, status: notExpired ? "active" : "expired", isTrial: false, expiresAt: shopLicense.expiresAt ?? null, activatedAt: shopLicense.activatedAt ?? null, code: shopLicense.code ?? null };
      }
    }

    const { data: vendorsRow } = await supabase.from("shop_store").select("value").eq("shop_id", shop.id).eq("key", "vendors").maybeSingle();
    const vendors = Array.isArray(vendorsRow?.value) ? vendorsRow.value.map((v: { id?: string; name?: string; joinCode?: string }) => ({ id: v.id, name: v.name, joinCode: v.joinCode ?? null })) : [];

    results.push({ ...shop, subscription, vendors, stats: statsById.get(shop.id) ?? null });
  }

  return jsonResponse({ shops: results });
});
