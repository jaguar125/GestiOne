// src/deviceInfo.js
//
// Décrit le téléphone sur lequel tourne GestiOne : nom (« Galaxy A15 »),
// marque, modèle (« SM-A155F »), version d'Android, et s'il s'agit de
// l'application installée (APK) ou du navigateur.
//
// hw_key : empreinte du téléphone, uniquement dans l'APK. Elle vient de
// l'identifiant Android de l'appareil (ANDROID_ID), qui ne change pas quand
// on se déconnecte, qu'on vide le cache ou qu'on réinstalle l'application.
// Elle est hachée avant d'être envoyée : le vrai identifiant ne quitte
// jamais le téléphone. C'est elle qui permet au serveur de reconnaître
// « le même téléphone » et de ne pas créer de doublon.

import { Capacitor } from "@capacitor/core";

const HW_SALT = "gestione:device:v1:";

// Préfixes de modèles courants en Afrique francophone → marque lisible.
const BRAND_PREFIXES = [
  [/^SM-/i, "Samsung"],
  [/^GT-/i, "Samsung"],
  [/^TECNO/i, "Tecno"],
  [/^itel/i, "itel"],
  [/^Infinix/i, "Infinix"],
  [/^CPH/i, "Oppo"],
  [/^RMX/i, "Realme"],
  [/^(Redmi|POCO|M2\d{3}|2\d{3}[A-Z0-9]{3,})/i, "Xiaomi"],
  [/^(Nokia|TA-)/i, "Nokia"],
  [/^(moto|XT\d)/i, "Motorola"],
  [/^(VOG|ELE|ANA|JNY|MAR|LYA|CLT|HMA|STK|JKM|POT|DUB)-/i, "Huawei"],
  [/^Pixel/i, "Google"],
  [/^V\d{4}/i, "Vivo"],
];

const tidy = (s) => String(s || "").replace(/\s+/g, " ").trim();
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function brandFromModel(model) {
  for (const [re, brand] of BRAND_PREFIXES) if (re.test(model)) return brand;
  return null;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function nativeInfo() {
  const { Device } = await import("@capacitor/device");
  const [info, id] = await Promise.all([Device.getInfo(), Device.getId().catch(() => null)]);
  const model = tidy(info.model);
  const brand = capitalize(tidy(info.manufacturer)) || brandFromModel(model);
  // « name » = nom du téléphone dans ses réglages (souvent « Galaxy A15 »).
  // On l'ignore s'il ne fait que répéter le modèle technique.
  let name = tidy(info.name);
  if (!name || name.toLowerCase() === model.toLowerCase()) name = null;
  const identifier = id?.identifier ? String(id.identifier) : "";
  return {
    model: model || null,
    name,
    brand: brand || null,
    os_version: info.osVersion ? `${info.operatingSystem === "ios" ? "iOS" : "Android"} ${info.osVersion}` : null,
    app_kind: "app",
    hw_key: identifier && crypto?.subtle ? await sha256Hex(HW_SALT + identifier) : null,
  };
}

async function browserInfo() {
  const ua = navigator.userAgent || "";
  let model = "";
  let osVersion = "";
  // Chrome Android : modèle exact via les « client hints ».
  try {
    if (navigator.userAgentData?.getHighEntropyValues) {
      const hv = await navigator.userAgentData.getHighEntropyValues(["model", "platformVersion"]);
      model = tidy(hv.model);
      if (hv.platformVersion && navigator.userAgentData.platform === "Android") {
        osVersion = `Android ${String(hv.platformVersion).split(".")[0]}`;
      }
    }
  } catch { /* indisponible */ }
  // Sinon, lecture de l'agent utilisateur (« Android 14; SM-A155F Build/… »).
  const m = ua.match(/Android\s+([\d.]+);\s*([^;)]+?)(?:\s+Build\/|\))/i);
  if (m) {
    if (!osVersion) osVersion = `Android ${m[1].split(".")[0]}`;
    // Chrome récent remplace le modèle par « K » : on ne le garde pas.
    if (!model && m[2] && m[2].trim().toUpperCase() !== "K") model = tidy(m[2]);
  }
  if (!osVersion && /iPhone|iPad/.test(ua)) {
    const v = ua.match(/OS (\d+)_/);
    osVersion = v ? `iOS ${v[1]}` : "iOS";
    if (!model) model = /iPad/.test(ua) ? "iPad" : "iPhone";
  }
  const brand = model ? (/^iP(hone|ad)$/.test(model) ? "Apple" : brandFromModel(model)) : null;
  return {
    model: model || null,
    name: null,
    brand,
    os_version: osVersion || null,
    app_kind: "navigateur",
    hw_key: null,
  };
}

let cached = null;

// Description du téléphone (mise en cache : elle ne change pas pendant la session).
export async function getDeviceInfo() {
  if (cached) return cached;
  try {
    cached = Capacitor.isNativePlatform() ? await nativeInfo() : await browserInfo();
  } catch {
    cached = { model: null, name: null, brand: null, os_version: null, app_kind: Capacitor.isNativePlatform() ? "app" : "navigateur", hw_key: null };
  }
  return cached;
}

// Nom lisible, pour l'affichage local (ex. « Samsung Galaxy A15 »).
export function deviceTitle(info) {
  if (!info) return "Téléphone";
  if (info.name) {
    const withBrand = info.brand && !info.name.toLowerCase().includes(info.brand.toLowerCase());
    return withBrand ? `${info.brand} ${info.name}` : info.name;
  }
  const parts = [info.brand, info.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "Téléphone";
}
