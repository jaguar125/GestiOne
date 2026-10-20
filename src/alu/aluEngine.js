// src/alu/aluEngine.js
//
// GestiOne Aluminium : espace des entreprises de type « Aluminium »
// (fabrication, vente et pose d'ouvrages en aluminium).
// Même accueil, même création d'entreprise, même connexion et même licence
// que toutes les entreprises GestiOne ; chaque entreprise a sa licence et son
// essai de 14 jours.
//
// Le module dessine son interface dans un conteneur (root) et échange avec
// GestiOne par l'objet « host » : données synchronisées (clés alu*), personnel
// (vendeurs avec un rôle aluRole), licence, synchronisation, photos, PDF.

export const ALU_KEYS = ["aluClients", "aluCategories", "aluServices", "aluPhotos", "aluPrices", "aluQuotes", "aluAudit", "aluSettings", "aluMaterials", "aluOrders", "aluProjects", "aluWorkers"];

export function mountAluminium(root, host) {
const $ = (s) => root.querySelector(s);
const $$ = (s) => [...root.querySelectorAll(s)];

/* ============================== Outils ============================== */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nb = (n, dec = 0) => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/[  ]/g, " ");
const cur = () => (db() && db().settings.currency) || "FCFA";
const F = (n) => nb(Math.round(Number(n) || 0)) + " " + cur();
const Fk = (n) => `${nb(Math.round(Number(n) || 0))}<span class="cur">${esc(cur())}</span>`;
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const DAY = 86400000, MIN = 60000;
const dFR = (t) => new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dS = (t) => new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const hm = (t) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dt = (t) => dFR(t) + " " + hm(t);
const ago = (t) => { const m = Math.round((Date.now() - t) / MIN); return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `le ${dS(t)}`; };
const ini = (s) => String(s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const clone = (x) => JSON.parse(JSON.stringify(x));
const num = (v) => { if (v == null || v === "") return NaN; const n = Number(String(v).replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : NaN; };

/* ============================== Unités et calculs ============================== */
const UNITS = [["mm", "mm", 1], ["cm", "cm", 10], ["m", "m", 1000]];
const toMm = (v, u) => { const n = num(v); if (!(n > 0)) return null; const f = (UNITS.find((x) => x[0] === u) || UNITS[1])[2]; return Math.round(n * f); };
const fromMm = (mm, u) => { const f = (UNITS.find((x) => x[0] === u) || UNITS[1])[2]; return Math.round((mm / f) * 1000) / 1000; };
const dimTxt = (wmm, hmm, u = "cm", mode) => { if (mode === "forfait" || wmm == null) return "—"; const w = nb(fromMm(wmm, u), u === "m" ? 2 : 0).replace(/,00$/, ""); if (mode === "ml" || hmm == null) return `${w} ${u}`; return `${w} × ${nb(fromMm(hmm, u), u === "m" ? 2 : 0).replace(/,00$/, "")} ${u}`; };
// Modes de calcul du prix (unité de facturation).
const MODES = [
  ["piece", "À la pièce", "pièce", "Prix par pièce, selon ses dimensions"],
  ["m2", "Au m²", "m²", "Largeur × hauteur × prix au m²"],
  ["ml", "Au mètre linéaire", "ml", "Longueur × prix au mètre"],
  ["forfait", "Forfait", "forfait", "Prix fixe, sans dimensions"],
];
const modeOf = (k) => MODES.find((m) => m[0] === k) || MODES[0];
const needsW = (mode) => mode !== "forfait";
const needsH = (mode) => mode === "piece" || mode === "m2";
function measure(mode, wmm, hmm) {
  if (mode === "m2") return wmm && hmm ? (wmm * hmm) / 1e6 : 0;
  if (mode === "ml") return wmm ? wmm / 1000 : 0;
  return 1;
}
function lineAmount(l) { const q = Math.max(0, Number(l.qty) || 0); const p = Math.max(0, Number(l.price) || 0); return Math.round(measure(l.mode, l.wmm, l.hmm) * p * q); }
const priceUnitLabel = (mode) => (mode === "m2" ? "par m²" : mode === "ml" ? "par mètre" : mode === "forfait" ? "forfaitaire" : "par pièce");
// Caractéristiques techniques : liste [{k, v}] ; la clé normalisée sert à la recherche des tarifs.
const TECH_KEYS = ["Profilé", "Série", "Couleur", "Vitrage", "Épaisseur", "Ouverture", "Accessoires", "Finition"];
const cleanTech = (t) => (Array.isArray(t) ? t : []).map((x) => ({ k: String(x.k || "").trim(), v: String(x.v || "").trim() })).filter((x) => x.k && x.v);
const techKey = (t) => cleanTech(t).map((x) => norm(x.k) + "=" + norm(x.v)).sort().join("|");
const techLabel = (t) => cleanTech(t).map((x) => `${x.k} : ${x.v}`).join(" · ");

/* ============================== Données (clés synchronisées) ============================== */
const KEYS = { clients: "aluClients", categories: "aluCategories", services: "aluServices", photos: "aluPhotos", prices: "aluPrices", quotes: "aluQuotes", audit: "aluAudit", materials: "aluMaterials", orders: "aluOrders", projects: "aluProjects", workers: "aluWorkers" };
const STATUSES = { brouillon: ["Brouillon", "t-mut"], finalise: ["Finalisé", "t-info"], envoye: ["Envoyé", "t-warn"], accepte: ["Accepté", "t-good"], refuse: ["Refusé", "t-crit"], expire: ["Expiré", "t-mut"], annule: ["Annulé", "t-crit"] };
const THEMES = [["reference", "Pro-forma", "Votre modèle : bandeau rouge, montant en lettres."], ["classique", "Classique professionnel", "Sobre et structuré, encadrés et tableau bordé."], ["moderne", "Moderne et élégant", "Bandeau de couleur, cartes arrondies, lecture aérée."], ["technique", "Détaillé technique", "Caractéristiques, surfaces et photos par ligne."]];
const DEF_SETTINGS = () => ({ id: "main", configured: false, identity: {}, currency: "FCFA", tax: { on: false, label: "TVA", rate: 18 }, validity: 30, payTerms: "50 % d'acompte à la commande, solde à la fin de la pose.", mentions: "Devis gratuit. Les dimensions définitives sont vérifiées sur chantier avant fabrication.", footer: "", color: "#0E7C86", refColor: "#A8282B", theme: "reference", slogan: "", arret: "Arrêtée la présente facture pro-forma à la somme de :", merci: "Merci de votre confiance !", perms: {}, deviseDelay: "" });
function hostDb(data) {
  const d = { backups: [] };
  Object.entries(KEYS).forEach(([k, key]) => { d[k] = Array.isArray(data && data[key]) ? clone(data[key]) : []; });
  const st = Array.isArray(data && data.aluSettings) && data.aluSettings[0] ? clone(data.aluSettings[0]) : {};
  const def = DEF_SETTINGS();
  d.settings = { ...def, ...st, tax: { ...def.tax, ...(st.tax || {}) }, identity: { ...(st.identity || {}) }, perms: { ...(st.perms || {}) } };
  return d;
}
let H = host;
const SNAPS = {};
const S = { db: null, employees: [], online: true, lastRefresh: Date.now() };
const sent = {}; const seen = {};

/* ============================== Rôles et permissions ============================== */
const ROLES = { administrateur: "Administrateur", responsable: "Responsable", commercial: "Commercial", technicien: "Technicien", comptable: "Comptable", consultation: "Consultation" };
const ROLE_DESC = { administrateur: "Configuration générale et gestion des autorisations.", responsable: "Gestion opérationnelle selon les droits attribués.", commercial: "Clients, prestations et devis.", technicien: "Mesures, prestations et informations de chantier.", comptable: "Montants, documents et rapports financiers.", consultation: "Lecture seule des données autorisées." };
const ALL_ROLES = Object.keys(ROLES);
// Permissions par défaut (modifiables par l'administrateur, appliquées aussi par le serveur).
const PERMS = {
  devis_creer: ["Créer des devis", ["administrateur", "responsable", "commercial"]],
  devis_modifier: ["Modifier et valider les devis", ["administrateur", "responsable", "commercial"]],
  clients: ["Créer et modifier les clients", ["administrateur", "responsable", "commercial"]],
  catalogue: ["Créer et modifier les prestations", ["administrateur", "responsable", "commercial", "technicien"]],
  tarifs: ["Modifier les tarifs de référence", ["administrateur", "responsable", "commercial"]],
  finances: ["Voir les montants et totaux", ["administrateur", "responsable", "commercial", "comptable"]],
  documents: ["Accéder aux PDF et aux photos", ["administrateur", "responsable", "commercial", "technicien", "comptable", "consultation"]],
  employes: ["Gérer les employés", ["administrateur"]],
  audit: ["Consulter le journal d'audit", ["administrateur", "responsable"]],
  exporter: ["Exporter les données", ["administrateur", "responsable", "comptable"]],
  restaurer: ["Restaurer des données", ["administrateur"]],
  parametres: ["Paramètres de l'entreprise", ["administrateur"]],
  materiel: ["Gérer la liste du matériel et ses prix", ["administrateur", "responsable"]],
  achats: ["Passer, modifier et supprimer les commandes", ["administrateur", "responsable"]],
  chantiers: ["Suivre les dépenses et bénéfices des chantiers", ["administrateur", "responsable", "comptable"]],
  ouvriers: ["Gérer les ouvriers et leurs rémunérations", ["administrateur"]],
};
function permOn(r, p) { if (r === "administrateur") return true; const o = db() && db().settings.perms && db().settings.perms[r]; if (o && typeof o[p] === "boolean") return o[p]; return PERMS[p] ? PERMS[p][1].includes(r) : false; }

function employeesOf(vendors) {
  return (vendors || []).map((v) => { const r = v.aluRole && ROLES[v.aluRole] ? v.aluRole : "commercial"; return { id: v.id, name: v.name || "Employé", role: r, func: v.aluFunc || ROLES[r], phone: v.phone || "", hired: v.createdAt ? dFR(v.createdAt) : "", status: v.blocked ? "désactivé" : "actif", login: v.joinCode || "", raw: v }; });
}
const canon = (a) => JSON.stringify((Array.isArray(a) ? a : []).slice().sort((x, y) => String(x && x.id).localeCompare(String(y && y.id))));
function syncFromHost(first) {
  let changed = false;
  if (first || !S.db) { S.db = hostDb(H.data || {}); ALU_KEYS.forEach((k) => (sent[k] = seen[k] = JSON.stringify((H.data || {})[k] || []))); changed = true; }
  else {
    const d = S.db;
    Object.entries(KEYS).forEach(([k, key]) => { const j = JSON.stringify((H.data || {})[key] || []); if (j === seen[key]) return; seen[key] = j; if (j !== sent[key]) { const inc = JSON.parse(j); sent[key] = j; if (canon(inc) === canon(d[k])) return; d[k] = inc; changed = true; } });
    const js = JSON.stringify((H.data || {}).aluSettings || []);
    if (js !== seen.aluSettings) { seen.aluSettings = js; if (js !== sent.aluSettings) { sent.aluSettings = js; const ns = hostDb(H.data || {}).settings; if (JSON.stringify(ns) !== JSON.stringify(d.settings)) { d.settings = ns; changed = true; } } }
  }
  S.employees = employeesOf(H.vendors);
  S.online = !(H.sync && H.sync.online === false);
  if (H.sync && H.sync.lastAt) S.lastRefresh = new Date(H.sync.lastAt).getTime() || S.lastRefresh;
  return changed;
}
let MODE = "clair"; try { MODE = localStorage.getItem("alu-mode") || "clair"; } catch (e) { MODE = "clair"; }
function applyMode(m) { root.dataset.mode = m; }
const UI = { view: "dashboard", sheet: null, toast: null, flt: {}, errs: {}, busy: false, form: {}, wiz: null, qid: null, lim: 30 };
function userOf() {
  if (H.role === "admin") return { kind: "admin", id: "admin", name: H.userName || "Administrateur", role: "administrateur" };
  const v = H.staff || {}; const r = v.aluRole && ROLES[v.aluRole] ? v.aluRole : "commercial";
  return { kind: "emp", id: v.id || "emp", name: v.name || H.userName || "Employé", role: r };
}
function save() {
  const d = S.db; if (!d) return;
  if (d.audit.length > 4000) d.audit.length = 4000;
  Object.entries(KEYS).forEach(([k, key]) => { const j = JSON.stringify(d[k]); if (j !== sent[key]) { sent[key] = j; try { H.save[key](JSON.parse(j)); } catch (e) { /* enregistrement indisponible */ } } });
  const js = JSON.stringify([d.settings]);
  if (js !== sent.aluSettings) { sent.aluSettings = js; try { H.save.aluSettings(JSON.parse(js)); } catch (e) { /* ignore */ } }
}
const db = () => S.db;
const me = () => UI.user;
const role = () => (me() ? me().role : null);
const can = (p) => !!me() && permOn(role(), p);
const company = () => { const id = (db() && db().settings.identity) || {}; return { name: H.shop.name || "Mon entreprise", phone: id.phone || "", email: id.email || "", address: id.address || "", city: id.city || "", country: id.country || "Côte d'Ivoire", legal: id.legal || "", logo: id.logo || "", stamp: id.stamp || id.stampOnly || id.sign || "", stampFull: id.stamp || "", stampOnly: id.stampOnly || "", sign: id.sign || "", owner: id.owner || "", web: id.web || "", bank: id.bank || "" }; };
function audit(action, obj, result = "") { const d = db(); if (!d) return; d.audit.unshift({ id: uid("j"), at: Date.now(), user: me() ? me().name : "Système", role: role() || "", action, obj: obj || "", result }); }
function toast(msg, kind = "ok") { UI.toast = { msg, kind, t: Date.now() }; drawToast(); const t = UI.toast.t; setTimeout(() => { if (UI.toast && UI.toast.t === t) { UI.toast = null; drawToast(); } }, 3600); }
function drawToast() { let el = $("#al-toast"); if (!UI.toast) { if (el) el.remove(); return; } if (!el) { el = document.createElement("div"); el.id = "al-toast"; el.setAttribute("role", "status"); root.appendChild(el); } el.className = "toast " + (UI.toast.kind === "ok" ? "" : UI.toast.kind); el.textContent = UI.toast.msg; }
function deny(what) { toast(`Accès refusé : le rôle ${ROLES[role()]} ne permet pas ${/^[aeiouéèêh]/i.test(what) ? "d'" : "de "}${what}.`, "err"); audit("Tentative non autorisée", what, "refusée"); save(); }
const need = (p, what) => { if (can(p)) return true; deny(what); return false; };
const say = (t) => { try { if (H.speak && t) H.speak(String(t).replace(/FCFA/g, "francs CFA")); } catch (e) { /* voix indisponible */ } };
// État de synchronisation honnête : rien n'est annoncé « sur le serveur » sans confirmation.
function syncState() {
  const sy = H.sync || {}; const pend = Number(sy.pending) || 0;
  if (sy.online === false) return ["off", "Hors connexion", pend ? `${pend} opération(s) sur cet appareil, en attente d'envoi` : "Les données affichées sont celles de cet appareil"];
  if (sy.busy) return ["run", "Synchronisation en cours", "Envoi et réception des données…"];
  if (pend > 0) { const old = sy.lastAt && Date.now() - new Date(sy.lastAt).getTime() > 5 * MIN; return [old ? "warn" : "run", old ? "Synchronisation à vérifier" : "Synchronisation en cours", `${pend} opération(s) en attente d'envoi`]; }
  return ["ok", "Synchronisé", sy.lastAt ? "Dernier échange " + ago(new Date(sy.lastAt).getTime()) : "En ligne"];
}
const localOnlyMsg = () => (syncState()[0] === "off" ? "Enregistré sur cet appareil — synchronisation en attente" : "Enregistré sur cet appareil — envoi au serveur en cours");

/* ============================== Licence (gérée par GestiOne, une par entreprise) ============================== */
const TRIAL_DAYS = 14;
const PLAN_DAYS = { "1m": 30, "3m": 90, "6m": 180, "12m": 365, lifetime: null };
const PLANS = () => (H.pricing || []).map((p) => ({ id: p.id, name: p.name, duration: p.duration, price: p.price, old: p.oldPrice, popular: !!p.popular, days: PLAN_DAYS[p.id] }));
function lic() {
  const l = H.license || {};
  if (l.lifetime) return { st: "lifetime", label: "Licence à vie", days: Infinity };
  const exp = l.expiresAt ? new Date(l.expiresAt).getTime() : 0;
  if (!exp) return { st: "none", label: "Licence non chargée", days: Infinity };
  const days = Math.ceil((exp - Date.now()) / DAY);
  if (days < 0) return { st: "expired", label: l.planId === "trial" ? "Essai gratuit terminé" : "Licence expirée", days };
  const p = PLANS().find((x) => x.id === l.planId);
  return { st: l.planId === "trial" ? "trial" : "active", label: (l.planId === "trial" ? "Essai gratuit" : "Licence " + (p ? p.name + " · " + p.duration : "")) + ` · ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`, days };
}
const licTag = () => { const x = lic(); if (x.st === "none") return `<span class="tag t-mut">Licence</span>`; return `<span class="tag ${x.st === "expired" ? "t-crit" : x.st === "trial" || x.days <= 10 ? "t-warn" : "t-good"}">${x.st === "expired" ? (x.label === "Licence expirée" ? "Licence expirée" : "Essai terminé") : x.st === "lifetime" ? "Licence à vie" : x.st === "trial" ? `Essai · ${x.days} j` : `Licence · ${x.days} j`}</span>`; };
const expired = () => lic().st === "expired";
const fmtCode = (d) => String(d).replace(/\D/g, "").slice(0, 12).replace(/(.{4})/g, "$1-").replace(/-$/, "");

/* ============================== Recherche / accès ============================== */
const svc = (id) => db().services.find((s) => s.id === id);
const client = (id) => db().clients.find((c) => c.id === id);
const quote = (id) => db().quotes.find((q) => q.id === id);
const qNum = (q) => q.num || q.tempNum || "Brouillon";
const qVer = (q) => (q.versions && q.versions.length ? q.versions[q.versions.length - 1] : null);
const photosOf = (sid) => db().photos.filter((p) => p.serviceId === sid && !p.deleted);
const mainPhoto = (sid) => { const ps = photosOf(sid); return ps.find((p) => p.main) || ps[0] || null; };
// Tarif de référence exact : même prestation, mêmes caractéristiques, même mode, mêmes dimensions normalisées.
function findRef(serviceId, tk, mode, wmm, hmm) {
  return db().prices.find((p) => !p.deleted && p.serviceId === serviceId && p.techKey === tk && p.mode === mode && (mode === "forfait" || (p.w === wmm && (!needsH(mode) || p.h === hmm)))) || null;
}
function nearRefs(serviceId, tk, mode, wmm, hmm) {
  if (mode === "forfait" || !wmm) return [];
  return db().prices.filter((p) => !p.deleted && p.serviceId === serviceId && p.techKey === tk && p.mode === mode && p.price != null && !(p.w === wmm && (!needsH(mode) || p.h === hmm)) && Math.abs(p.w - wmm) <= wmm * 0.06 && (!needsH(mode) || (hmm && Math.abs(p.h - hmm) <= hmm * 0.06))).slice(0, 4);
}
const lastUnitPrice = (serviceId, tk, mode) => db().prices.filter((p) => !p.deleted && p.serviceId === serviceId && p.techKey === tk && p.mode === mode && p.price != null).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;

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

Object.assign(ICONS, {
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  win: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M12 3v18M3 12h18"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M12 21a2.5 2.5 0 0 1 0-5h1.5a2.5 2.5 0 0 0 0-5"/>',
});

/* ============================== Navigation et coque ============================== */
const NAV = [
  ["Pilotage", [["dashboard", "Tableau de bord", "home"]]],
  ["Devis", [["nouveau", "Nouveau devis", "plus", "devis_creer"], ["devis", "Historique des devis", "file"], ["clients", "Clients et chantiers", "users"]]],
  ["Achats et chantiers", [["commande", "Nouvelle commande", "cart", "achats"], ["commandes", "Commandes et achats", "receipt"], ["chantiers", "Chantiers et bénéfices", "chart", "chantiers"], ["materiel", "Matériel et prix", "box"]]],
  ["Catalogue", [["catalogue", "Prestations", "win"], ["tarifs", "Dimensions et tarifs", "ruler"]]],
  ["Équipe", [["ouvriers", "Ouvriers et rémunérations", "users"], ["employes", "Utilisateurs et employés", "user", "employes"], ["roles", "Rôles et permissions", "shield"], ["journal", "Journal d'audit", "eye", "audit"]]],
  ["Système", [["parametres", "Paramètres et modèles", "gear", "parametres"], ["sauvegardes", "Sauvegardes", "cloud"], ["licence", "Licence et abonnement", "key"], ["profil", "Mon compte", "user"]]],
];
const NAVFLAT = NAV.flatMap((g) => g[1]);
const navItem = (v) => NAVFLAT.find((x) => x[0] === v);
const head = (t, lead, acts = "") => `<div class="ph"><div><h1>${t}</h1>${lead ? `<div class="lead">${lead}</div>` : ""}</div>${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
const emptyS = (t, d, btn = "") => `<div class="card empty"><b>${t}</b><div class="small" style="max-width:46ch">${d}</div>${btn}</div>`;
const locked = (t) => emptyS(t, `Votre rôle (${ROLES[role()]}) ne donne pas accès à cette page. Demandez à l'administrateur si vous en avez besoin.`);
const stTag = (q) => { const s = STATUSES[q.status] || STATUSES.brouillon; return `${q.kind === "total" ? '<span class="tag t-amb">Total</span> ' : ""}<span class="tag ${s[1]}">${s[0]}</span>`; };
const syncTag = (q) => (q.num ? "" : q.status === "brouillon" ? "" : `<span class="tag t-warn" data-tip="Le numéro officiel est attribué par le serveur à la synchronisation">${S.online ? "Numéro en attente" : "Sur cet appareil"}</span>`);
const money = (n) => (can("finances") ? Fk(n) : '<span class="small">Masqué</span>');
const moneyT = (n) => (can("finances") ? F(n) : "—");

function render() {
  if (destroyed) return;
  const app = $("#al-app");
  UI.user = userOf();
  if (expired()) { if (role() !== "administrateur") { app.innerHTML = `<div style="padding:40px 16px;max-width:440px;margin:0 auto"><div class="card empty">${ic("lock", 30)}<b>Entreprise verrouillée</b><div class="small">${esc(H.shop.name)} : ${esc(lic().label)}. L'administrateur doit activer une licence. Les données sont conservées.</div><button class="btn b-sec" data-a="logout">Déconnexion</button></div></div>`; drawLayer(); return; } if (!["licence", "menu", "profil"].includes(UI.view)) UI.view = "licence"; }
  if (role() === "administrateur" && !db().settings.configured && !expired() && UI.view !== "configurer") UI.view = "configurer";
  const v = VIEWS[UI.view] ? UI.view : "dashboard";
  const c = company(); const ss = syncState();
  app.innerHTML = `<div class="shell">
    <aside class="side" aria-label="Menu principal">
      <div class="brand"><span class="mark">${ic("win", 19)}</span><div><b>Gestion Aluminium</b><span>GestiOne · TEMPS</span></div></div>
      ${NAV.map(([g, items]) => `<div class="sgroup">${g}</div>${items.map(([id, l, i, p]) => `<button class="slink ${UI.view === id ? "on" : ""} ${p && !can(p) ? "lock" : ""}" data-a="go" data-v="${id}">${ic(p && !can(p) ? "lock" : i, 17)}<span>${l}</span></button>`).join("")}`).join("")}
      <button class="slink" data-a="logout" style="margin-top:10px">${ic("out", 17)}<span>Déconnexion</span></button>
    </aside>
    <div style="min-width:0;display:flex;flex-direction:column">
      <header class="top">
        <div class="barsel" style="cursor:default"><span class="logo" style="background:${esc(db().settings.color || "#0E7C86")};color:#fff">${c.logo ? `<img src="${c.logo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:11px">` : ini(c.name)}</span><span class="bt"><b>${esc(c.name)}</b>${licTag()}</span></div>
        <button class="conn st-${ss[0]}" data-a="go" data-v="sauvegardes" data-tip="${esc(ss[2])}"><i></i>${ss[1]}</button>
        <button class="ib hide-sm" data-a="refresh" aria-label="Synchroniser maintenant">${H.sync && H.sync.busy ? '<span class="load"></span>' : ic("refresh", 17)}</button>
        <button class="ib" data-a="theme" aria-label="${MODE === "nuit" ? "Passer en mode clair" : "Passer en mode nuit"}">${ic(MODE === "nuit" ? "sun" : "moon", 17)}</button>
        <button class="ib hide-sm" data-a="go" data-v="profil" aria-label="Mon compte" style="font-weight:800;font-size:13px;color:var(--amber2)">${ini(me().name)}</button>
      </header>
      <main class="content">${lic().st !== "expired" && lic().days <= 10 && role() === "administrateur" && UI.view !== "licence" ? `<div class="note warn" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>${esc(lic().label)}. Sans licence, l'entreprise sera verrouillée à l'échéance.</span><button class="btn b-amb" style="min-height:34px;padding:4px 12px" data-a="go" data-v="licence">Voir les offres</button></div>` : ""}${ss[0] === "off" ? `<div class="note warn">Hors connexion : vous pouvez continuer. Les devis, prestations et tarifs sont enregistrés sur cet appareil et seront envoyés au retour du réseau.</div>` : ""}${VIEWS[v]()}</main>
    </div>
  </div>
  <nav class="bnav" aria-label="Navigation">${[["dashboard", "Accueil", "home"], ["devis", "Devis", "file"], ["nouveau", "Nouveau", "plus"], ["catalogue", "Catalogue", "win"], ["menu", "Menu", "menu"]].map(([id, l, i]) => `<button class="${UI.view === id || (id === "menu" && !["dashboard", "devis", "nouveau", "catalogue"].includes(UI.view)) ? "on" : ""} ${id === "nouveau" ? "bplus" : ""}" data-a="go" data-v="${id}">${ic(i, id === "nouveau" ? 22 : 20)}${l}</button>`).join("")}</nav>`;
  drawLayer();
  afterRender();
}
let pendingRender = false;
function safeRender() {
  if (destroyed) return;
  const a = document.activeElement;
  if (UI.sheet || (a && root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) { pendingRender = true; return; }
  pendingRender = false; render();
}

/* ============================== Vues ============================== */
const VIEWS = {};
VIEWS.menu = () => `${head("Menu", "Toutes les pages de Gestion Aluminium.")}${NAV.map(([g, items]) => `<h2>${g}</h2><div class="menu-grid">${items.map(([id, l, i, p]) => `<button class="mi ${p && !can(p) ? "lock" : ""}" data-a="go" data-v="${id}"><span>${ic(p && !can(p) ? "lock" : i, 20)}</span>${l}</button>`).join("")}</div>`).join("")}<button class="btn b-crit" data-a="logout">${ic("out", 17)}Déconnexion</button>`;

VIEWS.dashboard = () => {
  const d = db(); const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0); const t0 = m0.getTime();
  const qs = d.quotes.filter((q) => !q.deleted && q.status !== "brouillon");
  const month = qs.filter((q) => (q.finalAt || q.createdAt) >= t0);
  const acc = qs.filter((q) => q.status === "accepte"); const sentQ = qs.filter((q) => q.status === "envoye");
  const decided = qs.filter((q) => ["accepte", "refuse"].includes(q.status));
  const rate = decided.length ? Math.round((acc.length / decided.length) * 100) : null;
  const draft = readDraft(); const unsynced = qs.filter((q) => !q.num).length;
  const recent = d.quotes.filter((q) => !q.deleted).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 6);
  const ss = syncState();
  return `${head("Tableau de bord", `${esc(company().name)} · ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`, can("devis_creer") ? `<button class="btn b-amb" data-a="go" data-v="nouveau">${ic("plus", 17)}Nouveau devis</button>` : "")}
  ${draft && can("devis_creer") ? `<div class="note" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>Un devis en cours de saisie est conservé sur cet appareil${draft.client && draft.client.name ? " pour " + esc(draft.client.name) : ""} (${draft.lines.length} ligne${draft.lines.length > 1 ? "s" : ""}).</span><button class="btn b-amb" style="min-height:36px;padding:4px 12px" data-a="go" data-v="nouveau">Reprendre</button></div>` : ""}
  ${unsynced ? `<div class="note warn">${unsynced} devis ${unsynced > 1 ? "attendent" : "attend"} leur numéro officiel : ${ss[0] === "off" ? "ils sont enregistrés sur cet appareil. Connectez-vous à Internet dès que possible : une donnée jamais synchronisée est perdue si le téléphone est perdu." : "synchronisation en cours."}</div>` : ""}
  <div class="kpis">
    <div class="kpi hero"><small>Devis du mois · ${month.length} devis</small><b class="num">${money(month.reduce((a, q) => a + (q.kind === "total" ? 0 : q.total || 0), 0))}</b><i>${acc.length} accepté${acc.length > 1 ? "s" : ""} au total · taux d'acceptation ${rate == null ? "—" : rate + " %"}</i></div>
    <div class="kpi"><small>Acceptés</small><b class="num">${money(acc.reduce((a, q) => a + (q.kind === "total" ? 0 : q.total || 0), 0))}</b><i>${acc.length} devis</i></div>
    <div class="kpi"><small>En attente de réponse</small><b class="num">${money(sentQ.reduce((a, q) => a + (q.kind === "total" ? 0 : q.total || 0), 0))}</b><i>${sentQ.length} envoyé${sentQ.length > 1 ? "s" : ""}</i></div>
    <div class="kpi"><small>Clients</small><b class="num">${nb(d.clients.filter((c) => !c.deleted).length)}</b><i>fiches enregistrées</i></div>
    <div class="kpi"><small>Catalogue</small><b class="num">${nb(d.services.filter((s) => !s.deleted).length)}</b><i>${nb(d.prices.filter((p) => !p.deleted).length)} tarifs mémorisés</i></div>
  </div>
  <div class="grid g2">
    <div class="card"><div class="ph"><h2>Derniers devis</h2><button class="btn b-sec" style="min-height:34px;padding:4px 12px" data-a="go" data-v="devis">Tout voir</button></div>${recent.length ? recent.map((q) => `<button class="row" style="width:100%;text-align:left" data-a="openq" data-id="${q.id}"><span><b>${esc(qNum(q))}</b> · ${esc((q.client && q.client.name) || "Client")}<br><span class="small">${dt(q.updatedAt || q.createdAt)}</span></span><span style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><b class="num">${money(q.total || 0)}</b>${stTag(q)}</span></button>`).join("") : `<div class="small">Aucun devis pour le moment. Commencez par « Nouveau devis » : le catalogue se construit au fil de vos devis.</div>`}</div>
    <div class="card"><h2>État des données</h2><div class="row"><span>Connexion</span><span class="tag ${ss[0] === "ok" ? "t-good" : ss[0] === "off" ? "t-crit" : "t-warn"}">${ss[1]}</span></div><div class="row"><span>Détail</span><span class="small">${esc(ss[2])}</span></div><div class="row"><span>Sauvegarde serveur</span><b>Chaque nuit</b></div><div class="small" style="margin-top:6px">Les données synchronisées sont conservées sur le serveur GestiOne : en cas de perte du téléphone, reconnectez l'entreprise sur un nouvel appareil pour les retrouver.</div></div>
  </div>`;
};

/* ---------- Historique des devis ---------- */
function quotesFiltered() {
  const f = UI.flt; let list = db().quotes.filter((q) => !q.deleted);
  if (f.st) list = list.filter((q) => q.status === f.st);
  if (f.by) list = list.filter((q) => q.createdBy === f.by);
  if (f.q) { const s = norm(f.q); list = list.filter((q) => norm(qNum(q)).includes(s) || norm(q.client && q.client.name).includes(s) || norm(q.chantier).includes(s) || norm(q.objet).includes(s)); }
  const k = f.sort || "recent";
  return list.slice().sort((a, b) => (k === "ancien" ? (a.createdAt || 0) - (b.createdAt || 0) : k === "montant" ? (b.total || 0) - (a.total || 0) : k === "client" ? norm(a.client && a.client.name).localeCompare(norm(b.client && b.client.name)) : (b.updatedAt || 0) - (a.updatedAt || 0)));
}
VIEWS.devis = () => {
  const list = quotesFiltered(); const f = UI.flt; const users = [...new Set(db().quotes.map((q) => q.createdBy).filter(Boolean))];
  const shown = list.slice(0, UI.lim); const active = ["q", "st", "by"].some((k) => f[k]);
  return `${head("Historique des devis", `${list.length} devis${active ? " (filtrés)" : ""} · total ${moneyT(list.filter((q) => !["annule", "brouillon"].includes(q.status)).reduce((a, q) => a + (q.kind === "total" ? 0 : q.total || 0), 0))}`, can("devis_creer") ? `<button class="btn b-amb" data-a="go" data-v="nouveau">${ic("plus", 17)}Nouveau devis</button>` : "")}
  <form novalidate class="card fgrid" data-f="qflt">
    <div class="field"><label for="fq">Rechercher</label><input class="inp" id="fq" name="q" value="${esc(f.q || "")}" placeholder="N°, client, chantier ou objet"></div>
    <div class="field"><label for="fs">Statut</label><select class="inp" id="fs" name="st"><option value="">Tous</option>${Object.entries(STATUSES).map(([k, [l]]) => `<option value="${k}" ${f.st === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field"><label for="fb">Créé par</label><select class="inp" id="fb" name="by"><option value="">Tous</option>${users.map((u) => `<option ${f.by === u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></div>
    <div class="field"><label for="fo">Trier par</label><select class="inp" id="fo" name="sort"><option value="recent">Dernière modification</option><option value="ancien" ${f.sort === "ancien" ? "selected" : ""}>Plus anciens</option><option value="montant" ${f.sort === "montant" ? "selected" : ""}>Montant décroissant</option><option value="client" ${f.sort === "client" ? "selected" : ""}>Client (A → Z)</option></select></div>
    <div class="acts" style="align-self:end"><button class="btn b-amb">Appliquer</button>${active ? `<button type="button" class="btn b-sec" data-a="qreset">Effacer</button>` : ""}</div>
  </form>
  ${list.length ? `<div class="tw vtable"><table><thead><tr><th>Numéro</th><th>Client</th><th>Date</th><th class="r">Montant</th><th>Statut</th><th>Créé par</th><th>Dernière modification</th></tr></thead><tbody>${shown.map((q) => `<tr class="click" data-a="openq" data-id="${q.id}"><td class="num"><b>${esc(qNum(q))}</b>${q.version > 1 ? ` <span class="small">v${q.version}</span>` : ""}</td><td>${esc((q.client && q.client.name) || "—")}</td><td class="num">${dFR(q.finalAt || q.createdAt)}</td><td class="r num">${money(q.total || 0)}</td><td>${stTag(q)} ${syncTag(q)}</td><td>${esc(q.createdBy || "—")}</td><td class="num">${dt(q.updatedAt || q.createdAt)}</td></tr>`).join("")}</tbody></table></div>
  <div class="vcards">${shown.map((q) => `<div class="vcard" data-a="openq" data-id="${q.id}" role="button" tabindex="0"><div class="vc1"><b class="num">${esc(qNum(q))}</b><b class="num">${money(q.total || 0)}</b></div><div class="vc2"><span>${esc((q.client && q.client.name) || "Client")} · ${dS(q.finalAt || q.createdAt)}</span>${stTag(q)}</div><div class="vc2"><span>${esc(q.createdBy || "")} · modifié ${ago(q.updatedAt || q.createdAt)}</span>${syncTag(q)}</div></div>`).join("")}</div>
  ${list.length > UI.lim ? `<button class="btn b-sec full" data-a="qmore">Afficher plus · ${list.length - UI.lim} restant(s)</button>` : ""}` : emptyS("Aucun devis", active ? "Aucun devis ne correspond à ces filtres." : "Les devis finalisés et les brouillons enregistrés apparaîtront ici.", can("devis_creer") ? `<button class="btn b-amb" data-a="go" data-v="nouveau">Créer un devis</button>` : "")}`;
};

/* ---------- Fiche d'un devis ---------- */
VIEWS.fiche = () => {
  const q = quote(UI.qid); if (!q) return emptyS("Devis introuvable", "Il a peut-être été supprimé sur un autre appareil.", `<button class="btn b-sec" data-a="go" data-v="devis">Retour à l'historique</button>`);
  const v = qVer(q) || q; const docs = (q.docs || []).slice().reverse();
  const editable = can("devis_modifier") && !["annule"].includes(q.status);
  return `${head(`${q.kind === "total" ? "Devis total" : "Devis"} ${esc(qNum(q))}`, `${esc((q.client && q.client.name) || "Client")}${q.chantier ? " · " + esc(q.chantier) : ""} · version ${q.version || 1}`, `<button class="btn b-sec" data-a="go" data-v="devis">${ic("list", 16)}Historique</button>`)}
  <div class="card" style="display:flex;flex-direction:column;gap:10px">
    <div class="ph"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${stTag(q)}${syncTag(q)}${q.num ? '<span class="tag t-good">Numéro officiel</span>' : ""}</div><b class="num" style="font-size:22px">${money(q.total || 0)}</b></div>
    <div class="acts">${q.status !== "brouillon" && can("documents") ? `<button class="btn b-amb" data-a="pdfopen" data-id="${q.id}">${ic("file", 16)}Choisir le modèle et le PDF</button><button class="btn b-sec" data-a="pdfdl" data-id="${q.id}">${ic("download", 16)}Télécharger le PDF</button><button class="btn b-sec" data-a="pdfprint" data-id="${q.id}">${ic("print", 16)}Imprimer</button>` : ""}${editable && q.kind !== "total" ? `<button class="btn b-sec" data-a="qedit" data-id="${q.id}">${ic("edit", 16)}${q.status === "brouillon" ? "Reprendre le brouillon" : "Modifier"}</button>` : ""}${can("devis_creer") && q.kind !== "total" ? `<button class="btn b-sec" data-a="qdup" data-id="${q.id}">${ic("copy", 16)}Dupliquer</button>` : ""}</div>
    ${can("devis_modifier") && q.status !== "brouillon" ? `<div class="chips" aria-label="Statut">${["finalise", "envoye", "accepte", "refuse", "expire", "annule"].map((k) => `<button class="chip ${q.status === k ? "on" : ""}" data-a="qstatus" data-id="${q.id}" data-s="${k}">${STATUSES[k][0]}</button>`).join("")}</div>` : ""}
  </div>
  <div class="grid g2">
    <div class="card"><h2>Client et chantier</h2><div class="row"><span>Client</span><b>${esc((v.client && v.client.name) || "—")}</b></div>${v.client && v.client.phone ? `<div class="row"><span>Téléphone</span><b>${esc(v.client.phone)}</b></div>` : ""}${v.chantier ? `<div class="row"><span>Chantier</span><b>${esc(v.chantier)}</b></div>` : ""}${v.objet ? `<div class="row"><span>Objet</span><b>${esc(v.objet)}</b></div>` : ""}<div class="row"><span>Validité</span><b>${v.validity || 30} jours</b></div></div>
    <div class="card"><h2>Traçabilité</h2><div class="row"><span>Créé par</span><b>${esc(q.createdBy || "—")}</b></div><div class="row"><span>Créé le</span><b>${dt(q.createdAt)}</b></div><div class="row"><span>Dernière modification</span><b>${dt(q.updatedAt || q.createdAt)}</b></div>${q.updatedBy ? `<div class="row"><span>Par</span><b>${esc(q.updatedBy)}</b></div>` : ""}<div class="row"><span>Identifiant</span><b class="num small">${esc(q.id)}</b></div></div>
  </div>
  ${q.kind === "total" ? totalCard(q, v) : `<div class="card"><h2>Lignes du devis</h2>${linesTable(v.lines || [], v)}</div>`}
  ${q.kind !== "total" && ACTIVE_ST.includes(q.status) ? (() => { const t = totalOf(q); const n = db().quotes.filter((x) => !x.deleted && x.kind !== "total" && ACTIVE_ST.includes(x.status) && sameClient(x, q)).length; return t ? `<div class="note" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>Inclus dans le devis total des travaux ${esc(qNum(t))} (${(t.sources || []).length} devis · ${moneyT(t.total)}).</span><button class="btn b-sec" style="min-height:34px;padding:4px 12px" data-a="openq" data-id="${t.id}">Ouvrir le total</button></div>` : n >= 2 && can("devis_creer") ? `<div class="note"><button class="btn b-amb" data-a="totmake" data-id="${q.id}">Créer le devis total des travaux (${n} devis)</button></div>` : ""; })() : ""}
  ${(q.versions || []).length ? `<div class="card"><h2>Versions</h2>${q.versions.slice().reverse().map((x) => `<div class="row"><span><b>Version ${x.v}</b> · ${dt(x.at)} · ${esc(x.by)}<br><span class="small">${esc(x.reason || "")}</span></span><span class="acts"><b class="num">${money(x.total || 0)}</b>${can("documents") ? `<button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="pdfopen" data-id="${q.id}" data-v="${x.v}">Voir</button>` : ""}</span></div>`).join("")}</div>` : ""}
  ${docs.length ? `<div class="card"><h2>Documents PDF archivés</h2>${docs.map((x) => `<div class="row"><span>${esc(THEMES.find((t) => t[0] === x.theme)?.[1] || x.theme)} · version ${x.v}<br><span class="small">${dt(x.at)} · ${esc(x.by)} · ${x.pages} page${x.pages > 1 ? "s" : ""}${x.kind ? " · " + esc(x.kind) : ""}</span></span><span class="acts"><button class="ib" data-a="pdfdl" data-id="${q.id}" data-v="${x.v}" data-t="${x.theme}" aria-label="Télécharger">${ic("download", 16)}</button><button class="ib" data-a="pdfprint" data-id="${q.id}" data-v="${x.v}" data-t="${x.theme}" aria-label="Imprimer">${ic("print", 16)}</button></span></div>`).join("")}<div class="small" style="margin-top:6px">Chaque document est reconstruit à l'identique à partir de la version archivée (lignes, prix et coordonnées figés au moment de sa création).</div></div>` : ""}`;
};
function totalCard(q, v) {
  const all = db().quotes.filter((x) => !x.deleted && x.kind !== "total" && ACTIVE_ST.includes(x.status) && sameClient(x, q)); const ex = new Set(q.excluded || []); const src = v.sources || q.sources || [];
  return `<div class="card"><h2>Devis inclus dans le total</h2>${src.map((s) => `<div class="row"><span><span style="font-weight:700;overflow-wrap:anywhere">${esc((s.title || "").toUpperCase())}</span><br><span class="small">${esc(s.num || s.tempNum || "")}${s.pieces ? ` · ${nb(s.pieces)} élément(s)` : ""}</span></span><b class="num">${money(s.amount)}</b></div>`).join("")}<div class="row" style="font-size:16px"><span><b>Total des travaux</b></span><b class="num">${money(v.total || 0)}</b></div></div>
  ${can("devis_modifier") ? `<div class="card"><h2>Composition</h2><div class="small" style="margin:6px 0">Le total se met à jour tout seul quand un devis de ce client est finalisé, modifié, refusé ou annulé. Vous pouvez exclure un devis.</div>${all.map((x) => `<div class="row"><span>${esc(qNum(x))} · ${esc(quoteTitle(x))}<br><span class="small">${STATUSES[x.status][0]} · ${moneyT(x.total)}</span></span><button class="switch ${ex.has(x.id) ? "" : "on"}" data-a="totinc" data-id="${q.id}" data-q="${x.id}" role="switch" aria-checked="${!ex.has(x.id)}" aria-label="Inclure ${esc(qNum(x))}"></button></div>`).join("")}</div>` : ""}`;
}
function linesTable(lines, v) {
  if (!lines.length) return `<div class="small">Aucune ligne.</div>`;
  const cards = `<div class="vcards">${lines.map((l) => `<div class="vcard" style="cursor:default"><div class="vc1"><b style="min-width:0;overflow-wrap:anywhere;white-space:normal">${esc(l.name)}</b><b class="num">${money(l.amount)}</b></div><div class="vc2"><span>${dimTxt(l.wmm, l.hmm, l.unit, l.mode)} · Qté ${nb(l.qty)} · ${modeOf(l.mode)[1]}</span></div>${l.techLabel ? `<div class="small">${esc(l.techLabel)}</div>` : ""}<div class="vc2"><span>${moneyT(l.price)} ${priceUnitLabel(l.mode)}</span></div></div>`).join("")}</div>`;
  return `${cards}<div class="tw vtable"><table><thead><tr><th>Prestation</th><th>Dimensions</th><th class="r">Qté</th><th>Calcul</th><th class="r">Prix unitaire</th><th class="r">Montant</th></tr></thead><tbody>${lines.map((l) => `<tr><td><b>${esc(l.name)}</b>${l.techLabel ? `<br><span class="small">${esc(l.techLabel)}</span>` : ""}</td><td class="num">${dimTxt(l.wmm, l.hmm, l.unit, l.mode)}</td><td class="r num">${nb(l.qty)}</td><td>${modeOf(l.mode)[1]}${l.mode === "m2" ? ` · ${nb(measure("m2", l.wmm, l.hmm) * l.qty, 2)} m²` : l.mode === "ml" ? ` · ${nb(measure("ml", l.wmm) * l.qty, 2)} ml` : ""}</td><td class="r num">${money(l.price)}</td><td class="r num"><b>${money(l.amount)}</b></td></tr>`).join("")}</tbody></table></div>
  ${v && can("finances") ? `<div style="display:flex;flex-direction:column;gap:2px;margin-top:10px;max-width:360px;margin-left:auto">${totalsRows(v)}</div>` : ""}`;
}
function totalsRows(v) {
  return `<div class="row"><span>Sous-total</span><b class="num">${F(v.subtotal || 0)}</b></div>${v.discount ? `<div class="row"><span>Remise</span><b class="num">− ${F(v.discount)}</b></div>` : ""}${v.taxOn ? `<div class="row"><span>${esc(v.taxLabel || "Taxe")} (${nb(v.taxRate, 2).replace(/,00$/, "")} %)</span><b class="num">${F(v.tax || 0)}</b></div>` : ""}<div class="row" style="font-size:16px"><span><b>Total${v.taxOn ? " TTC" : ""}</b></span><b class="num">${F(v.total || 0)}</b></div>`;
}

/* ============================== Nouveau devis (assistant) ============================== */
const DRAFT_KEY = () => `alu-draft:${H.shop.id}:${me() ? me().id : "x"}`;
function readDraft() { try { const v = JSON.parse(localStorage.getItem(DRAFT_KEY()) || "null"); return v && v.id ? v : null; } catch (e) { return null; } }
let draftT = null;
function keepDraft() { clearTimeout(draftT); draftT = setTimeout(() => { try { if (UI.wiz) localStorage.setItem(DRAFT_KEY(), JSON.stringify(UI.wiz)); } catch (e) { /* stockage plein ou indisponible */ } }, 150); }
function dropDraft() { try { localStorage.removeItem(DRAFT_KEY()); } catch (e) { /* ignore */ } }
const newEd = (keep) => ({ sq: keep ? keep.sq : "", serviceId: keep ? keep.serviceId : null, name: keep ? keep.name : "", creating: false, ns: { cat: "", desc: "" }, tech: keep ? clone(keep.tech) : [], techOpen: false, unit: keep ? keep.unit : "cm", mode: keep ? keep.mode : "piece", w: "", h: "", qty: "1", price: "", custom: false, idx: null, photoSkip: keep ? keep.photoSkip : false });
function newWiz(from) {
  const st = db().settings;
  const w = { id: uid("q"), editId: null, baseRev: 0, step: 1, clientId: null, client: { name: "", phone: "", email: "", address: "" }, newClient: false, chantier: "", objet: "", lines: [], ed: newEd(), discount: "", taxOn: !!(st.tax && st.tax.on), notes: "", validity: st.validity || 30, startedAt: Date.now() };
  if (from) Object.assign(w, from);
  return w;
}
function wizFromQuote(q, dup) {
  const v = qVer(q) || q;
  return newWiz({ id: dup ? uid("q") : q.id, editId: dup ? null : q.id, baseRev: dup ? 0 : q.rev || 1, step: dup ? 1 : 2, clientId: v.clientId || q.clientId || null, client: clone(v.client || { name: "" }), chantier: v.chantier || "", objet: v.objet || "", lines: clone(v.lines || []).map((l) => (dup ? { ...l, id: uid("l") } : l)), discount: v.discount ? String(v.discount) : "", taxOn: !!v.taxOn, notes: v.notes || "", validity: v.validity || 30, wasStatus: dup ? null : q.status });
}
const W = () => UI.wiz;
const PHONE_OK = (p) => !p || /^\d{10,15}$/.test(p);
const MAIL_OK = (m) => !m || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(m);
function fieldErr(sel, msg) { const el = $(sel); if (!el) { toast(msg, "err"); return false; } el.classList.add("err"); const box = el.closest(".field") || el.parentNode; box.querySelectorAll(".ferr").forEach((x) => x.remove()); const m = document.createElement("div"); m.className = "ferr"; m.textContent = msg; box.appendChild(m); el.focus(); toast(msg, "err"); return false; }
function checkClient(c, ids) {
  if (!String(c.name || "").trim()) return fieldErr(ids.name, "Le nom du client est obligatoire.");
  if (!PHONE_OK(String(c.phone || "").trim())) return fieldErr(ids.phone, "Le téléphone doit contenir uniquement des chiffres, au moins 10.");
  if (!MAIL_OK(String(c.email || "").trim())) return fieldErr(ids.email, "Adresse e-mail invalide (exemple : nom@exemple.com).");
  return true;
}
function totalsOf(w) {
  const st = db().settings; const sub = w.lines.reduce((a, l) => a + (l.amount || 0), 0);
  const disc = Math.min(sub, Math.max(0, Math.round(num(w.discount) || 0))); const base = sub - disc;
  const rate = Number(st.tax && st.tax.rate) || 0; const tax = w.taxOn ? Math.round((base * rate) / 100) : 0;
  return { subtotal: sub, discount: disc, taxOn: !!w.taxOn, taxRate: rate, taxLabel: (st.tax && st.tax.label) || "TVA", tax, total: base + tax };
}
const stepsBar = (s) => `<div class="wsteps">${[["Client", 1], ["Prestations et dimensions", 2], ["Récapitulatif", 3]].map(([l, n]) => `<button class="wstep ${s === n ? "on" : s > n ? "ok" : ""}" data-a="wstep" data-n="${n}" ${n > s && !(n === 3 && W().lines.length) && !(n === 2 && W().client.name) ? "disabled" : ""}><i>${s > n ? ic("check", 13, 3) : n}</i><span>${l}</span></button>`).join("")}</div>`;

VIEWS.nouveau = () => {
  if (!can("devis_creer") && !(UI.wiz && UI.wiz.editId && can("devis_modifier"))) return locked("Nouveau devis");
  if (!UI.wiz) { const d = readDraft(); UI.wiz = d || newWiz(); if (d) UI.restored = true; }
  const w = W();
  return `${head(w.editId ? `Modifier le devis ${esc(qNum(quote(w.editId) || {}))}` : "Nouveau devis", w.editId ? "Les modifications créeront une nouvelle version ; l'ancienne reste consultable." : "Le brouillon est conservé sur cet appareil à chaque saisie, même sans connexion.", `<button class="btn b-sec" data-a="wcancel">${ic("x", 16)}${w.editId ? "Annuler la modification" : "Abandonner"}</button>`)}
  ${UI.restored ? `<div class="note">Brouillon retrouvé sur cet appareil : vous reprenez là où vous vous étiez arrêté.</div>` : ""}
  ${stepsBar(w.step)}
  ${w.step === 1 ? stepClient(w) : w.step === 2 ? stepLines(w) : stepRecap(w)}`;
};

/* ---------- Étape 1 : client ---------- */
function stepClient(w) {
  const n = db().clients.filter((c) => !c.deleted).length;
  return `<div class="grid g2">
  <div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="chead"><h2>1. Choisir un client</h2><button type="button" class="btn b-amb cbtn" data-a="clientsheet">${ic("users", 15)}Liste des clients${n ? `<span class="cnt">${n}</span>` : ""}</button></div>
    ${w.clientId ? `<div class="selcli"><span class="mark" style="width:42px;height:42px;font-size:15px">${ini(w.client.name)}</span><span style="min-width:0;flex:1"><b>${esc(w.client.name)}</b><span class="small">Client existant · ses informations modifiées ci-dessous seront mises à jour</span></span><button type="button" class="ib" data-a="wclientclear" aria-label="Retirer ce client">${ic("x", 16)}</button></div>` : `<div class="small">${n ? "Ouvrez la liste pour retrouver un client et l'historique de ses devis, ou créez-en un nouveau." : "Aucun client enregistré : créez le premier ci-contre, il sera mémorisé pour les prochains devis."}</div>`}
  </div>
  <form novalidate class="card" data-f="wclient" style="display:flex;flex-direction:column;gap:10px"><h2>${w.clientId ? "Informations du client" : "Ou créer un nouveau client"}</h2>
    <div class="fgrid"><div class="field"><label for="wc1">Nom du client *</label><input class="inp" id="wc1" name="name" data-w="client.name" value="${esc(w.client.name)}" required placeholder="M. Kouassi Yao"></div>
    <div class="field"><label for="wc2">Téléphone <span class="opt">facultatif · 10 chiffres minimum</span></label><input class="inp num" id="wc2" name="phone" data-w="client.phone" data-digits type="tel" inputmode="numeric" maxlength="15" autocomplete="off" value="${esc(w.client.phone || "")}" placeholder="0707070707"></div>
    <div class="field"><label for="wc3">E-mail <span class="opt">facultatif</span></label><input class="inp" id="wc3" name="email" data-w="client.email" type="email" inputmode="email" autocomplete="off" value="${esc(w.client.email || "")}" placeholder="nom@exemple.com"></div>
    <div class="field"><label for="wc4">Adresse</label><input class="inp" id="wc4" name="address" data-w="client.address" value="${esc(w.client.address || "")}"></div></div>
    <h2 style="margin-top:6px">Chantier</h2>
    <div class="fgrid"><div class="field"><label for="wc5">Adresse ou nom du chantier</label><input class="inp" id="wc5" name="chantier" data-w="chantier" value="${esc(w.chantier)}" list="wchl" placeholder="Villa Cocody Angré"><datalist id="wchl">${(client(w.clientId) && client(w.clientId).chantiers || []).map((c) => `<option value="${esc(c.label)}">`).join("")}</datalist></div>
    ${objField(w)}</div>
    <button class="btn b-amb">Continuer ${ic("chev", 16)}</button>
  </form></div>`;
}
// Intitulé du devis : si le catalogue contient des prestations, un toucher ouvre la liste complète.
function objField(w) {
  const n = db().services.filter((s) => !s.deleted).length;
  if (!n) return `<div class="field"><label for="wc6">Intitulé du devis *</label><input class="inp" id="wc6" name="objet" data-w="objet" value="${esc(w.objet)}" placeholder="Balcon en inox avec vitre 8 mm" aria-required="true" autocomplete="off"><span class="small">Cette première prestation sera ajoutée au catalogue.</span></div>`;
  const s = w.ed && w.ed.serviceId ? svc(w.ed.serviceId) : null; const p = s && mainPhoto(s.id);
  return `<div class="field"><label for="wc6">Intitulé du devis *</label><button type="button" class="objpick ${w.objet ? "on" : ""}" id="wc6" data-a="objsheet" aria-haspopup="dialog">${w.objet ? `<span class="oth">${p ? `<img data-photo="${p.id}" alt="">` : ic("win", 18)}</span><span class="ot"><b>${esc(w.objet)}</b><span class="small">${s ? esc([s.cat || "Sans catégorie", modeOf(s.mode)[1]].join(" · ")) : "Nouvel intitulé · ajouté au catalogue"}</span></span><span class="oc">Changer</span>` : `<span class="oth ph">${ic("win", 18)}</span><span class="ot"><b class="ph">Choisir une prestation</b><span class="small">${n} prestation${n > 1 ? "s" : ""} enregistrée${n > 1 ? "s" : ""} · ou saisir un nouvel intitulé</span></span>${ic("chev", 18)}`}</button></div>`;
}
const clientList = (list, w) => list.length ? list.map((c) => `<button class="row" style="width:100%;text-align:left" data-a="wpickclient" data-id="${c.id}"><span><b>${esc(c.name)}</b><br><span class="small">${esc([c.phone, c.address].filter(Boolean).join(" · ") || "Sans coordonnées")}</span></span>${w.clientId === c.id ? '<span class="tag t-good">Choisi</span>' : ic("chev", 16)}</button>`).join("") : `<div class="small">${db().clients.length ? "Aucun client ne correspond." : "Aucun client enregistré : créez-le à droite, il sera mémorisé pour les prochains devis."}</div>`;

/* ---------- Étape 2 : lignes ---------- */
function stepLines(w) {
  const e = w.ed; const s = e.serviceId ? svc(e.serviceId) : null; const t = totalsOf(w);
  return `<div class="card led" style="display:flex;flex-direction:column;gap:12px">
    <div class="ph"><h2>${e.idx != null ? "Modifier la ligne " + (e.idx + 1) : "2. Ajouter une prestation"}</h2>${e.serviceId || e.name ? `<button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="wnewsvc">Autre prestation</button>` : ""}</div>
    ${!e.serviceId && !e.lockedName ? `<div class="field"><label for="ed-svc">Prestation</label><input class="inp" id="ed-svc" data-e="sq" value="${esc(e.sq)}" placeholder="Fenêtre coulissante, porte, garde-corps…" autocomplete="off" data-enter="svc"></div><div id="svcl">${svcList(e)}</div>${e.creating ? createSvcPanel(e) : ""}`
    : `<div class="selsvc">${photoSlot(s, e)}<div style="min-width:0;flex:1"><b style="font-size:15px">${esc(s ? s.name : e.name)}</b><div class="small">${s ? esc(s.cat || "Sans catégorie") + " · " + modeOf(e.mode)[1] : "Prestation hors catalogue"}</div></div></div>
    ${s && !mainPhoto(s.id) && !e.photoSkip && can("catalogue") ? `<div class="phask"><span class="small">Photo de la prestation (facultative)</span><span class="acts" style="flex-wrap:nowrap"><label class="btn b-sec mini">${ic("camera", 15)}Prendre<input type="file" accept="image/*" capture="environment" data-photo-for="${s.id}" hidden></label><label class="btn b-sec mini">${ic("image", 15)}Choisir<input type="file" accept="image/*" data-photo-for="${s.id}" hidden></label><button type="button" class="btn b-sec mini" data-a="wphotoskip">Passer</button></span></div>` : ""}
    <div class="techbox"><div class="ph"><span class="flabel">Caractéristiques techniques</span><button type="button" class="btn b-sec" style="min-height:32px;padding:3px 10px" data-a="wtech">${e.techOpen ? "Fermer" : cleanTech(e.tech).length ? "Modifier" : "Ajouter"}</button></div>${e.techOpen ? techEditor(e.tech, "e") : `<div class="small">${cleanTech(e.tech).length ? esc(techLabel(e.tech)) : "Aucune (facultatif). Elles servent à retrouver le bon tarif."}</div>`}</div>
    <div class="fgrid dims">
      <div class="field"><label for="ed-mode">Mode de calcul</label><select class="inp" id="ed-mode" data-e="mode">${MODES.map(([k, l]) => `<option value="${k}" ${e.mode === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      ${needsW(e.mode) ? `<div class="field"><span class="flabel">Unité</span><div class="chips">${UNITS.map(([k, l]) => `<button type="button" class="chip ${e.unit === k ? "on" : ""}" data-a="wunit" data-u="${k}">${l}</button>`).join("")}</div></div>
      <div class="field"><label for="ed-w">${e.mode === "ml" ? "Longueur" : "Largeur"} (${e.unit})</label><input class="inp num" id="ed-w" data-e="w" inputmode="decimal" value="${esc(e.w)}" data-enter="w" autocomplete="off"></div>` : ""}
      ${needsH(e.mode) ? `<div class="field"><label for="ed-h">Hauteur (${e.unit})</label><input class="inp num" id="ed-h" data-e="h" inputmode="decimal" value="${esc(e.h)}" data-enter="h" autocomplete="off"></div>` : ""}
      <div class="field"><label for="ed-q">Quantité</label><input class="inp num" id="ed-q" data-e="qty" inputmode="numeric" value="${esc(e.qty)}" data-enter="qty" autocomplete="off"></div>
    </div>
    <div id="pbox">${priceBox(e)}</div>`}
  </div>
  <div class="card"><div class="ph"><h2>Lignes du devis (${w.lines.length})</h2>${w.lines.length && can("finances") ? `<b class="num">${F(t.subtotal)}</b>` : ""}</div>
  ${w.lines.length ? w.lines.map((l, i) => `<div class="qline ${e.idx === i ? "on" : ""}"><div class="qm"><b>${i + 1}. ${esc(l.name)}</b><span class="small nw">${[dimTxt(l.wmm, l.hmm, l.unit, l.mode), "Qté " + nb(l.qty), modeOf(l.mode)[1]].filter((x) => x && x !== "—").join(" · ")}</span>${l.techLabel ? `<span class="small">${esc(l.techLabel)}</span>` : ""}<span class="small nw">${moneyT(l.price)} ${priceUnitLabel(l.mode)}</span>${l.refNote ? `<span class="small" style="color:var(--warn)">${esc(l.refNote)}</span>` : ""}</div><div class="qr"><b class="num">${moneyT(l.amount)}</b><span class="acts" style="flex-wrap:nowrap"><button class="ib" data-a="wledit" data-i="${i}" aria-label="Modifier la ligne">${ic("edit", 16)}</button><button class="ib" data-a="wldel" data-i="${i}" aria-label="Supprimer la ligne">${ic("trash", 16)}</button></span></div></div>`).join("") : `<div class="small">Aucune ligne pour l'instant. Saisissez une prestation et ses dimensions : la touche Entrée passe au champ suivant, puis ajoute la ligne.</div>`}
  </div>
  <div class="acts"><button class="btn b-sec" data-a="wstep" data-n="1">${ic("chev", 16)} Client</button><button class="btn b-amb" data-a="wstep" data-n="3" ${w.lines.length ? "" : "disabled"}>Vérifier le devis ${ic("chev", 16)}</button></div>`;
}
function svcList(e) {
  const q = norm(e.sq); const all = db().services.filter((s) => !s.deleted);
  const list = (q ? all.filter((s) => norm(s.name).includes(q) || norm(s.cat).includes(q)) : all.slice().sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0))).slice(0, 8);
  const exact = all.some((s) => norm(s.name) === q);
  return `${list.length ? `<div class="svcgrid">${list.map((s) => { const p = mainPhoto(s.id); return `<button class="svcbtn" data-a="wpicksvc" data-id="${s.id}"><span class="sth">${p ? `<img data-photo="${p.id}" alt="">` : ic("win", 20)}</span><span style="min-width:0"><b>${esc(s.name)}</b><span class="small">${esc(s.cat || "Sans catégorie")} · ${modeOf(s.mode)[1]}</span></span></button>`; }).join("")}</div>` : ""}
  ${q && !exact ? `<button class="btn b-sec full" data-a="wcreate">${ic("plus", 16)}Créer la prestation « ${esc(e.sq.trim())} »</button>` : ""}
  ${!all.length && !q ? `<div class="small">Votre catalogue est vide : tapez le nom de la prestation, elle sera créée sans quitter le devis.</div>` : ""}`;
}
function createSvcPanel(e) {
  const cats = [...new Set(db().services.map((s) => s.cat).filter(Boolean).concat(db().categories.map((c) => c.name)))];
  return `<form novalidate class="card sub" data-f="wsvc" style="display:flex;flex-direction:column;gap:10px"><b>Nouvelle prestation : ${esc(e.sq.trim())}</b><div class="small">Seul le nom est obligatoire. Le reste peut être complété plus tard dans le catalogue.</div>
    <div class="fgrid"><div class="field"><label for="ns1">Catégorie</label><input class="inp" id="ns1" name="cat" data-ns="cat" list="nscats" value="${esc(e.ns.cat)}" placeholder="Fenêtres, Portes, Façades…"><datalist id="nscats">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
    <div class="field"><label for="ns2">Unité de facturation</label><select class="inp" id="ns2" name="mode" data-ns="mode">${MODES.map(([k, l, , d]) => `<option value="${k}" ${e.mode === k ? "selected" : ""}>${l} · ${d}</option>`).join("")}</select></div></div>
    <div class="field"><label for="ns3">Description (facultative)</label><input class="inp" id="ns3" name="desc" data-ns="desc" value="${esc(e.ns.desc)}"></div>
    <span class="flabel">Caractéristiques techniques (facultatives)</span>${techEditor(e.tech, "e")}
    <div class="acts"><button class="btn b-amb">${can("catalogue") ? "Enregistrer et continuer" : "Utiliser sans l'enregistrer"}</button><button type="button" class="btn b-sec" data-a="wcreatecancel">Annuler</button></div>
    ${can("catalogue") ? "" : `<div class="small">Votre rôle ne permet pas d'ajouter des prestations au catalogue : la ligne sera saisie comme prestation hors catalogue.</div>`}
  </form>`;
}
function techEditor(tech, scope) {
  const rows = (tech.length ? tech : [{ k: "", v: "" }]);
  return `<div class="tech">${rows.map((t, i) => `<div class="trow"><input class="inp" list="techk" data-t="${scope}" data-i="${i}" data-f2="k" value="${esc(t.k)}" placeholder="Profilé, couleur…" aria-label="Caractéristique ${i + 1}"><input class="inp" data-t="${scope}" data-i="${i}" data-f2="v" value="${esc(t.v)}" placeholder="Valeur" aria-label="Valeur ${i + 1}"><button type="button" class="ib" data-a="ttrash" data-s="${scope}" data-i="${i}" aria-label="Retirer">${ic("x", 15)}</button></div>`).join("")}<datalist id="techk">${TECH_KEYS.map((k) => `<option value="${k}">`).join("")}</datalist><button type="button" class="btn b-sec" style="min-height:34px;padding:4px 10px;align-self:flex-start" data-a="tadd" data-s="${scope}">${ic("plus", 15)}Ajouter une caractéristique</button></div>`;
}
function photoSlot(s, e) {
  if (!s) return `<span class="sth big">${ic("win", 26)}</span>`;
  const p = mainPhoto(s.id);
  if (p) return `<span class="sth big"><img data-photo="${p.id}" alt="Photo de ${esc(s.name)}"></span>`;
  return `<span class="sth big ph0" title="Illustration générique, pas une photo réelle">${ic(e.photoSkip || !can("catalogue") ? "win" : "camera", 26)}</span>`;
}
// Recherche automatique du tarif (affichée, jamais appliquée sans confirmation).
function lookup(e) {
  const wmm = needsW(e.mode) ? toMm(e.w, e.unit) : null; const hmm = needsH(e.mode) ? toMm(e.h, e.unit) : null;
  const ready = !!e.serviceId && (!needsW(e.mode) || wmm) && (!needsH(e.mode) || hmm);
  if (!ready) return { ready: false, wmm, hmm };
  const tk = techKey(e.tech); const ref = findRef(e.serviceId, tk, e.mode, wmm, hmm);
  return { ready: true, wmm, hmm, tk, ref, near: ref ? [] : nearRefs(e.serviceId, tk, e.mode, wmm, hmm), last: ref || e.mode === "piece" ? null : lastUnitPrice(e.serviceId, tk, e.mode) };
}
function priceBox(e) {
  const L = lookup(e); const qty = num(e.qty) || 0; const unit = priceUnitLabel(e.mode);
  const amountOf = (p) => Math.round(measure(e.mode, L.wmm, L.hmm) * p * qty);
  const custom = `<div class="fgrid"><div class="field"><label for="ed-p">Prix unitaire ${unit} (${esc(cur())})</label><input class="inp num" id="ed-p" data-e="price" inputmode="numeric" value="${esc(e.price)}" data-enter="price" autocomplete="off"></div><div class="field"><span class="flabel">Montant de la ligne</span><div class="amt num" id="ed-amt">${num(e.price) >= 0 && e.price !== "" ? F(amountOf(num(e.price))) : "—"}</div></div></div>`;
  const confirmBtn = `<button class="btn b-amb" data-a="wconfirm">${ic("check", 16)}${e.idx != null ? "Enregistrer la ligne" : "Confirmer la ligne"}</button>`;
  if (!e.serviceId && !e.name) return "";
  if (!e.serviceId) return `<div class="pbox">${custom}<div class="small">Prestation hors catalogue : le prix ne sera pas mémorisé.</div><div class="acts">${confirmBtn}</div></div>`;
  if (!L.ready) return `<div class="pbox muted"><span class="small">${e.mode === "forfait" ? "" : `Saisissez ${needsH(e.mode) ? "la largeur et la hauteur" : "la longueur"} : le tarif déjà enregistré pour ces dimensions s'affichera automatiquement.`}</span></div>`;
  if (UI.searching) return `<div class="pbox muted"><span class="load"></span> Recherche des dimensions…</div>`;
  const dims = dimTxt(L.wmm, L.hmm, e.unit, e.mode);
  if (L.ref && L.ref.price != null && !e.custom) {
    const hist = (L.ref.history || []); const distinct = [...new Set(hist.slice(-5).map((h) => h.price))];
    return `<div class="pbox found"><div class="pfound"><span class="tag t-good">${ic("check", 12, 3)} Tarif trouvé</span><b>${esc(svc(e.serviceId).name)} · ${dims}</b>${L.tk ? `<span class="small">${esc(techLabel(e.tech))}</span>` : ""}</div>
      <div class="pgrid2"><div><span class="small">Prix enregistré ${unit}</span><b class="num">${F(L.ref.price)}</b><span class="small">le ${dFR(L.ref.updatedAt || L.ref.createdAt)} par ${esc(L.ref.updatedBy || L.ref.createdBy || "—")}</span></div><div><span class="small">Montant pour ${nb(qty)}${e.mode === "m2" ? ` (${nb(measure("m2", L.wmm, L.hmm) * qty, 2)} m²)` : e.mode === "ml" ? ` (${nb(measure("ml", L.wmm) * qty, 2)} ml)` : ""}</span><b class="num">${F(amountOf(L.ref.price))}</b></div></div>
      ${distinct.length > 1 ? `<div class="note warn">Plusieurs prix ont été utilisés pour ces dimensions. Le tarif de référence proposé est le dernier confirmé ; vérifiez-le avant de l'appliquer.</div>` : ""}
      <div class="acts"><button class="btn b-amb" data-a="wuseref" data-enter-target="1">${ic("check", 16)}Confirmer ce prix</button><button class="btn b-sec" data-a="wcustom">Saisir un autre prix</button>${hist.length > 1 ? `<button class="btn b-sec" data-a="sheet" data-s="refhist" data-id="${L.ref.id}">${ic("hist", 15)}Historique (${hist.length})</button>` : ""}</div></div>`;
  }
  return `<div class="pbox ${L.ref ? "warnb" : ""}">${L.ref && L.ref.price == null ? `<div class="note warn">Dimensions ${dims} retrouvées pour cette prestation, mais sans prix enregistré : indiquez le prix.</div>` : L.ref && e.custom ? `<div class="small">Tarif de référence : ${F(L.ref.price)} ${unit}. Le nouveau prix le remplacera après confirmation${can("tarifs") ? "" : " (non mémorisé : votre rôle ne permet pas de modifier les tarifs)"} ; l'ancien reste dans l'historique.</div>` : `<div class="small"><b>Aucun tarif enregistré</b> pour ${esc(svc(e.serviceId).name)} en ${dims}${L.tk ? " avec ces caractéristiques" : ""}. Saisissez le prix : il sera mémorisé pour les prochains devis${can("tarifs") ? "" : " (sauf si votre rôle ne le permet pas)"}.</div>`}
    ${custom}
    ${L.near.length ? `<div class="small">Dimensions proches déjà tarifées (pour information, non appliquées) : ${L.near.map((p) => `<button type="button" class="linkb" data-a="wuseprice" data-p="${p.price}">${dimTxt(p.w, p.h, e.unit, p.mode)} : ${F(p.price)}</button>`).join(" · ")}</div>` : ""}
    ${L.last ? `<div class="small">Dernier prix ${unit} pour cette prestation : <button type="button" class="linkb" data-a="wuseprice" data-p="${L.last.price}">${F(L.last.price)}</button> (${dFR(L.last.updatedAt || L.last.createdAt)})</div>` : ""}
    <div class="acts">${confirmBtn}${e.custom ? `<button class="btn b-sec" data-a="wcustomoff">Revenir au tarif enregistré</button>` : ""}</div></div>`;
}
let lookT = null;
function relookup(quick) {
  clearTimeout(lookT); const e = W().ed; const L = lookup(e);
  const box = $("#pbox"); if (!box) return;
  if (!L.ready || quick) { UI.searching = false; box.innerHTML = priceBox(e); return; }
  UI.searching = true; box.innerHTML = priceBox(e);
  lookT = setTimeout(() => { UI.searching = false; const b = $("#pbox"); if (b) b.innerHTML = priceBox(W().ed); }, 260);
}
function updateAmount() { const e = W().ed; const a = $("#ed-amt"); if (!a) return; const L = lookup(e); const p = num(e.price); a.textContent = e.price !== "" && p >= 0 && L.ready ? F(Math.round(measure(e.mode, L.wmm, L.hmm) * p * (num(e.qty) || 0))) : !e.serviceId && p >= 0 && e.price !== "" ? F(Math.round(p * (num(e.qty) || 0))) : "—"; }

// Confirmation d'une ligne : validation, mémorisation du tarif, ajout au devis.
function commitLine(useRef) {
  const w = W(); const e = w.ed; const s = e.serviceId ? svc(e.serviceId) : null; const L = lookup(e);
  const qty = num(e.qty);
  if (!s && !e.name) return toast("Choisissez ou créez une prestation.", "err");
  if (needsW(e.mode) && !L.wmm) { toast(`Indiquez ${e.mode === "ml" ? "la longueur" : "la largeur"}.`, "err"); return focusSel("#ed-w"); }
  if (needsH(e.mode) && !L.hmm) { toast("Indiquez la hauteur.", "err"); return focusSel("#ed-h"); }
  if (!(qty > 0)) { toast("La quantité doit être supérieure à zéro.", "err"); return focusSel("#ed-q"); }
  const price = useRef && L.ref ? L.ref.price : num(e.price);
  if (!(price >= 0) || e.price === "" && !useRef) { toast("Indiquez le prix unitaire.", "err"); return focusSel("#ed-p"); }
  UI.busy = true; toastStatus("Enregistrement en cours…");
  const at = Date.now(); let refNote = ""; let refId = L.ref ? L.ref.id : null;
  if (s) {
    if (can("tarifs")) {
      if (L.ref) { if (L.ref.price !== price) { L.ref.history = [...(L.ref.history || []), { price, at, by: me().name, quote: w.editId ? qNum(quote(w.editId)) : "devis en cours" }]; L.ref.price = price; L.ref.updatedAt = at; L.ref.updatedBy = me().name; audit("Modification d'un tarif", `${s.name} · ${dimTxt(L.wmm, L.hmm, "cm", e.mode)}`, F(price)); } else { L.ref.confirmedAt = at; } }
      else { const r = { id: uid("t"), serviceId: s.id, serviceName: s.name, techKey: L.tk, tech: cleanTech(e.tech), techLabel: techLabel(e.tech), mode: e.mode, w: L.wmm, h: needsH(e.mode) ? L.hmm : null, price, history: [{ price, at, by: me().name, quote: "devis en cours" }], createdAt: at, createdBy: me().name, updatedAt: at, updatedBy: me().name }; db().prices.push(r); refId = r.id; audit("Mesures enregistrées", `${s.name} · ${dimTxt(L.wmm, L.hmm, "cm", e.mode)}`, F(price)); }
    } else if (!L.ref || L.ref.price !== price) refNote = "tarif non mémorisé (droits)";
    s.usedAt = at;
  }
  const line = { id: e.idx != null ? w.lines[e.idx].id : uid("l"), serviceId: s ? s.id : null, name: s ? s.name : e.name, cat: s ? s.cat || "" : "", desc: s ? s.desc || "" : "", tech: cleanTech(e.tech), techLabel: techLabel(e.tech), techKey: techKey(e.tech), unit: e.unit, w: e.w, h: e.h, wmm: L.wmm, hmm: needsH(e.mode) ? L.hmm : null, qty, mode: e.mode, price, photoId: s && mainPhoto(s.id) ? mainPhoto(s.id).id : null, refId, refNote };
  line.amount = lineAmount(line);
  if (e.idx != null) w.lines[e.idx] = line; else w.lines.push(line);
  const wasEdit = e.idx != null;
  w.ed = newEd(e); save(); keepDraft(); UI.busy = false; UI.restored = false;
  render(); focusSel(needsW(w.ed.mode) ? "#ed-w" : "#ed-q");
  toast(`${wasEdit ? "Ligne mise à jour" : "Mesures enregistrées · Prix confirmé"} · ${refNote ? "ligne ajoutée (" + refNote + ")" : localOnlyMsg()}`);
  say(`${wasEdit ? "Ligne modifiée" : "Ligne ajoutée"} : ${line.name}, ${F(line.amount)}.`);
}
function toastStatus(msg) { UI.toast = { msg, kind: "warn", t: Date.now() }; drawToast(); }
let focusWanted = null;
function focusSel(sel) { const go = () => { const el = $(sel); if (!el) return false; el.focus(); if (el.select) try { el.select(); } catch (x) { /* ignore */ } return true; }; if (go()) { focusWanted = null; return; } focusWanted = sel; setTimeout(() => { go(); focusWanted = null; }, 30); }

/* ---------- Étape 3 : récapitulatif ---------- */
function stepRecap(w) {
  const t = totalsOf(w); const st = db().settings;
  return `<div class="card" style="display:flex;flex-direction:column;gap:10px"><h2>3. Vérifier le devis</h2>
    <div class="grid g2"><div><div class="small">Client</div><b>${esc(w.client.name)}</b>${w.client.phone ? `<div class="small">${esc(w.client.phone)}</div>` : ""}</div><div><div class="small">Chantier · objet</div><b>${esc(w.chantier || "—")}</b><div class="small">${esc(w.objet || "")}</div></div></div>
    ${linesTable(w.lines, null)}
    <div class="fgrid">
      <div class="field"><label for="wr1">Remise (${esc(cur())})</label><input class="inp num" id="wr1" data-w="discount" inputmode="numeric" value="${esc(w.discount)}" placeholder="0"></div>
      <div class="field"><label for="wr2">Validité (jours)</label><input class="inp num" id="wr2" data-w="validity" inputmode="numeric" value="${esc(w.validity)}"></div>
      ${st.tax && st.tax.label ? `<label class="row" style="border:0;align-self:end"><span>Appliquer ${esc(st.tax.label)} (${nb(st.tax.rate, 2).replace(/,00$/, "")} %)</span><input type="checkbox" data-w="taxOn" ${w.taxOn ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--amber)"></label>` : ""}
    </div>
    <div class="field"><label for="wr3">Notes pour le client (facultatives)</label><textarea class="inp" id="wr3" data-w="notes" placeholder="Délai de fabrication, couleur à confirmer…">${esc(w.notes)}</textarea></div>
    <div id="wtot" class="tots">${totalsRows(t)}</div>
    ${w.editId && ["envoye", "accepte"].includes(w.wasStatus) ? `<div class="note warn">Ce devis a déjà été ${w.wasStatus === "accepte" ? "accepté" : "envoyé"}. Le terminer créera une <b>nouvelle version</b> ; la version ${quote(w.editId).version || 1}, ses montants et ses documents restent archivés.</div>` : ""}
    <div class="acts"><button class="btn b-sec" data-a="wstep" data-n="2">${ic("edit", 16)}Modifier les lignes</button>${!w.editId ? `<button class="btn b-sec" data-a="wdraft" ${UI.busy ? "disabled" : ""}>Enregistrer le brouillon</button>` : ""}<button class="btn b-amb" data-a="wfinish" ${UI.busy || !w.lines.length ? "disabled" : ""}>${UI.busy ? '<span class="load"></span> Enregistrement…' : `${ic("check", 16)}Terminer le devis`}</button></div>
  </div>`;
}
// Enregistrement définitif (ou brouillon). L'identifiant est fixé au début : un double clic ne crée jamais deux devis.
function finishQuote(asDraft, force) {
  const w = W(); if (UI.busy && !force) return; const d = db();
  if (!w.client.name.trim() || !PHONE_OK(String(w.client.phone || "").trim()) || !MAIL_OK(String(w.client.email || "").trim()) || !String(w.objet || "").trim()) { toast("Vérifiez les informations du client et l'intitulé du devis.", "err"); w.step = 1; render(); return FORMS.wclient(); }
  if (!w.lines.length && !asDraft) return toast("Ajoutez au moins une ligne.", "err");
  const ex = quote(w.editId || w.id);
  if (w.editId && ex && (ex.rev || 1) !== w.baseRev && !force) { UI.sheet = { type: "conflict", id: ex.id }; return drawLayer(); }
  UI.busy = true; render();
  try {
    const at = Date.now(); const t = totalsOf(w); let cl = w.clientId ? client(w.clientId) : null;
    if (!cl && w.client.name.trim()) {
      const same = d.clients.find((c) => !c.deleted && norm(c.name) === norm(w.client.name) && (norm(c.phone) === norm(w.client.phone)));
      if (same) cl = same; else if (can("clients")) { cl = { id: uid("c"), name: w.client.name.trim(), phone: (w.client.phone || "").trim(), email: (w.client.email || "").trim(), address: (w.client.address || "").trim(), chantiers: [], createdAt: at, createdBy: me().name, updatedAt: at }; d.clients.push(cl); audit("Création d'un client", cl.name); }
    }
    if (cl && w.clientId && can("clients")) { const nv = { name: w.client.name.trim(), phone: (w.client.phone || "").trim(), email: (w.client.email || "").trim(), address: (w.client.address || "").trim() }; const ch = Object.keys(nv).filter((k) => (cl[k] || "") !== nv[k] && !(k === "name" && !nv.name)); if (ch.length) { Object.assign(cl, nv, { updatedAt: at, updatedBy: me().name }); audit("Client mis à jour", cl.name, ch.map((k) => ({ name: "nom", phone: "téléphone", email: "e-mail", address: "adresse" }[k])).join(", ")); UI.clientNote = "fiche client mise à jour"; } }
    if (cl && w.chantier && !(cl.chantiers || []).some((c) => norm(c.label) === norm(w.chantier))) { cl.chantiers = [...(cl.chantiers || []), { id: uid("h"), label: w.chantier.trim(), at }]; cl.updatedAt = at; }
    const snap = { client: { name: w.client.name.trim(), phone: w.client.phone || "", email: w.client.email || "", address: w.client.address || "" }, clientId: cl ? cl.id : null, chantier: w.chantier.trim(), objet: w.objet.trim(), lines: clone(w.lines), ...t, validity: Math.max(1, Math.round(num(w.validity) || 30)), notes: w.notes.trim(), terms: { payTerms: d.settings.payTerms, mentions: d.settings.mentions, footer: d.settings.footer }, currency: cur() };
    let q = ex;
    if (q && w.editId) {
      const v = (q.version || 1) + 1; const reason = ["envoye", "accepte"].includes(q.status) ? `Révision après ${q.status === "accepte" ? "acceptation" : "envoi"}` : q.status === "brouillon" ? "Finalisation du brouillon" : "Modification";
      if (q.status === "brouillon") { Object.assign(q, snap, { status: asDraft ? "brouillon" : "finalise", versions: asDraft ? [] : [{ v: 1, at, by: me().name, reason: "Version initiale", ...clone(snap) }], version: 1, finalAt: asDraft ? null : at, pendingNum: !asDraft && !q.num, tempNum: q.tempNum || "PROV-" + at.toString(36).toUpperCase().slice(-6) }); }
      else { Object.assign(q, snap, { status: "finalise", version: v, versions: [...(q.versions || []), { v, at, by: me().name, reason, ...clone(snap) }] }); }
      q.rev = (q.rev || 1) + 1; q.updatedAt = at; q.updatedBy = me().name;
      audit(q.status === "brouillon" ? "Brouillon enregistré" : "Nouvelle version d'un devis", qNum(q) + (q.version > 1 ? " · v" + q.version : ""), F(q.total));
    } else if (!q) {
      q = { id: w.id, num: null, tempNum: "PROV-" + at.toString(36).toUpperCase().slice(-6), status: asDraft ? "brouillon" : "finalise", pendingNum: !asDraft, ...snap, createdAt: w.startedAt || at, createdBy: me().name, createdById: me().id, updatedAt: at, updatedBy: me().name, finalAt: asDraft ? null : at, rev: 1, version: 1, versions: asDraft ? [] : [{ v: 1, at, by: me().name, reason: "Version initiale", ...clone(snap) }], docs: [] };
      d.quotes.push(q); audit(asDraft ? "Brouillon enregistré" : "Création d'un devis", q.tempNum, F(q.total));
    }
    if (!asDraft) syncTotal(q);
    save(); dropDraft(); UI.wiz = null; UI.busy = false; UI.qid = q.id; UI.restored = false;
    if (asDraft) { UI.view = "fiche"; render(); toast("Brouillon enregistré · " + localOnlyMsg()); return; }
    UI.view = "modele"; UI.mt = d.settings.theme || "classique"; UI.mv = q.version; render(); window.scrollTo(0, 0);
    toast(`Devis enregistré · ${S.online ? "numéro officiel attribué par le serveur…" : "sur cet appareil — synchronisation en attente"}${UI.clientNote ? " · " + UI.clientNote : ""}${UI.totalNote ? " · " + UI.totalNote : ""}`); UI.totalNote = null; UI.clientNote = null;
    say(`Devis enregistré pour ${q.client.name} : ${F(q.total)}.`);
    if (H.sync && H.sync.onSyncNow && S.online) try { H.sync.onSyncNow(false); } catch (x) { /* ignore */ }
  } catch (err) { UI.busy = false; render(); toast("Échec de l'enregistrement — réessayer. Vos saisies sont conservées.", "err"); }
}


/* ============================== Devis total des travaux ============================== */
// Dès qu'un client a au moins deux devis de prestations, l'application tient à
// jour un « devis total des travaux » qui les additionne (une ligne par devis).
const ACTIVE_ST = ["finalise", "envoye", "accepte"];
const sameClient = (a, b) => (a.clientId && b.clientId ? a.clientId === b.clientId : norm(a.client && a.client.name) === norm(b.client && b.client.name));
function quoteTitle(q) { const v = qVer(q) || q; if (v.objet) return v.objet; const names = [...new Set((v.lines || []).map((l) => l.name))]; return names.join(" et ") || "Prestations"; }
function totalSources(t) {
  const ex = new Set(t.excluded || []);
  return db().quotes.filter((q) => !q.deleted && q.kind !== "total" && ACTIVE_ST.includes(q.status) && sameClient(q, t) && !ex.has(q.id))
    .sort((a, b) => (a.finalAt || a.createdAt || 0) - (b.finalAt || b.createdAt || 0))
    .map((q) => { const v = qVer(q) || q; return { id: q.id, num: q.num || null, tempNum: q.tempNum || "", title: quoteTitle(q), qty: 1, pieces: (v.lines || []).reduce((a, l) => a + (Number(l.qty) || 0), 0), amount: v.total || 0, v: q.version || 1 }; });
}
const totalOf = (q) => db().quotes.find((t) => !t.deleted && t.kind === "total" && t.status !== "annule" && sameClient(t, q));
function syncTotal(q, force) {
  if (!q || q.kind === "total" || db().settings.autoTotal === false && !force) return null;
  let t = totalOf(q); const probe = t || { clientId: q.clientId, client: q.client, excluded: [] };
  const src = totalSources(probe); const at = Date.now();
  if (!t && src.length < 2) return null;
  const sig = (list) => JSON.stringify(list.map((s) => [s.id, s.v, s.amount, s.qty, s.title, s.num]));
  const sub = src.reduce((a, s) => a + s.amount, 0);
  const snap = { client: clone((qVer(q) || q).client || q.client), clientId: q.clientId || null, chantier: (qVer(q) || q).chantier || "", objet: "Total des travaux", sources: src, lines: [], subtotal: sub, discount: 0, taxOn: false, taxRate: 0, taxLabel: "", tax: 0, total: sub, validity: db().settings.validity || 30, notes: "", terms: { payTerms: db().settings.payTerms, mentions: db().settings.mentions, footer: db().settings.footer }, currency: cur() };
  if (!t) {
    t = { id: uid("q"), kind: "total", num: null, tempNum: "PROV-" + at.toString(36).toUpperCase().slice(-6), status: "finalise", pendingNum: true, ...snap, excluded: [], createdAt: at, createdBy: me().name, createdById: me().id, updatedAt: at, updatedBy: me().name, finalAt: at, rev: 1, version: 1, versions: [{ v: 1, at, by: me().name, reason: `Devis total créé (${src.length} devis)`, ...clone(snap) }], docs: [] };
    db().quotes.push(t); audit("Devis total des travaux", `${t.client.name} · ${src.length} devis`, F(sub));
    UI.totalNote = `Devis total des travaux créé : ${src.length} devis, ${F(sub)}`;
    return t;
  }
  if (sig(src) === sig(t.sources || []) && !force) return t;
  const v = (t.version || 1) + 1; const was = (t.sources || []).length;
  Object.assign(t, snap, { status: ["envoye", "accepte"].includes(t.status) ? "finalise" : t.status, version: v, rev: (t.rev || 1) + 1, updatedAt: at, updatedBy: me().name, versions: [...(t.versions || []), { v, at, by: me().name, reason: src.length > was ? "Devis ajouté au total" : src.length < was ? "Devis retiré du total" : "Montants mis à jour", ...clone(snap) }] });
  audit("Devis total mis à jour", `${t.client.name} · version ${v}`, F(sub)); UI.totalNote = `Devis total des travaux mis à jour (${src.length} devis, ${F(sub)})`;
  return t;
}

/* ============================== Modèles de devis (rendu A4) ============================== */
// Une seule mise en page dessinée sur canevas A4 (150 dpi) sert à l'aperçu, à
// l'impression et au PDF : ce que l'on voit est exactement ce qui est imprimé.
const PW = 1240, PH = 1754, MM = PW / 210;
const imgCache = {};
// Image apposée sur les devis, selon ce que le propriétaire a fourni :
// 1. « Cachet et signature » (une seule image) ; sinon
// 2. cachet seul + signature seule : composés, la signature au premier plan, légèrement descendue ;
// 3. sinon le cachet seul, ou la signature seule.
const STAMP_MSG = { stamp: ["Cachet et signature enregistrés : apposés en bas à droite des devis.", "Cachet et signature retirés."], stampOnly: ["Cachet enregistré : apposé en bas à droite des devis.", "Cachet retiré."], sign: ["Signature enregistrée : apposée en bas à droite des devis.", "Signature retirée."] };
const STAMP_SLOTS = [["stamp", "Cachet et signature", "Une seule image : le cachet déjà signé."], ["stampOnly", "Cachet seul", "Le cachet de l'entreprise, sans signature."], ["sign", "Signature seule", "La signature du responsable, sur fond blanc."]];
const mixCache = {};
async function stampMix(c) {
  const key = c.stampOnly.length + ":" + c.sign.length + ":" + c.stampOnly.slice(-24) + c.sign.slice(-24);
  if (mixCache[key]) return mixCache[key];
  mixCache[key] = (async () => {
    const [st, sg] = await Promise.all([loadImg(c.stampOnly), loadImg(c.sign)]); if (!st || !sg) return st || sg ? (st || sg).src : "";
    const W = st.width, Hs = st.height; const sw = W * 0.6, sh = sg.height * (sw / sg.width); const sx = W * 0.57 - sw / 2, sy = Hs * 0.5;
    const H2 = Math.max(Hs, Math.ceil(sy + sh)); const cv = document.createElement("canvas"); cv.width = W; cv.height = H2;
    const cx = cv.getContext("2d"); cx.drawImage(st, 0, 0, W, Hs); cx.drawImage(sg, Math.max(0, Math.min(W - sw, sx)), sy, sw, sh);
    return cv.toDataURL("image/png");
  })();
  return mixCache[key];
}
async function stampSrc(c) { if (c.stampFull) return c.stampFull; if (c.stampOnly && c.sign) return stampMix(c); return c.stampOnly || c.sign || ""; }
async function stampImg(c) { return loadImg(await stampSrc(c)); }
const stampKind = (c) => (c.stampFull ? "Cachet et signature" : c.stampOnly && c.sign ? "Cachet + signature (composés)" : c.stampOnly ? "Cachet seul" : c.sign ? "Signature seule" : "");
function loadImg(src) { if (!src) return Promise.resolve(null); if (imgCache[src]) return imgCache[src]; imgCache[src] = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }); return imgCache[src]; }
const hexRgb = (h) => { const m = String(h || "").replace("#", "").match(/^([0-9a-f]{6})$/i); const n = m ? parseInt(m[1], 16) : 0x0e7c86; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const tint = (h, a) => { const [r, g, b] = hexRgb(h); return `rgb(${Math.round(r + (255 - r) * a)},${Math.round(g + (255 - g) * a)},${Math.round(b + (255 - b) * a)})`; };
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
function wrapText(ctx, text, maxW) {
  const out = []; String(text || "").split(/\n/).forEach((para) => { let line = ""; para.split(/\s+/).forEach((w) => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); });
  return out;
}
// Données figées de la version demandée (jamais le catalogue actuel).
function docData(q, v) {
  const ver = (q.versions || []).find((x) => x.v === (v || q.version)) || q;
  const kind = q.kind === "total" ? "total" : "prestation";
  const srcLines = kind === "total" ? (ver.sources || []).map((s) => ({ name: s.title, qty: 1, amount: s.amount, price: s.amount, mode: "forfait", ref: s.num || s.tempNum || "" })) : null;
  return { kind, q, v: ver.v || q.version || 1, num: q.num ? q.num + ((ver.v || 1) > 1 ? "-V" + ver.v : "") : (q.tempNum || "Brouillon"), provisional: !q.num, date: ver.at || q.finalAt || q.createdAt, client: ver.client || q.client || {}, chantier: ver.chantier || "", objet: ver.objet || "", lines: srcLines || ver.lines || [], t: ver, validity: ver.validity || 30, notes: ver.notes || "", terms: ver.terms || {}, by: ver.by || q.createdBy, status: q.status };
}
async function renderQuote(q, theme, v, scale = 1, withStamp) {
  const D = docData(q, v); const st = db().settings; const c = company(); const color = st.color || "#0E7C86";
  const logo = await loadImg(c.logo);
  if (withStamp == null) withStamp = stampDefault();
  const stamp = withStamp && D.status !== "annule" && D.status !== "brouillon" ? await stampImg(c) : null;
  const photos = {}; if (theme === "technique") for (const l of D.lines) { if (l.photoId && !photos[l.photoId]) { const src = await photoData(l.photoId); if (src) photos[l.photoId] = await loadImg(src); } }
  const pages = []; let ctx, y, page = 0;
  const M = 16 * MM, R = PW - M, Wc = R - M;
  const newPage = () => { const cv = document.createElement("canvas"); cv.width = Math.round(PW * scale); cv.height = Math.round(PH * scale); ctx = cv.getContext("2d"); ctx.scale(scale, scale); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, PW, PH); ctx.textBaseline = "alphabetic"; pages.push(cv); page++; y = M; };
  const font = (sz, w = 400) => { ctx.font = `${w} ${sz}px ${FONT}`; };
  const txt = (s, x, yy, o = {}) => { ctx.fillStyle = o.color || "#1D232C"; font(o.size || 22, o.w || 400); ctx.textAlign = o.align || "left"; ctx.fillText(String(s == null ? "" : s), x, yy); ctx.textAlign = "left"; };
  const rule = (yy, col = "#D9DEE5", wd = 2, x1 = M, x2 = R) => { ctx.fillStyle = col; ctx.fillRect(x1, yy, x2 - x1, wd); };
  const round = (x, yy, w, h, r, fill, stroke) => { ctx.beginPath(); ctx.moveTo(x + r, yy); ctx.arcTo(x + w, yy, x + w, yy + h, r); ctx.arcTo(x + w, yy + h, x, yy + h, r); ctx.arcTo(x, yy + h, x, yy, r); ctx.arcTo(x, yy, x + w, yy, r); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };
  const money2 = (n) => nb(Math.round(n || 0)) + " " + (D.t.currency || cur());
  const footer = () => { const fy = PH - 11 * MM; rule(fy - 24, "#E3E7ED", 2); txt([c.name, c.legal, st.footer].filter(Boolean).join(" · "), M, fy, { size: 17, color: "#6B7686" }); txt(`Devis ${D.num} · page ${page}`, R, fy, { size: 17, color: "#6B7686", align: "right" }); };
  newPage();
  if (theme === "reference") { await drawReference({ ctx: () => ctx, D, c, st, stamp, M, R, Wc, txt, font, newPage, page: () => page, setY: (v2) => (y = v2), getY: () => y }); return pages; }
  // ---- En-tête selon le thème ----
  const infoLines = [c.address, [c.city, c.country].filter(Boolean).join(", "), [c.phone && "Tél. " + c.phone, c.email].filter(Boolean).join(" · "), c.legal].filter(Boolean);
  const title = D.status === "annule" ? "DEVIS ANNULÉ" : D.kind === "total" ? "DEVIS TOTAL" : "DEVIS";
  if (theme === "moderne") {
    ctx.fillStyle = color; ctx.fillRect(0, 0, PW, 300);
    if (logo) { round(M - 4, 52, 136, 136, 22, "#fff"); ctx.drawImage(logo, M + 8, 64, 112, 112); }
    const lx = logo ? M + 160 : M;
    txt(c.name, lx, 104, { size: 44, w: 700, color: "#fff" }); infoLines.slice(0, 3).forEach((l, i) => txt(l, lx, 146 + i * 30, { size: 21, color: "rgba(255,255,255,.88)" }));
    txt(title, R, 108, { size: 58, w: 800, color: "#fff", align: "right" }); txt("N° " + D.num, R, 152, { size: 26, w: 700, color: "#fff", align: "right" }); txt(dFR(D.date) + " · valable " + D.validity + " jours", R, 188, { size: 20, color: "rgba(255,255,255,.85)", align: "right" });
    y = 340;
    round(M, y, Wc * 0.56, 168, 20, tint(color, 0.9)); txt("CLIENT", M + 26, y + 40, { size: 17, w: 700, color }); txt(D.client.name || "—", M + 26, y + 80, { size: 28, w: 700 }); [D.client.phone, D.client.address].filter(Boolean).slice(0, 2).forEach((l, i) => txt(l, M + 26, y + 114 + i * 28, { size: 20, color: "#4A5563" }));
    const bx = M + Wc * 0.6; round(bx, y, R - bx, 168, 20, "#F4F6F9"); txt("CHANTIER", bx + 24, y + 40, { size: 17, w: 700, color }); font(22, 600); wrapText(ctx, D.chantier || "—", R - bx - 48).slice(0, 2).forEach((l, i) => txt(l, bx + 24, y + 78 + i * 28, { size: 22, w: 600 })); if (D.objet) { font(19); wrapText(ctx, D.objet, R - bx - 48).slice(0, 1).forEach((l) => txt(l, bx + 24, y + 140, { size: 19, color: "#4A5563" })); }
    y += 210;
  } else {
    if (logo) ctx.drawImage(logo, M, y, 120, 120);
    const lx = logo ? M + 144 : M;
    txt(c.name, lx, y + 40, { size: theme === "technique" ? 34 : 38, w: 700, color: theme === "classique" ? "#14202E" : color }); infoLines.forEach((l, i) => txt(l, lx, y + 78 + i * 28, { size: 19, color: "#4A5563" }));
    txt(title, R, y + 46, { size: theme === "technique" ? 46 : 54, w: 800, color: theme === "classique" ? color : "#14202E", align: "right" });
    const meta = [["N°", D.num], ["Date", dFR(D.date)], ["Validité", D.validity + " jours"], ["Version", String(D.v)]];
    meta.forEach(([k, v2], i) => { txt(k, R - 260, y + 92 + i * 30, { size: 19, color: "#6B7686" }); txt(v2, R, y + 92 + i * 30, { size: 19, w: 700, align: "right" }); });
    y += Math.max(130 + infoLines.length * 28, 220);
    rule(y, theme === "classique" ? "#14202E" : color, 4); y += 34;
    const half = (Wc - 30) / 2;
    const box = (x, label, lines2) => { if (theme === "classique") ctx.strokeStyle = "#C9D0D9"; round(x, y, half, 150, theme === "classique" ? 6 : 14, theme === "classique" ? null : "#F4F6F9", theme === "classique" ? "#C9D0D9" : null); txt(label, x + 22, y + 36, { size: 16, w: 700, color: theme === "classique" ? "#6B7686" : color }); lines2.filter(Boolean).slice(0, 3).forEach((l, i) => txt(l, x + 22, y + 72 + i * 28, { size: i === 0 ? 24 : 19, w: i === 0 ? 700 : 400, color: i === 0 ? "#1D232C" : "#4A5563" })); };
    box(M, "CLIENT", [D.client.name, D.client.phone, D.client.address || D.client.email]);
    box(M + half + 30, "CHANTIER ET OBJET", [D.chantier || "—", D.objet]);
    y += 186;
  }
  if (D.provisional) { round(M, y - 14, Wc, 48, 10, "#FFF4DB"); txt("Numéro provisoire : le numéro officiel est attribué à la synchronisation avec le serveur.", M + 18, y + 18, { size: 18, w: 600, color: "#7A4E00" }); y += 56; }
  // ---- Tableau des lignes ----
  const tech = theme === "technique";
  const cols = D.kind === "total" ? [["Désignation", 0.5, "l"], ["Devis", 0.2, "l"], ["Qté", 0.1, "r"], ["Montant", 0.2, "r"]] : tech ? [["Désignation et caractéristiques", 0.36, "l"], ["Dimensions", 0.15, "l"], ["Surface / long.", 0.12, "r"], ["Qté", 0.06, "r"], ["Prix unitaire", 0.15, "r"], ["Montant", 0.16, "r"]] : [["Désignation", 0.43, "l"], ["Dimensions", 0.17, "l"], ["Qté", 0.07, "r"], ["Prix unitaire", 0.16, "r"], ["Montant", 0.17, "r"]];
  const xs = []; let cx = M; cols.forEach(([, f]) => { xs.push(cx); cx += f * Wc; });
  const headRow = () => { if (theme === "moderne") { round(M, y, Wc, 50, 12, color); } else ctx.fillStyle = theme === "classique" ? "#EEF1F5" : tint(color, 0.86), ctx.fillRect(M, y, Wc, 50); cols.forEach(([l, f, a], i) => txt(l.toUpperCase(), a === "r" ? xs[i] + f * Wc - 14 : xs[i] + 14, y + 32, { size: 16, w: 700, color: theme === "moderne" ? "#fff" : "#3B4656", align: a === "r" ? "right" : "left" })); y += 50; };
  headRow();
  D.lines.forEach((l, li) => {
    if (D.kind === "total") { font(21, 700); const nl2 = wrapText(ctx, l.name, cols[0][1] * Wc - 28); const h2 = 24 + nl2.length * 28; if (y + h2 > PH - 180) { footer(); newPage(); headRow(); } if (theme === "moderne" && li % 2) { ctx.fillStyle = "#F7F9FB"; ctx.fillRect(M, y, Wc, h2); } nl2.forEach((s2, k2) => txt(s2, xs[0] + 14, y + 34 + k2 * 28, { size: 21, w: 700 })); txt(l.ref, xs[1] + 14, y + 34, { size: 19, color: "#4A5563" }); txt(nb(l.qty), xs[2] + cols[2][1] * Wc - 14, y + 34, { size: 20, align: "right" }); txt(money2(l.amount), xs[3] + cols[3][1] * Wc - 14, y + 34, { size: 21, w: 700, align: "right" }); y += h2; rule(y, theme === "classique" ? "#C9D0D9" : "#E6EAEF", 2); return; }
    font(21, 700); const nameW = cols[0][1] * Wc - 28 - (tech && photos[l.photoId] ? 96 : 0);
    const nl = wrapText(ctx, l.name, nameW); font(17); const tl = tech ? wrapText(ctx, [l.techLabel, l.desc].filter(Boolean).join(" · "), nameW) : (l.techLabel ? wrapText(ctx, l.techLabel, nameW).slice(0, 2) : []);
    const h = Math.max(tech && photos[l.photoId] ? 104 : 0, 22 + nl.length * 28 + tl.length * 24 + 14);
    if (y + h > PH - 70 * MM / 2 - 140) { footer(); newPage(); headRow(); }
    if (theme === "moderne" && li % 2) { ctx.fillStyle = "#F7F9FB"; ctx.fillRect(M, y, Wc, h); }
    let ty = y + 34; const nx = xs[0] + 14 + (tech && photos[l.photoId] ? 96 : 0);
    if (tech && photos[l.photoId]) { ctx.drawImage(photos[l.photoId], xs[0] + 12, y + 12, 82, 82); }
    nl.forEach((s) => { txt(s, nx, ty, { size: 21, w: 700 }); ty += 28; }); tl.forEach((s) => { txt(s, nx, ty, { size: 17, color: "#5A6575" }); ty += 24; });
    const dimS = dimTxt(l.wmm, l.hmm, l.unit, l.mode); const r0 = y + 34;
    let k = 1; txt(dimS === "—" ? modeOf(l.mode)[1] : dimS, xs[k] + 14, r0, { size: 20 }); if (!tech && dimS !== "—") txt(modeOf(l.mode)[1], xs[k] + 14, r0 + 26, { size: 16, color: "#6B7686" }); k++;
    if (tech) { const mq = measure(l.mode, l.wmm, l.hmm) * l.qty; txt(l.mode === "m2" ? nb(mq, 2) + " m²" : l.mode === "ml" ? nb(mq, 2) + " ml" : "—", xs[k] + cols[k][1] * Wc - 14, r0, { size: 20, align: "right" }); k++; }
    txt(nb(l.qty), xs[k] + cols[k][1] * Wc - 14, r0, { size: 20, align: "right" }); k++;
    txt(money2(l.price), xs[k] + cols[k][1] * Wc - 14, r0, { size: 20, align: "right" }); if (l.mode !== "piece") txt(priceUnitLabel(l.mode), xs[k] + cols[k][1] * Wc - 14, r0 + 24, { size: 15, color: "#6B7686", align: "right" }); k++;
    txt(money2(l.amount), xs[k] + cols[k][1] * Wc - 14, r0, { size: 21, w: 700, align: "right" });
    y += h; rule(y, theme === "classique" ? "#C9D0D9" : "#E6EAEF", 2);
  });
  // ---- Totaux ----
  const t = D.t; const rows = [["Sous-total", t.subtotal || 0]]; if (t.discount) rows.push(["Remise", -t.discount]); if (t.taxOn) rows.push([`${t.taxLabel || "Taxe"} (${nb(t.taxRate, 2).replace(/,00$/, "")} %)`, t.tax || 0]);
  const tbh = rows.length * 38 + 86;
  if (y + tbh + 40 > PH - 140) { footer(); newPage(); }
  y += 30; const tx = M + Wc * 0.52, tw = R - tx;
  rows.forEach(([l, v2]) => { txt(l, tx + 20, y + 26, { size: 20, color: "#4A5563" }); txt((v2 < 0 ? "− " : "") + money2(Math.abs(v2)), R - 20, y + 26, { size: 20, align: "right" }); y += 38; });
  if (theme === "moderne") round(tx, y + 6, tw, 70, 35, color); else { ctx.fillStyle = theme === "classique" ? "#14202E" : color; ctx.fillRect(tx, y + 6, tw, 70); }
  txt(t.taxOn ? "TOTAL TTC" : "TOTAL", tx + 26, y + 52, { size: 24, w: 800, color: "#fff" }); txt(money2(t.total || 0), R - 26, y + 52, { size: 28, w: 800, color: "#fff", align: "right" });
  y += 110;
  if (tech) { const area = D.lines.filter((l) => l.mode === "m2").reduce((a, l) => a + measure("m2", l.wmm, l.hmm) * l.qty, 0); const lin = D.lines.filter((l) => l.mode === "ml").reduce((a, l) => a + measure("ml", l.wmm) * l.qty, 0); const pcs = D.lines.reduce((a, l) => a + (Number(l.qty) || 0), 0); txt(`Récapitulatif : ${D.lines.length} ligne(s) · ${nb(pcs)} élément(s)${area ? " · " + nb(area, 2) + " m²" : ""}${lin ? " · " + nb(lin, 2) + " ml" : ""}`, M, y - 50, { size: 18, color: "#4A5563" }); }
  // ---- Conditions, mentions, signatures ----
  { font(19); const ws = wrapText(ctx, `${st.arret || "Arrêtée la présente facture pro-forma à la somme de :"} ${montantEnLettres(t.total || 0, D.t.currency || cur())}`, Wc); if (y + ws.length * 27 + 20 > PH - 140) { footer(); newPage(); } ws.forEach((s2) => { txt(s2, M, y, { size: 19, w: 600, color: "#1D232C" }); y += 27; }); y += 34;
    if (st.merci !== "") { ctx.save(); ctx.font = `700 22px Georgia, "Times New Roman", serif`; ctx.fillStyle = theme === "classique" ? "#14202E" : color; ctx.fillText(st.merci || "Merci de votre confiance !", M, y); ctx.restore(); y += 40; } }
  // Notes éventuelles, puis uniquement le cachet en bas à droite (sans cadre ni conditions).
  if (D.notes) { font(19); const ls = wrapText(ctx, D.notes, Wc); if (y + ls.length * 27 + 20 > PH - 140) { footer(); newPage(); } ls.forEach((s2) => { txt(s2, M, y, { size: 19, color: "#3B4656" }); y += 27; }); y += 18; }
  if (stamp) { const maxW = 430, maxH = 300; const r = Math.min(maxW / stamp.width, maxH / stamp.height); const w2 = stamp.width * r, h2 = stamp.height * r; if (y + h2 > PH - 120) { footer(); newPage(); } ctx.drawImage(stamp, R - w2, y, w2, h2); }
  footer();
  return pages;
}
async function photoData(id) {
  const p = db().photos.find((x) => x.id === id); if (!p) return null;
  if (p.src) return p.src;
  try { if (H.photos && H.photos.local) { const v = await H.photos.local(id); if (v) return v; } } catch (e) { /* ignore */ }
  try { if (H.photos && H.photos.get && S.online) { const r = await H.photos.get([id]); const f = (r || []).find((x) => x.id === id); if (f && f.data) { if (H.photos.keep) H.photos.keep(id, f.data); return f.data; } } } catch (e) { /* hors ligne */ }
  return null;
}
async function photoFill() {
  const els = $$("img[data-photo]:not([data-ok])"); for (const el of els) { el.dataset.ok = "1"; const src = await photoData(el.dataset.photo); if (src) el.src = src; else el.replaceWith(Object.assign(document.createElement("span"), { innerHTML: ic("image", 18), title: "Photo non disponible sur cet appareil" })); }
}

/* ---------- Écran « Choisir le modèle du devis » ---------- */
VIEWS.modele = () => {
  const q = quote(UI.qid); if (!q) return emptyS("Devis introuvable", "", `<button class="btn b-sec" data-a="go" data-v="devis">Historique</button>`);
  if (!can("documents")) return locked("Documents PDF");
  const th = UI.mt || db().settings.theme || "classique"; const v = UI.mv || q.version;
  return `${head("Choisir le modèle du devis", `${esc(qNum(q))}${v !== q.version ? " · version " + v + " (archivée)" : ""} · ${esc(q.client.name)} · ${moneyT((docData(q, v).t || {}).total)}`, `<button class="btn b-sec" data-a="openq" data-id="${q.id}">${ic("file", 16)}Fiche du devis</button>`)}
  <div class="themes">${THEMES.map(([k, l, d]) => `<button class="theme ${th === k ? "on" : ""}" data-a="pickth" data-t="${k}"><span class="thumb" data-thumb="${k}"><span class="load"></span></span><b>${l}</b><span class="small">${d}</span>${th === k ? '<span class="tag t-good">Sélectionné</span>' : ""}</button>`).join("")}</div>
  ${company().stamp ? `<label class="row card" style="padding:10px 14px"><span><b>Cachet et signature</b><br><span class="small">Apposés en bas à droite, dans le cadre « Pour l'entreprise »</span></span><button class="switch ${(UI.stamp == null ? stampDefault() : UI.stamp) ? "on" : ""}" data-a="stamptog" role="switch" aria-checked="${UI.stamp == null ? stampDefault() : UI.stamp}" aria-label="Cachet et signature"></button></label>` : can("parametres") ? `<div class="note">Ajoutez le cachet et la signature de l'entreprise dans Paramètres pour les apposer sur vos devis.</div>` : ""}
  <div class="acts sticky-acts"><button class="btn b-amb" data-a="pdfdl" data-id="${q.id}" data-v="${v}" data-t="${th}">${ic("download", 16)}Télécharger le PDF</button><button class="btn b-sec" data-a="pdfprint" data-id="${q.id}" data-v="${v}" data-t="${th}">${ic("print", 16)}Imprimer</button>${can("parametres") ? `<button class="btn b-sec" data-a="go" data-v="parametres">${ic("palette", 16)}Logo, couleurs, mentions</button>` : ""}</div>
  <div class="card"><h2>Aperçu avec les données réelles du devis</h2><div class="pages" id="pv"><span class="load"></span> Préparation de l'aperçu…</div></div>`;
};
let thumbJob = 0;
// Aperçus déjà dessinés : remis instantanément quand l'écran se redessine (pas de clignotement).
const previewCache = new Map();
const previewSig = (q, k, v, sc) => { const st = db().settings; const c = company(); return [q.id, q.rev || 0, q.updatedAt || 0, q.status, v, k, sc, UI.stamp == null ? stampDefault() : UI.stamp, JSON.stringify(st).length, c.stamp.length, c.stampOnly.length, c.sign.length].join("|"); };
const copyCanvas = (cv) => { const n = document.createElement("canvas"); n.width = cv.width; n.height = cv.height; n.getContext("2d").drawImage(cv, 0, 0); return n; };
function putPreview(el, pages, single) { el.innerHTML = ""; (single ? pages.slice(0, 1) : pages).forEach((cv) => { const n = copyCanvas(cv); if (!single) n.className = "page"; el.appendChild(n); }); }
async function cachedRender(q, k, v, sc) { const key = previewSig(q, k, v, sc); if (previewCache.has(key)) return previewCache.get(key); const p = await renderQuote(q, k, v, sc, UI.stamp); if (previewCache.size > 40) previewCache.delete(previewCache.keys().next().value); previewCache.set(key, p); return p; }
async function afterModele() {
  const q = quote(UI.qid); if (!q || UI.view !== "modele") return; const job = ++thumbJob; const v = UI.mv || q.version; const th = UI.mt || db().settings.theme || "classique";
  try {
    // 1. Ce qui est déjà en cache s'affiche tout de suite, sans attendre.
    for (const [k] of THEMES) { const p = previewCache.get(previewSig(q, k, v, 0.22)); const el = $(`[data-thumb="${k}"]`); if (p && el) putPreview(el, p, true); }
    { const p = previewCache.get(previewSig(q, th, v, 0.62)); const pv = $("#pv"); if (p && pv) putPreview(pv, p, false); }
    // 2. Le reste est dessiné puis mis en cache.
    for (const [k] of THEMES) { const el = $(`[data-thumb="${k}"]`); if (!el || el.querySelector("canvas")) continue; const p = await cachedRender(q, k, v, 0.22); if (job !== thumbJob) return; const el2 = $(`[data-thumb="${k}"]`); if (el2) putPreview(el2, p, true); }
    const pv0 = $("#pv"); if (pv0 && !pv0.querySelector("canvas")) { const pages = await cachedRender(q, th, v, 0.62); if (job !== thumbJob) return; const pv = $("#pv"); if (pv) putPreview(pv, pages, false); }
  } catch (e) { const pv = $("#pv"); if (pv) pv.innerHTML = `<div class="note crit">L'aperçu n'a pas pu être généré. Le devis est bien conservé. <button class="btn b-sec" data-a="go" data-v="modele">Recommencer</button></div>`; }
}
// Génération : PDF (jsPDF) ou impression. Le document est archivé (modèle, version, date).
async function makeDoc(qid, kind, v, theme) {
  const q = quote(qid); if (!q) return; if (!need("documents", "générer un document")) return;
  v = Number(v) || q.version; theme = theme || UI.mt || db().settings.theme || "classique";
  if (UI.busy) return; UI.busy = true; toastStatus(kind === "pdf" ? "Génération du PDF…" : "Préparation de l'impression…");
  try {
    const withStamp = UI.stamp == null ? stampDefault() : UI.stamp; const pages = await renderQuote(q, theme, v, 1, withStamp);
    const D = docData(q, v); const name = pdfName(q, D);
    if (kind === "pdf") {
      if (!H.pdf || !H.pdf.load) throw new Error("Export PDF indisponible sur cet appareil.");
      const JsPDF = await H.pdf.load(); const doc = new JsPDF({ unit: "pt", format: "a4", compress: true });
      pages.forEach((cv, i) => { if (i) doc.addPage(); doc.addImage(cv.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 595.28, 841.89); });
      await H.pdf.save(name, doc);
    } else {
      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(name)}</title><style>@page{size:A4;margin:0}body{margin:0}img{width:210mm;height:297mm;display:block;page-break-after:always}img:last-child{page-break-after:auto}</style></head><body>${pages.map((cv) => `<img src="${cv.toDataURL("image/jpeg", 0.92)}">`).join("")}</body></html>`;
      if (isNativeApp() && H.pdf) { const JsPDF = await H.pdf.load(); const doc = new JsPDF({ unit: "pt", format: "a4", compress: true }); pages.forEach((cv, i) => { if (i) doc.addPage(); doc.addImage(cv.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 595.28, 841.89); }); await H.pdf.save(name, doc); }
      else await printHtml(html);
    }
    q.docs = [...(q.docs || []), { id: uid("d"), v, theme, at: Date.now(), by: me().name, pages: pages.length, stamp: !!(withStamp && company().stamp), kind: kind === "pdf" ? "PDF téléchargé" : "Impression", num: D.num }];
    q.updatedAt = Date.now(); audit(kind === "pdf" ? "PDF généré" : "Devis imprimé", `${D.num} · ${THEMES.find((t) => t[0] === theme)[1]}`, `${pages.length} page(s)`); save();
    UI.busy = false; toast(kind === "pdf" ? `PDF généré (${pages.length} page${pages.length > 1 ? "s" : ""}) et archivé dans l'historique.` : "Document envoyé à l'impression et archivé.");
    if (UI.view === "fiche") render();
  } catch (e) { UI.busy = false; toast(((e && e.message) || "La génération a échoué") + " — le devis est conservé, réessayez.", "err"); }
}
// Nom du fichier PDF (téléchargement, partage WhatsApp) : « Libellé du devis - Nom du client.pdf ».
function pdfName(q, D) {
  const clean = (x) => String(x || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  const label = clean(q.kind === "total" ? "Devis total des travaux" : D.objet || quoteTitle(q) || "Devis");
  const who = clean(D.client && D.client.name);
  return ((who ? `${label} - ${who}` : label).slice(0, 120) || "Devis") + ".pdf";
}
const stampDefault = () => !!(company().stamp && db().settings.stampOn !== false);
const isNativeApp = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
function printHtml(html) {
  const old = document.getElementById("al-print"); if (old) old.remove();
  const fr = document.createElement("iframe"); fr.id = "al-print"; fr.setAttribute("aria-hidden", "true"); fr.title = "Impression";
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(fr);
  const w = fr.contentWindow; w.document.open(); w.document.write(html); w.document.close();
  return new Promise((ok, ko) => setTimeout(() => { try { w.focus(); w.print(); ok(); } catch (e) { ko(e); } }, 400));
}


/* ---------- Montant en lettres (français) ---------- */
function montantEnLettres(n, devise = "FCFA") {
  n = Math.round(Math.abs(Number(n) || 0));
  const U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const T = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  const cent99 = (x) => { if (x < 20) return U[x]; const d = Math.floor(x / 10), u = x % 10; if (d === 7 || d === 9) { const r = x - d * 10 + 10; return T[d] + (r === 11 && d === 7 ? " et " : "-") + U[r]; } if (u === 0) return T[d] + (d === 8 ? "s" : ""); return T[d] + (u === 1 && d !== 8 ? " et " : "-") + U[u]; };
  const cent999 = (x, last) => { const c2 = Math.floor(x / 100), r = x % 100; let s = ""; if (c2) s = (c2 > 1 ? U[c2] + " " : "") + "cent" + (c2 > 1 && r === 0 && last ? "s" : ""); if (r) s += (s ? " " : "") + cent99(r); return s; };
  if (n === 0) return "ZÉRO " + (devise === "FCFA" ? "FRANC CFA" : devise.toUpperCase());
  const parts = []; const mds = Math.floor(n / 1e9), mns = Math.floor((n % 1e9) / 1e6), mls = Math.floor((n % 1e6) / 1000), rest = n % 1000;
  if (mds) parts.push(cent999(mds, true) + " milliard" + (mds > 1 ? "s" : ""));
  if (mns) parts.push(cent999(mns, true) + " million" + (mns > 1 ? "s" : ""));
  if (mls) parts.push(mls === 1 ? "mille" : cent999(mls, false) + " mille");
  if (rest) parts.push(cent999(rest, true));
  const unit = devise === "FCFA" ? (n > 1 ? "FRANCS CFA" : "FRANC CFA") : devise.toUpperCase();
  return (parts.join(" ") + (n % 1e6 === 0 && n >= 1e6 ? " de" : "") + " " + unit).toUpperCase();
}

/* ---------- Modèle « Pro-forma » (repris du devis de l'entreprise) ---------- */
async function drawReference(o) {
  const { D, c, st, stamp, M, R, Wc, txt, font } = o; let ctx = o.ctx();
  const RED = st.refColor || "#A8282B"; const LIGHT = tint(RED, 0.48); const ZEBRA = tint(RED, 0.86); const INK = "#111"; const BORDER = tint(RED, 0.25);
  let y = 0; const setY = (v) => (y = v);
  const num = (s, x, yy, size, align = "right", w = 700, color = INK) => { ctx.save(); ctx.font = `${w} ${size}px ${FONT}`; ctx.fillStyle = color; const tw = ctx.measureText(s).width * 0.8; const x0 = align === "right" ? x - tw : align === "center" ? x - tw / 2 : x; ctx.translate(x0, yy); ctx.scale(0.8, 1); ctx.textAlign = "left"; ctx.fillText(s, 0, 0); ctx.restore(); };
  const cell = (x, yy, w, h, fill) => { if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, yy, w, h); } ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, yy + 0.5, w, h); };
  const pageNo = () => { const fy = PH - 9 * MM; txt(`${D.num} · page ${o.page()}`, R, fy, { size: 15, color: "#8A8F96", align: "right" }); };
  const header = (first) => {
    const top = 18 * MM; txt((c.name || "").toUpperCase(), M, top, { size: 33, w: 700, color: RED });
    if (st.slogan) txt(st.slogan, M, top + 28, { size: 19, color: RED });
    txt(D.kind === "total" ? "DEVIS TOTAL" : D.status === "annule" ? "DEVIS ANNULÉ" : "DEVIS", R, top + 12, { size: 52, w: 800, color: RED, align: "right" });
    let yy = top + 82; const addr = String(c.address || "").split(/\n/).concat([c.city && !norm(c.address).includes(norm(c.city)) ? c.city : ""]).filter(Boolean);
    addr.forEach((l) => { txt(l, M, yy, { size: 19, color: INK }); yy += 26; }); if (c.phone) { txt(c.phone, M, yy, { size: 19, color: INK }); yy += 26; } if (c.legal) { txt(c.legal, M, yy, { size: 17, color: "#444" }); yy += 24; }
    font(19, 700); const dl = "Date : "; const dv = dFR(D.date); ctx.font = `400 19px ${FONT}`; const dvw = ctx.measureText(dv).width; txt(dv, R, top + 82, { size: 19, align: "right" }); txt(dl, R - dvw, top + 82, { size: 19, w: 700, align: "right" });
    txt("N° " + D.num, R, top + 108, { size: 17, color: "#444", align: "right" }); if (D.v > 1) txt("Version " + D.v, R, top + 132, { size: 16, color: "#444", align: "right" });
    if (!first) return yy + 20;
    yy += 18; txt("À :", M, yy, { size: 19, w: 700 }); yy += 40; txt((D.client.name || "").toUpperCase(), M, yy, { size: D.kind === "total" ? 25 : 20, w: 700 }); yy += 26;
    [D.client.phone, D.chantier ? "Chantier : " + D.chantier : ""].filter(Boolean).forEach((l) => { txt(l, M, yy, { size: 17, color: "#333" }); yy += 24; });
    if (D.provisional) { yy += 6; txt("Numéro provisoire : le numéro officiel est attribué à la synchronisation.", M, yy, { size: 15, color: "#8A5A00" }); yy += 20; }
    return yy + 40;
  };
  y = header(true);
  const X = M - 8, TW = Wc + 16;
  const newPg = () => { pageNo(); o.newPage(); ctx = o.ctx(); y = header(false); };
  if (D.kind === "total") {
    const cw = [0.085, 0.71, 0.205].map((f) => f * TW); const xs = [X, X + cw[0], X + cw[0] + cw[1]];
    const head = () => { ctx.fillStyle = RED; ctx.fillRect(X, y, TW, 76); [["Qte", 0], ["DESIGNATION", 1], ["TOTAL en F.CFA", 2]].forEach(([l, i]) => txt(l, xs[i] + cw[i] / 2, y + 46, { size: 19, w: i === 1 ? 400 : 700, color: "#fff", align: "center" })); y += 76; };
    head();
    D.lines.forEach((l, i) => { const h = 44; if (y + h > PH - 300) { newPg(); head(); } const f = i % 2 === 0 ? ZEBRA : "#fff"; cell(xs[0], y, cw[0], h, f); cell(xs[1], y, cw[1], h, f); cell(xs[2], y, cw[2], h, f); num(String(l.qty).padStart(2, "0"), xs[0] + 12, y + 31, 26, "left"); txt((l.name || "").toUpperCase(), xs[1] + 12, y + 30, { size: 20, color: INK }); if (l.ref) txt(l.ref, xs[2] - 12, y + 30, { size: 14, color: "#7A7F87", align: "right" }); num(String(Math.round(l.amount)), xs[2] + cw[2] - 10, y + 31, 26); y += h; });
    var totX = xs[2], totW = cw[2];
  } else {
    const cw = [0.085, 0.265, 0.21, 0.225, 0.215].map((f) => f * TW); const xs = []; let cx = X; cw.forEach((w) => { xs.push(cx); cx += w; });
    const groups = []; D.lines.forEach((l) => { const g = groups.find((x) => x.name === l.name && x.tech === (l.techLabel || "")); if (g) g.lines.push(l); else groups.push({ name: l.name, tech: l.techLabel || "", lines: [l] }); });
    const head = (g, cont) => { ctx.fillStyle = LIGHT; ctx.fillRect(X, y, TW, 74); ctx.strokeStyle = BORDER; ctx.strokeRect(X + 0.5, y + 0.5, TW, 74); const title = (groups.length === 1 && D.objet ? D.objet : g.name).toUpperCase() + (cont ? " (suite)" : ""); font(30, 700); let ts = title; while (ctx.measureText(ts).width > TW - 30 && ts.length > 4) ts = ts.slice(0, -2); txt(ts, X + TW / 2, y + 50, { size: 30, w: 700, color: "#fff", align: "center" }); y += 74;
      if (g.tech && groups.length > 1) { /* caractéristiques affichées sous le titre */ }
      ctx.fillStyle = RED; ctx.fillRect(X, y, TW, 88); [["Qte"], ["Largeurs"], ["Hauteurs"], ["Prix unitaire F.CFA"], ["TOTAL en", "F.CFA"]].forEach((l, i) => { if (l.length === 2) { txt(l[0], xs[i] + cw[i] / 2, y + 38, { size: 19, w: 700, color: "#fff", align: "center" }); txt(l[1], xs[i] + cw[i] / 2, y + 64, { size: 19, w: 700, color: "#fff", align: "center" }); } else txt(l[0], xs[i] + cw[i] / 2, y + 52, { size: 19, w: 700, color: "#fff", align: "center" }); if (i) { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(xs[i], y, 1.5, 88); ctx.fillStyle = RED; } }); y += 88; };
    let li = 0;
    groups.forEach((g, gi) => {
      if (y + 74 + 88 + 46 > PH - 260) newPg();
      head(g, false); if (gi === 0 && groups.length === 1 && g.tech) { /* rien */ }
      g.lines.forEach((l) => { const h = 46; if (y + h > PH - 300) { newPg(); head(g, true); } const f = li % 2 === 1 ? ZEBRA : "#fff"; li++; cw.forEach((w, i) => cell(xs[i], y, w, h, f));
        const u = l.unit === "m" ? "m" : l.unit === "mm" ? "mm" : "cm"; const W2 = l.wmm != null ? String(fromMm(l.wmm, u)).replace(".", ",") : "—"; const H2 = l.hmm != null ? String(fromMm(l.hmm, u)).replace(".", ",") : "—";
        num(String(l.qty).padStart(2, "0"), xs[0] + 12, y + 33, 27, "left"); num(W2 + (u !== "cm" && W2 !== "—" ? " " + u : ""), xs[1] + cw[1] / 2, y + 33, 27, "center"); num(H2 + (u !== "cm" && H2 !== "—" ? " " + u : ""), xs[2] + cw[2] - 12, y + 33, 27);
        num(String(Math.round(l.price)) + (l.mode === "m2" ? " /m²" : l.mode === "ml" ? " /ml" : ""), xs[3] + cw[3] / 2, y + 33, 27, "center"); num(String(Math.round(l.amount)), xs[4] + cw[4] - 10, y + 33, 27); y += h; });
      if (g.tech && groups.length > 1) { txt(g.tech, X + 6, y + 22, { size: 15, color: "#555" }); y += 30; } else if (groups.length > 1) y += 12;
    });
    if (groups.length === 1 && groups[0].tech) { txt(groups[0].tech, X + 6, y + 24, { size: 16, color: "#555" }); }
    var totX = xs[4], totW = cw[4];
  }
  // Totaux
  const t = D.t; if (y + 230 > PH - 200) newPg();
  const rows = [["Sous-total", t.subtotal || 0, false]]; if (t.discount) rows.push(["Remise", -t.discount, false]); if (t.taxOn) rows.push([`${t.taxLabel || "Taxe"} ${nb(t.taxRate, 2).replace(/,00$/, "")} %`, t.tax || 0, false]); rows.push(["Total", t.total || 0, true]);
  rows.forEach(([l, v, big]) => { const h = big ? 78 : 50; cell(totX, y, totW, h, null); txt(l, totX - 120, y + (big ? 50 : 36), { size: big ? 29 : 27, w: 700, color: RED, align: "center" }); num((v < 0 ? "− " : "") + nb(Math.abs(v)), totX + totW - 10, y + (big ? 58 : 37), big ? 44 : 29, "right", 800); y += h; });
  y += 90;
  font(21, 400); const lead = (st.arret || "Arrêtée la présente facture pro-forma à la somme de :") + " "; const words = montantEnLettres(t.total || 0, D.t.currency || cur());
  const all = wrapText(ctx, lead + words, Wc - 10); let isWord = false;
  all.forEach((ln) => { if (y > PH - 200) newPg(); const k = ln.indexOf(words.split(" ")[0]); if (!isWord && k >= 0 && ln.includes(":")) { const a = ln.slice(0, k); txt(a, M + 8, y, { size: 21, color: RED }); ctx.font = `400 21px ${FONT}`; const aw = ctx.measureText(a).width; txt(ln.slice(k), M + 8 + aw, y, { size: 21, w: 700, color: RED }); isWord = true; } else txt(ln, M + 8, y, { size: 21, w: isWord ? 700 : 400, color: RED }); y += 30; });
  y += 70; ctx.save(); ctx.font = `700 22px Georgia, "Times New Roman", serif`; ctx.fillStyle = RED; ctx.fillText(st.merci || "Merci de votre confiance !", M + 8, y); ctx.restore();
  if (D.notes) { y += 46; font(18); wrapText(ctx, D.notes, Wc).forEach((s2) => { txt(s2, M + 8, y, { size: 18, color: "#333" }); y += 26; }); }
  if (stamp) { const maxW = 420, maxH = 300; const r = Math.min(maxW / stamp.width, maxH / stamp.height); const w2 = stamp.width * r, h2 = stamp.height * r; let sy = y - 40; if (sy + h2 > PH - 60) { sy = PH - 60 - h2; } if (sy < y - 120) sy = Math.max(sy, PH - 60 - h2); ctx.drawImage(stamp, R - w2, Math.min(Math.max(y - 20, 0), PH - 60 - h2), w2, h2); }
  pageNo();
}

/* ---------- Clients et chantiers ---------- */
VIEWS.clients = () => {
  const q = norm(UI.flt.cq || ""); const list = db().clients.filter((c) => !c.deleted && (!q || norm(c.name).includes(q) || norm(c.phone).includes(q))).sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  const nq = (c) => db().quotes.filter((x) => !x.deleted && x.clientId === c.id);
  return `${head("Clients et chantiers", `${list.length} client${list.length > 1 ? "s" : ""}`, can("clients") ? `<button class="btn b-amb" data-a="sheet" data-s="client">${ic("plus", 17)}Nouveau client</button>` : "")}
  <form novalidate class="card fgrid" data-f="cflt"><div class="field"><label for="cq">Rechercher</label><input class="inp" id="cq" name="cq" value="${esc(UI.flt.cq || "")}" placeholder="Nom ou téléphone"></div><button class="btn b-amb" style="align-self:end">Rechercher</button></form>
  ${list.length ? `<div class="grid g3">${list.map((c) => { const qs = nq(c); return `<button class="card ccard" data-a="sheet" data-s="client" data-id="${c.id}"><b>${esc(c.name)}</b><span class="small">${esc(c.phone || "Sans téléphone")}${c.address ? " · " + esc(c.address) : ""}</span><span class="small">${qs.length} devis · ${(c.chantiers || []).length} chantier${(c.chantiers || []).length > 1 ? "s" : ""}${can("finances") && qs.length ? " · " + F(qs.filter((x) => x.status === "accepte").reduce((a, x) => a + (x.kind === "total" ? 0 : x.total || 0), 0)) + " accepté(s)" : ""}</span></button>`; }).join("")}</div>` : emptyS("Aucun client", "Les clients se créent aussi directement depuis un devis.")}`;
};

/* ---------- Catalogue des prestations ---------- */
VIEWS.catalogue = () => {
  const q = norm(UI.flt.sq || ""); const sc = UI.flt.sc || ""; const all = db().services.filter((s) => !s.deleted);
  const list = all.filter((s) => (!q || norm(s.name).includes(q) || norm(s.cat).includes(q)) && (!sc || (s.cat || "Sans catégorie") === sc));
  const order = new Map(db().categories.filter((c) => !c.deleted).map((c, i) => [c.name, c.tpl ? i : 1000 + i]));
  const catSort = (a, b) => (order.has(a) ? order.get(a) : 5000) - (order.has(b) ? order.get(b) : 5000) || norm(a).localeCompare(norm(b));
  const allCats = [...new Set(all.map((s) => s.cat || "Sans catégorie"))].sort(catSort);
  const cats = [...new Set(list.map((s) => s.cat || "Sans catégorie"))].sort(catSort);
  const catOf = (n) => db().categories.find((c) => !c.deleted && c.name === n);
  const miss = can("catalogue") ? tplMissing() : 0;
  return `${head("Catalogue des prestations", `${all.length} prestation${all.length > 1 ? "s" : ""} · ${allCats.length} catégorie${allCats.length > 1 ? "s" : ""} · ajoutez librement vos propres prestations.`, can("catalogue") ? `<button class="btn b-amb" data-a="sheet" data-s="service">${ic("plus", 17)}Nouvelle prestation</button>` : "")}
  ${miss ? `<div class="card catimp"><span class="catimg">${ic("list", 22)}</span><span><b>${miss === tplCount() ? "Catalogue type GestiOne" : "Compléter avec le catalogue type"}</b><span class="small">${miss} prestation${miss > 1 ? "s" : ""} prête${miss > 1 ? "s" : ""} à l'emploi, classée${miss > 1 ? "s" : ""} en 25 catégories avec leurs images. Vos prestations ne sont pas modifiées.</span></span><button class="btn b-amb" data-a="catseed">${ic("plus", 16)}Importer</button></div>` : ""}
  <form novalidate class="card fgrid" data-f="sflt"><div class="field"><label for="sq">Rechercher</label><input class="inp" id="sq" name="sq" value="${esc(UI.flt.sq || "")}" placeholder="Nom ou catégorie"></div><button class="btn b-amb" style="align-self:end">Rechercher</button></form>
  ${allCats.length > 1 ? `<div class="catchips"><button class="chip ${sc ? "" : "on"}" data-a="catflt" data-v="">Toutes · ${all.length}</button>${allCats.map((c) => `<button class="chip ${sc === c ? "on" : ""}" data-a="catflt" data-v="${esc(c)}">${esc(c)} · ${all.filter((s) => (s.cat || "Sans catégorie") === c).length}</button>`).join("")}</div>` : ""}
  ${list.length ? cats.map((cat) => { const k = catOf(cat); const items = list.filter((s) => (s.cat || "Sans catégorie") === cat); return `<div class="cath">${k && k.img ? `<img src="${esc(k.img)}" alt="" loading="lazy">` : `<span class="catimg">${ic("win", 20)}</span>`}<span><b>${esc(cat)}</b><span class="small">${items.length} prestation${items.length > 1 ? "s" : ""}</span></span></div><div class="grid g3">${items.map((s) => { const p = mainPhoto(s.id); const n = db().prices.filter((x) => !x.deleted && x.serviceId === s.id).length; return `<button class="card scard" data-a="sheet" data-s="service" data-id="${s.id}"><span class="sth big">${p ? (p.src ? `<img src="${esc(p.src)}" alt="" loading="lazy">` : `<img data-photo="${p.id}" alt="">`) : `<span title="Illustration générique : aucune photo">${ic("win", 26)}</span>`}</span><span style="min-width:0;display:flex;flex-direction:column;gap:3px"><b>${esc(s.name)}</b><span class="small">${modeOf(s.mode)[1]} · ${n} tarif${n > 1 ? "s" : ""} mémorisé${n > 1 ? "s" : ""}</span>${cleanTech(s.tech).length ? `<span class="small">${esc(techLabel(s.tech))}</span>` : ""}</span></button>`; }).join("")}</div>`; }).join("") : emptyS(all.length ? "Aucune prestation trouvée" : "Catalogue vide", all.length ? "Modifiez la recherche ou choisissez une autre catégorie." : "Importez le catalogue type ou créez vos prestations ici, ou directement pendant la saisie d'un devis.")}`;
};

/* ---------- Dimensions et tarifs de référence ---------- */
VIEWS.tarifs = () => {
  const f = UI.flt; const sv = db().services.filter((s) => !s.deleted);
  let list = db().prices.filter((p) => !p.deleted); if (f.ts) list = list.filter((p) => p.serviceId === f.ts); if (f.tq) { const q = norm(f.tq); list = list.filter((p) => norm(p.serviceName).includes(q) || norm(p.techLabel).includes(q)); }
  list = list.slice().sort((a, b) => norm(a.serviceName).localeCompare(norm(b.serviceName)) || (a.w || 0) - (b.w || 0) || (a.h || 0) - (b.h || 0));
  return `${head("Dimensions et tarifs", "Chaque prix confirmé dans un devis est mémorisé ici avec son historique. Les anciens devis gardent leurs prix d'origine.")}
  ${can("tarifs") ? "" : `<div class="note">Lecture seule : votre rôle ne permet pas de modifier les tarifs de référence.</div>`}
  <form novalidate class="card fgrid" data-f="tflt"><div class="field"><label for="ts">Prestation</label><select class="inp" id="ts" name="ts"><option value="">Toutes</option>${sv.map((s) => `<option value="${s.id}" ${f.ts === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div><div class="field"><label for="tq">Rechercher</label><input class="inp" id="tq" name="tq" value="${esc(f.tq || "")}" placeholder="Prestation ou caractéristique"></div><button class="btn b-amb" style="align-self:end">Filtrer</button></form>
  ${list.length ? `<div class="tw"><table><thead><tr><th>Prestation</th><th>Caractéristiques</th><th>Dimensions</th><th>Calcul</th><th class="r">Prix de référence</th><th>Mis à jour</th><th class="r">Historique</th></tr></thead><tbody>${list.map((p) => `<tr class="click" data-a="sheet" data-s="refhist" data-id="${p.id}"><td><b>${esc(p.serviceName || (svc(p.serviceId) || {}).name || "—")}</b></td><td>${esc(p.techLabel || "—")}</td><td class="num">${dimTxt(p.w, p.h, "cm", p.mode)}</td><td>${modeOf(p.mode)[1]}</td><td class="r num">${p.price == null ? '<span class="tag t-warn">Prix manquant</span>' : money(p.price)}</td><td class="num">${dFR(p.updatedAt || p.createdAt)} · ${esc(p.updatedBy || p.createdBy || "")}</td><td class="r num">${(p.history || []).length}</td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucun tarif mémorisé", "Les dimensions et prix se mémorisent automatiquement quand vous confirmez une ligne de devis.")}`;
};

/* ---------- Équipe ---------- */
VIEWS.employes = () => {
  if (!can("employes")) return locked("Utilisateurs et employés");
  const list = S.employees;
  return `${head("Utilisateurs et employés", "Chacun a son propre compte : nom et code PIN personnel. Aucun mot de passe partagé.", `<button class="btn b-amb" data-a="sheet" data-s="employee">${ic("plus", 17)}Nouvel employé</button>`)}
  ${list.length ? `<div class="tw"><table><thead><tr><th>Nom</th><th>Rôle</th><th>Fonction</th><th>Téléphone</th><th>Depuis</th><th>Code d'invitation</th><th>Statut</th></tr></thead><tbody>${list.map((e) => `<tr class="click" data-a="sheet" data-s="employee" data-id="${e.id}"><td><b>${esc(e.name)}</b></td><td>${esc(ROLES[e.role])}</td><td>${esc(e.func)}</td><td class="num">${esc(e.phone)}</td><td class="num">${esc(e.hired)}</td><td class="num">${esc(e.login || "—")}</td><td><span class="tag ${e.status === "actif" ? "t-good" : "t-mut"}">${e.status === "actif" ? "Actif" : "Désactivé"}</span></td></tr>`).join("")}</tbody></table></div>` : emptyS("Aucun employé", "Ajoutez vos commerciaux, techniciens et assistants avec le rôle qui leur convient.", `<button class="btn b-amb" data-a="sheet" data-s="employee">Nouvel employé</button>`)}`;
};
VIEWS.roles = () => {
  const adm = role() === "administrateur";
  return `${head("Rôles et permissions", adm ? "Cochez ou décochez une permission : elle s'applique aussitôt dans l'application et sur le serveur." : "Les permissions sont fixées par l'administrateur.")}
  <div class="grid g3">${ALL_ROLES.map((r) => `<div class="card"><b>${ROLES[r]}</b><div class="small" style="margin-top:4px">${ROLE_DESC[r]}</div></div>`).join("")}</div>
  <div class="tw"><table class="perm"><thead><tr><th>Permission</th>${ALL_ROLES.map((r) => `<th>${ROLES[r]}</th>`).join("")}</tr></thead><tbody>${Object.entries(PERMS).map(([p, [l]]) => `<tr><td>${l}</td>${ALL_ROLES.map((r) => { const on = permOn(r, p); return `<td>${adm && r !== "administrateur" ? `<button class="switch ${on ? "on" : ""}" data-a="permtog" data-r="${r}" data-p="${p}" role="switch" aria-checked="${on}" aria-label="${esc(l)} · ${ROLES[r]}"></button>` : on ? ic("check", 16, 3) : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
};
VIEWS.journal = () => {
  if (!can("audit")) return locked("Journal d'audit");
  const f = UI.flt; let list = db().audit; if (f.ju) list = list.filter((a) => a.user === f.ju); const users = [...new Set(db().audit.map((a) => a.user))];
  return `${head("Journal d'audit", "Actions importantes : qui, quoi, quand, sur quel objet et avec quel résultat. Le journal ne peut pas être modifié.")}
  <form novalidate class="card fgrid" data-f="jflt"><div class="field"><label for="ju">Utilisateur</label><select class="inp" id="ju" name="ju"><option value="">Tous</option>${users.map((u) => `<option ${f.ju === u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></div><button class="btn b-amb" style="align-self:end">Filtrer</button></form>
  ${list.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Objet</th><th>Résultat</th></tr></thead><tbody>${list.slice(0, 300).map((a) => `<tr><td class="num">${dt(a.at)}</td><td>${esc(a.user)}${a.role ? `<br><span class="small">${esc(ROLES[a.role] || a.role)}</span>` : ""}</td><td>${esc(a.action)}</td><td>${esc(a.obj)}</td><td>${esc(a.result || "")}</td></tr>`).join("")}</tbody></table></div>` : emptyS("Journal vide", "Les actions importantes apparaîtront ici.")}`;
};

/* ---------- Sauvegardes ---------- */
VIEWS.sauvegardes = () => {
  const ss = syncState(); const d = db(); const sy = H.sync || {};
  const counts = [["Clients", d.clients.length], ["Prestations", d.services.length], ["Photos", d.photos.filter((p) => !p.deleted).length], ["Tarifs", d.prices.length], ["Devis", d.quotes.length]];
  const waiting = d.photos.filter((p) => !p.deleted && !p.uploaded).length;
  return `${head("Sauvegardes et synchronisation", "Où sont vos données, comment les retrouver sur un nouveau téléphone.")}
  <div class="grid g2">
  <div class="card"><h2>Synchronisation</h2><div class="row"><span>État</span><span class="tag ${ss[0] === "ok" ? "t-good" : ss[0] === "off" ? "t-crit" : "t-warn"}">${ss[1]}</span></div><div class="row"><span>Opérations en attente d'envoi</span><b class="num">${nb(sy.pending || 0)}</b></div><div class="row"><span>Photos à envoyer</span><b class="num">${nb(waiting)}</b></div><div class="row"><span>Dernier échange</span><b>${sy.lastAt ? dt(new Date(sy.lastAt).getTime()) : "—"}</b></div><div class="acts" style="margin-top:8px"><button class="btn b-sec" data-a="refresh">${ic("refresh", 16)}Synchroniser maintenant</button></div>${(sy.pending || waiting) ? `<div class="note warn" style="margin-top:8px">Des données ne sont encore que sur cet appareil. Si le téléphone est perdu ou détruit avant leur envoi, elles ne pourront pas être récupérées : connectez-vous à Internet dès que possible.</div>` : ""}</div>
  <div class="card"><h2>Sauvegarde serveur</h2><div class="row"><span>Fréquence</span><b>Chaque nuit (03:00 UTC)</b></div><div class="row"><span>Conservation</span><b>30 jours</b></div><div class="row"><span>Contenu</span><b>Toutes les données de l'entreprise</b></div><div class="small" style="margin-top:6px">Stockées sur le serveur GestiOne, séparées par entreprise : tables, photos et références des documents.</div>${can("restaurer") && H.backups ? `<div class="acts" style="margin-top:8px"><button class="btn b-sec" data-a="srvlist">${ic("cloud", 16)}Voir les sauvegardes du serveur</button></div>` : ""}</div>
  </div>
  <div class="card"><h2>Changer de téléphone</h2><div class="steps" style="margin-top:8px">${["Sur l'ancien téléphone, vérifiez « Synchronisé » en haut de l'écran (aucune opération en attente).", "Sur le nouveau téléphone, ouvrez GestiOne › « Se reconnecter à mon entreprise » (ou « Rejoindre » pour un employé).", "Les clients, prestations, tarifs, devis et photos sont rechargés depuis le serveur.", "Les PDF se régénèrent à l'identique depuis les versions archivées."].map((s, i) => `<div class="step"><i>${i + 1}</i><span>${s}</span></div>`).join("")}</div></div>
  <div class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Export et restauration manuelle</h2><div class="small">Fichier complet (clients, prestations, photos, tarifs, devis et versions, journal) à conserver hors du téléphone.</div>
    <div class="mini">${counts.map(([l, n]) => `<div><small>${l}</small><b>${nb(n)}</b></div>`).join("")}</div>
    <div class="acts">${can("exporter") ? `<button class="btn b-amb" data-a="exportAll">${ic("download", 16)}Exporter toutes les données</button>` : ""}${can("restaurer") ? `<label class="btn b-crit">${ic("refresh", 16)}Restaurer depuis un fichier<input type="file" accept="application/json,.json" data-restore hidden></label>` : ""}</div>
    ${can("restaurer") ? `<div class="small">La restauration remplace les données de cette entreprise par celles du fichier, après confirmation par le code administrateur. Un point de restauration est créé juste avant, pour pouvoir revenir en arrière pendant la session.</div>` : ""}
    ${d.backups.length ? `<div class="tw"><table><thead><tr><th>Point de restauration</th><th>Contenu</th><th></th></tr></thead><tbody>${d.backups.slice().reverse().map((x) => `<tr><td class="num">${dt(x.at)}</td><td>${esc(x.label)}</td><td>${SNAPS[x.id] && can("restaurer") ? `<button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="undo" data-id="${x.id}">Revenir à ce point</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
  </div>`;
};

/* ---------- Paramètres et modèles ---------- */
VIEWS.parametres = () => {
  if (!can("parametres")) return locked("Paramètres");
  const st = db().settings; const c = company();
  return `${head("Paramètres et modèles", "Identité imprimée sur les devis, conditions commerciales, devise, taxes et modèle par défaut.")}
  ${companyForm(c, st, false)}
  <div class="card" style="display:flex;flex-direction:column;gap:12px"><h2>Cachet et signature</h2>
    <div class="small">Trois possibilités : une image « cachet et signature », ou un cachet seul, ou une signature seule. Le fond blanc est retiré automatiquement. Si le cachet seul et la signature seule sont fournis sans image combinée, GestiOne les assemble : la signature passe au premier plan, légèrement descendue sur le cachet.</div>
    <div class="stampgrid">${STAMP_SLOTS.map(([k, l, d]) => { const v = k === "stamp" ? c.stampFull : c[k]; return `<div class="stampslot${v ? " on" : ""}"><div class="sh"><b>${l}</b><span class="small">${d}</span></div><span class="stampv">${v ? `<img src="${v}" alt="${l}">` : `<span class="small">Aucune image</span>`}</span><div class="acts"><label class="btn b-sec">${ic("image", 16)}${v ? "Remplacer" : "Importer"}<input type="file" accept="image/*" data-stamp="${k}" hidden></label>${v ? `<button type="button" class="btn b-crit" data-a="stampdel" data-k="${k}">Retirer</button>` : ""}</div></div>`; }).join("")}</div>
    ${c.stamp ? `<div class="stampres"><div class="sh"><b>Sur les devis</b><span class="small">${stampKind(c)}${c.stampFull && (c.stampOnly || c.sign) ? " · l'image combinée est prioritaire" : ""}</span></div><span class="stampv big"><img id="stampres" alt="Aperçu du cachet sur les devis"></span></div>
    <div class="row"><span>Apposer automatiquement sur les devis</span><button class="switch ${st.stampOn !== false ? "on" : ""}" data-a="stampauto" role="switch" aria-checked="${st.stampOn !== false}" aria-label="Apposer automatiquement"></button></div><div class="small">Il reste possible de l'enlever devis par devis sur l'écran « Choisir le modèle ». Les brouillons et devis annulés ne sont jamais cachetés.</div>` : ""}
  </div>
  <form novalidate class="card" data-f="quoteset" style="display:flex;flex-direction:column;gap:12px"><h2>Devis</h2>
    <div class="fgrid">
      <div class="field"><label for="q1">Modèle par défaut</label><select class="inp" id="q1" name="theme">${THEMES.map(([k, l]) => `<option value="${k}" ${st.theme === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label for="q2">Couleur du document</label><input class="inp" id="q2" name="color" type="color" value="${esc(st.color || "#0E7C86")}" style="padding:4px;height:44px"></div>
      <div class="field"><label for="q3">Durée de validité (jours)</label><input class="inp num" id="q3" name="validity" type="number" min="1" max="365" value="${st.validity || 30}"></div>
      <div class="field"><label for="q4">Devise affichée</label><input class="inp" id="q4" name="currency" value="${esc(st.currency || "FCFA")}" maxlength="6"></div>
    </div>
    <div class="fgrid">
      <label class="row" style="border:0"><span>Appliquer une taxe sur les devis</span><input type="checkbox" name="taxOn" ${st.tax.on ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--amber)"></label>
      <div class="field"><label for="q5">Nom de la taxe</label><input class="inp" id="q5" name="taxLabel" value="${esc(st.tax.label || "TVA")}"></div>
      <div class="field"><label for="q6">Taux (%)</label><input class="inp num" id="q6" name="taxRate" type="number" min="0" max="100" step="0.01" value="${st.tax.rate}"></div>
    </div>
    <div class="small">Aucune règle fiscale n'est appliquée par défaut : renseignez le taux qui vous concerne, ou laissez la taxe désactivée.</div>
    <div class="fgrid"><div class="field"><label for="q10">Couleur du modèle Pro-forma</label><input class="inp" id="q10" name="refColor" type="color" value="${esc(st.refColor || "#A8282B")}" style="padding:4px;height:44px"></div><label class="row" style="border:0;align-self:end"><span>Créer automatiquement le devis total des travaux</span><input type="checkbox" name="autoTotal" ${st.autoTotal !== false ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--amber)"></label></div>
    <div class="field"><label for="q11">Phrase avant le montant en lettres</label><input class="inp" id="q11" name="arret" value="${esc(st.arret || "")}"></div>
    <div class="field"><label for="q12">Message de fin</label><input class="inp" id="q12" name="merci" value="${esc(st.merci || "")}"></div>
    
    
    <div class="field"><label for="q9">Pied de page</label><input class="inp" id="q9" name="footer" value="${esc(st.footer)}" placeholder="Banque, compte, site internet…"></div>
    <div class="small">Ces réglages s'appliquent aux prochains devis. Les devis déjà finalisés gardent les conditions de leur version.</div>
    <button class="btn b-amb">Enregistrer les réglages des devis</button>
  </form>`;
};
function companyForm(c, st, first) {
  const e = UI.errs || {};
  return `<form novalidate class="card" data-f="company" style="display:flex;flex-direction:column;gap:12px"><h2>Entreprise</h2>
    <div class="logoset"><span class="logo big" style="background:${esc(st.color || "#0E7C86")}">${c.logo ? `<img src="${c.logo}" alt="Logo">` : ini(c.name)}</span><div class="acts"><label class="btn b-sec">${ic("image", 16)}${c.logo ? "Changer le logo" : "Ajouter le logo"}<input type="file" accept="image/*" data-logo hidden></label>${c.logo ? `<button type="button" class="btn b-crit" data-a="logodel">Retirer</button>` : ""}</div></div>
    <div class="fgrid">
      <div class="field"><label for="co1">Nom commercial *</label><input class="inp ${e.name ? "err" : ""}" id="co1" name="name" value="${esc(c.name)}" required>${e.name ? `<div class="ferr">${e.name}</div>` : ""}</div>
      <div class="field"><label for="co2">Téléphone *</label><input class="inp ${e.phone ? "err" : ""}" id="co2" name="phone" type="tel" value="${esc(c.phone)}" required>${e.phone ? `<div class="ferr">${e.phone}</div>` : ""}</div>
      <div class="field"><label for="co3">E-mail</label><input class="inp" id="co3" name="email" type="email" value="${esc(c.email)}"></div>
      <div class="field"><label for="co9">Slogan</label><input class="inp" id="co9" name="slogan" value="${esc(db().settings.slogan || "")}" placeholder="La qualité et l'efficacité font de nous les meilleurs"></div>
      <div class="field"><label for="co4">Adresse (une ligne par information)</label><textarea class="inp" id="co4" name="address" rows="2" placeholder="Quartier, repère">${esc(c.address)}</textarea></div>
      <div class="field"><label for="co5">Ville *</label><input class="inp ${e.city ? "err" : ""}" id="co5" name="city" value="${esc(c.city)}" required placeholder="Abidjan">${e.city ? `<div class="ferr">${e.city}</div>` : ""}</div>
      <div class="field"><label for="co6">Pays</label><input class="inp" id="co6" name="country" value="${esc(c.country)}"></div>
      <div class="field"><label for="co7">RCCM / N° contribuable</label><input class="inp" id="co7" name="legal" value="${esc(c.legal)}" placeholder="Facultatif"></div>
      <div class="field"><label for="co8">Responsable (signature des devis)</label><input class="inp" id="co8" name="owner" value="${esc(c.owner || (H.role === "admin" ? H.userName || "" : ""))}"></div>
    </div>
    <button class="btn b-amb">${first ? "Terminer la configuration" : "Enregistrer l'entreprise"}</button>
  </form>`;
}
VIEWS.configurer = () => `<div class="note">${ic("check", 14)} Bienvenue dans Gestion Aluminium. Indiquez les coordonnées imprimées sur vos devis. Le logo, les couleurs et les conditions restent modifiables dans Paramètres.</div>${head("Configurer mon entreprise", "Une seule étape : vous pourrez ensuite créer votre premier devis immédiatement.")}${companyForm(company(), db().settings, true)}`;

/* ---------- Licence ---------- */
VIEWS.licence = () => {
  const L = lic(); const l = H.license || {}; const adm = role() === "administrateur"; const plan = PLANS().find((x) => x.id === l.planId);
  return `${head("Licence et abonnement", `${esc(company().name)} · une licence par entreprise.`)}
  <div class="card" style="display:flex;flex-direction:column;gap:10px;${L.st === "expired" ? "border-color:var(--crit)" : ""}">
    <div class="ph"><div><h2>État de la licence</h2><div style="font-size:21px;font-weight:800;margin-top:6px;white-space:nowrap" class="${L.st === "expired" ? "down" : ""}">${L.st === "expired" ? esc(L.label) : L.st === "trial" ? "Essai gratuit" : L.st === "lifetime" ? "Licence à vie" : "Licence " + esc(plan ? plan.name : "")}</div><div class="small">${L.st === "expired" ? "Entreprise verrouillée" : L.st === "lifetime" ? "Sans date d'expiration" : L.st === "none" ? "Information indisponible" : `${L.days} jour${L.days > 1 ? "s" : ""} restant${L.days > 1 ? "s" : ""}`}</div></div>${licTag()}</div>
    <div class="row"><span>Activée le</span><b>${l.activatedAt ? dFR(l.activatedAt) : "—"}</b></div>
    <div class="row"><span>${L.st === "expired" ? "A expiré le" : "Expire le"}</span><b>${l.lifetime ? "Jamais" : l.expiresAt ? dFR(l.expiresAt) : "—"}</b></div>
    ${L.st === "expired" ? `<div class="note crit"><b>Entreprise verrouillée.</b> Les employés ne peuvent plus se connecter. Les données sont conservées et redeviennent accessibles dès l'activation d'une licence.</div>` : L.st === "trial" ? `<div class="note warn">Votre essai gratuit de ${TRIAL_DAYS} jours se termine le ${dFR(l.expiresAt)}.</div>` : ""}
  </div>
  ${adm ? `<h2>Offres disponibles</h2><div class="grid g3">${PLANS().map((p) => { const months = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 }[p.id]; return `<div class="card" style="display:flex;flex-direction:column;gap:6px;${p.popular ? "border-color:var(--amber)" : ""}"><div class="ph"><b style="font-size:16px">${esc(p.name)}</b>${p.popular ? '<span class="tag t-amb">Le plus choisi</span>' : ""}</div><div class="small">${esc(p.duration)}</div>${p.price ? `<div style="font-size:22px;font-weight:800;color:var(--amber2)" class="num">${nb(p.price)}<span class="cur">FCFA</span></div><div class="small">${p.old ? `<s>${nb(p.old)} FCFA</s> · ` : ""}soit ${nb(Math.round(p.price / (months || 1)))} FCFA par mois</div>` : `<div style="font-size:18px;font-weight:800">Sur devis</div>`}<button class="btn ${p.popular ? "b-amb" : "b-sec"}" data-a="sheet" data-s="liborder" data-id="${p.id}">Commander</button></div>`; }).join("")}</div>
  <form class="card" data-f="activate" novalidate style="display:flex;flex-direction:column;gap:12px"><h2>J'ai un code d'activation</h2><div class="small">Après paiement, l'équipe GestiOne vous envoie un code à 12 chiffres, valable pour cette entreprise uniquement.</div><input class="inp num ${UI.errs.act ? "err" : ""}" name="code" inputmode="numeric" placeholder="0000-0000-0000" data-ch="codefmt" value="${esc(UI.form.code || "")}" style="font-size:18px;letter-spacing:.12em;text-align:center" aria-label="Code d'activation" required>${UI.errs.act ? `<div class="ferr">${esc(UI.errs.act)}</div>` : ""}<button class="btn b-amb" ${UI.busy ? "disabled" : ""}>${UI.busy ? '<span class="load"></span> Vérification…' : "Activer la licence"}</button></form>` : `<div class="note">Seul l'administrateur peut commander ou activer une licence.</div>`}`;
};
VIEWS.profil = () => `${head("Mon compte", `${ROLES[role()]} · ${esc(company().name)}`)}
  <div class="card" style="display:flex;flex-direction:column;gap:10px;max-width:560px"><div style="display:flex;align-items:center;gap:12px"><span class="mark" style="width:56px;height:56px;font-size:20px">${ini(me().name)}</span><div><b style="font-size:17px">${esc(me().name)}</b><div class="small">${ROLES[role()]} · ${esc(ROLE_DESC[role()])}</div></div></div>
  <div class="small">${role() === "administrateur" ? "Le code administrateur se modifie dans GestiOne, comme pour toutes les entreprises." : "Votre nom, votre rôle et votre code PIN sont gérés par l'administrateur."}</div></div>
  <div class="card" style="max-width:560px"><h2>Mes droits</h2>${Object.entries(PERMS).map(([p, [l]]) => `<div class="row"><span>${l}</span>${can(p) ? '<span class="tag t-good">Oui</span>' : '<span class="tag t-mut">Non</span>'}</div>`).join("")}</div>
  <div class="acts"><button class="btn b-crit" data-a="logout">${ic("out", 17)}Déconnexion</button></div>`;

/* ============================== Feuilles ============================== */
function drawLayer() {
  const L = $("#al-layer"); const shx = UI.sheet; if (!shx || !SHEETS[shx.type]) { L.innerHTML = ""; return; }
  L.innerHTML = `<div class="ov" data-a="ovclose"><div class="sheet ${shx.wide ? "wide" : ""}" role="dialog" aria-modal="true">${SHEETS[shx.type](shx)}</div></div>`;
  const f = L.querySelector("[autofocus]"); if (f) setTimeout(() => f.focus(), 50);
  photoFill();
}
const sh = (t, sub) => `<div class="shh"><div style="min-width:0"><b>${t}</b>${sub ? `<div class="small" style="margin-top:3px">${sub}</div>` : ""}</div><button class="ib" data-a="close" aria-label="Fermer">${ic("x", 18)}</button></div>`;
const objRows = () => {
  const q = norm(UI.osq || ""); const w = UI.wiz || {}; const all = db().services.filter((s) => !s.deleted);
  const nPrices = (sid) => db().prices.filter((p) => !p.deleted && p.serviceId === sid).length;
  const list = all.filter((s) => !q || norm(s.name).includes(q) || norm(s.cat).includes(q)).sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0) || norm(a.name).localeCompare(norm(b.name)));
  const cats = [...new Set(list.map((s) => s.cat || "Sans catégorie"))];
  const exact = all.some((s) => norm(s.name) === q);
  return `${list.length ? cats.map((cat) => `<div class="ogrp">${cats.length > 1 ? `<div class="ogh">${esc(cat)}</div>` : ""}${list.filter((s) => (s.cat || "Sans catégorie") === cat).map((s) => { const p = mainPhoto(s.id); const n = nPrices(s.id); const on = w.ed && w.ed.serviceId === s.id; return `<button class="orow ${on ? "on" : ""}" data-a="objpick" data-id="${s.id}"><span class="oth">${p ? `<img data-photo="${p.id}" alt="">` : ic("win", 20)}</span><span class="ot"><b>${esc(s.name)}</b><span class="small">${esc(modeOf(s.mode)[1])}${n ? ` · ${n} tarif${n > 1 ? "s" : ""} mémorisé${n > 1 ? "s" : ""}` : ""}${s.tech && s.tech.length ? " · " + esc(techLabel(s.tech)) : ""}</span></span>${on ? '<span class="tag t-good">Choisie</span>' : ic("chev", 16)}</button>`; }).join("")}</div>`).join("") : `<div class="oempty">${ic("search", 22)}<b>Aucune prestation ne correspond</b><span class="small">Saisissez ci-dessous l'intitulé du devis : il sera ajouté au catalogue.</span></div>`}
  ${q && !exact ? `<button class="btn b-sec full" data-a="objnew" data-v="${esc(UI.osq.trim())}">${ic("plus", 16)}Utiliser « ${esc(UI.osq.trim())} » comme intitulé</button>` : ""}`;
};
const SHEETS = {
  objpick: () => {
    const n = db().services.filter((s) => !s.deleted).length;
    return `${sh("Choisir la prestation", `${n} prestation${n > 1 ? "s" : ""} enregistrée${n > 1 ? "s" : ""} · touchez celle qui correspond à l'intitulé du devis`)}
    <div class="osearch">${ic("search", 18)}<input class="inp" id="osq" data-osq value="${esc(UI.osq || "")}" placeholder="Rechercher une prestation" autocomplete="off" aria-label="Rechercher une prestation"></div>
    <div id="olist" class="olist">${objRows()}</div>
    <div class="onew ${UI.oNew ? "open" : ""}">${UI.oNew ? `<form novalidate data-f="objnew" class="onewf"><label for="onv" class="flabel">Nouvel intitulé du devis</label><div class="onewr"><input class="inp" id="onv" name="v" value="${esc(UI.oNewV || UI.osq || "")}" placeholder="Ex. Balcon en inox avec vitre 8 mm" autocomplete="off" autofocus><button class="btn b-amb">${ic("check", 16)}Valider</button></div><span class="small">Il est ajouté au catalogue, puis vous passez directement à la saisie des mesures.</span></form>` : `<div class="onewt"><span><b>La prestation n'est pas dans la liste ?</b><span class="small">Saisissez un nouvel intitulé de devis.</span></span><button class="btn b-sec" data-a="objnewopen">${ic("edit", 16)}Saisir un intitulé</button></div>`}</div>`;
  },
  clients: () => {
    const q = norm(UI.csq || ""); const all = db().clients.filter((c) => !c.deleted);
    const qs = (c) => db().quotes.filter((x) => !x.deleted && x.kind !== "total" && (x.clientId === c.id || (!x.clientId && norm(x.client && x.client.name) === norm(c.name)))).sort((a, b) => (b.finalAt || b.createdAt || 0) - (a.finalAt || a.createdAt || 0));
    const list = all.filter((c) => !q || norm(c.name).includes(q) || norm(c.phone).includes(q)).map((c) => ({ c, qs: qs(c) })).sort((a, b) => ((b.qs[0] && (b.qs[0].finalAt || b.qs[0].createdAt)) || b.c.createdAt || 0) - ((a.qs[0] && (a.qs[0].finalAt || a.qs[0].createdAt)) || a.c.createdAt || 0));
    const open = UI.cOpen;
    return `${sh("Liste des clients", `${all.length} client${all.length > 1 ? "s" : ""} · du plus récent au plus ancien`)}
    <input class="inp" id="csq" data-csq value="${esc(UI.csq || "")}" placeholder="Rechercher un nom ou un téléphone" autocomplete="off" aria-label="Rechercher un client">
    <div id="clsheet">${list.length ? list.map(({ c, qs: l }) => { const tot = l.filter((x) => ACTIVE_ST.includes(x.status)).reduce((a, x) => a + (x.kind === "total" ? 0 : x.total || 0), 0); const isOpen = open === c.id; return `<div class="cli ${isOpen ? "on" : ""}">
      <button class="clih" data-a="cliopen" data-id="${c.id}"><span class="mark" style="width:38px;height:38px;font-size:13px">${ini(c.name)}</span><span style="min-width:0;flex:1;text-align:left"><b>${esc(c.name)}</b><span class="small">${esc(c.phone || "Sans téléphone")}${l.length ? ` · ${l.length} devis · dernier le ${dFR(l[0].finalAt || l[0].createdAt)}` : " · aucun devis"}</span></span>${ic("chev", 16)}</button>
      ${isOpen ? `<div class="clid">${l.length ? `<div class="small" style="margin-bottom:4px">Historique des devis${can("finances") ? ` · ${F(tot)} au total` : ""}</div>${l.slice(0, 6).map((x) => `<button class="clq" data-a="openq" data-id="${x.id}"><span style="min-width:0;flex:1;text-align:left"><b>${dFR(x.finalAt || x.createdAt)}</b> · ${esc(qNum(x))}<br><span class="small">${esc(quoteTitle(x))} · ${(x.lines || []).length} ligne${(x.lines || []).length > 1 ? "s" : ""}</span></span><span style="display:flex;flex-direction:column;align-items:flex-end;gap:3px"><b class="num">${moneyT(x.total || 0)}</b>${stTag(x)}</span></button>`).join("")}${l.length > 6 ? `<div class="small">… et ${l.length - 6} devis plus anciens.</div>` : ""}` : `<div class="small">Aucun devis pour ce client.</div>`}
        <div class="acts">${can("devis_creer") ? `<button class="btn b-amb" data-a="clinew" data-id="${c.id}">${ic("plus", 16)}Nouveau devis</button>` : ""}${can("clients") ? `<button class="btn b-sec" data-a="sheet" data-s="client" data-id="${c.id}">${ic("edit", 16)}Modifier les informations</button>` : ""}</div></div>` : ""}</div>`; }).join("") : `<div class="small" style="padding:10px 0">Aucun client ne correspond.</div>`}</div>`;
  },
  client: (x) => { const c = x.id ? client(x.id) : null; const qs = c ? db().quotes.filter((q) => !q.deleted && q.clientId === c.id) : []; const ro = !can("clients");
    return `${sh(c ? esc(c.name) : "Nouveau client", c ? `Créé le ${dFR(c.createdAt)} par ${esc(c.createdBy || "—")}` : "")}<form novalidate data-f="client" data-id="${c ? c.id : ""}" style="display:flex;flex-direction:column;gap:12px"><div class="fgrid"><div class="field"><label for="cl1">Nom *</label><input class="inp" id="cl1" name="name" value="${esc(c ? c.name : "")}" required ${ro ? "readonly" : ""}></div><div class="field"><label for="cl2">Téléphone</label><input class="inp num" id="cl2" name="phone" type="tel" inputmode="numeric" maxlength="15" data-digits placeholder="10 chiffres minimum" value="${esc(c ? c.phone : "")}" ${ro ? "readonly" : ""}></div><div class="field"><label for="cl3">E-mail</label><input class="inp" id="cl3" name="email" type="email" inputmode="email" placeholder="nom@exemple.com" value="${esc(c ? c.email : "")}" ${ro ? "readonly" : ""}></div><div class="field"><label for="cl4">Adresse</label><input class="inp" id="cl4" name="address" value="${esc(c ? c.address : "")}" ${ro ? "readonly" : ""}></div></div><div class="field"><label for="cl5">Notes</label><textarea class="inp" id="cl5" name="notes" ${ro ? "readonly" : ""}>${esc(c ? c.notes || "" : "")}</textarea></div>${ro ? "" : `<button class="btn b-amb">${c ? "Enregistrer" : "Créer le client"}</button>`}</form>
    ${c ? `<div class="card"><h2>Chantiers</h2>${(c.chantiers || []).map((h) => `<div class="row"><span>${esc(h.label)}</span><span class="small">${dFR(h.at)}</span></div>`).join("") || '<div class="small">Les chantiers saisis dans les devis s\'ajoutent ici.</div>'}</div><div class="card"><h2>Devis (${qs.length})</h2>${qs.map((q) => `<button class="row" style="width:100%;text-align:left" data-a="openq" data-id="${q.id}"><span>${esc(qNum(q))} · ${dFR(q.createdAt)}</span><span class="acts"><b class="num">${money(q.total || 0)}</b>${stTag(q)}</span></button>`).join("") || '<div class="small">Aucun devis.</div>'}${can("devis_creer") ? `<button class="btn b-sec full" data-a="qforclient" data-id="${c.id}" style="margin-top:8px">${ic("plus", 16)}Nouveau devis pour ce client</button>` : ""}</div>` : ""}`; },
  service: (x) => { const s = x.id ? svc(x.id) : null; const ro = !can("catalogue"); const f = UI.sform || (UI.sform = { tech: s ? clone(s.tech || []) : [] }); const ps = s ? photosOf(s.id) : []; const n = s ? db().prices.filter((p) => !p.deleted && p.serviceId === s.id) : [];
    const cats = [...new Set(db().services.map((y) => y.cat).filter(Boolean))];
    return `${sh(s ? esc(s.name) : "Nouvelle prestation", s ? `Créée le ${dFR(s.createdAt)} par ${esc(s.createdBy || "—")}${s.updatedAt && s.updatedAt !== s.createdAt ? " · modifiée le " + dFR(s.updatedAt) : ""}` : "Seul le nom est obligatoire.")}
    <form novalidate data-f="service" data-id="${s ? s.id : ""}" style="display:flex;flex-direction:column;gap:12px"><div class="fgrid"><div class="field"><label for="sv1">Nom de la prestation *</label><input class="inp" id="sv1" name="name" value="${esc(s ? s.name : "")}" required ${ro ? "readonly" : ""}></div><div class="field"><label for="sv2">Catégorie</label><input class="inp" id="sv2" name="cat" list="svcats" value="${esc(s ? s.cat || "" : "")}" ${ro ? "readonly" : ""}><datalist id="svcats">${cats.map((cc) => `<option value="${esc(cc)}">`).join("")}</datalist></div><div class="field"><label for="sv3">Unité de facturation</label><select class="inp" id="sv3" name="mode" ${ro ? "disabled" : ""}>${MODES.map(([k, l, , dd]) => `<option value="${k}" ${(s ? s.mode : "piece") === k ? "selected" : ""}>${l} · ${dd}</option>`).join("")}</select></div></div>
    <div class="field"><label for="sv4">Description</label><textarea class="inp" id="sv4" name="desc" ${ro ? "readonly" : ""}>${esc(s ? s.desc || "" : "")}</textarea></div>
    <span class="flabel">Caractéristiques techniques</span>${ro ? `<div class="small">${esc(techLabel(f.tech)) || "—"}</div>` : techEditor(f.tech, "s")}
    ${ro ? "" : `<div class="acts"><button class="btn b-amb">${s ? "Enregistrer" : "Créer la prestation"}</button>${s ? `<button type="button" class="btn b-crit" data-a="svcdel" data-id="${s.id}">Archiver</button>` : ""}</div>`}</form>
    ${s ? `<div class="card"><div class="ph"><h2>Photos (${ps.length})</h2>${ro ? "" : `<span class="acts"><label class="btn b-sec mini">${ic("camera", 15)}Prendre<input type="file" accept="image/*" capture="environment" data-photo-for="${s.id}" hidden></label><label class="btn b-sec mini">${ic("image", 15)}Choisir<input type="file" accept="image/*" data-photo-for="${s.id}" hidden></label></span>`}</div>
    ${ps.length ? `<div class="pgrid">${ps.map((p) => `<div class="pcell ${p.main ? "main" : ""}"><img data-photo="${p.id}" alt="Photo de ${esc(s.name)}">${p.main ? '<span class="tag t-good pmain">Principale</span>' : ""}${p.uploaded ? "" : `<span class="tag t-warn pup">${S.online ? "Envoi…" : "Sur l'appareil"}</span>`}${ro ? "" : `<span class="pact">${p.main ? "" : `<button class="ib" data-a="photomain" data-id="${p.id}" aria-label="Définir comme principale">${ic("star", 15)}</button>`}<label class="ib" aria-label="Remplacer">${ic("refresh", 15)}<input type="file" accept="image/*" data-photo-for="${s.id}" data-replace="${p.id}" hidden></label><button class="ib" data-a="photodel" data-id="${p.id}" aria-label="Supprimer">${ic("trash", 15)}</button></span>`}</div>`).join("")}</div>` : `<div class="phempty"><span class="sth big ph0">${ic("win", 28)}</span><span class="small">Aucune photo. L'illustration ci-contre est générique : elle ne représente pas un ouvrage réalisé. Les photos sont facultatives.</span></div>`}</div>
    <div class="card"><h2>Tarifs mémorisés (${n.length})</h2>${n.slice(0, 12).map((p) => `<button class="row" style="width:100%;text-align:left" data-a="sheet" data-s="refhist" data-id="${p.id}"><span>${dimTxt(p.w, p.h, "cm", p.mode)}${p.techLabel ? `<br><span class="small">${esc(p.techLabel)}</span>` : ""}</span><b class="num">${p.price == null ? "Prix manquant" : money(p.price)}</b></button>`).join("") || '<div class="small">Les tarifs se mémorisent en confirmant des lignes de devis.</div>'}</div>` : ""}`; },
  refhist: (x) => { const p = db().prices.find((y) => y.id === x.id); if (!p) return sh("Tarif introuvable"); const s = svc(p.serviceId);
    return `${sh(esc(p.serviceName || (s ? s.name : "Prestation")), `${dimTxt(p.w, p.h, "cm", p.mode)} · ${modeOf(p.mode)[1]}${p.techLabel ? " · " + esc(p.techLabel) : ""}`)}
    <div class="card"><div class="row"><span>Prix de référence</span><b class="num">${p.price == null ? "Prix manquant" : money(p.price)} ${priceUnitLabel(p.mode)}</b></div><div class="row"><span>Dernière mise à jour</span><b>${dt(p.updatedAt || p.createdAt)} · ${esc(p.updatedBy || p.createdBy || "")}</b></div>${p.confirmedAt ? `<div class="row"><span>Dernière confirmation</span><b>${dt(p.confirmedAt)}</b></div>` : ""}</div>
    <div class="card"><h2>Historique des prix</h2>${(p.history || []).slice().reverse().map((h) => `<div class="row"><span>${dt(h.at)} · ${esc(h.by)}<br><span class="small">${esc(h.quote || "")}</span></span><b class="num">${money(h.price)}</b></div>`).join("") || '<div class="small">Aucun historique.</div>'}</div>
    ${can("tarifs") ? `<form novalidate data-f="refedit" data-id="${p.id}" style="display:flex;flex-direction:column;gap:10px"><div class="field"><label for="rf1">Nouveau prix de référence ${priceUnitLabel(p.mode)} (${esc(cur())})</label><input class="inp num" id="rf1" name="price" inputmode="numeric" value="${p.price == null ? "" : p.price}" required></div><div class="acts"><button class="btn b-amb">Enregistrer le prix</button><button type="button" class="btn b-crit" data-a="refdel" data-id="${p.id}">Supprimer ce tarif</button></div><div class="small">Les devis déjà finalisés conservent leurs prix d'origine.</div></form>` : ""}`; },
  employee: (x) => { const e = x.id ? S.employees.find((y) => y.id === x.id) : null; const ops = e ? db().audit.filter((a) => a.user === e.name).slice(0, 8) : [];
    return `${sh(e ? esc(e.name) : "Nouvel employé", e ? esc(ROLES[e.role]) : "Il se connectera avec son nom et ce code PIN.")}<form novalidate data-f="employee" data-id="${e ? e.id : ""}" style="display:flex;flex-direction:column;gap:12px"><div class="fgrid"><div class="field"><label for="em1">Nom complet *</label><input class="inp" id="em1" name="name" value="${esc(e ? e.name : "")}" required></div><div class="field"><label for="em2">Téléphone</label><input class="inp" id="em2" name="phone" type="tel" value="${esc(e ? e.phone : "")}"></div><div class="field"><label for="em3">Fonction</label><input class="inp" id="em3" name="func" value="${esc(e ? e.func : "")}" placeholder="Commercial, poseur, assistante…"></div><div class="field"><label for="em4">Rôle</label><select class="inp" id="em4" name="role">${ALL_ROLES.filter((r) => r !== "administrateur").map((r) => `<option value="${r}" ${e && e.role === r ? "selected" : ""}>${ROLES[r]}</option>`).join("")}</select></div>${e ? "" : `<div class="field"><label for="em5">Code PIN (4 chiffres) *</label><input class="inp num" id="em5" name="pin" type="password" inputmode="numeric" maxlength="4" required></div>`}</div><div class="small" id="roledesc"></div>
    ${e && e.login ? `<div class="note">Code d'invitation à transmettre : <b>${esc(e.login)}</b>. L'employé ouvre GestiOne › Rejoindre une entreprise.</div>` : ""}
    <div class="acts"><button class="btn b-amb">${e ? "Enregistrer" : "Créer le compte"}</button>${e ? `<button type="button" class="btn b-sec" data-a="sheet" data-s="emppin" data-id="${e.id}">Réinitialiser le code PIN</button><button type="button" class="btn b-sec" data-a="emptoggle" data-id="${e.id}">${e.status === "actif" ? "Désactiver le compte" : "Réactiver le compte"}</button>` : ""}</div></form>
    ${e ? `<div class="card"><h2>Dernières actions</h2>${ops.map((a) => `<div class="row"><span>${dt(a.at)} · ${esc(a.action)}</span><span class="small">${esc(a.obj)}</span></div>`).join("") || '<div class="small">Aucune action enregistrée.</div>'}</div>` : ""}`; },
  emppin: (x) => { const e = S.employees.find((y) => y.id === x.id); return `${sh("Réinitialiser l'accès", esc(e.name))}<div class="small">Procédure sécurisée : confirmez avec le code administrateur. L'ancien code PIN cessera de fonctionner.</div><form novalidate data-f="emppin" data-id="${e.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="ep1">Nouveau code PIN (4 chiffres)</label><input class="inp num" id="ep1" name="pin" type="password" inputmode="numeric" maxlength="4" required autofocus></div><div class="field"><label for="ep2">Code administrateur</label><input class="inp num" id="ep2" name="adm" type="password" inputmode="numeric" maxlength="8" required></div><button class="btn b-amb">Réinitialiser</button></form>`; },
  liborder: (x) => { const p = PLANS().find((y) => y.id === x.id); return `${sh("Commander : " + esc(p.name), (p.price ? nb(p.price) + " FCFA · " : "") + esc(p.duration))}<div class="small">Votre demande est envoyée au service GestiOne par la messagerie. Après paiement, vous recevez le code d'activation de cette entreprise.</div><form novalidate data-f="liborder" data-id="${p.id}" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="lo1">Votre nom</label><input class="inp" id="lo1" name="n" value="${esc(company().owner || "")}" required></div><div class="field"><label for="lo2">Téléphone (WhatsApp)</label><input class="inp" id="lo2" name="t" type="tel" required placeholder="07 00 00 00 00"></div><button class="btn b-amb">Envoyer la demande</button></form>`; },
  conflict: (x) => { const q = quote(x.id); return `${sh("Devis modifié entre-temps", "Aucune donnée n'est écrasée sans votre accord.")}<div class="note warn">${esc(q.updatedBy || "Un autre utilisateur")} a modifié ce devis le ${dt(q.updatedAt)} (version ${q.version}) pendant votre saisie.</div><div class="small">« Enregistrer ma version » crée une nouvelle version à partir de votre saisie ; la version de ${esc(q.updatedBy || "l'autre utilisateur")} reste consultable dans l'historique.</div><div class="acts"><button class="btn b-amb" data-a="conflictgo">Enregistrer ma version</button><button class="btn b-sec" data-a="conflictdrop">Abandonner mes modifications</button></div>`; },
  delline: (x) => `${sh("Supprimer la ligne ?", esc(W().lines[x.i].name))}<div class="acts"><button class="btn b-sec" data-a="close">Annuler</button><button class="btn b-crit" data-a="wldelok" data-i="${x.i}">Supprimer</button></div>`,
  wcancel: () => `${sh(W().editId ? "Annuler la modification ?" : "Abandonner ce devis ?", "")}<div class="note warn">${W().editId ? "Le devis reste tel qu'il était." : "Le brouillon conservé sur cet appareil sera effacé."}</div><div class="acts"><button class="btn b-sec" data-a="close">Continuer la saisie</button><button class="btn b-crit" data-a="wcancelok">${W().editId ? "Annuler la modification" : "Abandonner"}</button></div>`,
  qrevise: (x) => { const q = quote(x.id); return `${sh("Modifier un devis " + (q.status === "accepte" ? "accepté" : "envoyé") + " ?", esc(qNum(q)))}<div class="note warn">Ce devis a déjà été ${q.status === "accepte" ? "accepté par le client" : "envoyé au client"}. La modification créera la <b>version ${(q.version || 1) + 1}</b> (devis révisé). La version ${q.version || 1}, ses montants et ses PDF restent archivés pour l'audit.</div><div class="acts"><button class="btn b-sec" data-a="close">Annuler</button><button class="btn b-amb" data-a="qeditok" data-id="${q.id}">Créer une version révisée</button></div>`; },
  restorepin: () => { const r = UI.restoreData; return `${sh("Restaurer les données ?", esc(r.label))}<div class="note crit">Les clients, prestations, tarifs, devis et photos de ${esc(company().name)} seront remplacés par ceux ${r.kind === "server" ? "de la sauvegarde du serveur" : "du fichier"}. Un point de restauration est créé juste avant.</div><div class="mini">${r.counts.map(([l, n]) => `<div><small>${l}</small><b>${nb(n)}</b></div>`).join("")}</div><form novalidate data-f="restorepin" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="rp1">Code administrateur</label><input class="inp num" id="rp1" name="pw" type="password" inputmode="numeric" maxlength="8" required autofocus></div><button class="btn b-crit">Restaurer</button></form>`; },
  srvlist: () => { const L = UI.srv || {}; return `${sh("Sauvegardes du serveur", "Une par nuit, conservées 30 jours.")}${L.loading ? '<div class="small"><span class="load"></span> Chargement…</div>' : L.err ? `<div class="note crit">${esc(L.err)}</div>` : (L.list || []).length ? (L.list || []).map((b) => `<div class="row"><span><b>${dFR(b.day)}</b><br><span class="small">${b.size_bytes ? nb(b.size_bytes / 1024) + " Ko" : ""}</span></span><button class="btn b-sec" style="min-height:34px;padding:4px 10px" data-a="srvpick" data-id="${b.id}">Restaurer…</button></div>`).join("") : '<div class="small">Aucune sauvegarde serveur pour le moment (la première est faite la nuit suivant la création).</div>'}${L.list ? `<button class="btn b-sec" data-a="srvnow">${ic("cloud", 16)}Sauvegarder maintenant</button>` : ""}`; },
};

/* ============================== Photos ============================== */
function compressImage(file, max = 1280) {
  return new Promise((ok, ko) => {
    const rd = new FileReader(); rd.onerror = () => ko(new Error("Lecture de l'image impossible."));
    rd.onload = () => { const im = new Image(); im.onerror = () => ko(new Error("Format d'image non reconnu.")); im.onload = () => { const r = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement("canvas"); cv.width = Math.round(im.width * r); cv.height = Math.round(im.height * r); const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height); let q = 0.78, out = cv.toDataURL("image/jpeg", q); while (out.length > 850000 && q > 0.4) { q -= 0.1; out = cv.toDataURL("image/jpeg", q); } ok({ data: out, w: cv.width, h: cv.height }); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  });
}
// Couleurs imposées : cachet bleu, signature noire.
const STAMP_BLUE = [24, 46, 200], SIGN_BLACK = [12, 12, 14];
function processStamp(file, kind = "stamp") {
  return new Promise((ok, ko) => {
    const rd = new FileReader(); rd.onerror = () => ko(new Error("Lecture de l'image impossible."));
    rd.onload = () => { const im = new Image(); im.onerror = () => ko(new Error("Format d'image non reconnu.")); im.onload = () => {
      const r = Math.min(1, 1400 / Math.max(im.width, im.height)); const W0 = Math.round(im.width * r), H0 = Math.round(im.height * r);
      const cv = document.createElement("canvas"); cv.width = W0; cv.height = H0; const cx = cv.getContext("2d"); cx.drawImage(im, 0, 0, W0, H0);
      const id = cx.getImageData(0, 0, W0, H0); const px = id.data; let x0 = W0, y0 = H0, x1 = 0, y1 = 0;
      for (let i = 0; i < px.length; i += 4) { const mn = Math.min(px[i], px[i + 1], px[i + 2]); const a = mn >= 232 ? 0 : mn <= 170 ? 255 : Math.round(((232 - mn) / 62) * 255); const ch = Math.max(px[i], px[i + 1], px[i + 2]) - mn; const col = kind === "sign" ? SIGN_BLACK : kind === "stampOnly" ? STAMP_BLUE : ch > 38 ? STAMP_BLUE : SIGN_BLACK; px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = Math.min(px[i + 3], kind === "stamp" || kind === "stampOnly" ? (ch > 38 ? Math.max(a, mn < 200 ? 255 : a) : a) : a); if (px[i + 3] > 40) { const p = i / 4, x = p % W0, y = (p / W0) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (x1 <= x0 || y1 <= y0) return ko(new Error("Aucun cachet détecté sur l'image."));
      cx.putImageData(id, 0, 0); const pad = 8; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W0 - 1, x1 + pad); y1 = Math.min(H0 - 1, y1 + pad);
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1; const s2 = Math.min(1, 640 / Math.max(cw, ch));
      const out = document.createElement("canvas"); out.width = Math.round(cw * s2); out.height = Math.round(ch * s2); out.getContext("2d").drawImage(cv, x0, y0, cw, ch, 0, 0, out.width, out.height);
      ok(out.toDataURL("image/png")); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  });
}
async function addPhoto(serviceId, file, replaceId) {
  if (!need("catalogue", "ajouter une photo")) return;
  const s = svc(serviceId); if (!s) return;
  try {
    toastStatus("Préparation de la photo…");
    const img = await compressImage(file); const d = db(); const at = Date.now();
    let p;
    if (replaceId) { p = d.photos.find((x) => x.id === replaceId); const oldId = p.id; p.deleted = true; if (H.photos && H.photos.del && S.online) Promise.resolve(H.photos.del(oldId)).catch(() => {}); }
    const main = replaceId ? !!(p && p.main) : !photosOf(serviceId).length;
    p = { id: uid("ph"), serviceId, main, at, by: me().name, w: img.w, h: img.h, size: img.data.length, uploaded: false };
    d.photos.push(p); if (H.photos && H.photos.keep) await H.photos.keep(p.id, img.data);
    if (main) d.photos.forEach((x) => { if (x.serviceId === serviceId && x.id !== p.id) x.main = false; });
    s.updatedAt = at; audit(replaceId ? "Photo remplacée" : "Photo ajoutée", s.name); save();
    toast(S.online ? "Photo enregistrée · envoi au serveur…" : "Photo enregistrée sur cet appareil — synchronisation en attente");
    if (UI.wiz) UI.wiz.ed.photoSkip = true;
    UI.sheet ? drawLayer() : render(); uploadPending();
  } catch (e) { toast((e && e.message) || "Photo non enregistrée — réessayer.", "err"); }
}
let uploading = false;
async function uploadPending() {
  if (uploading || !S.online || !H.photos || !H.photos.put) return; uploading = true;
  try {
    for (const p of db().photos.filter((x) => !x.deleted && !x.uploaded && x.by && H.photos.local)) {
      const data = await H.photos.local(p.id); if (!data) continue;
      try { await H.photos.put(p.id, data); p.uploaded = true; p.upAt = Date.now(); save(); } catch (e) { p.tries = (p.tries || 0) + 1; p.lastErr = String((e && e.message) || e).slice(0, 120); save(); break; }
    }
  } finally { uploading = false; if (UI.sheet && UI.sheet.type === "service") drawLayer(); }
}

/* ============================== Export / restauration ============================== */
async function exportAll() {
  if (!need("exporter", "exporter les données")) return;
  toastStatus("Préparation de l'export…");
  const d = db(); const photosData = {};
  for (const p of d.photos.filter((x) => !x.deleted)) { const src = await photoData(p.id); if (src) photosData[p.id] = src; }
  const data = Object.fromEntries(Object.entries(KEYS).map(([k, key]) => [key, d[k]])); data.aluSettings = [d.settings];
  const file = JSON.stringify({ app: "GestiOne Aluminium", version: 1, shop: company().name, shopId: H.shop.id, at: new Date().toISOString(), by: me().name, data, photosData });
  const name = `sauvegarde-${norm(company().name).replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
  audit("Export des données", name, `${d.quotes.length} devis, ${Object.keys(photosData).length} photo(s)`); save();
  try { if (H.exportFile) await H.exportFile(name, file); else { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([file], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } toast("Export prêt : " + name); }
  catch (e) { toast("Export impossible — réessayer.", "err"); }
}
function countsOf(data) { return [["Clients", (data.aluClients || []).length], ["Prestations", (data.aluServices || []).length], ["Tarifs", (data.aluPrices || []).length], ["Devis", (data.aluQuotes || []).length], ["Photos", (data.aluPhotos || []).filter((p) => !p.deleted).length]]; }
function snapshotNow(label) { const d = db(); const snap = JSON.stringify({ ...Object.fromEntries(Object.keys(KEYS).map((k) => [k, d[k]])), settings: d.settings }); const id = uid("b"); SNAPS[id] = snap; d.backups.push({ id, at: Date.now(), label }); }
async function applyRestore() {
  const r = UI.restoreData; const d = db(); snapshotNow("Avant restauration (" + r.label + ")");
  Object.entries(KEYS).forEach(([k, key]) => { if (k !== "audit") d[k] = clone(r.data[key] || []); });
  if (r.data.aluSettings && r.data.aluSettings[0]) d.settings = hostDb({ aluSettings: r.data.aluSettings }).settings;
  if (r.photosData && H.photos && H.photos.keep) { for (const [id, src] of Object.entries(r.photosData)) { await H.photos.keep(id, src); const p = d.photos.find((x) => x.id === id); if (p && r.kind === "file") p.uploaded = false; } }
  audit("Restauration des données", r.label, countsOf(r.data).map(([l, n]) => `${n} ${l.toLowerCase()}`).join(", "));
  save(); UI.restoreData = null; UI.sheet = null; render(); toast("Données restaurées. " + localOnlyMsg()); uploadPending();
}

/* ============================== Actions ============================== */
const ACT = {
  go: (x) => { if (x.v === "commande" && !(UI.view === "commande" && UI.ord)) UI.ord = null; if (x.v === "menu") { UI.view = "menu"; render(); window.scrollTo(0, 0); return; } const n = navItem(x.v); if (n && n[3] && !can(n[3]) && !(x.v === "nouveau" && UI.wiz && UI.wiz.editId)) return deny("ouvrir « " + n[1] + " »"); UI.view = x.v; UI.sheet = null; if (x.v === "modele" && !UI.qid) UI.view = "devis"; window.scrollTo(0, 0); render(); },
  logout: () => { audit("Déconnexion", me().name); save(); if (H.onLogout) H.onLogout(); },
  refresh: () => { if (H.sync && H.sync.onSyncNow) H.sync.onSyncNow(); uploadPending(); },
  theme: () => { MODE = MODE === "nuit" ? "clair" : "nuit"; applyMode(MODE); try { localStorage.setItem("alu-mode", MODE); } catch (e) { /* ignore */ } render(); },
  close: () => { UI.sheet = null; UI.sform = null; UI.busy = false; render(); },
  ovclose: (x, e) => { if (e.target.classList.contains("ov") && !UI.busy) { UI.sheet = null; UI.sform = null; render(); } },
  sheet: (x) => { if (x.s === "service" && !x.id && !need("catalogue", "créer une prestation")) return; if (x.s === "client" && !x.id && !need("clients", "créer un client")) return; if (x.s === "employee" && !need("employes", "gérer les employés")) return; UI.sform = null; UI.sheet = { type: x.s, id: x.id, i: x.i }; drawLayer(); },
  openq: (x) => { UI.qid = x.id; UI.view = "fiche"; UI.sheet = null; window.scrollTo(0, 0); render(); },
  qreset: () => { ["q", "st", "by", "sort"].forEach((k) => delete UI.flt[k]); UI.lim = 30; render(); },
  qmore: () => { UI.lim += 30; render(); },
  objsheet: () => { UI.osq = ""; UI.oNew = false; UI.oNewV = ""; UI.sheet = { type: "objpick", wide: true }; drawLayer(); },
  objnewopen: () => { UI.oNew = true; UI.oNewV = UI.osq || ""; drawLayer(); setTimeout(() => { const i = $("#onv"); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { /* ignore */ } } }, 60); },
  objpick: (x) => { const s = svc(x.id); if (!s) return; chooseObjet(s.name, s); },
  objnew: (x) => chooseObjet(String(x.v || "").trim(), null),
  clientsheet: () => { UI.cOpen = null; UI.csq = ""; UI.sheet = { type: "clients", wide: true }; drawLayer(); setTimeout(() => { const i = $("#csq"); if (i) i.focus(); }, 60); },
  cliopen: (x) => { UI.cOpen = UI.cOpen === x.id ? null : x.id; drawLayer(); },
  clinew: (x) => { const c = client(x.id); const w = UI.view === "nouveau" && UI.wiz && !UI.wiz.editId ? UI.wiz : (UI.wiz = newWiz()); w.clientId = c.id; w.client = { name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" }; w.step = 1; keepDraft(); UI.sheet = null; UI.view = "nouveau"; render(); focusSel("#wc5"); toast(`Client « ${c.name} » sélectionné. Vérifiez ses informations puis continuez.`); },
  qforclient: (x) => { const c = client(x.id); UI.wiz = newWiz({ clientId: c.id, client: { name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" }, step: 1 }); keepDraft(); UI.sheet = null; UI.view = "nouveau"; render(); },
  // Assistant
  wstep: (x) => { const w = W(); const n = Number(x.n); if (n >= 2 && !w.client.name.trim()) { w.step = 1; render(); return toast("Indiquez d'abord le client.", "err"); } if (n === 3 && !w.lines.length) return toast("Ajoutez au moins une ligne.", "err"); w.step = n; keepDraft(); render(); window.scrollTo(0, 0); if (n === 2) focusSel(w.ed.serviceId ? (needsW(w.ed.mode) ? "#ed-w" : "#ed-q") : "#ed-svc"); },
  wcancel: () => { UI.sheet = { type: "wcancel" }; drawLayer(); },
  wcancelok: () => { const ed = UI.wiz && UI.wiz.editId; UI.wiz = null; dropDraft(); UI.sheet = null; UI.restored = false; if (ed) { UI.qid = ed; UI.view = "fiche"; } else UI.view = "dashboard"; render(); },
  wpickclient: (x) => { const c = client(x.id); const w = W(); w.clientId = c.id; w.client = { name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" }; keepDraft(); render(); focusSel("#wc5"); },
  wclientclear: () => { const w = W(); w.clientId = null; w.client = { name: "", phone: "", email: "", address: "" }; keepDraft(); render(); focusSel("#wc1"); },
  wpicksvc: (x) => { const s = svc(x.id); const w = W(); const e = w.ed; e.serviceId = s.id; e.name = s.name; e.mode = s.mode || "piece"; e.tech = clone(s.tech || []); e.creating = false; e.custom = false; e.photoSkip = false; keepDraft(); render(); focusSel(needsW(e.mode) ? "#ed-w" : "#ed-q"); },
  wcreate: () => { const e = W().ed; e.creating = true; e.tech = e.tech || []; render(); focusSel("#ns1"); },
  wcreatecancel: () => { W().ed.creating = false; render(); focusSel("#ed-svc"); },
  wnewsvc: () => { const w = W(); w.ed = newEd(); render(); focusSel("#ed-svc"); },
  wtech: () => { const e = W().ed; e.techOpen = !e.techOpen; render(); if (!e.techOpen) relookup(); },
  tadd: (x) => { const t = x.s === "e" ? W().ed.tech : UI.sform.tech; t.push({ k: "", v: "" }); if (x.s === "e") { keepDraft(); render(); } else drawLayer(); },
  ttrash: (x) => { const t = x.s === "e" ? W().ed.tech : UI.sform.tech; t.splice(Number(x.i), 1); if (x.s === "e") { keepDraft(); render(); relookup(); } else drawLayer(); },
  wunit: (x) => { const e = W().ed; const w0 = toMm(e.w, e.unit), h0 = toMm(e.h, e.unit); e.unit = x.u; if (w0) e.w = String(fromMm(w0, x.u)).replace(".", ","); if (h0) e.h = String(fromMm(h0, x.u)).replace(".", ","); keepDraft(); render(); focusSel("#ed-w"); },
  wuseref: () => commitLine(true),
  wcustom: () => { W().ed.custom = true; W().ed.price = ""; relookup(true); focusSel("#ed-p"); },
  wcustomoff: () => { W().ed.custom = false; relookup(true); },
  wuseprice: (x) => { const e = W().ed; e.price = String(x.p); const i = $("#ed-p"); if (i) { i.value = e.price; updateAmount(); i.focus(); } },
  wconfirm: () => commitLine(false),
  wledit: (x) => { const w = W(); const l = w.lines[Number(x.i)]; w.ed = { ...newEd(), serviceId: l.serviceId && svc(l.serviceId) ? l.serviceId : null, name: l.name, lockedName: !l.serviceId, tech: clone(l.tech || []), unit: l.unit || "cm", mode: l.mode, w: l.w || (l.wmm ? String(fromMm(l.wmm, l.unit || "cm")) : ""), h: l.h || (l.hmm ? String(fromMm(l.hmm, l.unit || "cm")) : ""), qty: String(l.qty), price: String(l.price), custom: true, idx: Number(x.i), photoSkip: true }; render(); window.scrollTo(0, 0); focusSel(needsW(l.mode) ? "#ed-w" : "#ed-q"); },
  wldel: (x) => { UI.sheet = { type: "delline", i: Number(x.i) }; drawLayer(); },
  wldelok: (x) => { const w = W(); const l = w.lines.splice(Number(x.i), 1)[0]; if (w.ed.idx != null) w.ed = newEd(); keepDraft(); UI.sheet = null; render(); toast("Ligne supprimée : " + l.name); },
  wphotoskip: () => { W().ed.photoSkip = true; keepDraft(); render(); focusSel(needsW(W().ed.mode) ? "#ed-w" : "#ed-q"); },
  wdraft: () => finishQuote(true),
  wfinish: () => finishQuote(false),
  conflictgo: () => { UI.sheet = null; finishQuote(false, true); },
  conflictdrop: () => { const id = W().editId; UI.wiz = null; dropDraft(); UI.sheet = null; UI.qid = id; UI.view = "fiche"; render(); toast("Modifications abandonnées. Version actuelle affichée."); },
  // Devis
  qedit: (x) => { const q = quote(x.id); if (!need("devis_modifier", "modifier un devis")) return; if (["envoye", "accepte"].includes(q.status)) { UI.sheet = { type: "qrevise", id: q.id }; return drawLayer(); } ACT.qeditok(x); },
  qeditok: (x) => { const q = quote(x.id); UI.wiz = wizFromQuote(q, false); keepDraft(); UI.sheet = null; UI.view = "nouveau"; render(); window.scrollTo(0, 0); },
  qdup: (x) => { if (!need("devis_creer", "créer un devis")) return; const q = quote(x.id); UI.wiz = wizFromQuote(q, true); keepDraft(); UI.view = "nouveau"; render(); toast(`Copie de ${qNum(q)} : choisissez le client, puis ajustez les lignes.`); },
  qstatus: (x) => { const q = quote(x.id); if (!need("devis_modifier", "changer le statut d'un devis")) return; if (q.status === x.s) return; const before = STATUSES[q.status][0]; q.status = x.s; q.updatedAt = Date.now(); q.updatedBy = me().name; q.rev = (q.rev || 1) + 1; if (x.s === "envoye") q.sentAt = Date.now(); if (x.s === "accepte") q.acceptedAt = Date.now(); audit("Statut du devis", qNum(q), `${before} → ${STATUSES[x.s][0]}`); if (q.kind !== "total") syncTotal(q); save(); render(); toast(`Statut : ${STATUSES[x.s][0]} · ${localOnlyMsg()}`); say(`Devis ${STATUSES[x.s][0].toLowerCase()}.`); },
  totinc: (x) => { if (!need("devis_modifier", "modifier un devis total")) return; const t = quote(x.id); const ex = new Set(t.excluded || []); if (ex.has(x.q)) ex.delete(x.q); else ex.add(x.q); t.excluded = [...ex]; const src = totalSources(t); if (src.length < 1) { ex.delete(x.q); t.excluded = [...ex]; return toast("Le devis total doit contenir au moins un devis.", "err"); } syncTotal(t, true); save(); render(); toast("Devis total mis à jour : version " + t.version + "."); },
  totmake: (x) => { if (!need("devis_creer", "créer un devis total")) return; const q = quote(x.id); const t = syncTotal(q, true); if (!t) return toast("Il faut au moins deux devis finalisés pour ce client.", "err"); save(); UI.qid = t.id; UI.view = "fiche"; render(); },
  pickth: (x) => { UI.mt = x.t; render(); },
  pdfopen: (x) => { UI.qid = x.id; UI.mv = Number(x.v) || quote(x.id).version; UI.mt = UI.mt || db().settings.theme; UI.view = "modele"; render(); window.scrollTo(0, 0); },
  pdfdl: (x) => makeDoc(x.id, "pdf", x.v, x.t),
  pdfprint: (x) => makeDoc(x.id, "print", x.v, x.t),
  // Catalogue / tarifs
  photomain: (x) => { const p = db().photos.find((y) => y.id === x.id); db().photos.forEach((y) => { if (y.serviceId === p.serviceId) y.main = y.id === p.id; }); audit("Photo principale", (svc(p.serviceId) || {}).name || ""); save(); drawLayer(); toast("Photo principale définie."); },
  photodel: (x) => { const p = db().photos.find((y) => y.id === x.id); p.deleted = true; if (p.main) { const n = photosOf(p.serviceId)[0]; if (n) n.main = true; } if (H.photos && H.photos.del && S.online) Promise.resolve(H.photos.del(p.id)).catch(() => {}); audit("Photo supprimée", (svc(p.serviceId) || {}).name || ""); save(); drawLayer(); toast("Photo supprimée."); },
  svcdel: (x) => { const s = svc(x.id); s.deleted = true; s.updatedAt = Date.now(); audit("Prestation archivée", s.name); save(); UI.sheet = null; render(); toast("Prestation archivée. Les devis existants ne changent pas."); },
  refdel: (x) => { if (!need("tarifs", "supprimer un tarif")) return; const p = db().prices.find((y) => y.id === x.id); p.deleted = true; p.updatedAt = Date.now(); audit("Tarif supprimé", `${p.serviceName} · ${dimTxt(p.w, p.h, "cm", p.mode)}`); save(); UI.sheet = null; render(); toast("Tarif supprimé."); },
  // Équipe
  permtog: (x) => { if (role() !== "administrateur") return deny("modifier les permissions"); const st = db().settings; st.perms[x.r] = { ...(st.perms[x.r] || {}) }; const on = permOn(x.r, x.p); st.perms[x.r][x.p] = !on; audit("Modification des permissions", `${ROLES[x.r]} · ${PERMS[x.p][0]}`, !on ? "autorisé" : "retiré"); save(); render(); },
  emptoggle: (x) => { if (!need("employes", "gérer les employés")) return; const list = (H.vendors || []).map((v) => (v.id === x.id ? { ...v, blocked: !v.blocked } : v)); const v = list.find((y) => y.id === x.id); audit("Compte " + (v.blocked ? "désactivé" : "réactivé"), v.name); save(); UI.sheet = null; H.staffApi.saveVendors(list); toast(v.blocked ? `${v.name} ne peut plus se connecter.` : `${v.name} peut de nouveau se connecter.`); },
  // Sauvegardes
  exportAll: () => exportAll(),
  undo: (x) => { if (!need("restaurer", "restaurer des données")) return; const snap = JSON.parse(SNAPS[x.id]); const d = db(); Object.keys(KEYS).forEach((k) => { if (k !== "audit") d[k] = snap[k] || []; }); d.settings = snap.settings || d.settings; audit("Retour à un point de restauration", dt(d.backups.find((b) => b.id === x.id).at)); save(); render(); toast("Point de restauration appliqué."); },
  srvlist: () => { if (!need("restaurer", "restaurer des données")) return; UI.srv = { loading: true }; UI.sheet = { type: "srvlist" }; drawLayer(); Promise.resolve(H.backups.list()).then((l) => { UI.srv = { list: l || [] }; drawLayer(); }).catch((e) => { UI.srv = { err: S.online ? "Liste indisponible pour le moment." : "Connexion Internet nécessaire pour consulter les sauvegardes du serveur." }; drawLayer(); }); },
  srvnow: () => { Promise.resolve(H.backups.now()).then((l) => { UI.srv = { list: l || [] }; drawLayer(); toast("Sauvegarde du serveur effectuée."); }).catch(() => toast("Sauvegarde impossible pour le moment.", "err")); },
  srvpick: (x) => { toastStatus("Chargement de la sauvegarde…"); Promise.resolve(H.backups.get(x.id)).then((b) => { const data = (b && b.data) || {}; if (!data.aluQuotes && !data.aluServices) return toast("Cette sauvegarde ne contient pas de données Aluminium.", "err"); UI.restoreData = { kind: "server", label: "Sauvegarde serveur du " + dFR(b.day || b.created_at), data, counts: countsOf(data) }; UI.sheet = { type: "restorepin" }; drawLayer(); }).catch(() => toast("Sauvegarde indisponible — réessayer.", "err")); },
  stamptog: () => { UI.stamp = !(UI.stamp == null ? stampDefault() : UI.stamp); render(); },
  stampauto: () => { const st = db().settings; st.stampOn = st.stampOn === false; audit("Modification des paramètres", "Cachet automatique", st.stampOn ? "activé" : "désactivé"); save(); render(); },
  stampdel: (x) => { const k = ["stamp", "stampOnly", "sign"].includes(x && x.k) ? x.k : "stamp"; const l = (STAMP_SLOTS.find((s2) => s2[0] === k) || [])[1]; const st = db().settings; st.identity = { ...st.identity, [k]: "" }; audit("Modification des paramètres", l + " retiré"); save(); render(); toast(STAMP_MSG[k][1]); },
  logodel: () => { const st = db().settings; st.identity = { ...st.identity, logo: "" }; audit("Modification des paramètres", "Logo retiré"); save(); render(); },
};

// Intitulé choisi (prestation existante ou nouvel intitulé) : on referme la liste et on
// passe directement à la saisie des mesures si les informations du client sont valides.
function chooseObjet(name, s) {
  const w = W(); if (!name) return;
  w.objet = name;
  if (s) { w.ed = { ...newEd(), serviceId: s.id, name: s.name, mode: s.mode || "piece", tech: clone(s.tech || []) }; s.usedAt = Date.now(); }
  else if (w.ed && w.ed.idx == null) w.ed = newEd();
  keepDraft(); UI.sheet = null; UI.osq = ""; UI.oNew = false; drawLayer(); render();
  FORMS.wclient();
}

/* ============================== Formulaires ============================== */
const FORMS = {
  objnew: (f) => { const v = String(f.v.value || "").trim(); if (!v) return fieldErr("#onv", "Saisissez l'intitulé du devis."); chooseObjet(v, db().services.find((x) => !x.deleted && norm(x.name) === norm(v)) || null); },
  wclient: () => {
    const w = W(); w.client.phone = String(w.client.phone || "").replace(/\D/g, ""); w.client.email = String(w.client.email || "").trim();
    if (!checkClient(w.client, { name: "#wc1", phone: "#wc2", email: "#wc3" })) return;
    const obj = String(w.objet || "").trim(); if (!obj) return fieldErr("#wc6", "L'intitulé du devis est obligatoire.");
    let note = "";
    if (w.ed.idx == null && !w.ed.serviceId) {
      let s = db().services.find((x) => !x.deleted && norm(x.name) === norm(obj));
      if (s) note = `Prestation « ${s.name} » retrouvée : saisissez directement les dimensions.`;
      else if (can("catalogue")) { const at = Date.now(); s = { id: uid("s"), name: obj, cat: "", desc: "", tech: [], mode: "piece", unit: "pièce", createdAt: at, createdBy: me().name, updatedAt: at, usedAt: at }; db().services.push(s); audit("Création d'une prestation", obj, "depuis l'intitulé du devis"); save(); note = `Prestation « ${obj} » ajoutée au catalogue · ${localOnlyMsg()}`; }
      if (s) Object.assign(w.ed, { serviceId: s.id, name: s.name, mode: s.mode || "piece", tech: clone(s.tech || []), creating: false, custom: false, sq: "" });
    }
    w.step = 2; keepDraft(); render(); window.scrollTo(0, 0); focusSel(w.ed.serviceId ? (needsW(w.ed.mode) ? "#ed-w" : "#ed-q") : "#ed-svc"); if (note) toast(note);
  },
  wsvc: (f) => {
    const w = W(); const e = w.ed; const name = e.sq.trim(); if (!name) return;
    const mode = f.mode.value; const cat = f.cat.value.trim(); const desc = f.desc.value.trim();
    if (can("catalogue")) {
      const at = Date.now(); const s = { id: uid("s"), name, cat, desc, tech: cleanTech(e.tech), mode, unit: modeOf(mode)[2], createdAt: at, createdBy: me().name, updatedAt: at, usedAt: at };
      db().services.push(s); if (cat && !db().categories.some((c) => norm(c.name) === norm(cat))) db().categories.push({ id: uid("k"), name: cat, at });
      audit("Création d'une prestation", name, "depuis un devis"); save();
      Object.assign(e, { serviceId: s.id, name, mode, creating: false, photoSkip: false });
      toast(`Prestation « ${name} » ajoutée au catalogue · ${localOnlyMsg()}`);
    } else Object.assign(e, { serviceId: null, name, lockedName: true, mode, creating: false });
    keepDraft(); render(); focusSel(needsW(mode) ? "#ed-w" : "#ed-q");
  },
  qflt: (f) => { Object.assign(UI.flt, Object.fromEntries(new FormData(f))); UI.lim = 30; render(); },
  cflt: (f) => { UI.flt.cq = f.cq.value; render(); },
  sflt: (f) => { UI.flt.sq = f.sq.value; render(); },
  tflt: (f) => { UI.flt.ts = f.ts.value; UI.flt.tq = f.tq.value; render(); },
  jflt: (f) => { UI.flt.ju = f.ju.value; render(); },
  client: (f) => { if (!need("clients", "modifier un client")) return; const v = Object.fromEntries(new FormData(f)); const at = Date.now(); let c = f.dataset.id ? client(f.dataset.id) : null; v.phone = String(v.phone || "").replace(/\D/g, ""); if (!checkClient(v, { name: "#cl1", phone: "#cl2", email: "#cl3" })) return;
    if (c) { Object.assign(c, { name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim(), address: v.address.trim(), notes: v.notes.trim(), updatedAt: at }); audit("Modification d'un client", c.name); }
    else { c = { id: uid("c"), name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim(), address: v.address.trim(), notes: v.notes.trim(), chantiers: [], createdAt: at, createdBy: me().name, updatedAt: at }; db().clients.push(c); audit("Création d'un client", c.name); }
    save(); if (UI.cOpen === (c && c.id)) { UI.sheet = { type: "clients", wide: true }; drawLayer(); } else { UI.sheet = null; render(); } if (UI.wiz && UI.wiz.clientId === c.id) { UI.wiz.client = { name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" }; keepDraft(); if (!UI.sheet) render(); } toast("Client enregistré · " + localOnlyMsg()); },
  service: (f) => { if (!need("catalogue", "modifier une prestation")) return; const v = Object.fromEntries(new FormData(f)); const at = Date.now(); const name = (v.name || "").trim(); if (!name) return toast("Le nom de la prestation est obligatoire.", "err");
    let s = f.dataset.id ? svc(f.dataset.id) : null; const tech = cleanTech(UI.sform ? UI.sform.tech : []);
    if (db().services.some((x) => !x.deleted && x.id !== (s && s.id) && norm(x.name) === norm(name))) return toast("Une prestation porte déjà ce nom.", "err");
    if (s) { Object.assign(s, { name, cat: v.cat.trim(), desc: v.desc.trim(), mode: v.mode || s.mode, unit: modeOf(v.mode || s.mode)[2], tech, updatedAt: at, updatedBy: me().name }); audit("Modification d'une prestation", name); }
    else { s = { id: uid("s"), name, cat: v.cat.trim(), desc: v.desc.trim(), mode: v.mode || "piece", unit: modeOf(v.mode || "piece")[2], tech, createdAt: at, createdBy: me().name, updatedAt: at }; db().services.push(s); audit("Création d'une prestation", name); }
    if (s.cat && !db().categories.some((c) => norm(c.name) === norm(s.cat))) db().categories.push({ id: uid("k"), name: s.cat, at });
    save(); UI.sform = null; UI.sheet = { type: "service", id: s.id }; render(); toast("Prestation enregistrée · " + localOnlyMsg()); },
  refedit: (f) => { if (!need("tarifs", "modifier un tarif")) return; const p = db().prices.find((y) => y.id === f.dataset.id); const price = num(f.price.value); if (!(price >= 0)) return toast("Prix invalide.", "err"); if (price === p.price) return toast("Prix inchangé."); const at = Date.now(); p.history = [...(p.history || []), { price, at, by: me().name, quote: "modifié dans le catalogue" }]; p.price = price; p.updatedAt = at; p.updatedBy = me().name; audit("Modification d'un tarif", `${p.serviceName} · ${dimTxt(p.w, p.h, "cm", p.mode)}`, F(price)); save(); drawLayer(); toast("Tarif de référence mis à jour · " + localOnlyMsg()); },
  employee: (f) => {
    if (!need("employes", "gérer les employés")) return;
    const v = Object.fromEntries(new FormData(f)); const id = f.dataset.id || null; const pin = (v.pin || "").trim(); const vendors = H.vendors || [];
    if (!v.name.trim()) return toast("Le nom est obligatoire.", "err");
    if (!id && !/^\d{4}$/.test(pin)) return toast("Le code PIN contient exactement 4 chiffres.", "err");
    if (pin && H.staffApi.isPinTaken && H.staffApi.isPinTaken(pin, id)) return toast("Ce code PIN est déjà utilisé. Choisissez-en un autre.", "err");
    if (vendors.some((x) => x.id !== id && norm(x.name) === norm(v.name))) return toast("Un employé porte déjà ce nom.", "err");
    const initial = id ? vendors.find((x) => x.id === id) : null;
    const rec = H.staffApi.buildVendor({ name: v.name.trim(), pin, phone: v.phone, aluRole: v.role, aluFunc: (v.func || "").trim(), initial });
    const list = initial ? vendors.map((x) => (x.id === id ? rec : x)) : [...vendors, rec];
    audit(initial ? "Modification d'un employé" : "Création d'un utilisateur", rec.name, ROLES[v.role]); save();
    UI.sheet = null; H.staffApi.saveVendors(list);
    toast(initial ? "Employé mis à jour." : `Compte créé pour ${rec.name}${rec.joinCode ? ` · code d'invitation ${rec.joinCode}` : ""}.`);
  },
  emppin: (f) => {
    const pin = f.pin.value.trim(); if (!/^\d{4}$/.test(pin)) return toast("Le code PIN contient exactement 4 chiffres.", "err");
    Promise.resolve(H.verifyOwnerPin ? H.verifyOwnerPin(f.adm.value) : false).then((ok) => {
      if (!ok) { audit("Réinitialisation d'accès refusée", "code administrateur incorrect"); save(); return toast("Code administrateur incorrect.", "err"); }
      const id = f.dataset.id; if (H.staffApi.isPinTaken && H.staffApi.isPinTaken(pin, id)) return toast("Ce code PIN est déjà utilisé.", "err");
      const vendors = H.vendors || []; const initial = vendors.find((x) => x.id === id);
      const rec = H.staffApi.buildVendor({ name: initial.name, pin, phone: initial.phone, aluRole: initial.aluRole, aluFunc: initial.aluFunc, initial });
      audit("Réinitialisation d'accès", rec.name, "nouveau code PIN"); save(); UI.sheet = null; H.staffApi.saveVendors(vendors.map((x) => (x.id === id ? rec : x))); toast(`Nouveau code PIN enregistré pour ${rec.name}.`);
    });
  },
  company: (f) => {
    const v = Object.fromEntries(new FormData(f)); const e = {};
    if (!v.name.trim()) e.name = "Le nom commercial est obligatoire."; if (!/^[\d\s+().\/-]{8,}$/.test((v.phone || "").trim())) e.phone = "Numéro de téléphone invalide."; if (!v.city.trim()) e.city = "La ville est obligatoire.";
    if (Object.keys(e).length) { UI.errs = e; return render(); }
    const st = db().settings; const first = !st.configured;
    st.slogan = (v.slogan || "").trim(); st.identity = { ...st.identity, phone: v.phone.trim(), email: v.email.trim(), address: v.address.trim(), city: v.city.trim(), country: v.country.trim(), legal: v.legal.trim(), owner: v.owner.trim() }; st.configured = true;
    if (v.name.trim() !== H.shop.name && H.renameShop) H.renameShop(v.name.trim());
    audit(first ? "Configuration de l'entreprise" : "Modification des paramètres", "Identité de l'entreprise"); save(); UI.errs = {};
    if (first) { UI.view = can("devis_creer") ? "nouveau" : "dashboard"; render(); window.scrollTo(0, 0); toast("Entreprise configurée. Créez votre premier devis."); } else { render(); toast("Entreprise enregistrée."); }
  },
  quoteset: (f) => { const st = db().settings; const v = Object.fromEntries(new FormData(f)); Object.assign(st, { theme: v.theme, color: v.color, refColor: v.refColor || "#A8282B", autoTotal: !!f.autoTotal.checked, arret: (v.arret || "").trim(), merci: (v.merci || "").trim(), validity: Math.max(1, Math.round(num(v.validity) || 30)), currency: (v.currency || "FCFA").trim() || "FCFA", footer: v.footer.trim(), tax: { on: !!f.taxOn.checked, label: (v.taxLabel || "TVA").trim(), rate: Math.max(0, num(v.taxRate) || 0) } }); audit("Modification des paramètres", "Réglages des devis"); save(); render(); toast("Réglages des devis enregistrés."); },
  activate: (f) => { const code = f.code.value.replace(/\D/g, ""); UI.form = { code: f.code.value }; if (code.length !== 12) { UI.errs = { act: "Le code contient 12 chiffres." }; return render(); } if (!H.onActivateLicense) return; UI.busy = true; UI.errs = {}; render(); Promise.resolve(H.onActivateLicense(code)).then((ok) => { UI.busy = false; if (ok) { UI.form = {}; audit("Activation de licence", company().name); save(); } else UI.errs = { act: "Code refusé. Vérifiez-le ou contactez le service GestiOne." }; render(); }).catch(() => { UI.busy = false; UI.errs = { act: "Activation impossible pour le moment. Vérifiez la connexion internet." }; render(); }); },
  liborder: (f) => { const p = PLANS().find((x) => x.id === f.dataset.id); if (!/^[\d\s+]{8,}$/.test(f.t.value.trim())) return toast("Numéro de téléphone invalide.", "err"); const text = `Bonjour, je souhaite commander la licence ${p.name} (${p.duration}) pour l'entreprise « ${company().name} » (Aluminium). Nom : ${f.n.value.trim()}. Téléphone : ${f.t.value.trim()}.`; audit("Demande de licence", p.name); save(); UI.sheet = null; render(); if (H.onOrderLicense) H.onOrderLicense(text, { name: f.n.value.trim(), phone: f.t.value.trim() }); toast("Demande prête dans la messagerie GestiOne : envoyez-la pour être recontacté."); },
  restorepin: (f) => { Promise.resolve(H.verifyOwnerPin ? H.verifyOwnerPin(f.pw.value) : false).then((ok) => { if (!ok) { audit("Restauration refusée", "code administrateur incorrect"); save(); return toast("Code administrateur incorrect.", "err"); } applyRestore(); }); },
};

/* ============================== Matériel, commandes, chantiers et ouvriers ============================== */
// Matériel : catalogue des fournitures avec leur prix d'achat.
// Commandes : achats de matériel, rattachés à un devis ou libres, envoyés au fournisseur.
// Chantiers : pour chaque devis, montant − matériel − transport − autres dépenses = reste ;
//   l'apporteur d'affaires et les ouvriers reçoivent un pourcentage de ce reste ;
//   ce qui reste ensuite est le bénéfice de l'entreprise.
const MUNITS = ["pièce", "barre", "m", "m²", "kg", "boîte", "rouleau", "litre", "paquet", "lot"];
const EXP_CATS = [["transport_mat", "Transport du matériel"], ["transport_ouv", "Transport des ouvrages"], ["main", "Main-d'œuvre extérieure"], ["autre", "Autre dépense"]];
const ORD_ST = { commande: ["Commandée", "t-warn"], livre: ["Livrée", "t-info"], paye: ["Payée", "t-good"] };
const MAT_SEED = [
  ["Profilé aluminium dormant", "Profilés", "barre"], ["Profilé aluminium ouvrant", "Profilés", "barre"], ["Profilé aluminium traverse", "Profilés", "barre"], ["Cornière aluminium", "Profilés", "barre"],
  ["Tube inox 50 mm", "Inox", "barre"], ["Tube inox 40 mm", "Inox", "barre"], ["Main courante inox", "Inox", "barre"], ["Platine de fixation inox", "Inox", "pièce"],
  ["Vitre claire 6 mm", "Vitrerie", "m²"], ["Vitre claire 8 mm", "Vitrerie", "m²"], ["Vitre fumée 6 mm", "Vitrerie", "m²"], ["Vitre feuilletée 10 mm", "Vitrerie", "m²"],
  ["Joint brosse", "Accessoires", "rouleau"], ["Joint vitrage", "Accessoires", "rouleau"], ["Roulette coulissante", "Accessoires", "pièce"], ["Poignée de fenêtre", "Accessoires", "pièce"], ["Serrure de porte", "Accessoires", "pièce"], ["Paumelle", "Accessoires", "pièce"],
  ["Vis autoforeuse", "Quincaillerie", "boîte"], ["Cheville et vis", "Quincaillerie", "boîte"], ["Rivet aluminium", "Quincaillerie", "boîte"], ["Silicone transparent", "Quincaillerie", "pièce"], ["Mousse expansive", "Quincaillerie", "pièce"],
];
const mats = () => db().materials.filter((m) => !m.deleted);
const mat = (id) => db().materials.find((m) => m.id === id);
const orders = () => db().orders.filter((o) => !o.deleted);
const workers = () => db().workers.filter((w) => !w.deleted);
const worker = (id) => db().workers.find((w) => w.id === id);
const ordTotal = (o) => (o.lines || []).reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0) + (Number(o.delivery) || 0);
const ordQty = (o) => (o.lines || []).reduce((a, l) => a + (Number(l.qty) || 0), 0);
const pct = (v) => Math.max(0, Math.min(100, Number(String(v).replace(",", ".")) || 0));
const pctTxt = (v) => String(Math.round(pct(v) * 100) / 100).replace(".", ",") + " %";
const numIn = (v) => Math.max(0, Math.round(Number(String(v == null ? "" : v).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0));
const qLabel = (q) => `${qNum(q)} · ${(q.client && q.client.name) || "Client"} · ${quoteTitle(q)}`;
const siteQuotes = () => db().quotes.filter((q) => !q.deleted && q.kind !== "total" && ACTIVE_ST.includes(q.status));
const project = (qid) => db().projects.find((p) => p.id === qid);
function projectOf(qid) { let p = project(qid); if (!p) { p = { id: qid, quoteId: qid, expenses: [], apporteur: { on: false, name: "", pct: 10 }, workers: [], createdAt: Date.now(), updatedAt: Date.now() }; db().projects.push(p); } return p; }
function siteFin(q) {
  const p = project(q.id) || { expenses: [], apporteur: { on: false }, workers: [] };
  const amount = Number(q.total) || 0;
  const ords = orders().filter((o) => o.quoteId === q.id);
  const material = ords.reduce((a, o) => a + ordTotal(o), 0);
  const exp = (c) => (p.expenses || []).filter((e) => !e.deleted && (c ? (Array.isArray(c) ? c.includes(e.cat) : e.cat === c) : true)).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const transport = exp(["transport_mat", "transport_ouv"]); const others = exp(["main", "autre"]);
  const rest = amount - material - transport - others; const base = Math.max(0, rest);
  const app = p.apporteur && p.apporteur.on ? { name: p.apporteur.name || "Apporteur d'affaires", pct: pct(p.apporteur.pct), amount: Math.round((base * pct(p.apporteur.pct)) / 100) } : null;
  const ws = (p.workers || []).map((w) => ({ ...w, name: (worker(w.workerId) || {}).name || w.name || "Ouvrier", amount: Math.round((base * pct(w.pct)) / 100) }));
  const wsum = ws.reduce((a, w) => a + w.amount, 0);
  const profit = rest - (app ? app.amount : 0) - wsum;
  return { p, amount, ords, material, transport, others, rest, base, app, ws, wsum, profit };
}
const nextOrderNum = () => { const y = new Date().getFullYear(); let max = 0; db().orders.forEach((o) => { const m = /^BC-(\d{4})-(\d+)$/.exec(o.num || ""); if (m && Number(m[1]) === y) max = Math.max(max, Number(m[2])); }); return `BC-${y}-${String(max + 1).padStart(4, "0")}`; };
const suppliers = () => { const m = new Map(); orders().forEach((o) => { const n = (o.supplier && o.supplier.name || "").trim(); if (n && !m.has(norm(n))) m.set(norm(n), { name: n, phone: o.supplier.phone || "" }); }); return [...m.values()]; };
function orderText(o) {
  const c = company(); const q = o.quoteId ? quote(o.quoteId) : null;
  const L = [`*Bon de commande ${o.num}*`, `${c.name}${c.phone ? " · " + c.phone : ""}`, `Date : ${dFR(o.at)}`, q ? `Chantier : ${quoteTitle(q)} (${(q.client && q.client.name) || ""})` : "", "", ...(o.lines || []).map((l) => `• ${l.qty} ${l.unit || ""} × ${l.name}`), "", o.notes ? `Note : ${o.notes}` : "", "Merci de confirmer la disponibilité et la date de livraison."];
  return L.filter((x, i, a) => x !== "" || (a[i - 1] && a[i - 1] !== "")).join("\n");
}
function sendOrder(o, how) {
  const txt = orderText(o);
  if (how === "copy") { try { navigator.clipboard.writeText(txt).then(() => toast("Liste copiée : collez-la dans votre message au fournisseur.")); } catch (e) { toast("Copie impossible sur cet appareil.", "err"); } return; }
  let ph = String((o.supplier && o.supplier.phone) || "").replace(/\D/g, ""); if (ph.length === 10) ph = "225" + ph;
  const url = `https://wa.me/${ph}?text=${encodeURIComponent(txt)}`;
  o.sentAt = Date.now(); o.updatedAt = Date.now(); audit("Envoi d'une commande au fournisseur", o.num, (o.supplier && o.supplier.name) || ""); save();
  try { window.open(url, "_blank"); } catch (e) { location.href = url; }
}

/* ---------- Matériel et prix ---------- */
VIEWS.materiel = () => {
  if (!can("materiel") && !can("achats")) return locked("Matériel et prix");
  const ed = can("materiel"); const all = mats(); const q = norm(UI.msq || "");
  const list = all.filter((m) => !q || norm(m.name).includes(q) || norm(m.cat).includes(q) || norm(m.ref).includes(q)).sort((a, b) => norm(a.cat || "zz").localeCompare(norm(b.cat || "zz")) || norm(a.name).localeCompare(norm(b.name)));
  const cats = [...new Set(list.map((m) => m.cat || "Sans catégorie"))];
  const priced = all.filter((m) => Number(m.price) > 0).length;
  if (UI.mEdit && ed) return `${head("Modifier les prix", "Changez les montants puis enregistrez : tous les prix sont mis à jour d'un coup. Les commandes passées gardent leurs prix.")}
    <form novalidate data-f="mprices" class="card" style="display:flex;flex-direction:column;gap:6px">${all.sort((a, b) => norm(a.cat || "zz").localeCompare(norm(b.cat || "zz")) || norm(a.name).localeCompare(norm(b.name))).map((m) => `<div class="mprow"><span class="mpn"><b>${esc(m.name)}</b><span class="small">${esc(m.cat || "Sans catégorie")} · par ${esc(m.unit || "pièce")}</span></span><input class="inp num" name="p_${m.id}" inputmode="numeric" value="${Number(m.price) || ""}" placeholder="0" aria-label="Prix de ${esc(m.name)}"></div>`).join("")}
    <div class="sticky-acts acts"><button type="button" class="btn b-sec" data-a="mpedit">Annuler</button><button class="btn b-amb">${ic("check", 16)}Enregistrer les prix</button></div></form>`;
  return `${head("Matériel et prix", `${all.length} article${all.length > 1 ? "s" : ""}${all.length ? ` · ${priced} avec un prix` : ""} · prix d'achat utilisés pour les commandes`, ed ? `${all.length ? `<button class="btn b-sec" data-a="mpedit">${ic("edit", 16)}Modifier les prix</button>` : ""}<button class="btn b-amb" data-a="sheet" data-s="material">${ic("plus", 16)}Nouveau matériel</button>` : "")}
  ${all.length ? `<div class="osearch">${ic("search", 18)}<input class="inp" data-msq value="${esc(UI.msq || "")}" placeholder="Rechercher un matériel, une catégorie, une référence" autocomplete="off" aria-label="Rechercher un matériel"></div>
  <div id="mlist">${matList(list, cats, ed)}</div>` : emptyS("Aucun matériel enregistré", "Ajoutez les fournitures que vous achetez (profilés, vitres, accessoires…) avec leur prix : elles serviront à préparer les commandes.", ed ? `<div class="acts" style="justify-content:center"><button class="btn b-amb" data-a="mseed">${ic("list", 16)}Importer une liste type</button><button class="btn b-sec" data-a="sheet" data-s="material">${ic("plus", 16)}Ajouter un matériel</button></div>` : "")}`;
};
function matList(list, cats, ed) {
  if (!list.length) return `<div class="oempty">${ic("search", 22)}<b>Aucun matériel ne correspond</b></div>`;
  return cats.map((cat) => `<div class="card mgrp"><div class="mgh"><b>${esc(cat)}</b><span class="small">${list.filter((m) => (m.cat || "Sans catégorie") === cat).length}</span></div>${list.filter((m) => (m.cat || "Sans catégorie") === cat).map((m) => `<div class="mrow2"><span class="mpn"><b>${esc(m.name)}</b><span class="small">${esc([m.ref, "par " + (m.unit || "pièce")].filter(Boolean).join(" · "))}</span></span><span class="mpp ${Number(m.price) > 0 ? "" : "none"}">${Number(m.price) > 0 ? Fk(m.price) : "Prix à saisir"}</span>${ed ? `<span class="macts"><button class="ib" data-a="sheet" data-s="material" data-id="${m.id}" aria-label="Modifier ${esc(m.name)}">${ic("edit", 16)}</button><button class="ib crit" data-a="sheet" data-s="mdel" data-id="${m.id}" aria-label="Supprimer ${esc(m.name)}">${ic("x", 16)}</button></span>` : ""}</div>`).join("")}</div>`).join("");
}

/* ---------- Nouvelle commande / modification ---------- */
function newOrder(qid) { return { id: null, quoteId: qid || null, free: false, supplier: { name: "", phone: "" }, lines: {}, extra: [], delivery: "", notes: "", status: "commande" }; }
function orderDraft() { if (!UI.ord) UI.ord = newOrder(null); return UI.ord; }
VIEWS.commande = () => {
  if (!can("achats")) return locked("Nouvelle commande");
  const o = orderDraft(); const q = o.quoteId ? quote(o.quoteId) : null; const qs = siteQuotes().slice().sort((a, b) => (b.finalAt || b.createdAt || 0) - (a.finalAt || a.createdAt || 0));
  const sel = Object.entries(o.lines).filter(([, l]) => l.qty > 0); const n = sel.length + o.extra.length;
  const tot = sel.reduce((a, [, l]) => a + l.qty * l.price, 0) + o.extra.reduce((a, l) => a + l.qty * l.price, 0) + numIn(o.delivery);
  const v = q ? (qVer(q) || q) : null;
  return `${head(o.id ? `Modifier la commande ${esc(o.num)}` : "Nouvelle commande", "Choisissez le devis concerné, puis le matériel et les quantités à acheter.", o.id ? `<button class="btn b-sec" data-a="ordcancel">Annuler</button>` : "")}
  <div class="card ostep"><div class="osh"><span class="on">1</span><b>Devis concerné</b></div>
    <div class="chips"><button class="chip ${!o.free ? "on" : ""}" data-a="ordmode" data-m="devis">Pour un devis</button><button class="chip ${o.free ? "on" : ""}" data-a="ordmode" data-m="libre">Commande libre</button></div>
    ${o.free ? `<div class="small">La commande n'est rattachée à aucun devis (stock, atelier, petit chantier…).</div>` : `<div class="field"><label for="oqs">Devis</label><select class="inp" id="oqs" data-ordq><option value="">Choisir un devis…</option>${qs.map((x) => `<option value="${x.id}" ${o.quoteId === x.id ? "selected" : ""}>${esc(qLabel(x))}</option>`).join("")}</select></div>
    ${q ? `<div class="oqcard"><div class="oqh"><b>${esc(quoteTitle(q))}</b>${stTag(q)}</div><span class="small">${esc((q.client && q.client.name) || "")}${q.chantier || (v && v.chantier) ? " · " + esc(q.chantier || v.chantier) : ""}${can("finances") ? ` · ${F(q.total)}` : ""}</span><div class="oql">${(v.lines || []).map((l) => `<span>${String(l.qty || 1).padStart(2, "0")} × ${esc(l.name)}${l.wmm != null ? ` · ${Math.round(l.wmm / 10)} × ${Math.round((l.hmm || 0) / 10)} cm` : ""}</span>`).join("")}</div></div>` : ""}`}
  </div>
  <div class="card ostep"><div class="osh"><span class="on">2</span><b>Matériel à acheter</b>${n ? `<span class="tag t-good">${n} article${n > 1 ? "s" : ""}</span>` : ""}</div>
    ${mats().length ? `<div class="osearch">${ic("search", 18)}<input class="inp" data-oq value="${esc(UI.oq || "")}" placeholder="Rechercher un matériel" autocomplete="off" aria-label="Rechercher un matériel"></div><div id="omats" class="omats">${ordMatList(o)}</div>` : `<div class="note">Aucun matériel enregistré. ${can("materiel") ? `<button class="linkb" data-a="go" data-v="materiel">Créer la liste du matériel</button>` : ""}</div>`}
    ${o.extra.map((l, i) => `<div class="ompick on"><span class="mpn"><b>${esc(l.name)}</b><span class="small">Hors liste · ${esc(l.unit)} · ${F(l.price)}</span></span><span class="small nw">${l.qty} × ${F(l.price)}</span><button class="ib crit" data-a="ordxdel" data-i="${i}" aria-label="Retirer">${ic("x", 15)}</button></div>`).join("")}
    ${UI.oxOpen ? `<form novalidate data-f="ordx" class="oxf"><div class="fgrid"><div class="field"><label for="ox1">Article hors liste *</label><input class="inp" id="ox1" name="name" autofocus placeholder="Ex. Serrure à cylindre"></div><div class="field"><label for="ox2">Quantité *</label><input class="inp num" id="ox2" name="qty" inputmode="numeric" value="1"></div><div class="field"><label for="ox3">Prix unitaire</label><input class="inp num" id="ox3" name="price" inputmode="numeric" placeholder="0"></div><div class="field"><label for="ox4">Unité</label><select class="inp" id="ox4" name="unit">${MUNITS.map((u) => `<option>${u}</option>`).join("")}</select></div></div><label class="small"><input type="checkbox" name="keep" checked> Ajouter aussi à la liste du matériel</label><div class="acts"><button type="button" class="btn b-sec" data-a="ordxopen">Annuler</button><button class="btn b-amb">${ic("plus", 16)}Ajouter</button></div></form>` : `<button class="btn b-sec" data-a="ordxopen">${ic("plus", 16)}Article hors liste</button>`}
  </div>
  <form novalidate data-f="ordsave" class="card ostep"><div class="osh"><span class="on">3</span><b>Fournisseur et livraison</b></div>
    <div class="fgrid"><div class="field"><label for="os1">Fournisseur *</label><input class="inp" id="os1" name="sname" data-ords="name" list="osupl" value="${esc(o.supplier.name)}" placeholder="Nom du fournisseur" autocomplete="off"><datalist id="osupl">${suppliers().map((s) => `<option value="${esc(s.name)}">`).join("")}</datalist></div>
    <div class="field"><label for="os2">Téléphone WhatsApp</label><input class="inp num" id="os2" name="sphone" data-ords="phone" type="tel" inputmode="numeric" value="${esc(o.supplier.phone)}" placeholder="0707070707"></div>
    <div class="field"><label for="os3">Frais de livraison</label><input class="inp num" id="os3" name="delivery" data-ords="delivery" inputmode="numeric" value="${esc(o.delivery)}" placeholder="0"></div>
    <div class="field"><label for="os4">Statut</label><select class="inp" id="os4" name="status" data-ords="status">${Object.entries(ORD_ST).map(([k, [l]]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></div></div>
    <div class="field"><label for="os5">Note pour le fournisseur</label><input class="inp" id="os5" name="notes" data-ords="notes" value="${esc(o.notes)}" placeholder="Ex. livraison sur le chantier avant jeudi"></div>
    <div class="sticky-acts"><div class="obar"><span><b id="ocount">${n} article${n > 1 ? "s" : ""}</b><span class="small" id="ototal">Total ${F(tot)}</span></span><button class="btn b-amb" ${n ? "" : "disabled"} id="osave">${ic("check", 16)}${o.id ? "Enregistrer la commande" : "Valider la commande"}</button></div></div>
  </form>`;
};
function ordMatList(o) {
  const q = norm(UI.oq || ""); const list = mats().filter((m) => !q || norm(m.name).includes(q) || norm(m.cat).includes(q) || norm(m.ref).includes(q)).sort((a, b) => ((o.lines[b.id] && o.lines[b.id].qty) ? 1 : 0) - ((o.lines[a.id] && o.lines[a.id].qty) ? 1 : 0) || norm(a.cat || "zz").localeCompare(norm(b.cat || "zz")) || norm(a.name).localeCompare(norm(b.name)));
  if (!list.length) return `<div class="oempty">${ic("search", 22)}<b>Aucun matériel ne correspond</b><span class="small">Ajoutez-le avec « Article hors liste ».</span></div>`;
  return list.map((m) => { const l = o.lines[m.id]; const qn = l ? l.qty : 0; return `<div class="ompick ${qn ? "on" : ""}" data-mid="${m.id}"><span class="mpn"><b>${esc(m.name)}</b><span class="small">${esc(m.cat || "Sans catégorie")} · ${Number(m.price) > 0 ? F(m.price) : "prix à saisir"} / ${esc(m.unit || "pièce")}</span></span><span class="ostep2"><button class="qbtn" data-a="ordq" data-id="${m.id}" data-d="-1" aria-label="Retirer une unité">−</button><input class="inp num oqty" data-oqty="${m.id}" inputmode="numeric" value="${qn || ""}" placeholder="0" aria-label="Quantité de ${esc(m.name)}"><button class="qbtn" data-a="ordq" data-id="${m.id}" data-d="1" aria-label="Ajouter une unité">+</button></span></div>`; }).join("");
}
function ordRefreshBar() {
  const o = orderDraft(); const sel = Object.values(o.lines).filter((l) => l.qty > 0); const n = sel.length + o.extra.length;
  const tot = sel.reduce((a, l) => a + l.qty * l.price, 0) + o.extra.reduce((a, l) => a + l.qty * l.price, 0) + numIn(o.delivery);
  const c = $("#ocount"); if (c) c.textContent = `${n} article${n > 1 ? "s" : ""}`; const t = $("#ototal"); if (t) t.textContent = `Total ${F(tot)}`; const b = $("#osave"); if (b) b.disabled = !n;
}
function ordSetQty(id, qty) {
  const o = orderDraft(); const m = mat(id); if (!m) return; qty = Math.max(0, Math.min(99999, Math.round(qty) || 0));
  if (qty) o.lines[id] = { qty, price: o.lines[id] ? o.lines[id].price : Number(m.price) || 0 }; else delete o.lines[id];
  const row = root.querySelector(`.ompick[data-mid="${id}"]`); if (row) { row.classList.toggle("on", !!qty); const i = row.querySelector("[data-oqty]"); if (i && document.activeElement !== i) i.value = qty || ""; }
  ordRefreshBar();
}
function editOrder(o) {
  const lines = {}; const extra = [];
  (o.lines || []).forEach((l) => { if (l.materialId && mat(l.materialId)) lines[l.materialId] = { qty: Number(l.qty) || 0, price: Number(l.price) || 0 }; else extra.push({ name: l.name, unit: l.unit || "pièce", qty: Number(l.qty) || 0, price: Number(l.price) || 0 }); });
  UI.ord = { id: o.id, num: o.num, quoteId: o.quoteId || null, free: !o.quoteId, supplier: { ...(o.supplier || { name: "", phone: "" }) }, lines, extra, delivery: o.delivery ? String(o.delivery) : "", notes: o.notes || "", status: o.status || "commande" };
  UI.oq = ""; UI.oxOpen = false; UI.sheet = null; UI.view = "commande"; window.scrollTo(0, 0); render();
}

/* ---------- Commandes et achats ---------- */
VIEWS.commandes = () => {
  if (!can("achats") && !can("chantiers")) return locked("Commandes et achats");
  const f = UI.of || "all"; const s = UI.os || "all"; const q = norm(UI.ocq || "");
  const all = orders().slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  const list = all.filter((o) => (f === "all" || (f === "devis" ? !!o.quoteId : !o.quoteId)) && (s === "all" || o.status === s) && (!q || norm(o.num).includes(q) || norm(o.supplier && o.supplier.name).includes(q) || (o.lines || []).some((l) => norm(l.name).includes(q)) || (o.quoteId && quote(o.quoteId) && norm(qLabel(quote(o.quoteId))).includes(q))));
  const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
  const month = all.filter((o) => (o.at || 0) >= m0.getTime()).reduce((a, o) => a + ordTotal(o), 0);
  const open = all.filter((o) => o.status === "commande"); const unpaid = all.filter((o) => o.status !== "paye");
  return `${head("Commandes et achats", `${all.length} commande${all.length > 1 ? "s" : ""} · achats de matériel, rattachés à un devis ou libres`, can("achats") ? `<button class="btn b-amb" data-a="ordnew">${ic("plus", 16)}Nouvelle commande</button>` : "")}
  <div class="kpis"><div class="kpi hero"><small>Achats du mois</small><b class="num">${money(month)}</b><i>${all.filter((o) => (o.at || 0) >= m0.getTime()).length} commande(s)</i></div><div class="kpi"><small>En attente de livraison</small><b class="num">${open.length}</b><i>${money(open.reduce((a, o) => a + ordTotal(o), 0))}</i></div><div class="kpi"><small>Reste à payer</small><b class="num">${money(unpaid.reduce((a, o) => a + ordTotal(o), 0))}</b><i>${unpaid.length} commande(s)</i></div></div>
  <div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="osearch">${ic("search", 18)}<input class="inp" data-ocq value="${esc(UI.ocq || "")}" placeholder="N°, fournisseur, matériel ou devis" autocomplete="off" aria-label="Rechercher une commande"></div>
    <div class="chips">${[["all", "Toutes"], ["devis", "Liées à un devis"], ["libre", "Libres"]].map(([k, l]) => `<button class="chip ${f === k ? "on" : ""}" data-a="ordflt" data-k="of" data-v="${k}">${l}</button>`).join("")}<span class="chipsep"></span>${[["all", "Tous statuts"], ...Object.entries(ORD_ST).map(([k, [l]]) => [k, l])].map(([k, l]) => `<button class="chip ${s === k ? "on" : ""}" data-a="ordflt" data-k="os" data-v="${k}">${l}</button>`).join("")}</div></div>
  <div id="olist2">${ordCards(list)}</div>`;
};
function ordCards(list) {
  if (!list.length) return emptyS("Aucune commande", orders().length ? "Aucune commande ne correspond à ces filtres." : "Les achats de matériel apparaîtront ici. Commencez par « Nouvelle commande ».");
  return `<div class="xcards ocards">${list.map((o) => { const q = o.quoteId ? quote(o.quoteId) : null; const st = ORD_ST[o.status] || ORD_ST.commande; return `<div class="vcard" data-a="sheet" data-s="order" data-id="${o.id}" role="button" tabindex="0"><div class="vc1"><b class="num">${esc(o.num)}</b><b class="num">${money(ordTotal(o))}</b></div><div class="vc2"><span>${esc((o.supplier && o.supplier.name) || "Fournisseur")} · ${dFR(o.at)} · ${ordQty(o)} pièce(s)</span><span class="tag ${st[1]}">${st[0]}</span></div><div class="vc2"><span>${q ? `${ic("doc", 13)} ${esc(qNum(q))} · ${esc((q.client && q.client.name) || "")} · ${esc(quoteTitle(q))}` : `<i>Commande libre</i>`}</span>${o.sentAt ? '<span class="tag t-mut">Envoyée</span>' : ""}</div></div>`; }).join("")}</div>`;
}

/* ---------- Chantiers et bénéfices ---------- */
VIEWS.chantiers = () => {
  if (!can("chantiers")) return locked("Chantiers et bénéfices");
  const f = UI.chf || "accepte"; const all = siteQuotes().slice().sort((a, b) => (b.finalAt || b.createdAt || 0) - (a.finalAt || a.createdAt || 0));
  const list = all.filter((q) => f === "all" || q.status === f);
  const fins = list.map((q) => [q, siteFin(q)]);
  const sum = (k) => fins.reduce((a, [, x]) => a + x[k], 0);
  return `${head("Chantiers et bénéfices", "Pour chaque devis : montant − matériel − transport − dépenses, puis l'apporteur d'affaires et les ouvriers. Ce qui reste est le bénéfice de l'entreprise.")}
  <div class="chips">${[["accepte", "Acceptés"], ["envoye", "Envoyés"], ["finalise", "Finalisés"], ["all", "Tous"]].map(([k, l]) => `<button class="chip ${f === k ? "on" : ""}" data-a="ordflt" data-k="chf" data-v="${k}">${l}</button>`).join("")}</div>
  <div class="kpis"><div class="kpi hero"><small>Bénéfice de l'entreprise</small><b class="num">${Fk(sum("profit"))}</b><i>${list.length} chantier(s) · ${f === "all" ? "tous statuts" : (STATUSES[f] || [""])[0].toLowerCase() + "s"}</i></div><div class="kpi"><small>Montant des devis</small><b class="num">${Fk(sum("amount"))}</b><i>total</i></div><div class="kpi"><small>Matériel et dépenses</small><b class="num">${Fk(sum("material") + sum("transport") + sum("others"))}</b><i>achats, transport, autres</i></div><div class="kpi"><small>Rémunérations</small><b class="num">${Fk(fins.reduce((a, [, x]) => a + (x.app ? x.app.amount : 0) + x.wsum, 0))}</b><i>apporteurs et ouvriers</i></div></div>
  ${list.length ? `<div class="xcards">${fins.map(([q, x]) => `<div class="vcard sitec" data-a="siteopen" data-id="${q.id}" role="button" tabindex="0"><div class="vc1"><b>${esc(quoteTitle(q))}</b>${stTag(q)}</div><div class="vc2"><span>${esc(qNum(q))} · ${esc((q.client && q.client.name) || "")}</span><b class="num">${F(x.amount)}</b></div>${siteBar(x)}<div class="vc2"><span>Dépenses ${F(x.material + x.transport + x.others)} · rémunérations ${F((x.app ? x.app.amount : 0) + x.wsum)}</span><b class="num ${x.profit < 0 ? "neg" : "pos"}">${F(x.profit)}</b></div></div>`).join("")}</div>` : emptyS("Aucun chantier", "Les devis finalisés, envoyés ou acceptés apparaissent ici avec leur rentabilité.")}`;
};
function siteBar(x) {
  const T = Math.max(1, x.amount); const w = (v) => Math.max(0, Math.min(100, (v / T) * 100)).toFixed(1) + "%";
  const rem = (x.app ? x.app.amount : 0) + x.wsum;
  return `<div class="sbar" role="img" aria-label="Répartition du montant"><i class="s-mat" style="width:${w(x.material)}"></i><i class="s-tr" style="width:${w(x.transport + x.others)}"></i><i class="s-rem" style="width:${w(rem)}"></i><i class="s-pro" style="width:${w(Math.max(0, x.profit))}"></i></div>`;
}
VIEWS.chantier = () => {
  if (!can("chantiers")) return locked("Chantier");
  const q = quote(UI.siteId); if (!q) { UI.view = "chantiers"; return VIEWS.chantiers(); }
  const x = siteFin(q); const ed = can("chantiers") && role() !== "comptable" && role() !== "consultation"; const p = x.p; const v = qVer(q) || q;
  const row = (l, val, cls = "", sub = "") => `<div class="wf ${cls}"><span>${l}${sub ? `<span class="small">${sub}</span>` : ""}</span><b class="num">${val}</b></div>`;
  const exps = (p.expenses || []).filter((e) => !e.deleted);
  return `${head(esc(quoteTitle(q)), `${esc(qNum(q))} · ${esc((q.client && q.client.name) || "")}${v.chantier ? " · " + esc(v.chantier) : ""}`, `<button class="btn b-sec bk" data-a="go" data-v="chantiers">${ic("chev", 16)}Chantiers</button>${can("achats") ? `<button class="btn b-amb" data-a="ordnew" data-q="${q.id}">${ic("cart", 16)}Commander le matériel</button>` : ""}`)}
  <div class="grid g2">
  <div class="card"><h2>Répartition du montant</h2>${siteBar(x)}<div class="legend"><span><i class="s-mat"></i>Matériel</span><span><i class="s-tr"></i>Transport et dépenses</span><span><i class="s-rem"></i>Rémunérations</span><span><i class="s-pro"></i>Bénéfice</span></div>
    <div class="wfall">${row("Montant du devis", F(x.amount), "wtop")}${row("− Matériel acheté", F(x.material), "minus", `${x.ords.length} commande${x.ords.length > 1 ? "s" : ""}`)}${row("− Transport", F(x.transport), "minus")}${row("− Autres dépenses", F(x.others), "minus")}${row("= Reste après dépenses", F(x.rest), "sub")}
    ${x.app ? row(`− ${esc(x.app.name)}`, F(x.app.amount), "minus", `apporteur d'affaires · ${pctTxt(x.app.pct)} du reste`) : ""}${x.ws.map((w) => row(`− ${esc(w.name)}`, F(w.amount), "minus", `ouvrier · ${pctTxt(w.pct)} du reste`)).join("")}
    ${row("Bénéfice de l'entreprise", F(x.profit), x.profit < 0 ? "res neg" : "res")}</div>
    ${x.rest < 0 ? `<div class="note crit">Les dépenses dépassent le montant du devis : aucune rémunération n'est calculée sur un reste négatif.</div>` : ""}</div>
  <div style="display:flex;flex-direction:column;gap:14px">
  <div class="card"><div class="ph2"><h2>Matériel acheté</h2><b class="num">${F(x.material)}</b></div>${x.ords.length ? x.ords.map((o) => `<button class="row" style="width:100%;text-align:left" data-a="sheet" data-s="order" data-id="${o.id}"><span><b>${esc(o.num)}</b> · ${esc((o.supplier && o.supplier.name) || "")}<br><span class="small">${dFR(o.at)} · ${ordQty(o)} pièce(s) · ${(ORD_ST[o.status] || ORD_ST.commande)[0]}</span></span><b class="num nw">${F(ordTotal(o))}</b></button>`).join("") : `<div class="small">Aucune commande rattachée à ce devis.</div>`}</div>
  <div class="card"><div class="ph2"><h2>Transport et dépenses</h2><b class="num">${F(x.transport + x.others)}</b></div>${exps.map((e) => `<div class="row"><span><b>${esc(e.label || (EXP_CATS.find((c) => c[0] === e.cat) || [])[1])}</b><br><span class="small">${esc((EXP_CATS.find((c) => c[0] === e.cat) || ["", "Autre"])[1])} · ${dFR(e.at)}</span></span><span class="acts nw"><b class="num">${F(e.amount)}</b>${ed ? `<button class="ib crit" data-a="sexpdel" data-id="${e.id}" aria-label="Supprimer la dépense">${ic("x", 15)}</button>` : ""}</span></div>`).join("") || `<div class="small">Aucune dépense saisie.</div>`}
    ${ed ? `<form novalidate data-f="sexp" class="fgrid sexpf"><div class="field"><label for="se1">Type</label><select class="inp" id="se1" name="cat">${EXP_CATS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div><div class="field"><label for="se2">Libellé</label><input class="inp" id="se2" name="label" placeholder="Ex. Camion vers le chantier"></div><div class="field"><label for="se3">Montant *</label><input class="inp num" id="se3" name="amount" inputmode="numeric" placeholder="0"></div><button class="btn b-sec" style="align-self:end">${ic("plus", 16)}Ajouter</button></form>` : ""}</div>
  </div></div>
  <div class="grid g2">
  <form novalidate data-f="sapp" class="card" style="display:flex;flex-direction:column;gap:10px"><div class="ph2"><h2>Apporteur d'affaires</h2><button type="button" class="switch ${p.apporteur && p.apporteur.on ? "on" : ""}" data-a="sapptog" role="switch" aria-checked="${!!(p.apporteur && p.apporteur.on)}" aria-label="Apporteur d'affaires" ${ed ? "" : "disabled"}></button></div>
    ${p.apporteur && p.apporteur.on ? `<div class="small">Personne qui a amené le client : son pourcentage est calculé sur le reste après dépenses.</div><div class="fgrid"><div class="field"><label for="sa1">Nom</label><input class="inp" id="sa1" name="name" value="${esc(p.apporteur.name || "")}" placeholder="Nom de l'apporteur" ${ed ? "" : "readonly"}></div><div class="field"><label for="sa2">Pourcentage</label><input class="inp num" id="sa2" name="pct" inputmode="decimal" value="${esc(String(p.apporteur.pct == null ? 10 : p.apporteur.pct))}" ${ed ? "" : "readonly"}></div></div><div class="row"><span>Montant dû</span><b class="num">${F(x.app ? x.app.amount : 0)}</b></div>${ed ? `<button class="btn b-sec">${ic("check", 16)}Enregistrer</button>` : ""}` : `<div class="small">Activez si une personne a apporté ce client (10 % par défaut).</div>`}</form>
  <div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="ph2"><h2>Rémunération des ouvriers</h2><b class="num">${F(x.wsum)}</b></div>
    ${x.ws.map((w, i) => `<form novalidate data-f="swpct" data-i="${i}" class="wrow"><span class="mark" style="width:34px;height:34px;font-size:12px">${ini(w.name)}</span><span class="mpn"><b>${esc(w.name)}</b><span class="small">${esc((worker(w.workerId) || {}).job || "Ouvrier")} · ${F(w.amount)}</span></span><input class="inp num" name="pct" inputmode="decimal" value="${esc(String(w.pct))}" aria-label="Pourcentage de ${esc(w.name)}" ${ed ? "" : "readonly"}><span class="small">%</span>${ed ? `<button class="ib" aria-label="Enregistrer">${ic("check", 15)}</button><button type="button" class="ib crit" data-a="swdel" data-i="${i}" aria-label="Retirer ${esc(w.name)}">${ic("x", 15)}</button>` : ""}</form>`).join("") || `<div class="small">Aucun ouvrier affecté à ce chantier.</div>`}
    ${ed ? (workers().filter((w) => !(p.workers || []).some((z) => z.workerId === w.id)).length ? `<div class="wadd"><select class="inp" data-swadd><option value="">Affecter un ouvrier…</option>${workers().filter((w) => !(p.workers || []).some((z) => z.workerId === w.id)).map((w) => `<option value="${w.id}">${esc(w.name)} · ${esc(w.job || "Ouvrier")} · ${pctTxt(w.pct)}</option>`).join("")}</select></div>` : `<div class="small">${workers().length ? "Tous les ouvriers sont affectés." : ""} ${can("ouvriers") ? `<button class="linkb" data-a="go" data-v="ouvriers">Gérer la liste des ouvriers</button>` : ""}</div>`) : ""}
  </div></div>`;
};

/* ---------- Ouvriers et rémunérations ---------- */
VIEWS.ouvriers = () => {
  if (!can("ouvriers") && !can("chantiers")) return locked("Ouvriers et rémunérations");
  const ed = can("ouvriers"); const list = workers().sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  const earned = (wid) => { let tot = 0, n = 0; siteQuotes().forEach((q) => { const x = siteFin(q); const w = x.ws.find((z) => z.workerId === wid); if (w) { tot += w.amount; n++; } }); return { tot, n }; };
  return `${head("Ouvriers et rémunérations", "Chaque ouvrier a un pourcentage par défaut, repris quand il est affecté à un chantier (modifiable chantier par chantier).", ed ? `<button class="btn b-amb" data-a="sheet" data-s="worker">${ic("plus", 16)}Nouvel ouvrier</button>` : "")}
  ${list.length ? `<div class="grid g3">${list.map((w) => { const e = earned(w.id); return `<div class="card wcard"><div class="wch"><span class="mark" style="width:42px;height:42px;font-size:14px">${ini(w.name)}</span><span class="mpn"><b>${esc(w.name)}</b><span class="small">${esc(w.job || "Ouvrier")}${w.phone ? " · " + esc(w.phone) : ""}</span></span><span class="tag t-info">${pctTxt(w.pct)}</span></div><div class="mini"><div><small>Chantiers</small><b>${e.n}</b></div><div><small>Rémunération</small><b>${F(e.tot)}</b></div></div>${ed ? `<div class="acts"><button class="btn b-sec" data-a="sheet" data-s="worker" data-id="${w.id}">${ic("edit", 16)}Modifier</button><button class="btn b-crit" data-a="sheet" data-s="wdel" data-id="${w.id}">Supprimer</button></div>` : ""}</div>`; }).join("")}</div>` : emptyS("Aucun ouvrier", "Ajoutez vos ouvriers (soudeur, poseur, vitrier…) avec leur pourcentage de rémunération par chantier.", ed ? `<button class="btn b-amb" data-a="sheet" data-s="worker">${ic("plus", 16)}Ajouter un ouvrier</button>` : "")}`;
};

/* ---------- Feuilles ---------- */
Object.assign(SHEETS, {
  material: (x) => { const m = x.id ? mat(x.id) : null; const cats = [...new Set(mats().map((y) => y.cat).filter(Boolean))];
    return `${sh(m ? "Modifier le matériel" : "Nouveau matériel", m ? `Prix mis à jour le ${dFR(m.updatedAt || m.createdAt)}` : "Le nom et le prix d'achat suffisent.")}
    <form novalidate data-f="material" data-id="${m ? m.id : ""}" style="display:flex;flex-direction:column;gap:12px"><div class="fgrid"><div class="field"><label for="mt1">Désignation *</label><input class="inp" id="mt1" name="name" value="${esc(m ? m.name : "")}" autofocus placeholder="Ex. Profilé aluminium dormant"></div><div class="field"><label for="mt2">Catégorie</label><input class="inp" id="mt2" name="cat" list="mtcl" value="${esc(m ? m.cat || "" : "")}" placeholder="Profilés, Vitrerie, Accessoires…"><datalist id="mtcl">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
    <div class="field"><label for="mt3">Prix d'achat *</label><input class="inp num" id="mt3" name="price" inputmode="numeric" value="${m && Number(m.price) ? Number(m.price) : ""}" placeholder="0"></div><div class="field"><label for="mt4">Unité</label><select class="inp" id="mt4" name="unit">${MUNITS.map((u) => `<option ${(m ? m.unit : "pièce") === u ? "selected" : ""}>${u}</option>`).join("")}</select></div><div class="field"><label for="mt5">Référence</label><input class="inp" id="mt5" name="ref" value="${esc(m ? m.ref || "" : "")}" placeholder="Facultatif"></div></div>
    ${m && (m.hist || []).filter((h) => Number(h.price) > 0).length ? `<div class="small">Anciens prix : ${(m.hist || []).filter((h) => Number(h.price) > 0).slice(-4).reverse().map((h) => `${F(h.price)} (${dFR(h.at)})`).join(" · ")}</div>` : ""}
    <div class="acts">${m ? `<button type="button" class="btn b-crit" data-a="sheet" data-s="mdel" data-id="${m.id}">Supprimer</button>` : ""}<button class="btn b-amb">${ic("check", 16)}${m ? "Enregistrer" : "Ajouter"}</button></div></form>`; },
  mdel: (x) => { const m = mat(x.id); return `${sh("Supprimer le matériel", "")}<div class="note crit"><b>${esc(m ? m.name : "")}</b> ne sera plus proposé dans les nouvelles commandes. Les commandes déjà passées gardent cette ligne.</div><div class="acts"><button class="btn b-sec" data-a="close">Garder</button><button class="btn b-crit" data-a="mdel" data-id="${x.id}">Supprimer</button></div>`; },
  order: (x) => { const o = db().orders.find((y) => y.id === x.id); if (!o) return sh("Commande introuvable", ""); const q = o.quoteId ? quote(o.quoteId) : null; const st = ORD_ST[o.status] || ORD_ST.commande;
    return `${sh(`Commande ${esc(o.num)}`, `${dt(o.at)} · par ${esc(o.by || "—")}${o.updatedAt && o.updatedAt - (o.at || 0) > 60000 ? " · modifiée le " + dFR(o.updatedAt) : ""}`)}
    <div class="mini"><div><small>Fournisseur</small><b>${esc((o.supplier && o.supplier.name) || "—")}</b></div><div><small>Devis</small><b>${q ? esc(qNum(q)) : "Commande libre"}</b></div></div>
    ${q ? `<div class="small">${esc((q.client && q.client.name) || "")} · ${esc(quoteTitle(q))}</div>` : ""}
    <div class="olines">${(o.lines || []).map((l) => `<div class="oline"><span class="mpn"><b>${esc(l.name)}</b><span class="small">${nb(l.qty)} ${esc(l.unit || "")} × ${F(l.price)}</span></span><b class="num nw">${F(l.qty * l.price)}</b></div>`).join("")}${Number(o.delivery) ? `<div class="oline"><span class="mpn"><b>Frais de livraison</b></span><b class="num nw">${F(o.delivery)}</b></div>` : ""}</div>
    <div class="row"><b>Total</b><b class="num">${F(ordTotal(o))}</b></div>${o.notes ? `<div class="small">Note : ${esc(o.notes)}</div>` : ""}
    <div class="chips" aria-label="Statut">${Object.entries(ORD_ST).map(([k, [l]]) => `<button class="chip ${o.status === k ? "on" : ""}" data-a="ordst" data-id="${o.id}" data-s="${k}" ${can("achats") ? "" : "disabled"}>${l}</button>`).join("")}</div>
    <div class="acts"><button class="btn b-good" data-a="ordsend" data-id="${o.id}">${ic("phone", 16)}Envoyer au fournisseur</button><button class="btn b-sec" data-a="ordcopy" data-id="${o.id}">${ic("clip", 16)}Copier la liste</button></div>
    ${can("achats") ? `<div class="acts"><button class="btn b-sec" data-a="ordedit" data-id="${o.id}">${ic("edit", 16)}Modifier</button><button class="btn b-crit" data-a="sheet" data-s="orddel" data-id="${o.id}">Supprimer</button></div>` : ""}${o.sentAt ? `<div class="small">Envoyée au fournisseur le ${dt(o.sentAt)}.</div>` : ""}`; },
  orddel: (x) => { const o = db().orders.find((y) => y.id === x.id); return `${sh("Supprimer la commande", "")}<div class="note crit">La commande <b>${esc(o ? o.num : "")}</b> (${o ? F(ordTotal(o)) : ""}) sera retirée de la liste${o && o.quoteId ? " et du calcul du chantier" : ""}.</div><div class="acts"><button class="btn b-sec" data-a="close">Garder</button><button class="btn b-crit" data-a="orddel" data-id="${x.id}">Supprimer</button></div>`; },
  worker: (x) => { const w = x.id ? worker(x.id) : null; return `${sh(w ? "Modifier l'ouvrier" : "Nouvel ouvrier", "Le pourcentage est calculé sur le reste du chantier après dépenses.")}
    <form novalidate data-f="worker" data-id="${w ? w.id : ""}" style="display:flex;flex-direction:column;gap:12px"><div class="fgrid"><div class="field"><label for="wk1">Nom *</label><input class="inp" id="wk1" name="name" value="${esc(w ? w.name : "")}" autofocus></div><div class="field"><label for="wk2">Métier</label><input class="inp" id="wk2" name="job" list="wkjl" value="${esc(w ? w.job || "" : "")}" placeholder="Soudeur, poseur, vitrier…"><datalist id="wkjl">${["Soudeur", "Poseur", "Vitrier", "Menuisier aluminium", "Aide", "Chef de chantier"].map((j) => `<option value="${j}">`).join("")}</datalist></div><div class="field"><label for="wk3">Téléphone</label><input class="inp num" id="wk3" name="phone" type="tel" inputmode="numeric" value="${esc(w ? w.phone || "" : "")}"></div><div class="field"><label for="wk4">Pourcentage par chantier *</label><input class="inp num" id="wk4" name="pct" inputmode="decimal" value="${esc(String(w ? w.pct : 5))}"></div></div>
    <div class="acts">${w ? `<button type="button" class="btn b-crit" data-a="sheet" data-s="wdel" data-id="${w.id}">Supprimer</button>` : ""}<button class="btn b-amb">${ic("check", 16)}${w ? "Enregistrer" : "Ajouter"}</button></div></form>`; },
  wdel: (x) => { const w = worker(x.id); return `${sh("Supprimer l'ouvrier", "")}<div class="note crit"><b>${esc(w ? w.name : "")}</b> sera retiré de la liste. Ses rémunérations déjà calculées sur les chantiers restent visibles.</div><div class="acts"><button class="btn b-sec" data-a="close">Garder</button><button class="btn b-crit" data-a="wdel" data-id="${x.id}">Supprimer</button></div>`; },
});

/* ---------- Actions ---------- */
const touch = (o) => { o.updatedAt = Date.now(); o.by = o.by || me().name; return o; };
Object.assign(ACT, {
  mpedit: () => { UI.mEdit = !UI.mEdit; render(); window.scrollTo(0, 0); },
  mseed: () => { if (!need("materiel", "créer la liste du matériel")) return; const at = Date.now(); MAT_SEED.forEach(([name, cat, unit], i) => { if (!mats().some((m) => norm(m.name) === norm(name))) db().materials.push({ id: uid("m") + i, name, cat, unit, price: 0, ref: "", createdAt: at, updatedAt: at, by: me().name }); }); audit("Création de la liste du matériel", MAT_SEED.length + " articles", "liste type"); save(); UI.mEdit = true; render(); toast("Liste type importée : saisissez maintenant vos prix d'achat."); },
  mdel: (x) => { if (!need("materiel", "supprimer un matériel")) return; const m = mat(x.id); if (!m) return; m.deleted = true; touch(m); audit("Suppression d'un matériel", m.name); save(); UI.sheet = null; render(); toast("Matériel supprimé."); },
  ordnew: (x) => { if (!need("achats", "passer une commande")) return; UI.ord = newOrder(x && x.q ? x.q : null); UI.oq = ""; UI.oxOpen = false; UI.view = "commande"; UI.sheet = null; window.scrollTo(0, 0); render(); },
  ordcancel: () => { UI.ord = null; UI.view = "commandes"; render(); },
  ordmode: (x) => { const o = orderDraft(); o.free = x.m === "libre"; if (o.free) o.quoteId = null; render(); },
  ordq: (x) => { const o = orderDraft(); ordSetQty(x.id, ((o.lines[x.id] && o.lines[x.id].qty) || 0) + Number(x.d)); },
  ordxopen: () => { UI.oxOpen = !UI.oxOpen; render(); },
  ordxdel: (x) => { orderDraft().extra.splice(Number(x.i), 1); render(); },
  ordflt: (x) => { UI[x.k] = x.v; render(); },
  ordst: (x) => { if (!need("achats", "modifier une commande")) return; const o = db().orders.find((y) => y.id === x.id); if (!o) return; o.status = x.s; touch(o); audit("Statut d'une commande", o.num, ORD_ST[x.s][0]); save(); drawLayer(); if (UI.view !== "commande") render(); },
  ordsend: (x) => { const o = db().orders.find((y) => y.id === x.id); if (o) sendOrder(o, "wa"); },
  ordcopy: (x) => { const o = db().orders.find((y) => y.id === x.id); if (o) sendOrder(o, "copy"); },
  ordedit: (x) => { if (!need("achats", "modifier une commande")) return; const o = db().orders.find((y) => y.id === x.id); if (o) editOrder(o); },
  orddel: (x) => { if (!need("achats", "supprimer une commande")) return; const o = db().orders.find((y) => y.id === x.id); if (!o) return; o.deleted = true; touch(o); audit("Suppression d'une commande", o.num, F(ordTotal(o))); save(); UI.sheet = null; render(); toast(`Commande ${o.num} supprimée.`); },
  siteopen: (x) => { UI.siteId = x.id; UI.view = "chantier"; window.scrollTo(0, 0); render(); },
  sapptog: () => { if (!need("chantiers", "modifier le chantier")) return; const p = projectOf(UI.siteId); p.apporteur = { ...(p.apporteur || {}), on: !(p.apporteur && p.apporteur.on), pct: p.apporteur && p.apporteur.pct != null ? p.apporteur.pct : 10 }; touch(p); save(); render(); },
  sexpdel: (x) => { if (!need("chantiers", "modifier le chantier")) return; const p = projectOf(UI.siteId); const e = (p.expenses || []).find((y) => y.id === x.id); if (e) { e.deleted = true; touch(p); audit("Suppression d'une dépense de chantier", qNum(quote(UI.siteId) || {}), F(e.amount)); save(); render(); } },
  swdel: (x) => { if (!need("chantiers", "modifier le chantier")) return; const p = projectOf(UI.siteId); p.workers.splice(Number(x.i), 1); touch(p); save(); render(); },
  wdel: (x) => { if (!need("ouvriers", "supprimer un ouvrier")) return; const w = worker(x.id); if (!w) return; w.deleted = true; touch(w); audit("Suppression d'un ouvrier", w.name); save(); UI.sheet = null; render(); toast("Ouvrier supprimé."); },
});
Object.assign(FORMS, {
  material: (f) => { if (!need("materiel", "modifier le matériel")) return; const name = f.name.value.trim(); if (!name) return fieldErr("#mt1", "La désignation est obligatoire."); const price = numIn(f.price.value); if (!(price > 0)) return fieldErr("#mt3", "Indiquez le prix d'achat.");
    const id = f.dataset.id; const dup = mats().find((m) => m.id !== id && norm(m.name) === norm(name)); if (dup) return fieldErr("#mt1", "Ce matériel existe déjà dans la liste.");
    const at = Date.now(); let m = id ? mat(id) : null;
    if (m) { if (Number(m.price) !== price) m.hist = [...(m.hist || []), { price: Number(m.price) || 0, at: m.updatedAt || m.createdAt }].slice(-10); Object.assign(m, { name, cat: f.cat.value.trim(), unit: f.unit.value, price, ref: f.ref.value.trim(), updatedAt: at }); audit("Modification d'un matériel", name, F(price)); }
    else { m = { id: uid("m"), name, cat: f.cat.value.trim(), unit: f.unit.value, price, ref: f.ref.value.trim(), createdAt: at, updatedAt: at, by: me().name }; db().materials.push(m); audit("Ajout d'un matériel", name, F(price)); }
    save(); UI.sheet = null; render(); toast(id ? "Matériel mis à jour." : "Matériel ajouté."); },
  mprices: (f) => { if (!need("materiel", "modifier les prix")) return; let n = 0; const at = Date.now(); mats().forEach((m) => { const el = f.elements["p_" + m.id]; if (!el) return; const v = numIn(el.value); if (v !== (Number(m.price) || 0)) { m.hist = [...(m.hist || []), { price: Number(m.price) || 0, at: m.updatedAt || m.createdAt }].slice(-10); m.price = v; m.updatedAt = at; n++; } }); if (n) { audit("Mise à jour des prix du matériel", `${n} prix`); save(); } UI.mEdit = false; render(); toast(n ? `${n} prix mis à jour.` : "Aucun prix modifié."); },
  ordx: (f) => { const name = f.name.value.trim(); if (!name) return fieldErr("#ox1", "Indiquez l'article."); const qty = numIn(f.qty.value); if (!(qty > 0)) return fieldErr("#ox2", "Indiquez la quantité."); const price = numIn(f.price.value); const unit = f.unit.value;
    if (f.keep.checked && can("materiel") && !mats().some((m) => norm(m.name) === norm(name))) { const at = Date.now(); const m = { id: uid("m"), name, cat: "", unit, price, ref: "", createdAt: at, updatedAt: at, by: me().name }; db().materials.push(m); save(); orderDraft().lines[m.id] = { qty, price }; }
    else orderDraft().extra.push({ name, unit, qty, price });
    UI.oxOpen = false; render(); },
  ordsave: (f) => { if (!need("achats", "passer une commande")) return; const o = orderDraft();
    if (!o.free && !o.quoteId) { toast("Choisissez le devis concerné, ou « Commande libre ».", "err"); const s = $("#oqs"); if (s) s.focus(); return; }
    const sname = f.sname.value.trim(); if (!sname) return fieldErr("#os1", "Indiquez le fournisseur.");
    const sphone = f.sphone.value.replace(/\D/g, ""); if (sphone && sphone.length < 10) return fieldErr("#os2", "10 chiffres minimum.");
    const lines = Object.entries(o.lines).filter(([, l]) => l.qty > 0).map(([id, l]) => { const m = mat(id) || {}; return { id: uid("ol"), materialId: id, name: m.name || "Matériel", unit: m.unit || "pièce", qty: l.qty, price: l.price }; }).concat(o.extra.map((l) => ({ id: uid("ol"), materialId: null, ...l })));
    if (!lines.length) return toast("Ajoutez au moins un matériel à la commande.", "err");
    const at = Date.now(); const rec = { quoteId: o.free ? null : o.quoteId, supplier: { name: sname, phone: sphone }, lines, delivery: numIn(f.delivery.value), notes: f.notes.value.trim(), status: f.status.value, updatedAt: at };
    let saved;
    if (o.id) { saved = db().orders.find((y) => y.id === o.id); Object.assign(saved, rec); audit("Modification d'une commande", saved.num, F(ordTotal(saved))); }
    else { saved = { id: uid("o"), num: nextOrderNum(), at, by: me().name, ...rec }; db().orders.push(saved); audit("Nouvelle commande", saved.num, F(ordTotal(saved))); }
    save(); UI.ord = null; UI.view = saved.quoteId && can("chantiers") ? "chantier" : "commandes"; if (saved.quoteId) UI.siteId = saved.quoteId; render(); window.scrollTo(0, 0);
    UI.sheet = { type: "order", id: saved.id }; drawLayer(); toast(o.id ? `Commande ${saved.num} modifiée.` : `Commande ${saved.num} enregistrée : vous pouvez l'envoyer au fournisseur.`); },
  sexp: (f) => { if (!need("chantiers", "modifier le chantier")) return; const amount = numIn(f.amount.value); if (!(amount > 0)) return fieldErr("#se3", "Indiquez le montant."); const p = projectOf(UI.siteId); const cat = f.cat.value; p.expenses = [...(p.expenses || []), { id: uid("e"), cat, label: f.label.value.trim() || (EXP_CATS.find((c) => c[0] === cat) || [])[1], amount, at: Date.now(), by: me().name }]; touch(p); audit("Dépense de chantier", qNum(quote(UI.siteId) || {}), F(amount)); save(); render(); },
  sapp: (f) => { if (!need("chantiers", "modifier le chantier")) return; const p = projectOf(UI.siteId); p.apporteur = { on: true, name: f.name.value.trim(), pct: pct(f.pct.value) }; touch(p); audit("Apporteur d'affaires", qNum(quote(UI.siteId) || {}), `${p.apporteur.name} · ${pctTxt(p.apporteur.pct)}`); save(); render(); toast("Apporteur d'affaires enregistré."); },
  swpct: (f) => { if (!need("chantiers", "modifier le chantier")) return; const p = projectOf(UI.siteId); const w = p.workers[Number(f.dataset.i)]; if (!w) return; w.pct = pct(f.pct.value); touch(p); save(); render(); toast("Pourcentage enregistré."); },
  worker: (f) => { if (!need("ouvriers", "gérer les ouvriers")) return; const name = f.name.value.trim(); if (!name) return fieldErr("#wk1", "Le nom est obligatoire."); const phone = f.phone.value.replace(/\D/g, ""); if (phone && phone.length < 10) return fieldErr("#wk3", "10 chiffres minimum."); const pv = pct(f.pct.value);
    const id = f.dataset.id; const at = Date.now(); let w = id ? worker(id) : null;
    if (w) Object.assign(w, { name, job: f.job.value.trim(), phone, pct: pv, updatedAt: at }); else { w = { id: uid("w"), name, job: f.job.value.trim(), phone, pct: pv, createdAt: at, updatedAt: at, by: me().name }; db().workers.push(w); }
    audit(id ? "Modification d'un ouvrier" : "Ajout d'un ouvrier", name, pctTxt(pv)); save(); UI.sheet = null; render(); toast(id ? "Ouvrier mis à jour." : "Ouvrier ajouté."); },
});
// Saisie en direct (recherche, quantités, fournisseur, devis)
function achatsInput(t) {
  if (t.hasAttribute("data-msq")) { UI.msq = t.value; const all = mats(); const q = norm(t.value); const list = all.filter((m) => !q || norm(m.name).includes(q) || norm(m.cat).includes(q) || norm(m.ref).includes(q)).sort((a, b) => norm(a.cat || "zz").localeCompare(norm(b.cat || "zz")) || norm(a.name).localeCompare(norm(b.name))); const l = $("#mlist"); if (l) l.innerHTML = matList(list, [...new Set(list.map((m) => m.cat || "Sans catégorie"))], can("materiel")); return true; }
  if (t.hasAttribute("data-oq")) { UI.oq = t.value; const l = $("#omats"); if (l) l.innerHTML = ordMatList(orderDraft()); return true; }
  if (t.hasAttribute("data-oqty")) { const v = t.value.replace(/\D/g, "").slice(0, 5); if (v !== t.value) t.value = v; ordSetQty(t.dataset.oqty, Number(v) || 0); return true; }
  if (t.hasAttribute("data-ords")) { const o = orderDraft(); const k = t.dataset.ords; if (k === "name") { o.supplier.name = t.value; const s = suppliers().find((x) => norm(x.name) === norm(t.value)); const ph = $("#os2"); if (s && ph && !ph.value) { ph.value = s.phone; o.supplier.phone = s.phone; } } else if (k === "phone") { const v = t.value.replace(/\D/g, "").slice(0, 15); if (v !== t.value) t.value = v; o.supplier.phone = v; } else if (k === "delivery") { o.delivery = t.value.replace(/\D/g, "").slice(0, 9); if (o.delivery !== t.value) t.value = o.delivery; ordRefreshBar(); } else o[k] = t.value; return true; }
  if (t.hasAttribute("data-ocq")) { UI.ocq = t.value; const pos = t.selectionStart; render(); const i = root.querySelector("[data-ocq]"); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } return true; }
  return false;
}
function achatsChange(t) {
  if (t.hasAttribute("data-ordq")) { const o = orderDraft(); o.quoteId = t.value || null; render(); return true; }
  if (t.hasAttribute("data-swadd") && t.value) { if (!need("chantiers", "modifier le chantier")) return true; const w = worker(t.value); const p = projectOf(UI.siteId); if (w && !p.workers.some((z) => z.workerId === w.id)) { p.workers.push({ workerId: w.id, name: w.name, pct: pct(w.pct) }); touch(p); audit("Affectation d'un ouvrier", qNum(quote(UI.siteId) || {}), `${w.name} · ${pctTxt(w.pct)}`); save(); } render(); return true; }
  return false;
}

/* ============================== Catalogue type des prestations ============================== */
// Proposé à chaque nouvelle entreprise : 25 catégories illustrées et leurs prestations.
// Identifiants fixes (kt01, st0101, pt0101…) : deux téléphones qui l'installent en même
// temps ne créent pas de doublons. Les images sont livrées avec l'application.
const CAT_TPL = [["Fenêtres en aluminium", "piece", ["Fenêtres coulissantes", "Fenêtres à battants", "Fenêtres oscillo-battantes", "Fenêtres à soufflet", "Fenêtres fixes", "Fenêtres à ouverture française", "Fenêtres à plusieurs vantaux", "Fenêtres avec moustiquaire intégrée", "Fenêtres à double vitrage", "Fenêtres acoustiques et thermiques", "Fenêtres sur mesure"]], ["Portes en aluminium", "piece", ["Portes d'entrée", "Portes intérieures", "Portes coulissantes", "Portes battantes", "Portes vitrées", "Portes de bureaux", "Portes de magasins", "Portes à double vantail", "Portes avec serrure de sécurité", "Portes avec panneaux décoratifs", "Portes sur mesure"]], ["Baies vitrées en aluminium", "piece", ["Baies vitrées coulissantes", "Baies vitrées à galandage", "Baies vitrées à plusieurs rails", "Baies vitrées à deux vantaux", "Baies vitrées à quatre vantaux", "Baies vitrées pliantes", "Baies vitrées panoramiques", "Baies vitrées toute hauteur", "Baies vitrées avec double vitrage", "Baies vitrées sur mesure"]], ["Façades vitrées et murs-rideaux", "m2", ["Façades vitrées", "Murs-rideaux en aluminium", "Façades à montants et traverses", "Façades en vitrage structurel", "Façades semi-structurelles", "Façades en panneaux composites", "Habillage de façades", "Façades de bâtiments commerciaux", "Façades de bureaux", "Rénovation de façades"]], ["Vitrines et devantures commerciales", "m2", ["Vitrines de magasins", "Devantures commerciales", "Façades de boutiques", "Vitrines d'exposition", "Vitrines de pharmacies", "Vitrines de restaurants", "Vitrines de salons de coiffure", "Vitrines de bureaux", "Entrées vitrées commerciales", "Agencements de vitrines sur mesure"]], ["Cloisons en aluminium et verre", "m2", ["Cloisons vitrées", "Cloisons semi-vitrées", "Cloisons pleines", "Cloisons de bureaux", "Cloisons de salles de réunion", "Cloisons amovibles", "Cloisons coulissantes", "Cloisons acoustiques", "Cloisons de séparation intérieure", "Cloisons sur mesure"]], ["Garde-corps, rampes et balustrades", "ml", ["Garde-corps de balcons", "Garde-corps de terrasses", "Garde-corps d'escaliers", "Garde-corps de mezzanines", "Garde-corps vitrés", "Garde-corps à barreaux aluminium", "Rampes d'escaliers", "Mains courantes", "Balustrades en aluminium", "Protections de coursives"]], ["Vérandas, pergolas et extensions", "m2", ["Vérandas vitrées", "Vérandas à toiture isolée", "Pergolas en aluminium", "Pergolas bioclimatiques", "Pergolas à lames orientables", "Extensions vitrées", "Jardins d'hiver", "Fermetures de terrasses", "Abris de patio", "Structures extérieures sur mesure"]], ["Volets, stores et protections solaires", "piece", ["Volets roulants en aluminium", "Volets battants en aluminium", "Stores extérieurs", "Brise-soleil orientables", "Brise-soleil fixes", "Persiennes en aluminium", "Protections solaires de fenêtres", "Stores pour vérandas", "Panneaux d'occultation", "Habillages de fenêtres"]], ["Moustiquaires et systèmes anti-insectes", "piece", ["Moustiquaires fixes", "Moustiquaires coulissantes", "Moustiquaires enroulables", "Moustiquaires plissées", "Moustiquaires pour portes", "Moustiquaires pour fenêtres", "Moustiquaires sur mesure", "Remplacement de toile"]], ["Portails, portillons et clôtures", "piece", ["Portails coulissants", "Portails battants", "Portails motorisés", "Portillons piétons", "Clôtures en aluminium|ml", "Claustras aluminium|m2", "Panneaux de séparation extérieure|m2", "Portails ajourés", "Portails pleins", "Portails personnalisés"]], ["Portes de garage et fermetures industrielles", "piece", ["Portes de garage sectionnelles", "Portes de garage coulissantes", "Portes de garage battantes", "Portes de garage motorisées", "Rideaux métalliques", "Rideaux de fermeture de magasins", "Fermetures de locaux professionnels", "Portes industrielles adaptées"]], ["Escaliers et ouvrages décoratifs", "piece", ["Rampes décoratives|ml", "Mains courantes décoratives|ml", "Habillages d'escaliers", "Structures décoratives", "Séparateurs de pièces|m2", "Claustras intérieurs|m2", "Panneaux décoratifs|m2", "Encadrements et finitions"]], ["Mobilier et aménagements", "piece", ["Étagères sur mesure", "Meubles vitrines d'exposition", "Présentoirs commerciaux", "Comptoirs avec ossature aluminium", "Meubles à structure aluminium", "Placards avec portes aluminium", "Dressings aluminium et verre", "Rangements professionnels", "Structures de mobilier sur mesure"]], ["Fabrication et transformation", "forfait", ["Découpe de profilés aluminium", "Usinage de profilés", "Assemblage de cadres", "Fabrication de châssis|piece", "Fabrication de fenêtres|piece", "Fabrication de portes|piece", "Fabrication de structures sur mesure", "Perçage et fraisage", "Sertissage et assemblage", "Finitions et ajustements"]], ["Vitrage et travaux sur verre", "m2", ["Fourniture de vitrage", "Pose de vitrage simple", "Pose de double vitrage", "Verre trempé", "Verre feuilleté", "Verre dépoli", "Verre teinté", "Vitrage décoratif", "Remplacement de vitre cassée|piece", "Découpe de verre sur mesure|piece"]], ["Toitures et couvertures légères", "m2", ["Marquises en aluminium|piece", "Auvents|piece", "Toitures vitrées", "Toitures en polycarbonate", "Couvertures de terrasses", "Abris d'entrée|piece", "Structures de toiture légère", "Couvertures de passages", "Panneaux de couverture"]], ["Aménagements de bâtiments professionnels", "forfait", ["Aménagement de bureaux", "Aménagement de commerces", "Aménagement de restaurants", "Aménagement d'hôtels", "Aménagement de résidences", "Séparations de locaux|m2", "Entrées vitrées d'immeubles|piece", "Équipements commerciaux", "Projets immobiliers"]], ["Réparation, rénovation et maintenance", "forfait", ["Réparation de fenêtres", "Réparation de portes", "Remplacement de roulettes", "Réglage de vantaux", "Remplacement de poignées", "Remplacement de serrures", "Réparation de systèmes coulissants", "Remplacement de joints", "Rénovation de menuiseries"]], ["Accessoires et quincaillerie", "piece", ["Poignées", "Serrures", "Cylindres et barillets", "Charnières et paumelles", "Roulettes de coulissement", "Rails et guides|ml", "Joints d'étanchéité|ml", "Équerres d'assemblage", "Ferme-portes", "Accessoires de moustiquaires"]], ["Études, conception et services techniques", "forfait", ["Visite technique", "Prise de mesures sur site", "Étude de faisabilité", "Conseil sur les profilés", "Choix des vitrages", "Conception de plans", "Dessins techniques", "Modélisation et visualisation", "Devis détaillé", "Assistance technique"]], ["Installation, pose et finitions", "piece", ["Pose de fenêtres", "Pose de portes", "Pose de baies vitrées", "Pose de façades vitrées|m2", "Pose de cloisons|m2", "Pose de garde-corps|ml", "Pose de portails", "Calfeutrement|ml", "Étanchéité périphérique|ml", "Contrôle de fonctionnement|forfait"]], ["Fourniture et vente de matériaux", "piece", ["Vente de profilés aluminium", "Vente de châssis fabriqués", "Vente de vitrages|m2", "Vente de quincaillerie", "Vente d'accessoires de pose", "Vente de joints et consommables", "Fourniture de panneaux composites|m2", "Fourniture sur commande|forfait", "Approvisionnement de chantiers|forfait"]], ["Traitements, finitions et personnalisation", "forfait", ["Thermolaquage", "Anodisation", "Finition aluminium naturel", "Finition mate ou brillante", "Finition imitation bois", "Choix de couleurs RAL", "Habillage décoratif", "Personnalisation des dimensions", "Personnalisation des formes", "Finitions spécifiques"]], ["Automatisation et contrôle d'accès", "forfait", ["Motorisation de portails", "Motorisation de volets roulants", "Motorisation de portes de garage", "Portes automatiques coulissantes|piece", "Commandes à distance|piece", "Claviers à code|piece", "Contrôle d'accès", "Interphones et visiophones|piece", "Maintenance des automatismes"]]];
const catImg = (i) => "/alu-catalogue/" + String(i + 1).padStart(2, "0") + ".jpg";
const tplCount = () => CAT_TPL.reduce((a, c) => a + c[2].length, 0);
const tplMissing = () => { const d = db(); const ids = new Set(d.services.map((s) => s.id)); const names = new Set(d.services.filter((s) => !s.deleted).map((s) => norm(s.name))); let n = 0; CAT_TPL.forEach((c, i) => c[2].forEach((it, j) => { const id = "st" + String(i + 1).padStart(2, "0") + String(j + 1).padStart(2, "0"); if (!ids.has(id) && !names.has(norm(it.split("|")[0]))) n++; })); return n; };
function seedCatalog(by) {
  const d = db(); if (!d) return 0; const at = Date.now(); let n = 0;
  const ids = new Set(d.services.map((s) => s.id)); const names = new Set(d.services.filter((s) => !s.deleted).map((s) => norm(s.name)));
  CAT_TPL.forEach(([cat, mode, items], i) => {
    const k = String(i + 1).padStart(2, "0"); const img = catImg(i);
    let c = d.categories.find((x) => x.id === "kt" + k) || d.categories.find((x) => !x.deleted && norm(x.name) === norm(cat));
    if (!c) { c = { id: "kt" + k, name: cat, at, img, tpl: true }; d.categories.push(c); } else if (!c.img) c.img = img;
    items.forEach((it, j) => {
      const [name, m] = it.split("|"); const id = "st" + k + String(j + 1).padStart(2, "0"); const md = m || mode;
      if (ids.has(id) || names.has(norm(name))) return;
      d.services.push({ id, name, cat, desc: "", tech: [], mode: md, unit: modeOf(md)[2], createdAt: at, createdBy: by, updatedAt: at, tpl: true });
      d.photos.push({ id: "pt" + k + String(j + 1).padStart(2, "0"), serviceId: id, main: true, at, by: "", src: img, w: 480, h: 640, uploaded: true, tpl: true });
      n++;
    });
  });
  return n;
}
// Première ouverture d'une entreprise : catalogue vide (jamais rien créé) après une
// première synchronisation réussie, pour ne rien ajouter à une entreprise existante.
let seedTried = false;
function autoSeed() {
  if (seedTried) return false; const d = db();
  if (!d || !me() || !H.sync || !H.sync.lastAt || H.sync.busy || H.sync.online === false) return false;
  seedTried = true;
  if (d.services.length || d.categories.length || d.photos.length || !can("catalogue")) return false;
  const n = seedCatalog("Catalogue GestiOne"); if (!n) return false;
  audit("Catalogue type installé", n + " prestations", "25 catégories"); save(); return true;
}
ACT.catseed = () => { if (!need("catalogue", "importer le catalogue type")) return; const n = seedCatalog(me().name); if (!n) { toast("Le catalogue type est déjà complet."); return; } audit("Catalogue type importé", n + " prestations"); save(); render(); toast(`${n} prestations ajoutées avec leurs images · ${localOnlyMsg()}`); };
ACT.catflt = (x) => { UI.flt.sc = x.v || ""; render(); };

/* ============================== Événements (limités à la racine du module) ============================== */
function afterRender() { photoFill(); const sr = $("#stampres"); if (sr) stampSrc(company()).then((src) => { if (src && sr.isConnected) sr.src = src; }); if (UI.view === "modele") afterModele(); if (focusWanted) focusSel(focusWanted); }
const setPath = (o, path, v) => { const ks = path.split("."); let t = o; ks.slice(0, -1).forEach((k) => (t = t[k])); t[ks[ks.length - 1]] = v; };
const onClick = (e) => { const el = e.target.closest("[data-a]"); if (!el || !root.contains(el)) return; const a = el.dataset.a; if (a === "ovclose" && e.target !== el) return; if (ACT[a]) { e.preventDefault(); ACT[a](el.dataset, e); if (pendingRender && !UI.sheet) safeRender(); } };
const onSubmit = (e) => {
  const f = e.target.closest("form[data-f]"); if (!f) return; e.preventDefault();
  f.querySelectorAll(".ferr.auto").forEach((x) => x.remove()); f.querySelectorAll(".inp.err").forEach((x) => x.classList.remove("err"));
  const bad = [...f.querySelectorAll("input[required], select[required], textarea[required], input[type=number]")].find((el) => { if (el.disabled || el.readOnly) return false; const v = el.value.trim(); if (el.required && !v) return (el.dataset.msg = "Ce champ est obligatoire.", true); if (el.type === "number" && v !== "") { const n = Number(v); if (el.min !== "" && n < Number(el.min)) return (el.dataset.msg = "La valeur minimale est " + nb(Number(el.min)) + ".", true); if (el.max !== "" && n > Number(el.max)) return (el.dataset.msg = "La valeur maximale est " + nb(Number(el.max)) + ".", true); } return false; });
  if (bad) { bad.classList.add("err"); const m = document.createElement("div"); m.className = "ferr auto"; m.textContent = bad.dataset.msg; (bad.closest(".field") || bad.parentNode).appendChild(m); bad.focus(); return; }
  if (FORMS[f.dataset.f]) FORMS[f.dataset.f](f);
};
const onInput = (e) => {
  const t = e.target; const w = UI.wiz;
  if (t.dataset.ch === "codefmt") { t.value = fmtCode(t.value); return; }
  if (achatsInput(t)) return;
  if (t.hasAttribute("data-digits") && !t.dataset.w) { const clean = t.value.replace(/\D/g, "").slice(0, 15); if (clean !== t.value) t.value = clean; }
  if (t.hasAttribute("data-osq")) { UI.osq = t.value; const l = $("#olist"); if (l) { l.innerHTML = objRows(); photoFill(); } return; }
  if (t.hasAttribute("data-csq")) { UI.csq = t.value; const pos = t.selectionStart; drawLayer(); const i = $("#csq"); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } } return; }
  if (t.dataset.w && w) {
    const k = t.dataset.w; const val = t.type === "checkbox" ? t.checked : t.value;
    if (k === "csearch") { w.csearch = val; const q = norm(val); const list = db().clients.filter((c) => !c.deleted && (!q || norm(c.name).includes(q) || norm(c.phone).includes(q))).slice(0, 8); const cl = $("#clist"); if (cl) cl.innerHTML = clientList(list, w); return; }
    if (t.hasAttribute("data-digits")) { const pos = t.selectionStart; const clean = t.value.replace(/\D/g, "").slice(0, 15); if (clean !== t.value) { t.value = clean; try { t.setSelectionRange(Math.min(pos, clean.length), Math.min(pos, clean.length)); } catch (x) { /* ignore */ } } }
    if (t.classList.contains("err")) { t.classList.remove("err"); const b2 = t.closest(".field"); if (b2) b2.querySelectorAll(".ferr").forEach((x) => x.remove()); }
    setPath(w, k, t.type === "checkbox" ? t.checked : t.value); keepDraft();
    if (["discount", "taxOn"].includes(k)) { const b = $("#wtot"); if (b) b.innerHTML = totalsRows(totalsOf(w)); }
    return;
  }
  if (t.dataset.ns && w) { if (t.dataset.ns === "mode") w.ed.mode = t.value; else w.ed.ns[t.dataset.ns] = t.value; keepDraft(); return; }
  if (t.dataset.e && w) {
    const k = t.dataset.e; const ed = w.ed; ed[k] = t.value; keepDraft();
    if (k === "sq") { ed.creating = false; const l = $("#svcl"); if (l) { l.innerHTML = svcList(ed); photoFill(); } return; }
    if (k === "mode") { ed.custom = false; render(); focusSel(needsW(ed.mode) ? "#ed-w" : "#ed-q"); return; }
    if (k === "price") { updateAmount(); return; }
    if (k === "w" || k === "h") { ed.custom = ed.idx != null ? ed.custom : false; relookup(); return; }
    if (k === "qty") { relookup(true); return; }
  }
  if (t.dataset.t) {
    const arr = t.dataset.t === "e" ? (w && w.ed.tech) : UI.sform && UI.sform.tech; if (!arr) return; const i = Number(t.dataset.i);
    while (arr.length <= i) arr.push({ k: "", v: "" }); arr[i][t.dataset.f2] = t.value;
    if (t.dataset.t === "e") { keepDraft(); if (!w.ed.creating) relookup(); }
  }
};
const onChange = (e) => {
  const t = e.target;
  if (achatsChange(t)) return;
  if (t.dataset.photoFor && t.files && t.files[0]) { addPhoto(t.dataset.photoFor, t.files[0], t.dataset.replace || null); t.value = ""; return; }
  if (t.hasAttribute("data-stamp") && t.files && t.files[0]) { if (!need("parametres", "modifier le cachet")) return; const k = ["stamp", "stampOnly", "sign"].includes(t.dataset.stamp) ? t.dataset.stamp : "stamp"; const l = (STAMP_SLOTS.find((s2) => s2[0] === k) || [])[1]; toastStatus("Préparation de l'image…"); processStamp(t.files[0], k).then((src) => { const st = db().settings; st.identity = { ...st.identity, [k]: src }; if (st.stampOn == null) st.stampOn = true; audit("Modification des paramètres", l); save(); render(); toast(STAMP_MSG[k][0]); }).catch((x) => toast(x.message, "err")); t.value = ""; return; }
  if (t.hasAttribute("data-logo") && t.files && t.files[0]) { compressImage(t.files[0], 420).then((img) => { const st = db().settings; st.identity = { ...st.identity, logo: img.data }; audit("Modification des paramètres", "Logo de l'entreprise"); save(); render(); toast("Logo enregistré."); }).catch((x) => toast(x.message, "err")); t.value = ""; return; }
  if (t.hasAttribute("data-restore") && t.files && t.files[0]) {
    const rd = new FileReader(); rd.onload = () => { try { const j = JSON.parse(rd.result); if (j.app !== "GestiOne Aluminium" || !j.data) throw new Error("x"); UI.restoreData = { kind: "file", label: `Fichier du ${dFR(j.at)} · ${j.shop || ""}`, data: j.data, photosData: j.photosData || {}, counts: countsOf(j.data) }; UI.sheet = { type: "restorepin" }; drawLayer(); } catch (x) { toast("Ce fichier n'est pas une sauvegarde Gestion Aluminium valide.", "err"); } };
    rd.readAsText(t.files[0]); t.value = ""; return;
  }
  if (t.dataset.w === "taxOn" && UI.wiz) { UI.wiz.taxOn = t.checked; keepDraft(); const b = $("#wtot"); if (b) b.innerHTML = totalsRows(totalsOf(UI.wiz)); }
  if (t.id === "em4") { const d2 = $("#roledesc"); if (d2) d2.textContent = ROLE_DESC[t.value] || ""; }
};
// Touche Entrée : passe au champ suivant, puis valide la ligne. Elle ne termine jamais le devis.
const onKey = (e) => {
  if (e.key === "Escape" && UI.sheet && !UI.busy) { UI.sheet = null; UI.sform = null; render(); return; }
  if (e.key !== "Enter" || e.shiftKey || !root.contains(e.target)) return;
  const t = e.target; const en = t.dataset && t.dataset.enter; const w = UI.wiz;
  if (t.classList && t.classList.contains("vcard")) { t.click(); return; }
  if (!en || !w) return;
  e.preventDefault(); const ed = w.ed;
  if (en === "svc") { const q = norm(ed.sq); if (!q) return; const all = db().services.filter((s) => !s.deleted); const exact = all.find((s) => norm(s.name) === q); const list = all.filter((s) => norm(s.name).includes(q)); if (exact || list.length === 1) return ACT.wpicksvc({ id: (exact || list[0]).id }); return ACT.wcreate(); }
  if (en === "w") return focusSel(needsH(ed.mode) ? "#ed-h" : "#ed-q");
  if (en === "h") return focusSel("#ed-q");
  if (en === "qty") { if (UI.searching) relookup(true); const L = lookup(ed); if (!ed.serviceId) return focusSel("#ed-p"); if (!L.ready) return focusSel(needsW(ed.mode) && !L.wmm ? "#ed-w" : "#ed-h"); if (L.ref && L.ref.price != null && !ed.custom) return commitLine(true); return focusSel("#ed-p"); }
  if (en === "price") return commitLine(false);
};
const tip = () => $("#al-tip");
const onOver = (e) => { const t = e.target.closest("[data-tip]"); const tp = tip(); if (!tp) return; if (!t) { tp.hidden = true; return; } tp.textContent = t.dataset.tip; tp.hidden = false; };
const onMove = (e) => { const tp = tip(); if (!tp || tp.hidden) return; const w = tp.offsetWidth; tp.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX + 12)) + "px"; tp.style.top = e.clientY - 38 + "px"; };
root.addEventListener("click", onClick); root.addEventListener("submit", onSubmit); root.addEventListener("input", onInput); root.addEventListener("change", onChange); root.addEventListener("pointerover", onOver); root.addEventListener("pointermove", onMove); document.addEventListener("keydown", onKey);

/* ============================== Démarrage ============================== */
let destroyed = false; let booted = false;
root.classList.add("al-root"); applyMode(MODE);
root.innerHTML = `<div id="al-app"></div><div id="al-layer"></div><div id="al-tip" class="al-tip" hidden></div>`;
function boot() { booted = true; syncFromHost(true); UI.user = userOf(); UI.view = "dashboard"; autoSeed(); render(); uploadPending(); }
if (H.ready === false) $("#al-app").innerHTML = `<div style="padding:60px;text-align:center"><span class="load"></span></div>`; else boot();
let lastSig = "";
return {
  update(next) {
    H = next; if (!booted) { if (H.ready !== false) boot(); return; }
    const changed = syncFromHost(false) | autoSeed();
    const sig = JSON.stringify([H.license, (H.vendors || []).map((v) => [v.id, v.name, v.aluRole, v.blocked]), H.sync && [H.sync.online, H.sync.pending, H.sync.busy], H.shop.name]);
    if (S.online) uploadPending();
    if (sig !== lastSig || changed) { lastSig = sig; safeRender(); }
  },
  destroy() { destroyed = true; save(); root.removeEventListener("click", onClick); root.removeEventListener("submit", onSubmit); root.removeEventListener("input", onInput); root.removeEventListener("change", onChange); root.removeEventListener("pointerover", onOver); root.removeEventListener("pointermove", onMove); document.removeEventListener("keydown", onKey); root.innerHTML = ""; },
};
}
