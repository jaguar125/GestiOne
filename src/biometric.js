// src/biometric.js — GestiOne
//
// Déverrouillage administrateur par empreinte digitale ou visage (plugin
// natif maison « GbBiometric », application Android uniquement).
// Rien n'est stocké sur l'appareil à part un indicateur « activé » par
// entreprise : ni le code administrateur, ni l'empreinte (Android répond
// seulement reconnu / pas reconnu). Pour activer, le code administrateur
// est demandé une fois.
import { Capacitor, registerPlugin } from "@capacitor/core";

const GbBiometric = registerPlugin("GbBiometric");
const key = (shopId) => `gestione:bioAdmin:${shopId}`;

export const bioIsNative = () => { try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"; } catch { return false; } };

export async function bioStatus() {
  if (!bioIsNative()) return { available: false, enrolled: false, hardware: false };
  try { return await GbBiometric.isAvailable(); } catch { return { available: false, enrolled: false, hardware: false }; }
}

export async function bioAuth(subtitle = "Posez votre doigt sur le capteur") {
  if (!bioIsNative()) return false;
  try { const r = await GbBiometric.authenticate({ title: "Déverrouiller GestiOne", subtitle, cancel: "Utiliser le code" }); return !!r?.ok; } catch { return false; }
}

export const bioEnabled = (shopId) => { try { return !!shopId && localStorage.getItem(key(shopId)) === "1"; } catch { return false; } };
export const setBioEnabled = (shopId, on) => { try { if (on) localStorage.setItem(key(shopId), "1"); else localStorage.removeItem(key(shopId)); } catch { /* stockage indisponible */ } };
