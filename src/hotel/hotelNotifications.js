// src/hotel/hotelNotifications.js
//
// Rappels de réservation programmés dans le téléphone (notifications
// LOCALES Android) : ils s'affichent à l'heure prévue même si l'application
// est fermée ou sans internet. L'annonce vocale, elle, est faite par
// l'application quand elle est ouverte (voir HotelApp).

const ID_BASE = 300000; // plage réservée aux rappels hôtel
const ID_SPAN = 90000;
const STORE_KEY = "hotelReminderIds";
let plugin = null;
let tried = false;

async function getPlugin() {
  if (tried) return plugin;
  tried = true;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    const mod = await import("@capacitor/local-notifications");
    plugin = mod.LocalNotifications;
    let perm = await plugin.checkPermissions();
    if (perm.display !== "granted") perm = await plugin.requestPermissions();
    if (perm.display !== "granted") plugin = null;
  } catch {
    plugin = null;
  }
  return plugin;
}

function idFor(resaId, hours) {
  let h = 0;
  const s = `${resaId}:${hours}`;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ID_BASE + (h % ID_SPAN);
}

// Reprogramme tous les rappels à venir (appelé à chaque changement des
// réservations). Les anciens rappels de l'hôtel sont annulés d'abord.
export async function scheduleHotelReminders(reservations, { hotelName = "Hôtel", hours = [5, 2], now = Date.now() } = {}) {
  const p = await getPlugin();
  if (!p) return;
  let previous = [];
  try { previous = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { previous = []; }
  try { if (previous.length) await p.cancel({ notifications: previous.map((id) => ({ id })) }); } catch { /* rien à annuler */ }
  const list = [];
  (reservations || []).forEach((r) => {
    if (!r || (r.status !== "confirmed" && r.status !== "pending")) return;
    const start = typeof r.start === "number" ? r.start : Date.parse(r.start);
    hours.forEach((h) => {
      if (r.reminders && r.reminders[`r${h}`] === false) return;
      const at = start - h * 3600000;
      if (!(at > now + 30000)) return;
      const when = new Date(start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      list.push({
        id: idFor(r.id, h),
        title: `Réservation dans ${h} heure${h > 1 ? "s" : ""}`,
        body: `${hotelName} · chambre ${r.roomNum} à ${when}${r.client ? ` · ${r.client}` : ""}`,
        schedule: { at: new Date(at), allowWhileIdle: true },
        channelId: "gestione-activite",
      });
    });
  });
  try {
    if (list.length) await p.schedule({ notifications: list.slice(0, 60) });
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 60).map((n) => n.id)));
  } catch { /* notifications indisponibles : l'appli rappelle quand elle est ouverte */ }
}
