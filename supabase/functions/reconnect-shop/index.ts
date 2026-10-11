// GestiOne — Reconnexion d'un appareil à une entreprise existante.
// Vendeur : nom de l'entreprise + nom + code PIN + code d'invitation.
// Le code d'invitation (créé par la fonction vendor-access) ne sert qu'UNE
// fois : dès que le vendeur est connecté, il est « brûlé » et toute autre
// tentative avec le même message est refusée et signalée à l'administrateur.
//
// Appareils : un même téléphone ne crée JAMAIS de nouvelle ligne. On le
// reconnaît par son empreinte matérielle (hw_key, envoyée par l'APK), sinon
// par son identifiant, sinon (navigateur) par son modèle quand l'ancienne
// ligne n'est plus active. Un AUTRE téléphone, lui, s'ajoute à la liste sans
// retirer les précédents.
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_FAILS = 5;          // essais ratés avant blocage temporaire
const LOCK_MINUTES = 15;
// Navigateur sans empreinte : une ligne du même modèle est considérée comme
// « le même téléphone » si elle est déconnectée ou inactive depuis ce délai.
const SAME_MODEL_IDLE_MINUTES = 30;

function generateDeviceSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}
const normCode = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const hhmm = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Africa/Abidjan", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ");

const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) { attempts.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  entry.count += 1;
  return entry.count > 8;
}

/* ---------- Description du téléphone ---------- */

type DeviceInfo = {
  model: string | null;      // ex. "SM-A155F"
  name: string | null;       // ex. "Galaxy A15" (nom affiché)
  brand: string | null;      // ex. "Samsung"
  os_version: string | null; // ex. "Android 14"
  app_kind: "app" | "navigateur" | null;
  hw_key: string | null;     // empreinte matérielle hachée (APK uniquement)
};

const clip = (v: unknown, n: number) => {
  const s = String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);
  return s || null;
};

function readDeviceInfo(body: Record<string, unknown>): DeviceInfo {
  const raw = (body.device_info && typeof body.device_info === "object" ? body.device_info : {}) as Record<string, unknown>;
  const kind = String(raw.app_kind ?? "");
  const hw = String(raw.hw_key ?? "");
  return {
    model: clip(raw.model ?? body.device_model, 60),
    name: clip(raw.name, 60),
    brand: clip(raw.brand, 30),
    os_version: clip(raw.os_version, 30),
    app_kind: kind === "app" || kind === "navigateur" ? kind : null,
    hw_key: /^[a-f0-9]{64}$/.test(hw) ? hw : null,
  };
}

// Libellé lisible pour le journal de sécurité.
const displayModel = (i: DeviceInfo) => i.name || [i.brand, i.model].filter(Boolean).join(" ") || "";

type ExistingRow = { device_id: string; first_linked_at: string | null; linked_at: string; session_count: number | null };

// Cherche la ligne qui correspond au MÊME téléphone physique.
async function findSamePhone(shopId: string, deviceId: string, role: string, vendorId: string | null, info: DeviceInfo): Promise<ExistingRow | null> {
  const cols = "device_id, first_linked_at, linked_at, session_count";
  const scope = (q: any) => {
    q = q.eq("shop_id", shopId).eq("role", role);
    return vendorId ? q.eq("vendor_id", vendorId) : q.is("vendor_id", null);
  };

  // 1) Même identifiant d'appareil.
  const { data: same } = await scope(supabase.from("devices_shop").select(cols)).eq("device_id", deviceId).maybeSingle();
  if (same) return same as ExistingRow;

  // 2) Même empreinte matérielle (l'APK la garde même après réinstallation).
  if (info.hw_key) {
    const { data } = await scope(supabase.from("devices_shop").select(cols)).eq("hw_key", info.hw_key)
      .order("linked_at", { ascending: false }).limit(1);
    if (data && data[0]) return data[0] as ExistingRow;
  }

  // 3) Ligne sans empreinte (navigateur, ou créée avant cette mise à jour) :
  //    même modèle — ou modèle inconnu — et plus active depuis un moment.
  //    Une ligne encore active est forcément un AUTRE téléphone.
  const idleBefore = new Date(Date.now() - SAME_MODEL_IDLE_MINUTES * 60_000).toISOString();
  const { data: loose } = await scope(supabase.from("devices_shop").select(cols + ", device_model, app_kind, logged_out_at, last_seen_at"))
    .is("hw_key", null).order("linked_at", { ascending: false }).limit(20);
  const hit = (loose || []).find((r: any) =>
    (!r.device_model || !info.model || r.device_model === info.model) &&
    (!r.app_kind || !info.app_kind || r.app_kind === info.app_kind) &&
    (r.logged_out_at || !r.last_seen_at || r.last_seen_at < idleBefore));
  return (hit as ExistingRow) || null;
}

// Lie l'appareil. Retourne le secret et indique s'il s'agit d'un nouveau téléphone.
async function linkDevice(deviceId: string, shopId: string, label: string, role: string, vendorId: string | null, info: DeviceInfo) {
  const previous = await findSamePhone(shopId, deviceId, role, vendorId, info);
  const nowIso = new Date().toISOString();

  // Même téléphone sous un ancien identifiant : l'ancienne ligne est remplacée.
  if (previous && previous.device_id !== deviceId) {
    await supabase.from("devices_shop").delete().eq("device_id", previous.device_id).eq("shop_id", shopId);
  }

  const deviceSecret = generateDeviceSecret();
  const deviceSecretHash = await bcrypt.hash(deviceSecret, 10);
  const { error } = await supabase.from("devices_shop").upsert({
    device_id: deviceId,
    shop_id: shopId,
    secret_hash: deviceSecretHash,
    label,
    role,
    vendor_id: vendorId,
    linked_at: nowIso,
    last_seen_at: nowIso,
    first_linked_at: previous?.first_linked_at || previous?.linked_at || nowIso,
    session_started_at: nowIso,
    session_count: previous ? (previous.session_count || 1) + 1 : 1,
    logged_out_at: null,
    logout_reason: null,
    device_model: info.model,
    device_name: info.name,
    device_brand: info.brand,
    os_version: info.os_version,
    app_kind: info.app_kind,
    hw_key: info.hw_key,
  });
  if (error) throw new Error("link_failed");
  return { deviceSecret, isNewPhone: !previous };
}

async function getStoreValue(shopId: string, key: string) {
  const { data } = await supabase.from("shop_store").select("value").eq("shop_id", shopId).eq("key", key).maybeSingle();
  return data?.value;
}
async function logEvent(shopId: string, vendor: Record<string, unknown> | null, kind: string, deviceModel: string, detail?: string) {
  await supabase.from("shop_security_events").insert({
    shop_id: shopId, vendor_id: vendor ? String(vendor.id) : null, vendor_name: vendor ? String(vendor.name ?? "") : null,
    kind, device_model: deviceModel || null, detail: detail ?? null,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée" }, 405);
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) return jsonResponse({ error: "Trop de tentatives, réessayez plus tard." }, 429);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Requête invalide" }, 400); }

  const shopName = String(body.shop_name ?? "").trim();
  const deviceId = String(body.device_id ?? "");
  const info = readDeviceInfo(body);
  const deviceModel = displayModel(info);
  if (!shopName || !deviceId) return jsonResponse({ error: "Nom de boutique requis" }, 400);

  try {
    if (body.role === "admin") {
      const adminPin = String(body.admin_pin ?? "");
      const vendorName = String(body.vendor_name ?? "").trim().toLowerCase();
      if (!/^\d{4}$/.test(adminPin) || !vendorName) {
        return jsonResponse({ error: "Code administrateur et nom d'un vendeur requis" }, 400);
      }
      const { data: candidates } = await supabase.from("shops").select("id, name, type, currency, join_code").ilike("name", shopName);
      for (const c of candidates ?? []) {
        const meta = await getStoreValue(c.id, "shopMeta");
        const adminPinHash = meta?.adminPinHash;
        if (!adminPinHash || !bcrypt.compareSync(adminPin, adminPinHash)) continue;
        const vendorsList = (await getStoreValue(c.id, "vendors")) || [];
        const hasVendor = vendorsList.some((v: any) => (v.name ?? "").trim().toLowerCase() === vendorName);
        if (!hasVendor) continue;
        const { deviceSecret } = await linkDevice(deviceId, c.id, "Administrateur (reconnexion)", "admin", null, info);
        const shopLicense = await getStoreValue(c.id, "shopLicense");
        return jsonResponse({ shop_id: c.id, name: c.name, type: c.type, currency: c.currency, join_code: c.join_code, device_secret: deviceSecret, role: "admin", shop_license: shopLicense ?? null });
      }
      return jsonResponse({ error: "Aucune correspondance trouvée. Vérifie le nom de la boutique, le code administrateur et le nom du vendeur." }, 404);
    }

    if (body.role === "vendeur") {
      const vendorPin = String(body.vendor_pin ?? "");
      const vendorName = String(body.vendor_name ?? "").trim().toLowerCase();
      const code = normCode(body.join_code);
      if (!/^\d{4}$/.test(vendorPin) || !vendorName || !code) {
        return jsonResponse({ error: "Code PIN, nom et code d'invitation requis" }, 400);
      }
      const { data: candidates } = await supabase.from("shops").select("id, name, type, currency, join_code").ilike("name", shopName);
      let refusal: { error: string; status: number; code?: string } | null = null;

      for (const c of candidates ?? []) {
        const vendorsList: any[] = (await getStoreValue(c.id, "vendors")) || [];
        const byName = vendorsList.filter((v) => (v.name ?? "").trim().toLowerCase() === vendorName);
        if (byName.length === 0) continue;

        // Blocage temporaire après plusieurs essais ratés pour ce vendeur.
        const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
        const ids = byName.map((v) => String(v.id));
        const { count: fails } = await supabase.from("shop_security_events").select("id", { count: "exact", head: true })
          .eq("shop_id", c.id).in("vendor_id", ids).in("kind", ["failed", "reuse_blocked", "expired"]).gte("created_at", since);
        if ((fails ?? 0) >= MAX_FAILS) {
          refusal = { error: `Trop d'essais pour ce vendeur. Réessayez dans ${LOCK_MINUTES} minutes.`, status: 429, code: "LOCKED" };
          continue;
        }

        const vendor = byName.find((v) => v.pinHash && bcrypt.compareSync(vendorPin, v.pinHash));
        if (!vendor) {
          await logEvent(c.id, byName[0], "failed", deviceModel, "Code PIN incorrect");
          refusal = refusal ?? { error: "Aucune correspondance trouvée. Vérifie tes informations.", status: 404 };
          continue;
        }
        if (vendor.blocked) return jsonResponse({ error: "Accès bloqué. Contacte le propriétaire de la boutique.", code: "BLOCKED" }, 403);

        // Code d'invitation (nouveau système)
        const { data: inv } = await supabase.from("vendor_invites")
          .select("id, kind, expires_at, used_at, revoked_at")
          .eq("shop_id", c.id).eq("vendor_id", String(vendor.id)).eq("code", code)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();

        let accepted = false;
        if (inv) {
          if (inv.used_at) {
            await logEvent(c.id, vendor, "reuse_blocked", deviceModel, `Invitation utilisée le ${hhmm(inv.used_at)}`);
            return jsonResponse({ error: `Invitation déjà utilisée (le ${hhmm(inv.used_at)}). Demandez une nouvelle invitation à votre responsable.`, code: "USED" }, 403);
          }
          if (inv.revoked_at) {
            await logEvent(c.id, vendor, "expired", deviceModel, "Invitation remplacée");
            return jsonResponse({ error: "Cette invitation a été remplacée par une plus récente. Utilisez le dernier code reçu.", code: "REVOKED" }, 403);
          }
          if (new Date(inv.expires_at).getTime() < Date.now()) {
            await logEvent(c.id, vendor, "expired", deviceModel, "Invitation expirée");
            return jsonResponse({ error: inv.kind === "live" ? "Code expiré. Tapez le nouveau code affiché sur le téléphone du responsable." : "Invitation expirée. Demandez une nouvelle invitation à votre responsable.", code: "EXPIRED" }, 403);
          }
          // « Brûle » le code de façon atomique : si deux téléphones essaient
          // en même temps, un seul passe.
          const { data: burned } = await supabase.from("vendor_invites")
            .update({ used_at: new Date().toISOString(), used_device_id: deviceId, used_device_model: deviceModel || null })
            .eq("id", inv.id).is("used_at", null).select("id");
          if (!burned || burned.length === 0) {
            await logEvent(c.id, vendor, "reuse_blocked", deviceModel, "Invitation utilisée à l'instant");
            return jsonResponse({ error: "Invitation déjà utilisée. Demandez une nouvelle invitation à votre responsable.", code: "USED" }, 403);
          }
          accepted = true;
        } else {
          // Ancien code de liaison permanent : accepté seulement tant que
          // l'entreprise n'utilise pas encore les invitations.
          const { count: used } = await supabase.from("vendor_invites").select("id", { count: "exact", head: true }).eq("shop_id", c.id);
          if ((used ?? 0) === 0 && normCode(vendor.joinCode) === code) accepted = true;
        }

        if (!accepted) {
          await logEvent(c.id, vendor, "failed", deviceModel, "Code d'invitation incorrect");
          return jsonResponse({ error: "Code d'invitation incorrect. Vérifiez le dernier message reçu.", code: "BAD_CODE" }, 404);
        }

        // Les autres téléphones du vendeur restent autorisés : ils sont tous
        // listés chez l'administrateur, qui peut en retirer un à tout moment.
        await supabase.from("vendor_invites").update({ revoked_at: new Date().toISOString() })
          .eq("shop_id", c.id).eq("vendor_id", String(vendor.id)).is("used_at", null).is("revoked_at", null);
        const { deviceSecret, isNewPhone } = await linkDevice(deviceId, c.id, `Vendeur (reconnexion) — ${vendor.name}`, "vendeur", String(vendor.id), info);
        await logEvent(c.id, vendor, "connected", deviceModel, isNewPhone ? "Nouveau téléphone" : "Même téléphone");
        const shopLicense = await getStoreValue(c.id, "shopLicense");
        return jsonResponse({ shop_id: c.id, name: c.name, type: c.type, currency: c.currency, join_code: c.join_code, device_secret: deviceSecret, role: "vendeur", vendorName: vendor.name, shop_license: shopLicense ?? null });
      }
      if (refusal) return jsonResponse({ error: refusal.error, code: refusal.code }, refusal.status);
      return jsonResponse({ error: "Aucune correspondance trouvée. Vérifie tes informations." }, 404);
    }
  } catch {
    return jsonResponse({ error: "Erreur serveur" }, 500);
  }

  return jsonResponse({ error: "Rôle invalide" }, 400);
});
