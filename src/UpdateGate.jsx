// src/UpdateGate.jsx
//
// Mise à jour de l'application demandée par le serveur.
//   - version < min    : écran bloquant « Mise à jour obligatoire »
//   - version < latest : bandeau « Nouvelle version disponible » (refermable)
// Les valeurs viennent de la table app_config (clé « version ») via le
// serveur Cloudflare : { min, latest, message, apk_url }.

import { useEffect, useState } from "react";
import { RefreshCw, Download, ShieldAlert, Sparkles, X } from "lucide-react";
import { fetchVersionInfo } from "./api.js";
import { APP_VERSION } from "./appVersion.js";

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000; // toutes les 6 heures
const MIN_GAP_MS = 30 * 60 * 1000; // au retour à l'écran : au plus toutes les 30 min

function isNativeApp() {
  try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch { return false; }
}
function readLS(k) { try { return localStorage.getItem(k); } catch { return null; } }
function writeLS(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

export function UpdateGate() {
  const [info, setInfo] = useState(null);
  const [dismissed, setDismissed] = useState(() => readLS("update_dismissed") || "");

  useEffect(() => {
    let stop = false;
    let last = 0;
    const check = async () => {
      if (stop) return;
      last = Date.now();
      const d = await fetchVersionInfo();
      if (!stop && d) setInfo(d);
    };
    check();
    const t = setInterval(check, CHECK_EVERY_MS);
    const onVis = () => { if (document.visibilityState === "visible" && Date.now() - last > MIN_GAP_MS) check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  if (!info) return null;
  const min = Number(info.min) || 0;
  const latest = Number(info.latest) || 0;
  const native = isNativeApp();
  const apkUrl = typeof info.apk_url === "string" && /^https?:\/\//.test(info.apk_url) ? info.apk_url : "";
  const message = typeof info.message === "string" ? info.message.trim() : "";

  const doUpdate = () => {
    if (native) {
      if (apkUrl) window.open(apkUrl, "_system");
      return;
    }
    window.location.reload();
  };
  const actionLabel = native ? (apkUrl ? "Télécharger la nouvelle version" : null) : "Mettre à jour maintenant";

  // ---- Mise à jour obligatoire : écran bloquant ----
  if (min > APP_VERSION) {
    return (
      <div role="dialog" aria-modal="true" style={{
        position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(20,14,10,0.94)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "max(24px, env(safe-area-inset-top)) 18px max(24px, env(safe-area-inset-bottom))",
      }}>
        <div style={{ width: "100%", maxWidth: 420, background: "#FFFDF8", borderRadius: 24, padding: "26px 20px 20px", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: "#FDECE3", color: "#B4471A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <ShieldAlert size={30} strokeWidth={2.2} />
          </div>
          <h2 style={{ margin: 0, textAlign: "center", fontSize: 20, fontWeight: 800, color: "#2A1A10" }}>Mise à jour obligatoire</h2>
          <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 14.5, lineHeight: 1.5, color: "#5A4A3E" }}>
            {message || "Une nouvelle version de GestiOne est nécessaire pour continuer à synchroniser vos ventes. Vos données enregistrées sur ce téléphone sont conservées."}
          </p>
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "#F4EFE6", fontSize: 13.5, lineHeight: 1.5, color: "#4A3A2E" }}>
            {native
              ? (apkUrl
                ? "Touchez le bouton ci-dessous pour télécharger la nouvelle version, puis installez-la par-dessus l'ancienne (sans désinstaller)."
                : "Mettez GestiOne à jour depuis le Play Store, ou demandez la nouvelle version à l'administrateur de votre entreprise.")
              : "Touchez « Mettre à jour maintenant » : la page se recharge avec la nouvelle version."}
            <br />
            <b>Vendeur :</b> si vous ne pouvez pas mettre à jour, prévenez l'administrateur de votre entreprise.
          </div>
          {actionLabel && (
            <button onClick={doUpdate} style={{
              marginTop: 16, width: "100%", minHeight: 50, border: "none", borderRadius: 16, background: "#5B3417", color: "#fff",
              fontSize: 15.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 16px",
            }}>
              {native ? <Download size={19} strokeWidth={2.4} /> : <RefreshCw size={19} strokeWidth={2.4} />}
              {actionLabel}
            </button>
          )}
          <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, color: "#8A7A6E" }}>Version installée : {APP_VERSION} · requise : {min}</p>
        </div>
      </div>
    );
  }

  // ---- Nouvelle version disponible : bandeau refermable ----
  if (latest > APP_VERSION && dismissed !== String(latest)) {
    const close = () => { writeLS("update_dismissed", String(latest)); setDismissed(String(latest)); };
    return (
      <div style={{
        position: "fixed", left: 12, right: 12, zIndex: 2147482000,
        bottom: "calc(env(safe-area-inset-bottom) + 96px)",
        background: "#1F2A24", color: "#fff", borderRadius: 18, padding: "12px 12px 12px 14px",
        boxShadow: "0 10px 30px rgba(0,0,0,.3)", display: "flex", alignItems: "center", gap: 12, maxWidth: 520, margin: "0 auto",
      }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "#2F6B4A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sparkles size={19} strokeWidth={2.3} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Nouvelle version disponible</div>
          <div style={{ fontSize: 12.5, color: "#C9D6CE", lineHeight: 1.35 }}>
            {message || (native ? (apkUrl ? "Téléchargez-la pour profiter des dernières améliorations." : "Demandez-la à votre administrateur ou au Play Store.") : "Rechargez pour profiter des dernières améliorations.")}
          </div>
        </div>
        {actionLabel && (
          <button onClick={doUpdate} style={{ border: "none", borderRadius: 12, background: "#3E8E62", color: "#fff", fontSize: 13, fontWeight: 800, padding: "10px 12px", flexShrink: 0 }}>
            {native ? "Télécharger" : "Mettre à jour"}
          </button>
        )}
        <button onClick={close} aria-label="Fermer" style={{ border: "none", background: "transparent", color: "#C9D6CE", padding: 6, flexShrink: 0 }}>
          <X size={18} />
        </button>
      </div>
    );
  }
  return null;
}
