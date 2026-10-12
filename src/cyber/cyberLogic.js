// src/cyber/cyberLogic.js
//
// Règles métier du type d'entreprise « Cyber café » :
//  - prestations (photocopies, impressions, scan, photos d'identité,
//    inscriptions en ligne…) avec tarifs dégressifs, articles en stock ;
//  - tickets de vente, paiements (espèces, Mobile Money), crédits clients ;
//  - chiffre d'affaires, encaissé, créances et bénéfice estimé, bien séparés ;
//  - stock calculé à partir des mouvements et des ventes (jamais écrasé par
//    un autre téléphone) ;
//  - rôles : propriétaire, gérante, employé ;
//  - annonces vocales et écrites.

import { momoName } from "../MomoPicker.jsx";

export const DAY = 24 * 3600 * 1000;
export const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
export const pad2 = (n) => String(n).padStart(2, "0");
export const toMs = (v) => (typeof v === "number" ? v : v ? new Date(v).getTime() : 0);
export const hmOf = (ms) => { const d = new Date(toMs(ms)); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const localDayKey = (ms) => { const d = new Date(toMs(ms)); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
export const dayBounds = (ms) => { const d = new Date(toMs(ms)); d.setHours(0, 0, 0, 0); return [d.getTime(), d.getTime() + DAY]; };
export const dmy = (ms) => new Date(toMs(ms)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
export const dayLabel = (ms) => {
  const k = localDayKey(ms); const now = Date.now();
  if (k === localDayKey(now)) return "Aujourd'hui";
  if (k === localDayKey(now - DAY)) return "Hier";
  return new Date(toMs(ms)).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
};

// ---------- Rôles ----------
export const ROLES = {
  owner: { id: "owner", label: "Propriétaire", short: "Propriétaire", tint: "#FEF3C7", ink: "#92400E" },
  gerante: { id: "gerante", label: "Gérante", short: "Gérante", tint: "#EDE9FE", ink: "#6D28D9", sub: "Caisse, équipe, clôture, stock" },
  employe: { id: "employe", label: "Employé", short: "Employé", tint: "#E0F7FB", ink: "#0E7490", sub: "Vend et voit ses propres ventes" },
};
export function roleOf(role, staff) {
  if (role === "admin") return "owner";
  return staff?.cyberRole === "gerante" ? "gerante" : "employe";
}
// Droits de chaque rôle (appliqués partout dans l'application).
export function can(r) {
  const own = r === "owner", mgr = own || r === "gerante";
  return {
    sell: true, mine: true, credit: true,
    team: mgr, cash: mgr, expense: mgr, close: mgr, stock: mgr, cancel: mgr, reports: mgr, clients: true,
    price: own, staff: own, support: own, licence: own, backup: own, settings: own,
  };
}

// ---------- Prestations ----------
export const CATS = {
  copie: { label: "Copies", tint: "#E0F7FB", ink: "#0E7490", grad: "linear-gradient(135deg,#22D3EE,#0891B2)", icon: "copy" },
  impression: { label: "Impressions", tint: "#E8EAFE", ink: "#4338CA", grad: "linear-gradient(135deg,#818CF8,#4F46E5)", icon: "doc" },
  scan: { label: "Scan", tint: "#F1F5F9", ink: "#334155", grad: "linear-gradient(135deg,#94A3B8,#475569)", icon: "scan" },
  photo: { label: "Photos", tint: "#FCE7F3", ink: "#BE185D", grad: "linear-gradient(135deg,#F472B6,#DB2777)", icon: "camera" },
  web: { label: "En ligne", tint: "#FEF3C7", ink: "#B45309", grad: "linear-gradient(135deg,#FBBF24,#D97706)", icon: "globe" },
  bureau: { label: "Bureautique", tint: "#DCFCE7", ink: "#15803D", grad: "linear-gradient(135deg,#34D399,#059669)", icon: "type" },
  article: { label: "Articles", tint: "#EDE9FE", ink: "#6D28D9", grad: "linear-gradient(135deg,#A78BFA,#6D28D9)", icon: "bag" },
};
// Configurateur à ouvrir selon la prestation.
export const FORMS = { copy: "copy", print: "print", scan: "qty", photo: "photo", web: "web", qty: "qty" };

// Tarifs d'exemple : le propriétaire les règle dans « Prestations et tarifs ».
export function defaultServices() {
  const t = new Date().toISOString();
  const s = (id, name, cat, form, unit, price, extra = {}) => ({ id, name, cat, form, unit, price, tiers: [], active: true, createdAt: t, updatedAt: t, ...extra });
  return [
    s("svc-copie-nb", "Photocopie N&B", "copie", "copy", "page", 50, { tiers: [{ from: 10, price: 25 }, { from: 50, price: 20 }, { from: 200, price: 15 }], paper: "stk-a4", order: 1 }),
    s("svc-copie-coul", "Photocopie couleur", "copie", "copy", "page", 200, { tiers: [{ from: 10, price: 150 }, { from: 50, price: 100 }], paper: "stk-a4", order: 2 }),
    s("svc-imp-nb", "Impression N&B", "impression", "print", "page", 100, { tiers: [{ from: 20, price: 75 }, { from: 100, price: 50 }], paper: "stk-a4", colorPrice: 250, order: 3 }),
    s("svc-scan", "Scan", "scan", "qty", "page", 200, { order: 5 }),
    s("svc-photo", "Photo d'identité", "photo", "photo", "planche", 1000, { paper: "stk-photo", order: 6 }),
    s("svc-insc", "Inscription en ligne", "web", "web", "dossier", 1000, { order: 7 }),
    s("svc-saisie", "Saisie de texte", "bureau", "qty", "page", 500, { order: 8 }),
    s("svc-mail", "Envoi d'e-mail", "web", "qty", "envoi", 200, { order: 9 }),
    s("svc-plast", "Plastification", "bureau", "qty", "pochette", 500, { consume: [{ stockId: "stk-plast", qty: 1 }], order: 10 }),
    s("svc-reliure", "Reliure", "bureau", "qty", "document", 1000, { order: 11 }),
  ];
}
// Consommables de départ (quantités à saisir par le propriétaire).
export function defaultStock() {
  const t = new Date().toISOString();
  const c = (id, name, unit, pack, packName, alert, cost) => ({ id, name, kind: "conso", unit, pack, packName, alert, cost, price: 0, active: true, createdAt: t, updatedAt: t });
  return [
    c("stk-a4", "Papier A4", "feuille", 500, "rame", 2500, 7),
    c("stk-a3", "Papier A3", "feuille", 500, "rame", 500, 14),
    c("stk-photo", "Papier photo", "feuille", 100, "paquet", 30, 60),
    c("stk-plast", "Pochettes de plastification", "pochette", 100, "boîte", 20, 120),
  ];
}

export const unitPrice = (svc, qty) => {
  let p = Number(svc.price) || 0;
  (svc.tiers || []).slice().sort((a, b) => a.from - b.from).forEach((t) => { if (qty >= Number(t.from)) p = Number(t.price) || p; });
  return p;
};
export const tierRows = (svc) => {
  const tiers = [{ from: 1, price: Number(svc.price) || 0 }, ...(svc.tiers || []).slice().sort((a, b) => a.from - b.from)];
  return tiers.map((t, i) => ({ from: Number(t.from), to: tiers[i + 1] ? Number(tiers[i + 1].from) - 1 : null, price: Number(t.price) || 0 }));
};

// ---------- Ventes ----------
export const lineTotal = (lines) => lines.reduce((t, l) => t + (Number(l.amount) || 0), 0);
export const lineOfficial = (lines) => lines.reduce((t, l) => t + (Number(l.official) || 0), 0);
export const salePaid = (s) => (s.payments || []).reduce((t, p) => t + (Number(p.amount) || 0), 0);
export const saleToPay = (s) => (Number(s.total) || 0) + (Number(s.official) || 0);
export const saleDue = (s) => (s.status === "cancelled" ? 0 : Math.max(0, saleToPay(s) - salePaid(s)));
export const isLive = (s) => s && s.status !== "cancelled";
export const hasService = (s) => (s.lines || []).some((l) => l.kind !== "article");
export const hasArticle = (s) => (s.lines || []).some((l) => l.kind === "article");
export const saleKindWord = (s) => (hasArticle(s) ? "vente" : "prestation");
export const saleSummary = (s) => (s.lines || []).map((l) => `${l.qty > 1 || l.kind !== "libre" ? `${l.qty} ` : ""}${l.label}`).join(", ");

// Numéro de ticket : aaMMjj-nnn + lettre de l'appareil (pas de doublon entre téléphones).
export function nextTicketNo(shopId) {
  const d = new Date();
  const day = `${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  let dev = "A";
  try {
    dev = localStorage.getItem("cyber:devCode") || "";
    if (!dev) { dev = "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)] + Math.floor(Math.random() * 9 + 1); localStorage.setItem("cyber:devCode", dev); }
  } catch { /* ignore */ }
  const k = `cyber:seq:${shopId}:${day}`;
  let n = 1;
  try { n = (Number(localStorage.getItem(k)) || 0) + 1; localStorage.setItem(k, String(n)); } catch { /* ignore */ }
  return `${day}-${String(n).padStart(3, "0")}${dev}`;
}
export function deviceId() {
  try { let id = localStorage.getItem("cyber:device"); if (!id) { id = rid(); localStorage.setItem("cyber:device", id); } return id; } catch { return "x"; }
}

// ---------- Stock (calculé, jamais écrasé) ----------
// Quantité = mouvements (achats, ajustements, inventaires) − consommations des ventes non annulées.
export function stockLevels(stock, moves, sales) {
  const q = {};
  (stock || []).forEach((s) => { q[s.id] = 0; });
  (moves || []).forEach((m) => { if (m.status !== "cancelled" && q[m.stockId] != null) q[m.stockId] += Number(m.qty) || 0; });
  (sales || []).forEach((s) => {
    if (!isLive(s)) return;
    (s.lines || []).forEach((l) => (l.consume || []).forEach((c) => { if (q[c.stockId] != null) q[c.stockId] -= Number(c.qty) || 0; }));
  });
  return q;
}
export const isLow = (item, qty) => Number(item.alert) > 0 && qty <= Number(item.alert);
export function qtyLabel(item, qty) {
  const n = Math.round(Number(qty) || 0);
  if (item.pack > 1) {
    const packs = n / item.pack;
    const p = Math.abs(packs) >= 10 ? Math.round(packs) : Math.round(packs * 10) / 10;
    return `${String(p).replace(".", ",")} ${item.packName}${Math.abs(p) >= 2 ? "s" : ""}`;
  }
  return `${n} ${item.unit}${Math.abs(n) > 1 && !/s$/.test(item.unit) ? "s" : ""}`;
}

// ---------- Chiffres ----------
// CA : ventes du jour (crédit compris, frais officiels exclus).
// Encaissé : argent reçu le jour (ventes + paiements de crédits − remboursements).
// Créances : reste dû sur toutes les ventes non annulées.
// Bénéfice estimé : CA − coût des consommables et articles − dépenses.
export function periodFigures({ sales = [], expenses = [], stock = [], moves = [], from, to, by = null }) {
  const cost = {}; (stock || []).forEach((s) => { cost[s.id] = Number(s.cost) || 0; });
  const inP = (ms) => { const t = toMs(ms); return t >= from && t < to; };
  const mine = (x) => !by || x.by === by;
  let ca = 0, official = 0, cash = 0, momo = 0, refunds = 0, refundsCash = 0, consumption = 0, tickets = 0, credit = 0, creditPaid = 0;
  const perSvc = {}; const perPerson = {};
  sales.forEach((s) => {
    if (isLive(s) && inP(s.at) && mine(s)) {
      ca += Number(s.total) || 0; official += Number(s.official) || 0; tickets += 1;
      const due = saleToPay(s) - (s.payments || []).filter((p) => p.kind !== "credit").reduce((t, p) => t + (Number(p.amount) || 0), 0);
      if (due > 0) credit += due;
      (s.lines || []).forEach((l) => {
        const k = l.svcId || l.stockId || "libre";
        const row = perSvc[k] || (perSvc[k] = { label: l.svcName || l.label, cat: l.cat || (l.kind === "article" ? "article" : "bureau"), amount: 0, qty: 0 });
        row.amount += Number(l.amount) || 0; row.qty += Number(l.qty) || 0;
        (l.consume || []).forEach((c) => { consumption += (cost[c.stockId] || 0) * (Number(c.qty) || 0); });
      });
      const pp = perPerson[s.by] || (perPerson[s.by] = { name: s.by, amount: 0, tickets: 0 });
      pp.amount += Number(s.total) || 0; pp.tickets += 1;
    }
    (s.payments || []).forEach((p) => {
      if (!inP(p.at) || (by && p.by !== by)) return;
      if (p.mode === "momo") momo += Number(p.amount) || 0; else cash += Number(p.amount) || 0;
      if (p.kind === "credit") creditPaid += Number(p.amount) || 0;
    });
    if (s.refund && inP(s.refund.at) && (!by || s.refund.by === by)) { refunds += Number(s.refund.amount) || 0; if (s.refund.mode !== "momo") refundsCash += Number(s.refund.amount) || 0; }
  });
  const exp = (expenses || []).filter((e) => inP(e.at || e.date) && (!by || e.by === by));
  const expTotal = exp.reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const expCash = exp.filter((e) => e.source !== "momo").reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const purchasesCash = (moves || []).filter((m) => m.kind === "achat" && m.status !== "cancelled" && inP(m.at) && m.pay === "cash" && (!by || m.by === by)).reduce((t, m) => t + (Number(m.total) || 0), 0);
  const debts = sales.reduce((t, s) => t + saleDue(s), 0);
  return {
    ca, official, encaisse: cash + momo - refunds, cash, momo, refunds, refundsCash, credit, creditPaid, consumption, expenses: expTotal, expCash, purchasesCash,
    profit: ca - consumption - expTotal, tickets, debts,
    perSvc: Object.values(perSvc).sort((a, b) => b.amount - a.amount),
    perPerson: Object.values(perPerson).sort((a, b) => b.amount - a.amount),
  };
}
// Espèces attendues dans la caisse pour la journée.
export function cashExpected(f, float = 0) {
  return (Number(float) || 0) + f.cash - f.refundsCash - f.expCash - f.purchasesCash;
}

// ---------- Annonces ----------
export const EVENT_TYPES = {
  prestation: { label: "Prestation (copie, impression, photo, inscription…)", def: [2, 2, 1] },
  vente: { label: "Vente d'articles", def: [2, 2, 1] },
  credit: { label: "Vente ou prestation à crédit", def: [2, 2, 0] },
  paiement: { label: "Paiement de crédit", def: [2, 2, 0] },
  annulation: { label: "Annulation, remboursement", def: [2, 2, 0] },
  depense: { label: "Dépense", def: [2, 1, 0] },
  stock: { label: "Stock bas", def: [2, 2, 2], always: true },
  reappro: { label: "Réapprovisionnement", def: [2, 2, 2], always: true },
  cloture: { label: "Clôture de caisse", def: [2, 1, 0] },
};
export const ROLE_INDEX = { owner: 0, gerante: 1, employe: 2 };
export const DEFAULT_CYBER_SETTINGS = {
  announce: {}, voiceRate: 1, chime: true, quiet: true, quietFrom: 22, quietTo: 7,
  receipt: { name: "", address: "", phone: "", message: "", paper: "58" },
  float: 0, backupLog: [], backupRemind: true,
};
export function cyberSettingsOf(shop) {
  const s = (shop && shop.cyberSettings) || {};
  return { ...DEFAULT_CYBER_SETTINGS, ...s, receipt: { ...DEFAULT_CYBER_SETTINGS.receipt, ...(s.receipt || {}) }, announce: { ...(s.announce || {}) } };
}
// 0 = rien, 1 = message écrit, 2 = voix et message.
export function announceLevel(settings, type, role) {
  const T = EVENT_TYPES[type]; if (!T) return 1;
  const i = ROLE_INDEX[role] ?? 2;
  if (T.always) return 2;
  const v = settings.announce?.[`${type}:${i}`];
  return v == null ? T.def[i] : Number(v);
}
export const currencyWord = (cur) => (!cur || cur === "XAF" || cur === "XOF" ? "francs CFA" : cur === "EUR" ? "euros" : cur === "USD" ? "dollars" : cur);
// Montant lu par la voix : chiffres sans espace (« 3500 » se lit « trois mille cinq cents »).
export const sayAmount = (n, cur) => `${Math.round(Number(n) || 0)} ${currencyWord(cur)}`;

// Événement d'une vente : texte écrit (sans le nom de l'application) et phrase vocale.
export function saleEvent(sale, shop, fmt) {
  const word = saleKindWord(sale);
  const due = saleDue(sale);
  const credit = due > 0;
  const total = saleToPay(sale);
  const type = credit ? "credit" : word === "vente" ? "vente" : "prestation";
  const Word = word === "vente" ? "Vente" : "Prestation";
  const title = credit ? `${Word} à crédit de ${sale.by} · ${fmt(total)}` : `${Word} de ${sale.by} · ${fmt(total)}`;
  const pay = credit ? (salePaid(sale) > 0 ? `Payé ${fmt(salePaid(sale))}, reste ${fmt(due)}` : "À crédit") : (sale.payments || []).some((p) => p.mode === "momo") ? `Payé par ${momoName((sale.payments || []).find((p) => p.mode === "momo").op) || "Mobile Money"}` : "Payé en espèces";
  const body = `${saleSummary(sale)}. ${pay}${sale.client?.name ? ` · client ${sale.client.name}` : ""}.`;
  const voice = `${sale.by} vient de faire une ${word}${credit ? " à crédit" : ""} de ${sayAmount(total, shop?.currency)}${credit && sale.client?.name ? `, pour ${sale.client.name}` : ""}.`;
  return { type, title, body, voice, amount: total };
}
