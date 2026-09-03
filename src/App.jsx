import { useState, useEffect, useRef, useContext, createContext } from "react";
import {
  ScanLine, ShoppingCart, Boxes, History, ShieldCheck, Plus, Minus,
  Trash2, X, Check, AlertTriangle, LogOut, Search, TrendingUp,
  PackagePlus, Pencil, Beer, CupSoda, Droplets, Citrus, Receipt,
  Wallet, CreditCard, Truck, Users, Download, Printer, Store, ChevronDown,
  Wine, Martini, Coffee, Milk, GlassWater, Bell,
  ClipboardList, ArrowUpCircle, ArrowDownCircle, Layers, ClipboardCheck, Camera, Sun, Moon, Mic, Star, Volume2, UserPlus, Gift, MessageCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import * as Tone from "tone";
import * as api from "./api.js";

/* ---------- Domaine ---------- */

const ICON_OPTIONS = [
  { id: "beer", Icon: Beer },
  { id: "cupsoda", Icon: CupSoda },
  { id: "droplets", Icon: Droplets },
  { id: "citrus", Icon: Citrus },
  { id: "wine", Icon: Wine },
  { id: "martini", Icon: Martini },
  { id: "coffee", Icon: Coffee },
  { id: "milk", Icon: Milk },
  { id: "glasswater", Icon: GlassWater },
];
const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map((o) => [o.id, o.Icon]));
const COLOR_OPTIONS = ["#E8A33D", "#2C7DA0", "#3FB8C4", "#E76F3C", "#8B5CF6", "#EC4899", "#22C55E", "#14B8A6"];

const SEED_CATEGORIES = [
  { id: "biere", label: "Bière", color: "#E8A33D", icon: "beer" },
  { id: "soda", label: "Soda", color: "#2C7DA0", icon: "cupsoda" },
  { id: "eau", label: "Eau", color: "#3FB8C4", icon: "droplets" },
  { id: "jus", label: "Jus", color: "#E76F3C", icon: "citrus" },
];
function getCategory(categories, id) {
  return (categories || []).find((c) => c.id === id) || { id, label: id || "?", color: "#999999", icon: "beer" };
}

const SEED_PRODUCTS = [
  { id: "1", name: "Régab 65cl", barcode: "6291041500213", category: "biere", price: 1200, costPrice: 900, stock: 48, openingStock: 48, minStock: 12, unit: "bouteille", favorite: true },
  { id: "2", name: "Castel Beer 65cl", barcode: "6291041500220", category: "biere", price: 1100, costPrice: 850, stock: 36, openingStock: 36, minStock: 12, unit: "bouteille" },
  { id: "3", name: "Coca-Cola 33cl", barcode: "5449000000996", category: "soda", price: 600, costPrice: 400, stock: 60, openingStock: 60, minStock: 20, unit: "canette", favorite: true },
  { id: "4", name: "Fanta Orange 33cl", barcode: "5449000133328", category: "soda", price: 600, costPrice: 400, stock: 8, openingStock: 8, minStock: 20, unit: "canette" },
  { id: "5", name: "Sprite 33cl", barcode: "5449000131836", category: "soda", price: 600, costPrice: 400, stock: 42, openingStock: 42, minStock: 20, unit: "canette" },
  { id: "6", name: "Eau Andza 1.5L", barcode: "6291041500237", category: "eau", price: 500, costPrice: 300, stock: 70, openingStock: 70, minStock: 24, unit: "bouteille" },
  { id: "7", name: "Eau Vitalo 50cl", barcode: "6291041500244", category: "eau", price: 300, costPrice: 180, stock: 15, openingStock: 15, minStock: 24, unit: "bouteille" },
  { id: "8", name: "Jus Youki Ananas 1L", barcode: "6291041500251", category: "jus", price: 1500, costPrice: 1000, stock: 20, openingStock: 20, minStock: 10, unit: "brique" },
];
const SEED_SUPPLIERS = [
  { id: "s1", name: "Sobraga (brasserie)", phone: "+241 01 23 45 67", note: "Bières & sodas" },
  { id: "s2", name: "Distributeur Eaux locales", phone: "+241 07 65 43 21", note: "Eaux minérales" },
];

const DEFAULT_ADMIN_PIN = "1234";
const PAYMENT_METHODS = [
  { id: "especes", label: "Espèces" },
  { id: "mobile", label: "Mobile Money" },
  { id: "credit", label: "Crédit client" },
];
const PAYMENT_LABELS = { especes: "Espèces", mobile: "Mobile Money", credit: "Crédit client" };
const PAYMENT_COLORS = { especes: "var(--glass)", mobile: "var(--soda)", credit: "var(--danger)" };

const MOVEMENT_TYPES = {
  vente: { label: "Vente", color: "var(--danger)" },
  creation: { label: "Création produit", color: "var(--soda)" },
  ajustement: { label: "Ajustement manuel", color: "var(--cap)" },
  comptage: { label: "Comptage d'inventaire", color: "#8B5CF6" },
};

const ESTABLISHMENT_TYPES = [
  { id: "maquis", label: "Maquis" },
  { id: "cave", label: "Cave" },
  { id: "buvette", label: "Buvette" },
  { id: "bar", label: "Bar" },
  { id: "autre", label: "Autre" },
];

const CURRENCIES = [
  { code: "XAF", label: "Franc CFA (XAF)", symbol: "FCFA", locale: "fr-FR" },
  { code: "EUR", label: "Euro (EUR)", symbol: "€", locale: "fr-FR" },
  { code: "USD", label: "Dollar US (USD)", symbol: "$", locale: "en-US" },
  { code: "GBP", label: "Livre Sterling (GBP)", symbol: "£", locale: "en-GB" },
  { code: "CAD", label: "Dollar canadien (CAD)", symbol: "$", locale: "fr-CA" },
];

const THEME_PRESETS = [
  { id: "emeraude", label: "Émeraude", glass: "#0E3B2A", glassLight: "#175943", cap: "#E8A33D" },
  { id: "ocean", label: "Océan", glass: "#0B3B5C", glassLight: "#12557E", cap: "#5FD1F2" },
  { id: "rubis", label: "Rubis", glass: "#5C1A2B", glassLight: "#7A2438", cap: "#F2A65A" },
  { id: "ambre", label: "Ambre", glass: "#4A2E12", glassLight: "#6B451E", cap: "#F2C14E" },
  { id: "violet", label: "Violet", glass: "#2E1A47", glassLight: "#432764", cap: "#C9A6FF" },
  { id: "ardoise", label: "Ardoise", glass: "#1E2A32", glassLight: "#2C3E49", cap: "#7FD1D9" },
];
function getTheme(id) { return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0]; }

/* ---------- Licence / activation ---------- */

const ACTIVATION_PLANS = [
  { code: "01", id: "1m", label: "1 mois", days: 30 },
  { code: "03", id: "3m", label: "3 mois", days: 90 },
  { code: "06", id: "6m", label: "6 mois", days: 180 },
  { code: "12", id: "12m", label: "12 mois", days: 365 },
  { code: "99", id: "lifetime", label: "À vie", days: null },
];
const TRIAL_DAYS = 7;
const MS_DAY = 24 * 60 * 60 * 1000;
const OWNER_EMAIL = "ayekoe83@gmail.com";
const OWNER_SECURITY_QUESTION = "Dans quelle école primaire as-tu étudié ?";

function luhnCheckDigit(digits) {
  let sum = 0, alt = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}
function formatActivationInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}
function validateActivationCode(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 12) return { ok: false, error: "Le code doit contenir 12 chiffres." };
  const plan = ACTIVATION_PLANS.find((p) => p.code === digits.slice(0, 2));
  if (!plan) return { ok: false, error: "Code invalide (plan inconnu)." };
  const base = digits.slice(0, 11);
  const check = digits.slice(11);
  if (String(luhnCheckDigit(base)) !== check) return { ok: false, error: "Code invalide (vérifiez la saisie)." };
  return { ok: true, plan, digits };
}
function computeLicenseStatus(license) {
  if (!license) return "none";
  if (license.lifetime) return "lifetime";
  if (!license.expiresAt) return "none";
  const daysLeft = Math.ceil((new Date(license.expiresAt) - Date.now()) / MS_DAY);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 7) return "expiring";
  return "active";
}

const CurrencyContext = createContext("XAF");

/* ---------- Langue ---------- */

const LanguageContext = createContext("fr");
const TRANSLATIONS = {
  fr: {
    sell: "Vendre", stock: "Stock", credits: "Crédits", history: "Historique", admin: "Admin",
    myHistory: "Mes ventes", fullHistory: "Historique des ventes", administration: "Administration",
    vendor: "Vendeur", administrator: "Administrateur", cancel: "Annuler", save: "Enregistrer",
    add: "Ajouter", edit: "Modifier", delete: "Supprimer", close: "Fermer",
  },
  en: {
    sell: "Sell", stock: "Stock", credits: "Credits", history: "History", admin: "Admin",
    myHistory: "My Sales", fullHistory: "Sales History", administration: "Administration",
    vendor: "Vendor", administrator: "Administrator", cancel: "Cancel", save: "Save",
    add: "Add", edit: "Edit", delete: "Delete", close: "Close",
  },
};
function useT() {
  const lang = useContext(LanguageContext);
  return (key) => (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.fr[key] || key;
}

function formatMoney(n, currencyCode) {
  const meta = CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];
  return new Intl.NumberFormat(meta.locale).format(Math.round(n || 0)) + " " + meta.symbol;
}
function useFmt() {
  const currency = useContext(CurrencyContext);
  return (n) => formatMoney(n, currency);
}
function buildReceiptText(receipt, shop, fmt) {
  const lines = [];
  lines.push(`🧾 Reçu de vente — ${shop.name}`);
  lines.push(new Date(receipt.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
  lines.push("");
  receipt.items.forEach((i) => {
    lines.push(`${i.qty} × ${i.product.name} — ${fmt(computeItemTotal(i.product, i.qty))}`);
  });
  lines.push("");
  lines.push(`Total : ${fmt(receipt.total)}`);
  lines.push(`Paiement : ${PAYMENT_LABELS[receipt.paymentMethod]}`);
  if (receipt.paymentMethod === "credit" && receipt.clientName) lines.push(`Client : ${receipt.clientName}`);
  if (receipt.amountReceived != null) {
    lines.push(`Montant reçu : ${fmt(receipt.amountReceived)}`);
    lines.push(`Monnaie rendue : ${fmt(receipt.changeDue)}`);
  }
  lines.push("");
  lines.push("Merci pour votre confiance. À très bientôt !");
  return lines.join("\n");
}

function useCurrencySymbol() {
  const currency = useContext(CurrencyContext);
  return (CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]).symbol;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateShopJoinCode(length = 7) {
  let out = "";
  for (let i = 0; i < length; i++) out += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  return out;
}

function computeItemTotal(product, qty) {
  if (product.bulkQty > 0 && product.bulkPrice > 0 && qty >= product.bulkQty) {
    const lots = Math.floor(qty / product.bulkQty);
    const remainder = qty % product.bulkQty;
    return lots * product.bulkPrice + remainder * product.price;
  }
  return qty * product.price;
}

/* ---------- Retours sonores ---------- */

let gbSynth = null;
async function playSound(kind, enabled) {
  if (!enabled) return;
  try {
    await Tone.start();
    if (!gbSynth) gbSynth = new Tone.Synth({ oscillator: { type: "sine" }, volume: -14 }).toDestination();
    const now = Tone.now();
    if (kind === "add") {
      gbSynth.triggerAttackRelease("C6", 0.06, now);
    } else if (kind === "sale") {
      gbSynth.triggerAttackRelease("C5", 0.08, now);
      gbSynth.triggerAttackRelease("E5", 0.08, now + 0.09);
      gbSynth.triggerAttackRelease("G5", 0.12, now + 0.18);
    } else if (kind === "error") {
      gbSynth.triggerAttackRelease("F3", 0.14, now);
    }
  } catch { /* audio indisponible (ex: avant interaction utilisateur) — on ignore */ }
}

async function loadKey(key, seed) {
  try {
    const r = await window.storage.get(key);
    return JSON.parse(r.value);
  } catch {
    window.storage.set(key, JSON.stringify(seed)).catch(() => {});
    return seed;
  }
}
async function safeDelete(key) {
  try { await window.storage.delete(key); } catch { /* clé déjà absente */ }
}
async function loadShopData(shopId) {
  const [products, sales, vendors, suppliers, expenses, categories, movements, inventories, clients] = await Promise.all([
    loadKey(`products:${shopId}`, SEED_PRODUCTS),
    loadKey(`sales:${shopId}`, []),
    loadKey(`vendors:${shopId}`, []),
    loadKey(`suppliers:${shopId}`, SEED_SUPPLIERS),
    loadKey(`expenses:${shopId}`, []),
    loadKey(`categories:${shopId}`, SEED_CATEGORIES),
    loadKey(`movements:${shopId}`, []),
    loadKey(`inventories:${shopId}`, []),
    loadKey(`clients:${shopId}`, []),
  ]);
  return { products, sales, vendors, suppliers, expenses, categories, movements, inventories, clients };
}
async function seedShopData(shopId, vendor) {
  await Promise.all([
    window.storage.set(`products:${shopId}`, JSON.stringify(SEED_PRODUCTS)),
    window.storage.set(`sales:${shopId}`, JSON.stringify([])),
    window.storage.set(`vendors:${shopId}`, JSON.stringify(vendor ? [vendor] : [])),
    window.storage.set(`suppliers:${shopId}`, JSON.stringify(SEED_SUPPLIERS)),
    window.storage.set(`expenses:${shopId}`, JSON.stringify([])),
    window.storage.set(`categories:${shopId}`, JSON.stringify(SEED_CATEGORIES)),
    window.storage.set(`movements:${shopId}`, JSON.stringify([])),
    window.storage.set(`inventories:${shopId}`, JSON.stringify([])),
    window.storage.set(`clients:${shopId}`, JSON.stringify([])),
  ]).catch(() => {});
}

function buildDailySeries(sales, days = 7) {
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const label = d.toLocaleDateString("fr-FR", { weekday: "short" });
    const total = sales.filter((s) => new Date(s.date).toDateString() === key).reduce((sum, s) => sum + s.total, 0);
    arr.push({ label, total });
  }
  return arr;
}
function buildMonthlySeries(sales, months = 6) {
  const arr = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    const total = sales
      .filter((s) => { const sd = new Date(s.date); return `${sd.getFullYear()}-${sd.getMonth()}` === key; })
      .reduce((sum, s) => sum + s.total, 0);
    arr.push({ label, total });
  }
  return arr;
}
function buildTopProducts(sales, limit = 5) {
  const counts = {};
  sales.forEach((s) => s.items.forEach((i) => { counts[i.product.name] = (counts[i.product.name] || 0) + i.qty; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, qty]) => ({ name, qty }));
}
function buildHourlySeries(sales) {
  const buckets = Array.from({ length: 18 }, (_, i) => { const h = i + 6; return { hour: h, label: `${h}h`, count: 0, total: 0 }; }); // 6h à 23h
  sales.forEach((s) => {
    const h = new Date(s.date).getHours();
    const bucket = buckets.find((b) => b.hour === h);
    if (bucket) { bucket.count += 1; bucket.total += s.total; }
  });
  return buckets;
}
function sumRevenueBetween(sales, start, end) {
  return sales.filter((s) => { const d = new Date(s.date); return d >= start && d < end; }).reduce((sum, s) => sum + s.total, 0);
}
function exportSalesCSV(sales) {
  const header = ["Date", "Vendeur", "Articles", "Paiement", "Client", "Total", "Encaissé par", "Date encaissement"];
  const rows = sales.map((s) => [
    new Date(s.date).toLocaleString("fr-FR"),
    s.vendor,
    s.items.map((i) => `${i.qty}x ${i.product.name}`).join(" | "),
    PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod,
    s.clientName || "",
    s.total,
    s.paidBy || "",
    s.paidDate ? new Date(s.paidDate).toLocaleString("fr-FR") : "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ventes_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- Style global ---------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
      .gb-root{
        --ink:#0F1B16; --glass:#0E3B2A; --glass-light:#175943;
        --cap:#E8A33D; --soda:#2C7DA0; --paper:#F4F6F1; --paper-dim:#E4E9DF;
        --danger:#C1442E; --line:#D8DFD4; --card:#FFFFFF;
        font-family:'Inter',sans-serif; color:var(--ink); background:var(--paper);
        transition: background-color .25s ease, color .25s ease;
      }
      .gb-root.gb-dark{
        --ink:#EDF2EE; --paper:#0A130E; --paper-dim:#16221A;
        --line:#243026; --card:#111C15;
      }
      .gb-root *{ transition: background-color .2s ease, border-color .2s ease, color .2s ease; }
      .gb-root input:not([type="range"]):not(.bg-transparent), .gb-root select:not(.bg-transparent), .gb-root textarea:not(.bg-transparent) {
        background: var(--card); color: var(--ink);
      }
      .gb-root input::placeholder, .gb-root textarea::placeholder { color: var(--ink); opacity: 0.4; }
      .gb-root .font-display{ font-family:'Space Grotesk',sans-serif; }
      .gb-root .font-mono{ font-family:'IBM Plex Mono',monospace; }
      .gb-scroll::-webkit-scrollbar{ display:none; }
      .gb-scroll{ -ms-overflow-style:none; scrollbar-width:none; }
      .ticket-edge{
        clip-path: polygon(0 0,100% 0,100% 96%,94% 100%,88% 96%,82% 100%,76% 96%,70% 100%,64% 96%,58% 100%,52% 96%,46% 100%,40% 96%,34% 100%,28% 96%,22% 100%,16% 96%,10% 100%,4% 96%,0 100%);
      }
      .gb-focus:focus-visible{ outline:2px solid var(--cap); outline-offset:2px; }
      @keyframes gb-pop{ 0%{transform:scale(.9); opacity:0;} 100%{transform:scale(1); opacity:1;} }
      .gb-pop{ animation: gb-pop .18s ease-out; }
      @keyframes gb-slide-up{ 0%{transform:translateY(16px); opacity:0;} 100%{transform:translateY(0); opacity:1;} }
      .gb-slide-up{ animation: gb-slide-up .22s ease-out; }
      @keyframes gb-toast-in{ 0%{transform:translate(-50%,-16px) scale(.96); opacity:0;} 60%{transform:translate(-50%,2px) scale(1.01); opacity:1;} 100%{transform:translate(-50%,0) scale(1); opacity:1;} }
      .gb-toast-in{ left:50%; transform:translateX(-50%); animation: gb-toast-in .38s cubic-bezier(.2,.9,.25,1.15) forwards; }
      @keyframes gb-toast-bar{ 0%{width:100%;} 100%{width:0%;} }
      .gb-toast-bar{ animation: gb-toast-bar 2.2s linear forwards; }
      @keyframes gb-scan-line{ 0%{top:2%;} 100%{top:98%;} }
      .gb-scan-line{ position:absolute; left:4%; right:4%; height:2px; background:var(--cap); box-shadow:0 0 10px 1px var(--cap); animation: gb-scan-line 1.6s ease-in-out infinite alternate; }
      @keyframes gb-marquee{ 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
      .gb-marquee-track{ animation: gb-marquee linear infinite; }
      .gb-marquee-wrap:active .gb-marquee-track, .gb-marquee-wrap:hover .gb-marquee-track{ animation-play-state: paused; }
      .gb-input-dark::placeholder{ color: rgba(255,255,255,0.55) !important; opacity: 1 !important; }
      @media print {
        body * { visibility: hidden; }
        #receipt-print-area, #receipt-print-area *, #sales-print-area, #sales-print-area *, #daily-report-print-area, #daily-report-print-area * { visibility: visible; }
        #receipt-print-area, #sales-print-area, #daily-report-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `}</style>
  );
}

/* ---------- Petits composants ---------- */

function CapGauge({ pct, color, size = 50, danger }) {
  const ringColor = danger ? "var(--danger)" : color;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${ringColor} ${pct * 3.6}deg, #0000001A 0deg)` }} />
      <div className="absolute inset-[3px] rounded-full flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <span className="font-mono font-semibold" style={{ fontSize: size * 0.22, color: ringColor }}>{pct}%</span>
      </div>
    </div>
  );
}
function CategoryIcon({ cat, categories, siz
