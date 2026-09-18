// src/licenseNotifications.js
//
// Rappels de licence sur l'appareil (notification système, pas juste la
// cloche dans l'app). On planifie une notification locale PAR JOUR restant,
// à partir de 5 jours ou moins, jusqu'au jour d'expiration inclus — donc
// même si l'app reste fermée, le propriétaire ET les vendeurs sont alertés
// chaque jour.
//
// Remarque : ce sont des notifications LOCALES (planifiées sur l'appareil
// lui-même, via l'OS). Elles ne nécessitent aucun serveur push (Firebase),
// mais elles doivent être re-planifiées à chaque ouverture de l'app pour
// rester exactes si la licence est renouvelée entre-temps — c'est déjà fait
// automatiquement (voir l'appel dans App.jsx).

const REMINDER_WINDOW_DAYS = 5;
// Plage d'identifiants réservée à ces notifications, pour ne jamais entrer
// en collision avec d'autres notifications locales de l'app.
const ID_BASE = 90000;
const ID_EXPIRED = 90099;
const REMINDER_HOUR = 9; // heure locale à laquelle le rappel quotidien sonne

let LocalNotifications = null;
let loadAttempted = false;

// Chargement paresseux : le plugin natif n'existe que dans le build
// Capacitor (Android/iOS) — en aperçu web, on n'essaie même pas.
async function getPlugin() {
  if (loadAttempted) return LocalNotifications;
  loadAttempted = true;
  try {
    const mod = await import("@capacitor/local-notifications");
    LocalNotifications = mod.LocalNotifications;
  } catch {
    LocalNotifications = null;
  }
  return LocalNotifications;
}

export async function ensureLicenseNotificationPermission() {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const current = await plugin.checkPermissions();
    if (current.display === "granted") return true;
    const requested = await plugin.requestPermissions();
    return requested.display === "granted";
  } catch {
    return false;
  }
}

function atLocalHour(baseDate, hour) {
  const d = new Date(baseDate);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Annule tous les rappels de licence précédemment planifiés, pour repartir
// sur une planification propre (ex : après renouvellement du code).
async function cancelAllLicenseNotifications(plugin) {
  try {
    const pending = await plugin.getPending();
    const ours = (pending?.notifications || []).filter((n) => n.id >= ID_BASE && n.id <= ID_EXPIRED);
    if (ours.length) await plugin.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  } catch { /* pas grave si la liste échoue, on planifie quand même la suite */ }
}

/**
 * Planifie les rappels de licence sur l'appareil, pour le propriétaire
 * COMME pour les vendeurs (chaque appareil connecté à la boutique doit
 * appeler cette fonction une fois sa licence connue).
 *
 * - Essai gratuit ou licence payante à ≤ 5 jours de la fin : un rappel
 *   chaque jour restant, jusqu'à épuisement.
 * - Licence déjà expirée : une notification immédiate + une piqûre de
 *   rappel quotidienne tant que le compte n'est pas réactivé.
 */
export async function scheduleLicenseReminders({ license, isOwner }) {
  const plugin = await getPlugin();
  if (!plugin) return;
  if (!license || license.lifetime) { await cancelAllLicenseNotifications(plugin); return; }
  if (!(await ensureLicenseNotificationPermission())) return;

  await cancelAllLicenseNotifications(plugin);
  if (!license.expiresAt) return;

  const MS_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const expiresAt = new Date(license.expiresAt).getTime();
  const daysLeft = Math.ceil((expiresAt - now) / MS_DAY);
  const isTrial = !license.planId || license.planId === "trial";
  const what = isTrial ? "Votre essai gratuit" : "Votre licence";

  const notifications = [];

  if (daysLeft < 0) {
    // Expirée : rappel immédiat, et un rappel chaque jour tant que ce n'est
    // pas réactivé (planifié 10 jours à l'avance ; re-planifié à chaque
    // ouverture de l'app tant que rien n'a changé).
    const ownerBody = "L'entreprise est verrouillée. Activez une nouvelle licence pour redonner accès au propriétaire et aux vendeurs.";
    const vendorBody = "L'entreprise est verrouillée en attendant le renouvellement de la licence par le propriétaire.";
    for (let i = 0; i < 10; i++) {
      notifications.push({
        id: ID_EXPIRED - i,
        title: `${what} est expirée`,
        body: isOwner ? ownerBody : vendorBody,
        schedule: i === 0 ? { at: new Date(now + 2000) } : { at: atLocalHour(now + i * MS_DAY, REMINDER_HOUR) },
      });
    }
  } else if (daysLeft <= REMINDER_WINDOW_DAYS) {
    // De "maintenant" jusqu'au jour de l'expiration inclus.
    for (let d = daysLeft; d >= 0; d--) {
      const dayDate = d === daysLeft ? new Date(now + 2000) : atLocalHour(now + (daysLeft - d) * MS_DAY, REMINDER_HOUR);
      const label = d === 0 ? "expire aujourd'hui" : d === 1 ? "expire demain" : `expire dans ${d} jours`;
      notifications.push({
        id: ID_BASE + d,
        title: `${what} ${label}`,
        body: isOwner
          ? "Activez une licence pour ne pas perdre l'accès à la boutique."
          : "Préviens le propriétaire pour qu'il renouvelle la licence à temps.",
        schedule: { at: dayDate },
      });
    }
  }

  if (notifications.length) {
    try { await plugin.schedule({ notifications }); } catch { /* silencieux : pas bloquant pour l'app */ }
  }
}
