// src/bar/barEngine.js
//
// Bar Manager : espace des entreprises de type « Bar Manager » dans GestiOne.
// Même accueil, même création d'entreprise, même connexion (code administrateur
// ou nom + code PIN) et même licence que toutes les entreprises GestiOne ;
// chaque bar est une entreprise distincte avec sa licence et son essai de 14 jours.
//
// Le module dessine son interface dans un conteneur (root) et échange avec
// GestiOne par l'objet « host » : données synchronisées (clés bar*), personnel
// (vendeurs avec un rôle barRole), licence, synchronisation, déconnexion.

export const BAR_KEYS = ["barProducts", "barSales", "barSessions", "barMoves", "barLosses", "barAssigns", "barControls", "barInventories", "barSuppliers", "barOrders", "barExpenses", "barAttendance", "barAudit", "barNotifs", "barSettings"];

export function mountBarManager(root, host) {
const $ = (s) => root.querySelector(s);
/* =========================================================================
   BAR MANAGER PRO — espace « Bar » de GestiOne (maquette interactive)
   Toutes les données sont fictives. Chaque bar a son propre magasin de
   données (S.dbs[barId]) pour simuler une base indépendante.
   ========================================================================= */

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nb = (n) => Math.round(Number(n) || 0).toLocaleString("fr-FR").replace(/[  ]/g, " ");
const F = (n) => nb(n) + " FCFA";
const Fk = (n) => `${nb(n)}<span class="cur">FCFA</span>`;
const sFk = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + Fk(Math.abs(n));
const sF = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + nb(Math.abs(n)) + " FCFA";
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, MIN = 60000, HOUR = 3600000;
const sod = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dFR = (t) => new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dS = (t) => new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const hm = (t) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dt = (t) => dFR(t) + " " + hm(t);
const ago = (t) => { const m = Math.round((Date.now() - t) / MIN); return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `le ${dS(t)}`; };
const ini = (s) => String(s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>', group: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.1L21 8H6.3"/>', list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>', box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z"/><circle cx="7.5" cy="7.5" r="1.5"/>', swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>', clip: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 11h6M9 15h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8S10 3 7.5 4 9 8 12 8Zm0 0s2-5 4.5-4S15 8 12 8Z"/>', truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  doc: '<path d="M6 2h9l5 5v15H6Z"/><path d="M14 2v6h6M9 13h7M9 17h7"/>', inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6Z"/>', wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6M9 12h6"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4Z"/><path d="M10 20a2 2 0 0 0 4 0"/>', phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>', cloud: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18Z"/>', layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>', download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', out: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', arch: '<path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-6h6v6"/>',
};
const ic = (n, s = 18, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;

/* ============================== Référentiels ============================== */
const CATS = ["Bières", "Vins", "Spiritueux", "Champagnes", "Boissons non alcoolisées", "Eaux", "Jus", "Produits alimentaires", "Produits divers"];
const MODES = [["especes", "Espèces"], ["momo", "Mobile Money"], ["carte", "Carte bancaire"], ["virement", "Virement"], ["autre", "Autre"], ["credit", "Crédit client"]];
const modeL = (m, op) => (m === "momo" && op ? "Mobile Money · " + op : (MODES.find((x) => x[0] === m) || ["", m])[1]);
const OPS = ["Wave", "Orange Money", "MTN MoMo", "Moov Money"];
const EXP_CATS = ["Achats de boissons", "Achats alimentaires", "Salaires", "Transport", "Électricité", "Eau", "Loyer", "Entretien", "Réparations", "Sécurité", "Communication", "Taxes et frais", "Divers"];
const LOSS_TYPES = ["Produit offert à un client", "Consommation du personnel", "Bouteille cassée", "Produit périmé", "Produit détérioré", "Perte", "Échantillon ou dégustation", "Autre motif"];
const REGISTERS = ["Comptoir", "Terrasse", "Espace VIP"];
const ROLES = {
  proprietaire: "Propriétaire", administrateur: "Administrateur", gerant: "Gérant", superviseur: "Superviseur", caissier: "Caissier", barman: "Barman", stock: "Responsable du stock", comptable: "Comptable", limite: "Employé (accès limité)",
};
const ALL = Object.keys(ROLES);
const P = (...r) => r;
const PERMS = {
  dashboard: { l: "Voir le tableau de bord", r: P("proprietaire", "administrateur", "gerant", "superviseur", "comptable") },
  pos: { l: "Encaisser des ventes", r: P("proprietaire", "administrateur", "gerant", "superviseur", "caissier", "barman") },
  remise: { l: "Accorder une remise", r: P("proprietaire", "administrateur", "gerant", "superviseur") },
  annuler: { l: "Annuler une vente", r: P("proprietaire", "administrateur", "gerant") },
  ventes: { l: "Consulter l'historique des ventes", r: P("proprietaire", "administrateur", "gerant", "superviseur", "caissier", "comptable") },
  caisse: { l: "Ouvrir et fermer une caisse", r: P("proprietaire", "administrateur", "gerant", "superviseur", "caissier") },
  caisse_val: { l: "Valider une fermeture, corriger", r: P("proprietaire", "administrateur", "gerant") },
  stock: { l: "Consulter le stock", r: P("proprietaire", "administrateur", "gerant", "superviseur", "stock", "comptable", "barman") },
  stock_edit: { l: "Produits, réceptions, inventaires", r: P("proprietaire", "administrateur", "gerant", "stock") },
  attrib: { l: "Attribuer et contrôler le stock", r: P("proprietaire", "administrateur", "gerant", "stock") },
  pertes: { l: "Déclarer une perte ou un offert", r: ALL },
  pertes_ok: { l: "Approuver pertes et offerts", r: P("proprietaire", "administrateur", "gerant", "superviseur") },
  achats: { l: "Fournisseurs et commandes", r: P("proprietaire", "administrateur", "gerant", "stock", "comptable") },
  depenses: { l: "Saisir une dépense", r: P("proprietaire", "administrateur", "gerant", "superviseur", "comptable") },
  depenses_ok: { l: "Approuver une dépense", r: P("proprietaire", "administrateur", "gerant") },
  employes: { l: "Gérer les employés", r: P("proprietaire", "administrateur", "gerant") },
  roles: { l: "Rôles et permissions", r: P("proprietaire", "administrateur") },
  presences: { l: "Présences", r: P("proprietaire", "administrateur", "gerant", "superviseur") },
  audit: { l: "Journal d'audit", r: P("proprietaire", "administrateur", "comptable") },
  rapports: { l: "Rapports", r: P("proprietaire", "administrateur", "gerant", "comptable") },
  parametres: { l: "Paramètres de l'établissement", r: P("proprietaire", "administrateur") },
  sauvegarde: { l: "Sauvegardes et restauration", r: P("proprietaire", "administrateur") },
  groupe: { l: "Vue multi-bars", r: P("proprietaire", "administrateur") },
};

const CATALOG = [
  ["Flag Spéciale 65cl", "Bières", 900, 1500, "bouteille"], ["Castel Beer 65cl", "Bières", 900, 1500, "bouteille"], ["Heineken 33cl", "Bières", 1200, 2000, "bouteille"], ["Guinness 33cl", "Bières", 1250, 2000, "bouteille"], ["Desperados 33cl", "Bières", 1500, 2500, "bouteille"],
  ["Vin rouge Bordeaux 75cl", "Vins", 7500, 15000, "bouteille"], ["Rosé Côtes de Provence", "Vins", 8000, 16000, "bouteille"],
  ["Hennessy VS 70cl", "Spiritueux", 38000, 70000, "bouteille"], ["Johnnie Walker Black", "Spiritueux", 30000, 55000, "bouteille"], ["Absolut Vodka 70cl", "Spiritueux", 20000, 40000, "bouteille"],
  ["Moët Impérial 75cl", "Champagnes", 45000, 85000, "bouteille"],
  ["Coca-Cola 33cl", "Boissons non alcoolisées", 400, 1000, "canette"], ["Red Bull 25cl", "Boissons non alcoolisées", 900, 2500, "canette"],
  ["Eau Awa 50cl", "Eaux", 250, 1000, "bouteille"], ["Jus de bissap 50cl", "Jus", 400, 1500, "bouteille"],
  ["Brochettes de bœuf", "Produits alimentaires", 900, 2500, "portion"], ["Alloco poisson", "Produits alimentaires", 1200, 3000, "portion"],
  ["Chicha (parfum)", "Produits divers", 3000, 10000, "unité"],
];
function notifPush(db, barName, cat, prio, title, desc, action, at = Date.now()) { db.notifs.unshift({ id: uid("n"), at, cat, prio, title, desc, action, read: false, bar: barName }); if (Date.now() - at < 5000) { try { say(`Alerte : ${title}. ${desc}`, "alertes"); } catch (x) { /* voix indisponible */ } } }
function theoCash(db, sess, until) {
  const end = sess.closedAt || until || Date.now();
  const ss = db.sales.filter((s) => s.sessionId === sess.id && s.at <= end);
  const byMode = {}; MODES.forEach(([m]) => (byMode[m] = 0));
  let cash = 0, refunds = 0;
  ss.forEach((s) => { if (s.status !== "annulee") { byMode[s.mode] = (byMode[s.mode] || 0) + s.total; if (s.mode === "especes") cash += s.total; } else if (s.mode === "especes") { cash += s.total; if (s.cancel && s.cancel.refund === "especes") refunds += s.total; } });
  const outs = sess.moves.filter((m) => m.type === "sortie").reduce((a, m) => a + m.amount, 0);
  const ins = sess.moves.filter((m) => m.type === "entree").reduce((a, m) => a + m.amount, 0);
  return { cash, refunds, outs, ins, byMode, theo: sess.fond + cash - refunds - outs + ins, n: ss.length };
}

/* ============================== État (données GestiOne) ============================== */
// Chaque collection est une clé synchronisée de l'entreprise (fusion par id
// côté serveur), comme les modules Hôtel et Cyber café.
const KEYS = { products: "barProducts", sales: "barSales", sessions: "barSessions", moves: "barMoves", losses: "barLosses", assigns: "barAssigns", controls: "barControls", inventories: "barInventories", suppliers: "barSuppliers", orders: "barOrders", expenses: "barExpenses", attendance: "barAttendance", audit: "barAudit", notifs: "barNotifs" };
const COLORS = ["#F2A541", "#C08BFF", "#3FC48F", "#7FB2FF", "#F06464", "#FFD08A"];
const DEF_SETTINGS = () => ({ id: "main", configured: false, identity: {}, features: { boissons: true, alimentaire: true, divers: true, employes: true, caisses: true, depenses: true, fournisseurs: true, recettes: true, inventaires: true, pertes: true, rapports: true, alertes: true }, modes: { especes: true, momo: true, carte: true, virement: true, autre: false, credit: true }, expApproval: 50000, lossApproval: 5000, offertApproval: true, transfer: false, thanks: "Merci de votre visite, à très bientôt !", backupFreq: "Chaque nuit, sur le serveur GestiOne", voice: true, seqOrder: 1, migrated: false });
const emptyDb = () => ({ settings: DEF_SETTINGS() });
function hostDb(data) {
  const d = { backups: [] };
  Object.entries(KEYS).forEach(([k, key]) => { d[k] = Array.isArray(data && data[key]) ? JSON.parse(JSON.stringify(data[key])) : []; });
  const st = Array.isArray(data && data.barSettings) && data.barSettings[0] ? JSON.parse(JSON.stringify(data.barSettings[0])) : {};
  const def = DEF_SETTINGS();
  d.settings = { ...def, ...st, features: { ...def.features, ...(st.features || {}) }, modes: { ...def.modes, ...(st.modes || {}) }, identity: { ...(st.identity || {}) } };
  d.seq = { sale: 1, order: d.settings.seqOrder || 1 };
  return d;
}
let H = host;
const SNAPS = {};
const S = { bars: [], dbs: {}, cache: {}, employees: [], online: true, lastRefresh: Date.now() };
const sent = {}; const seen = {};
function barOf(shop, st, license, idx, hasData) {
  const id = (st && st.identity) || {};
  return { id: shop.id, name: shop.name || "Mon bar", type: id.type || "Bar", city: id.city || "", address: id.address || "", country: id.country || "Côte d'Ivoire", phone: id.phone || "", email: id.email || "", legal: id.legal || "", tz: id.tz || "Africa/Abidjan", start: id.start || "", hours: id.hours || "", desc: id.desc || "", owner: id.owner || "", color: id.color || COLORS[idx % COLORS.length], dbId: "Entreprise " + String(shop.id || "").slice(0, 8).toUpperCase(), dbStatus: hasData ? "ok" : "ko", configured: !!(st && st.configured), license: license || null, joinCode: shop.joinCode || "" };
}
function employeesOf(vendors) {
  return (vendors || []).map((v) => { const r = v.barRole && ROLES[v.barRole] ? v.barRole : "caissier"; return { id: v.id, name: v.name || "Employé", role: r, func: v.barFunc || ROLES[r], phone: v.phone || "", hired: v.createdAt ? dFR(v.createdAt) : "", status: v.blocked ? "désactivé" : "actif", login: v.joinCode || "", pin: v.pin || "", bars: [H.shop.id], raw: v }; });
}
// Même contenu dans un autre ordre (réponse fusionnée du serveur) : rien à redessiner.
const canonL = (a) => JSON.stringify((Array.isArray(a) ? a : []).slice().sort((x, y) => String(x && x.id).localeCompare(String(y && y.id))));
function syncFromHost(first) {
  const cur = H.shop; let changed = false;
  if (first || !S.dbs[cur.id]) { S.dbs[cur.id] = hostDb(H.data || {}); Object.values(KEYS).concat("barSettings").forEach((k) => (sent[k] = seen[k] = JSON.stringify((H.data || {})[k] || []))); changed = true; }
  else {
    const d = S.dbs[cur.id];
    Object.entries(KEYS).forEach(([k, key]) => { const j = JSON.stringify((H.data || {})[key] || []); if (j === seen[key]) return; seen[key] = j; if (j !== sent[key]) { const inc = JSON.parse(j); sent[key] = j; if (canonL(inc) === canonL(d[k])) return; d[k] = inc; changed = true; } });
    const js = JSON.stringify((H.data || {}).barSettings || []);
    if (js !== seen.barSettings && (seen.barSettings = js) && js !== sent.barSettings) { sent.barSettings = js; const nd = hostDb(H.data || {}); d.settings = nd.settings; d.seq.order = Math.max(d.seq.order, nd.seq.order); changed = true; }
  }
  const others = (H.shops || []).filter((s) => s.id !== cur.id);
  S.bars = [barOf(cur, S.dbs[cur.id].settings, H.license, 0, true), ...others.map((s, i) => { const c = S.cache[s.id]; if (c) S.dbs[s.id] = c.db; return barOf(s, c ? c.db.settings : null, c ? c.license : null, i + 1, !!c); })];
  S.employees = employeesOf(H.vendors);
  S.online = !(H.sync && H.sync.online === false);
  if (H.sync && H.sync.lastAt) S.lastRefresh = new Date(H.sync.lastAt).getTime() || S.lastRefresh;
  return changed;
}
function loadOthers() {
  if (!H.loadShopData) return;
  (H.shops || []).filter((s) => s.id !== H.shop.id && !S.cache[s.id]).forEach((s) => {
    Promise.resolve(H.loadShopData(s.id)).then((r) => { if (!r || destroyed) return; S.cache[s.id] = { db: hostDb(r.data || {}), license: r.license || null }; syncFromHost(); safeRender(); }).catch(() => {});
  });
}
let MODE = "clair"; try { MODE = localStorage.getItem("bmp-mode") || "clair"; } catch (e) { MODE = "clair"; }
function applyMode(m) { root.dataset.mode = m; }
const UI = { form: {}, user: null, bar: host.shop.id, view: "dashboard", period: "jour", from: "", to: "", sheet: null, toast: null, cart: { lines: [], discount: 0 }, pay: null, groupSel: [], groupFilter: "tous", flt: {}, rep: "ventes", errs: {}, busy: false, notifF: { cat: "", prio: "", bar: "" } };
function userOf() {
  if (H.role === "admin") return { kind: "admin", id: "admin", name: H.userName || "Administrateur", role: "proprietaire", bars: [] };
  const v = H.staff || {}; const r = v.barRole && ROLES[v.barRole] ? v.barRole : "caissier";
  return { kind: "emp", id: v.id || "emp", name: v.name || H.userName || "Employé", role: r, bars: [H.shop.id], login: v.joinCode || "" };
}
function save() {
  const d = S.dbs[H.shop.id]; if (!d) return;
  if (d.audit.length > 3000) d.audit.length = 3000;
  if (d.notifs.length > 400) d.notifs.length = 400;
  d.settings.seqOrder = d.seq.order;
  Object.entries(KEYS).forEach(([k, key]) => { const j = JSON.stringify(d[k]); if (j !== sent[key]) { sent[key] = j; try { H.save[key](JSON.parse(j)); } catch (e) { /* enregistrement indisponible */ } } });
  const js = JSON.stringify([d.settings]);
  if (js !== sent.barSettings) { sent.barSettings = js; try { H.save.barSettings(JSON.parse(js)); } catch (e) { /* ignore */ } }
}
const me = () => UI.user;
const role = () => (me() ? me().role : null);
const can = (p) => !!me() && (PERMS[p] ? PERMS[p].r.includes(role()) : false);
const bar = () => S.bars.find((b) => b.id === UI.bar);
const db = () => S.dbs[UI.bar];
const myBars = () => (me() && me().role === "proprietaire" ? S.bars : S.bars.filter((b) => b.id === H.shop.id));
const prod = (id, d = db()) => d.products.find((p) => p.id === id);
const sup = (id, d = db()) => d.suppliers.find((s) => s.id === id) || { name: "—" };
function audit(action, data, extra = {}) { const d = db(); const { say: spokenText, ...rest } = extra; const e = { id: uid("j"), at: Date.now(), user: me() ? me().name : "Système", action, data, before: "", after: "", motif: "", ...rest }; if (d) d.audit.unshift(e); try { voiceForAudit(action, data, extra); } catch (x) { /* voix indisponible */ } void spokenText; return e; }
function toast(msg, kind = "ok") { UI.toast = { msg, kind, t: Date.now() }; drawToast(); const t = UI.toast.t; setTimeout(() => { if (UI.toast && UI.toast.t === t) { UI.toast = null; drawToast(); } }, 3400); }
function drawToast() { let el = $("#bm-toast"); if (!UI.toast) { if (el) el.remove(); return; } if (!el) { el = document.createElement("div"); el.id = "bm-toast"; el.setAttribute("role", "status"); root.appendChild(el); } el.className = "toast " + (UI.toast.kind === "ok" ? "" : UI.toast.kind); el.textContent = UI.toast.msg; }
function deny(what) {
  toast(`Accès refusé : votre rôle (${ROLES[role()]}) ne permet pas de ${what}.`, "err");
  if (db()) { audit("Tentative d'accès non autorisée", what, { motif: "Droits insuffisants" }); notifPush(db(), bar().name, "Sécurité", "moyenne", "Tentative d'accès non autorisée", `${me().name} a tenté de ${what}.`, "Vérifier les droits de cet employé si la tentative se répète."); }
  save(); render();
}
const need = (p, what) => { if (can(p)) return true; deny(what); return false; };
const saleNum = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `V${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };

/* ============================== Licence (gérée par GestiOne, une par entreprise) ============================== */
const TRIAL_DAYS = 14;
const PLAN_DAYS = { "1m": 30, "3m": 90, "6m": 180, "12m": 365, lifetime: null };
const PLANS = () => (H.pricing || []).map((p) => ({ id: p.id, name: p.name, duration: p.duration, price: p.price, old: p.oldPrice, popular: !!p.popular, days: PLAN_DAYS[p.id] }));
function lic(b) {
  const l = (b && b.license) || {};
  if (l.lifetime) return { st: "lifetime", label: "Licence à vie", days: Infinity };
  const exp = l.expiresAt ? new Date(l.expiresAt).getTime() : 0;
  if (!exp) return { st: "none", label: "Licence non chargée", days: Infinity };
  const days = Math.ceil((exp - Date.now()) / DAY);
  if (days < 0) return { st: "expired", label: l.planId === "trial" ? "Essai gratuit terminé" : "Licence expirée", days };
  const p = PLANS().find((x) => x.id === l.planId);
  return { st: l.planId === "trial" ? "trial" : "active", label: (l.planId === "trial" ? "Essai gratuit" : "Licence " + (p ? p.name + " · " + p.duration : "")) + ` · ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`, days };
}
const licTag = (b) => { const x = lic(b); if (x.st === "none") return `<span class="tag t-mut">Licence</span>`; return `<span class="tag ${x.st === "expired" ? "t-crit" : x.st === "trial" || x.days <= 10 ? "t-warn" : "t-good"}">${x.st === "expired" ? (x.label === "Licence expirée" ? "Licence expirée" : "Essai terminé") : x.st === "lifetime" ? "Licence à vie" : x.st === "trial" ? `Essai · ${x.days} j` : `Licence · ${x.days} j`}</span>`; };
const expired = (b) => lic(b).st === "expired";
const fmtCode = (d) => String(d).replace(/\D/g, "").slice(0, 12).replace(/(.{4})/g, "$1-").replace(/-$/, "");
const lockedScreen = () => `<div style="padding:40px 16px;max-width:440px;margin:0 auto;display:flex;flex-direction:column;gap:14px"><div class="card empty">${ic("lock", 30)}<b>Établissement verrouillé</b><div class="small">${esc(bar().name)} : ${esc(lic(bar()).label)}. Les ventes et la caisse sont bloquées jusqu'à l'activation d'une licence par l'administrateur. Les données sont conservées.</div><button class="btn b-sec" data-a="logout">Déconnexion</button></div></div>`;

/* ============================== Périodes et calculs ============================== */
function range(pk = UI.period) {
  const now = Date.now(), t0 = sod();
  const d = new Date(t0);
  switch (pk) {
    case "hier": return [t0 - DAY, t0, "Hier"];
    case "semaine": { const wd = (d.getDay() + 6) % 7; return [t0 - wd * DAY, now + 1, "Cette semaine"]; }
    case "mois": { d.setDate(1); return [d.getTime(), now + 1, "Ce mois"]; }
    case "mprec": { d.setDate(1); const end = d.getTime(); d.setMonth(d.getMonth() - 1); return [d.getTime(), end, "Mois précédent"]; }
    case "perso": if (UI.from && UI.to) return [new Date(UI.from + "T00:00").getTime(), new Date(UI.to + "T00:00").getTime() + DAY, `Du ${UI.from.split("-").reverse().join("/")} au ${UI.to.split("-").reverse().join("/")}`]; return [t0, now + 1, "Aujourd'hui"];
    default: return [t0, now + 1, "Aujourd'hui"];
  }
}
const PERIODS = [["jour", "Aujourd'hui"], ["hier", "Hier"], ["semaine", "Cette semaine"], ["mois", "Ce mois"], ["mprec", "Mois précédent"], ["perso", "Personnalisée"]];
function stats(d, a, b) {
  const ss = d.sales.filter((s) => s.at >= a && s.at < b && s.status !== "annulee");
  const ca = ss.reduce((x, s) => x + s.total, 0);
  const cogs = ss.reduce((x, s) => x + s.lines.reduce((y, l) => y + l.qty * l.cost, 0), 0);
  const enc = ss.filter((s) => s.mode !== "credit").reduce((x, s) => x + s.total, 0);
  const cash = ss.filter((s) => s.mode === "especes").reduce((x, s) => x + s.total, 0);
  const dep = d.expenses.filter((e) => e.at >= a && e.at < b && e.status === "approuvée").reduce((x, e) => x + e.amount, 0);
  const lossV = d.losses.filter((l) => l.at >= a && l.at < b && l.status === "approuvée").reduce((x, l) => x + l.value, 0);
  const marge = ca - cogs;
  const ecC = d.sessions.filter((s) => s.closedAt && s.closedAt >= a && s.closedAt < b).reduce((x, s) => x + (s.ecart || 0), 0);
  const ecS = d.controls.filter((c) => c.at >= a && c.at < b).reduce((x, c) => x + c.value, 0) + d.inventories.filter((i) => i.at >= a && i.at < b).reduce((x, i) => x + i.ecartValue, 0);
  return { ss, n: ss.length, ca, cogs, marge, enc, cash, dep, lossV, benef: marge - dep - lossV, panier: ss.length ? ca / ss.length : 0, ecC, ecS };
}
function stockVal(d) { return d.products.filter((p) => p.active).reduce((x, p) => x + Math.max(0, p.stock) * p.buy, 0); }
function velocity(d, pid) { const a = Date.now() - 7 * DAY; let q = 0; d.sales.forEach((s) => { if (s.at >= a && s.status !== "annulee") s.lines.forEach((l) => { if (l.pid === pid) q += l.qty; }); }); return q / 7; }
function stockState(d, p) { if (p.stock <= 0) return ["Rupture", "t-crit"]; if (p.stock <= p.min) return ["Stock faible", "t-warn"]; const v = velocity(d, p.id); if (v > 0 && p.stock / v < 3) return ["Bientôt en rupture", "t-amb"]; return ["Normal", "t-good"]; }
function present(d) { const t0 = sod(); return d.attendance.filter((x) => x.day === t0 && x.in && !x.out).length; }
function alertsOf(d) { return d.notifs.filter((n) => !n.read); }

/* ============================== Graphiques ============================== */
function colChart(data, { h = 170, fmt = F, hl = -1 } = {}) {
  if (!data.some((d) => d.v > 0)) return `<div class="small" style="padding:28px 0;text-align:center">Aucune vente sur la période.</div>`;
  const W = 640, pl = 46, pr = 8, pt = 10, pb = 24; const max = Math.max(1, ...data.map((d) => d.v)); const nice = niceMax(max);
  const bw = (W - pl - pr) / data.length; const bwid = Math.min(24, bw * 0.6);
  let g = ""; for (let i = 0; i <= 4; i++) { const y = pt + (h - pt - pb) * (1 - i / 4); g += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end">${compact((nice * i) / 4)}</text>`; }
  const step = Math.ceil(data.length / 10);
  const bars = data.map((d, i) => { const bh = ((h - pt - pb) * d.v) / nice; const x = pl + i * bw + (bw - bwid) / 2; const y = h - pb - bh; const r = Math.min(4, bh); return `<path class="bar ${hl >= 0 && i !== hl ? "dim" : ""}" d="M${x},${h - pb} V${y + r} Q${x},${y} ${x + r},${y} H${x + bwid - r} Q${x + bwid},${y} ${x + bwid},${y + r} V${h - pb} Z" data-tip="${esc(d.l)} · ${esc(fmt(d.v))}"/>${i % step === 0 || i === data.length - 1 ? `<text x="${x + bwid / 2}" y="${h - 8}" text-anchor="middle">${esc(d.s || d.l)}</text>` : ""}`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="Graphique">${g}${bars}</svg>`;
}
function lineChart(data, { h = 170, fmt = (v) => v + " %" } = {}) {
  if (!data.some((d) => d.v !== 0)) return `<div class="small" style="padding:28px 0;text-align:center">Pas encore de données.</div>`;
  const W = 640, pl = 40, pr = 14, pt = 12, pb = 24; const vals = data.map((d) => d.v); const max = Math.max(1, ...vals), min = Math.min(0, ...vals); const nice = niceMax(max);
  const X = (i) => pl + ((W - pl - pr) * i) / Math.max(1, data.length - 1); const Y = (v) => pt + (h - pt - pb) * (1 - (v - min) / (nice - min || 1));
  let g = ""; for (let i = 0; i <= 4; i++) { const v = min + ((nice - min) * i) / 4; const y = Y(v); g += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end">${Math.round(v)}</text>`; }
  const pts = data.map((d, i) => `${X(i)},${Y(d.v)}`).join(" ");
  const area = `M${X(0)},${h - pb} L${pts.replace(/ /g, " L")} L${X(data.length - 1)},${h - pb} Z`;
  const step = Math.ceil(data.length / 8);
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="Évolution">${g}<path class="ar" d="${area}"/><polyline class="ln" points="${pts}"/>${data.map((d, i) => `<circle class="pt" cx="${X(i)}" cy="${Y(d.v)}" r="${i === data.length - 1 ? 5 : 4}" data-tip="${esc(d.l)} · ${esc(fmt(d.v))}"/>${i % step === 0 || i === data.length - 1 ? `<text x="${X(i)}" y="${h - 8}" text-anchor="middle">${esc(d.s || d.l)}</text>` : ""}`).join("")}${data.length ? `<text x="${X(data.length - 1) - 4}" y="${Y(data[data.length - 1].v) - 10}" text-anchor="end" style="fill:var(--ink);font-weight:800">${esc(fmt(data[data.length - 1].v))}</text>` : ""}</svg>`;
}
function meters(obj, fmt = F, limit = 8) { const e = Object.entries(obj).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, limit); const m = Math.max(1, ...e.map((x) => x[1])); const tot = e.reduce((a, x) => a + x[1], 0) || 1; return e.length ? e.map(([k, v]) => `<div class="mrow" data-tip="${esc(k)} · ${esc(fmt(v))}"><div><span>${esc(k)}</span><b class="num">${fmt(v)} <span class="small">${Math.round((v / tot) * 100)} %</span></b></div><div class="meter"><i style="width:${Math.max(2, (v / m) * 100)}%"></i></div></div>`).join("") : `<div class="small">Aucune donnée sur la période.</div>`; }
function niceMax(m) { const p = Math.pow(10, Math.floor(Math.log10(m))); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
const compact = (v) => (v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 ? 1 : 0).replace(".", ",") + " M" : v >= 1000 ? Math.round(v / 1000) + " k" : String(Math.round(v)));

/* ============================== Navigation ============================== */
const NAV = [
  ["Pilotage", [["dashboard", "Tableau de bord", "home", "dashboard"], ["groupe", "Vue groupe", "group", "groupe"], ["alertes", "Centre d'alertes", "bell"], ["distance", "Supervision à distance", "phone", "groupe"]]],
  ["Ventes", [["pos", "Point de vente", "cart", "pos"], ["ventes", "Historique des ventes", "list", "ventes"], ["caisses", "Sessions de caisse", "cash", "caisse"]]],
  ["Stock", [["produits", "Catalogue produits", "box", "stock"], ["categories", "Catégories", "tag", "stock"], ["etat", "État des stocks", "layers", "stock"], ["mouvements", "Mouvements de stock", "swap", "stock"], ["inventaires", "Inventaires", "clip", "stock_edit"], ["attribution", "Dotations de stock", "user", "attrib"], ["controle", "Contrôle des dotations", "check", "attrib"], ["pertes", "Pertes et offerts", "gift", "pertes"]]],
  ["Achats", [["fournisseurs", "Fournisseurs", "truck", "achats"], ["commandes", "Bons de commande", "doc", "achats"], ["receptions", "Réceptions", "inbox", "achats"]]],
  ["Finances", [["depenses", "Charges et dépenses", "wallet", "depenses"], ["rapports", "Rapports et analyses", "chart", "rapports"], ["documents", "Reçus et documents", "receipt", "ventes"]]],
  ["Équipe", [["employes", "Personnel", "users", "employes"], ["roles", "Rôles et permissions", "shield", "roles"], ["presences", "Présences", "clock", "presences"], ["audit", "Journal d'audit", "eye", "audit"]]],
  ["Système", [["parametres", "Paramètres", "gear", "parametres"], ["licence", "Licence et abonnement", "key"], ["sauvegardes", "Sauvegardes", "cloud", "sauvegarde"], ["profil", "Mon compte", "user"]]],
];
const NAVFLAT = NAV.flatMap((g) => g[1]);
const navItem = (v) => NAVFLAT.find((x) => x[0] === v);
function render() {
  if (destroyed) return;
  const app = $("#bm-app");
  UI.user = userOf();
  if (UI.bar && expired(bar())) { if (role() !== "proprietaire") { app.innerHTML = lockedScreen(); drawLayer(); return; } if (!["licence", "groupe", "menu", "profil"].includes(UI.view)) UI.view = "licence"; }
  if (role() === "proprietaire" && !bar().configured && !expired(bar()) && UI.view !== "configurer") UI.view = "configurer";
  const v = VIEWS[UI.view] ? UI.view : "dashboard";
  const unread = alertsOf(db()).length;
  const b = bar(); const multi = myBars().length > 1;
  app.innerHTML = `<div class="shell">
    <aside class="side" aria-label="Menu principal">
      <div class="brand"><span class="mark">BM</span><div><b>Bar Manager</b><span>GestiOne · Espace Bar</span></div></div>
      ${NAV.map(([g, items]) => `<div class="sgroup">${g}</div>${items.filter(([id]) => !(id === "groupe" && !multi)).map(([id, l, i, p]) => `<button class="slink ${UI.view === id ? "on" : ""} ${p && !can(p) ? "lock" : ""}" data-a="go" data-v="${id}">${ic(p && !can(p) ? "lock" : i, 17)}<span>${l}</span>${id === "alertes" && unread ? `<span class="cnt">${unread}</span>` : ""}</button>`).join("")}`).join("")}
      <button class="slink" data-a="logout" style="margin-top:10px">${ic("out", 17)}<span>Déconnexion</span></button>
    </aside>
    <div style="min-width:0;display:flex;flex-direction:column">
      <header class="top">
        <button class="barsel" data-a="sheet" data-s="barpick" aria-label="Établissements">
          <span class="logo" style="background:${b.color}">${ini(b.name)}</span><span class="bt"><b>${esc(b.name)}${multi ? `<span style="color:var(--muted);display:inline-flex">${ic("chev", 15)}</span>` : ""}</b>${licTag(b)}</span>
        </button>
        <span class="conn ${S.online ? "" : "off"}"><i></i>${S.online ? "Synchronisé " + ago(S.lastRefresh) : "Hors connexion"}</span>
        <button class="ib hide-sm" data-a="refresh" aria-label="Synchroniser">${H.sync && H.sync.busy ? '<span class="load"></span>' : ic("refresh", 17)}</button>
        <button class="ib" data-a="theme" aria-label="${MODE === "nuit" ? "Passer en mode clair" : "Passer en mode nuit"}" title="${MODE === "nuit" ? "Mode clair" : "Mode nuit"}">${ic(MODE === "nuit" ? "sun" : "moon", 17)}</button>
        <button class="ib" data-a="go" data-v="alertes" aria-label="Centre d'alertes">${ic("bell", 18)}${unread ? `<span class="dot">${unread > 99 ? "99+" : unread}</span>` : ""}</button>
        <button class="ib hide-sm" data-a="go" data-v="profil" aria-label="Mon compte" style="font-weight:800;font-size:13px;color:var(--amber2)">${ini(me().name)}</button>
      </header>
      <main class="content">${lic(b).st !== "expired" && lic(b).days <= 10 && role() === "proprietaire" && UI.view !== "licence" ? `<div class="note warn" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>${esc(lic(b).label)}. Sans licence, l'établissement sera verrouillé à l'échéance.</span><button class="btn b-amb" style="min-height:34px;padding:4px 12px" data-a="go" data-v="licence">Voir les offres</button></div>` : ""}${!S.online ? `<div class="note warn">Hors connexion : les opérations sont enregistrées sur ce téléphone et seront envoyées au retour du réseau.</div>` : ""}${VIEWS[v]()}</main>
    </div>
  </div>
  <nav class="bnav" aria-label="Navigation">${[["dashboard", "Accueil", "home"], ["pos", "Vente", "cart"], ["caisses", "Caisse", "cash"], ["etat", "Stock", "box"], ["menu", "Menu", "menu"]].map(([id, l, i]) => `<button class="${UI.view === id || (id === "menu" && !["dashboard", "pos", "caisses", "etat"].includes(UI.view)) ? "on" : ""}" data-a="go" data-v="${id}">${ic(i, 20)}${l}</button>`).join("")}</nav>`;
  drawLayer();
}
function safeRender() {
  if (destroyed) return;
  const a = document.activeElement;
  if (UI.sheet || (a && root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) { pendingRender = true; return; }
  pendingRender = false; render();
}

const head = (t, lead, acts = "") => `<div class="ph"><div><h1>${t}</h1>${lead ? `<div class="lead">${lead}</div>` : ""}</div>${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
const periodBar = () => `<div class="chips">${PERIODS.map(([k, l]) => `<button class="chip ${UI.period === k ? "on" : ""}" data-a="period" data-p="${k}">${l}</button>`).join("")}</div>${UI.period === "perso" ? `<form novalidate class="fgrid" data-f="range" style="max-width:560px"><div class="field"><label for="pf">Du</label><input class="inp" type="date" id="pf" name="from" value="${UI.from}" required></div><div class="field"><label for="pt">Au</label><input class="inp" type="date" id="pt" name="to" value="${UI.to}" required></div><button class="btn b-amb" style="align-self:end">Appliquer</button></form>` : ""}`;
const locked = (t) => `<div class="card empty">${ic("lock", 30)}<b>${t}</b><div class="small">Votre rôle (${ROLES[role()]}) n'a pas accès à cette page. Contactez l'administrateur si vous avez besoin de cet accès.</div></div>`;
const emptyS = (t, d, btn = "") => `<div class="card empty"><b>${t}</b><div class="small" style="max-width:46ch">${d}</div>${btn}</div>`;
const needBar = () => (!UI.bar ? emptyS("Choisissez un établissement", "Cette page concerne un établissement précis. Sélectionnez un bar en haut de l'écran.", `<button class="btn b-amb" data-a="sheet" data-s="barpick">Choisir un bar</button>`) : "");
function barForm(b, first) {
  const e = UI.errs; const v = (k, d = "") => esc(b ? b[k] : (UI.form || {})[k] || d);
  const f = b ? S.dbs[b.id].settings.features : emptyDb().settings.features;
  const FL = { boissons: "Boissons", alimentaire: "Produits alimentaires", divers: "Articles divers", employes: "Employés", caisses: "Caisses", depenses: "Dépenses", fournisseurs: "Fournisseurs", recettes: "Recettes", inventaires: "Inventaires", pertes: "Pertes et produits offerts", rapports: "Rapports", alertes: "Alertes" };
  return `<div><h1>${b ? (b.configured ? "Modifier l'établissement" : "Configurer mon bar") : "Ajouter un bar"}</h1><div class="lead">${b ? "Les changements sont inscrits au journal d'audit." : "Une base de données indépendante sera préparée pour cet établissement."}</div></div>
  <form class="card" data-f="bar" data-id="${b ? b.id : ""}" style="display:flex;flex-direction:column;gap:14px" novalidate>
    <h2>Identité</h2>
    <div class="fgrid">
      <div class="field"><label for="bn">Nom commercial *</label><input class="inp ${e.name ? "err" : ""}" id="bn" name="name" value="${v("name")}" placeholder="Le Palmier Lounge">${e.name ? `<div class="ferr">${e.name}</div>` : ""}</div>
      <div class="field"><label for="bt">Type d'établissement</label><select class="inp" id="bt" name="type">${["Bar", "Maquis", "Lounge", "Night-club", "Restaurant-bar", "Autre"].map((t) => `<option ${(b ? b.type : "Bar") === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label for="bl">Logo</label><label class="file"><input type="file" name="logo" id="bl" accept="image/*" data-file>Choisir un fichier<span class="fn">Aucun fichier choisi</span></label></div>
      <div class="field"><label for="bo">Nom du propriétaire</label><input class="inp" id="bo" name="owner" value="${v("owner", (H.userName && H.role === "admin" ? H.userName : ""))}"></div>
    </div>
    <h2>Coordonnées</h2>
    <div class="fgrid">
      <div class="field"><label for="bp">Téléphone *</label><input class="inp ${e.phone ? "err" : ""}" id="bp" name="phone" type="tel" value="${v("phone")}">${e.phone ? `<div class="ferr">${e.phone}</div>` : ""}</div>
      <div class="field"><label for="be">E-mail professionnel</label><input class="inp ${e.email ? "err" : ""}" id="be" name="email" type="email" value="${v("email")}">${e.email ? `<div class="ferr">${e.email}</div>` : ""}</div>
      <div class="field"><label for="blg">RCCM / N° contribuable</label><input class="inp" id="blg" name="legal" value="${v("legal")}" placeholder="Facultatif, imprimé sur les reçus"></div>
      <div class="field"><label for="ba">Adresse</label><input class="inp" id="ba" name="address" value="${v("address")}"></div>
      <div class="field"><label for="bc">Ville *</label><input class="inp ${e.city ? "err" : ""}" id="bc" name="city" value="${v("city")}" placeholder="Abidjan">${e.city ? `<div class="ferr">${e.city}</div>` : ""}</div>
      <div class="field"><label for="bco">Pays</label><input class="inp" id="bco" name="country" value="${v("country", "Côte d'Ivoire")}"></div>
      <div class="field"><label for="bcu">Devise d'affichage</label><select class="inp" id="bcu" name="currency"><option>FCFA</option></select></div>
      <div class="field"><label for="btz">Fuseau horaire</label><select class="inp" id="btz" name="tz"><option>Africa/Abidjan</option><option>Africa/Dakar</option><option>Africa/Douala</option><option>Africa/Lome</option></select></div>
      <div class="field"><label for="bs">Début d'activité</label><input class="inp" id="bs" name="start" value="${v("start", dFR(Date.now()))}"></div>
      <div class="field"><label for="bh">Horaires d'ouverture</label><input class="inp" id="bh" name="hours" value="${v("hours", "17:00 – 02:00")}"></div>
    </div>
    <div class="field"><label for="bd">Description (facultative)</label><textarea class="inp" id="bd" name="desc">${v("desc")}</textarea></div>
    <h2>Fonctionnalités à activer</h2>
    <div class="fgrid">${Object.keys(FL).map((k) => `<label class="row" style="border:1px solid var(--line);border-radius:12px;padding:8px 12px"><span>${FL[k]}</span><input type="checkbox" name="f_${k}" ${f[k] ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--amber)"></label>`).join("")}</div>
    ${b ? "" : `<label class="row" style="border:0"><span class="small">Tester un échec de création (démo)</span><input type="checkbox" name="fail" style="width:20px;height:20px;accent-color:var(--crit)"></label>`}
    <div class="acts"><button class="btn b-amb">${b ? (b.configured ? "Enregistrer" : "Terminer la configuration") : "Créer l'établissement"}</button>${b && !b.configured ? "" : `<button type="button" class="btn b-sec" data-a="go" data-v="${b ? "parametres" : "groupe"}">Annuler</button>`}</div>
  </form>`;
}

/* ============================== Pages ============================== */
const VIEWS = {};
VIEWS.menu = () => `${head("Menu", "Toutes les pages de Bar Manager.")}${NAV.map(([g, items]) => `<h2>${g}</h2><div class="menu-grid">${items.filter(([id]) => !(id === "groupe" && myBars().length < 2)).map(([id, l, i, p]) => `<button class="mi ${p && !can(p) ? "lock" : ""}" data-a="go" data-v="${id}"><span>${ic(p && !can(p) ? "lock" : i, 20)}</span>${l}</button>`).join("")}</div>`).join("")}<button class="btn b-crit" data-a="logout">${ic("out", 17)}Déconnexion</button>`;

VIEWS.dashboard = () => {
  if (!UI.bar) return needBar();
  if (!can("dashboard")) return dashLite();
  const d = db(); const b = bar(); const [a, z, label] = range(); const st = stats(d, a, z);
  const t0 = sod(); const today = stats(d, t0, Date.now() + 1); const m0 = new Date(t0); m0.setDate(1); const month = stats(d, m0.getTime(), Date.now() + 1);
  const span = z - a; const prev = stats(d, a - span, a); const delta = prev.ca ? Math.round(((st.ca - prev.ca) / prev.ca) * 100) : null;
  const outs = d.products.filter((p) => p.active && p.stock <= 0); const soon = d.products.filter((p) => p.active && p.stock > 0 && ["Stock faible", "Bientôt en rupture"].includes(stockState(d, p)[0]));
  const days = [...Array(14)].map((_, i) => { const x = t0 - (13 - i) * DAY; return { l: new Date(x).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), s: dS(x), v: stats(d, x, x + DAY).ca }; });
  const weeks = [...Array(8)].map((_, i) => { const wd = (new Date(t0).getDay() + 6) % 7; const x = t0 - wd * DAY - (7 - i) * 7 * DAY; return { l: "Semaine du " + dS(x), s: dS(x), v: stats(d, x, x + 7 * DAY).ca }; });
  const months = [...Array(3)].map((_, i) => { const x = new Date(t0); x.setDate(1); x.setMonth(x.getMonth() - (2 - i)); const y = new Date(x); y.setMonth(y.getMonth() + 1); return { l: x.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), s: x.toLocaleDateString("fr-FR", { month: "short" }), v: stats(d, x.getTime(), Math.min(y.getTime(), Date.now() + 1)).ca }; });
  const byCat = {}; st.ss.forEach((s) => s.lines.forEach((l) => (byCat[l.cat] = (byCat[l.cat] || 0) + l.qty * l.price)));
  const byDep = {}; d.expenses.filter((e) => e.at >= a && e.at < z && e.status === "approuvée").forEach((e) => (byDep[e.cat] = (byDep[e.cat] || 0) + e.amount));
  const top = {}; st.ss.forEach((s) => s.lines.forEach((l) => (top[l.name] = (top[l.name] || 0) + l.qty)));
  const marg = days.map((x, i) => { const y = t0 - (13 - i) * DAY; const s2 = stats(d, y, y + DAY); return { l: x.l, s: x.s, v: s2.ca ? Math.round((s2.marge / s2.ca) * 100) : 0 }; });
  const al = alertsOf(d).slice(0, 5);
  const cur = UI.chart || "jour";
  return `${head("Tableau de bord", `${esc(b.name)} · ${esc(label)} · actualisé ${ago(S.lastRefresh)}`)}
  ${periodBar()}
  <div class="kpis">
    <div class="kpi hero"><small>Chiffre d'affaires · ${esc(label)}</small><b class="num">${Fk(st.ca)}</b><i>${delta == null ? "Aucune période de comparaison" : `<span class="${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} %</span> vs période précédente`}</i></div>
    <div class="kpi"><small>CA du jour</small><b class="num">${Fk(today.ca)}</b><i>${today.n} tickets</i></div>
    <div class="kpi"><small>CA du mois</small><b class="num">${Fk(month.ca)}</b><i>depuis le 1er</i></div>
    <div class="kpi"><small>Encaissements</small><b class="num">${Fk(st.enc)}</b><i>Espèces ${F(st.cash)}</i></div>
    <div class="kpi"><small>Dépenses</small><b class="num">${Fk(st.dep)}</b><i>approuvées</i></div>
    <div class="kpi"><small>Marge brute</small><b class="num">${Fk(st.marge)}</b><i>${st.ca ? Math.round((st.marge / st.ca) * 100) : 0} % du CA</i></div>
    <div class="kpi"><small>Résultat estimé</small><b class="num ${st.benef < 0 ? "down" : ""}">${Fk(st.benef)}</b><i>après charges et pertes</i></div>
    <div class="kpi"><small>Valeur du stock</small><b class="num">${Fk(stockVal(d))}</b><i>au prix d'achat</i></div>
    <div class="kpi"><small>Tickets</small><b class="num">${nb(st.n)}</b><i>Panier ${F(st.panier)}</i></div>
    <div class="kpi"><small>Personnel présent</small><b class="num">${present(d)}</b><i>en service</i></div>
    <button class="kpi" data-a="go" data-v="etat"><small>Ruptures</small><b class="num ${outs.length ? "down" : ""}">${outs.length}</b><i>${soon.length} produit(s) à risque</i></button>
    <button class="kpi" data-a="go" data-v="caisses"><small>Écarts de caisse</small><b class="num ${st.ecC < 0 ? "down" : ""}">${sFk(st.ecC)}</b><i>sur la période</i></button>
    <button class="kpi" data-a="go" data-v="controle"><small>Écarts d'inventaire</small><b class="num ${st.ecS < 0 ? "down" : ""}">${sFk(st.ecS)}</b><i>contrôles, inventaires</i></button>
  </div>
  <div class="grid g2">
    <div class="card"><div class="ph"><h2>Chiffre d'affaires</h2><div class="chips">${[["jour", "Jour"], ["semaine", "Semaine"], ["mois", "Mois"]].map(([k, l]) => `<button class="chip ${cur === k ? "on" : ""}" data-a="chart" data-c="${k}">${l}</button>`).join("")}</div></div>${colChart(cur === "jour" ? days : cur === "semaine" ? weeks : months, { hl: cur === "jour" ? 13 : -1 })}<div class="small">${cur === "jour" ? "14 derniers jours, aujourd'hui en clair." : cur === "semaine" ? "8 dernières semaines complètes." : "3 derniers mois (mois en cours partiel)."}</div></div>
    <div class="card"><h2>Comparaison des périodes</h2>
      <div class="row"><span>${esc(label)}</span><b class="num">${Fk(st.ca)}</b></div>
      <div class="row"><span>Période précédente</span><b class="num">${Fk(prev.ca)}</b></div>
      <div class="row"><span>Écart</span><b class="num ${st.ca - prev.ca >= 0 ? "up" : "down"}">${sF(st.ca - prev.ca)}</b></div>
      <div class="row"><span>Marge brute</span><b class="num">${Fk(st.marge)} / ${F(prev.marge)}</b></div>
      <div class="row"><span>Tickets</span><b class="num">${st.n} / ${prev.n}</b></div>
    </div>
    <div class="card"><h2>Ventes par catégorie</h2>${meters(byCat)}</div>
    <div class="card"><h2>Répartition des dépenses</h2>${meters(byDep)}</div>
    <div class="card"><h2>Produits les plus vendus</h2>${meters(top, (v) => nb(v) + " u.", 6)}</div>
    <div class="card"><h2>Taux de marge · 14 jours</h2>${lineChart(marg)}</div>
  </div>
  <div class="card"><div class="ph"><h2>Alertes importantes</h2><button class="btn b-sec" data-a="go" data-v="alertes">Tout voir</button></div>${al.length ? al.map((n) => `<div class="row"><span><b style="white-space:normal">${esc(n.title)}</b><br><span class="small">${esc(n.desc)}</span></span><span class="tag ${n.prio === "haute" ? "t-crit" : n.prio === "moyenne" ? "t-warn" : "t-info"}">${n.prio}</span></div>`).join("") : '<div class="small">Aucune alerte non lue.</div>'}</div>
  <div class="small">Indicateurs calculés en temps réel à partir des opérations enregistrées dans cet établissement.</div>`;
};
function dashLite() { const d = db(); const t0 = sod(); const mine = d.sales.filter((s) => s.at >= t0 && s.by === me().id && s.status !== "annulee"); return `${head("Bonjour " + esc(me().name.split(" ")[0]), ROLES[role()] + " · " + esc(bar().name))}<div class="kpis"><div class="kpi hero"><small>Mes ventes du jour</small><b class="num">${Fk(mine.reduce((a, s) => a + s.total, 0))}</b><i>${mine.length} ventes</i></div><div class="kpi"><small>Ma caisse</small><b>${d.sessions.find((s) => !s.closedAt && s.by === me().id) ? "Ouverte" : "Fermée"}</b></div></div><div class="note">Les chiffres de l'établissement sont réservés au propriétaire, à la gérance et à la comptabilité.</div><div class="acts">${can("pos") ? `<button class="btn b-amb" data-a="go" data-v="pos">Ouvrir le point de vente</button>` : ""}${can("caisse") ? `<button class="btn b-sec" data-a="go" data-v="caisses">Ma caisse</button>` : ""}${can("stock") ? `<button class="btn b-sec" data-a="go" data-v="etat">État des stocks</button>` : ""}<button class="btn b-sec" data-a="go" data-v="pertes">Déclarer une perte</button></div>`; }

VIEWS.pos = () => {
  if (!UI.bar) return needBar(); if (!can("pos")) return locked("Point de vente");
  const d = db(); const c = UI.cart; const q = (UI.flt.pq || "").toLowerCase(); const cat = UI.flt.pcat || "";
  const sess = d.sessions.find((s) => !s.closedAt && s.by === me().id);
  const list = d.products.filter((p) => p.active && (!cat || p.cat === cat) && (!q || p.name.toLowerCase().includes(q) || (p.barcode || "").includes(q) || p.ref.toLowerCase().includes(q)));
  const sub = c.lines.reduce((a, l) => a + l.qty * l.price, 0);
  return `${head("Point de vente", sess ? `Caisse « ${esc(sess.register)} » ouverte depuis ${hm(sess.openedAt)} · ${esc(me().name)}` : "Ouvrez votre session de caisse pour encaisser en espèces.", sess ? "" : `<button class="btn b-amb" data-a="sheet" data-s="opencash">Ouvrir ma caisse</button>`)}
  <div class="pos"><div style="display:flex;flex-direction:column;gap:12px;min-width:0">
    <form novalidate data-f="psearch"><input class="inp" id="pq" name="q" value="${esc(UI.flt.pq || "")}" placeholder="Produit, référence ou code-barres" aria-label="Rechercher un produit"></form>
    <div class="chips"><button class="chip ${!cat ? "on" : ""}" data-a="pcat" data-c="">Tout</button>${CATS.filter((x) => d.products.some((p) => p.cat === x)).map((x) => `<button class="chip ${cat === x ? "on" : ""}" data-a="pcat" data-c="${esc(x)}">${esc(x)}</button>`).join("")}</div>
    <div class="pgrid">${list.map((p) => { const inq = c.lines.find((l) => l.pid === p.id); return `<button class="prod ${p.stock <= 0 ? "out" : ""}" data-a="add" data-id="${p.id}">${inq ? `<span class="q">${inq.qty}</span>` : ""}<span class="pc">${esc(p.cat)}</span><b>${esc(p.name)}</b><span class="pr num">${F(p.price)}</span><span class="st">${p.stock <= 0 ? "Rupture" : nb(p.stock) + " en stock"}</span></button>`; }).join("") || emptyS("Aucun produit", d.products.length ? "Aucun produit ne correspond à la recherche." : "Ajoutez vos produits dans le catalogue pour commencer à vendre.", can("stock_edit") && !d.products.length ? `<button class="btn b-amb" data-a="go" data-v="produits">Ouvrir le catalogue</button>` : "")}</div>
  </div>
  <div class="card cartp" id="cartp" style="display:flex;flex-direction:column;gap:6px">
    <div class="ph"><h2>Ticket en cours</h2>${c.lines.length ? `<button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="sheet" data-s="clearcart">Vider</button>` : ""}</div>
    ${c.lines.length ? c.lines.map((l, i) => `<div class="cline"><div class="tx"><b>${esc(l.name)}</b><span class="num">${F(l.price)} × ${l.qty} = ${F(l.price * l.qty)}</span></div><button class="qbtn" data-a="qty" data-i="${i}" data-d="-1" aria-label="Moins">−</button><span class="num" style="min-width:22px;text-align:center;font-weight:800">${l.qty}</span><button class="qbtn" data-a="qty" data-i="${i}" data-d="1" aria-label="Plus">+</button></div>`).join("") : `<div class="small" style="padding:14px 0">Touchez un produit pour l'ajouter.</div>`}
    <div class="row"><span>Sous-total</span><b class="num">${Fk(sub)}</b></div>
    <div class="row"><span>Remise</span><button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="remise">${c.discount ? "− " + F(c.discount) : "Ajouter"}</button></div>
    <div class="row"><span style="font-weight:800">Total</span><b class="num" style="font-size:20px;color:var(--amber2)">${Fk(Math.max(0, sub - c.discount))}</b></div>
    <button class="btn b-amb full" style="min-height:52px;font-size:15px" data-a="pay" ${c.lines.length ? "" : "disabled"}>Encaisser</button>
  </div></div>
  ${c.lines.length ? `<div class="cartfab"><div><button style="flex:1;min-width:0;text-align:left" data-a="tocart"><span class="small" style="display:block">${c.lines.reduce((a, l) => a + l.qty, 0)} article(s) · voir le ticket</span><b class="num" style="font-size:17px">${Fk(Math.max(0, sub - c.discount))}</b></button><button class="btn b-amb" data-a="pay">Encaisser</button></div></div>` : ""}`;
};

function salesFiltered() {
  const d = db(); const f = UI.flt; const [a, z] = range();
  let list = d.sales.filter((s) => s.at >= a && s.at < z);
  if (role() === "caissier") list = list.filter((s) => s.by === me().id);
  if (f.emp) list = list.filter((s) => s.by === f.emp); if (f.mode) list = list.filter((s) => s.mode === f.mode); if (f.prod) list = list.filter((s) => s.lines.some((l) => l.pid === f.prod)); if (f.st) list = list.filter((s) => s.status === f.st); if (f.reg) list = list.filter((s) => (s.register || "") === f.reg);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter((s) => s.num.toLowerCase().includes(q) || (s.client || "").toLowerCase().includes(q) || (s.ref || "").toLowerCase().includes(q)); }
  const sort = f.sort || "recent";
  return list.slice().sort((x, y) => (sort === "ancien" ? x.at - y.at : sort === "montant" ? y.total - x.total : y.at - x.at));
}
VIEWS.ventes = () => {
  if (!UI.bar) return needBar(); if (!can("ventes")) return locked("Historique des ventes");
  const d = db(); const f = UI.flt; const [, , label] = range(); const list = salesFiltered();
  const ok = list.filter((s) => s.status !== "annulee"); const ann = list.filter((s) => s.status === "annulee"); const cred = list.filter((s) => s.status === "credit");
  const sum = (arr, fn) => arr.reduce((a, s) => a + fn(s), 0);
  const ca = sum(ok, (s) => s.total); const enc = sum(ok.filter((s) => s.status === "payee"), (s) => s.total);
  const byMode = {}; const byEmp = {}; const top = {};
  ok.forEach((s) => { const m = MODES.find((x) => x[0] === s.mode); const k = m ? m[1] : s.mode; byMode[k] = (byMode[k] || 0) + s.total; byEmp[s.byName] = (byEmp[s.byName] || 0) + s.total; s.lines.forEach((l) => (top[l.name] = (top[l.name] || 0) + l.qty)); });
  const emps = S.employees.filter((e) => e.bars.includes(UI.bar)); const regs = [...new Set(d.sales.map((s) => s.register).filter(Boolean))];
  const lim = UI.vlim || 30; const shown = list.slice(0, lim); const active = ["q", "emp", "mode", "prod", "st", "reg"].some((k) => f[k]);
  const printBtn = (s) => `<button class="ib" data-a="printsale" data-id="${s.id}" aria-label="Imprimer le reçu ${s.num}" data-tip="${printsOf(s).length ? "Réimprimer (duplicata)" : "Imprimer le reçu"}">${ic("print", 17)}</button>`;
  return `${head("Historique des ventes", `${esc(label)} · ${list.length} vente${list.length > 1 ? "s" : ""}${role() === "caissier" ? " · vos ventes" : ""}`, list.length ? `<button class="btn b-sec" data-a="vexport">${ic("download", 16)}Exporter</button><button class="btn b-amb" data-a="vprint">${ic("print", 16)}Imprimer le journal</button>` : "")}
  ${periodBar()}
  <div class="kpis">
    <div class="kpi hero"><small>Chiffre d'affaires · ${esc(label)}</small><b class="num">${Fk(ca)}</b><i>${ok.length} vente${ok.length > 1 ? "s" : ""} valide${ok.length > 1 ? "s" : ""} · ${ann.length} annulée${ann.length > 1 ? "s" : ""}</i></div>
    <div class="kpi"><small>Encaissé</small><b class="num">${Fk(enc)}</b><i>hors ventes à crédit</i></div>
    <div class="kpi"><small>Panier moyen</small><b class="num">${Fk(ok.length ? ca / ok.length : 0)}</b><i>par vente valide</i></div>
    <div class="kpi"><small>Articles vendus</small><b class="num">${nb(sum(ok, qtyOf))}</b><i>toutes catégories</i></div>
    <div class="kpi"><small>Remises</small><b class="num">${Fk(sum(ok, (s) => s.discount || 0))}</b><i>${ok.filter((s) => s.discount).length} vente(s)</i></div>
    <div class="kpi"><small>À crédit</small><b class="num">${Fk(sum(cred, (s) => s.total))}</b><i>${cred.length} vente(s)</i></div>
    <div class="kpi"><small>Annulées</small><b class="num ${ann.length ? "down" : ""}">${Fk(sum(ann, (s) => s.total))}</b><i>${ann.length} vente(s)</i></div>
  </div>
  ${ok.length ? `<div class="grid g3"><div class="card"><h2>Par moyen de paiement</h2>${meters(byMode)}</div><div class="card"><h2>Par employé</h2>${meters(byEmp)}</div><div class="card"><h2>Produits les plus vendus</h2>${meters(top, (v) => nb(v) + " u.", 6)}</div></div>` : ""}
  <form novalidate class="card fgrid vflt ${UI.vfopen || active ? "open" : ""}" data-f="vflt">
    <div class="field"><label for="vq">Rechercher</label><input class="inp" id="vq" name="q" value="${esc(f.q || "")}" placeholder="N°, client ou référence"></div>
    <div class="field vf-more"><label for="ve">Employé</label><select class="inp" id="ve" name="emp"><option value="">Tous</option>${emps.map((e) => `<option value="${e.id}" ${f.emp === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select></div>
    <div class="field vf-more"><label for="vr">Caisse</label><select class="inp" id="vr" name="reg"><option value="">Toutes</option>${regs.map((r) => `<option ${f.reg === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
    <div class="field vf-more"><label for="vp">Produit</label><select class="inp" id="vp" name="prod"><option value="">Tous</option>${d.products.map((p) => `<option value="${p.id}" ${f.prod === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
    <div class="field vf-more"><label for="vm">Paiement</label><select class="inp" id="vm" name="mode"><option value="">Tous</option>${MODES.map(([k, l]) => `<option value="${k}" ${f.mode === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field vf-more"><label for="vs">État</label><select class="inp" id="vs" name="st"><option value="">Tous</option><option value="payee" ${f.st === "payee" ? "selected" : ""}>Payée</option><option value="credit" ${f.st === "credit" ? "selected" : ""}>À crédit</option><option value="annulee" ${f.st === "annulee" ? "selected" : ""}>Annulée</option></select></div>
    <div class="field vf-more"><label for="vt">Trier par</label><select class="inp" id="vt" name="sort"><option value="recent">Plus récentes</option><option value="ancien" ${f.sort === "ancien" ? "selected" : ""}>Plus anciennes</option><option value="montant" ${f.sort === "montant" ? "selected" : ""}>Montant décroissant</option></select></div>
    <div class="acts" style="align-self:end"><button class="btn b-amb">Appliquer</button><button type="button" class="btn b-sec vf-tog" data-a="vftog">${UI.vfopen || active ? "Moins de filtres" : "Plus de filtres"}</button>${active ? `<button type="button" class="btn b-sec" data-a="vreset">Effacer</button>` : ""}</div>
  </form>
  ${list.length ? `<div class="tw vtable"><table><thead><tr><th>N° de vente</th><th>Date</th><th>Caisse</th><th>Employé</th><th class="r">Articles</th><th>Paiement</th><th class="r">Total</th><th>État</th><th>Reçu</th></tr></thead><tbody>${shown.map((s) => `<tr class="click" data-a="sheet" data-s="sale" data-id="${s.id}"><td class="num">${s.num}</td><td class="num">${dt(s.at)}</td><td>${esc(s.register || "—")}</td><td>${esc(s.byName)}</td><td class="r num">${qtyOf(s)}</td><td>${esc(modeL(s.mode, s.op))}</td><td class="r num">${Fk(s.total)}</td><td>${saleTag(s)}</td><td>${printBtn(s)}</td></tr>`).join("")}</tbody></table></div>
  <div class="vcards">${shown.map((s) => `<div class="vcard" data-a="sheet" data-s="sale" data-id="${s.id}" role="button" tabindex="0"><div class="vc1"><b class="num">${s.num}</b><b class="num">${Fk(s.total)}</b></div><div class="vc2"><span>${hm(s.at)} · ${dS(s.at)} · ${esc(s.byName)}</span>${saleTag(s)}</div><div class="vc2"><span>${qtyOf(s)} article${qtyOf(s) > 1 ? "s" : ""} · ${esc(modeL(s.mode, s.op))}</span>${printBtn(s)}</div></div>`).join("")}</div>
  ${list.length > lim ? `<button class="btn b-sec full" data-a="vmore">Afficher ${Math.min(30, list.length - lim)} vente(s) de plus · ${list.length - lim} restante(s)</button>` : ""}` : emptyS("Aucune vente", active ? "Aucune vente ne correspond à ces filtres sur la période." : "Les ventes de la période apparaîtront ici.")}`;
};
const saleTag = (s) => (s.status === "annulee" ? '<span class="tag t-crit">Annulée</span>' : s.status === "credit" ? '<span class="tag t-warn">À crédit</span>' : '<span class="tag t-good">Payée</span>');

VIEWS.caisses = () => {
  if (!UI.bar) return needBar(); if (!can("caisse")) return locked("Caisses");
  const d = db(); const open = d.sessions.filter((s) => !s.closedAt); const mine = open.find((s) => s.by === me().id);
  const hist = d.sessions.filter((s) => s.closedAt && (can("caisse_val") || s.by === me().id)).sort((x, y) => y.closedAt - x.closedAt).slice(0, 40);
  const byEmp = {}; hist.forEach((s) => { byEmp[s.byName] = byEmp[s.byName] || { n: 0, e: 0, neg: 0 }; byEmp[s.byName].n++; byEmp[s.byName].e += s.ecart || 0; if (s.ecart < 0) byEmp[s.byName].neg++; });
  return `${head("Sessions de caisse", "Seules les espèces entrent dans le solde théorique du tiroir ; les paiements électroniques sont suivis à part.", mine ? "" : `<button class="btn b-amb" data-a="sheet" data-s="opencash">${ic("plus", 17)}Ouvrir une session</button>`)}
  <h2>Sessions ouvertes</h2>
  ${open.length ? `<div class="grid g3">${open.map((s) => { const t = theoCash(d, s); return `<div class="card" style="display:flex;flex-direction:column;gap:6px"><div class="ph"><b style="font-size:16px">${esc(s.register)}</b><span class="tag t-good">Ouverte</span></div><div class="small">${esc(s.byName)} · depuis ${dt(s.openedAt)}</div>
    <div class="row"><span>Fonds initial</span><b class="num">${Fk(s.fond)}</b></div>
    <div class="row"><span>+ Espèces encaissées</span><b class="num">${Fk(t.cash)}</b></div>
    <div class="row"><span>− Remboursements</span><b class="num">${Fk(t.refunds)}</b></div>
    <div class="row"><span>− Sorties / + entrées</span><b class="num">${Fk(t.outs)} / ${F(t.ins)}</b></div>
    <div class="row"><span style="font-weight:800">Solde théorique</span><b class="num" style="color:var(--amber2)">${Fk(t.theo)}</b></div>
    <div class="small">Hors tiroir : Mobile Money ${F(t.byMode.momo)} · Carte ${F(t.byMode.carte)} · Virement ${F(t.byMode.virement)} · Crédit ${F(t.byMode.credit)}</div>
    ${s.by === me().id || can("caisse_val") ? `<div class="acts"><button class="btn b-sec" data-a="sheet" data-s="cashmove" data-id="${s.id}">Sortie / entrée</button><button class="btn b-amb" data-a="sheet" data-s="closecash" data-id="${s.id}">Fermer la caisse</button></div>` : ""}</div>`; }).join("")}</div>` : emptyS("Aucune caisse ouverte", "Ouvrez une caisse en indiquant le fonds initial pour encaisser des espèces.")}
  <div class="grid g2">
    <div class="card"><h2>Écarts par employé</h2>${Object.entries(byEmp).map(([k, v]) => `<div class="row"><span>${esc(k)} · ${v.n} clôture${v.n > 1 ? "s" : ""}${v.neg >= 3 ? ' <span class="tag t-warn">écarts répétés</span>' : ""}</span><b class="num ${v.e < 0 ? "down" : ""}">${sFk(v.e)}</b></div>`).join("") || '<div class="small">Aucune clôture.</div>'}</div>
    <div class="card"><h2>Écarts par caisse</h2>${REGISTERS.map((r) => { const ss = hist.filter((s) => s.register === r); return `<div class="row"><span>${r} · ${ss.length} session${ss.length > 1 ? "s" : ""}</span><b class="num">${sFk(ss.reduce((a, s) => a + (s.ecart || 0), 0))}</b></div>`; }).join("")}</div>
  </div>
  <h2>Historique des sessions</h2>
  ${hist.length ? `<div class="tw"><table><thead><tr><th>Caisse</th><th>Employé</th><th>Ouverture</th><th>Fermeture</th><th class="r">Théorique</th><th class="r">Compté</th><th class="r">Écart</th><th>Validation</th></tr></thead><tbody>${hist.map((s) => `<tr class="click" data-a="sheet" data-s="session" data-id="${s.id}"><td>${esc(s.register)}</td><td>${esc(s.byName)}</td><td class="num">${dt(s.openedAt)}</td><td class="num">${dt(s.closedAt)}</td><td class="r num">${Fk(s.theo)}</td><td class="r num">${Fk(s.counted)}</td><td class="r num ${s.ecart < 0 ? "down" : s.ecart > 0 ? "up" : ""}">${sF(s.ecart)}</td><td>${s.validatedBy ? `<span class="tag t-good">${ic("lock", 12)} ${esc(s.validatedBy)}</span>` : '<span class="tag t-warn">À valider</span>'}</td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucun historique", "Les fermetures de caisse apparaîtront ici.")}`;
};

VIEWS.produits = () => {
  if (!UI.bar) return needBar(); if (!can("stock")) return locked("Produits");
  const d = db(); const showArch = UI.flt.arch;
  const list = d.products.filter((p) => (showArch ? !p.active : p.active));
  return `${head("Catalogue produits", `${list.length} produit${list.length > 1 ? "s" : ""} ${showArch ? "archivés" : "actifs"}`, `${can("stock_edit") ? `<button class="btn b-amb" data-a="sheet" data-s="product">${ic("plus", 17)}Nouveau produit</button>` : ""}<button class="btn b-sec" data-a="toggleArch">${showArch ? "Produits actifs" : "Archives"}</button>`)}
  ${list.length ? `<div class="tw"><table><thead><tr><th>Produit</th><th>Réf.</th><th>Catégorie</th><th>Fournisseur</th><th class="r">Achat</th><th class="r">Vente</th><th class="r">Stock</th><th class="r">Seuil</th><th>État</th></tr></thead><tbody>${list.map((p) => { const [l, c] = stockState(d, p); return `<tr class="click" data-a="sheet" data-s="product" data-id="${p.id}"><td><b>${esc(p.name)}</b><br><span class="small">${esc(p.barcode || "sans code-barres")}</span></td><td>${esc(p.ref)}</td><td>${esc(p.cat)}</td><td>${esc(sup(p.supplierId).name)}</td><td class="r num">${Fk(p.buy)}</td><td class="r num">${Fk(p.price)}</td><td class="r num">${nb(p.stock)} ${esc(p.unit)}</td><td class="r num">${p.min}</td><td><span class="tag ${p.active ? c : "t-mut"}">${p.active ? l : "Archivé"}</span></td></tr>`; }).join("")}</tbody></table></div>` : emptyS(showArch ? "Aucun produit archivé" : "Aucun produit", "Ajoutez vos produits un par un, ou partez du catalogue type d'un bar ivoirien (bières, vins, spiritueux, softs, grillades) à ajuster ensuite.", can("stock_edit") && !showArch ? `<div class="acts" style="justify-content:center"><button class="btn b-amb" data-a="sheet" data-s="product">Nouveau produit</button><button class="btn b-sec" data-a="importCatalog">Catalogue type</button></div>` : "")}`;
};
VIEWS.categories = () => {
  if (!UI.bar) return needBar(); if (!can("stock")) return locked("Catégories");
  const d = db();
  return `${head("Catégories", "Catégories de produits de cet établissement.")}<div class="grid g3">${CATS.map((c) => { const ps = d.products.filter((p) => p.cat === c && p.active); return `<div class="card"><div class="ph"><b style="font-size:15px">${esc(c)}</b><span class="tag t-amb">${ps.length} produit${ps.length > 1 ? "s" : ""}</span></div><div class="small" style="margin-top:6px">Valeur en stock : ${F(ps.reduce((a, p) => a + Math.max(0, p.stock) * p.buy, 0))}</div><div class="small">${ps.slice(0, 4).map((p) => esc(p.name)).join(", ")}${ps.length > 4 ? "…" : ""}</div></div>`; }).join("")}</div>`;
};
VIEWS.etat = () => {
  if (!UI.bar) return needBar(); if (!can("stock")) return locked("État des stocks");
  const d = db(); const ps = d.products.filter((p) => p.active);
  const g = { "Rupture": [], "Stock faible": [], "Bientôt en rupture": [], "Normal": [] }; ps.forEach((p) => g[stockState(d, p)[0]].push(p));
  return `${head("État des stocks", `Valeur totale au prix d'achat : ${F(stockVal(d))}`, can("stock_edit") ? `<button class="btn b-amb" data-a="sheet" data-s="stockmove">Mouvement de stock</button>` : "")}
  <div class="kpis"><div class="kpi"><small>Ruptures</small><b class="num ${g.Rupture.length ? "down" : ""}">${g.Rupture.length}</b></div><div class="kpi"><small>Sous le seuil</small><b class="num">${g["Stock faible"].length}</b></div><div class="kpi"><small>Bientôt en rupture</small><b class="num">${g["Bientôt en rupture"].length}</b><i>stock sous 3 jours</i></div><div class="kpi"><small>Normal</small><b class="num">${g.Normal.length}</b></div></div>
  <div class="tw"><table><thead><tr><th>Produit</th><th>Catégorie</th><th class="r">Stock</th><th class="r">Seuil</th><th class="r">Ventes / jour</th><th class="r">Jours restants</th><th class="r">Valeur</th><th>État</th></tr></thead><tbody>${["Rupture", "Stock faible", "Bientôt en rupture", "Normal"].flatMap((k) => g[k]).map((p) => { const v = velocity(d, p.id); const [l, c] = stockState(d, p); return `<tr><td>${esc(p.name)}</td><td>${esc(p.cat)}</td><td class="r num">${nb(p.stock)}</td><td class="r num">${p.min}</td><td class="r num">${v.toFixed(1).replace(".", ",")}</td><td class="r num">${v > 0 ? Math.floor(p.stock / v) : "—"}</td><td class="r num">${Fk(Math.max(0, p.stock) * p.buy)}</td><td><span class="tag ${c}">${l}</span></td></tr>`; }).join("")}</tbody></table></div>`;
};
VIEWS.mouvements = () => {
  if (!UI.bar) return needBar(); if (!can("stock")) return locked("Mouvements de stock");
  const d = db(); const [a, z, label] = range();
  const sold = []; d.sales.filter((s) => s.at >= a && s.at < z).forEach((s) => s.lines.forEach((l) => sold.push({ at: s.at, name: l.name, delta: -l.qty, type: s.status === "annulee" ? "Vente annulée (remis en stock)" : "Vente", ref: s.num, by: s.byName })));
  const list = [...d.moves.filter((m) => m.at >= a && m.at < z), ...sold.filter((x) => !x.type.startsWith("Vente annulée"))].sort((x, y) => y.at - x.at);
  return `${head("Mouvements de stock", `${label} · chaque modification du stock laisse une trace.`)}${periodBar()}
  ${list.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Produit</th><th>Type</th><th class="r">Quantité</th><th>Référence</th><th>Par</th></tr></thead><tbody>${list.slice(0, 250).map((m) => `<tr><td class="num">${dt(m.at)}</td><td>${esc(m.name)}</td><td>${esc(m.type)}</td><td class="r num ${m.delta < 0 ? "down" : "up"}">${m.delta > 0 ? "+" : ""}${m.delta}</td><td>${esc(m.ref || "")}</td><td>${esc(m.by)}</td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucun mouvement", "Aucun mouvement de stock sur la période.")}`;
};
VIEWS.inventaires = () => {
  if (!UI.bar) return needBar(); if (!can("stock_edit")) return locked("Inventaires");
  const d = db(); const inv = UI.inv;
  if (inv) return `${head("Inventaire en cours", "Saisissez les quantités réellement comptées. Les produits laissés vides ne sont pas modifiés.")}
    <form novalidate data-f="inventory" style="display:flex;flex-direction:column;gap:12px"><div class="tw"><table><thead><tr><th>Produit</th><th class="r">Théorique</th><th class="r">Compté</th></tr></thead><tbody>${d.products.filter((p) => p.active).map((p) => `<tr><td>${esc(p.name)}<br><span class="small">${esc(p.cat)}</span></td><td class="r num">${nb(p.stock)}</td><td class="r"><input class="inp num" style="width:96px;min-height:38px;text-align:right" type="number" min="0" name="c_${p.id}" aria-label="Quantité comptée ${esc(p.name)}"></td></tr>`).join("")}</tbody></table></div>
    <div class="field"><label for="ic">Commentaire</label><input class="inp" id="ic" name="comment" placeholder="Inventaire de fin de mois"></div>
    <div class="acts"><button class="btn b-amb">Valider l'inventaire</button><button type="button" class="btn b-sec" data-a="invcancel">Abandonner</button></div></form>`;
  return `${head("Inventaires", "Un inventaire compare le stock théorique au stock compté et corrige le stock avec une trace.", `<button class="btn b-amb" data-a="invstart">${ic("plus", 17)}Nouvel inventaire</button>`)}
  ${d.inventories.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Par</th><th class="r">Produits comptés</th><th class="r">Écart (quantité)</th><th class="r">Écart (valeur)</th><th>Commentaire</th></tr></thead><tbody>${d.inventories.slice().sort((x, y) => y.at - x.at).map((i) => `<tr><td class="num">${dt(i.at)}</td><td>${esc(i.by)}</td><td class="r num">${i.lines}</td><td class="r num ${i.ecartQty < 0 ? "down" : ""}">${i.ecartQty}</td><td class="r num ${i.ecartValue < 0 ? "down" : ""}">${sFk(i.ecartValue)}</td><td>${esc(i.comment)}</td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucun inventaire", "Lancez votre premier inventaire pour vérifier le stock réel.")}`;
};
function assignCalc(d, a) {
  let sold = 0; d.sales.forEach((s) => { if (s.at >= a.at && s.status !== "annulee" && s.by === a.empId) s.lines.forEach((l) => { if (l.pid === a.pid) sold += l.qty; }); });
  let losses = 0, offered = 0; d.losses.forEach((l) => { if (l.at >= a.at && l.pid === a.pid && l.status === "approuvée" && l.byId === a.empId) { if (l.type.startsWith("Produit offert")) offered += l.qty; else losses += l.qty; } });
  const theo = a.qty - sold - losses - offered - (a.otherOut || 0) + (a.transfersIn || 0);
  return { sold, losses, offered, theo };
}
VIEWS.attribution = () => {
  if (!UI.bar) return needBar(); if (!can("attrib")) return locked("Attribution du stock");
  const d = db(); const act = d.assigns.filter((a) => a.status === "en cours");
  return `${head("Dotations de stock", "Confiez une quantité à un employé ou une équipe, puis contrôlez ce qui reste à la fin du service.", `<button class="btn b-amb" data-a="sheet" data-s="assign">${ic("plus", 17)}Nouvelle dotation</button>`)}
  ${act.length ? `<div class="grid g3">${act.map((a) => { const c = assignCalc(d, a); return `<div class="card" style="display:flex;flex-direction:column;gap:6px"><div class="ph"><b style="font-size:15px">${esc(a.empName)}</b><span class="tag t-info">En cours</span></div><div class="small">${esc(a.name)} · attribué le ${dt(a.at)} par ${esc(a.by)}</div>
    <div class="row"><span>Stock initial attribué</span><b class="num">${a.qty}</b></div><div class="row"><span>− Vendus (ventes de l'employé)</span><b class="num">${c.sold}</b></div><div class="row"><span>− Pertes / offerts approuvés</span><b class="num">${c.losses} / ${c.offered}</b></div><div class="row"><span>+ Transferts reçus</span><b class="num">${a.transfersIn || 0}</b></div><div class="row"><span style="font-weight:800">Stock théorique restant</span><b class="num" style="color:var(--amber2)">${c.theo}</b></div>
    <div class="acts"><button class="btn b-sec" data-a="transfer" data-id="${a.id}">+ Transfert reçu</button><button class="btn b-amb" data-a="sheet" data-s="control" data-id="${a.id}">Contrôler</button></div></div>`; }).join("")}</div>` : emptyS("Aucune attribution en cours", "Attribuez par exemple 24 bouteilles à un barman en début de service.")}`;
};
VIEWS.controle = () => {
  if (!UI.bar) return needBar(); if (!can("attrib")) return locked("Contrôle du stock");
  const d = db();
  return `${head("Contrôle des dotations", "Résultats des contrôles physiques. Un écart sert à organiser une vérification : ce n'est pas une preuve de vol.", `<button class="btn b-amb" data-a="go" data-v="attribution">Contrôler une dotation</button>`)}
  ${d.controls.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Employé</th><th>Produit</th><th class="r">Théorique</th><th class="r">Compté</th><th class="r">Écart</th><th class="r">Valeur</th><th>Statut</th></tr></thead><tbody>${d.controls.slice().sort((x, y) => y.at - x.at).map((c) => `<tr class="click" data-a="sheet" data-s="ctrl" data-id="${c.id}"><td class="num">${dt(c.at)}</td><td>${esc(c.empName)}</td><td>${esc(c.name)}</td><td class="r num">${c.theo}</td><td class="r num">${c.counted}</td><td class="r num ${c.ecart < 0 ? "down" : c.ecart > 0 ? "up" : ""}">${c.ecart > 0 ? "+" : ""}${c.ecart}</td><td class="r num">${sFk(c.value)}</td><td><span class="tag ${c.status === "à examiner" ? "t-warn" : "t-good"}">${esc(c.status)}</span></td></tr>`).join("")}</tbody></table></div><div class="small">Formule : stock théorique = attribué − vendus − pertes − offerts − autres sorties + transferts reçus. Écart = compté − théorique.</div>` : emptyS("Aucun contrôle", "Les contrôles des attributions apparaîtront ici.")}`;
};
VIEWS.pertes = () => {
  if (!UI.bar) return needBar(); if (!can("pertes")) return locked("Pertes et produits offerts");
  const d = db(); const pend = d.losses.filter((l) => l.status === "en attente");
  return `${head("Pertes et offerts", "Sorties de stock qui ne sont pas des ventes. Les sorties approuvées mettent à jour le stock et apparaissent dans les rapports.", `<button class="btn b-amb" data-a="sheet" data-s="loss">${ic("plus", 17)}Déclarer une sortie</button>`)}
  ${pend.length ? `<div class="note warn">${pend.length} sortie${pend.length > 1 ? "s" : ""} en attente d'approbation.</div>` : ""}
  ${d.losses.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Produit</th><th>Motif</th><th class="r">Qté</th><th class="r">Valeur</th><th>Demandé par</th><th>Approbation</th><th></th></tr></thead><tbody>${d.losses.slice().sort((x, y) => y.at - x.at).map((l) => `<tr><td class="num">${dt(l.at)}</td><td>${esc(l.name)}${l.comment ? `<br><span class="small">${esc(l.comment)}</span>` : ""}</td><td>${esc(l.type)}</td><td class="r num">${l.qty}</td><td class="r num">${Fk(l.value)}</td><td>${esc(l.by)}</td><td>${l.status === "approuvée" ? `<span class="tag t-good">${esc(l.approvedBy || "Approuvée")}</span>` : l.status === "refusée" ? '<span class="tag t-crit">Refusée</span>' : '<span class="tag t-warn">En attente</span>'}</td><td>${l.status === "en attente" && can("pertes_ok") ? `<span class="acts"><button class="btn b-good" style="min-height:34px;padding:4px 10px" data-a="lossok" data-id="${l.id}">Approuver</button><button class="btn b-crit" style="min-height:34px;padding:4px 10px" data-a="lossko" data-id="${l.id}">Refuser</button></span>` : ""}</td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucune sortie", "Déclarez ici une bouteille cassée, un produit offert ou une consommation du personnel.")}`;
};

VIEWS.fournisseurs = () => {
  if (!UI.bar) return needBar(); if (!can("achats")) return locked("Fournisseurs");
  const d = db();
  return `${head("Fournisseurs", "", `<button class="btn b-amb" data-a="sheet" data-s="supplier">${ic("plus", 17)}Nouveau fournisseur</button>`)}
  ${d.suppliers.length ? `<div class="grid g3">${d.suppliers.map((s) => { const os = d.orders.filter((o) => o.supplierId === s.id && o.status !== "annulée"); const due = os.reduce((a, o) => a + o.total - o.paid, 0); return `<div class="card" style="display:flex;flex-direction:column;gap:6px"><div class="ph"><b style="font-size:15px">${esc(s.name)}</b>${due > 0 ? `<span class="tag t-warn">Dû ${F(due)}</span>` : '<span class="tag t-good">Soldé</span>'}</div><div class="small">${esc(s.contact || "")} · ${esc(s.phone)}${s.email ? " · " + esc(s.email) : ""}</div><div class="small">${esc(s.address)}${s.comment ? " · " + esc(s.comment) : ""}</div><div class="row"><span>Commandes</span><b class="num">${os.length} · ${F(os.reduce((a, o) => a + o.total, 0))}</b></div><div class="acts"><button class="btn b-sec" data-a="sheet" data-s="supplier" data-id="${s.id}">Modifier</button><button class="btn b-sec" data-a="supOrders" data-id="${s.id}">Commandes</button></div></div>`; }).join("")}</div>` : emptyS("Aucun fournisseur", "Ajoutez vos fournisseurs pour enregistrer commandes, réceptions et paiements.")}`;
};
VIEWS.commandes = () => {
  if (!UI.bar) return needBar(); if (!can("achats")) return locked("Commandes d'achat");
  const d = db(); const f = UI.flt.sup;
  const list = d.orders.filter((o) => !f || o.supplierId === f).sort((x, y) => y.at - x.at);
  return `${head("Bons de commande", "Une commande non reçue n'augmente pas le stock disponible." + (f ? " Filtre : " + esc(sup(f).name) : ""), `<button class="btn b-amb" data-a="sheet" data-s="order">${ic("plus", 17)}Nouvelle commande</button>${f ? `<button class="btn b-sec" data-a="supOrders" data-id="">Toutes</button>` : ""}`)}
  ${list.length ? `<div class="tw"><table><thead><tr><th>N°</th><th>Date</th><th>Fournisseur</th><th class="r">Total</th><th class="r">Payé</th><th class="r">Solde</th><th>Statut</th></tr></thead><tbody>${list.map((o) => `<tr class="click" data-a="sheet" data-s="orderdoc" data-id="${o.id}"><td class="num">${o.num}</td><td class="num">${dFR(o.at)}</td><td>${esc(sup(o.supplierId).name)}</td><td class="r num">${Fk(o.total)}</td><td class="r num">${Fk(o.paid)}</td><td class="r num">${Fk(o.total - o.paid)}</td><td>${ordTag(o)}</td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucune commande", "Créez une commande fournisseur pour suivre livraison et paiement.")}`;
};
const ordTag = (o) => `<span class="tag ${o.status === "reçue" ? "t-good" : o.status === "partielle" ? "t-amb" : o.status === "annulée" ? "t-crit" : "t-info"}">${o.status === "reçue" ? "Reçue" : o.status === "partielle" ? "Reçue en partie" : o.status === "annulée" ? "Annulée" : "Commandée"}</span>`;
VIEWS.receptions = () => {
  if (!UI.bar) return needBar(); if (!can("achats")) return locked("Réceptions");
  const d = db(); const todo = d.orders.filter((o) => o.status === "commandée" || o.status === "partielle"); const done = d.moves.filter((m) => m.type === "Réception").concat(d.orders.filter((o) => o.status === "reçue" && !d.moves.some((m) => m.ref === o.num)).map((o) => ({ at: o.at, name: o.lines.length + " produit(s)", delta: o.lines.reduce((a, l) => a + l.received, 0), ref: o.num, by: o.by })));
  return `${head("Réceptions", "Les quantités acceptées entrent en stock après validation.")}
  <h2>Commandes à réceptionner</h2>
  ${todo.length ? `<div class="grid g3">${todo.map((o) => `<div class="card" style="display:flex;flex-direction:column;gap:6px"><div class="ph"><b>${o.num}</b>${ordTag(o)}</div><div class="small">${esc(sup(o.supplierId).name)} · ${dFR(o.at)}</div>${o.lines.map((l) => `<div class="row"><span>${esc(prod(l.pid).name)}</span><b class="num">${l.received} / ${l.qty}</b></div>`).join("")}<button class="btn b-amb" data-a="sheet" data-s="receive" data-id="${o.id}">Réceptionner</button></div>`).join("")}</div>` : emptyS("Rien à réceptionner", "Toutes les commandes ont été reçues.")}
  <h2>Réceptions enregistrées</h2>
  ${done.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Commande</th><th>Produit</th><th class="r">Quantité acceptée</th><th>Par</th></tr></thead><tbody>${done.sort((x, y) => y.at - x.at).map((m) => `<tr><td class="num">${dt(m.at)}</td><td>${esc(m.ref)}</td><td>${esc(m.name)}</td><td class="r num up">+${m.delta}</td><td>${esc(m.by)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
};

VIEWS.depenses = () => {
  if (!UI.bar) return needBar(); if (!can("depenses") && !can("depenses_ok")) return locked("Dépenses");
  const d = db(); const [a, z, label] = range(); const cat = UI.flt.dcat || "";
  const list = d.expenses.filter((e) => e.at >= a && e.at < z && (!cat || e.cat === cat)).sort((x, y) => y.at - x.at);
  const pend = d.expenses.filter((e) => e.status === "en attente");
  const months = [...Array(3)].map((_, i) => { const x = new Date(sod()); x.setDate(1); x.setMonth(x.getMonth() - (2 - i)); const y = new Date(x); y.setMonth(y.getMonth() + 1); return { l: x.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), s: x.toLocaleDateString("fr-FR", { month: "short" }), v: d.expenses.filter((e) => e.status === "approuvée" && e.at >= x.getTime() && e.at < y.getTime()).reduce((q, e) => q + e.amount, 0) }; });
  return `${head("Charges et dépenses", `${label} · ${F(list.filter((e) => e.status === "approuvée").reduce((x, e) => x + e.amount, 0))} approuvées`, `<button class="btn b-amb" data-a="sheet" data-s="expense">${ic("plus", 17)}Nouvelle dépense</button><button class="btn b-sec" data-a="exportExp">Exporter</button>`)}
  ${periodBar()}
  <div class="chips"><button class="chip ${!cat ? "on" : ""}" data-a="dcat" data-c="">Toutes catégories</button>${EXP_CATS.map((c) => `<button class="chip ${cat === c ? "on" : ""}" data-a="dcat" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
  ${pend.length ? `<div class="note warn">${pend.length} dépense${pend.length > 1 ? "s" : ""} en attente d'approbation (seuil : ${F(d.settings.expApproval)}). Elles ne comptent pas dans les résultats tant qu'elles ne sont pas approuvées.</div>` : ""}
  <div class="grid g2"><div class="card"><h2>Comparaison par mois (approuvées)</h2>${colChart(months, { h: 150 })}</div><div class="card"><h2>Règle de comptabilisation</h2><div class="small" style="line-height:1.6">Les marchandises achetées pour le stock passent par les commandes fournisseurs : leur coût entre dans la marge au moment de la vente. Ne les saisissez pas aussi en dépense, sinon elles seraient comptées deux fois. La catégorie « Achats de boissons » sert aux achats hors stock (glace, dépannage au détail).</div></div></div>
  ${list.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Paiement</th><th>Saisi par</th><th class="r">Montant</th><th>Statut</th><th></th></tr></thead><tbody>${list.map((e) => `<tr><td class="num">${dFR(e.at)}</td><td>${esc(e.label)}${e.proof ? ' <span class="tag t-mut">justificatif</span>' : ""}${e.comment ? `<br><span class="small">${esc(e.comment)}</span>` : ""}</td><td>${esc(e.cat)}</td><td>${esc(modeL(e.mode))}</td><td>${esc(e.by)}</td><td class="r num">${Fk(e.amount)}</td><td>${e.status === "approuvée" ? `<span class="tag t-good">Approuvée</span>` : e.status === "refusée" ? '<span class="tag t-crit">Refusée</span>' : '<span class="tag t-warn">En attente</span>'}</td><td><span class="acts">${e.status === "en attente" && can("depenses_ok") ? `<button class="btn b-good" style="min-height:34px;padding:4px 10px" data-a="expok" data-id="${e.id}">Approuver</button><button class="btn b-crit" style="min-height:34px;padding:4px 10px" data-a="expko" data-id="${e.id}">Refuser</button>` : ""}${can("depenses_ok") ? `<button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="sheet" data-s="expense" data-id="${e.id}">Modifier</button>` : ""}</span></td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucune dépense", "Aucune dépense sur la période ou dans cette catégorie.")}`;
};

VIEWS.roles = () => {
  if (!can("roles")) return locked("Rôles et permissions");
  return `${head("Rôles et permissions", "Chaque action est vérifiée au moment où elle est faite. Dans l'application réelle, le serveur refuse aussi toute opération non autorisée.")}
  <div class="tw"><table class="perm"><thead><tr><th>Permission</th>${ALL.map((r) => `<th title="${ROLES[r]}">${ROLES[r].split(" ")[0].slice(0, 7)}</th>`).join("")}</tr></thead><tbody>${Object.entries(PERMS).map(([k, p]) => `<tr><td>${esc(p.l)}</td>${ALL.map((r) => `<td>${p.r.includes(r) ? `<span style="color:var(--good)">${ic("check", 15, 3)}</span>` : '<span style="color:var(--line2)">—</span>'}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  <div class="small">Rôles : ${ALL.map((r) => ROLES[r]).join(" · ")}.</div>`;
};
VIEWS.presences = () => {
  if (!UI.bar) return needBar(); if (!can("presences")) return locked("Présences");
  const d = db(); const t0 = sod(); const today = d.attendance.filter((x) => x.day === t0);
  const emps = S.employees.filter((e) => e.bars.includes(UI.bar));
  return `${head("Présences", `${present(d)} employé${present(d) > 1 ? "s" : ""} présent${present(d) > 1 ? "s" : ""} en ce moment.`)}
  <div class="tw"><table><thead><tr><th>Employé</th><th>Aujourd'hui</th><th>Arrivée</th><th>Départ</th><th></th></tr></thead><tbody>${emps.map((e) => { const r = today.find((x) => x.empId === e.id); return `<tr><td>${esc(e.name)}<br><span class="small">${esc(e.func)}</span></td><td>${r ? `<span class="tag ${r.status === "absent" ? "t-crit" : r.status === "retard" ? "t-warn" : "t-good"}">${r.status}</span>` : '<span class="tag t-mut">Non pointé</span>'}</td><td class="num">${r && r.in ? hm(r.in) : "—"}</td><td class="num">${r && r.out ? hm(r.out) : "—"}</td><td><span class="acts">${!r || !r.in ? `<button class="btn b-good" style="min-height:34px;padding:4px 10px" data-a="att" data-k="in" data-id="${e.id}">Arrivée</button><button class="btn b-crit" style="min-height:34px;padding:4px 10px" data-a="att" data-k="abs" data-id="${e.id}">Absent</button>` : !r.out ? `<button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="att" data-k="out" data-id="${e.id}">Départ</button>` : ""}</span></td></tr>`; }).join("")}</tbody></table></div>
  <h2>Historique des 7 derniers jours</h2>
  <div class="tw"><table><thead><tr><th>Employé</th>${[...Array(7)].map((_, i) => `<th>${dS(t0 - (6 - i) * DAY)}</th>`).join("")}</tr></thead><tbody>${emps.map((e) => `<tr><td>${esc(e.name)}</td>${[...Array(7)].map((_, i) => { const r = d.attendance.find((x) => x.empId === e.id && x.day === t0 - (6 - i) * DAY); return `<td>${r ? `<span class="tag ${r.status === "absent" ? "t-crit" : r.status === "retard" ? "t-warn" : "t-good"}">${r.status === "présent" ? "P" : r.status === "retard" ? "R" : "A"}</span>` : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div><div class="small">P = présent · R = retard · A = absent</div>`;
};
VIEWS.audit = () => {
  if (!can("audit")) return locked("Journal d'audit");
  const list = (UI.bar ? db().audit.map((x) => ({ ...x, bar: bar().name })) : S.bars.flatMap((b) => S.dbs[b.id].audit.map((x) => ({ ...x, bar: b.name })))).sort((x, y) => y.at - x.at);
  const q = (UI.flt.aq || "").toLowerCase(); const fl = q ? list.filter((x) => [x.user, x.action, x.data, x.motif, x.bar].join(" ").toLowerCase().includes(q)) : list;
  return `${head("Journal d'audit", "Lecture seule. Personne, propriétaire compris, ne peut supprimer une trace depuis l'application.")}
  <form novalidate data-f="aflt"><input class="inp" name="q" value="${esc(UI.flt.aq || "")}" placeholder="Filtrer : utilisateur, action, produit, motif…" aria-label="Filtrer le journal"></form>
  ${fl.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Utilisateur</th><th>Établissement</th><th>Action</th><th>Données</th><th>Avant → Après</th><th>Motif</th></tr></thead><tbody>${fl.slice(0, 200).map((x) => `<tr><td class="num">${dt(x.at)}</td><td>${esc(x.user)}</td><td>${esc(x.bar)}</td><td><b>${esc(x.action)}</b></td><td>${esc(x.data)}</td><td>${x.before || x.after ? esc(x.before || "—") + " → " + esc(x.after || "—") : ""}</td><td>${esc(x.motif)}</td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucun événement", "Les actions sensibles apparaîtront ici.")}`;
};
VIEWS.alertes = () => {
  const src = UI.bar ? [bar()] : myBars(); const f = UI.notifF;
  let list = src.flatMap((b) => S.dbs[b.id].notifs.map((n) => ({ ...n, barId: b.id }))).sort((x, y) => y.at - x.at);
  if (f.cat) list = list.filter((n) => n.cat === f.cat); if (f.prio) list = list.filter((n) => n.prio === f.prio); if (f.read === "non") list = list.filter((n) => !n.read);
  const cats = ["Caisse", "Stock", "Ventes", "Dépenses", "Employés", "Approvisionnements", "Sécurité", "Établissements"];
  return `${head("Centre d'alertes", `${list.filter((n) => !n.read).length} non lue(s)${UI.bar ? " · " + esc(bar().name) : " · tous vos établissements"}`, `<button class="btn b-sec" data-a="readall">Tout marquer lu</button>`)}
  <div class="chips"><button class="chip ${!f.cat ? "on" : ""}" data-a="nf" data-k="cat" data-v="">Toutes catégories</button>${cats.map((c) => `<button class="chip ${f.cat === c ? "on" : ""}" data-a="nf" data-k="cat" data-v="${c}">${c}</button>`).join("")}</div>
  <div class="chips">${[["", "Toutes priorités"], ["haute", "Haute"], ["moyenne", "Moyenne"], ["info", "Info"]].map(([k, l]) => `<button class="chip ${f.prio === k ? "on" : ""}" data-a="nf" data-k="prio" data-v="${k}">${l}</button>`).join("")}<button class="chip ${f.read === "non" ? "on" : ""}" data-a="nf" data-k="read" data-v="${f.read === "non" ? "" : "non"}">Non lues seulement</button></div>
  ${list.length ? `<div class="card" style="padding:4px 16px">${list.slice(0, 120).map((n) => `<button class="row" style="width:100%;text-align:left;${n.read ? "opacity:.6" : ""}" data-a="sheet" data-s="notif" data-id="${n.id}" data-b="${n.barId}"><span><b style="white-space:normal">${esc(n.title)}</b>${n.read ? "" : ' <span class="tag t-amb">Nouvelle</span>'}<br><span class="small">${esc(n.bar)} · ${esc(n.cat)} · ${dt(n.at)}</span><br><span class="small">${esc(n.desc)}</span></span><span class="tag ${n.prio === "haute" ? "t-crit" : n.prio === "moyenne" ? "t-warn" : "t-info"}">${n.prio}</span></button>`).join("")}</div>` : emptyS("Aucune notification", "Rien ne correspond à ces filtres.")}`;
};
/* Rapports */
const REPORTS = [["ventes", "Rapport des ventes"], ["journalier", "Rapport journalier"], ["hebdo", "Rapport hebdomadaire"], ["mensuel", "Rapport mensuel"], ["annuel", "Rapport annuel"], ["caisse", "Rapport de caisse"], ["ecartsc", "Écarts de caisse"], ["stock", "Rapport de stock"], ["ecartss", "Écarts de stock"], ["achats", "Rapport des achats"], ["depenses", "Rapport des dépenses"], ["benef", "Bénéfices estimés"], ["employes", "Performances des employés"], ["top", "Produits les plus vendus"], ["flop", "Produits les moins vendus"], ["pertes", "Rapport des pertes"], ["offerts", "Produits offerts"], ["fournisseurs", "Rapport des fournisseurs"], ["etab", "Rapport par établissement"], ["conso", "Rapport consolidé multi-bars"]];
function reportData(k) {
  const [a0, z0, label0] = range(); let a = a0, z = z0, label = label0;
  if (k === "journalier") { a = sod(); z = Date.now() + 1; label = "Aujourd'hui"; } if (k === "hebdo") { [a, z, label] = range("semaine"); } if (k === "mensuel") { [a, z, label] = range("mois"); } if (k === "annuel") { const x = new Date(sod()); x.setMonth(0, 1); a = x.getTime(); z = Date.now() + 1; label = "Année " + x.getFullYear(); }
  const bars = k === "conso" || (!UI.bar && k !== "etab") ? myBars().filter((b) => b.dbStatus === "ok") : k === "etab" ? myBars().filter((b) => b.dbStatus === "ok") : [bar()];
  const f = UI.flt; const rows = []; let cols = [], totals = null;
  const salesF = (d) => d.sales.filter((s) => s.at >= a && s.at < z && s.status !== "annulee" && (!f.remp || s.by === f.remp) && (!f.rmode || s.mode === f.rmode));
  const lineOk = (l) => (!f.rcat || l.cat === f.rcat) && (!f.rprod || l.name === f.rprod);
  if (["ventes", "journalier", "hebdo", "mensuel", "annuel"].includes(k)) { cols = ["N°", "Date", "Établissement", "Employé", "Produits", "Paiement", "Total"]; bars.forEach((b) => salesF(S.dbs[b.id]).filter((s) => s.lines.some(lineOk)).forEach((s) => rows.push([s.num, dt(s.at), b.name, s.byName, s.lines.map((l) => l.qty + " × " + l.name).join(", "), modeL(s.mode, s.op), s.total]))); totals = { 6: rows.reduce((x, r) => x + r[6], 0) }; }
  else if (k === "caisse" || k === "ecartsc") { cols = ["Établissement", "Caisse", "Employé", "Fermeture", "Théorique", "Compté", "Écart", "Explication"]; bars.forEach((b) => S.dbs[b.id].sessions.filter((s) => s.closedAt && s.closedAt >= a && s.closedAt < z && (k === "caisse" || s.ecart)).forEach((s) => rows.push([b.name, s.register, s.byName, dt(s.closedAt), s.theo, s.counted, s.ecart, s.explication || ""]))); totals = { 4: rows.reduce((x, r) => x + r[4], 0), 5: rows.reduce((x, r) => x + r[5], 0), 6: rows.reduce((x, r) => x + r[6], 0) }; }
  else if (k === "stock") { cols = ["Établissement", "Produit", "Catégorie", "Stock", "Seuil", "Prix d'achat", "Valeur"]; bars.forEach((b) => S.dbs[b.id].products.filter((p) => p.active && (!f.rcat || p.cat === f.rcat)).forEach((p) => rows.push([b.name, p.name, p.cat, p.stock, p.min, p.buy, Math.max(0, p.stock) * p.buy]))); totals = { 6: rows.reduce((x, r) => x + r[6], 0) }; }
  else if (k === "ecartss") { cols = ["Établissement", "Date", "Type", "Employé / auteur", "Produit", "Écart", "Valeur"]; bars.forEach((b) => { const d = S.dbs[b.id]; d.controls.filter((c) => c.at >= a && c.at < z).forEach((c) => rows.push([b.name, dt(c.at), "Contrôle", c.empName, c.name, c.ecart, c.value])); d.inventories.filter((i) => i.at >= a && i.at < z).forEach((i) => rows.push([b.name, dt(i.at), "Inventaire", i.by, i.lines + " produits", i.ecartQty, i.ecartValue])); }); totals = { 6: rows.reduce((x, r) => x + r[6], 0) }; }
  else if (k === "achats" || k === "fournisseurs") { cols = k === "achats" ? ["Établissement", "N°", "Date", "Fournisseur", "Total", "Payé", "Solde", "Statut"] : ["Établissement", "Fournisseur", "Commandes", "Total", "Payé", "Solde dû"]; bars.forEach((b) => { const d = S.dbs[b.id]; if (k === "achats") d.orders.filter((o) => o.at >= a && o.at < z).forEach((o) => rows.push([b.name, o.num, dFR(o.at), sup(o.supplierId, d).name, o.total, o.paid, o.total - o.paid, o.status])); else d.suppliers.forEach((s) => { const os = d.orders.filter((o) => o.supplierId === s.id && o.status !== "annulée"); rows.push([b.name, s.name, os.length, os.reduce((x, o) => x + o.total, 0), os.reduce((x, o) => x + o.paid, 0), os.reduce((x, o) => x + o.total - o.paid, 0)]); }); }); totals = k === "achats" ? { 4: rows.reduce((x, r) => x + r[4], 0), 5: rows.reduce((x, r) => x + r[5], 0), 6: rows.reduce((x, r) => x + r[6], 0) } : { 3: rows.reduce((x, r) => x + r[3], 0), 5: rows.reduce((x, r) => x + r[5], 0) }; }
  else if (k === "depenses") { cols = ["Établissement", "Date", "Libellé", "Catégorie", "Paiement", "Statut", "Montant"]; bars.forEach((b) => S.dbs[b.id].expenses.filter((e) => e.at >= a && e.at < z && (!f.rcat || true)).forEach((e) => rows.push([b.name, dFR(e.at), e.label, e.cat, modeL(e.mode), e.status, e.amount]))); totals = { 6: rows.filter((r) => r[5] === "approuvée").reduce((x, r) => x + r[6], 0) }; }
  else if (k === "benef" || k === "etab" || k === "conso") { cols = ["Établissement", "Ventes", "Chiffre d'affaires", "Coût des ventes", "Marge", "Dépenses", "Pertes", "Bénéfice estimé"]; bars.forEach((b) => { const s = stats(S.dbs[b.id], a, z); rows.push([b.name, s.n, s.ca, s.cogs, s.marge, s.dep, s.lossV, s.benef]); }); totals = {}; [1, 2, 3, 4, 5, 6, 7].forEach((i) => (totals[i] = rows.reduce((x, r) => x + r[i], 0))); }
  else if (k === "employes") { cols = ["Établissement", "Employé", "Ventes", "Chiffre d'affaires", "Panier moyen", "Annulations", "Remises"]; bars.forEach((b) => { const d = S.dbs[b.id]; const m = {}; d.sales.filter((s) => s.at >= a && s.at < z).forEach((s) => { m[s.byName] = m[s.byName] || { n: 0, ca: 0, an: 0, rem: 0 }; if (s.status === "annulee") m[s.byName].an++; else { m[s.byName].n++; m[s.byName].ca += s.total; m[s.byName].rem += s.discount; } }); Object.entries(m).forEach(([n, v]) => rows.push([b.name, n, v.n, v.ca, v.n ? Math.round(v.ca / v.n) : 0, v.an, v.rem])); }); totals = { 3: rows.reduce((x, r) => x + r[3], 0) }; }
  else if (k === "top" || k === "flop") { cols = ["Établissement", "Produit", "Catégorie", "Quantité", "Chiffre d'affaires", "Marge"]; bars.forEach((b) => { const d = S.dbs[b.id]; const m = {}; d.products.forEach((p) => (m[p.name] = { cat: p.cat, q: 0, ca: 0, mg: 0 })); salesF(d).forEach((s) => s.lines.filter(lineOk).forEach((l) => { m[l.name] = m[l.name] || { cat: l.cat, q: 0, ca: 0, mg: 0 }; m[l.name].q += l.qty; m[l.name].ca += l.qty * l.price; m[l.name].mg += l.qty * (l.price - l.cost); })); Object.entries(m).forEach(([n, v]) => rows.push([b.name, n, v.cat, v.q, v.ca, v.mg])); }); rows.sort((x, y) => (k === "top" ? y[3] - x[3] : x[3] - y[3])); rows.splice(15); }
  else if (k === "pertes" || k === "offerts") { cols = ["Établissement", "Date", "Produit", "Motif", "Quantité", "Valeur", "Demandé par", "Statut"]; bars.forEach((b) => S.dbs[b.id].losses.filter((l) => l.at >= a && l.at < z && (k === "offerts" ? l.type.startsWith("Produit offert") : !l.type.startsWith("Produit offert"))).forEach((l) => rows.push([b.name, dt(l.at), l.name, l.type, l.qty, l.value, l.by, l.status]))); totals = { 5: rows.reduce((x, r) => x + r[5], 0) }; }
  const money = new Set(["Total", "Théorique", "Compté", "Écart", "Valeur", "Prix d'achat", "Payé", "Solde", "Solde dû", "Montant", "Chiffre d'affaires", "Coût des ventes", "Marge", "Dépenses", "Pertes", "Bénéfice estimé", "Panier moyen", "Remises"]);
  return { label, a, z, bars, cols, rows, totals, money };
}
VIEWS.rapports = () => {
  if (!can("rapports")) return locked("Rapports");
  const k = UI.rep; const r = reportData(k); const f = UI.flt; const src = UI.bar ? [bar()] : myBars();
  const emps = S.employees.filter((e) => src.some((b) => e.bars.includes(b.id)));
  const prods = [...new Set(src.flatMap((b) => S.dbs[b.id].products.map((p) => p.name)))];
  return `${head("Rapports et analyses", `${esc(REPORTS.find((x) => x[0] === k)[1])} · ${esc(r.label)} · ${r.bars.map((b) => esc(b.name)).join(", ")}${r.bars.length > 1 ? " (rapport regroupant plusieurs établissements)" : ""}`, `<button class="btn b-sec" data-a="repexp" data-t="csv">Export CSV</button><button class="btn b-sec" data-a="repexp" data-t="xls">Export Excel</button><button class="btn b-amb" data-a="sheet" data-s="pdf">Aperçu PDF</button>`)}
  <div class="field" style="max-width:420px"><label for="rk">Rapport</label><select class="inp" id="rk" data-ch="rep">${REPORTS.map(([x, l]) => `<option value="${x}" ${x === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
  ${["journalier", "hebdo", "mensuel", "annuel"].includes(k) ? "" : periodBar()}
  <form novalidate class="fgrid" data-f="rflt">
    <div class="field"><label for="re">Employé</label><select class="inp" id="re" name="remp"><option value="">Tous</option>${emps.map((e) => `<option value="${e.id}" ${f.remp === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select></div>
    <div class="field"><label for="rp">Produit</label><select class="inp" id="rp" name="rprod"><option value="">Tous</option>${prods.map((p) => `<option ${f.rprod === p ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></div>
    <div class="field"><label for="rc">Catégorie</label><select class="inp" id="rc" name="rcat"><option value="">Toutes</option>${CATS.map((c) => `<option ${f.rcat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
    <div class="field"><label for="rm">Moyen de paiement</label><select class="inp" id="rm" name="rmode"><option value="">Tous</option>${MODES.map(([x, l]) => `<option value="${x}" ${f.rmode === x ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <button class="btn b-amb" style="align-self:end">Appliquer</button>
  </form>
  ${r.rows.length ? `<div class="tw"><table><thead><tr>${r.cols.map((c) => `<th class="${r.money.has(c) || /^\d/.test(String(r.rows[0][r.cols.indexOf(c)])) ? "r" : ""}">${esc(c)}</th>`).join("")}</tr></thead><tbody>${r.rows.slice(0, 300).map((row) => `<tr>${row.map((v, i) => `<td class="${typeof v === "number" ? "r num" : ""}">${typeof v === "number" ? (r.money.has(r.cols[i]) ? F(v) : nb(v)) : esc(v)}</td>`).join("")}</tr>`).join("")}${r.totals ? `<tr>${r.cols.map((c, i) => `<td class="${r.totals[i] != null ? "r num" : ""}" style="font-weight:800;background:var(--surf2)">${i === 0 ? "Total" : r.totals[i] != null ? (r.money.has(c) ? F(r.totals[i]) : nb(r.totals[i])) : ""}</td>`).join("")}</tr>` : ""}</tbody></table></div>${r.rows.length > 300 ? `<div class="small">${r.rows.length} lignes : les 300 premières sont affichées, l'export contient tout.</div>` : ""}` : emptyS("Aucune donnée", "Aucune ligne pour ce rapport, cette période et ces filtres.")}
  <div class="small">Formules : marge = CA − coût d'achat des produits vendus ; bénéfice estimé = marge − dépenses approuvées − pertes approuvées (au prix d'achat).</div>`;
};
VIEWS.documents = () => {
  if (!UI.bar) return needBar();
  const d = db(); const sales = d.sales.slice(-8).reverse(); const orders = d.orders.slice().reverse();
  return `${head("Reçus et documents", "Tous les documents portent l'identité de " + esc(bar().name) + ", en français et en FCFA.")}
  <div class="grid g2"><div class="card"><h2>Derniers reçus de vente</h2>${sales.map((s) => `<button class="row" style="width:100%;text-align:left" data-a="sheet" data-s="sale" data-id="${s.id}"><span>${s.num} · ${dt(s.at)} · ${esc(s.byName)}</span><b class="num">${Fk(s.total)}</b></button>`).join("") || '<div class="small">Aucun reçu.</div>'}</div>
  <div class="card"><h2>Documents d'achat</h2>${orders.map((o) => `<button class="row" style="width:100%;text-align:left" data-a="sheet" data-s="orderdoc" data-id="${o.id}"><span>${o.num} · ${esc(sup(o.supplierId).name)}</span><b class="num">${Fk(o.total)}</b></button>`).join("") || '<div class="small">Aucun document.</div>'}</div></div>
  <div class="card"><h2>Rapport PDF</h2><div class="small" style="margin:8px 0">En-tête de l'établissement, titre, période, date de génération, tableaux, totaux, pagination et pied de page.</div><button class="btn b-amb" data-a="sheet" data-s="pdf">Voir un rapport mis en page</button></div>`;
};

VIEWS.parametres = () => {
  if (!UI.bar) return needBar(); if (!can("parametres")) return locked("Paramètres");
  const d = db(); const s = d.settings; const sw = (on, a, k) => `<button class="switch ${on ? "on" : ""}" data-a="${a}" data-k="${k}" role="switch" aria-checked="${on}" aria-label="${esc(k)}"></button>`;
  return `${head("Paramètres", esc(bar().name) + " · les modifications sont inscrites au journal d'audit.")}
  <div class="grid g2">
    <div class="card"><h2>Établissement</h2><div class="row"><span>Identité, logo, coordonnées, horaires</span><button class="btn b-sec" data-a="editbar">Modifier</button></div><div class="row"><span>Base de données</span><span class="tag t-good">${esc(bar().dbId)}</span></div><div class="row"><span>Catégories</span><button class="btn b-sec" data-a="go" data-v="categories">Voir</button></div><div class="row"><span>Produits et seuils de stock</span><button class="btn b-sec" data-a="go" data-v="produits">Voir</button></div></div>
    <div class="card"><h2>Moyens de paiement</h2>${MODES.map(([k, l]) => `<div class="row"><span>${l}</span>${sw(s.modes[k], "tmode", k)}</div>`).join("")}</div>
    <div class="card"><h2>Règles de validation</h2>
      <form novalidate data-f="rules" style="display:flex;flex-direction:column;gap:10px"><div class="field"><label for="r1">Dépense soumise à approbation à partir de (FCFA)</label><input class="inp num" id="r1" name="exp" type="number" min="0" value="${s.expApproval}"></div><div class="field"><label for="r2">Perte soumise à approbation à partir de (FCFA)</label><input class="inp num" id="r2" name="loss" type="number" min="0" value="${s.lossApproval}"></div><label class="row" style="border:0"><span>Produits offerts toujours soumis à approbation</span><input type="checkbox" name="off" ${s.offertApproval ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--amber)"></label><div class="field"><label for="r3">Message de remerciement du reçu</label><input class="inp" id="r3" name="thanks" value="${esc(s.thanks)}"></div><button class="btn b-amb">Enregistrer les règles</button></form></div>
    <div class="card"><h2>Fonctionnalités</h2>${Object.entries(s.features).map(([k, v]) => `<div class="row"><span>${{ boissons: "Boissons", alimentaire: "Produits alimentaires", divers: "Articles divers", employes: "Employés", caisses: "Caisses", depenses: "Dépenses", fournisseurs: "Fournisseurs", recettes: "Recettes", inventaires: "Inventaires", pertes: "Pertes et offerts", rapports: "Rapports", alertes: "Alertes" }[k]}</span>${sw(v, "tfeat", k)}</div>`).join("")}</div>
    <div class="card"><h2>Impression des reçus</h2>
      <form novalidate data-f="prnset" style="display:flex;flex-direction:column;gap:10px"><div class="field"><label for="pp1">Format du reçu</label><select class="inp" id="pp1" name="paper">${PAPERS.map(([k, l]) => `<option value="${k}" ${prn().paper === k ? "selected" : ""}>${l}</option>`).join("")}</select></div><div class="field"><label for="pp2">Exemplaires à chaque vente</label><select class="inp" id="pp2" name="copies"><option value="1">1 exemplaire</option><option value="2" ${Number(prn().copies) === 2 ? "selected" : ""}>2 exemplaires</option></select></div><label class="row" style="border:0"><span>Impression automatique</span><input type="checkbox" name="auto" ${prn().auto ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--amber)"></label><div class="small">${canBt() ? "Imprimante Bluetooth via RawBT." : isNativeApp() ? "Reçu en PDF, partagé vers l'imprimante." : "Fenêtre d'impression du navigateur."}</div><div class="acts"><button class="btn b-amb">Enregistrer</button><button type="button" class="btn b-sec" data-a="prntest">${ic("print", 16)}Ticket de test</button></div></form></div>
    <div class="card"><h2>Paramètres généraux</h2>
      <div class="row"><span>Mode nuit</span><button class="switch ${MODE === "nuit" ? "on" : ""}" data-a="theme" role="switch" aria-checked="${MODE === "nuit"}" aria-label="Mode nuit"></button></div><div class="row"><span>Langue de l'interface</span><b>Français</b></div><div class="row"><span>Devise d'affichage</span><b>FCFA</b></div><div class="row"><span>Format de date</span><b>JJ/MM/AAAA</b></div><div class="row"><span>Fuseau horaire</span><b>${esc(bar().tz)}</b></div><div class="row"><span>Notifications</span><button class="btn b-sec" data-a="go" data-v="distance">Gérer</button></div><div class="row"><span>Annonces vocales</span><button class="btn b-sec" data-a="go" data-v="profil">Régler</button></div></div>
    <div class="card"><h2>Sécurité</h2><div class="row"><span>Utilisateurs</span><button class="btn b-sec" data-a="go" data-v="employes">Gérer</button></div><div class="row"><span>Rôles et permissions</span><button class="btn b-sec" data-a="go" data-v="roles">Voir</button></div><div class="row"><span>Sessions et historique des accès</span><button class="btn b-sec" data-a="go" data-v="distance">Voir</button></div><div class="row"><span>Sauvegardes</span><button class="btn b-sec" data-a="go" data-v="sauvegardes">Voir</button></div></div>
  </div>
  `;
};

VIEWS.groupe = () => {
  if (!can("groupe")) return locked("Vue groupe");
  const [a, z, label] = range(); const t0 = sod(); const m0 = new Date(t0); m0.setDate(1);
  const sel = UI.groupFilter === "tous" ? S.bars : S.bars.filter((b) => UI.groupSel.includes(b.id));
  const ok = sel.filter((b) => S.dbs[b.id] && !expired(b)); const ko = sel.filter((b) => !S.dbs[b.id]); const kx = sel.filter((b) => S.dbs[b.id] && expired(b));
  const rows = ok.map((b) => { const d = S.dbs[b.id]; const st = stats(d, a, z); return { b, st, al: alertsOf(d).length, sv: stockVal(d), day: stats(d, t0, Date.now() + 1).ca, mon: stats(d, m0.getTime(), Date.now() + 1).ca }; });
  const T = rows.reduce((x, r) => ({ ca: x.ca + r.st.ca, dep: x.dep + r.st.dep, marge: x.marge + r.st.marge, n: x.n + r.st.n, al: x.al + r.al }), { ca: 0, dep: 0, marge: 0, n: 0, al: 0 });
  const rank = rows.slice().sort((x, y) => y.st.ca - x.st.ca);
  return `${head("Vue groupe", `${label} · ${ok.length} établissement${ok.length > 1 ? "s" : ""} consolidé${ok.length > 1 ? "s" : ""}`, `<button class="btn b-amb" data-a="addbar">${ic("plus", 17)}Ajouter un bar</button><button class="btn b-sec" data-a="sheet" data-s="compare">Comparer</button>`)}
  ${periodBar()}
  <div class="chips"><button class="chip ${UI.groupFilter === "tous" ? "on" : ""}" data-a="gfilter" data-g="tous">Tous les bars</button>${S.bars.map((b) => `<button class="chip ${UI.groupFilter !== "tous" && UI.groupSel.includes(b.id) ? "on" : ""}" data-a="gsel" data-id="${b.id}">${esc(b.name)}</button>`).join("")}</div>
  ${kx.map((b) => `<div class="note crit">${esc(b.name)} : ${esc(lic(b).label)}. Ses chiffres sont exclus des totaux jusqu'au renouvellement de sa licence.</div>`).join("")}${ko.map((b) => `<div class="note">${esc(b.name)} : chiffres non encore chargés sur ce téléphone. Ouvrez cet établissement une fois pour les synchroniser.</div>`).join("")}
  <div class="kpis">
    <div class="kpi hero"><small>Chiffre d'affaires consolidé</small><b class="num">${Fk(T.ca)}</b><i>${esc(label)} · ${ok.length} établissement${ok.length > 1 ? "s" : ""}</i></div>
    <div class="kpi"><small>Charges</small><b class="num">${Fk(T.dep)}</b></div>
    <div class="kpi"><small>Marge brute</small><b class="num">${Fk(T.marge)}</b></div>
    <div class="kpi"><small>Établissements</small><b class="num">${S.bars.length}</b><i>${ok.length} consolidés</i></div>
    <div class="kpi"><small>Tickets</small><b class="num">${nb(T.n)}</b></div>
    <div class="kpi"><small>Alertes</small><b class="num ${T.al ? "down" : ""}">${T.al}</b></div>
  </div>
  <div class="grid g3">${sel.map((b) => { const r = rows.find((x) => x.b.id === b.id); const cur = b.id === H.shop.id; return `<div class="barcard">
    <div class="hd"><span class="logo" style="background:${b.color}">${ini(b.name)}</span><div style="min-width:0;flex:1"><b style="font-size:15.5px;display:block">${esc(b.name)}</b><span class="small">${esc(b.type)}${b.city ? " · " + esc(b.city) : ""}${cur ? " · ouvert" : ""}</span><div style="margin-top:5px">${licTag(b)}</div></div></div>
    ${r ? `<div class="mini"><div><small>CA du jour</small><b class="num">${Fk(r.day)}</b></div><div><small>CA du mois</small><b class="num">${Fk(r.mon)}</b></div><div><small>Charges</small><b class="num">${Fk(r.st.dep)}</b></div><div><small>Marge brute</small><b class="num">${Fk(r.st.marge)}</b></div><div><small>Valeur du stock</small><b class="num">${Fk(r.sv)}</b></div><div><small>Alertes</small><b class="num">${r.al}</b></div></div>` : `<div class="small">${expired(b) ? "Licence à renouveler depuis cet établissement." : "Chiffres disponibles après la première ouverture sur ce téléphone."}</div>`}
    <button class="btn ${cur ? "b-sec" : "b-amb"}" data-a="openbar" data-id="${b.id}">${cur ? "Tableau de bord" : "Ouvrir cet établissement"}</button>
  </div>`; }).join("")}</div>
  <div class="grid g2">
    <div class="card"><h2>Classement</h2>${rank.map((r, i) => `<div class="row"><span>${i + 1}. ${esc(r.b.name)}</span><b class="num">${Fk(r.st.ca)}</b></div>`).join("") || '<div class="small">Aucun établissement disponible.</div>'}</div>
    <div class="card"><h2>Alertes du groupe</h2>${ok.flatMap((b) => alertsOf(S.dbs[b.id]).slice(0, 3)).sort((x, y) => y.at - x.at).slice(0, 7).map((n) => `<div class="row"><span><b style="white-space:normal">${esc(n.title)}</b><br><span class="small">${esc(n.bar)} · ${esc(n.desc)}</span></span><span class="tag ${n.prio === "haute" ? "t-crit" : "t-warn"}">${n.prio}</span></div>`).join("") || '<div class="small">Aucune alerte.</div>'}</div>
  </div>`;
};
VIEWS.distance = () => {
  const src = myBars().filter((b) => S.dbs[b.id]); const sy = H.sync || {};
  return `${head("Supervision à distance", `Dernière synchronisation ${sy.lastAt ? dt(new Date(sy.lastAt).getTime()) : "—"} · ${S.online ? "connecté au serveur" : "hors connexion"}`, `<button class="btn b-amb" data-a="refresh">${ic("refresh", 17)}Synchroniser</button>`)}
  <div class="card"><h2>Synchronisation</h2><div class="row"><span>État du réseau</span><span class="tag ${S.online ? "t-good" : "t-warn"}">${S.online ? "En ligne" : "Hors ligne"}</span></div><div class="row"><span>Opérations en attente d'envoi</span><b class="num">${nb(sy.pending || 0)}</b></div><div class="row"><span>Prochaine synchronisation automatique</span><b>${sy.nextAt ? hm(new Date(sy.nextAt).getTime()) : "—"}</b></div><div class="small">Chaque opération est enregistrée sur le téléphone puis envoyée au serveur GestiOne. Les autres appareils de l'établissement la reçoivent à leur prochaine synchronisation.</div></div>
  <div class="grid g3">${src.map((b) => { const d = S.dbs[b.id]; const t = stats(d, sod(), Date.now() + 1); const open = d.sessions.filter((s) => !s.closedAt); const ec = d.sessions.filter((s) => s.closedAt && s.closedAt > Date.now() - 7 * DAY && s.ecart).length; return `<div class="barcard"><div class="hd"><span class="logo" style="background:${b.color}">${ini(b.name)}</span><div style="flex:1;min-width:0"><b style="display:block">${esc(b.name)}</b><span class="small">${b.id === H.shop.id ? "Établissement ouvert" : "Données de ce téléphone"}</span></div></div><div class="mini"><div><small>CA du jour</small><b class="num">${Fk(t.ca)}</b></div><div><small>Tickets</small><b class="num">${t.n}</b></div><div><small>Charges du jour</small><b class="num">${Fk(t.dep)}</b></div><div><small>Caisses ouvertes</small><b class="num">${open.length}</b></div><div><small>Écarts (7 j)</small><b class="num">${ec}</b></div><div><small>Ruptures</small><b class="num">${d.products.filter((p) => p.active && p.stock <= 0).length}</b></div><div><small>Pertes (7 j)</small><b class="num">${d.losses.filter((l) => l.at > Date.now() - 7 * DAY).length}</b></div><div><small>Présents</small><b class="num">${present(d)}</b></div></div><button class="btn b-sec" data-a="openbar" data-id="${b.id}">Ouvrir</button></div>`; }).join("")}</div>`;
};
VIEWS.employes = () => {
  if (!can("employes")) return locked("Personnel");
  const list = S.employees;
  return `${head("Personnel", "Chaque employé se connecte avec son nom et son code PIN, comme sur toute entreprise GestiOne.", `<button class="btn b-amb" data-a="sheet" data-s="employee">${ic("plus", 17)}Nouvel employé</button>`)}
  ${list.length ? `<div class="tw"><table><thead><tr><th>Nom</th><th>Fonction</th><th>Rôle</th><th>Téléphone</th><th>Depuis</th><th>Code d'invitation</th><th>Statut</th></tr></thead><tbody>${list.map((e) => `<tr class="click" data-a="sheet" data-s="employee" data-id="${e.id}"><td><b>${esc(e.name)}</b></td><td>${esc(e.func)}</td><td>${esc(ROLES[e.role])}</td><td class="num">${esc(e.phone)}</td><td class="num">${esc(e.hired)}</td><td class="num">${esc(e.login || "—")}</td><td><span class="tag ${e.status === "actif" ? "t-good" : "t-mut"}">${e.status === "actif" ? "Actif" : "Désactivé"}</span></td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucun employé", "Créez les comptes de votre équipe : nom, rôle et code PIN à 4 chiffres.", `<button class="btn b-amb" data-a="sheet" data-s="employee">Nouvel employé</button>`)}`;
};
VIEWS.sauvegardes = () => {
  if (!can("sauvegarde")) return locked("Sauvegardes");
  const d = db(); const last = d.backups[d.backups.length - 1];
  return `${head("Sauvegardes", "Les données de cet établissement sont sauvegardées séparément de celles des autres entreprises.")}
  <div class="card"><h2>Sauvegarde automatique</h2><div class="row"><span>Serveur GestiOne</span><span class="tag t-good">Chaque nuit</span></div><div class="row"><span>Opérations en attente d'envoi</span><b class="num">${nb((H.sync || {}).pending || 0)}</b></div><div class="small">Une opération restée uniquement sur un téléphone perdu, jamais synchronisée, ne peut pas être récupérée : synchronisez avant de changer d'appareil.</div></div>
  <div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="ph"><div><h2>Point de restauration</h2><div class="small" style="margin-top:6px">Copie instantanée des données, utile avant un inventaire ou une correction importante.</div></div><button class="btn b-amb" data-a="backup">Créer</button></div>
  ${d.backups.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Taille</th><th></th></tr></thead><tbody>${d.backups.slice().reverse().map((x) => `<tr><td class="num">${dt(x.at)}</td><td>${esc(x.size)}</td><td>${SNAPS[x.id] ? `<button class="btn b-crit" style="min-height:34px;padding:4px 10px" data-a="sheet" data-s="restore" data-id="${x.id}">Restaurer…</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="small">Aucun point de restauration pendant cette session.</div>`}
  ${last ? "" : ""}</div>
  <div class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Export</h2><div class="small">Toutes les données de l'établissement au format JSON (produits, ventes, caisses, stock, achats, charges, équipe, journal).</div><button class="btn b-sec" data-a="exportAll">Exporter les données</button></div>`;
};
VIEWS.licence = () => {
  const b = bar(); const L = lic(b); const l = b.license || {}; const adm = role() === "proprietaire";
  const plan = PLANS().find((x) => x.id === l.planId);
  return `${head("Licence et abonnement", `${esc(b.name)} · une licence par établissement, y compris en multi-bars.`)}
  <div class="card" style="display:flex;flex-direction:column;gap:10px;${L.st === "expired" ? "border-color:var(--crit)" : ""}">
    <div class="ph"><div><h2>État de la licence</h2><div style="font-size:21px;font-weight:800;margin-top:6px;white-space:nowrap" class="${L.st === "expired" ? "down" : ""}">${L.st === "expired" ? esc(L.label) : L.st === "trial" ? "Essai gratuit" : L.st === "lifetime" ? "Licence à vie" : "Licence " + esc(plan ? plan.name : "")}</div><div class="small">${L.st === "expired" ? "Établissement verrouillé" : L.st === "lifetime" ? "Sans date d'expiration" : L.st === "none" ? "Information indisponible" : `${L.days} jour${L.days > 1 ? "s" : ""} restant${L.days > 1 ? "s" : ""}`}</div></div>${licTag(b)}</div>
    <div class="row"><span>Activée le</span><b>${l.activatedAt ? dFR(l.activatedAt) : "—"}</b></div>
    <div class="row"><span>${L.st === "expired" ? "A expiré le" : "Expire le"}</span><b>${l.lifetime ? "Jamais" : l.expiresAt ? dFR(l.expiresAt) : "—"}</b></div>
    <div class="row"><span>Code d'activation</span><b class="num">${l.code ? fmtCode(l.code).replace(/\d(?=.{5})/g, "•") : l.planId === "trial" ? "Essai gratuit" : "—"}</b></div>
    ${L.st === "expired" ? `<div class="note crit"><b>Établissement verrouillé.</b> Les employés ne peuvent plus se connecter ni encaisser. Les données sont conservées et redeviennent accessibles dès l'activation d'une licence.</div>` : L.st === "trial" ? `<div class="note warn">Votre essai gratuit de ${TRIAL_DAYS} jours se termine le ${dFR(l.expiresAt)}. Commandez une licence avant cette date pour ne pas bloquer votre équipe.</div>` : ""}
  </div>
  ${adm ? `<h2>Offres disponibles</h2>
  <div class="grid g3">${PLANS().map((p) => { const months = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 }[p.id]; return `<div class="card" style="display:flex;flex-direction:column;gap:6px;${p.popular ? "border-color:var(--amber)" : ""}"><div class="ph"><b style="font-size:16px">${esc(p.name)}</b>${p.popular ? '<span class="tag t-amb">Le plus choisi</span>' : ""}</div><div class="small">${esc(p.duration)}</div>${p.price ? `<div style="font-size:22px;font-weight:800;color:var(--amber2)" class="num">${Fk(p.price)}</div><div class="small">${p.old ? `<s>${F(p.old)}</s> · ` : ""}soit ${F(Math.round(p.price / (months || 1)))} par mois</div>` : `<div style="font-size:18px;font-weight:800">Sur devis</div><div class="small">Paiement unique, sans renouvellement.</div>`}<button class="btn ${p.popular ? "b-amb" : "b-sec"}" data-a="sheet" data-s="liborder" data-id="${p.id}">Commander</button></div>`; }).join("")}</div>
  <form class="card" data-f="activate" novalidate style="display:flex;flex-direction:column;gap:12px"><h2>J'ai un code d'activation</h2><div class="small">Après votre paiement, l'équipe GestiOne vous envoie un code à 12 chiffres, valable pour cet établissement uniquement.</div><input class="inp num ${UI.errs.act ? "err" : ""}" name="code" inputmode="numeric" placeholder="0000-0000-0000" data-ch="codefmt" value="${esc(UI.form.code || "")}" style="font-size:18px;letter-spacing:.12em;text-align:center" aria-label="Code d'activation" required>${UI.errs.act ? `<div class="ferr">${esc(UI.errs.act)}</div>` : ""}<button class="btn b-amb" ${UI.busy ? "disabled" : ""}>${UI.busy ? '<span class="load"></span> Vérification…' : "Activer la licence"}</button></form>
  ${myBars().length > 1 ? `<div class="card"><h2>Vos autres établissements</h2>${myBars().filter((x) => x.id !== b.id).map((x) => `<div class="row"><span>${esc(x.name)}<br><span class="small">Licence propre à cet établissement</span></span><span class="acts">${licTag(x)}<button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="openbar" data-id="${x.id}">Ouvrir</button></span></div>`).join("")}</div>` : ""}`
  : `<div class="note">Seul l'administrateur peut commander ou activer une licence.</div>`}`;
};
VIEWS.configurer = () => `<div class="note">${ic("check", 14)} Bienvenue dans Bar Manager. Configurez votre établissement : coordonnées, horaires et fonctionnalités. Tout reste modifiable dans Paramètres.</div>${barForm(bar(), false)}${!db().products.length ? "" : ""}`;
VIEWS.editbar = () => barForm(bar(), false);
VIEWS.profil = () => {
  const adm = role() === "proprietaire";
  return `${head("Mon compte", adm ? "Administrateur · " + esc(bar().name) : ROLES[role()] + " · " + esc(bar().name))}
  <div class="card" style="display:flex;flex-direction:column;gap:10px;max-width:560px"><div style="display:flex;align-items:center;gap:12px"><span class="mark" style="width:56px;height:56px;font-size:20px">${ini(me().name)}</span><div><b style="font-size:17px">${esc(me().name)}</b><div class="small">${adm ? "Accès administrateur" : ROLES[role()]}</div></div></div>
    ${adm ? `<div class="small">Le code administrateur se modifie dans GestiOne, au même endroit que pour toutes les entreprises.</div>` : `<div class="small">Votre nom, votre rôle et votre code PIN sont gérés par l'administrateur.</div>`}
  </div>
  ${voiceCard()}
  <div class="acts"><button class="btn b-crit" data-a="logout">${ic("out", 17)}Déconnexion</button></div>`;
};
function voiceCard() {
  const v = voicePrefs(); const sw = (on, a, k, l) => `<button class="switch ${on ? "on" : ""}" data-a="${a}" ${k ? `data-k="${k}"` : ""} role="switch" aria-checked="${on}" aria-label="${esc(l)}"></button>`;
  return `<div class="card" style="display:flex;flex-direction:column;gap:6px;max-width:560px"><h2 style="display:flex;align-items:center;gap:8px">${ic("mic", 16)}Annonces vocales</h2><div class="small">Réglage propre à cet appareil : chaque employé choisit ce qu'il entend.</div>
    <div class="row"><b>Lire les actions à voix haute</b>${sw(v.on, "voicetog", "", "Annonces vocales")}</div>
    ${VCATS.map(([k, l]) => `<div class="row" style="${v.on ? "" : "opacity:.5"}"><span>${l}</span>${sw(v.on && v.cats[k] !== false, "voicecat", k, l)}</div>`).join("")}
    <div class="acts"><button class="btn b-sec" data-a="voicetest">${ic("mic", 16)}Tester la voix</button></div></div>`;
}

/* ============================== Impression des reçus ============================== */
const PRINT_DEF = { paper: "58", auto: false, copies: 1 };
const prn = () => ({ ...PRINT_DEF, ...(db().settings.print || {}) });
const isNativeApp = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
const canBt = () => !!(H.printer && H.printer.native && H.printer.printRaw);
const PAPERS = [["58", "Ticket 58 mm"], ["80", "Ticket 80 mm"], ["A4", "Page A4"]];
const ascii = (t) => String(t == null ? "" : t).replace(/[   - ]/g, " ").replace(/[«»“”]/g, '"').replace(/[’‘]/g, "'").replace(/[–—−]/g, "-").replace(/×/g, "x").replace(/·/g, "-").replace(/…/g, "...").replace(/€/g, "EUR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "");
const subOf = (s) => s.lines.reduce((a, l) => a + l.qty * l.price, 0);
const qtyOf = (s) => s.lines.reduce((a, l) => a + l.qty, 0);
const printsOf = (s) => (Array.isArray(s.prints) ? s.prints : []);
function barLoc(b) { return [b.address, b.city && b.address !== b.city ? b.city : ""].filter(Boolean).join(", "); }

// Ticket ESC/POS (imprimante Bluetooth via RawBT, comme le reste de GestiOne).
function escposSale(s, b, dup) {
  const W = prn().paper === "80" ? 48 : 32; const out = [];
  const raw = (...a) => out.push(...a);
  const line = (t = "") => { for (const ch of ascii(t)) out.push(ch.charCodeAt(0)); out.push(10); };
  const wrap = (t) => { const w = ascii(t).split(" "); let cur = ""; w.forEach((x) => { if ((cur + " " + x).trim().length > W) { line(cur); cur = x; } else cur = (cur + " " + x).trim(); }); if (cur) line(cur); };
  const two = (l, r) => { l = ascii(l); r = ascii(r); if (l.length + r.length + 1 > W) { wrap(l); line(" ".repeat(Math.max(0, W - r.length)) + r); } else line(l + " ".repeat(W - l.length - r.length) + r); };
  const sep = (c = "-") => line(c.repeat(W));
  const bold = (on) => raw(0x1b, 0x45, on ? 1 : 0); const align = (n) => raw(0x1b, 0x61, n); const tall = (on) => raw(0x1d, 0x21, on ? 0x01 : 0);
  const M = (n) => nb(n) + " FCFA";
  raw(0x1b, 0x40); align(1); bold(1); tall(1); wrap(b.name.toUpperCase()); tall(0); bold(0);
  if (barLoc(b)) wrap(barLoc(b)); if (b.phone) line("Tel. " + b.phone); if (b.legal) wrap(b.legal);
  line(); const ttl = s.status === "annulee" ? "RECU - ANNULE" : s.status === "credit" ? "RECU - CREDIT" : "RECU - VENTE";
  bold(1); line("+" + "-".repeat(ttl.length + 4) + "+"); line("|  " + ttl + "  |"); line("+" + "-".repeat(ttl.length + 4) + "+"); bold(0); if (dup) line("*** DUPLICATA ***");
  align(0); sep();
  const d0 = new Date(s.at); two("Recu N", s.num); two("Date", dFR(d0)); two("Heure", hm(d0)); if (s.register) two("Caisse", s.register); two("Servi par", s.byName); if (s.client) two("Client", s.client);
  sep();
  s.lines.forEach((l) => { bold(1); wrap(l.name); bold(0); two(l.qty + " x " + nb(l.price), M(l.qty * l.price)); });
  if (s.discount) { sep(); two("Sous-total", M(subOf(s))); two("Remise", "-" + M(s.discount)); }
  line("=".repeat(W)); bold(1); tall(1); two("TOTAL", M(s.total)); tall(0); bold(0); line("=".repeat(W));
  two("Mode de paiement", modeL(s.mode, s.op)); if (s.ref) two("Reference", s.ref);
  if (s.received) { two("Somme recue", M(s.received)); two("Monnaie rendue", M(s.received - s.total)); }
  if (s.status === "credit") { bold(1); two("Reste a payer", M(s.total)); bold(0); }
  two("Articles", String(qtyOf(s)));
  if (s.status === "annulee" && s.cancel) { sep(); wrap("Annule le " + dt(s.cancel.at) + " par " + s.cancel.by); wrap("Motif : " + s.cancel.motif); }
  sep(); align(1); bold(1); wrap(db().settings.thanks || "Merci de votre visite !"); bold(0); line("Merci de conserver ce recu."); line(s.num + " - GestiOne"); line(); line(); line();
  raw(0x1d, 0x56, 0x42, 0x00);
  return new Uint8Array(out);
}

// Document HTML imprimable (navigateur) : ticket 58/80 mm ou page A4.
const PRINT_CSS = `*{box-sizing:border-box}body{margin:0;color:#111;font-family:"Helvetica Neue",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.t{margin:0 auto;font-size:11.5px;line-height:1.35}.t .c{text-align:center}.t h1{font-size:14px;margin:0 0 2px;letter-spacing:.02em}.t .k{font-weight:800;letter-spacing:.08em;margin-top:6px}.t hr{border:0;border-top:1px dashed #000;margin:6px 0}
.t .r{display:flex;justify-content:space-between;gap:8px}.t .r span:last-child{text-align:right;white-space:nowrap}.t .tot{font-size:14px;font-weight:800}.t small{color:#333}.t .dup{border:1px solid #000;padding:2px 6px;display:inline-block;margin-top:4px;font-weight:800}
.a4{font-size:12px;line-height:1.45;padding:0}.a4 .hd{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111;padding-bottom:14px}.a4 .lg{width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#1A1020}
.a4 h1{font-size:20px;margin:6px 0 2px}.a4 h2{font-size:18px;margin:0;letter-spacing:.04em}.a4 .mut{color:#555}.a4 .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.a4 .grid div{border:1px solid #ddd;border-radius:8px;padding:8px 10px}.a4 .grid b{display:block;font-size:12.5px}
.a4 table{width:100%;border-collapse:collapse;margin-top:6px}.a4 th{background:#f1ede6;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:8px}.a4 td{padding:8px;border-bottom:1px solid #e6e1d8}.a4 .n{text-align:right;white-space:nowrap}
.a4 .tots{margin-left:auto;width:300px;margin-top:12px}.a4 .tots .r{display:flex;justify-content:space-between;padding:4px 0}.a4 .tots .big{font-size:16px;font-weight:800;border-top:2px solid #111;padding-top:8px;margin-top:4px}.a4 .ft{margin-top:28px;border-top:1px solid #ddd;padding-top:10px;display:flex;justify-content:space-between;color:#555;font-size:10.5px}
.a4 .stamp{display:inline-block;border:2px solid #b3261e;color:#b3261e;padding:4px 10px;font-weight:800;border-radius:6px;margin-top:8px}`;
// Montant en toutes lettres (reçu A4).
function enLettres(n) {
  n = Math.round(Math.abs(Number(n) || 0));
  const U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const T = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  const c99 = (x) => { if (x < 20) return U[x]; const d = Math.floor(x / 10), u = x % 10; if (d === 7 || d === 9) { const r = x - d * 10 + 10; return T[d] + (r === 11 && d === 7 ? " et " : "-") + U[r]; } if (u === 0) return T[d] + (d === 8 ? "s" : ""); return T[d] + (u === 1 && d !== 8 ? " et " : "-") + U[u]; };
  const c999 = (x, last) => { const c2 = Math.floor(x / 100), r = x % 100; let t = ""; if (c2) t = (c2 > 1 ? U[c2] + " " : "") + "cent" + (c2 > 1 && r === 0 && last ? "s" : ""); if (r) t += (t ? " " : "") + c99(r); return t; };
  if (n === 0) return "zéro franc CFA";
  const parts = []; const mns = Math.floor(n / 1e6), mls = Math.floor((n % 1e6) / 1000), rest = n % 1000;
  if (mns) parts.push(c999(mns, true) + " million" + (mns > 1 ? "s" : ""));
  if (mls) parts.push(mls === 1 ? "mille" : c999(mls, false) + " mille");
  if (rest) parts.push(c999(rest, true));
  return parts.join(" ") + (n % 1e6 === 0 ? " de" : "") + (n > 1 ? " francs CFA" : " franc CFA");
}
const stLabel = (s) => (s.status === "annulee" ? "REÇU ANNULÉ" : s.status === "credit" ? "REÇU · VENTE À CRÉDIT" : "REÇU DE VENTE");

// Ticket thermique 58 / 80 mm, sur le modèle des reçus Hôtel et Cave : la page fait
// exactement la largeur du rouleau, sans marge du navigateur ; marge de sécurité 1,5 mm.
const barLogoSvg = (b) => { const short = String(b.name || "BAR").split(/\s+/).filter((w) => w.length > 2).slice(-1)[0] || ini(b.name); const t = esc(short.toUpperCase().slice(0, 10));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 74 74" width="17mm" height="17mm"><circle cx="37" cy="37" r="35" fill="#000"/><circle cx="37" cy="37" r="30" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M25 21h24L37 35z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/><path d="M37 35v11M30 47h14" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="46" cy="18" r="3.2" fill="none" stroke="#fff" stroke-width="2"/><path d="M44 21l-4 5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><text x="37" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="${t.length > 8 ? 6 : 7}" font-weight="700" fill="#fff" letter-spacing="0.8">${t}</text></svg>`; };
const TICKET_CSS = (mm) => `@page{size:${mm}mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}
body{width:${mm}mm;color:#000;font-family:"Courier New",Courier,monospace;font-size:${mm > 60 ? 12.5 : 11.2}px;line-height:1.38;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tk{width:${mm}mm;padding:3mm 1.5mm 5mm}.c{text-align:center}.lg{display:block;margin:0 auto 1.5mm}
.n{font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:${mm > 60 ? 18 : 15.5}px;letter-spacing:.02em;line-height:1.15}
.s{font-size:.92em}.k{display:inline-block;margin-top:2.2mm;border:.45mm solid #000;padding:.5mm 2.6mm;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:.95em;letter-spacing:.14em}
.an{display:inline-block;margin-top:1.4mm;border:.55mm solid #000;padding:.3mm 2mm;font-family:Arial,Helvetica,sans-serif;font-weight:900;letter-spacing:.1em}
.d{border-top:.3mm solid #000;margin:2mm 0}.e{border-top:.5mm solid #000;margin:1.2mm 0}
.r{display:flex;justify-content:space-between;align-items:baseline;gap:2mm}.r>span{min-width:0}.r>b{white-space:nowrap;text-align:right}
.it{margin:.9mm 0}.it .nm{font-family:Arial,Helvetica,sans-serif;font-weight:700}
.tot{font-size:1.28em;font-weight:900;padding:.6mm 0}.tot span:last-child{white-space:nowrap}
.x{font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:1.06em}.due{font-weight:900}`;
function ticketBody(s, b, dup) {
  const row = (l, v) => `<div class="r"><span>${l}</span><b>${v}</b></div>`;
  const d = new Date(s.at); const title = s.status === "annulee" ? "REÇU · ANNULÉ" : s.status === "credit" ? "REÇU · CRÉDIT" : "REÇU · VENTE";
  return `<div class="c"><span class="lg">${barLogoSvg(b)}</span><div class="n">${esc(String(b.name || "").toUpperCase())}</div>
  <div class="s">${[barLoc(b), b.phone ? "Tél. " + b.phone : "", b.legal].filter(Boolean).map(esc).join("<br>")}</div>
  <div class="k">${title}</div>${dup ? '<div><span class="an">DUPLICATA</span></div>' : ""}</div>
  <div class="d"></div>${row("Reçu N°", esc(s.num))}${row("Date", dFR(d))}${row("Heure", hm(d))}${s.register ? row("Caisse", esc(s.register)) : ""}${row("Servi par", esc(s.byName))}${s.client ? row("Client", esc(s.client)) : ""}
  <div class="d"></div>${s.lines.map((l) => `<div class="it"><div class="nm">${esc(l.name)}</div>${row(`${l.qty} × ${nb(l.price)}`, F(l.qty * l.price))}</div>`).join("")}
  ${s.discount ? `<div class="d"></div>${row("Sous-total", F(subOf(s)))}${row("Remise", "− " + F(s.discount))}` : ""}
  <div class="e"></div><div class="r tot"><span>TOTAL</span><span>${F(s.total)}</span></div><div class="e"></div>
  ${row("Mode de paiement", esc(modeL(s.mode, s.op)))}${s.ref ? row("Référence", esc(s.ref)) : ""}${s.received ? row("Somme reçue", F(s.received)) + row("Monnaie rendue", F(s.received - s.total)) : ""}${s.status === "credit" ? `<div class="r due"><span>Reste à payer</span><b>${F(s.total)}</b></div>` : ""}${row("Articles", qtyOf(s))}
  ${s.status === "annulee" && s.cancel ? `<div class="d"></div><div class="s">Annulé le ${dt(s.cancel.at)} par ${esc(s.cancel.by)}<br>Motif : ${esc(s.cancel.motif)}</div>` : ""}
  <div class="d"></div><div class="c"><div class="x">${esc(db().settings.thanks || "Merci de votre visite !")}</div><div class="s" style="margin-top:1.6mm">Merci de conserver ce reçu.</div><div class="s">${esc(s.num)} · GestiOne</div></div>`;
}

// Reçu A4 sur le modèle du devis « Pro-forma » (Aluminium) : bandeau rouge,
// tableau encadré, montant en lettres. Marge de sécurité de 15 mm intégrée à la page.
const A4_CSS = `@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}
body{color:#111;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{position:relative;width:210mm;height:297mm;padding:15mm 15mm 18mm;font-size:10.5pt;line-height:1.4;overflow:hidden}
.pg .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm}
.pg .nm{color:#A8282B;font-weight:700;font-size:17pt;letter-spacing:.01em;line-height:1.1}.pg .sl{color:#A8282B;font-size:10pt;margin-top:1mm}
.pg .ttl{color:#A8282B;font-weight:800;font-size:28pt;line-height:1;letter-spacing:.01em;text-align:right;white-space:nowrap}
.pg .co{display:flex;justify-content:space-between;gap:10mm;margin-top:8mm}.pg .co .l div{font-size:10pt}.pg .co .rt{text-align:right;font-size:10pt}.pg .co .rt .g{color:#444;font-size:9pt}
.pg .to{margin-top:6mm}.pg .to .a{font-weight:700}.pg .to .cl{font-weight:700;font-size:11.5pt;margin-top:3mm;text-transform:uppercase}.pg .to .g{color:#333;font-size:9.5pt}
.pg table{width:100%;border-collapse:collapse;margin-top:9mm}.pg th{background:#A8282B;color:#fff;font-weight:700;font-size:9.5pt;padding:3mm 2.5mm;border:.35mm solid #BE5E60;text-align:center}
.pg td{border:.35mm solid #BE5E60;padding:2.4mm 2.8mm;font-size:10.5pt}.pg tbody tr:nth-child(odd) td{background:#F3E1E1}
.pg td.q{text-align:center;font-weight:700;width:12mm}.pg td.n{text-align:right;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}.pg td.ds{text-transform:uppercase}
.pg .tt{display:flex;justify-content:flex-end;margin-top:0}.pg .tt table{width:auto;margin:0;border-collapse:collapse}.pg .tt td{border:none;background:none!important;padding:0}
.pg .tr{display:grid;grid-template-columns:44mm 41.5mm;align-items:stretch}.pg .tr .lb{color:#A8282B;font-weight:700;font-size:12.5pt;display:flex;align-items:center;justify-content:center}
.pg .tr .v{border:.35mm solid #BE5E60;border-top:0;text-align:right;padding:2.4mm 2.8mm;font-weight:700;font-size:11pt;white-space:nowrap;font-variant-numeric:tabular-nums}
.pg .tr.big .lb{font-size:15pt}.pg .tr.big .v{font-size:17pt;font-weight:800;padding:3.4mm 2.8mm}
.pg .pay{margin-top:6mm;display:flex;gap:7mm;flex-wrap:wrap;font-size:10pt;color:#222}.pg .pay b{color:#111}
.pg .ar{margin-top:8mm;color:#A8282B;font-size:11pt}.pg .ar b{font-weight:700;text-transform:uppercase}
.pg .mc{margin-top:8mm;color:#A8282B;font:700 12.5pt Georgia,"Times New Roman",serif}
.pg .cn{margin-top:6mm;padding:2.5mm 4mm;border:.5mm solid #A8282B;color:#A8282B;font-weight:700;display:inline-block}
.pg .dp{display:inline-block;margin-top:2mm;padding:.6mm 3mm;border:.45mm solid #A8282B;color:#A8282B;font-weight:800;font-size:9pt;letter-spacing:.12em}
.pg .ft{position:absolute;left:15mm;right:15mm;bottom:10mm;display:flex;justify-content:space-between;color:#8A8F96;font-size:8.5pt}`;
function a4Body(s, b, dup) {
  const d = new Date(s.at); const title = s.status === "annulee" ? "REÇU ANNULÉ" : "REÇU";
  const addr = [b.address, b.city && b.address !== b.city ? b.city : "", b.country].filter(Boolean);
  const words = enLettres(s.total);
  const trow = (l, v, big) => `<div class="tr${big ? " big" : ""}"><div class="lb">${l}</div><div class="v">${v}</div></div>`;
  return `<div class="pg">
  <div class="top"><div><div class="nm">${esc(String(b.name || "").toUpperCase())}</div>${b.slogan ? `<div class="sl">${esc(b.slogan)}</div>` : ""}</div><div style="text-align:right"><div class="ttl">${title}</div>${dup ? '<div class="dp">DUPLICATA</div>' : ""}</div></div>
  <div class="co"><div class="l">${addr.map((x) => `<div>${esc(x)}</div>`).join("")}${b.phone ? `<div>${esc(b.phone)}</div>` : ""}${b.email ? `<div>${esc(b.email)}</div>` : ""}${b.legal ? `<div style="color:#444">${esc(b.legal)}</div>` : ""}</div>
  <div class="rt"><div><b>Date :</b> ${dFR(d)} à ${hm(d)}</div><div class="g">N° ${esc(s.num)}</div>${s.register ? `<div class="g">Caisse : ${esc(s.register)}</div>` : ""}<div class="g">Servi par : ${esc(s.byName)}</div></div></div>
  <div class="to"><div class="a">À :</div><div class="cl">${esc(s.client || "Client comptoir")}</div></div>
  <table><thead><tr><th style="width:12mm">Qte</th><th>DÉSIGNATION</th><th style="width:38mm">Prix unitaire F.CFA</th><th style="width:41.5mm">TOTAL en F.CFA</th></tr></thead>
  <tbody>${s.lines.map((l) => `<tr><td class="q">${String(l.qty).padStart(2, "0")}</td><td class="ds">${esc(l.name)}</td><td class="n">${nb(l.price)}</td><td class="n">${nb(l.qty * l.price)}</td></tr>`).join("")}</tbody></table>
  <div class="tt"><div>${trow("Sous-total", nb(subOf(s)))}${s.discount ? trow("Remise", "− " + nb(s.discount)) : ""}${trow("Total", nb(s.total), true)}</div></div>
  <div class="pay"><span>Mode de paiement : <b>${esc(modeL(s.mode, s.op))}</b></span>${s.ref ? `<span>Référence : <b>${esc(s.ref)}</b></span>` : ""}${s.received ? `<span>Somme reçue : <b>${F(s.received)}</b></span><span>Monnaie rendue : <b>${F(s.received - s.total)}</b></span>` : ""}${s.status === "credit" ? `<span style="color:#A8282B">Reste à payer : <b style="color:#A8282B">${F(s.total)}</b></span>` : ""}</div>
  <div class="ar">Arrêté le présent reçu à la somme de : <b>${esc(words)}</b></div>
  ${s.status === "annulee" && s.cancel ? `<div class="cn">Reçu annulé le ${dt(s.cancel.at)} par ${esc(s.cancel.by)} · Motif : ${esc(s.cancel.motif)}</div>` : ""}
  <div class="mc">${esc(db().settings.thanks || "Merci de votre confiance !")}</div>
  <div class="ft"><span>Montants exprimés en francs CFA · GestiOne</span><span>${esc(s.num)} · page 1</span></div></div>`;
}
function saleDoc(s, b, dup, paper) {
  const a4 = paper === "A4"; const mm = paper === "80" ? 80 : 58;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${esc(s.num)}</title><style>${a4 ? A4_CSS : TICKET_CSS(mm)}</style></head><body>${a4 ? a4Body(s, b, dup) : `<div class="tk">${ticketBody(s, b, dup)}</div>`}</body></html>`;
}
function printHtml(html) {
  const old = document.getElementById("bm-print"); if (old) old.remove();
  const fr = document.createElement("iframe"); fr.id = "bm-print"; fr.setAttribute("aria-hidden", "true"); fr.title = "Impression";
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(fr);
  const w = fr.contentWindow; w.document.open(); w.document.write(html); w.document.close();
  return new Promise((ok, ko) => setTimeout(() => { try { w.focus(); w.print(); ok(); } catch (e) { ko(e); } }, 300));
}

// PDF (application installée : la fenêtre d'impression du navigateur n'existe pas).
async function pdfDoc(title, build) {
  if (!H.pdf || !H.pdf.load) throw new Error("Export PDF indisponible.");
  const JsPDF = await H.pdf.load(); const doc = new JsPDF({ unit: "pt", format: "a4" });
  const P = { doc, x: 40, y: 48, W: 515, page: 1, t: (s, x, y, o) => doc.text(ascii(s), x, y, o) };
  P.ensure = (h) => { if (P.y + h > 790) { foot(); doc.addPage(); P.page++; P.y = 48; } };
  const foot = () => { doc.setFontSize(8); doc.setTextColor(110); P.t("GestiOne - Bar Manager - montants en FCFA", 40, 815); P.t("Page " + P.page, 555, 815, { align: "right" }); doc.setTextColor(0); };
  build(P); foot();
  await H.pdf.save(title.replace(/[^\w.-]+/g, "_") + ".pdf", doc);
}
function pdfHeader(P, b, title, sub) {
  const { doc } = P; doc.setFont("helvetica", "bold"); doc.setFontSize(15); P.t(b.name, 40, P.y); doc.setFontSize(13); P.t(title, 555, P.y, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); P.y += 14; P.t([barLoc(b), b.phone ? "Tel. " + b.phone : ""].filter(Boolean).join(" - "), 40, P.y); P.t(sub, 555, P.y, { align: "right" });
  if (b.legal) { P.y += 12; P.t(b.legal, 40, P.y); }
  P.y += 10; doc.setLineWidth(1.2); doc.line(40, P.y, 555, P.y); P.y += 18;
}
function pdfTable(P, cols, rows, widths, right) {
  const { doc } = P; const xs = []; let x = 40; widths.forEach((w) => { xs.push(x); x += w; });
  const headRow = () => { doc.setFillColor(241, 237, 230); doc.rect(40, P.y - 11, 515, 16, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); cols.forEach((c, i) => P.t(c, right.has(i) ? xs[i] + widths[i] - 4 : xs[i] + 4, P.y, right.has(i) ? { align: "right" } : undefined)); doc.setFont("helvetica", "normal"); P.y += 16; };
  headRow(); doc.setFontSize(9);
  rows.forEach((r) => { const before = P.page; P.ensure(16); if (P.page !== before) headRow(); r.forEach((v, i) => { let s = ascii(v); const max = Math.floor(widths[i] / 4.6); if (s.length > max) s = s.slice(0, max - 1) + "."; P.t(s, right.has(i) ? xs[i] + widths[i] - 4 : xs[i] + 4, P.y, right.has(i) ? { align: "right" } : undefined); }); doc.setDrawColor(230); doc.line(40, P.y + 5, 555, P.y + 5); P.y += 16; });
}
// Texte compatible avec les polices PDF standard (Latin-1).
const lat = (t) => String(t == null ? "" : t).replace(/[    ]/g, " ").replace(/[−–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/€/g, "EUR").replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");

// Ticket 58 / 80 mm en PDF (application installée) : même mise en page que le ticket imprimé.
function drawTicketPdf(doc, s, b, dup, W) {
  const L = 1.5, R = W - 1.5, CW = R - L, MID = W / 2; const big = W > 60;
  const fs = big ? 9.4 : 8.3; const lh = (sz) => sz * 0.3528 * 1.36; let y = 3;
  const T = (t, x, yy, o) => doc.text(lat(t), x, yy, o);
  const font = (f, st, sz) => { doc.setFont(f, st); doc.setFontSize(sz); };
  const center = (t, f, st, sz) => { font(f, st, sz); doc.splitTextToSize(lat(t), CW).forEach((ln) => { y += lh(sz); T(ln, MID, y, { align: "center" }); }); };
  const rule = (w) => { y += 1.6; doc.setDrawColor(0); doc.setLineWidth(w || 0.25); doc.line(L, y, R, y); y += 0.4; };
  const row = (l, v, bold, sz) => { sz = sz || fs; font("courier", "bold", sz); const vw = doc.getTextWidth(lat(v)); font("courier", bold ? "bold" : "normal", sz); const ls = doc.splitTextToSize(lat(l), Math.max(10, CW - vw - 2)); ls.forEach((ln, i) => { y += lh(sz); T(ln, L, y); if (i === 0) { font("courier", "bold", sz); T(v, R, y, { align: "right" }); font("courier", bold ? "bold" : "normal", sz); } }); };
  // Logo rond
  const r = big ? 9 : 8, cy = y + r; doc.setFillColor(0, 0, 0); doc.circle(MID, cy, r, "F"); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.25); doc.circle(MID, cy, r - 1.3, "S");
  doc.setLineWidth(0.55); doc.triangle(MID - 3.3, cy - 4.4, MID + 3.3, cy - 4.4, MID, cy - 0.6, "S"); doc.line(MID, cy - 0.6, MID, cy + 2.4); doc.line(MID - 1.8, cy + 2.6, MID + 1.8, cy + 2.6);
  const short = (String(b.name || "BAR").split(/\s+/).filter((w) => w.length > 2).slice(-1)[0] || ini(b.name)).toUpperCase().slice(0, 10);
  doc.setTextColor(255, 255, 255); font("helvetica", "bold", 4.3); T(short, MID, cy + 5.6, { align: "center" }); doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);
  y = cy + r + 1.2;
  center(String(b.name || "").toUpperCase(), "helvetica", "bold", big ? 13 : 11.5);
  [barLoc(b), b.phone ? "Tél. " + b.phone : "", b.legal].filter(Boolean).forEach((x) => center(x, "courier", "normal", fs * 0.94));
  // Titre encadré
  const title = s.status === "annulee" ? "REÇU · ANNULÉ" : s.status === "credit" ? "REÇU · CRÉDIT" : "REÇU · VENTE";
  font("helvetica", "bold", fs); const tw = doc.getTextWidth(lat(title)) + lat(title).length * 0.45 + 5; y += 2.4; doc.setLineWidth(0.4); doc.rect(MID - tw / 2, y, tw, lh(fs) + 1.6, "S"); T(title, MID, y + lh(fs) - 0.2, { align: "center", charSpace: 0.45 }); y += lh(fs) + 1.6;
  if (dup) { font("helvetica", "bold", fs * 0.9); const dw = doc.getTextWidth("DUPLICATA") + 5; y += 1.4; doc.rect(MID - dw / 2, y, dw, lh(fs) + 1, "S"); T("DUPLICATA", MID, y + lh(fs) - 0.4, { align: "center" }); y += lh(fs) + 1; }
  rule(); const d = new Date(s.at);
  row("Reçu N°", s.num); row("Date", dFR(d)); row("Heure", hm(d)); if (s.register) row("Caisse", s.register); row("Servi par", s.byName); if (s.client) row("Client", s.client);
  rule();
  s.lines.forEach((l) => { y += 0.6; font("helvetica", "bold", fs); doc.splitTextToSize(lat(l.name), CW).forEach((ln) => { y += lh(fs); T(ln, L, y); }); row(`${l.qty} × ${nb(l.price)}`, F(l.qty * l.price)); });
  if (s.discount) { rule(); row("Sous-total", F(subOf(s))); row("Remise", "- " + F(s.discount)); }
  rule(0.5); row("TOTAL", F(s.total), true, fs * 1.3); y += 0.6; rule(0.5);
  row("Mode de paiement", modeL(s.mode, s.op)); if (s.ref) row("Référence", s.ref);
  if (s.received) { row("Somme reçue", F(s.received)); row("Monnaie rendue", F(s.received - s.total)); }
  if (s.status === "credit") row("Reste à payer", F(s.total), true); row("Articles", String(qtyOf(s)));
  if (s.status === "annulee" && s.cancel) { rule(); center("Annulé le " + dt(s.cancel.at) + " par " + s.cancel.by, "courier", "normal", fs * 0.92); center("Motif : " + s.cancel.motif, "courier", "normal", fs * 0.92); }
  rule(); y += 0.6; center(db().settings.thanks || "Merci de votre visite !", "helvetica", "bold", fs * 1.05); y += 1;
  center("Merci de conserver ce reçu.", "courier", "normal", fs * 0.92); center(s.num + " · GestiOne", "courier", "normal", fs * 0.92);
  return y + 5;
}
async function saleTicketPdf(s, b, dup, paper) {
  const JsPDF = await H.pdf.load(); const W = paper === "80" ? 80 : 58;
  const probe = new JsPDF({ unit: "mm", format: [W, 2000] }); const h = Math.ceil(drawTicketPdf(probe, s, b, dup, W));
  const doc = new JsPDF({ unit: "mm", format: [W, Math.max(h, W + 1)] }); drawTicketPdf(doc, s, b, dup, W);
  await H.pdf.save("Recu-" + String(s.num).replace(/[^\w-]/g, "") + ".pdf", doc);
}

// Reçu A4 en PDF (application installée), sur le modèle du devis Pro-forma.
async function saleToPdf(s, b, dup) {
  const JsPDF = await H.pdf.load(); const doc = new JsPDF({ unit: "mm", format: "a4" });
  const RED = [168, 40, 43], ZEB = [243, 225, 225], BRD = [190, 94, 96], M = 15, RX = 195; let page = 1; let y;
  const T = (t, x, yy, o) => doc.text(lat(t), x, yy, o);
  const font = (st, sz, col) => { doc.setFont("helvetica", st); doc.setFontSize(sz); doc.setTextColor(...(col || [17, 17, 17])); };
  const foot = () => { font("normal", 8, [138, 143, 150]); T("Montants exprimés en francs CFA · GestiOne", M, 288); T(s.num + " · page " + page, RX, 288, { align: "right" }); };
  const d = new Date(s.at);
  const header = (first) => {
    font("bold", 16, RED); T(String(b.name || "").toUpperCase(), M, 22);
    font("bold", 27, RED); T(s.status === "annulee" ? "REÇU ANNULÉ" : "REÇU", RX, 24, { align: "right" });
    let yl = 35; font("normal", 9.5); [b.address, b.city && b.address !== b.city ? b.city : "", b.country, b.phone, b.email].filter(Boolean).forEach((x) => { T(x, M, yl); yl += 4.6; }); if (b.legal) { font("normal", 9, [68, 68, 68]); T(b.legal, M, yl); yl += 4.6; }
    let yr = 35; font("bold", 9.5); const dv = dFR(d) + " à " + hm(d); font("normal", 9.5); const dvw = doc.getTextWidth(lat(dv)); T(dv, RX, yr, { align: "right" }); font("bold", 9.5); T("Date : ", RX - dvw, yr, { align: "right" });
    font("normal", 8.6, [68, 68, 68]); [["N° ", s.num], ["Caisse : ", s.register], ["Servi par : ", s.byName]].filter((x) => x[1]).forEach(([k, v]) => { yr += 4.4; T(k + v, RX, yr, { align: "right" }); });
    if (dup) { yr += 3; font("bold", 8.5, RED); const w = doc.getTextWidth("DUPLICATA") + 6; doc.setDrawColor(...RED); doc.setLineWidth(0.4); doc.rect(RX - w, yr, w, 6, "S"); T("DUPLICATA", RX - w / 2, yr + 4.2, { align: "center" }); yr += 6; }
    y = Math.max(yl, yr) + 6;
    if (first) { font("bold", 10.5); T("À :", M, y); y += 7; font("bold", 11.5); T(String(s.client || "Client comptoir").toUpperCase(), M, y); y += 10; } else y += 2;
  };
  const cw = [12, 89, 38, 41], xs = [M, M + 12, M + 101, M + 139];
  const cell = (i, h, fill) => { if (fill) { doc.setFillColor(...fill); doc.rect(xs[i], y, cw[i], h, "F"); } doc.setDrawColor(...BRD); doc.setLineWidth(0.3); doc.rect(xs[i], y, cw[i], h, "S"); };
  const head = () => { doc.setFillColor(...RED); doc.rect(M, y, 180, 9, "F"); doc.setDrawColor(...BRD); cw.forEach((w, i) => doc.rect(xs[i], y, w, 9, "S")); font("bold", 8.6, [255, 255, 255]); ["Qte", "DÉSIGNATION", "Prix unitaire F.CFA", "TOTAL en F.CFA"].forEach((l, i) => T(l, xs[i] + cw[i] / 2, y + 5.8, { align: "center" })); y += 9; };
  header(true); head();
  s.lines.forEach((l, i) => {
    font("normal", 9.8); const nm = doc.splitTextToSize(lat(String(l.name).toUpperCase()), cw[1] - 5); const h = Math.max(8, nm.length * 4.6 + 3.4);
    if (y + h > 262) { foot(); doc.addPage(); page++; header(false); head(); }
    const f = i % 2 === 0 ? ZEB : null; cw.forEach((_, k) => cell(k, h, f));
    font("bold", 9.8); T(String(l.qty).padStart(2, "0"), xs[0] + cw[0] / 2, y + 5.3, { align: "center" });
    font("normal", 9.8); nm.forEach((ln, k) => T(ln, xs[1] + 2.6, y + 5.3 + k * 4.6));
    font("bold", 9.8); T(nb(l.price), xs[2] + cw[2] - 2.6, y + 5.3, { align: "right" }); T(nb(l.qty * l.price), xs[3] + cw[3] - 2.6, y + 5.3, { align: "right" }); y += h;
  });
  if (y + 70 > 280) { foot(); doc.addPage(); page++; header(false); }
  const tr = (l, v, bigr) => { const h = bigr ? 12 : 8; doc.setDrawColor(...BRD); doc.setLineWidth(0.3); doc.rect(xs[3], y, cw[3], h, "S"); font("bold", bigr ? 14 : 11.5, RED); T(l, xs[3] - 22, y + h / 2 + (bigr ? 1.8 : 1.4), { align: "center" }); font("bold", bigr ? 15.5 : 10.5); T(v, xs[3] + cw[3] - 2.6, y + h / 2 + (bigr ? 2 : 1.4), { align: "right" }); y += h; };
  tr("Sous-total", nb(subOf(s))); if (s.discount) tr("Remise", "- " + nb(s.discount)); tr("Total", nb(s.total), true);
  y += 8; font("normal", 9.5); let x = M;
  const pi = [["Mode de paiement : ", modeL(s.mode, s.op)], s.ref ? ["Référence : ", s.ref] : null, s.received ? ["Somme reçue : ", F(s.received)] : null, s.received ? ["Monnaie rendue : ", F(s.received - s.total)] : null, s.status === "credit" ? ["Reste à payer : ", F(s.total)] : null].filter(Boolean);
  pi.forEach(([k, v]) => { font("normal", 9.5); const kw = doc.getTextWidth(lat(k)); font("bold", 9.5); const vw = doc.getTextWidth(lat(v)); if (x + kw + vw > RX) { x = M; y += 5.5; } font("normal", 9.5); T(k, x, y); font("bold", 9.5); T(v, x + kw, y); x += kw + vw + 7; });
  y += 9; const lead = "Arrêté le présent reçu à la somme de : "; const words = enLettres(s.total).toUpperCase();
  font("normal", 10.5, RED); const lw = doc.getTextWidth(lat(lead)); T(lead, M, y); font("bold", 10.5, RED);
  if (lw + doc.getTextWidth(lat(words)) <= 180) T(words, M + lw, y); else { doc.splitTextToSize(lat(words), 180).forEach((ln) => { y += 5.2; T(ln, M, y); }); }
  if (s.status === "annulee" && s.cancel) { y += 9; font("bold", 9.5, RED); T("Reçu annulé le " + dt(s.cancel.at) + " par " + s.cancel.by + " · Motif : " + s.cancel.motif, M, y); }
  y += 11; doc.setFont("times", "bold"); doc.setFontSize(12.5); doc.setTextColor(...RED); T(db().settings.thanks || "Merci de votre confiance !", M, y);
  foot(); doc.setTextColor(0, 0, 0);
  await H.pdf.save("Recu-" + String(s.num).replace(/[^\w-]/g, "") + ".pdf", doc);
}

// Point d'entrée unique : choisit le bon canal selon l'appareil et le format.
async function outputSale(s, dup, paper, copies = 1) {
  const b = bar();
  if (paper !== "A4" && canBt()) { for (let i = 0; i < copies; i++) await H.printer.printRaw(escposSale(s, b, dup || i > 0), "recu-" + String(s.num).replace(/[^\w-]/g, "") + ".prn"); }
  else if (isNativeApp() && H.pdf) await (paper === "A4" ? saleToPdf(s, b, dup) : saleTicketPdf(s, b, dup, paper));
  else await printHtml(saleDoc(s, b, dup, paper));
}
async function printSale(id, opts = {}) {
  const d = db(); const s = d.sales.find((x) => x.id === id); if (!s) return;
  const p = prn(); const paper = opts.paper || p.paper; const dup = printsOf(s).length > 0; const copies = opts.auto ? Math.max(1, Number(p.copies) || 1) : 1;
  try { await outputSale(s, dup, paper, copies); } catch (e) { toast((e && e.message) || "Impression impossible. Vérifiez l'imprimante.", "err"); return; }
  s.prints = [...printsOf(s), { at: Date.now(), by: me().name, paper }];
  audit(dup ? "Réimpression d'un reçu" : "Impression d'un reçu", s.num, { after: dup ? "duplicata" : "original" }); save();
  if (UI.sheet && UI.sheet.type === "sale") drawLayer();
  if (!opts.auto) toast(dup ? "Duplicata envoyé à l'impression." : "Reçu envoyé à l'impression.");
}
function receiptText(s, b) {
  const L = [b.name.toUpperCase(), barLoc(b), b.phone ? "Tél. " + b.phone : "", "", (s.status === "annulee" ? "REÇU ANNULÉ" : "REÇU DE VENTE") + " N° " + s.num, dt(s.at) + " · " + s.byName, ""];
  s.lines.forEach((l) => L.push(`${l.qty} × ${l.name} : ${F(l.qty * l.price)}`));
  if (s.discount) L.push("Remise : − " + F(s.discount)); L.push("TOTAL : " + F(s.total), "Paiement : " + modeL(s.mode, s.op), "", db().settings.thanks);
  return L.filter((x, i) => x !== "" || i > 2).join("\n");
}

// Journal des ventes (liste filtrée) : impression, PDF et CSV.
function journalDoc(list, label) {
  const b = bar(); const ok = list.filter((s) => s.status !== "annulee"); const tot = ok.reduce((a, s) => a + s.total, 0);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Journal des ventes</title><style>@page{size:A4 landscape;margin:12mm}${PRINT_CSS}</style></head><body><div class="a4">
  <div class="hd"><div><h1>${esc(b.name)}</h1><div class="mut">${esc(barLoc(b))}${b.phone ? " · Tél. " + esc(b.phone) : ""}</div></div><div style="text-align:right"><h2>JOURNAL DES VENTES</h2><div class="mut">Période : ${esc(label)}</div><div class="mut">Édité le ${dt(Date.now())} par ${esc(me().name)}</div></div></div>
  <div class="grid"><div><span class="mut">Ventes valides</span><b>${ok.length}</b></div><div><span class="mut">Chiffre d'affaires</span><b>${F(tot)}</b></div><div><span class="mut">Panier moyen</span><b>${F(ok.length ? tot / ok.length : 0)}</b></div><div><span class="mut">Ventes annulées</span><b>${list.length - ok.length}</b></div></div>
  <table><thead><tr><th>N°</th><th>Date</th><th>Caisse</th><th>Employé</th><th>Articles</th><th>Paiement</th><th>État</th><th class="n">Total</th></tr></thead><tbody>${list.map((s) => `<tr><td>${s.num}</td><td>${dt(s.at)}</td><td>${esc(s.register || "—")}</td><td>${esc(s.byName)}</td><td>${s.lines.map((l) => l.qty + " × " + esc(l.name)).join(", ")}</td><td>${esc(modeL(s.mode, s.op))}</td><td>${{ annulee: "Annulée", credit: "À crédit", payee: "Payée" }[s.status] || ""}</td><td class="n">${F(s.total)}</td></tr>`).join("")}</tbody></table>
  <div class="tots"><div class="r big"><span>Total des ventes valides</span><span>${F(tot)}</span></div></div>
  <div class="ft"><span>Montants en francs CFA (FCFA)</span><span>GestiOne · Bar Manager</span></div></div></body></html>`;
}
function journalPdf(list, label) {
  const b = bar(); const ok = list.filter((s) => s.status !== "annulee"); const tot = ok.reduce((a, s) => a + s.total, 0);
  return pdfDoc("Journal-des-ventes-" + dS(Date.now()).replace(/\//g, "-"), (P) => {
    pdfHeader(P, b, "JOURNAL DES VENTES", "Periode : " + label);
    P.doc.setFontSize(9.5); P.t(`${ok.length} vente(s) valide(s) - CA ${F(tot)} - panier moyen ${F(ok.length ? tot / ok.length : 0)} - ${list.length - ok.length} annulee(s)`, 40, P.y); P.y += 20;
    pdfTable(P, ["N", "Date", "Employe", "Paiement", "Etat", "Total"], list.map((s) => [s.num, dt(s.at), s.byName, modeL(s.mode, s.op), { annulee: "Annulee", credit: "A credit", payee: "Payee" }[s.status] || "", nb(s.total)]), [95, 85, 105, 95, 60, 75], new Set([5]));
    P.y += 8; P.doc.setFont("helvetica", "bold"); P.doc.setFontSize(11); P.t("Total des ventes valides : " + F(tot), 551, P.y, { align: "right" });
  });
}
function journalCsv(list) {
  const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const rows = [["N° de vente", "Date", "Heure", "Caisse", "Employé", "Client", "Produits", "Articles", "Sous-total", "Remise", "Total", "Paiement", "Opérateur", "Référence", "État", "Motif d'annulation", "Impressions"]];
  list.forEach((s) => { const d0 = new Date(s.at); rows.push([s.num, dFR(s.at), hm(s.at), s.register || "", s.byName, s.client || "", s.lines.map((l) => l.qty + " x " + l.name).join(" | "), qtyOf(s), subOf(s), s.discount || 0, s.total, MODES.find((m) => m[0] === s.mode)?.[1] || s.mode, s.op || "", s.ref || "", { annulee: "Annulée", credit: "À crédit", payee: "Payée" }[s.status] || "", s.cancel ? s.cancel.motif : "", printsOf(s).length]); void d0; });
  return "﻿" + rows.map((r) => r.map(q).join(";")).join("\r\n");
}

/* ============================== Annonces vocales ============================== */
const VCATS = [["ventes", "Ventes, remises et annulations"], ["caisse", "Caisse : ouverture, fermeture, écarts"], ["stock", "Stock : mouvements, inventaires, pertes"], ["achats", "Commandes et réceptions fournisseurs"], ["depenses", "Dépenses et validations"], ["alertes", "Alertes : ruptures, seuils, anomalies"], ["personnel", "Personnel et accès"], ["parametres", "Paramètres, licence et sauvegardes"]];
const VOICE_OF = {
  "Création d'une vente": "ventes", "Remise accordée": "ventes", "Annulation d'une vente": "ventes",
  "Ouverture d'une caisse": "caisse", "Fermeture d'une caisse": "caisse", "Validation d'une fermeture de caisse": "caisse", "Validation d'une correction": "caisse",
  "Modification d'un stock": "stock", "Inventaire": "stock", "Attribution de stock": "stock", "Contrôle du stock": "stock", "Examen d'un écart de stock": "stock", "Déclaration d'une perte": "stock", "Validation d'une perte": "stock", "Sortie refusée": "stock", "Transfert reçu": "stock", "Création d'un produit": "stock", "Modification d'un prix": "stock", "Import du catalogue type": "stock", "Écart constaté": "caisse",
  "Commande fournisseur": "achats", "Réception de commande": "achats", "Paiement fournisseur": "achats",
  "Création d'une dépense": "depenses", "Modification d'une dépense": "depenses", "Approbation d'une dépense": "depenses", "Refus d'une dépense": "depenses",
  "Modification des droits d'accès": "personnel", "Création d'un utilisateur": "personnel", "Tentative d'accès non autorisée": "personnel",
  "Modification des paramètres": "parametres", "Activation de licence": "parametres", "Demande de licence": "parametres", "Point de restauration": "parametres", "Restauration": "parametres", "Configuration initiale de l'établissement": "parametres",
};
const VOICE_KEY = () => "bmp-voice:" + (H.shop && H.shop.id);
function voicePrefs() { const base = { on: db() ? db().settings.voice !== false : true, cats: Object.fromEntries(VCATS.map(([k]) => [k, true])) }; try { const v = JSON.parse(localStorage.getItem(VOICE_KEY()) || "null"); if (v) return { on: v.on !== false, cats: { ...base.cats, ...(v.cats || {}) } }; } catch (e) { /* stockage indisponible */ } return base; }
function setVoicePrefs(p) { try { localStorage.setItem(VOICE_KEY(), JSON.stringify(p)); } catch (e) { /* ignore */ } }
const spoken = (t) => String(t || "").replace(/\bV\d{6}-\d{6}\b/g, "").replace(/\bBC-0*(\d+)/g, "bon de commande $1").replace(/FCFA/g, "francs CFA").replace(/(\d)\s(?=\d{3}\b)/g, "$1").replace(/×/g, "fois").replace(/[·|]/g, ",").replace(/[−–]\s?(\d)/g, "moins $1").replace(/(^|\s)-(\d)/g, "$1moins $2").replace(/(^|\s)\+(\d)/g, "$1plus $2").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").replace(/[ ,:]+\./g, ".").trim();
let VQ = []; let VT = null;
function say(text, cat) {
  if (!H.speak || !text) return; const p = voicePrefs(); if (!p.on || (cat && p.cats[cat] === false)) return;
  VQ.push(spoken(text)); clearTimeout(VT);
  VT = setTimeout(() => { const t = VQ.join(" "); VQ = []; try { H.speak(t); } catch (e) { /* voix indisponible */ } }, 120);
}
function voiceForAudit(action, data, extra) {
  if (extra && extra.say === false) return; const cat = VOICE_OF[action]; if (!cat) return;
  if (extra && extra.say) return say(extra.say, cat);
  const custom = {
    "Remise accordée": () => `Remise accordée de ${extra.after}.`,
    "Annulation d'une vente": () => `Vente annulée. Motif : ${extra.motif}.`,
    "Ouverture d'une caisse": () => `Caisse ${data} ouverte, ${String(extra.after || "").replace("Fonds", "fonds de")}.`,
    "Fermeture d'une caisse": () => `Caisse ${data} fermée. ${extra.after || ""}.`,
    "Tentative d'accès non autorisée": () => `Action refusée : ${data}.`,
    "Création d'une dépense": () => `Dépense enregistrée : ${data}, ${extra.after}.`,
    "Déclaration d'une perte": () => `Sortie déclarée : ${data}, ${extra.motif || ""}.`,
    "Commande fournisseur": () => `Commande fournisseur enregistrée, ${extra.after}.`,
    "Réception de commande": () => `Réception enregistrée : ${extra.after}.`,
    "Modification d'un stock": () => `Stock modifié : ${data}, ${extra.after}.`,
    "Création d'un produit": () => `Produit créé : ${data}.`,
    "Configuration initiale de l'établissement": () => `Établissement configuré. Bienvenue dans Bar Manager.`,
    "Import du catalogue type": () => `Catalogue importé : ${data}.`,
  }[action];
  say(custom ? custom() : `${action} : ${data}${extra && extra.after ? ", " + extra.after : ""}.`, cat);
}

/* ============================== Feuilles ============================== */
function drawLayer() {
  const L = $("#bm-layer"); const sh = UI.sheet; if (!sh || !SHEETS[sh.type]) { L.innerHTML = ""; return; }
  L.innerHTML = `<div class="ov" data-a="ovclose"><div class="sheet ${sh.wide ? "wide" : ""}" role="dialog" aria-modal="true">${SHEETS[sh.type](sh)}</div></div>`;
  const f = L.querySelector("[autofocus]"); if (f) setTimeout(() => f.focus(), 50);
}
const sh = (t, sub) => `<div class="shh"><div style="min-width:0"><b>${t}</b>${sub ? `<div class="small" style="margin-top:3px">${sub}</div>` : ""}</div><button class="ib" data-a="close" aria-label="Fermer">${ic("x", 18)}</button></div>`;
const confirmBox = (title, text, act, extra = "", danger = true) => `${sh(title)}<div class="${danger ? "note crit" : "note"}">${text}</div>${extra}<div class="acts"><button class="btn b-sec" data-a="close">Annuler</button><button class="btn ${danger ? "b-crit" : "b-amb"}" data-a="${act}">Confirmer</button></div>`;
function receiptHtml(s, b) { const d = S.dbs[b.id] || db(); return `<div class="receipt"><div style="text-align:center"><div class="rl" style="background:${b.color}">${ini(b.name)}</div><b style="font-size:15px">${esc(b.name.toUpperCase())}</b><div>${esc(b.address)}</div>${b.phone ? `<div>Tél. ${esc(b.phone)}</div>` : ""}${b.legal ? `<div>${esc(b.legal)}</div>` : ""}<div style="margin-top:6px;font-weight:800;letter-spacing:.08em">${s.status === "annulee" ? "REÇU ANNULÉ" : "REÇU DE VENTE"}</div></div><hr>
  <div class="rr"><span>N° du reçu</span><span>${s.num}</span></div><div class="rr"><span>Date et heure</span><span>${dt(s.at)}</span></div>${s.register ? `<div class="rr"><span>Caisse</span><span>${esc(s.register)}</span></div>` : ""}<div class="rr"><span>Servi par</span><span>${esc(s.byName)}</span></div>${s.client ? `<div class="rr"><span>Client</span><span>${esc(s.client)}</span></div>` : ""}<hr>
  ${s.lines.map((l) => `<div class="rr"><span>${esc(l.name)}<br><small>${l.qty} × ${F(l.price)}</small></span><span class="num">${F(l.qty * l.price)}</span></div>`).join("")}${s.discount ? `<div class="rr"><span>Remise</span><span class="num">− ${F(s.discount)}</span></div>` : ""}<hr>
  <div class="rr" style="font-size:15px;font-weight:800"><span>TOTAL</span><span class="num">${F(s.total)}</span></div><div class="rr"><span>Paiement</span><span>${esc(modeL(s.mode, s.op))}</span></div>${s.received ? `<div class="rr"><span>Reçu / rendu</span><span class="num">${F(s.received)} / ${F(s.received - s.total)}</span></div>` : ""}
  ${s.status === "annulee" ? `<hr><div>Annulée le ${dt(s.cancel.at)} par ${esc(s.cancel.by)} : ${esc(s.cancel.motif)}</div>` : ""}<hr><div style="text-align:center">${esc(d.settings.thanks)}</div></div>`; }
const SHEETS = {
  barpick: () => `${sh("Établissements", myBars().length > 1 ? "Chaque bar est une entreprise GestiOne avec sa propre licence." : "")}${myBars().length > 1 && can("groupe") ? `<button class="btn b-sec full" data-a="go" data-v="groupe">${ic("group", 17)}Vue groupe</button>` : ""}${myBars().map((b) => `<button class="row" style="width:100%;text-align:left" data-a="openbar" data-id="${b.id}"><span style="display:flex;gap:10px;align-items:center"><span style="width:34px;height:34px;border-radius:10px;background:${b.color};color:#1A1020;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">${ini(b.name)}</span><span>${esc(b.name)}<br><span class="small">${esc(b.type)}${b.city ? " · " + esc(b.city) : ""}</span></span></span>${b.id === H.shop.id ? '<span class="tag t-amb">Ouvert</span>' : licTag(b)}</button>`).join("")}${role() === "proprietaire" ? `<button class="btn b-amb full" data-a="addbar">${ic("plus", 17)}Ajouter un bar</button>` : ""}`,
  employee: (x) => { const e = x.id ? S.employees.find((y) => y.id === x.id) : null; const d = db(); const ops = e ? d.audit.filter((a) => a.user === e.name).slice(0, 6) : []; return `${sh(e ? esc(e.name) : "Nouvel employé", e ? esc(e.func) : "Il se connectera avec son nom et ce code PIN.")}<form novalidate data-f="employee" data-id="${e ? e.id : ""}" style="display:flex;flex-direction:column;gap:12px"><div class="fgrid"><div class="field"><label for="em1">Nom complet *</label><input class="inp" id="em1" name="name" value="${esc(e ? e.name : "")}" required></div><div class="field"><label for="em2">Téléphone</label><input class="inp" id="em2" name="phone" type="tel" value="${esc(e ? e.phone : "")}"></div><div class="field"><label for="em3">Fonction</label><input class="inp" id="em3" name="func" value="${esc(e ? e.func : "")}" placeholder="Barman, serveuse…"></div><div class="field"><label for="em4">Rôle</label><select class="inp" id="em4" name="role">${ALL.filter((r) => r !== "proprietaire").map((r) => `<option value="${r}" ${(e ? e.role === r : r === "caissier") ? "selected" : ""}>${ROLES[r]}</option>`).join("")}</select></div><div class="field"><label for="em5">Code PIN (4 chiffres)${e ? " · laisser vide pour le garder" : " *"}</label><input class="inp num" id="em5" name="pin" type="password" inputmode="numeric" maxlength="4" ${e ? "" : "required"}></div></div>
    ${e && e.login ? `<div class="note">Code d'invitation à transmettre : <b>${esc(e.login)}</b>. L'employé ouvre GestiOne › Rejoindre une entreprise.</div>` : ""}
    <div class="acts"><button class="btn b-amb">${e ? "Enregistrer" : "Créer le compte"}</button>${e ? `<button type="button" class="btn b-sec" data-a="emptoggle" data-id="${e.id}">${e.status === "actif" ? "Désactiver le compte" : "Réactiver le compte"}</button>` : ""}</div></form>
    ${e ? `<div class="card"><h2>Dernières opérations</h2>${ops.map((a) => `<div class="row"><span>${dt(a.at)} · ${esc(a.action)}</span><span class="small">${esc(a.data)}</span></div>`).join("") || '<div class="small">Aucune opération sensible récente.</div>'}</div>` : ""}`; },
  restore: (x) => { const bk = db().backups.find((y) => y.id === x.id); return `${sh("Restaurer ce point ?", "Point du " + dt(bk.at))}<div class="note crit">Les données actuelles de ${esc(bar().name)} seront remplacées par celles de ce point de restauration, puis synchronisées. Les autres établissements ne sont pas touchés.</div><form novalidate data-f="restore" data-id="${bk.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="rpw">Code administrateur</label><input class="inp num" id="rpw" name="pw" type="password" inputmode="numeric" maxlength="6" required></div><button class="btn b-crit">Restaurer</button></form>`; },
  liborder: (x) => { const p = PLANS().find((y) => y.id === x.id); return `${sh("Commander : " + esc(p.name), (p.price ? F(p.price) + " · " : "") + esc(p.duration) + " · " + esc(bar().name))}<div class="small">Aucun paiement dans l'application : votre demande est envoyée au service GestiOne par la messagerie. Après paiement (Mobile Money, virement), vous recevez le code d'activation de cet établissement.</div><form novalidate data-f="liborder" data-id="${p.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="lo1">Votre nom</label><input class="inp" id="lo1" name="n" value="${esc(bar().owner || "")}" required></div><div class="field"><label for="lo2">Téléphone (WhatsApp)</label><input class="inp" id="lo2" name="t" type="tel" required placeholder="07 00 00 00 00"></div><button class="btn b-amb">Envoyer la demande</button></form>`; },
  compare: () => { const [a, z, label] = range(); const rows = S.bars.filter((b) => b.dbStatus === "ok").map((b) => ({ b, s: stats(S.dbs[b.id], a, z), al: alertsOf(S.dbs[b.id]).length })); const metric = (name, fn, fmt = F) => `<div class="card"><h2>${name}</h2>${meters(Object.fromEntries(rows.map((r) => [r.b.name, fn(r)])), fmt)}</div>`; return `${sh("Comparer les établissements", label)}${metric("Chiffre d'affaires", (r) => r.s.ca)}${metric("Dépenses", (r) => r.s.dep)}${metric("Marge estimée", (r) => r.s.marge)}${metric("Alertes non lues", (r) => r.al, (v) => nb(v))}`; },
  clearcart: () => confirmBox("Vider la vente en cours ?", "Tous les produits ajoutés seront retirés.", "clearcart"),
  remise: () => `${sh("Remise", "Accordée selon vos droits, inscrite au journal.")}<form novalidate data-f="remise" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="rv">Montant (FCFA)</label><input class="inp num" id="rv" name="v" type="number" min="0" value="${UI.cart.discount || ""}" autofocus required></div><div class="field"><label for="rmo">Motif</label><input class="inp" id="rmo" name="m" required placeholder="Client fidèle"></div><button class="btn b-amb">Appliquer</button></form>`,
  pay: () => { const c = UI.cart; const total = Math.max(0, c.lines.reduce((a, l) => a + l.qty * l.price, 0) - c.discount); const p = UI.pay; const modes = db().settings.modes; return `${sh("Encaisser " + F(total), c.lines.reduce((a, l) => a + l.qty, 0) + " article(s)")}
    <div class="modes">${MODES.filter(([k]) => modes[k]).map(([k, l]) => `<button class="mode ${p.mode === k ? "on" : ""}" data-a="pmode" data-m="${k}">${l}</button>`).join("")}</div>
    ${p.mode === "especes" ? `<div class="field"><label for="prc">Montant reçu (FCFA)</label><input class="inp num" id="prc" type="number" min="0" data-ch="recv" value="${p.recv}" placeholder="${total}"></div><div class="row"><span>Monnaie à rendre</span><b class="num" id="chg">${Fk(Math.max(0, (Number(p.recv) || 0) - total))}</b></div>` : ""}
    ${p.mode === "momo" ? `<div class="chips">${OPS.map((o) => `<button class="chip ${p.op === o ? "on" : ""}" data-a="pop" data-o="${o}">${o}</button>`).join("")}</div><div class="note warn">Paiement saisi manuellement, non vérifié par l'opérateur. Il n'entre pas dans les espèces du tiroir.</div>` : ""}
    ${p.mode === "credit" ? `<div class="field"><label for="pcl">Nom du client</label><input class="inp" id="pcl" data-ch="client" value="${esc(p.client)}" placeholder="M. Yapi"></div>` : ""}
    ${["carte", "virement", "autre"].includes(p.mode) ? `<div class="note">Suivi à part des espèces. Référence facultative :</div><input class="inp" data-ch="ref" value="${esc(p.ref)}" aria-label="Référence">` : ""}
    ${p.err ? `<div class="ferr">${esc(p.err)}</div>` : ""}
    <button class="btn b-amb full" style="min-height:52px" data-a="finalize" ${UI.busy ? "disabled" : ""}>${UI.busy ? '<span class="load"></span> Enregistrement…' : "Valider la vente"}</button>`; },
  sale: (x) => { const d = db(); const s = d.sales.find((y) => y.id === x.id); if (!s) return sh("Vente introuvable"); const pr = printsOf(s); const p = prn(); const logs = d.audit.filter((j) => j.data === s.num).slice(0, 8); const sess = s.sessionId ? d.sessions.find((y) => y.id === s.sessionId) : null; const marge = can("rapports") ? s.lines.reduce((a, l) => a + l.qty * (l.price - (l.cost || 0)), 0) - (s.discount || 0) : null; const row = (k, v) => `<div class="row"><span>${k}</span><b>${v}</b></div>`;
    return `${sh("Vente " + s.num, dt(s.at) + " · " + esc(s.byName))}${receiptHtml(s, bar())}
    <div class="acts"><button class="btn b-amb" data-a="printsale" data-id="${s.id}">${ic("print", 17)}${pr.length ? "Réimprimer" : "Imprimer le reçu"}</button><button class="btn b-sec" data-a="printsale" data-id="${s.id}" data-p="A4">${ic("doc", 17)}Format A4</button><button class="btn b-sec" data-a="sharesale" data-id="${s.id}">Partager</button></div>
    <div class="small">${p.paper !== "A4" && canBt() ? "Impression Bluetooth (RawBT) · ticket " + p.paper + " mm." : isNativeApp() ? "Le reçu est créé en PDF, puis partagé vers l'imprimante ou WhatsApp." : "La fenêtre d'impression s'ouvre · " + ((PAPERS.find((q) => q[0] === p.paper) || PAPERS[0])[1]).toLowerCase() + "."}${pr.length ? " Les réimpressions portent la mention DUPLICATA." : ""}</div>
    <div class="card"><h2>Détails de la vente</h2>${row("Caisse", esc(s.register || "Sans caisse"))}${sess ? row("Session ouverte le", dt(sess.openedAt)) : ""}${row("Moyen de paiement", esc(modeL(s.mode, s.op)))}${s.ref ? row("Référence", esc(s.ref)) : ""}${row("Articles", qtyOf(s))}${row("Sous-total", F(subOf(s)))}${s.discount ? row("Remise", "− " + F(s.discount)) : ""}${marge != null ? row("Marge brute", F(marge)) : ""}${row("Impressions", pr.length ? `${pr.length} · dernière le ${dt(pr[pr.length - 1].at)}` : "Pas encore imprimé")}</div>
    ${logs.length ? `<div class="card"><h2>Historique de la vente</h2>${logs.map((j) => `<div class="row"><span>${dt(j.at)} · ${esc(j.action)}</span><span class="small">${esc(j.user)}</span></div>`).join("")}</div>` : ""}
    ${s.status !== "annulee" ? `<div class="acts"><button class="btn b-crit" data-a="cancelsale" data-id="${s.id}">Annuler la vente</button></div>` : ""}`; },
  cancelsale: (x) => `${sh("Annuler la vente ?", "L'annulation est tracée : motif, auteur, heure. Le stock est remis.")}<form novalidate data-f="cancelsale" data-id="${x.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="cm">Motif</label><input class="inp" id="cm" name="m" required autofocus placeholder="Erreur de saisie"></div><div class="field"><label for="cr">Remboursement</label><select class="inp" id="cr" name="r"><option value="especes">En espèces (sort du tiroir)</option><option value="aucun">Aucun remboursement</option></select></div><button class="btn b-crit">Confirmer l'annulation</button></form>`,
  opencash: () => `${sh("Ouvrir une caisse", esc(me().name) + " · " + dt(Date.now()))}<form novalidate data-f="opencash" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="oc">Caisse</label><select class="inp" id="oc" name="reg">${REGISTERS.map((r) => `<option ${db().sessions.some((s) => !s.closedAt && s.register === r) ? "disabled" : ""}>${r}</option>`).join("")}</select></div><div class="field"><label for="of">Montant initial (FCFA)</label><input class="inp num" id="of" name="fond" type="number" min="0" value="50000" required autofocus></div><button class="btn b-amb">Ouvrir la caisse</button></form>`,
  cashmove: (x) => `${sh("Sortie ou entrée de caisse", "Doit être autorisée et justifiée.")}<form novalidate data-f="cashmove" data-id="${x.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="ct">Type</label><select class="inp" id="ct" name="t"><option value="sortie">Sortie autorisée</option><option value="entree">Entrée (apport de monnaie)</option></select></div><div class="field"><label for="ca">Montant (FCFA)</label><input class="inp num" id="ca" name="a" type="number" min="1" required autofocus></div><div class="field"><label for="cr2">Motif</label><input class="inp" id="cr2" name="r" required placeholder="Achat de glace, versement au gérant…"></div><button class="btn b-amb">Enregistrer</button></form>`,
  closecash: (x) => { const s = db().sessions.find((y) => y.id === x.id); const t = theoCash(db(), s); return `${sh("Fermer la caisse " + esc(s.register), esc(s.byName) + " · ouverte le " + dt(s.openedAt))}
    <div class="card"><h2>Ventes par moyen de paiement</h2>${MODES.map(([k, l]) => `<div class="row"><span>${l}</span><b class="num">${Fk(t.byMode[k] || 0)}</b></div>`).join("")}</div>
    <div class="card"><div class="row"><span style="font-weight:800">Solde théorique</span><b class="num">${Fk(t.theo)}</b></div><div class="small">${F(s.fond)} + ${F(t.cash)} − ${F(t.refunds)} − ${F(t.outs)} + ${F(t.ins)}</div></div>
    <form novalidate data-f="closecash" data-id="${s.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="cc">Espèces réellement comptées (FCFA)</label><input class="inp num" id="cc" name="c" type="number" min="0" required autofocus data-ch="ecart" data-theo="${t.theo}"></div><div id="ecb" class="note">Saisissez le montant compté pour voir l'écart.</div><div class="field"><label for="ce">Explication (obligatoire en cas d'écart)</label><input class="inp" id="ce" name="e"></div>${UI.errs.close ? `<div class="ferr">${esc(UI.errs.close)}</div>` : ""}<button class="btn b-amb">Enregistrer la fermeture</button></form>`; },
  session: (x) => { const s = db().sessions.find((y) => y.id === x.id); return `${sh("Session " + esc(s.register), esc(s.byName) + " · " + dt(s.openedAt) + " → " + dt(s.closedAt))}<div class="card">${MODES.map(([k, l]) => `<div class="row"><span>${l}</span><b class="num">${Fk((s.byMode || {})[k] || 0)}</b></div>`).join("")}<div class="row"><span>Théorique / compté</span><b class="num">${Fk(s.theo)} / ${F(s.counted)}</b></div><div class="row"><span>Écart</span><b class="num ${s.ecart < 0 ? "down" : ""}">${sFk(s.ecart)}</b></div>${s.explication ? `<div class="small">Explication : ${esc(s.explication)}</div>` : ""}</div>${s.corrections.length ? `<div class="card"><h2>Corrections</h2>${s.corrections.map((c) => `<div class="row"><span>${dt(c.at)} · ${esc(c.by)} : ${esc(c.motif)}</span><b class="num">${Fk(c.before)} → ${F(c.after)}</b></div>`).join("")}</div>` : ""}
    ${!s.validatedBy && can("caisse_val") ? `<button class="btn b-amb" data-a="validate" data-id="${s.id}">Valider et clôturer</button>` : s.validatedBy ? `<div class="note">${ic("lock", 14)} Session verrouillée, validée par ${esc(s.validatedBy)}.</div>` : ""}
    ${s.validatedBy && can("caisse_val") ? `<form novalidate data-f="correct" data-id="${s.id}" style="display:flex;flex-direction:column;gap:10px"><h2>Correction autorisée et tracée</h2><div class="fgrid"><div class="field"><label for="kc">Montant compté corrigé</label><input class="inp num" id="kc" name="c" type="number" min="0" value="${s.counted}" required></div><div class="field"><label for="km">Motif</label><input class="inp" id="km" name="m" required placeholder="Billet retrouvé sous le tiroir"></div></div><button class="btn b-sec">Enregistrer la correction</button></form>` : ""}`; },
  product: (x) => { const p = x.id ? prod(x.id) : null; const d = db(); const ro = !can("stock_edit"); return `${sh(p ? esc(p.name) : "Ajouter un produit", p ? esc(p.ref) : "")}
    <form data-f="product" data-id="${p ? p.id : ""}" style="display:flex;flex-direction:column;gap:12px" novalidate><div class="fgrid">
      <div class="field"><label for="pn1">Nom *</label><input class="inp ${UI.errs.pname ? "err" : ""}" id="pn1" name="name" value="${esc(p ? p.name : "")}" ${ro ? "readonly" : ""} required>${UI.errs.pname ? `<div class="ferr">${UI.errs.pname}</div>` : ""}</div>
      <div class="field"><label for="pn2">Référence</label><input class="inp" id="pn2" name="ref" value="${esc(p ? p.ref : "REF-" + (100 + d.products.length))}" ${ro ? "readonly" : ""}></div>
      <div class="field"><label for="pn3">Code-barres (facultatif)</label><input class="inp" id="pn3" name="barcode" inputmode="numeric" value="${esc(p ? p.barcode : "")}" ${ro ? "readonly" : ""}></div>
      <div class="field"><label for="pn4">Catégorie</label><select class="inp" id="pn4" name="cat" ${ro ? "disabled" : ""}>${CATS.map((c) => `<option ${p && p.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label for="pn5">Fournisseur</label><select class="inp" id="pn5" name="sup" ${ro ? "disabled" : ""}>${d.suppliers.map((s) => `<option value="${s.id}" ${p && p.supplierId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}<option value="">Aucun</option></select></div>
      <div class="field"><label for="pn6">Prix d'achat (FCFA) *</label><input class="inp num" id="pn6" name="buy" type="number" min="0" value="${p ? p.buy : ""}" ${ro ? "readonly" : ""} required></div>
      <div class="field"><label for="pn7">Prix de vente (FCFA) *</label><input class="inp num ${UI.errs.pprice ? "err" : ""}" id="pn7" name="price" type="number" min="0" value="${p ? p.price : ""}" ${ro ? "readonly" : ""} required>${UI.errs.pprice ? `<div class="ferr">${UI.errs.pprice}</div>` : ""}</div>
      <div class="field"><label for="pn8">Seuil d'alerte</label><input class="inp num" id="pn8" name="min" type="number" min="0" value="${p ? p.min : 12}" ${ro ? "readonly" : ""}></div>
      <div class="field"><label for="pn9">Unité de mesure</label><select class="inp" id="pn9" name="unit" ${ro ? "disabled" : ""}>${["bouteille", "canette", "verre", "portion", "unité", "carton"].map((u) => `<option ${p && p.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select></div>
      <div class="field"><label for="pn10">Photo (facultative)</label><label class="file"><input type="file" name="photo" id="pn10" accept="image/*" ${ro ? "disabled" : ""} data-file>Choisir un fichier<span class="fn">Aucun fichier choisi</span></label></div>
    </div>
    ${p ? `<div class="row"><span>Stock actuel</span><b class="num">${nb(p.stock)} ${esc(p.unit)}</b></div><div class="small">Le stock ne se modifie pas ici : passez par une réception, une sortie, un inventaire ou une perte, pour garder une trace.</div>` : `<div class="small">Le stock démarre à 0 et augmente avec les réceptions.</div>`}
    ${ro ? "" : `<div class="acts"><button class="btn b-amb">${p ? "Enregistrer" : "Ajouter le produit"}</button>${p ? `<button type="button" class="btn b-crit" data-a="archive" data-id="${p.id}">${p.active ? "Archiver" : "Réactiver"}</button>` : ""}</div>`}</form>`; },
  stockmove: () => { const d = db(); return `${sh("Mouvement de stock", "Chaque mouvement est historisé.")}<form novalidate data-f="stockmove" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="sm1">Type</label><select class="inp" id="sm1" name="t"><option>Réception hors commande</option><option>Sortie</option>${d.settings.transfer && S.bars.length > 1 ? "<option>Transfert vers un autre bar</option>" : ""}</select></div><div class="field"><label for="sm2">Produit</label><select class="inp" id="sm2" name="p">${d.products.filter((p) => p.active).map((p) => `<option value="${p.id}">${esc(p.name)} (stock ${p.stock})</option>`).join("")}</select></div><div class="field"><label for="sm3">Quantité</label><input class="inp num" id="sm3" name="q" type="number" min="1" required></div>${S.bars.length > 1 ? `<div class="field"><label for="sm5">Bar destinataire (transfert)</label><select class="inp" id="sm5" name="to">${S.bars.filter((b) => b.id !== UI.bar).map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("")}</select></div>` : ""}<div class="field"><label for="sm4">Motif</label><input class="inp" id="sm4" name="m" required></div><button class="btn b-amb">Enregistrer</button></form>`; },
  assign: () => { const d = db(); return `${sh("Attribuer du stock", "Exemple : 24 bouteilles confiées à un barman pour le service.")}<form novalidate data-f="assign" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="as1">Employé ou équipe</label><select class="inp" id="as1" name="e">${S.employees.filter((e) => e.bars.includes(UI.bar) && e.status === "actif").map((e) => `<option value="${e.id}">${esc(e.name)} · ${esc(e.func)}</option>`).join("")}</select></div><div class="field"><label for="as2">Produit</label><select class="inp" id="as2" name="p">${d.products.filter((p) => p.active && p.stock > 0).map((p) => `<option value="${p.id}">${esc(p.name)} (stock ${p.stock})</option>`).join("")}</select></div><div class="field"><label for="as3">Quantité attribuée</label><input class="inp num" id="as3" name="q" type="number" min="1" value="24" required></div><button class="btn b-amb">Attribuer</button></form>`; },
  control: (x) => { const d = db(); const a = d.assigns.find((y) => y.id === x.id); const c = assignCalc(d, a); return `${sh("Contrôle physique", esc(a.empName) + " · " + esc(a.name))}<div class="card"><div class="row"><span>Stock théorique restant</span><b class="num">${c.theo}</b></div><div class="small">${a.qty} attribués − ${c.sold} vendus − ${c.losses} pertes − ${c.offered} offerts + ${a.transfersIn || 0} reçus</div></div><form novalidate data-f="control" data-id="${a.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="ct1">Quantité réellement comptée</label><input class="inp num" id="ct1" name="c" type="number" min="0" required autofocus></div><div class="field"><label for="ct2">Commentaire</label><input class="inp" id="ct2" name="m" placeholder="Contrôle de fin de service"></div><button class="btn b-amb">Enregistrer le contrôle</button></form>`; },
  ctrl: (x) => { const c = db().controls.find((y) => y.id === x.id); return `${sh("Contrôle du " + dt(c.at), esc(c.empName) + " · " + esc(c.name))}<div class="card"><div class="row"><span>Stock théorique</span><b class="num">${c.theo}</b></div><div class="row"><span>Stock réel compté</span><b class="num">${c.counted}</b></div><div class="row"><span>Écart</span><b class="num ${c.ecart < 0 ? "down" : ""}">${c.ecart}</b></div><div class="row"><span>Valeur estimée de l'écart</span><b class="num">${sFk(c.value)}</b></div><div class="row"><span>Contrôlé par</span><b>${esc(c.by)}</b></div></div><form novalidate data-f="ctrlnote" data-id="${c.id}" style="display:flex;flex-direction:column;gap:10px"><div class="field"><label for="cn">Commentaire d'examen</label><textarea class="inp" id="cn" name="m">${esc(c.comment)}</textarea></div><div class="field"><label for="cs">Statut</label><select class="inp" id="cs" name="s"><option ${c.status === "à examiner" ? "selected" : ""}>à examiner</option><option ${c.status === "expliqué" ? "selected" : ""}>expliqué</option><option ${c.status === "clos" ? "selected" : ""}>clos</option></select></div><button class="btn b-amb">Enregistrer</button></form><div class="small">Un écart aide à organiser une vérification. Il ne prouve pas un vol.</div>`; },
  loss: () => { const d = db(); return `${sh("Déclarer une sortie", "Perte, casse, produit offert ou consommation du personnel.")}<form novalidate data-f="loss" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="ls1">Produit</label><select class="inp" id="ls1" name="p">${d.products.filter((p) => p.active && p.stock > 0).map((p) => `<option value="${p.id}">${esc(p.name)} (stock ${p.stock})</option>`).join("")}</select></div><div class="field"><label for="ls2">Quantité</label><input class="inp num" id="ls2" name="q" type="number" min="1" value="1" required></div><div class="field"><label for="ls3">Motif</label><select class="inp" id="ls3" name="t">${LOSS_TYPES.map((t) => `<option>${t}</option>`).join("")}</select></div><div class="field"><label for="ls4">Commentaire</label><input class="inp" id="ls4" name="c"></div><div class="small">Approbation requise pour les produits offerts${d.settings.offertApproval ? "" : " (désactivée)"} et toute sortie de ${F(d.settings.lossApproval)} ou plus.</div><button class="btn b-amb">Déclarer</button></form>`; },
  supplier: (x) => { const s = x.id ? sup(x.id) : {}; return `${sh(x.id ? "Modifier le fournisseur" : "Ajouter un fournisseur")}<form novalidate data-f="supplier" data-id="${x.id || ""}" style="display:flex;flex-direction:column;gap:12px"><div class="fgrid">${[["name", "Nom *", "text"], ["phone", "Téléphone", "tel"], ["email", "E-mail", "email"], ["address", "Adresse", "text"], ["contact", "Personne à contacter", "text"]].map(([k, l, t]) => `<div class="field"><label for="sp${k}">${l}</label><input class="inp" id="sp${k}" name="${k}" type="${t}" value="${esc(s[k] || "")}" ${k === "name" ? "required autofocus" : ""}></div>`).join("")}</div><div class="field"><label for="spc">Commentaires</label><textarea class="inp" id="spc" name="comment">${esc(s.comment || "")}</textarea></div><button class="btn b-amb">Enregistrer</button></form>`; },
  order: () => { const d = db(); return `${sh("Nouvelle commande d'achat", "Le stock n'augmente qu'à la réception.")}<form novalidate data-f="order" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="od1">Fournisseur</label><select class="inp" id="od1" name="s">${d.suppliers.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div>${[0, 1, 2].map((i) => `<div class="fgrid"><div class="field"><label for="op${i}">Produit ${i + 1}${i ? " (facultatif)" : ""}</label><select class="inp" id="op${i}" name="p${i}">${i ? '<option value="">—</option>' : ""}${d.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div><div class="field"><label for="oq${i}">Quantité</label><input class="inp num" id="oq${i}" name="q${i}" type="number" min="0" ${i ? "" : 'value="24" required'}></div><div class="field"><label for="ou${i}">Prix unitaire</label><input class="inp num" id="ou${i}" name="u${i}" type="number" min="0" placeholder="prix d'achat"></div></div>`).join("")}<div class="fgrid"><div class="field"><label for="od2">Remise (FCFA)</label><input class="inp num" id="od2" name="disc" type="number" min="0" value="0"></div><div class="field"><label for="od3">Montant payé maintenant</label><input class="inp num" id="od3" name="paid" type="number" min="0" value="0"></div></div><button class="btn b-amb">Enregistrer la commande</button></form>`; },
  orderdoc: (x) => { const d = db(); const o = d.orders.find((y) => y.id === x.id); const b = bar(); return `${sh("Commande " + o.num, esc(sup(o.supplierId).name))}<div class="doc"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b style="font-size:15px">${esc(b.name)}</b><br>${esc(b.address)}<br>Tél. ${esc(b.phone)}</div><div style="text-align:right"><b>BON DE COMMANDE</b><br>N° ${o.num}<br>Date : ${dFR(o.at)}<br>Statut : ${esc(o.status)}</div></div><hr style="border:0;border-top:1px solid #DDD3C6;margin:10px 0"><div>Fournisseur : <b>${esc(sup(o.supplierId).name)}</b></div><div style="overflow-x:auto;margin-top:8px"><table><thead><tr><th>Produit</th><th class="r">Qté</th><th class="r">Reçu</th><th class="r">Prix unitaire</th><th class="r">Montant</th></tr></thead><tbody>${o.lines.map((l) => `<tr><td>${esc(prod(l.pid).name)}</td><td class="r">${l.qty}</td><td class="r">${l.received}</td><td class="r">${F(l.price)}</td><td class="r">${F(l.qty * l.price)}</td></tr>`).join("")}</tbody></table></div><div style="text-align:right;margin-top:8px">Remise : ${F(o.discount)}<br><b>Total : ${F(o.total)}</b><br>Payé : ${F(o.paid)}<br><b>Solde restant : ${F(o.total - o.paid)}</b></div></div>
    <div class="acts">${o.status !== "reçue" && o.status !== "annulée" ? `<button class="btn b-amb" data-a="sheet" data-s="receive" data-id="${o.id}">Réceptionner</button>` : ""}${o.total > o.paid ? `<button class="btn b-sec" data-a="sheet" data-s="paysup" data-id="${o.id}">Enregistrer un paiement</button>` : ""}</div>`; },
  receive: (x) => { const o = db().orders.find((y) => y.id === x.id); return `${sh("Réception " + o.num, "Indiquez les quantités acceptées (produits conformes).")}<form novalidate data-f="receive" data-id="${o.id}" style="display:flex;flex-direction:column;gap:12px">${o.lines.map((l, i) => `<div class="field"><label for="rq${i}">${esc(prod(l.pid).name)} · commandé ${l.qty}, déjà reçu ${l.received}</label><input class="inp num" id="rq${i}" name="q${i}" type="number" min="0" max="${l.qty - l.received}" value="${l.qty - l.received}"></div>`).join("")}<button class="btn b-amb">Valider la réception</button></form>`; },
  paysup: (x) => { const o = db().orders.find((y) => y.id === x.id); return `${sh("Paiement fournisseur", o.num + " · solde " + F(o.total - o.paid))}<form novalidate data-f="paysup" data-id="${o.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="ps1">Montant (FCFA)</label><input class="inp num" id="ps1" name="a" type="number" min="1" max="${o.total - o.paid}" value="${o.total - o.paid}" required></div><div class="field"><label for="ps2">Moyen</label><select class="inp" id="ps2" name="m">${MODES.filter(([k]) => k !== "credit").map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div><button class="btn b-amb">Enregistrer le paiement</button></form>`; },
  expense: (x) => { const e = x.id ? db().expenses.find((y) => y.id === x.id) : null; return `${sh(e ? "Modifier la dépense" : "Ajouter une dépense", e ? "La modification est tracée." : "Au-delà de " + F(db().settings.expApproval) + ", une approbation est demandée.")}<form novalidate data-f="expense" data-id="${e ? e.id : ""}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="ex1">Libellé *</label><input class="inp" id="ex1" name="label" value="${esc(e ? e.label : "")}" required autofocus></div><div class="fgrid"><div class="field"><label for="ex2">Catégorie</label><select class="inp" id="ex2" name="cat">${EXP_CATS.map((c) => `<option ${e && e.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div><div class="field"><label for="ex3">Montant (FCFA) *</label><input class="inp num" id="ex3" name="amount" type="number" min="1" value="${e ? e.amount : ""}" required></div><div class="field"><label for="ex4">Date</label><input class="inp" id="ex4" name="date" type="date" value="${new Date(e ? e.at : Date.now()).toISOString().slice(0, 10)}"></div><div class="field"><label for="ex5">Moyen de paiement</label><select class="inp" id="ex5" name="mode">${MODES.filter(([k]) => k !== "credit").map(([k, l]) => `<option value="${k}" ${e && e.mode === k ? "selected" : ""}>${l}</option>`).join("")}</select></div></div><div class="field"><label for="ex6">Justificatif (facultatif)</label><label class="file"><input type="file" name="proof" id="ex6" accept="image/*,application/pdf" data-file>Choisir un fichier<span class="fn">Aucun fichier choisi</span></label></div><div class="field"><label for="ex7">Commentaire</label><input class="inp" id="ex7" name="comment" value="${esc(e ? e.comment : "")}"></div>${e ? `<div class="field"><label for="ex8">Motif de la modification *</label><input class="inp" id="ex8" name="why" required></div>` : ""}<button class="btn b-amb">${e ? "Enregistrer" : "Ajouter"}</button></form>`; },
  notif: (x) => { const n = S.dbs[x.b].notifs.find((y) => y.id === x.id); return `${sh(esc(n.title), esc(n.bar) + " · " + esc(n.cat) + " · " + dt(n.at))}<div class="card"><div class="row"><span>Priorité</span><span class="tag ${n.prio === "haute" ? "t-crit" : n.prio === "moyenne" ? "t-warn" : "t-info"}">${n.prio}</span></div><div style="margin-top:8px">${esc(n.desc)}</div></div><div class="note"><b>Action recommandée :</b> ${esc(n.action)}</div><div class="acts"><button class="btn b-amb" data-a="close">Compris</button></div>`; },
  pdf: () => { const r = reportData(UI.rep); const b = r.bars.length === 1 ? r.bars[0] : null; const per = 18; const pages = Math.max(1, Math.ceil(r.rows.length / per)); return `${sh("Aperçu PDF", "Mise en page A4 du rapport (export PDF par jsPDF dans GestiOne).")}${[...Array(Math.min(pages, 3))].map((_, pi) => `<div class="doc" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b style="font-size:15px">${b ? esc(b.name) : "Groupe de " + esc(bar().owner || "l'administrateur")}</b><br>${b ? esc(b.address) : "Rapport consolidé : " + r.bars.map((x) => esc(x.name)).join(", ")}</div><div style="text-align:right"><b>${esc(REPORTS.find((x) => x[0] === UI.rep)[1].toUpperCase())}</b><br>Période : ${esc(r.label)}<br>Généré le ${dt(Date.now())}</div></div><div style="overflow-x:auto"><table><thead><tr>${r.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${r.rows.slice(pi * per, pi * per + per).map((row) => `<tr>${row.map((v, i) => `<td class="${typeof v === "number" ? "r" : ""}">${typeof v === "number" ? (r.money.has(r.cols[i]) ? F(v) : nb(v)) : esc(v)}</td>`).join("")}</tr>`).join("")}${pi === pages - 1 && r.totals ? `<tr>${r.cols.map((c, i) => `<td class="r" style="font-weight:800">${i === 0 ? "Total" : r.totals[i] != null ? (r.money.has(c) ? F(r.totals[i]) : nb(r.totals[i])) : ""}</td>`).join("")}</tr>` : ""}</tbody></table></div><div style="display:flex;justify-content:space-between;border-top:1px solid #DDD3C6;padding-top:6px;font-size:11px;color:#6A5E50"><span>Bar Manager Pro · GestiOne · montants en FCFA</span><span>Page ${pi + 1} / ${pages}</span></div></div>`).join("")}${pages > 3 ? `<div class="small">${pages - 3} page(s) supplémentaire(s) dans le PDF complet.</div>` : ""}`; },
  copytext: (x) => `${sh(x.title, x.sub)}<textarea class="inp" id="cpt" readonly style="min-height:200px;font-family:ui-monospace,monospace;font-size:11.5px">${esc(x.text)}</textarea><button class="btn b-amb" data-a="copy">Copier</button>`,
};

/* ============================== Actions ============================== */
function addCart(pid) { const p = prod(pid); if (p.stock <= 0) return toast(p.name + " est en rupture de stock.", "err"); const l = UI.cart.lines.find((x) => x.pid === pid); const q = (l ? l.qty : 0) + 1; if (q > p.stock) return toast("Stock insuffisant : " + p.stock + " disponible(s).", "err"); if (l) l.qty = q; else UI.cart.lines.push({ pid, name: p.name, cat: p.cat, qty: 1, price: p.price, cost: p.buy }); render(); }
function finalize() {
  if (UI.busy) return; if (expired(bar())) { UI.pay.err = "Licence expirée : les ventes sont bloquées."; return drawLayer(); } const d = db(); const c = UI.cart; const p = UI.pay; const total = Math.max(0, c.lines.reduce((a, l) => a + l.qty * l.price, 0) - c.discount);
  const sess = d.sessions.find((s) => !s.closedAt && s.by === me().id);
  if (p.mode === "especes" && !sess) { p.err = "Ouvrez votre caisse avant d'encaisser des espèces."; return drawLayer(); }
  if (p.mode === "especes" && p.recv !== "" && Number(p.recv) < total) { p.err = "Le montant reçu est inférieur au total."; return drawLayer(); }
  if (p.mode === "credit" && !p.client.trim()) { p.err = "Indiquez le nom du client pour une vente à crédit."; return drawLayer(); }
  for (const l of c.lines) { if (prod(l.pid).stock < l.qty) { p.err = "Stock insuffisant pour " + l.name + "."; return drawLayer(); } }
  if (d.sales.some((s) => s.id === p.opId)) return; // identifiant fixé à l'ouverture : pas de double vente
  UI.busy = true; drawLayer();
  setTimeout(() => {
    const s = { id: p.opId, num: saleNum(), at: Date.now(), by: me().id, byName: me().name, lines: c.lines.map((l) => ({ ...l })), discount: c.discount, total, mode: p.mode, op: p.mode === "momo" ? p.op : "", status: p.mode === "credit" ? "credit" : "payee", client: p.client.trim(), register: sess ? sess.register : "", sessionId: sess ? sess.id : null, ref: p.ref };
    if (p.mode === "especes" && Number(p.recv) > total) s.received = Number(p.recv);
    d.sales.push(s); s.lines.forEach((l) => { const pr = prod(l.pid); pr.stock -= l.qty; if (pr.stock <= 0) notifPush(d, bar().name, "Stock", "haute", "Produit en rupture", `${pr.name} est en rupture de stock.`, "Passer une commande fournisseur."); else if (pr.stock <= pr.min && pr.stock + l.qty > pr.min) notifPush(d, bar().name, "Stock", "moyenne", "Stock inférieur au seuil", `${pr.name} : ${pr.stock} restant(s), seuil ${pr.min}.`, "Prévoir un réapprovisionnement."); });
    audit("Création d'une vente", s.num, { after: F(total) + " · " + modeL(s.mode, s.op), say: `Vente enregistrée : ${F(total)}, ${modeL(s.mode, s.op).toLowerCase()}.${s.received ? ` Monnaie à rendre : ${F(s.received - total)}.` : ""}${s.mode === "credit" ? ` À crédit pour ${s.client}.` : ""}` });
    if (c.discount) { audit("Remise accordée", s.num, { after: F(c.discount), motif: c.discountWhy || "" }); if (c.discount > total * 0.2) notifPush(d, bar().name, "Ventes", "moyenne", "Remise inhabituelle", `${me().name} a accordé ${F(c.discount)} sur ${s.num}.`, "Vérifier le motif de la remise."); }
    UI.cart = { lines: [], discount: 0 }; UI.busy = false; UI.pay = null; S.lastRefresh = Date.now(); save();
    UI.sheet = { type: "sale", id: s.id }; render(); toast("Vente " + s.num + " enregistrée."); if (prn().auto) printSale(s.id, { auto: true });
  }, 450);
}
function copyText(t) { const fb = () => { const el = $("#cpt"); if (el) { el.focus(); el.select(); } toast("Sélectionnez le texte puis copiez-le.", "warn"); }; try { navigator.clipboard.writeText(t).then(() => toast("Copié dans le presse-papiers."), fb); } catch (e) { fb(); } }

const ACT = {
  printsale: (x) => { if (!can("ventes") && !can("pos")) return deny("imprimer un reçu"); printSale(x.id, { paper: x.p }); },
  sharesale: (x) => { const s = db().sales.find((y) => y.id === x.id); if (!s) return; const t = receiptText(s, bar()); if (H.share && (isNativeApp() || (typeof navigator !== "undefined" && navigator.share))) Promise.resolve(H.share("Reçu " + s.num, t)).catch(() => {}); else { UI.sheet = { type: "copytext", title: "Reçu " + s.num, sub: "Texte à partager", text: t }; drawLayer(); } },
  prntest: () => { const p = prn(); const s = { id: "test", num: "TEST-" + hm(Date.now()).replace(":", ""), at: Date.now(), byName: me().name, register: "Test", lines: [{ name: "Article de test", qty: 2, price: 1500 }, { name: "Boisson fraîche", qty: 1, price: 1000 }], discount: 0, total: 4000, mode: "especes", op: "", status: "payee", received: 5000 }; outputSale(s, false, p.paper, 1).then(() => toast("Ticket de test envoyé.")).catch((e) => toast((e && e.message) || "Impression impossible.", "err")); },
  vexport: () => { const list = salesFiltered(); if (!list.length) return; const name = "ventes-" + bar().name.replace(/[^\w]+/g, "-").toLowerCase() + "-" + dS(Date.now()).replace(/\//g, "-") + ".csv"; audit("Export de l'historique des ventes", list.length + " ventes"); save(); if (H.exportCsv) Promise.resolve(H.exportCsv(name, journalCsv(list))).then(() => toast("Fichier exporté : " + list.length + " vente(s).")).catch(() => toast("Export impossible.", "err")); else { UI.sheet = { type: "copytext", title: "Export CSV", sub: list.length + " ventes", text: journalCsv(list) }; drawLayer(); } },
  vprint: () => { const list = salesFiltered(); if (!list.length) return; const label = range()[2]; audit("Impression du journal des ventes", list.length + " ventes"); save(); (isNativeApp() && H.pdf ? journalPdf(list, label) : printHtml(journalDoc(list, label))).catch((e) => toast((e && e.message) || "Impression impossible.", "err")); },
  vftog: () => { UI.vfopen = !UI.vfopen; render(); },
  vmore: () => { UI.vlim = (UI.vlim || 30) + 30; render(); },
  vreset: () => { ["q", "emp", "mode", "prod", "st", "reg", "sort"].forEach((k) => delete UI.flt[k]); UI.vlim = 30; render(); },
  voicetog: () => { const v = voicePrefs(); v.on = !v.on; setVoicePrefs(v); render(); if (v.on && H.speak) H.speak("Annonces vocales activées."); },
  voicecat: (x) => { const v = voicePrefs(); if (!v.on) return; v.cats[x.k] = v.cats[x.k] === false; setVoicePrefs(v); render(); },
  voicetest: () => { if (H.speak) H.speak(spoken("Vente enregistrée : 4 500 FCFA, espèces. Monnaie à rendre : 500 FCFA.")); },
  logout: () => { audit("Déconnexion", me().name); save(); if (H.onLogout) H.onLogout(); },
  openbar: (x) => { UI.sheet = null; if (!x.id || x.id === H.shop.id) { UI.view = can("dashboard") ? "dashboard" : "pos"; return render(); } if (role() !== "proprietaire") return deny("ouvrir un autre établissement"); save(); if (H.onSwitchShop) H.onSwitchShop(x.id); },
  addbar: () => { if (role() !== "proprietaire") return deny("ajouter un établissement"); UI.sheet = null; save(); if (H.onAddShop) H.onAddShop(); },
  refresh: () => { if (H.sync && H.sync.onSyncNow) H.sync.onSyncNow(); },
  emptoggle: (x) => { if (!need("employes", "gérer le personnel")) return; const list = (H.vendors || []).map((v) => (v.id === x.id ? { ...v, blocked: !v.blocked } : v)); const v = list.find((y) => y.id === x.id); audit("Modification des droits d'accès", v.name, { after: v.blocked ? "désactivé" : "actif" }); save(); UI.sheet = null; H.staffApi.saveVendors(list); toast(v.blocked ? `${v.name} ne peut plus se connecter.` : `${v.name} peut de nouveau se connecter.`); },
  backup: () => { if (!need("sauvegarde", "créer un point de restauration")) return; const d = db(); const snap = JSON.stringify(Object.fromEntries(Object.keys(KEYS).map((k) => [k, d[k]]).concat([["settings", d.settings]]))); const bk = { id: uid("b"), at: Date.now(), size: (snap.length / 1048576).toFixed(2).replace(".", ",") + " Mo" }; SNAPS[bk.id] = snap; d.backups.push(bk); audit("Point de restauration", bar().name); save(); render(); toast("Point de restauration créé."); },
  exportAll: () => { const d = db(); const data = Object.fromEntries(Object.keys(KEYS).map((k) => [k, d[k]]).concat([["settings", d.settings]])); UI.sheet = { type: "copytext", title: "Export des données", sub: esc(bar().name) + " · format JSON", text: JSON.stringify({ app: "GestiOne", module: "Bar Manager", shop: bar().name, at: new Date().toISOString(), data }) }; drawLayer(); },
  importCatalog: () => { if (!need("stock_edit", "créer des produits")) return; const d = db(); let n = 0; CATALOG.forEach((c, i) => { if (d.products.some((p) => p.name.toLowerCase() === c[0].toLowerCase())) return; d.products.push({ id: uid("p"), name: c[0], ref: "REF-" + String(100 + d.products.length), barcode: "", cat: c[1], supplierId: "", buy: c[2], price: c[3], stock: 0, min: c[1] === "Bières" ? 24 : 6, unit: c[4], active: true, photo: null }); n++; }); audit("Import du catalogue type", n + " produits"); save(); render(); toast(`${n} produits ajoutés. Ajustez les prix, puis enregistrez vos premières réceptions.`); },
  go: (x) => { if (x.v === "menu") { UI.view = "menu"; render(); window.scrollTo(0, 0); return; } const n = navItem(x.v); if (n && n[3] && !can(n[3])) return deny("ouvrir « " + n[1] + " »"); UI.view = x.v; UI.sheet = null; window.scrollTo(0, 0); render(); },
  sheet: (x) => { if (x.s === "notif") { const n = S.dbs[x.b].notifs.find((y) => y.id === x.id); if (n) { n.read = true; save(); render(); } } const gate = { opencash: ["caisse", "ouvrir une caisse"], closecash: ["caisse", "fermer une caisse"], product: ["stock", "voir les produits"], stockmove: ["stock_edit", "modifier le stock"], assign: ["attrib", "attribuer du stock"], control: ["attrib", "contrôler le stock"], loss: ["pertes", "déclarer une perte"], supplier: ["achats", "gérer les fournisseurs"], order: ["achats", "créer une commande"], receive: ["stock_edit", "réceptionner une commande"], paysup: ["achats", "payer un fournisseur"], expense: [x.id ? "depenses_ok" : "depenses", x.id ? "modifier une dépense" : "saisir une dépense"], employee: ["employes", "gérer les employés"], pdf: ["rapports", "générer un rapport"], restore: ["sauvegarde", "restaurer une sauvegarde"], delbar: ["groupe", "supprimer un établissement"] }[x.s]; if (gate && !need(gate[0], gate[1])) return; UI.sheet = { type: x.s, id: x.id, b: x.b, wide: ["pdf", "orderdoc", "employee", "closecash", "product", "compare", "session"].includes(x.s) }; UI.errs = {}; drawLayer(); },
  theme: () => { MODE = MODE === "nuit" ? "clair" : "nuit"; applyMode(MODE); try { localStorage.setItem("bmp-mode", MODE); } catch (e) { /* ignore */ } render(); },
  close: () => { UI.sheet = null; UI.busy = false; render(); },
  ovclose: (x, e) => { if (e.target.classList.contains("ov") && !UI.busy && !(UI.create && UI.create.state === "run")) { UI.sheet = null; render(); } },
  period: (x) => { UI.period = x.p; if (x.p === "perso" && !UI.from) { const t = new Date(); UI.to = t.toISOString().slice(0, 10); t.setDate(t.getDate() - 13); UI.from = t.toISOString().slice(0, 10); } render(); },
  chart: (x) => { UI.chart = x.c; render(); },
  gfilter: () => { UI.groupFilter = "tous"; UI.groupSel = []; render(); },
  gsel: (x) => { if (UI.groupFilter === "tous") { UI.groupFilter = "sel"; UI.groupSel = [x.id]; } else { UI.groupSel = UI.groupSel.includes(x.id) ? UI.groupSel.filter((y) => y !== x.id) : [...UI.groupSel, x.id]; if (!UI.groupSel.length) UI.groupFilter = "tous"; } render(); },
  editbar: () => { UI.view = "editbar"; UI.errs = {}; render(); },
  pcat: (x) => { UI.flt.pcat = x.c; render(); },
  add: (x) => addCart(x.id),
  qty: (x) => { const l = UI.cart.lines[x.i]; const n = l.qty + Number(x.d); if (n <= 0) UI.cart.lines.splice(Number(x.i), 1); else if (n > prod(l.pid).stock) return toast("Stock insuffisant.", "err"); else l.qty = n; render(); },
  clearcart: () => { UI.cart = { lines: [], discount: 0 }; UI.sheet = null; render(); },
  remise: () => { if (!need("remise", "accorder une remise")) return; UI.sheet = { type: "remise" }; drawLayer(); },
  pay: () => { if (!UI.cart.lines.length) return; UI.pay = { mode: "especes", recv: "", op: "Wave", client: "", ref: "", err: "", opId: uid("v") }; UI.sheet = { type: "pay" }; drawLayer(); },
  pmode: (x) => { UI.pay.mode = x.m; UI.pay.err = ""; drawLayer(); },
  pop: (x) => { UI.pay.op = x.o; drawLayer(); },
  finalize: () => finalize(),
  tocart: () => { const el = $("#cartp"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); },
  copyrc: (x) => { const s = db().sales.find((y) => y.id === x.id); const b = bar(); copyText(`${b.name}\n${b.address} · Tél. ${b.phone}\nReçu ${s.num} · ${dt(s.at)} · ${s.byName}\n` + s.lines.map((l) => `${l.qty} x ${l.name} : ${F(l.qty * l.price)}`).join("\n") + (s.discount ? `\nRemise : -${F(s.discount)}` : "") + `\nTOTAL : ${F(s.total)}\nPaiement : ${modeL(s.mode, s.op)}\n${db().settings.thanks}`); },
  cancelsale: (x) => { if (!need("annuler", "annuler une vente")) return; UI.sheet = { type: "cancelsale", id: x.id }; drawLayer(); },
  validate: (x) => { const s = db().sessions.find((y) => y.id === x.id); s.validatedBy = me().name; s.locked = true; audit("Validation d'une fermeture de caisse", s.register + " · " + dt(s.closedAt), { after: "Verrouillée" }); save(); drawLayer(); render(); },
  toggleArch: () => { UI.flt.arch = !UI.flt.arch; render(); },
  archive: (x) => { const p = prod(x.id); p.active = !p.active; audit(p.active ? "Produit réactivé" : "Produit archivé", p.name); UI.sheet = null; save(); render(); },
  invstart: () => { UI.inv = true; render(); },
  invcancel: () => { UI.inv = false; render(); },
  transfer: (x) => { const a = db().assigns.find((y) => y.id === x.id); a.transfersIn = (a.transfersIn || 0) + 6; audit("Transfert reçu", a.empName + " · " + a.name, { after: "+6" }); save(); render(); toast("Transfert de 6 enregistré pour " + a.empName + "."); },
  lossok: (x) => { if (!need("pertes_ok", "approuver une sortie")) return; const d = db(); const l = d.losses.find((y) => y.id === x.id); const p = prod(l.pid); if (p.stock < l.qty) return toast("Stock insuffisant pour approuver.", "err"); l.status = "approuvée"; l.approvedBy = me().name; p.stock -= l.qty; d.moves.push({ id: uid("m"), at: Date.now(), pid: p.id, name: p.name, delta: -l.qty, type: l.type, ref: "Approuvé par " + me().name, by: l.by }); audit("Validation d'une perte", p.name + " × " + l.qty, { motif: l.type }); save(); render(); },
  lossko: (x) => { if (!need("pertes_ok", "refuser une sortie")) return; const l = db().losses.find((y) => y.id === x.id); l.status = "refusée"; l.approvedBy = me().name; audit("Sortie refusée", l.name + " × " + l.qty, { motif: l.type }); save(); render(); },
  supOrders: (x) => { UI.flt.sup = x.id; UI.view = "commandes"; render(); },
  dcat: (x) => { UI.flt.dcat = x.c; render(); },
  expok: (x) => { const e = db().expenses.find((y) => y.id === x.id); e.status = "approuvée"; e.approvedBy = me().name; audit("Approbation d'une dépense", e.label, { after: F(e.amount) }); save(); render(); },
  expko: (x) => { const e = db().expenses.find((y) => y.id === x.id); e.status = "refusée"; e.approvedBy = me().name; audit("Refus d'une dépense", e.label, { after: F(e.amount) }); save(); render(); },
  exportExp: () => { const [a, z, label] = range(); const rows = db().expenses.filter((e) => e.at >= a && e.at < z).map((e) => [dFR(e.at), e.label, e.cat, modeL(e.mode), e.by, e.status, e.amount].join(";")); UI.sheet = { type: "copytext", title: "Export des dépenses", sub: label + " · CSV (point-virgule)", text: ["Date;Libellé;Catégorie;Paiement;Saisi par;Statut;Montant FCFA", ...rows].join("\n") }; drawLayer(); },
  att: (x) => { const d = db(); const t0 = sod(); let r = d.attendance.find((y) => y.empId === x.id && y.day === t0); const e = S.employees.find((y) => y.id === x.id); if (!r) { r = { id: uid("p"), empId: e.id, name: e.name, day: t0, in: null, out: null, status: "présent" }; d.attendance.push(r); } if (x.k === "in") { r.in = Date.now(); r.status = new Date().getHours() >= (bar().id === "bar2" ? 22 : 17) && new Date().getMinutes() > 15 ? "retard" : "présent"; } if (x.k === "out") r.out = Date.now(); if (x.k === "abs") r.status = "absent"; save(); render(); },
  readall: () => { (UI.bar ? [bar()] : myBars()).forEach((b) => S.dbs[b.id].notifs.forEach((n) => (n.read = true))); save(); render(); },
  nf: (x) => { UI.notifF[x.k] = x.v; render(); },
  tmode: (x) => { const s = db().settings; s.modes[x.k] = !s.modes[x.k]; audit("Modification des paramètres", "Moyen de paiement " + modeL(x.k), { after: s.modes[x.k] ? "activé" : "désactivé" }); save(); render(); },
  tfeat: (x) => { const s = db().settings; s.features[x.k] = !s.features[x.k]; audit("Modification des paramètres", "Fonctionnalité " + x.k, { after: s.features[x.k] ? "activée" : "désactivée" }); save(); render(); },
  repexp: (x) => { const r = reportData(UI.rep); const sep = x.t === "csv" ? ";" : "\t"; const t = [r.cols.join(sep), ...r.rows.map((row) => row.map((v) => (typeof v === "number" ? v : String(v).includes(sep) ? `"${v}"` : v)).join(sep))].join("\n"); UI.sheet = { type: "copytext", title: x.t === "csv" ? "Export CSV" : "Export Excel", sub: r.label + (x.t === "csv" ? " · séparateur point-virgule" : " · à coller directement dans Excel"), text: t }; drawLayer(); },
  copy: () => copyText($("#cpt").value),
};

const FORMS = {
  activate: (f) => { const code = f.code.value.replace(/\D/g, ""); UI.form = { code: f.code.value }; if (code.length !== 12) { UI.errs = { act: "Le code contient 12 chiffres." }; return render(); } if (!H.onActivateLicense) return; UI.busy = true; UI.errs = {}; render(); Promise.resolve(H.onActivateLicense(code)).then((ok) => { UI.busy = false; if (ok) { UI.form = {}; audit("Activation de licence", bar().name); save(); } else UI.errs = { act: "Code refusé. Vérifiez-le ou contactez le service GestiOne." }; render(); }).catch(() => { UI.busy = false; UI.errs = { act: "Activation impossible pour le moment. Vérifiez la connexion internet." }; render(); }); },
  liborder: (f) => { const p = PLANS().find((x) => x.id === f.dataset.id); if (!/^[\d\s+]{8,}$/.test(f.t.value.trim())) return toast("Numéro de téléphone invalide.", "err"); const text = `Bonjour, je souhaite commander la licence ${p.name} (${p.duration}) pour l'établissement « ${bar().name} » (Bar Manager). Nom : ${f.n.value.trim()}. Téléphone : ${f.t.value.trim()}.`; audit("Demande de licence", p.name + " · " + p.duration, { after: f.n.value + " · " + f.t.value }); save(); UI.sheet = null; render(); if (H.onOrderLicense) H.onOrderLicense(text, { name: f.n.value.trim(), phone: f.t.value.trim() }); toast("Demande prête dans la messagerie GestiOne : envoyez-la pour être recontacté."); },
  employee: (f) => {
    const v = Object.fromEntries(new FormData(f)); const id = f.dataset.id || null; const pin = (v.pin || "").trim(); const vendors = H.vendors || [];
    if (!v.name.trim()) return toast("Le nom est obligatoire.", "err");
    if ((!id || pin) && !/^\d{4}$/.test(pin)) return toast("Le code PIN contient exactement 4 chiffres.", "err");
    if (pin && H.staffApi.isPinTaken && H.staffApi.isPinTaken(pin, id)) return toast("Ce code PIN est déjà utilisé. Choisissez-en un autre.", "err");
    if (vendors.some((x) => x.id !== id && (x.name || "").trim().toLowerCase() === v.name.trim().toLowerCase())) return toast("Un employé porte déjà ce nom.", "err");
    const initial = id ? vendors.find((x) => x.id === id) : null;
    const rec = H.staffApi.buildVendor({ name: v.name.trim(), pin, phone: v.phone, barRole: v.role, barFunc: v.func.trim(), initial });
    const list = initial ? vendors.map((x) => (x.id === id ? rec : x)) : [...vendors, rec];
    audit(initial ? "Modification des droits d'accès" : "Création d'un utilisateur", rec.name, { after: ROLES[v.role] }); save();
    UI.sheet = null; H.staffApi.saveVendors(list);
    toast(initial ? "Employé mis à jour." : `Compte créé pour ${rec.name}${rec.joinCode ? ` · code d'invitation ${rec.joinCode}` : ""}.`);
  },
  restore: (f) => { Promise.resolve(H.verifyOwnerPin ? H.verifyOwnerPin(f.pw.value) : false).then((ok) => { if (!ok) return toast("Code administrateur incorrect.", "err"); const snap = JSON.parse(SNAPS[f.dataset.id]); const d = db(); Object.keys(KEYS).forEach((k) => { d[k] = snap[k] || []; }); d.settings = snap.settings || d.settings; audit("Restauration", "Point de restauration du " + dt(d.backups.find((x) => x.id === f.dataset.id).at)); UI.sheet = null; save(); render(); toast("Données restaurées pour " + bar().name + "."); }); },
  bar: (f) => {
    const v = Object.fromEntries(new FormData(f)); const e = {};
    if (!v.name.trim()) e.name = "Le nom commercial est obligatoire."; else if (S.bars.some((b) => b.name.toLowerCase() === v.name.trim().toLowerCase() && b.id !== f.dataset.id)) e.name = "Un établissement porte déjà ce nom.";
    if (!/^[\d\s+]{8,}$/.test((v.phone || "").trim())) e.phone = "Numéro de téléphone invalide."; if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Adresse e-mail invalide."; if (!v.city.trim()) e.city = "La ville est obligatoire.";
    UI.form = v; if (Object.keys(e).length) { UI.errs = e; return render(); }
    const features = {}; ["boissons", "alimentaire", "divers", "employes", "caisses", "depenses", "fournisseurs", "recettes", "inventaires", "pertes", "rapports", "alertes"].forEach((k) => (features[k] = !!v["f_" + k]));
    const data = { name: v.name.trim(), type: v.type, city: v.city.trim(), address: (v.address || "").trim() || v.city.trim(), country: v.country, phone: v.phone.trim(), email: (v.email || "").trim(), legal: (v.legal || "").trim(), tz: v.tz, start: v.start, hours: v.hours, desc: v.desc, owner: v.owner, currency: "FCFA" };
    const d = db(); const b = bar(); const first = !d.settings.configured; const before = b.name;
    const { name, ...identity } = data; d.settings.identity = { ...d.settings.identity, ...identity, color: d.settings.identity.color || b.color }; d.settings.configured = true; Object.assign(d.settings.features, features);
    if (name !== b.name && H.renameShop) H.renameShop(name);
    audit(first ? "Configuration initiale de l'établissement" : "Modification des paramètres", "Identité de l'établissement", { before, after: name });
    save(); syncFromHost(); UI.errs = {}; UI.form = {}; UI.view = first ? "dashboard" : "parametres"; render(); window.scrollTo(0, 0);
    toast(first ? "Établissement configuré. Ajoutez vos produits pour commencer à vendre." : "Établissement mis à jour.");
  },
  psearch: (f) => { UI.flt.pq = f.q.value.trim(); const p = db().products.find((x) => x.barcode && x.barcode === UI.flt.pq); if (p) { UI.flt.pq = ""; addCart(p.id); return; } render(); },
  prnset: (f) => { const d = db(); const before = JSON.stringify(prn()); d.settings.print = { paper: f.paper.value, copies: Number(f.copies.value) || 1, auto: f.auto.checked }; audit("Modification des paramètres", "Impression des reçus", { before, after: (PAPERS.find((p) => p[0] === f.paper.value) || [])[1] + (f.auto.checked ? " · automatique" : ""), say: false }); save(); render(); toast("Réglages d'impression enregistrés."); },
  vflt: (f) => { Object.assign(UI.flt, Object.fromEntries(new FormData(f))); UI.vlim = 30; render(); },
  aflt: (f) => { UI.flt.aq = f.q.value; render(); },
  rflt: (f) => { Object.assign(UI.flt, Object.fromEntries(new FormData(f))); render(); },
  range: (f) => { UI.from = f.from.value; UI.to = f.to.value; if (UI.from > UI.to) return toast("La date de début doit précéder la date de fin.", "err"); render(); },
  remise: (f) => { const sub = UI.cart.lines.reduce((a, l) => a + l.qty * l.price, 0); const v = Math.max(0, Math.min(sub, Number(f.v.value) || 0)); UI.cart.discount = v; UI.cart.discountWhy = f.m.value; UI.sheet = null; render(); },
  cancelsale: (f) => { const d = db(); const s = d.sales.find((x) => x.id === f.dataset.id); if (s.status === "annulee") return; const before = s.status; s.status = "annulee"; s.cancel = { at: Date.now(), by: me().name, motif: f.m.value, refund: f.r.value === "especes" && s.mode === "especes" ? "especes" : "" }; s.lines.forEach((l) => { const p = prod(l.pid); if (p) { p.stock += l.qty; d.moves.push({ id: uid("m"), at: Date.now(), pid: p.id, name: p.name, delta: l.qty, type: "Annulation de vente", ref: s.num, by: me().name }); } }); audit("Annulation d'une vente", s.num, { before, after: "annulée", motif: f.m.value }); const n = d.sales.filter((x) => x.cancel && x.cancel.at > Date.now() - DAY).length; if (n >= 3) notifPush(d, bar().name, "Ventes", "moyenne", "Annulations inhabituelles", `${n} ventes annulées en 24 h.`, "Vérifier les motifs des annulations."); UI.sheet = { type: "sale", id: s.id }; save(); render(); },
  opencash: (f) => { const d = db(); const s = { id: uid("cs"), register: f.reg.value, by: me().id, byName: me().name, openedAt: Date.now(), fond: Number(f.fond.value) || 0, moves: [], closedAt: null, locked: false, corrections: [] }; d.sessions.push(s); audit("Ouverture d'une caisse", s.register, { after: "Fonds " + F(s.fond) }); UI.sheet = null; save(); render(); toast("Caisse « " + s.register + " » ouverte."); },
  cashmove: (f) => { const s = db().sessions.find((x) => x.id === f.dataset.id); s.moves.push({ id: uid("m"), at: Date.now(), type: f.t.value, amount: Number(f.a.value) || 0, reason: f.r.value, by: me().name }); audit(f.t.value === "sortie" ? "Sortie de caisse" : "Entrée de caisse", s.register, { after: F(Number(f.a.value)), motif: f.r.value }); UI.sheet = null; save(); render(); },
  closecash: (f) => { const d = db(); const s = d.sessions.find((x) => x.id === f.dataset.id); const t = theoCash(d, s); const c = Number(f.c.value); const ec = c - t.theo; if (ec && !f.e.value.trim()) { UI.errs = { close: "Un écart de " + sF(ec) + " doit être expliqué." }; return drawLayer(); } Object.assign(s, { closedAt: Date.now(), theo: t.theo, counted: c, ecart: ec, explication: f.e.value.trim(), byMode: t.byMode, validatedBy: "", locked: false }); audit("Fermeture d'une caisse", s.register, { before: "Théorique " + F(t.theo), after: "Compté " + F(c), motif: f.e.value }); if (ec) { audit("Écart constaté", s.register, { after: sF(ec), motif: f.e.value }); notifPush(d, bar().name, "Caisse", Math.abs(ec) >= 5000 ? "haute" : "moyenne", "Écart de caisse détecté", `${s.byName}, caisse ${s.register} : ${sF(ec)}. ${f.e.value}`, "Examiner l'explication puis valider la fermeture."); } notifPush(d, bar().name, "Caisse", "info", "Fermeture de caisse en attente", `Caisse ${s.register} fermée par ${s.byName}, à valider.`, "Valider la fermeture pour la verrouiller."); UI.errs = {}; UI.sheet = { type: "session", id: s.id, wide: true }; save(); render(); },
  correct: (f) => { const s = db().sessions.find((x) => x.id === f.dataset.id); const c = Number(f.c.value); s.corrections.push({ at: Date.now(), by: me().name, motif: f.m.value, before: s.counted, after: c }); audit("Validation d'une correction", "Caisse " + s.register + " du " + dFR(s.closedAt), { before: F(s.counted), after: F(c), motif: f.m.value }); s.counted = c; s.ecart = c - s.theo; save(); drawLayer(); render(); toast("Correction enregistrée et tracée."); },
  product: (f) => { if (!can("stock_edit")) return deny("modifier un produit"); const v = Object.fromEntries(new FormData(f)); const e = {}; if (!v.name.trim()) e.pname = "Le nom est obligatoire."; if (!(Number(v.price) > 0)) e.pprice = "Indiquez un prix de vente."; else if (Number(v.price) < Number(v.buy)) e.pprice = "Le prix de vente est inférieur au prix d'achat."; if (Object.keys(e).length) { UI.errs = e; return drawLayer(); } const d = db(); let p = f.dataset.id ? prod(f.dataset.id) : null; const data = { name: v.name.trim(), ref: v.ref, barcode: v.barcode.trim(), cat: v.cat, supplierId: v.sup, buy: Number(v.buy) || 0, price: Number(v.price), min: Number(v.min) || 0, unit: v.unit }; if (p) { if (p.price !== data.price) audit("Modification d'un prix", p.name, { before: F(p.price), after: F(data.price) }); Object.assign(p, data); } else { p = { id: uid("p"), ...data, stock: 0, active: true, photo: null }; d.products.push(p); audit("Création d'un produit", p.name); } UI.sheet = null; UI.errs = {}; save(); render(); toast("Produit enregistré."); },
  stockmove: (f) => { const d = db(); const p = prod(f.p.value); const q = Math.max(1, Number(f.q.value) || 0); const t = f.t.value; if (t !== "Réception hors commande" && p.stock < q) return toast("Stock insuffisant.", "err"); if (t === "Transfert vers un autre bar") { const to = S.dbs[f.to.value]; const tp = to.products.find((x) => x.name === p.name); if (!tp) return toast("Ce produit n'existe pas dans le bar destinataire.", "err"); tp.stock += q; to.moves.push({ id: uid("m"), at: Date.now(), pid: tp.id, name: tp.name, delta: q, type: "Transfert reçu", ref: bar().name, by: me().name }); } const delta = t === "Réception hors commande" ? q : -q; p.stock += delta; d.moves.push({ id: uid("m"), at: Date.now(), pid: p.id, name: p.name, delta, type: t === "Réception hors commande" ? "Réception" : t, ref: f.m.value, by: me().name }); audit("Modification d'un stock", p.name, { after: (delta > 0 ? "+" : "") + delta, motif: t + " · " + f.m.value }); UI.sheet = null; save(); render(); toast("Mouvement enregistré."); },
  inventory: (f) => { const d = db(); let n = 0, eq = 0, ev = 0; d.products.filter((p) => p.active).forEach((p) => { const raw = f["c_" + p.id].value; if (raw === "") return; const c = Number(raw); n++; const diff = c - p.stock; if (diff) { d.moves.push({ id: uid("m"), at: Date.now(), pid: p.id, name: p.name, delta: diff, type: "Inventaire", ref: "Compté " + c, by: me().name }); eq += diff; ev += diff * p.buy; p.stock = c; } }); if (!n) return toast("Saisissez au moins une quantité comptée.", "err"); d.inventories.push({ id: uid("i"), at: Date.now(), by: me().name, lines: n, ecartQty: eq, ecartValue: ev, comment: f.comment.value }); audit("Inventaire", n + " produits", { after: "Écart " + sF(ev) }); if (ev) notifPush(d, bar().name, "Stock", ev < -10000 ? "haute" : "moyenne", "Écart de stock détecté", `Inventaire : ${eq} unité(s), ${sF(ev)}.`, "Examiner les produits en écart."); UI.inv = false; save(); render(); toast(`Inventaire validé : écart ${sF(ev)}.`, ev ? "warn" : "ok"); },
  assign: (f) => { const d = db(); const e = S.employees.find((x) => x.id === f.e.value); const p = prod(f.p.value); const q = Number(f.q.value); if (q > p.stock) return toast("Quantité supérieure au stock.", "err"); d.assigns.push({ id: uid("a"), empId: e.id, empName: e.name, pid: p.id, name: p.name, qty: q, transfersIn: 0, otherOut: 0, at: Date.now(), by: me().name, status: "en cours" }); audit("Attribution de stock", e.name + " · " + p.name, { after: String(q) }); UI.sheet = null; save(); render(); },
  control: (f) => { const d = db(); const a = d.assigns.find((x) => x.id === f.dataset.id); const c = assignCalc(d, a); const counted = Number(f.c.value); const ec = counted - c.theo; const p = prod(a.pid); d.controls.push({ id: uid("c"), empName: a.empName, name: a.name, initial: a.qty, sold: c.sold, losses: c.losses, offered: c.offered, other: a.otherOut || 0, inQty: a.transfersIn || 0, theo: c.theo, counted, ecart: ec, value: ec * p.price, at: Date.now(), by: me().name, comment: f.m.value, status: ec ? "à examiner" : "clos" }); a.status = "contrôlé"; audit("Contrôle du stock", a.empName + " · " + a.name, { before: "Théorique " + c.theo, after: "Compté " + counted }); if (ec) { audit("Écart constaté", a.empName + " · " + a.name, { after: String(ec) }); notifPush(d, bar().name, "Stock", ec <= -3 ? "haute" : "moyenne", "Écart de stock détecté", `Contrôle de ${a.empName} : écart de ${ec} ${a.name}.`, "Examiner le contrôle avec l'employé. Un écart n'est pas une preuve de vol."); } UI.sheet = null; UI.view = "controle"; save(); render(); toast(ec ? `Écart de ${ec} enregistré.` : "Aucun écart.", ec ? "warn" : "ok"); },
  ctrlnote: (f) => { const c = db().controls.find((x) => x.id === f.dataset.id); c.comment = f.m.value; c.status = f.s.value; audit("Examen d'un écart de stock", c.empName + " · " + c.name, { after: c.status, motif: c.comment }); UI.sheet = null; save(); render(); },
  loss: (f) => { const d = db(); const p = prod(f.p.value); const q = Number(f.q.value); if (q > p.stock) return toast("Quantité supérieure au stock.", "err"); const t = f.t.value; const value = q * p.buy; const needOk = (t.startsWith("Produit offert") && d.settings.offertApproval) || value >= d.settings.lossApproval; const auto = needOk && can("pertes_ok"); const l = { id: uid("l"), pid: p.id, name: p.name, qty: q, type: t, by: me().name, byId: me().id, approvedBy: !needOk || auto ? me().name : "", status: !needOk || auto ? "approuvée" : "en attente", at: Date.now(), value, comment: f.c.value }; d.losses.push(l); if (l.status === "approuvée") { p.stock -= q; d.moves.push({ id: uid("m"), at: Date.now(), pid: p.id, name: p.name, delta: -q, type: t, ref: l.comment, by: me().name }); audit("Validation d'une perte", p.name + " × " + q, { motif: t }); } else { audit("Déclaration d'une perte", p.name + " × " + q, { motif: t }); notifPush(d, bar().name, "Stock", "moyenne", "Sortie en attente d'approbation", `${me().name} : ${q} × ${p.name} (${t}).`, "Approuver ou refuser dans Pertes et produits offerts."); } UI.sheet = null; save(); render(); toast(l.status === "approuvée" ? "Sortie enregistrée, stock mis à jour." : "Sortie envoyée pour approbation.", l.status === "approuvée" ? "ok" : "warn"); },
  supplier: (f) => { const d = db(); const v = Object.fromEntries(new FormData(f)); if (f.dataset.id) Object.assign(sup(f.dataset.id), v); else d.suppliers.push({ id: uid("s"), ...v }); audit(f.dataset.id ? "Modification d'un fournisseur" : "Ajout d'un fournisseur", v.name); UI.sheet = null; save(); render(); },
  order: (f) => { const d = db(); const lines = [0, 1, 2].map((i) => ({ pid: f["p" + i].value, qty: Number(f["q" + i].value) || 0, u: f["u" + i].value })).filter((l) => l.pid && l.qty > 0).map((l) => ({ pid: l.pid, qty: l.qty, price: l.u === "" ? prod(l.pid).buy : Number(l.u), received: 0 })); if (!lines.length) return toast("Ajoutez au moins un produit.", "err"); const disc = Number(f.disc.value) || 0; const total = lines.reduce((a, l) => a + l.qty * l.price, 0) - disc; const paid = Math.min(total, Number(f.paid.value) || 0); const o = { id: uid("o"), num: "BC-" + String(d.seq.order++).padStart(4, "0"), supplierId: f.s.value, at: Date.now(), lines, discount: disc, total, paid, status: "commandée", payments: paid ? [{ at: Date.now(), amount: paid, mode: "especes" }] : [], by: me().name }; d.orders.push(o); audit("Commande fournisseur", o.num, { after: F(total) }); UI.sheet = { type: "orderdoc", id: o.id, wide: true }; save(); render(); },
  receive: (f) => { const d = db(); const o = d.orders.find((x) => x.id === f.dataset.id); let any = 0; o.lines.forEach((l, i) => { const q = Math.max(0, Math.min(l.qty - l.received, Number(f["q" + i].value) || 0)); if (q) { const p = prod(l.pid); p.stock += q; l.received += q; any += q; d.moves.push({ id: uid("m"), at: Date.now(), pid: p.id, name: p.name, delta: q, type: "Réception", ref: o.num, by: me().name }); } }); if (!any) return toast("Aucune quantité acceptée.", "err"); o.status = o.lines.every((l) => l.received >= l.qty) ? "reçue" : "partielle"; audit("Réception de commande", o.num, { after: any + " unités acceptées" }); notifPush(d, bar().name, "Approvisionnements", "info", "Nouvelle livraison enregistrée", `${o.num} : ${any} unité(s) entrées en stock.`, "Vérifier les factures et le solde fournisseur."); UI.sheet = { type: "orderdoc", id: o.id, wide: true }; save(); render(); toast("Réception validée, stock mis à jour."); },
  paysup: (f) => { const o = db().orders.find((x) => x.id === f.dataset.id); const a = Math.min(o.total - o.paid, Number(f.a.value) || 0); o.paid += a; o.payments.push({ at: Date.now(), amount: a, mode: f.m.value }); audit("Paiement fournisseur", o.num, { after: F(a) }); UI.sheet = { type: "orderdoc", id: o.id, wide: true }; save(); render(); },
  expense: (f) => { const d = db(); const v = Object.fromEntries(new FormData(f)); const amount = Number(v.amount) || 0; if (!v.label.trim() || amount <= 0) return toast("Libellé et montant obligatoires.", "err"); const at = new Date(v.date + "T12:00").getTime(); if (f.dataset.id) { const e = d.expenses.find((x) => x.id === f.dataset.id); const before = F(e.amount) + " · " + e.label; Object.assign(e, { label: v.label.trim(), cat: v.cat, amount, at, mode: v.mode, comment: v.comment }); e.history.push({ at: Date.now(), by: me().name, why: v.why }); audit("Modification d'une dépense", e.label, { before, after: F(amount), motif: v.why }); } else { const needOk = amount >= d.settings.expApproval && !can("depenses_ok"); const e = { id: uid("d"), label: v.label.trim(), cat: v.cat, amount, at, mode: v.mode, by: me().name, status: needOk ? "en attente" : "approuvée", approvedBy: needOk ? "" : me().name, proof: !!(f.proof.files && f.proof.files.length), comment: v.comment, history: [] }; d.expenses.push(e); audit("Création d'une dépense", e.label, { after: F(amount) }); if (needOk) notifPush(d, bar().name, "Dépenses", "moyenne", "Dépense en attente d'approbation", `${e.label} : ${F(amount)} (${me().name}).`, "Approuver ou refuser dans Dépenses."); toast(needOk ? "Dépense envoyée pour approbation." : "Dépense enregistrée.", needOk ? "warn" : "ok"); } UI.sheet = null; save(); render(); },
  rules: (f) => { const s = db().settings; const before = `Dépense ${F(s.expApproval)} · perte ${F(s.lossApproval)}`; s.expApproval = Number(f.exp.value) || 0; s.lossApproval = Number(f.loss.value) || 0; s.offertApproval = f.off.checked; s.thanks = f.thanks.value; audit("Modification des paramètres", "Règles de validation", { before, after: `Dépense ${F(s.expApproval)} · perte ${F(s.lossApproval)}` }); save(); render(); toast("Règles enregistrées."); },
};


/* ============================== Événements (limités à la racine du module) ============================== */
const onClick = (e) => { const el = e.target.closest("[data-a]"); if (!el || !root.contains(el)) return; const a = el.dataset.a; if (a === "ovclose" && e.target !== el) return; if (ACT[a]) { e.preventDefault(); ACT[a](el.dataset, e); if (pendingRender && !UI.sheet) safeRender(); } };
const onSubmit = (e) => {
  const f = e.target.closest("form[data-f]"); if (!f) return; e.preventDefault();
  f.querySelectorAll(".ferr.auto").forEach((x) => x.remove()); f.querySelectorAll(".inp.err").forEach((x) => x.classList.remove("err"));
  const bad = [...f.querySelectorAll("input[required], select[required], textarea[required], input[type=number]")].find((el) => { if (el.disabled || el.readOnly) return false; const v = el.value.trim(); if (el.required && !v) return (el.dataset.msg = "Ce champ est obligatoire.", true); if (el.type === "number" && v !== "") { const n = Number(v); if (el.min !== "" && n < Number(el.min)) return (el.dataset.msg = "La valeur minimale est " + nb(Number(el.min)) + ".", true); if (el.max !== "" && n > Number(el.max)) return (el.dataset.msg = "La valeur maximale est " + nb(Number(el.max)) + ".", true); } return false; });
  if (bad) { bad.classList.add("err"); const m = document.createElement("div"); m.className = "ferr auto"; m.textContent = bad.dataset.msg; (bad.closest(".field") || bad.parentNode).appendChild(m); bad.focus(); return; }
  if (FORMS[f.dataset.f]) FORMS[f.dataset.f](f);
};
const onChange = (e) => {
  if (e.target.matches("[data-file]")) { const fn = e.target.parentNode.querySelector(".fn"); if (fn) fn.textContent = e.target.files && e.target.files[0] ? e.target.files[0].name : "Aucun fichier choisi"; }
  if (e.target.dataset.ch === "rep") { UI.rep = e.target.value; render(); }
};
const onInput = (e) => { const k = e.target.dataset.ch; if (!k) return; if (k === "codefmt") { e.target.value = fmtCode(e.target.value); return; } if (k === "ecart") { const b = $("#ecb"); const v = e.target.value; if (v === "") { b.className = "note"; b.textContent = "Saisissez le montant compté pour voir l'écart."; return; } const ec = Number(v) - Number(e.target.dataset.theo); b.className = ec ? "note crit" : "note"; b.textContent = ec ? `Écart de ${sF(ec)} : une explication est obligatoire.` : "Aucun écart : la caisse est juste."; return; } if (UI.pay) { UI.pay[k] = e.target.value; if (k === "recv") { const total = Math.max(0, UI.cart.lines.reduce((a, l) => a + l.qty * l.price, 0) - UI.cart.discount); const c = $("#chg"); if (c) c.textContent = F(Math.max(0, (Number(e.target.value) || 0) - total)); } } };
const tip = () => $("#bm-tip");
const onOver = (e) => { const t = e.target.closest("[data-tip]"); const tp = tip(); if (!tp) return; if (!t) { tp.hidden = true; return; } tp.textContent = t.dataset.tip; tp.hidden = false; };
const onMove = (e) => { const tp = tip(); if (!tp || tp.hidden) return; const w = tp.offsetWidth; tp.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 12) + "px"; tp.style.top = e.clientY - 38 + "px"; };
const onKey = (e) => { if (e.key === "Escape" && UI.sheet && !UI.busy) { UI.sheet = null; render(); } };
root.addEventListener("click", onClick); root.addEventListener("submit", onSubmit); root.addEventListener("change", onChange); root.addEventListener("input", onInput); root.addEventListener("pointerover", onOver); root.addEventListener("pointermove", onMove); document.addEventListener("keydown", onKey);

/* ============================== Démarrage ============================== */
// Reprise du catalogue d'un ancien « Bar » GestiOne (produits classiques) au premier lancement.
function migrateLegacy() {
  const d = db(); if (d.settings.migrated) return;
  const legacy = (H.legacy && Array.isArray(H.legacy.products)) ? H.legacy.products : [];
  if (!d.products.length && legacy.length && Number(H.legacy.salesCount) > 0) {
    const CATMAP = { biere: "Bières", bieres: "Bières", vin: "Vins", vins: "Vins", spiritueux: "Spiritueux", liqueur: "Spiritueux", champagne: "Champagnes", soda: "Boissons non alcoolisées", sucrerie: "Boissons non alcoolisées", energie: "Boissons non alcoolisées", eau: "Eaux", jus: "Jus", nourriture: "Produits alimentaires", plat: "Produits alimentaires" };
    legacy.forEach((p, i) => { if (!p || !p.name) return; d.products.push({ id: p.id || uid("p"), name: p.name, ref: p.ref || "REF-" + String(100 + i), barcode: p.barcode || "", cat: CATMAP[String(p.category || "").toLowerCase()] || "Produits divers", supplierId: "", buy: Number(p.costPrice) || 0, price: Number(p.price) || 0, stock: Number(p.stock) || 0, min: Number(p.minStock) || 0, unit: p.unit || "bouteille", active: p.archived ? false : true, photo: null }); });
    audit("Reprise du catalogue existant", d.products.length + " produits");
  }
  d.settings.migrated = true; save();
}
let destroyed = false; let pendingRender = false; let lastSig = "";
root.classList.add("bm-root"); applyMode(MODE);
root.innerHTML = `<div id="bm-app"></div><div id="bm-layer"></div><div id="bm-tip" class="bm-tip" hidden></div>`;
let booted = false;
// On attend que GestiOne ait relu les données du téléphone (host.ready) avant
// tout affichage ou enregistrement, pour ne jamais écraser des données existantes.
function boot() { booted = true; syncFromHost(true); UI.user = userOf(); UI.view = UI.user.role === "proprietaire" || can("dashboard") ? "dashboard" : can("pos") ? "pos" : "etat"; migrateLegacy(); render(); loadOthers(); }
if (H.ready === false) $("#bm-app").innerHTML = `<div style="min-height:60vh;display:flex;align-items:center;justify-content:center"><span class="load"></span></div>`; else boot();
return {
  update(next) {
    H = next; if (!booted) { if (H.ready !== false) boot(); return; } const changed = syncFromHost(false);
    const sig = JSON.stringify([H.license, H.sync && [H.sync.online, H.sync.busy, H.sync.pending, H.sync.lastAt], (H.vendors || []).map((v) => [v.id, v.name, v.barRole, v.blocked, v.joinCode]), (H.shops || []).map((x) => [x.id, x.name]), H.shop && H.shop.name, H.role, H.staff && H.staff.id]);
    if (sig !== lastSig) { lastSig = sig; if ((H.shops || []).some((x) => x.id !== H.shop.id && !S.cache[x.id])) loadOthers(); return safeRender(); }
    if (changed) safeRender();
  },
  destroy() { destroyed = true; if (booted) save(); root.removeEventListener("click", onClick); root.removeEventListener("submit", onSubmit); root.removeEventListener("change", onChange); root.removeEventListener("input", onInput); root.removeEventListener("pointerover", onOver); root.removeEventListener("pointermove", onMove); document.removeEventListener("keydown", onKey); root.innerHTML = ""; },
};

}
