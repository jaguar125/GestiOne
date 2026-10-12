// src/hotel/hotelLogic.js
//
// Règles métier du type d'entreprise « Hôtel » (sans affichage) :
// chambres ventilées / climatisées, forfaits libres (passage 1 h, 2 h…,
// nuitée jusqu'au lendemain à l'heure de départ), séjours en cours,
// réservations (chambre bloquée sur le créneau), ménage, caisse du jour.
// Fonctions pures, testables sans React.

export const HOTEL_KEYS = ["hotelRooms", "hotelTariffs", "hotelStays", "hotelReservations"];

export const ROOM_TYPES = {
  vent: { id: "vent", label: "Ventilée", plural: "Ventilées", short: "VENT", ink: "#0B7A6E", tint: "#E2F5F2", soft: "#ECF8F6", line: "#BFE7E0" },
  clim: { id: "clim", label: "Climatisée", plural: "Climatisées", short: "CLIM", ink: "#2457B8", tint: "#E7EEFD", soft: "#EEF3FE", line: "#C7D7F8" },
};
export const roomTypeOf = (t) => ROOM_TYPES[t] || ROOM_TYPES.vent;

export const DEFAULT_HOTEL_SETTINGS = {
  checkoutTime: "12:30", // départ des nuitées, le lendemain
  graceMinutes: 15, // tolérance avant de compter une heure de dépassement
  unitPrice: { vent: 2000, clim: 3000 }, // prix de l'heure (référence, prolongation)
  cleaningRequired: true, // une chambre libérée passe au ménage
  voiceAlerts: true, // annonces vocales (fin de séjour, rappels)
  releaseNotify: true, // notification écrite quand une chambre est libérée
  releaseVoice: true, // annonce vocale quand une chambre est libérée
  endAlertMinutes: 5, // alerte avant la fin d'un séjour
  reminderHours: [5, 2], // rappels de réservation
  syncMinutes: 10, // synchronisation complète automatique
  // Reçus : logo (image réduite), en-tête, message de politesse, papier.
  receipt: { logo: null, name: "", address: "", phone: "", message: "", paper: "58", ask: true },
};

export function hotelSettingsOf(shop) {
  const s = (shop && shop.hotelSettings) || {};
  return {
    ...DEFAULT_HOTEL_SETTINGS,
    ...s,
    unitPrice: { ...DEFAULT_HOTEL_SETTINGS.unitPrice, ...(s.unitPrice || {}) },
    reminderHours: Array.isArray(s.reminderHours) && s.reminderHours.length ? s.reminderHours : DEFAULT_HOTEL_SETTINGS.reminderHours,
    receipt: { ...DEFAULT_HOTEL_SETTINGS.receipt, ...(s.receipt || {}) },
  };
}

// Message annoncé quand une chambre est libérée.
export function releaseMessage(roomNum, cleaningRequired) {
  return cleaningRequired
    ? `La chambre numéro ${roomNum} vient d'être libérée et a besoin de ménage.`
    : `La chambre numéro ${roomNum} vient d'être libérée. Elle est de nouveau disponible.`;
}

const rid = () => Math.random().toString(36).slice(2, 10);
export const HOUR = 3600000;
export const DAY = 24 * HOUR;

// Forfaits proposés à la création de l'hôtel : le propriétaire les modifie
// ensuite librement (heures et prix) dans Réglages › Tarifs & forfaits.
export function defaultTariffs(now = Date.now()) {
  const at = new Date(now).toISOString();
  const mk = (type, name, hours, price) => ({ id: rid(), type, name, hours, price, active: true, createdAt: at, updatedAt: at });
  return [
    mk("vent", "Passage 1 h", 1, 2000), mk("vent", "Forfait 2 h", 2, 3500), mk("vent", "Forfait 3 h", 3, 5000), mk("vent", "Nuitée", 0, 10000),
    mk("clim", "Passage 1 h", 1, 3000), mk("clim", "Forfait 2 h", 2, 5000), mk("clim", "Forfait 3 h", 3, 7500), mk("clim", "Nuitée", 0, 15000),
  ];
}

export function tariffName(hours) {
  if (!hours) return "Nuitée";
  return hours === 1 ? "Passage 1 h" : `Forfait ${hours} h`;
}

export function parseHM(hm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || "").trim());
  if (!m) return { h: 12, m: 30 };
  return { h: Math.min(23, Number(m[1])), m: Math.min(59, Number(m[2])) };
}
export const pad2 = (n) => String(n).padStart(2, "0");
export const hmOf = (ms) => { const d = new Date(ms); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

// Heure de départ d'une nuitée : le lendemain à l'heure fixée (12:30 par
// défaut). Arrivée en pleine nuit (avant 6 h) : départ le jour même.
export function nightCheckout(startMs, checkoutTime = "12:30") {
  const { h, m } = parseHM(checkoutTime);
  const d = new Date(startMs);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0).getTime();
  if (d.getHours() < 6 && target > startMs) return target;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, h, m, 0, 0).getTime();
}

export function computeEnd(startMs, tariff, settings = DEFAULT_HOTEL_SETTINGS) {
  const hours = Number(tariff && tariff.hours) || 0;
  if (hours > 0) return startMs + hours * HOUR;
  return nightCheckout(startMs, settings.checkoutTime);
}

export const isNight = (x) => !(Number(x && x.hours) > 0);
export const toMs = (v) => (typeof v === "number" ? v : Date.parse(v));

export function stayTotal(stay) {
  const base = Number(stay && stay.price) || 0;
  const ext = (stay && stay.extensions || []).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const extras = (stay && stay.extras || []).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  return base + ext + extras;
}
export function stayPaid(stay) {
  return (stay && stay.payments || []).reduce((t, p) => t + (Number(p.amount) || 0), 0);
}
export const stayDue = (stay) => Math.max(0, stayTotal(stay) - stayPaid(stay));

export const isActiveStay = (s) => s && s.status === "active";
export const isLiveResa = (r) => r && (r.status === "confirmed" || r.status === "pending");

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Conflits d'une chambre sur un créneau : séjours en cours (jusqu'à leur
// fin prévue, ou maintenant s'ils sont dépassés) et réservations actives.
export function roomConflicts(roomId, startMs, endMs, { stays = [], reservations = [], now = Date.now(), excludeStayId = null, excludeResaId = null } = {}) {
  const out = [];
  stays.forEach((s) => {
    if (!isActiveStay(s) || s.roomId !== roomId || s.id === excludeStayId) return;
    const sStart = toMs(s.start);
    const sEnd = Math.max(toMs(s.end), now + 60000);
    if (overlaps(startMs, endMs, sStart, sEnd)) out.push({ kind: "stay", item: s, start: sStart, end: sEnd });
  });
  reservations.forEach((r) => {
    if (!isLiveResa(r) || r.roomId !== roomId || r.id === excludeResaId) return;
    const rStart = toMs(r.start);
    const rEnd = toMs(r.end);
    if (overlaps(startMs, endMs, rStart, rEnd)) out.push({ kind: "resa", item: r, start: rStart, end: rEnd });
  });
  return out;
}

// État d'une chambre à un instant donné, pour le plan et l'accueil.
export function roomState(room, { stays = [], reservations = [], now = Date.now() } = {}) {
  const stay = stays.find((s) => isActiveStay(s) && s.roomId === room.id) || null;
  const upcoming = reservations
    .filter((r) => isLiveResa(r) && r.roomId === room.id && toMs(r.end) > now)
    .sort((a, b) => toMs(a.start) - toMs(b.start));
  const nextResa = upcoming[0] || null;
  if (room.outOfService) return { kind: "hs", stay: null, nextResa };
  if (stay) {
    const end = toMs(stay.end);
    return { kind: now > end ? "depassee" : "occupee", stay, nextResa, remaining: end - now, end };
  }
  if (room.cleaning && room.cleaning.state && room.cleaning.state !== "done") return { kind: "menage", stay: null, nextResa };
  // Créneau réservé en cours (le client est attendu) : la chambre est bloquée.
  if (nextResa && toMs(nextResa.start) - 30 * 60000 <= now) return { kind: "reservee", stay: null, nextResa };
  return { kind: "libre", stay: null, nextResa };
}

export const STATE_STYLE = {
  libre: { label: "Libre", dot: "#16A34A", ink: "#15803D", bg: "#FFFFFF", line: "#C9EBD5" },
  occupee: { label: "Occupée", dot: "#DC2626", ink: "#B91C1C", bg: "#FFFFFF", line: "#F5C2C2" },
  depassee: { label: "Dépassée", dot: "#EA7A0C", ink: "#C2410C", bg: "#FFF4E6", line: "#F7C58A" },
  menage: { label: "Ménage", dot: "#7C5CE6", ink: "#5B3CC4", bg: "#F7F4FF", line: "#DCD1FC" },
  reservee: { label: "Réservée", dot: "#4F46E5", ink: "#3730A3", bg: "#F5F5FF", line: "#C7CBFA" },
  hs: { label: "Hors service", dot: "#94A3B8", ink: "#475569", bg: "#EEF1F5", line: "#DCE1E8" },
};

export function sortRooms(rooms) {
  return [...(rooms || [])].sort((a, b) => String(a.num).localeCompare(String(b.num), "fr", { numeric: true }));
}

// Chambres libres pour un créneau (aucun séjour ni réservation qui chevauche).
export function freeRoomsFor(rooms, type, startMs, endMs, ctx) {
  return sortRooms(rooms).filter((r) => {
    if (r.type !== type || r.outOfService) return false;
    const st = roomState(r, ctx);
    const startsNow = Math.abs(startMs - (ctx.now || Date.now())) < 5 * 60000;
    if (startsNow && st.kind !== "libre" && st.kind !== "reservee") return false;
    return roomConflicts(r.id, startMs, endMs, ctx).length === 0;
  });
}

export function addRoomRange(rooms, type, from, to, now = Date.now()) {
  const existing = new Set((rooms || []).map((r) => String(r.num).trim().toLowerCase()));
  const lo = Math.min(Number(from), Number(to));
  const hi = Math.max(Number(from), Number(to));
  const added = [];
  const skipped = [];
  for (let n = lo; n <= hi && added.length + skipped.length < 200; n += 1) {
    const num = String(n);
    if (existing.has(num)) { skipped.push(num); continue; }
    existing.add(num);
    added.push({ id: rid(), num, type, outOfService: false, cleaning: null, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() });
  }
  return { rooms: [...(rooms || []), ...added], added, skipped };
}

// ---------- Caisse du jour ----------
export function dayBounds(ms = Date.now()) {
  const d = new Date(ms);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return [start, start + DAY];
}
export const localDayKey = (ms = Date.now()) => { const d = new Date(ms); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };

export function hotelCashForDay({ stays = [], expenses = [], reservations = [], now = Date.now() }) {
  const [from, to] = dayBounds(now);
  const dayKey = localDayKey(now);
  let total = 0, cash = 0, momo = 0, passages = 0, nuitees = 0;
  const operations = [];
  stays.forEach((s) => {
    const startMs = toMs(s.start);
    if (startMs >= from && startMs < to && s.status !== "cancelled") { if (isNight(s)) nuitees += 1; else passages += 1; }
    (s.payments || []).forEach((p) => {
      const at = toMs(p.at);
      if (!(at >= from && at < to)) return;
      const amount = Number(p.amount) || 0;
      total += amount;
      if (p.mode === "momo") momo += amount; else cash += amount;
      operations.push({ id: `${s.id}-${p.id || at}`, at, amount, mode: p.mode, op: p.op || "", roomNum: s.roomNum, label: p.label || s.tariffName, by: p.by || s.by || "" });
    });
  });
  // Acomptes de réservation déjà reçus (le client n'est pas encore arrivé :
  // à son arrivée, l'acompte passe dans le séjour).
  (reservations || []).forEach((r) => {
    const dep = Number(r && r.deposit) || 0;
    if (!dep || !r.depositAt || r.status === "arrived") return;
    const at = toMs(r.depositAt);
    if (!(at >= from && at < to)) return;
    total += dep;
    if (r.depositMode === "momo") momo += dep; else cash += dep;
    operations.push({ id: `dep-${r.id}`, at, amount: dep, mode: r.depositMode, op: r.depositOp || "", roomNum: r.roomNum, label: "Acompte réservation", by: r.by || "" });
  });
  // Acomptes remboursés (réservation annulée par le propriétaire).
  (reservations || []).forEach((r) => {
    const ref = r && r.refund;
    if (!ref || !(Number(ref.amount) > 0)) return;
    const at = toMs(ref.at);
    if (!(at >= from && at < to)) return;
    const amount = -Number(ref.amount);
    total += amount;
    if (ref.mode === "momo") momo += amount; else cash += amount;
    operations.push({ id: `ref-${r.id}`, at, amount, mode: ref.mode, roomNum: r.roomNum, label: "Remboursement acompte", by: ref.by || "" });
  });
  const pendingOut = stays.filter(isActiveStay).map((s) => ({ stay: s, due: stayDue(s) })).filter((x) => x.due > 0);
  const dayExpenses = (expenses || []).filter((e) => e && (e.date === dayKey || (e.createdAt && localDayKey(toMs(e.createdAt)) === dayKey)));
  const expensesTotal = dayExpenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
  operations.sort((a, b) => b.at - a.at);
  return { total, cash, momo, passages, nuitees, operations, pendingOut, pendingTotal: pendingOut.reduce((t, x) => t + x.due, 0), dayExpenses, expensesTotal, net: total - expensesTotal };
}

// ---------- Rappels et alertes ----------
// Rappels de réservation (5 h et 2 h avant par défaut) dus maintenant.
export function remindersDue(reservations, now = Date.now(), hours = [5, 2]) {
  const out = [];
  (reservations || []).forEach((r) => {
    if (!isLiveResa(r)) return;
    const start = toMs(r.start);
    if (!(start > now)) return;
    hours.forEach((h) => {
      const key = `r${h}`;
      if (r.reminders && r.reminders[key] === false) return;
      if (r.notified && r.notified[key]) return;
      if (now >= start - h * HOUR) out.push({ resa: r, hours: h, key });
    });
  });
  // Un seul rappel par réservation à la fois : le plus proche de l'arrivée.
  const best = new Map();
  out.forEach((x) => { const cur = best.get(x.resa.id); if (!cur || x.hours < cur.hours) best.set(x.resa.id, x); });
  return [...best.values()];
}

// Séjours qui finissent bientôt (alerte) ou dont le temps vient d'expirer.
export function stayAlertsDue(stays, now = Date.now(), minutesBefore = 5) {
  const soon = [];
  const ended = [];
  (stays || []).forEach((s) => {
    if (!isActiveStay(s)) return;
    const end = toMs(s.end);
    const left = end - now;
    if (left <= 0 && left > -10 * 60000) ended.push(s);
    else if (left > 0 && left <= minutesBefore * 60000) soon.push(s);
  });
  return { soon, ended };
}

// Prix d'une prolongation d'une heure : prix de l'heure du type de chambre.
export function extensionPrice(stay, settings = DEFAULT_HOTEL_SETTINGS) {
  return Number(settings.unitPrice && settings.unitPrice[stay.type]) || 0;
}

// Heures de dépassement facturables (heure entamée après la tolérance).
export function overtimeHours(stay, now = Date.now(), graceMinutes = 15) {
  const over = now - toMs(stay.end);
  if (over <= graceMinutes * 60000) return 0;
  return Math.ceil(over / HOUR);
}

export function fmtClock(ms) {
  const neg = ms < 0;
  const a = Math.abs(Math.round(ms / 1000));
  const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), s = a % 60;
  return `${neg ? "+" : ""}${h ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`}`;
}
export function fmtShort(ms) {
  const neg = ms < 0;
  const a = Math.abs(Math.round(ms / 60000));
  const h = Math.floor(a / 60), m = a % 60;
  return `${neg ? "+" : ""}${h ? `${h} h ${pad2(m)}` : `${m} min`}`;
}
export function dayLabel(ms, now = Date.now()) {
  const [today] = dayBounds(now);
  const diff = Math.floor((dayBounds(ms)[0] - today) / DAY);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "demain";
  if (diff === -1) return "hier";
  return new Date(ms).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}


// ---------- Reçus ----------
// Numéro lisible et unique sans serveur : date + compteur du téléphone +
// code du téléphone (2 caractères), ex. 261011-007K3.
function deviceCode() {
  try {
    let c = localStorage.getItem("hotelDeviceCode");
    if (!c) { c = Math.random().toString(36).slice(2, 4).toUpperCase().padEnd(2, "X"); localStorage.setItem("hotelDeviceCode", c); }
    return c;
  } catch { return "XX"; }
}
export function nextReceiptNo(now = Date.now()) {
  const d = new Date(now);
  const day = `${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  let n = 1;
  try { const k = `hotelRcptSeq:${day}`; n = (Number(localStorage.getItem(k)) || 0) + 1; localStorage.setItem(k, String(n)); } catch { n = Math.floor(Math.random() * 900) + 100; }
  return `${day}-${String(n).padStart(3, "0")}${deviceCode()}`;
}

// Lignes facturées d'un séjour (forfait, prolongations, consommations).
export function stayLines(stay) {
  const lines = [{ label: `${stay.tariffName || "Séjour"} (${stay.type === "clim" ? "clim" : "ventilée"})`, amount: Number(stay.price) || 0 }];
  (stay.extensions || []).forEach((e) => lines.push({ label: e.kind === "night" ? "Passage en nuitée" : `Prolongation +${e.hours || 1} h`, amount: Number(e.amount) || 0 }));
  const extras = {};
  (stay.extras || []).forEach((x) => { const k = x.label || "Consommation"; extras[k] = (extras[k] || 0) + (Number(x.amount) || 0); });
  Object.entries(extras).forEach(([label, amount]) => lines.push({ label, amount }));
  return lines.filter((l) => l.amount > 0 || l === lines[0]);
}

// Reçu d'un séjour (photo figée au moment de l'encaissement).
export function makeStayReceipt(stay, { kind = "start", amount = 0, given = null, mode = "cash", op = "", by = "", at = Date.now() } = {}) {
  const total = stayTotal(stay);
  const paidAfter = stayPaid(stay);
  const paidBefore = Math.max(0, paidAfter - amount);
  const g = mode === "cash" && given != null && Number(given) >= amount ? Number(given) : amount;
  return {
    id: rid(), no: nextReceiptNo(at), at, by, kind, src: "stay", srcId: stay.id,
    roomNum: stay.roomNum, type: stay.type, tariffName: stay.tariffName, hours: Number(stay.hours) || 0,
    start: toMs(stay.start), end: toMs(stay.end), client: stay.client || "", phone: stay.phone || "",
    lines: stayLines(stay), total, paidBefore, amount, given: g, change: Math.max(0, g - amount), mode, op: mode === "momo" ? op : "",
    rest: Math.max(0, total - paidAfter), status: "ok",
  };
}

// Reçu d'une réservation (acompte éventuel, reste à payer à l'arrivée).
export function makeResaReceipt(resa, { by = "", at = Date.now(), given = null } = {}) {
  const price = Number(resa.price) || 0;
  const dep = Math.min(price, Number(resa.deposit) || 0);
  const g = given != null && Number(given) >= dep ? Number(given) : dep;
  return {
    id: rid(), no: nextReceiptNo(at), at, by, kind: "resa", src: "resa", srcId: resa.id,
    roomNum: resa.roomNum, type: resa.type, tariffName: resa.tariffName, hours: Number(resa.hours) || 0,
    start: toMs(resa.start), end: toMs(resa.end), client: resa.client || "", phone: resa.phone || "",
    lines: [{ label: `${resa.tariffName || "Séjour"} (${resa.type === "clim" ? "clim" : "ventilée"})`, amount: price }],
    total: price, paidBefore: 0, amount: dep, given: g, change: Math.max(0, g - dep), mode: dep > 0 ? (resa.depositMode || "cash") : "later", op: dep > 0 && resa.depositMode === "momo" ? resa.depositOp || "Wave" : "",
    rest: Math.max(0, price - dep), status: "ok",
  };
}

export function allReceipts(stays = [], reservations = []) {
  const out = [];
  stays.forEach((s) => (s.receipts || []).forEach((r) => out.push(r)));
  reservations.forEach((x) => (x.receipts || []).forEach((r) => out.push(r)));
  return out.sort((a, b) => toMs(b.at) - toMs(a.at));
}

export function durationLabel(r) {
  const h = Number(r.hours) || 0;
  if (h > 0) return `${h} heure${h > 1 ? "s" : ""}`;
  const nights = Math.max(1, Math.round((toMs(r.end) - toMs(r.start)) / DAY));
  return `${nights} nuit${nights > 1 ? "s" : ""}`;
}

// ---------- Rapports (propriétaire) ----------
// Jour local "AAAA-MM-JJ" → début du jour en ms.
export function dayKeyToMs(k) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || ""));
  if (!m) return NaN;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}
const expenseAt = (e) => { const d = dayKeyToMs(e && e.date); return Number.isFinite(d) ? d + 12 * HOUR : toMs(e && e.createdAt); };

// Recettes, dépenses et opérations sur une période [from, to[.
export function hotelFinance({ stays = [], reservations = [], expenses = [], from, to }) {
  const inRange = (t) => t >= from && t < to;
  let income = 0, cash = 0, momo = 0, refunds = 0;
  const byUser = {}, byType = { vent: 0, clim: 0 }, byRoom = {}, expByCat = {};
  const payments = [];
  const add = (amount, mode, by, roomNum, type, at, label, ref) => {
    income += amount;
    if (amount < 0) refunds += -amount;
    if (mode === "momo") momo += amount; else cash += amount;
    if (by) byUser[by] = (byUser[by] || 0) + amount;
    if (type === "clim" || type === "vent") byType[type] += amount;
    if (roomNum != null) byRoom[roomNum] = (byRoom[roomNum] || 0) + amount;
    payments.push({ at, amount, mode, by, roomNum, type, label, ref });
  };
  stays.forEach((s) => (s.payments || []).forEach((p) => {
    const at = toMs(p.at);
    if (inRange(at)) add(Number(p.amount) || 0, p.mode, p.by || s.by, s.roomNum, s.type, at, p.label || s.tariffName, s);
  }));
  reservations.forEach((r) => {
    const dep = Number(r.deposit) || 0;
    if (dep && r.depositAt && r.status !== "arrived" && inRange(toMs(r.depositAt))) add(dep, r.depositMode, r.by, r.roomNum, r.type, toMs(r.depositAt), "Acompte réservation", r);
    if (r.refund && Number(r.refund.amount) > 0 && inRange(toMs(r.refund.at))) add(-Number(r.refund.amount), r.refund.mode, r.refund.by, r.roomNum, r.type, toMs(r.refund.at), "Remboursement acompte", r);
  });
  const exp = (expenses || []).filter((e) => inRange(expenseAt(e)));
  exp.forEach((e) => { const c = e.category || "Autre"; expByCat[c] = (expByCat[c] || 0) + (Number(e.amount) || 0); });
  const expensesTotal = exp.reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const started = stays.filter((s) => inRange(toMs(s.start)));
  const live = started.filter((s) => s.status !== "cancelled");
  const counts = {
    pass: live.filter((s) => !isNight(s)).length,
    night: live.filter((s) => isNight(s)).length,
    resa: reservations.filter((r) => inRange(toMs(r.createdAt || r.start))).length,
    cancel: started.filter((s) => s.status === "cancelled").length + reservations.filter((r) => (r.status === "cancelled" || r.status === "deleted") && inRange(toMs(r.cancelledAt || r.updatedAt))).length,
  };
  return { income, cash, momo, refunds, expensesTotal, net: income - expensesTotal, payments, expenses: exp, byUser, byType, byRoom, expByCat, counts };
}

// Journal chronologique (historique) : séjours, prolongations,
// réservations, dépenses, annulations.
export function hotelEvents({ stays = [], reservations = [], expenses = [], from, to }) {
  const ev = [];
  const inRange = (t) => t >= from && t < to;
  stays.forEach((s) => {
    const st = toMs(s.start);
    if (inRange(st)) ev.push({ id: `s-${s.id}`, k: isNight(s) ? "night" : "pass", at: st, title: `${s.tariffName} · Ch. ${s.roomNum} (${s.type === "clim" ? "clim" : "vent"})`, sub: [s.by, s.client, s.status === "active" ? "en cours" : null].filter(Boolean).join(" · "), amount: stayTotal(s), cancelled: s.status === "cancelled", stay: s });
    (s.extensions || []).forEach((e) => { const at = toMs(e.at); if (inRange(at)) ev.push({ id: `e-${e.id}`, k: "ext", at, title: `${e.kind === "night" ? "Passage en nuitée" : `Prolongation +${e.hours || 1} h`} · Ch. ${s.roomNum}`, sub: e.by || "", amount: Number(e.amount) || 0, cancelled: s.status === "cancelled", stay: s }); });
    (s.extras || []).forEach((e) => { const at = toMs(e.at); if (inRange(at)) ev.push({ id: `x-${e.id}`, k: "ext", at, title: `${e.label} · Ch. ${s.roomNum}`, sub: e.by || "", amount: Number(e.amount) || 0, cancelled: s.status === "cancelled", stay: s }); });
    if (s.status === "cancelled" && inRange(toMs(s.cancelledAt))) ev.push({ id: `c-${s.id}`, k: "cancel", at: toMs(s.cancelledAt), title: `Séjour annulé · Ch. ${s.roomNum}`, sub: [s.cancelledBy, s.cancelReason, s.refunded ? `remboursé ${s.refunded}` : null].filter(Boolean).join(" · "), amount: stayTotal(s), cancelled: true, stay: s });
  });
  reservations.forEach((r) => {
    const at = toMs(r.createdAt || r.start);
    if (inRange(at)) ev.push({ id: `r-${r.id}`, k: "resa", at, title: `Réservation · Ch. ${r.roomNum} (${r.type === "clim" ? "clim" : "vent"})`, sub: [r.by, r.client, `arrivée ${new Date(toMs(r.start)).toLocaleDateString("fr-FR")} ${hmOf(toMs(r.start))}`].filter(Boolean).join(" · "), amount: Number(r.deposit) || 0, amountNote: Number(r.deposit) ? "acompte" : "", cancelled: r.status === "cancelled" || r.status === "deleted", resa: r });
    if ((r.status === "cancelled" || r.status === "deleted") && inRange(toMs(r.cancelledAt || r.updatedAt))) ev.push({ id: `rc-${r.id}`, k: "cancel", at: toMs(r.cancelledAt || r.updatedAt), title: `Réservation ${r.status === "deleted" ? "supprimée" : "annulée"} · Ch. ${r.roomNum}`, sub: [r.cancelledBy, r.cancelReason].filter(Boolean).join(" · "), amount: Number(r.price) || 0, cancelled: true, resa: r });
  });
  (expenses || []).forEach((e) => { const at = toMs(e.createdAt) || expenseAt(e); if (inRange(expenseAt(e))) ev.push({ id: `d-${e.id}`, k: "exp", at, title: `Dépense · ${e.label || e.category || ""}`, sub: [e.author, e.category].filter(Boolean).join(" · "), amount: Number(e.amount) || 0 }); });
  return ev.sort((a, b) => b.at - a.at);
}

// Heures d'occupation réelles d'un séjour dans [from, to[.
export function occupiedMs(s, from, to, now = Date.now()) {
  if (s.status === "cancelled") return 0;
  const st = toMs(s.start);
  const en = s.status === "active" ? now : toMs(s.releasedAt) || toMs(s.end);
  const a = Math.max(st, from), b = Math.min(en, to, now);
  return Math.max(0, b - a);
}

export function hotelOccupancy({ stays = [], rooms = [], from, to, now = Date.now() }) {
  const n = rooms.length || 1;
  const span = Math.max(HOUR, Math.min(to, now) - from);
  const used = stays.reduce((t, s) => t + occupiedMs(s, from, to, now), 0);
  const days = [];
  for (let d = from; d < to && days.length < 62; d += DAY) {
    const e = Math.min(d + DAY, to);
    const sp = Math.min(e, now) - d;
    if (sp <= 0) { days.push({ d, pct: null }); continue; }
    const u = stays.reduce((t, s) => t + occupiedMs(s, d, e, now), 0);
    days.push({ d, pct: Math.min(100, Math.round((u / (n * sp)) * 100)) });
  }
  const started = stays.filter((s) => s.status !== "cancelled" && toMs(s.start) >= from && toMs(s.start) < to);
  const soldMs = started.reduce((t, s) => t + Math.max(0, toMs(s.end) - toMs(s.start)), 0);
  const nightMs = started.filter(isNight).reduce((t, s) => t + Math.max(0, toMs(s.end) - toMs(s.start)), 0);
  const perRoom = {};
  rooms.forEach((r) => { perRoom[r.id] = { room: r, stays: 0, ms: 0 }; });
  started.forEach((s) => { const x = perRoom[s.roomId] || (perRoom[s.roomId] = { room: { id: s.roomId, num: s.roomNum, type: s.type }, stays: 0, ms: 0 }); x.stays += 1; x.ms += Math.max(0, toMs(s.end) - toMs(s.start)); });
  const perType = { vent: { stays: 0, rooms: rooms.filter((r) => r.type === "vent").length }, clim: { stays: 0, rooms: rooms.filter((r) => r.type === "clim").length } };
  started.forEach((s) => { if (perType[s.type]) perType[s.type].stays += 1; });
  ["vent", "clim"].forEach((t) => {
    const rs = rooms.filter((r) => r.type === t);
    const u = stays.filter((s) => s.type === t).reduce((a, s) => a + occupiedMs(s, from, to, now), 0);
    perType[t].pct = rs.length ? Math.min(100, Math.round((u / (rs.length * span)) * 100)) : 0;
  });
  return { pct: Math.min(100, Math.round((used / (n * span)) * 100)), days, stays: started.length, soldHours: Math.round(soldMs / HOUR), nightHours: Math.round(nightMs / HOUR), perRoom: Object.values(perRoom), perType };
}

// Périodes pour les bénéfices : mois, trimestre, semestre, année.
export function periodBounds(mode, anchorMs, offset = 0) {
  const d = new Date(anchorMs);
  const y = d.getFullYear(), m = d.getMonth();
  if (mode === "month") { const a = new Date(y, m + offset, 1); return { from: a.getTime(), to: new Date(a.getFullYear(), a.getMonth() + 1, 1).getTime(), label: a.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), short: a.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") }; }
  if (mode === "quarter") { const q = Math.floor(m / 3) + offset; const a = new Date(y, q * 3, 1); const qi = Math.floor(a.getMonth() / 3) + 1; return { from: a.getTime(), to: new Date(a.getFullYear(), a.getMonth() + 3, 1).getTime(), label: `${qi}${qi === 1 ? "er" : "e"} trimestre ${a.getFullYear()}`, short: `T${qi}` }; }
  if (mode === "semester") { const sIdx = Math.floor(m / 6) + offset; const a = new Date(y, sIdx * 6, 1); const si = a.getMonth() < 6 ? 1 : 2; return { from: a.getTime(), to: new Date(a.getFullYear(), a.getMonth() + 6, 1).getTime(), label: `${si}${si === 1 ? "er" : "e"} semestre ${a.getFullYear()}`, short: `S${si} ${String(a.getFullYear()).slice(2)}` }; }
  const a = new Date(y + offset, 0, 1);
  return { from: a.getTime(), to: new Date(a.getFullYear() + 1, 0, 1).getTime(), label: `Année ${a.getFullYear()}`, short: String(a.getFullYear()) };
}
