// src/apiDevices.js
//
// Appareils des vendeurs : session du téléphone (connexion / déconnexion /
// activité) et actions de l'administrateur sur les téléphones d'un vendeur.
// Utilise les mêmes clés locales que api.js (device_id, shop_links,
// active_shop_id) : aucun changement de stockage, aucune reliaison.

import { useEffect, useRef } from "react";
import { getDeviceInfo } from "./deviceInfo";

const API_BASE = "https://wcpbrejdznoiodspcedn.supabase.co/functions/v1";
const REQUEST_TIMEOUT_MS = 20000;

function authFields(shopId) {
  let links = {};
  try { links = JSON.parse(localStorage.getItem("shop_links") || "{}"); } catch { /* vide */ }
  const id = shopId || localStorage.getItem("active_shop_id");
  return { device_id: localStorage.getItem("device_id"), device_secret: links[id], shop_id: id };
}

async function call(name, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_BASE}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new Error(`${offline ? "OFFLINE" : "SERVER_DOWN"} (${e?.name === "AbortError" ? "délai dépassé" : "réseau"})`);
  } finally {
    clearTimeout(timer);
  }
  if (res.status >= 500) throw new Error(`SERVER_DOWN (HTTP ${res.status})`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur (${name})`);
  return data;
}

/* ---------- Session du téléphone (côté vendeuse) ---------- */

async function session(action, shopId) {
  const auth = authFields(shopId);
  if (!auth.device_id || !auth.device_secret || !auth.shop_id) return null; // pas encore lié
  return call("device-session", { ...auth, action, device_info: await getDeviceInfo() });
}

export const deviceSessionStart = (shopId) => session("start", shopId);
export const deviceSessionEnd = (shopId) => session("end", shopId);
export const deviceSessionPing = (shopId) => session("ping", shopId);

const PING_MS = 2 * 60_000;

// À placer UNE fois dans App, après les états role / activeShopId :
//
//   useVendorDeviceSession({ shopId: activeShopId, role, onForcedLogout: () => logoutVendor() });
//
// - role passe à "vendeur"        → « connectée » sur ce téléphone
// - role quitte "vendeur"         → « Déconnectée le … » chez l'administrateur
// - toutes les 2 min / au retour  → dernière activité ; si l'administrateur a
//   dans l'app                       déconnecté ce téléphone, onForcedLogout()
// Hors ligne : rien n'est bloqué, l'état est renvoyé au prochain essai.
export function useVendorDeviceSession({ shopId, role, onForcedLogout }) {
  const prev = useRef({ role: null, shopId: null });
  const needsStart = useRef(false);
  const forcedRef = useRef(onForcedLogout);
  forcedRef.current = onForcedLogout;

  useEffect(() => {
    const was = prev.current;
    prev.current = { role, shopId };
    if (was.role === "vendeur" && (role !== "vendeur" || was.shopId !== shopId)) {
      deviceSessionEnd(was.shopId).catch(() => {});
    }
    if (role === "vendeur" && shopId && (was.role !== "vendeur" || was.shopId !== shopId)) {
      needsStart.current = true;
      deviceSessionStart(shopId).then(() => { needsStart.current = false; }).catch(() => {});
    }
  }, [role, shopId]);

  useEffect(() => {
    if (role !== "vendeur" || !shopId) return undefined;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        if (needsStart.current) {
          await deviceSessionStart(shopId);
          needsStart.current = false;
          return;
        }
        const r = await deviceSessionPing(shopId);
        if (!r || !r.logged_out || stopped) return;
        if (r.reason === "admin") forcedRef.current?.();
        // Déconnexion enregistrée alors que la vendeuse est encore connectée
        // (ex. reconnexion faite hors ligne) : on rétablit la session.
        else await deviceSessionStart(shopId);
      } catch { /* hors ligne : on réessaiera */ }
    };
    const timer = setInterval(tick, PING_MS);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", tick);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", tick);
    };
  }, [role, shopId]);
}

/* ---------- Téléphones d'un vendeur (côté administrateur) ---------- */

// Renvoie { vendors: { [vendorId]: { devices: [...], online_count, last_invite } }, ... }
export async function vendorDevicesStatus(shopId) {
  return call("vendor-access", { ...authFields(shopId), action: "status" });
}

// Déconnecte le téléphone (il reste dans la liste, la vendeuse peut se reconnecter).
export async function logoutVendorDevice(shopId, targetDeviceId) {
  return call("vendor-access", { ...authFields(shopId), action: "logout_device", target_device_id: targetDeviceId });
}

// Retire l'accès : le téléphone disparaît de la liste et devra être réinvité.
export async function revokeVendorDevice(shopId, targetDeviceId) {
  return call("vendor-access", { ...authFields(shopId), action: "revoke_device", target_device_id: targetDeviceId });
}
