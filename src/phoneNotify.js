// src/phoneNotify.js
//
// Notifications du téléphone (barre de notifications Android) pour les
// activités de l'application : ventes, stock, dépenses, messages de
// l'assistance… Elles s'affichent même quand l'application est en
// arrière-plan (tant qu'Android ne l'a pas complètement fermée).
//
// Notifications LOCALES : aucun serveur push n'est nécessaire.

const CHANNEL_ID = "gestione-activite";
let plugin = null;
let ready = null;
let nextId = 100000 + (Date.now() % 50000);

async function isNative() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Préparation (une seule fois) : autorisation + canal Android.
export function preparePhoneNotifications() {
  if (ready) return ready;
  ready = (async () => {
    if (!(await isNative())) {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch { /* refus */ }
      }
      return typeof Notification !== "undefined" && Notification.permission === "granted" ? "web" : null;
    }
    try {
      const mod = await import("@capacitor/local-notifications");
      plugin = mod.LocalNotifications;
      let perm = await plugin.checkPermissions();
      if (perm.display !== "granted") perm = await plugin.requestPermissions();
      if (perm.display !== "granted") return null;
      try {
        await plugin.createChannel({ id: CHANNEL_ID, name: "Activités GestiOne", description: "Ventes, stock, messages de l'assistance", importance: 4, visibility: 1, vibration: true });
      } catch { /* ancienne version d'Android : pas de canal */ }
      return "native";
    } catch {
      return null;
    }
  })();
  return ready;
}

// Affiche une notification dans la barre du téléphone.
export async function phoneNotify(title, body = "", extra = {}) {
  const mode = await preparePhoneNotifications();
  if (!mode || !title) return;
  try {
    if (mode === "native" && plugin) {
      nextId = nextId >= 149999 ? 100000 : nextId + 1;
      await plugin.schedule({
        notifications: [{
          id: nextId,
          title: String(title).slice(0, 120),
          body: String(body || "").slice(0, 240),
          channelId: CHANNEL_ID,
          extra,
        }],
      });
    } else if (mode === "web" && document.visibilityState === "hidden") {
      new Notification(String(title), { body: String(body || "") });
    }
  } catch { /* notification impossible : sans conséquence */ }
}
