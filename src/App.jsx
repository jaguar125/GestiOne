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
function CategoryIcon({ cat, categories, size = 15 }) {
  const meta = getCategory(categories, cat);
  const Icon = ICON_MAP[meta.icon] || Beer;
  return <Icon size={size} color={meta.color} strokeWidth={2.3} />;
}
function StatCard({ icon: Icon, label, value, dark, danger }) {
  return (
    <div className="rounded-2xl p-3.5" style={{ background: dark ? "var(--glass)" : "var(--card)", border: dark ? "none" : `1px solid ${danger ? "var(--danger)" : "var(--line)"}` }}>
      <Icon size={16} color={dark ? "var(--cap)" : danger ? "var(--danger)" : "var(--ink)"} />
      <div className="font-mono font-bold text-lg mt-1.5" style={{ color: dark ? "#fff" : danger ? "var(--danger)" : "var(--ink)" }}>{value}</div>
      <div className="text-[11px] mt-0.5" style={{ color: dark ? "#ffffffb0" : "var(--ink)", opacity: dark ? 1 : 0.5 }}>{label}</div>
    </div>
  );
}
function Toast({ toast }) {
  if (!toast) return null;
  const isErr = toast.type === "error";
  const accent = isErr ? "var(--danger)" : "#1CA857";
  const tint = isErr ? "#FCEBE8" : "#E7F7EE";
  return (
    <div key={toast.message + toast.type} className="fixed top-5 z-[95] w-[calc(100%-2rem)] max-w-[380px] no-print gb-toast-in" style={{ left: "50%" }}>
      <div className="relative flex items-center gap-3 pl-3.5 pr-4 py-3.5 rounded-2xl overflow-hidden" style={{ background: "var(--card)", boxShadow: "0 12px 32px -8px rgba(15,27,22,0.28), 0 2px 8px rgba(15,27,22,0.08)", borderLeft: `4px solid ${accent}` }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: tint }}>
          {isErr ? <AlertTriangle size={17} color={accent} strokeWidth={2.4} /> : <Check size={17} color={accent} strokeWidth={2.8} />}
        </div>
        <p className="text-sm font-semibold leading-snug flex-1" style={{ color: "var(--ink)" }}>{toast.message}</p>
        <div className="absolute bottom-0 left-0 h-[3px] gb-toast-bar" style={{ background: accent }} />
      </div>
    </div>
  );
}

/* ---------- Configuration initiale ---------- */

function ActivationCodeForm({ onActivate, pushToast, accent }) {
  const [raw, setRaw] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (raw.length !== 12) { pushToast("Le code doit contenir 12 chiffres.", "error"); return; }
    setChecking(true);
    try {
      await onActivate(raw);
      setRaw("");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="w-full max-w-xs">
      <input
        value={formatActivationInput(raw)}
        onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 12))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="0000-0000-0000"
        inputMode="numeric"
        className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-lg font-mono text-center tracking-wider outline-none mb-3"
        style={{ background: "var(--glass-light)", color: "#fff" }}
      />
      <button onClick={submit} disabled={checking} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50" style={{ background: accent || "var(--cap)", color: "var(--glass)" }}>
        {checking ? "Vérification…" : "Activer"}
      </button>
    </div>
  );
}

const LICENSE_PLANS_PRICING = [
  { id: "1m", name: "Essentiel", duration: "1 mois", price: 5000, oldPrice: 15000 },
  { id: "3m", name: "Avancé", duration: "3 mois", price: 13000, oldPrice: 50000 },
  { id: "6m", name: "Professionnel", duration: "6 mois", price: 25000, oldPrice: 150000 },
  { id: "12m", name: "Entreprise", duration: "12 mois", price: 45000, oldPrice: 250000 },
  { id: "lifetime", name: "Permanent", duration: "À vie", price: null, oldPrice: null },
];

function PricingScreen({ registeredAdmin, onClose, pushToast }) {
  const [ordering, setOrdering] = useState(null); // plan sélectionné
  const [name, setName] = useState(registeredAdmin?.name || "");
  const [phone, setPhone] = useState(registeredAdmin?.phone || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submitOrder = async () => {
    if (!name.trim() || !phone.trim()) { pushToast("Nom et téléphone requis", "error"); return; }
    setSending(true);
    try {
      const label = ordering.price ? `${ordering.name} — ${ordering.duration} (${ordering.price.toLocaleString("fr-FR")} FCFA)` : `${ordering.name} — ${ordering.duration}`;
      await api.supportSend({ name: name.trim(), phone: phone.trim(), email: registeredAdmin?.email || "", message: `Je souhaite commander la licence : ${label}` });
      setSent(true);
    } catch {
      pushToast("Erreur d'envoi — vérifie ta connexion et réessaie", "error");
    } finally {
      setSending(false);
    }
  };

  if (ordering) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--glass)" }}>
        {sent ? (
          <div className="text-center gb-slide-up">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#1CA857" }}>
              <Check size={30} color="#fff" strokeWidth={2.5} />
            </div>
            <h1 className="font-display font-bold text-xl text-white mb-2">Demande envoyée !</h1>
            <p className="text-white/60 text-sm max-w-[260px] mx-auto mb-6">L'administrateur te contactera très vite pour finaliser ton achat.</p>
            <button onClick={onClose} className="gb-focus rounded-2xl py-3 px-6 font-semibold text-sm" style={{ background: "var(--cap)", color: "var(--glass)" }}>Retour</button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center gb-slide-up">
              <h1 className="font-display font-bold text-xl text-white">{ordering.name}</h1>
              <p className="text-white/60 text-sm mt-1">{ordering.duration}{ordering.price ? ` — ${ordering.price.toLocaleString("fr-FR")} FCFA` : ""}</p>
            </div>
            <div className="w-full max-w-xs flex flex-col gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
              <button onClick={submitOrder} disabled={sending} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm disabled:opacity-50" style={{ background: "var(--cap)", color: "var(--glass)" }}>
                {sending ? "Envoi…" : "Envoyer la demande"}
              </button>
              <button onClick={() => setOrdering(null)} className="gb-focus text-white/50 text-xs underline self-center">Retour aux tarifs</button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full px-5 py-8" style={{ background: "var(--glass)" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-xl text-white">Nos licences</h1>
        <button onClick={onClose} className="gb-focus text-white/70"><X size={20} /></button>
      </div>
      <div className="flex flex-col gap-3">
        {LICENSE_PLANS_PRICING.map((p) => (
          <div key={p.id} className="rounded-2xl p-4" style={{ background: "var(--glass-light)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-display font-bold text-base">{p.name}</p>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "var(--cap)", color: "var(--glass)" }}>{p.duration}</span>
            </div>
            {p.price ? (
              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-mono font-bold text-lg text-white">{p.price.toLocaleString("fr-FR")} FCFA</span>
                <span className="font-mono text-xs text-white/40 line-through">{p.oldPrice.toLocaleString("fr-FR")} FCFA</span>
              </div>
            ) : (
              <p className="text-white/60 text-xs mb-3">Accès à vie — tarif sur demande</p>
            )}
            <button onClick={() => setOrdering(p)} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--cap)", color: "var(--glass)" }}>
              {p.price ? "Commander" : "Contacter l'administrateur"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RenewLicenseModal({ onActivate, onClose, pushToast }) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-6 gb-slide-up" style={{ background: "var(--glass)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white">Renouveler la licence</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} color="#fff" /></button>
        </div>
        <p className="text-white/60 text-xs mb-4">Entrez un nouveau code d'activation pour prolonger votre accès.</p>
        <ActivationCodeForm onActivate={(r) => { onActivate(r); onClose(); }} pushToast={pushToast} />
      </div>
    </div>
  );
}

function OnboardingScreen({ shops, onComplete, onJoinShop, pushToast, initialMode, onCancel, hasSavedShop, savedShopName, onResume, trialUsed, onStartTrial }) {
  const [mode, setMode] = useState(initialMode || null); // null = choix, "create", "join", "reconnect"
  const [startingTrial, setStartingTrial] = useState(false);

  const openCreate = async () => {
    if (!trialUsed && onStartTrial) {
      setStartingTrial(true);
      await onStartTrial();
      setStartingTrial(false);
    }
    setMode("create");
  };
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState("maquis");
  const [vendorName, setVendorName] = useState("");
  const [vendorPin, setVendorPin] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (step === 1) {
      if (!name.trim()) { pushToast("Indiquez le nom de votre établissement", "error"); return; }
      setStep(2); return;
    }
    if (step === 2) {
      if (!vendorName.trim() || vendorPin.length !== 4) { pushToast("Nom et code à 4 chiffres requis", "error"); return; }
      setStep(3); return;
    }
    setLoading(true);
    try {
      const backend = await api.createShopBackend({ name: name.trim(), type, currency });
      const shopObj = {
        id: backend.shop_id,
        name: name.trim(), type, currency,
        joinCode: backend.join_code,
        backendLinked: true,
        adminPinHash: api.hashPin(DEFAULT_ADMIN_PIN),
      };
      const vendorObj = { id: uid(), name: vendorName.trim(), pinHash: api.hashPin(vendorPin), joinCode: generateShopJoinCode() };
      onComplete(shopObj, vendorObj);
    } catch (e) {
      pushToast(api.networkErrorText(e, "créer une boutique") || "Erreur lors de la création, réessayez.", "error");
    } finally {
      setLoading(false);
    }
  };

  const submitJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { pushToast("Entrez le code d'invitation", "error"); return; }
    setLoading(true);
    try {
      const backend = await api.joinShopBackend({ joinCode: code });
      const pulled = await api.pullAll();
      const meta = pulled.shopMeta || {};
      const shopObj = {
        id: backend.shop_id,
        name: meta.name || backend.name,
        type: meta.type || backend.type,
        currency: meta.currency || backend.currency,
        adminPinHash: meta.adminPinHash,
        theme: meta.theme, darkMode: meta.darkMode, soundsEnabled: meta.soundsEnabled,
        loyaltyThreshold: meta.loyaltyThreshold, language: meta.language,
        joinCode: code,
        backendLinked: true,
      };
      onJoinShop(shopObj, pulled, undefined, undefined, backend.shop_license);
    } catch (e) {
      pushToast(api.networkErrorText(e, "rejoindre une boutique") || e.message || "Code introuvable", "error");
    } finally {
      setLoading(false);
    }
  };

  const [reconnectRole, setReconnectRole] = useState(null);
  const [rcShopName, setRcShopName] = useState("");
  const [rcPin, setRcPin] = useState("");
  const [rcVendorName, setRcVendorName] = useState("");
  const [rcJoinCode, setRcJoinCode] = useState("");

  const submitReconnect = async () => {
    if (!rcShopName.trim() || rcPin.length !== 4 || !rcVendorName.trim() || (reconnectRole === "vendeur" && !rcJoinCode.trim())) {
      pushToast("Merci de remplir tous les champs", "error"); return;
    }
    setLoading(true);
    try {
      const backend = await api.reconnectShopBackend({
        role: reconnectRole,
        shopName: rcShopName.trim(),
        adminPin: reconnectRole === "admin" ? rcPin : undefined,
        vendorPin: reconnectRole === "vendeur" ? rcPin : undefined,
        vendorName: rcVendorName.trim(),
        joinCode: rcJoinCode.trim(),
      });
      const pulled = await api.pullAll();
      const meta = pulled.shopMeta || {};
      const shopObj = {
        id: backend.shop_id,
        name: meta.name || backend.name,
        type: meta.type || backend.type,
        currency: meta.currency || backend.currency,
        adminPinHash: meta.adminPinHash,
        theme: meta.theme, darkMode: meta.darkMode, soundsEnabled: meta.soundsEnabled,
        loyaltyThreshold: meta.loyaltyThreshold, language: meta.language,
        joinCode: backend.join_code,
        backendLinked: true,
      };
      onJoinShop(shopObj, pulled, backend.role, backend.vendorName || "Administrateur", backend.shop_license);
    } catch (e) {
      pushToast(api.networkErrorText(e, "vous reconnecter") || e.message || "Reconnexion impossible", "error");
    } finally {
      setLoading(false);
    }
  };

  if (mode === null) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--glass)" }}>
        <div className="mb-8 text-center gb-slide-up">
          <svg width="76" height="76" viewBox="0 0 512 512" className="mx-auto mb-4" style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.25))" }}>
            <defs>
              <linearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#175943" />
                <stop offset="100%" stopColor="#0E3B2A" />
              </linearGradient>
              <linearGradient id="logoCap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F0B75A" />
                <stop offset="100%" stopColor="#E8A33D" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="112" fill="url(#logoBg)" />
            <path d="M 256.00,86 L 279.87,104.90 L 308.31,94.28 L 325.68,119.10 L 356.55,117.11 L 365.95,145.81 L 396.15,152.81 L 396.46,184.65 L 423.13,199.99 L 414.55,229.55 L 435.15,251.99 L 418.15,277.61 L 431.11,305.65 L 407.77,324.83 L 411.99,355.65 L 383.60,367.11 L 378.72,397.30 L 348.35,399.94 L 334.55,427.53 L 304.94,420.92 L 284.14,442.68 L 256.00,427.30 L 227.86,442.68 L 207.06,420.92 L 177.45,427.53 L 163.65,399.94 L 133.28,397.30 L 128.40,367.11 L 100.01,355.65 L 104.23,324.83 L 80.89,305.65 L 93.85,277.61 L 76.85,251.99 L 97.45,229.55 L 88.87,199.99 L 115.54,184.65 L 115.85,152.81 L 146.05,145.81 L 155.45,117.11 L 186.32,119.10 L 203.69,94.28 L 232.13,104.90 Z" fill="url(#logoCap)" stroke="#0E3B2A" strokeWidth="4" />
            <circle cx="256" cy="256" r="118" fill="#0E3B2A" />
            <circle cx="256" cy="256" r="118" fill="none" stroke="#F0B75A" strokeWidth="3" opacity="0.5" />
            <g fill="#F4F6F1">
              <path d="M 208 190 L 300 190 L 292 320 Q 290 336 274 336 L 234 336 Q 218 336 216 320 Z" />
              <path d="M 300 214 Q 336 214 336 246 Q 336 278 300 278 L 298 260 Q 316 260 316 246 Q 316 232 298 232 Z" />
              <ellipse cx="254" cy="190" rx="46" ry="14" />
            </g>
            <g fill="none" stroke="#0E3B2A" strokeWidth="4" opacity="0.55">
              <path d="M 224 214 L 284 214 M 221 244 L 287 244 M 219 274 L 289 274" />
            </g>
          </svg>
          <h1 className="font-display font-bold text-xl text-white">Bienvenue</h1>
          <p className="text-white/60 text-sm mt-1.5">Configurons votre espace de gestion.</p>
        </div>
        <div className="w-full max-w-xs flex flex-col gap-3 gb-slide-up">
          {hasSavedShop && (
            <button onClick={onResume} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm mb-1 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: "var(--cap)", color: "var(--glass)" }}>
              ↩ Retourner à "{savedShopName}"
            </button>
          )}
          <button onClick={openCreate} disabled={startingTrial} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform disabled:opacity-60" style={{ background: "var(--glass-light)", border: "2px solid var(--cap)" }}>
            <Store size={20} color="var(--cap)" />
            <div><div className="text-white font-semibold text-sm">Créer une nouvelle boutique</div><div className="text-white/50 text-xs">{startingTrial ? "Démarrage…" : !trialUsed ? `Essai gratuit ${TRIAL_DAYS} jours, configuration complète` : "Une autre boutique, gérée séparément"}</div></div>
          </button>
          <button onClick={() => setMode("join")} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "var(--glass-light)" }}>
            <UserPlus size={20} color="var(--cap)" />
            <div><div className="text-white font-semibold text-sm">Rejoindre une boutique existante</div><div className="text-white/50 text-xs">Avec le code communiqué par l'administrateur</div></div>
          </button>
          <button onClick={() => setMode("reconnect")} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "var(--glass-light)" }}>
            <ShieldCheck size={20} color="var(--cap)" />
            <div><div className="text-white font-semibold text-sm">Se reconnecter à ma boutique</div><div className="text-white/50 text-xs">J'avais déjà accès, nouvel appareil</div></div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "reconnect") {
    if (!reconnectRole) {
      return (
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--glass)" }}>
          <div className="mb-8 text-center gb-slide-up">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--cap)" }}>
              <ShieldCheck size={26} color="var(--glass)" strokeWidth={2.2} />
            </div>
            <h1 className="font-display font-bold text-xl text-white">Se reconnecter</h1>
            <p className="text-white/60 text-sm mt-1.5">Tu te connectes en tant que...</p>
          </div>
          <div className="w-full max-w-xs flex flex-col gap-3">
            <button onClick={() => setReconnectRole("admin")} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "var(--glass-light)" }}>
              <ShieldCheck size={20} color="var(--cap)" />
              <div className="text-white font-semibold text-sm">Administrateur</div>
            </button>
            <button onClick={() => setReconnectRole("vendeur")} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "var(--glass-light)" }}>
              <ShoppingCart size={20} color="var(--cap)" />
              <div className="text-white font-semibold text-sm">Vendeur</div>
            </button>
          </div>
          <button onClick={() => (onCancel ? onCancel() : setMode(null))} className="gb-focus mt-7 text-white/50 text-xs underline">Retour</button>
        </div>
      );
    }
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--glass)" }}>
        <div className="mb-6 text-center gb-slide-up">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--cap)" }}>
            <ShieldCheck size={26} color="var(--glass)" strokeWidth={2.2} />
          </div>
          <h1 className="font-display font-bold text-xl text-white">{reconnectRole === "admin" ? "Reconnexion administrateur" : "Reconnexion vendeur"}</h1>
        </div>
        <div className="w-full max-w-xs flex flex-col gap-3">
          <input value={rcShopName} onChange={(e) => setRcShopName(e.target.value)} placeholder="Nom de la boutique" className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
          <input value={rcVendorName} onChange={(e) => setRcVendorName(e.target.value)} placeholder={reconnectRole === "admin" ? "Nom d'un vendeur de ta boutique" : "Ton nom"} className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
          <input value={rcPin} onChange={(e) => setRcPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={reconnectRole === "admin" ? "Code administrateur" : "Ton code PIN"} inputMode="numeric" className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm font-mono outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
          {reconnectRole === "vendeur" && (
            <input value={rcJoinCode} onChange={(e) => setRcJoinCode(e.target.value.toUpperCase())} placeholder="Ton code de liaison" className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm font-mono tracking-wider outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
          )}
          <button onClick={submitReconnect} disabled={loading} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm disabled:opacity-50 mt-1" style={{ background: "var(--cap)", color: "var(--glass)" }}>
            {loading ? "Connexion…" : "Se reconnecter"}
          </button>
          <button onClick={() => setReconnectRole(null)} className="gb-focus text-white/50 text-xs underline self-center">Retour</button>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--glass)" }}>
        <div className="mb-8 text-center gb-slide-up">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--cap)" }}>
            <UserPlus size={26} color="var(--glass)" strokeWidth={2.2} />
          </div>
          <h1 className="font-display font-bold text-xl text-white">Rejoindre une boutique</h1>
          <p className="text-white/60 text-sm mt-1.5 max-w-[280px] mx-auto">Entrez le code d'invitation communiqué par l'administrateur.</p>
        </div>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 7))}
          placeholder="Ex : LMK4X7Q"
          className="gb-input-dark gb-focus w-full max-w-xs rounded-2xl px-4 py-3.5 text-lg font-mono text-center tracking-wider outline-none mb-4"
          style={{ background: "var(--glass-light)", color: "#fff" }}
        />
        <button onClick={submitJoin} disabled={loading} className="gb-focus w-full max-w-xs rounded-2xl py-3 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50" style={{ background: "var(--cap)", color: "var(--glass)" }}>
          {loading ? "Connexion…" : "Rejoindre"}
        </button>
        <button onClick={() => setMode(null)} className="gb-focus mt-6 text-white/50 text-xs underline">Retour</button>
        <p className="text-white/30 text-[11px] text-center mt-8 max-w-[260px]">Une connexion internet est nécessaire pour rejoindre une boutique existante. Une fois connecté, l'app fonctionne aussi hors-ligne au quotidien.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--glass)" }}>
      <div className="mb-8 text-center gb-slide-up" key={"h" + step}>
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--cap)" }}>
          <Store size={26} color="var(--glass)" strokeWidth={2.2} />
        </div>
        <p className="text-white/50 text-xs font-mono mb-1">Étape {step} sur 3</p>
        <h1 className="font-display font-bold text-xl text-white">
          {step === 1 && "Nommez votre établissement"}
          {step === 2 && "Créez votre premier vendeur"}
          {step === 3 && "Choisissez votre devise"}
        </h1>
      </div>

      <div className="w-full max-w-xs gb-slide-up" key={"b" + step}>
        {step === 1 && (
          <>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Chez Mama, Le Maquis du Coin…" className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm mb-3 outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
            <div className="flex flex-wrap gap-2">
              {ESTABLISHMENT_TYPES.map((t) => (
                <button key={t.id} onClick={() => setType(t.id)} className="gb-focus px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: type === t.id ? "var(--cap)" : "var(--glass-light)", color: type === t.id ? "var(--glass)" : "#fff" }}>{t.label}</button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <input autoFocus value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Nom du vendeur" className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm mb-3 outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
            <input value={vendorPin} onChange={(e) => setVendorPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Code d'accès (4 chiffres)" inputMode="numeric" className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-sm font-mono outline-none" style={{ background: "var(--glass-light)", color: "#fff" }} />
          </>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-2">
            {CURRENCIES.map((c) => (
              <button key={c.code} onClick={() => setCurrency(c.code)} className="gb-focus w-full rounded-2xl px-4 py-3.5 flex items-center justify-between text-left" style={{ background: currency === c.code ? "var(--cap)" : "var(--glass-light)" }}>
                <span className="text-sm font-semibold" style={{ color: currency === c.code ? "var(--glass)" : "#fff" }}>{c.label}</span>
                {currency === c.code && <Check size={16} color="var(--glass)" />}
              </button>
            ))}
            <p className="text-white/30 text-[11px] text-center mt-3">Une connexion internet est nécessaire pour cette dernière étape (création sur le serveur). L'app fonctionnera ensuite hors-ligne au quotidien.</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-xs flex items-center gap-3 mt-8">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="gb-focus px-4 py-3 rounded-2xl text-white/60 text-sm">Retour</button>}
        <button onClick={next} disabled={loading} className="gb-focus flex-1 rounded-2xl py-3 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50" style={{ background: "var(--cap)", color: "var(--glass)" }}>
          {loading ? "Création…" : step < 3 ? "Continuer" : "Terminer la configuration"}
        </button>
      </div>
      <div className="flex gap-1.5 mt-6">
        {[1, 2, 3].map((i) => <div key={i} className="h-1 rounded-full transition-all" style={{ width: i === step ? 20 : 6, background: i <= step ? "var(--cap)" : "#ffffff30" }} />)}
      </div>
    </div>
  );
}

/* ---------- Écran de connexion ---------- */

function PinPad({ accent, onSubmit }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const submit = (val) => {
    const ok = onSubmit(val);
    if (!ok) { setShake(true); setTimeout(() => { setShake(false); setPin(""); }, 320); }
    else setPin("");
  };
  const press = (d) => {
    const next = pin.length < 4 ? pin + d : pin;
    setPin(next);
    if (next.length === 4) setTimeout(() => submit(next), 80);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className={shake ? "gb-pop" : ""}>
      <div className="flex justify-center gap-3 mb-7">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-full border-2 transition-colors" style={{ borderColor: shake ? "var(--danger)" : accent, background: i < pin.length ? (shake ? "var(--danger)" : accent) : "transparent" }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
        {keys.map((d, i) => d === "" ? <div key={i} /> : (
          <button key={i} onClick={() => (d === "del" ? setPin((p) => p.slice(0, -1)) : press(d))} className="gb-focus h-14 rounded-2xl text-lg font-mono font-semibold active:scale-95 transition-transform" style={{ background: "var(--paper-dim)", color: "var(--ink)" }}>
            {d === "del" ? "⌫" : d}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoginScreen({ shop, shops, activeShopId, onSwitchShop, vendors, onLogin, pushToast, onGoHome }) {
  const [mode, setMode] = useState(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const typeLabel = ESTABLISHMENT_TYPES.find((t) => t.id === shop.type)?.label || "";
  const check = (pin) => {
    if (mode === "admin") {
      const valid = shop.backendLinked ? api.verifyPin(pin, shop.adminPinHash) : pin === (shop.adminPin || DEFAULT_ADMIN_PIN);
      if (valid) { onLogin("admin", "Administrateur"); return true; }
      pushToast("Code incorrect", "error"); return false;
    }
    const v = vendors.find((x) => (shop.backendLinked ? api.verifyPin(pin, x.pinHash) : x.pin === pin));
    if (v) { onLogin("vendeur", v.name); return true; }
    pushToast("Code incorrect", "error"); return false;
  };
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--glass)" }}>
      {shops.length > 1 && !mode && (
        <div className="w-full max-w-xs mb-5 gb-slide-up">
          <button onClick={() => setSwitcherOpen((v) => !v)} className="gb-focus w-full flex items-center justify-center gap-1.5 text-white/50 text-[11px] font-mono py-1.5">
            <Store size={12} /> Changer de boutique <ChevronDown size={12} style={{ transform: switcherOpen ? "rotate(180deg)" : "none" }} />
          </button>
          {switcherOpen && (
            <div className="mt-1 rounded-2xl overflow-hidden gb-slide-up" style={{ background: "var(--glass-light)" }}>
              {shops.map((s) => (
                <button key={s.id} onClick={() => { onSwitchShop(s.id); setSwitcherOpen(false); }} className="gb-focus w-full text-left px-4 py-3 text-sm text-white flex items-center justify-between border-b border-white/5 last:border-0">
                  {s.name}
                  {s.id === activeShopId && <Check size={14} color="var(--cap)" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--cap)" }}>
          <Beer size={30} color="var(--glass)" strokeWidth={2.2} />
        </div>
        <h1 className="font-display font-bold text-2xl text-white tracking-tight">{shop.name}</h1>
        <p className="text-white/60 text-sm mt-1">{typeLabel ? typeLabel + " · " : ""}Gestion de stock &amp; ventes</p>
      </div>
      {!mode ? (
        <div className="w-full max-w-xs flex flex-col gap-3 gb-slide-up">
          <button onClick={() => setMode("vendeur")} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "var(--glass-light)" }}>
            <ShoppingCart size={20} color="var(--cap)" />
            <div><div className="text-white font-semibold text-sm">{(TRANSLATIONS[shop.language || "fr"] || TRANSLATIONS.fr).vendor}</div><div className="text-white/50 text-xs">Encaisser une vente</div></div>
          </button>
          <button onClick={() => setMode("admin")} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "var(--glass-light)" }}>
            <ShieldCheck size={20} color="var(--cap)" />
            <div><div className="text-white font-semibold text-sm">{(TRANSLATIONS[shop.language || "fr"] || TRANSLATIONS.fr).administrator}</div><div className="text-white/50 text-xs">Stock, prix, rapports</div></div>
          </button>
          {((!shop.backendLinked && (!shop.adminPin || shop.adminPin === DEFAULT_ADMIN_PIN)) || (shop.backendLinked && api.verifyPin(DEFAULT_ADMIN_PIN, shop.adminPinHash))) && (
            <p className="text-white/30 text-[11px] text-center mt-3 font-mono">Code administrateur par défaut : 1234</p>
          )}
          {onGoHome && (
            <button onClick={onGoHome} className="gb-focus block mx-auto mt-5 text-white/50 text-xs underline">← Retour</button>
          )}
        </div>
      ) : (
        <div className="w-full gb-slide-up">
          <p className="text-white/70 text-sm text-center mb-6">Code {mode === "admin" ? "administrateur" : "vendeur"}</p>
          <PinPad accent="var(--cap)" onSubmit={check} />
          <button onClick={() => setMode(null)} className="gb-focus block mx-auto mt-7 text-white/50 text-xs underline">Retour</button>
        </div>
      )}
      <p className="text-white/20 text-[10px] text-center mt-10 font-mono tracking-wide">CASE &amp; COMPTOIR</p>
    </div>
  );
}

/* ---------- Écran de vente ---------- */

/* ---------- Scanner caméra ---------- */

function CameraScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;
    let rafId = null;
    let stopped = false;
    let detector = null;

    async function start() {
      if (!("BarcodeDetector" in window)) { setSupported(false); return; }
      try {
        detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "codabar", "itf"] });
      } catch { setSupported(false); return; }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const scan = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) { onDetect(codes[0].rawValue); return; }
          } catch { /* image pas encore prête, on continue */ }
          rafId = requestAnimationFrame(scan);
        };
        rafId = requestAnimationFrame(scan);
      } catch {
        setError("Impossible d'accéder à la caméra. Vérifiez les autorisations de l'application.");
      }
    }
    start();
    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col no-print">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />

      {supported && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-72 h-44">
            <div className="absolute inset-0 rounded-2xl border-2" style={{ borderColor: "var(--cap)" }} />
            <div className="gb-scan-line" />
          </div>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between p-4">
        <button onClick={onClose} className="gb-focus w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><X size={20} color="#fff" /></button>
        <p className="text-white text-sm font-semibold">Scanner un code-barre</p>
        <div className="w-10" />
      </div>

      <div className="relative z-10 mt-auto p-6">
        {!supported && (
          <div className="rounded-2xl p-4 bg-white gb-pop">
            <p className="text-sm font-semibold mb-1">Scanner caméra non disponible</p>
            <p className="text-xs opacity-60">Cet appareil ou ce navigateur ne supporte pas la détection de code-barre en direct. Utilisez une douchette Bluetooth ou la saisie manuelle du code.</p>
            <button onClick={onClose} className="gb-focus w-full mt-3 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Fermer</button>
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-4 bg-white gb-pop">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--danger)" }}>{error}</p>
            <button onClick={onClose} className="gb-focus w-full mt-3 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Fermer</button>
          </div>
        )}
        {supported && !error && <p className="text-white/70 text-xs text-center">Placez le code-barre à l'intérieur du cadre</p>}
      </div>
    </div>
  );
}

function ClientPicker({ clients, value, onChange, onCreateClient }) {
  const [query, setQuery] = useState("");
  const selected = clients.find((c) => c.id === value);
  const matches = query.trim() ? clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5) : [];
  const exactMatch = clients.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 border mb-2" style={{ borderColor: "var(--line)" }}>
        <span className="text-sm font-medium">{selected.name}{selected.phone ? ` · ${selected.phone}` : ""}</span>
        <button onClick={() => { onChange(null, ""); setQuery(""); }} className="gb-focus text-xs opacity-50 underline shrink-0 ml-2">Changer</button>
      </div>
    );
  }

  return (
    <div className="mb-2">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher ou ajouter un client" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
      {query.trim() && (
        <div className="mt-1.5 rounded-xl border overflow-hidden gb-slide-up" style={{ borderColor: "var(--line)" }}>
          {matches.map((c) => (
            <button key={c.id} onClick={() => { onChange(c.id, c.name); setQuery(""); }} className="gb-focus w-full text-left px-3 py-2 text-sm border-b last:border-0" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              {c.name}{c.phone ? ` · ${c.phone}` : ""}
            </button>
          ))}
          {!exactMatch && (
            <button
              onClick={() => { const id = onCreateClient(query.trim()); onChange(id, query.trim()); setQuery(""); }}
              className="gb-focus w-full text-left px-3 py-2 text-sm flex items-center gap-1.5 font-semibold"
              style={{ color: "var(--glass)", background: "var(--paper-dim)" }}
            >
              <UserPlus size={13} /> Ajouter "{query.trim()}" comme nouveau client
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SellScreen({ shop, categories, products, sales, clients, onCreateClient, cart, setCart, onCheckout, pushToast }) {
  const fmt = useFmt();
  const [barcode, setBarcode] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [showCart, setShowCart] = useState(false);
  const [payment, setPayment] = useState("especes");
  const [amountReceived, setAmountReceived] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { pushToast("Recherche vocale non disponible sur cet appareil", "error"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); pushToast("Recherche vocale interrompue", "error"); };
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      setCat("all");
    };
    recognition.start();
  };

  const addToCart = (product, silent) => {
    if (product.stock <= 0) { pushToast(`${product.name} — rupture de stock`, "error"); playSound("error", shop.soundsEnabled); return; }
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      const qtyInCart = existing ? existing.qty : 0;
      if (qtyInCart >= product.stock) { pushToast("Stock insuffisant", "error"); playSound("error", shop.soundsEnabled); return c; }
      if (existing) return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { id: product.id, qty: 1 }];
    });
    playSound("add", shop.soundsEnabled);
    if (!silent) pushToast(`${product.name} ajouté`, "ok");
  };

  const lookupAndAdd = (code) => {
    const found = products.find((p) => p.barcode === code);
    if (found) addToCart(found);
    else pushToast(`Aucun produit pour ${code}`, "error");
  };

  const handleScan = (e) => {
    if (e.key !== "Enter") return;
    const code = barcode.trim();
    setBarcode("");
    if (!code) return;
    lookupAndAdd(code);
  };

  const handleCameraDetect = (code) => {
    setScannerOpen(false);
    lookupAndAdd(code);
  };

  const filtered = products.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const popularIds = (() => {
    const counts = {};
    (sales || []).forEach((s) => s.items.forEach((i) => { counts[i.id] = (counts[i.id] || 0) + i.qty; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  })();
  const quickPicks = products.filter((p) => p.favorite || popularIds.includes(p.id)).slice(0, 10);

  const cartItems = cart.map((i) => ({ ...i, product: products.find((p) => p.id === i.id) })).filter((i) => i.product);
  const total = cartItems.reduce((s, i) => s + computeItemTotal(i.product, i.qty), 0);
  const count = cartItems.reduce((s, i) => s + i.qty, 0);

  const changeQty = (id, delta) => {
    setCart((c) => {
      const item = c.find((i) => i.id === id);
      const product = products.find((p) => p.id === id);
      const nextQty = item.qty + delta;
      if (nextQty <= 0) return c.filter((i) => i.id !== id);
      if (product && nextQty > product.stock) { pushToast("Stock insuffisant", "error"); return c; }
      return c.map((i) => (i.id === id ? { ...i, qty: nextQty } : i));
    });
  };

  const confirmCheckout = () => {
    if (payment === "credit" && !clientId) { pushToast("Sélectionnez ou ajoutez un client pour le crédit", "error"); return; }
    if (payment === "especes" && amountReceived !== "" && Number(amountReceived) < total) { pushToast("Le montant reçu est inférieur au total", "error"); return; }
    const sale = onCheckout(cartItems, total, payment, clientId, clientName || "Client", payment === "especes" && amountReceived !== "" ? Number(amountReceived) : null);
    playSound("sale", shop.soundsEnabled);
    setReceipt(sale);
    setShowCart(false);
    setPayment("especes");
    setClientName("");
    setClientId(null);
    setAmountReceived("");
  };

  return (
    <div className="pb-40">
      <div className="px-4 pt-4">
        <div className="rounded-2xl p-3 flex items-center gap-2.5" style={{ background: "var(--glass)" }}>
          <ScanLine size={19} color="var(--cap)" />
          <input ref={inputRef} value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleScan} placeholder="Scanner ou saisir le code-barre…" className="bg-transparent outline-none text-white placeholder-white/40 text-sm font-mono flex-1 min-w-0" />
          <button onClick={() => setScannerOpen(true)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--cap)" }} aria-label="Activer le scanner caméra">
            <Camera size={15} color="var(--glass)" />
          </button>
        </div>
      </div>

      {scannerOpen && <CameraScanner onDetect={handleCameraDetect} onClose={() => setScannerOpen(false)} />}

      <div className="px-4 mt-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--paper-dim)" }}>
          <Search size={15} className="opacity-50" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit" className="bg-transparent outline-none text-sm flex-1 min-w-0" />
          <button onClick={startVoiceSearch} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: listening ? "var(--danger)" : "var(--glass)" }} aria-label="Recherche vocale">
            <Mic size={13} color="#fff" className={listening ? "gb-pop" : ""} />
          </button>
        </div>
      </div>

      {quickPicks.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold opacity-50 mb-1.5 flex items-center gap-1 px-4"><Star size={11} color="var(--cap)" fill="var(--cap)" /> Favoris &amp; populaires</p>
          <div className="gb-marquee-wrap overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent)" }}>
            <div className="gb-marquee-track flex gap-2 w-max" style={{ animationDuration: `${Math.max(14, quickPicks.length * 4)}s` }}>
              {[...quickPicks, ...quickPicks].map((p, i) => (
                <button key={`${p.id}-${i}`} onClick={() => addToCart(p)} disabled={p.stock <= 0} className="gb-focus shrink-0 rounded-xl px-3 py-2 border flex items-center gap-2 disabled:opacity-40" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
                  <CategoryIcon cat={p.category} categories={categories} size={14} />
                  <span className="text-xs font-semibold whitespace-nowrap">{p.name}</span>
                  <span className="text-[10px] font-mono opacity-50">{fmt(p.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-3 flex gap-2 overflow-x-auto gb-scroll">
        {["all", ...categories.map((c) => c.id)].map((c) => (
          <button key={c} onClick={() => setCat(c)} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors" style={{ background: cat === c ? "var(--glass)" : "var(--paper-dim)", color: cat === c ? "#fff" : "var(--ink)" }}>
            {c !== "all" && <CategoryIcon cat={c} categories={categories} size={12} />}
            {c === "all" ? "Tout" : getCategory(categories, c).label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((p) => {
          const pct = Math.round((p.stock / Math.max(p.minStock * 2, 1)) * 100);
          const low = p.stock <= p.minStock;
          return (
            <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0} className="gb-focus text-left rounded-2xl p-3 border active:scale-[0.97] transition-transform disabled:opacity-40" style={{ background: "var(--card)", borderColor: "var(--line)" }}>
              <div className="flex items-start justify-between mb-2">
                <CapGauge pct={Math.min(pct, 100)} color={getCategory(categories, p.category).color} danger={low} size={40} />
                <CategoryIcon cat={p.category} categories={categories} size={16} />
              </div>
              <div className="text-sm font-semibold leading-tight">{p.name}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-mono text-xs font-semibold" style={{ color: "var(--glass)" }}>{fmt(p.price)}</span>
                <span className="text-[11px] font-mono opacity-50">{p.stock} {p.unit}s</span>
              </div>
              {p.bulkQty > 0 && p.bulkPrice > 0 && (
                <div className="text-[10px] font-mono mt-1 px-1.5 py-0.5 rounded-full inline-block" style={{ background: "var(--paper-dim)", color: "var(--glass)" }}>
                  Lot de {p.bulkQty} = {fmt(p.bulkPrice)}
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && <p className="col-span-2 text-center text-sm opacity-50 py-8">Aucun produit trouvé.</p>}
      </div>

      {count > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="gb-focus fixed left-4 right-4 z-30 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-xl gb-slide-up no-print" style={{ background: "var(--cap)", bottom: "84px" }}>
          <span className="flex items-center gap-2 font-semibold text-sm" style={{ color: "var(--glass)" }}><ShoppingCart size={17} /> {count} article{count > 1 ? "s" : ""}</span>
          <span className="font-mono font-bold text-sm" style={{ color: "var(--glass)" }}>{fmt(total)}</span>
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 z-40 flex items-end no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative w-full rounded-t-3xl p-5 gb-slide-up max-h-[85vh] flex flex-col" style={{ background: "var(--card)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">Panier</h2>
              <button onClick={() => setShowCart(false)} className="gb-focus p-1"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto gb-scroll -mx-1 px-1">
              {cartItems.map((i) => (
                <div key={i.id} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "var(--line)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={i.product.category} categories={categories} size={15} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.product.name}</div>
                    <div className="font-mono text-xs opacity-50">
                      {fmt(computeItemTotal(i.product, i.qty))}
                      {i.product.bulkQty > 0 && i.product.bulkPrice > 0 && i.qty >= i.product.bulkQty && (
                        <span style={{ color: "var(--cap)" }}> · lot appliqué</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => changeQty(i.id, -1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Minus size={13} /></button>
                    <span className="font-mono text-sm w-4 text-center">{i.qty}</span>
                    <button onClick={() => changeQty(i.id, 1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Plus size={13} /></button>
                  </div>
                </div>
              ))}
              {cartItems.length === 0 && <p className="text-center text-sm opacity-50 py-8">Panier vide.</p>}
            </div>

            {cartItems.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-semibold opacity-60 mb-2">Mode de paiement</p>
                <div className="flex gap-2 mb-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m.id} onClick={() => { setPayment(m.id); if (m.id !== "especes") setAmountReceived(""); }} className="gb-focus flex-1 rounded-xl py-2 text-[11px] font-semibold transition-colors" style={{ background: payment === m.id ? "var(--glass)" : "var(--paper-dim)", color: payment === m.id ? "#fff" : "var(--ink)" }}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {payment === "especes" && (
                  <div className="mb-3 gb-slide-up">
                    <p className="text-xs font-semibold opacity-60 mb-2">Montant reçu du client (optionnel)</p>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={`${fmt(total)}`}
                      className="gb-focus w-full rounded-xl px-3 py-2.5 text-sm border font-mono mb-2"
                      style={{ borderColor: "var(--line)" }}
                    />
                    {amountReceived !== "" && (
                      Number(amountReceived) >= total ? (
                        <div className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: "#E7F7EE" }}>
                          <span className="text-xs font-semibold" style={{ color: "#1CA857" }}>Monnaie à rendre</span>
                          <span className="font-mono font-bold text-sm" style={{ color: "#1CA857" }}>{fmt(Number(amountReceived) - total)}</span>
                        </div>
                      ) : (
                        <div className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: "#FCEBE8" }}>
                          <span className="text-xs font-semibold" style={{ color: "var(--danger)" }}>Montant insuffisant</span>
                          <span className="font-mono font-bold text-sm" style={{ color: "var(--danger)" }}>- {fmt(total - Number(amountReceived))}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
                <p className="text-xs font-semibold opacity-60 mb-2">Client {payment === "credit" ? "(requis pour le crédit)" : "(optionnel)"}</p>
                <ClientPicker clients={clients} value={clientId} onChange={(id, name) => { setClientId(id); setClientName(name); }} onCreateClient={onCreateClient} />
              </div>
            )}

            <div className="pt-2 mt-1 border-t" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between mb-3 mt-3">
                <span className="text-sm opacity-60">Total</span>
                <span className="font-display font-bold text-xl">{fmt(total)}</span>
              </div>
              <button onClick={confirmCheckout} disabled={cartItems.length === 0} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform" style={{ background: "var(--glass)", color: "#fff" }}>
                Encaisser {fmt(total)}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50 no-print" onClick={() => setReceipt(null)} />
          <div id="receipt-print-area" className="relative w-full max-w-xs bg-white rounded-t-2xl ticket-edge p-5 gb-pop" style={{ paddingBottom: 30 }}>
            <div className="text-center">
              <Receipt size={18} className="mx-auto mb-1.5" style={{ color: "var(--glass)" }} />
              <p className="font-display font-bold text-[12px] tracking-[0.18em] uppercase" style={{ color: "var(--glass)" }}>Reçu de vente</p>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono opacity-45 mt-3">
              <span>N° {receipt.id.slice(0, 6).toUpperCase()}</span>
              <span>{new Date(receipt.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1.5">
              <span className="opacity-50">Servi par</span>
              <span className="font-semibold">{receipt.vendor}</span>
            </div>

            <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

            <div className="flex flex-col gap-2.5">
              {receipt.items.map((i) => (
                <div key={i.id}>
                  <div className="flex justify-between gap-2 text-xs font-medium">
                    <span className="flex-1">{i.product.name}</span>
                    <span className="font-mono shrink-0">{fmt(computeItemTotal(i.product, i.qty))}</span>
                  </div>
                  <div className="text-[10px] font-mono opacity-45 mt-0.5">
                    {i.qty} × {fmt(i.product.price)}
                    {i.product.bulkQty > 0 && i.product.bulkPrice > 0 && i.qty >= i.product.bulkQty ? ` (lot de ${i.product.bulkQty} à ${fmt(i.product.bulkPrice)})` : ""}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-50">Total</span>
              <span className="font-display font-bold text-2xl" style={{ color: "var(--glass)" }}>{fmt(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono mt-2 opacity-60">
              <span>{PAYMENT_LABELS[receipt.paymentMethod]}</span>
              {receipt.paymentMethod === "credit" && <span>{receipt.clientName}</span>}
            </div>
            {receipt.amountReceived != null && (
              <>
                <div className="flex justify-between text-[11px] font-mono mt-1.5 opacity-60">
                  <span>Montant reçu</span>
                  <span>{fmt(receipt.amountReceived)}</span>
                </div>
                <div className="flex justify-between text-[12px] font-mono font-bold mt-1">
                  <span>Monnaie rendue</span>
                  <span>{fmt(receipt.changeDue)}</span>
                </div>
              </>
            )}

            <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

            <div className="text-center">
              <p className="font-display font-bold text-[15px]" style={{ color: "var(--glass)" }}>{shop.name}</p>
              <p className="text-[11px] italic opacity-55 mt-1.5 leading-snug">Merci pour votre confiance.<br />À très bientôt !</p>
            </div>

            <div className="flex gap-2 mt-5 no-print">
              <button onClick={() => setReceipt(null)} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
              <button onClick={() => window.print()} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: "var(--glass)" }}>
                <Printer size={14} /> Imprimer
              </button>
            </div>
            <div className="flex gap-2 mt-2 no-print">
              {typeof navigator !== "undefined" && navigator.share && (
                <button
                  onClick={() => {
                    const text = buildReceiptText(receipt, shop, fmt);
                    navigator.share({ title: `Reçu — ${shop.name}`, text }).catch(() => {});
                  }}
                  className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                  style={{ background: "var(--paper-dim)" }}
                >
                  <Download size={14} className="rotate-180" /> Partager
                </button>
              )}
              <button
                onClick={() => {
                  const knownPhone = clients.find((c) => c.id === receipt.clientId)?.phone;
                  const phone = knownPhone || window.prompt("Numéro WhatsApp du client (avec indicatif pays) :");
                  if (!phone) return;
                  const text = buildReceiptText(receipt, shop, fmt);
                  window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
                }}
                className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                style={{ background: "#25D366" }}
              >
                💬 WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Écran stock ---------- */

function StockScreen({ products, categories }) {
  const [cat, setCat] = useState("all");
  const sorted = [...products].filter((p) => cat === "all" || p.category === cat).sort((a, b) => a.stock / Math.max(a.minStock, 1) - b.stock / Math.max(b.minStock, 1));
  const lowCount = products.filter((p) => p.stock <= p.minStock).length;
  return (
    <div className="px-4 pt-4 pb-28">
      <h2 className="font-display font-bold text-lg mb-1">État du stock</h2>
      {lowCount > 0 && <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--danger)" }}><AlertTriangle size={13} /> {lowCount} produit{lowCount > 1 ? "s" : ""} en dessous du seuil</p>}
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-4 mt-2">
        {["all", ...categories.map((c) => c.id)].map((c) => (
          <button key={c} onClick={() => setCat(c)} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: cat === c ? "var(--glass)" : "var(--paper-dim)", color: cat === c ? "#fff" : "var(--ink)" }}>
            {c === "all" ? "Tout" : getCategory(categories, c).label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {sorted.map((p) => {
          const low = p.stock <= p.minStock;
          const pct = Math.round((p.stock / Math.max(p.minStock * 2, 1)) * 100);
          return (
            <div key={p.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ background: "var(--card)", borderColor: low ? "var(--danger)" : "var(--line)" }}>
              <CapGauge pct={Math.min(pct, 100)} color={getCategory(categories, p.category).color} danger={low} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-xs opacity-50 font-mono">{p.barcode}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-sm" style={{ color: low ? "var(--danger)" : "var(--ink)" }}>{p.stock}</div>
                <div className="text-[10px] opacity-50">{p.unit}s</div>
              </div>
              {low && <AlertTriangle size={16} color="var(--danger)" className="shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Écran historique ---------- */

function SalesPdfPreview({ shop, sales, vendorFilter, onClose }) {
  const fmt = useFmt();
  const total = sales.reduce((s, x) => s + x.total, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-6">
      <div className="absolute inset-0 bg-black/50 no-print" onClick={onClose} />
      <div id="sales-print-area" className="relative w-full max-w-[500px] bg-white rounded-2xl p-6 gb-pop">
        <div className="flex items-center justify-between mb-5 no-print">
          <h2 className="font-display font-bold text-lg">Aperçu avant impression</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>

        <div className="text-center mb-6">
          <p className="font-display font-bold text-xl">{shop.name}</p>
          <p className="text-xs opacity-60 mt-0.5">{vendorFilter ? `Ventes de ${vendorFilter}` : "Historique des ventes"}</p>
          <p className="text-[11px] opacity-40 mt-1">Généré le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>

        <div className="flex text-[11px] font-semibold uppercase tracking-wide opacity-50 border-b pb-2 mb-1" style={{ borderColor: "var(--ink)" }}>
          <span className="w-[76px] shrink-0">Date</span>
          <span className="flex-1 px-2">Détail</span>
          <span className="w-16 shrink-0 text-right">Total</span>
        </div>
        {sales.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucune vente sur cette sélection.</p>}
        {sales.map((s) => (
          <div key={s.id} className="flex text-[11px] py-2 border-b" style={{ borderColor: "var(--line)" }}>
            <span className="w-[76px] shrink-0 opacity-70">{new Date(s.date).toLocaleDateString("fr-FR")}<br />{new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="flex-1 px-2">
              {!vendorFilter && <span className="font-semibold">{s.vendor} — </span>}
              {s.items.map((i) => `${i.qty}× ${i.product.name}`).join(", ")}
              <span className="opacity-50"> ({PAYMENT_LABELS[s.paymentMethod]}{s.paymentMethod === "credit" && !s.paid ? ", impayé" : ""})</span>
            </span>
            <span className="w-16 shrink-0 text-right font-mono font-semibold">{fmt(s.total)}</span>
          </div>
        ))}
        <div className="flex justify-between items-baseline font-bold text-sm mt-3 pt-3 border-t-2" style={{ borderColor: "var(--ink)" }}>
          <span>TOTAL ({sales.length} vente{sales.length > 1 ? "s" : ""})</span>
          <span className="font-mono text-base">{fmt(total)}</span>
        </div>

        <div className="flex gap-2 mt-6 no-print">
          <button onClick={onClose} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
          <button onClick={() => window.print()} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: "var(--glass)" }}>
            <Printer size={14} /> Imprimer / Enregistrer PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen({ shop, sales, vendorFilter }) {
  const fmt = useFmt();
  const [open, setOpen] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const scoped = vendorFilter ? sales.filter((s) => s.vendor === vendorFilter) : sales;
  const sortedAll = [...scoped].sort((a, b) => new Date(b.date) - new Date(a.date));
  const sorted = sortedAll.filter((s) => {
    const d = new Date(s.date);
    if (periodFilter === "today") return d.toDateString() === new Date().toDateString();
    if (periodFilter === "7j") { const from = new Date(); from.setDate(from.getDate() - 7); return d >= from; }
    if (periodFilter === "30j") { const from = new Date(); from.setDate(from.getDate() - 30); return d >= from; }
    if (periodFilter === "custom") {
      if (customFrom && d < new Date(customFrom + "T00:00:00")) return false;
      if (customTo && d > new Date(customTo + "T23:59:59")) return false;
      return true;
    }
    return true;
  });
  const today = new Date().toDateString();
  const todaySales = scoped.filter((s) => new Date(s.date).toDateString() === today);
  const cashToday = todaySales.filter((s) => s.paymentMethod !== "credit").reduce((s, x) => s + x.total, 0);
  const creditGivenTodayUnpaid = todaySales.filter((s) => s.paymentMethod === "credit" && !s.paid).reduce((s, x) => s + x.total, 0);
  const creditCollectedToday = sales
    .filter((s) => s.paymentMethod === "credit" && s.paid && s.paidDate && new Date(s.paidDate).toDateString() === today && (vendorFilter ? s.paidBy === vendorFilter : true))
    .reduce((s, x) => s + x.total, 0);
  const revenueToday = cashToday + creditCollectedToday;
  return (
    <div className="px-4 pt-4 pb-28">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg">{vendorFilter ? "Mes ventes" : "Historique des ventes"}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => exportSalesCSV(sorted)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--paper-dim)" }}><Download size={13} /> CSV</button>
          <button onClick={() => setPdfPreview(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Printer size={13} /> PDF</button>
        </div>
      </div>

      {pdfPreview && <SalesPdfPreview shop={shop} sales={sorted} vendorFilter={vendorFilter} onClose={() => setPdfPreview(false)} />}

      <div className="flex gap-2 overflow-x-auto gb-scroll mb-3">
        {[{ id: "all", label: "Tout" }, { id: "today", label: "Aujourd'hui" }, { id: "7j", label: "7 jours" }, { id: "30j", label: "30 jours" }, { id: "custom", label: "Plage" }].map((p) => (
          <button key={p.id} onClick={() => setPeriodFilter(p.id)} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: periodFilter === p.id ? "var(--glass)" : "var(--paper-dim)", color: periodFilter === p.id ? "#fff" : "var(--ink)" }}>{p.label}</button>
        ))}
      </div>
      {periodFilter === "custom" && (
        <div className="flex items-center gap-2 mb-3 gb-slide-up">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
          <span className="text-xs opacity-50">à</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mb-2">
        <StatCard icon={TrendingUp} label="Recette aujourd'hui" value={fmt(revenueToday)} dark />
        <StatCard icon={Receipt} label="Ventes aujourd'hui" value={todaySales.length} />
      </div>
      {(creditCollectedToday > 0 || creditGivenTodayUnpaid > 0) && (
        <div className="flex flex-col gap-1 px-1 mb-4">
          {creditCollectedToday > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-50">Dont crédits encaissés aujourd'hui (inclus)</span>
              <span className="font-mono text-xs font-semibold">{fmt(creditCollectedToday)}</span>
            </div>
          )}
          {creditGivenTodayUnpaid > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-50">Nouveaux crédits accordés (non inclus)</span>
              <span className="font-mono text-xs font-semibold" style={{ color: "var(--danger)" }}>{fmt(creditGivenTodayUnpaid)}</span>
            </div>
          )}
        </div>
      )}

      {sorted.length === 0 && <p className="text-sm opacity-50 py-6 text-center">Aucune vente pour l'instant.</p>}
      <div className="flex flex-col gap-2.5">
        {sorted.map((s) => (
          <div key={s.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <button onClick={() => setOpen(open === s.id ? null : s.id)} className="gb-focus w-full flex items-center justify-between p-3.5">
              <div className="text-left">
                <div className="text-sm font-semibold">{new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · {new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                <div className="text-xs opacity-50 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span>{vendorFilter ? `${s.items.length} article${s.items.length > 1 ? "s" : ""}` : `${s.vendor} · ${s.items.length} article${s.items.length > 1 ? "s" : ""}`}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white" style={{ background: PAYMENT_COLORS[s.paymentMethod] }}>
                    {PAYMENT_LABELS[s.paymentMethod]}{s.paymentMethod === "credit" && !s.paid ? " · impayé" : ""}
                  </span>
                </div>
                {s.paymentMethod === "credit" && s.paid && s.paidBy && (
                  <div className="text-[10px] font-semibold mt-1" style={{ color: "var(--glass)" }}>✓ Crédit encaissé par {s.paidBy}{s.paidDate ? " · " + new Date(s.paidDate).toLocaleDateString("fr-FR") : ""}</div>
                )}
              </div>
              <span className="font-mono font-bold text-sm shrink-0 ml-2" style={{ color: "var(--glass)" }}>{fmt(s.total)}</span>
            </button>
            {open === s.id && (
              <div className="px-3.5 pb-3.5 pt-1 border-t gb-slide-up" style={{ borderColor: "var(--line)" }}>
                {s.items.map((i) => (
                  <div key={i.id} className="flex justify-between text-xs font-mono py-0.5 opacity-70"><span>{i.qty}× {i.product.name}</span><span>{fmt(computeItemTotal(i.product, i.qty))}</span></div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Écran crédits ---------- */

function CreditsScreen({ shop, sales, onSettle }) {
  const fmt = useFmt();
  const [confirmReceipt, setConfirmReceipt] = useState(null);
  const outstanding = [...sales].filter((s) => s.paymentMethod === "credit" && !s.paid).sort((a, b) => new Date(a.date) - new Date(b.date));
  const settled = [...sales].filter((s) => s.paymentMethod === "credit" && s.paid).sort((a, b) => new Date(b.paidDate || b.date) - new Date(a.paidDate || a.date));
  const totalOutstanding = outstanding.reduce((s, x) => s + x.total, 0);

  const handleSettle = (sale) => {
    const updated = onSettle(sale.id);
    setConfirmReceipt(updated);
  };

  return (
    <div className="px-4 pt-4 pb-28">
      <h2 className="font-display font-bold text-lg mb-1">Crédits clients</h2>
      <p className="text-xs opacity-50 mb-4">{outstanding.length} en cours · {fmt(totalOutstanding)}</p>

      {outstanding.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun crédit en cours.</p>}
      <div className="flex flex-col gap-2.5 mb-6">
        {outstanding.map((s) => (
          <div key={s.id} className="rounded-2xl p-3.5 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{s.clientName || "Client"}</div>
                <div className="text-xs opacity-50">{new Date(s.date).toLocaleDateString("fr-FR")} · vendu par {s.vendor}</div>
              </div>
              <span className="font-mono font-bold text-sm shrink-0 ml-2" style={{ color: "var(--danger)" }}>{fmt(s.total)}</span>
            </div>
            <button onClick={() => handleSettle(s)} className="gb-focus w-full rounded-xl py-2 text-xs font-semibold text-white" style={{ background: "var(--glass)" }}>Encaisser ce crédit</button>
          </div>
        ))}
      </div>

      {settled.length > 0 && (
        <>
          <h3 className="font-display font-bold text-base mb-2">Récemment encaissés</h3>
          <div className="flex flex-col gap-2">
            {settled.slice(0, 10).map((s) => (
              <div key={s.id} className="rounded-xl p-3 border flex items-center justify-between" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.clientName || "Client"}</div>
                  <div className="text-[11px] opacity-50">Encaissé par {s.paidBy}{s.paidDate ? " · " + new Date(s.paidDate).toLocaleDateString("fr-FR") : ""}</div>
                </div>
                <span className="font-mono text-sm font-semibold opacity-60 shrink-0 ml-2">{fmt(s.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {confirmReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50 no-print" onClick={() => setConfirmReceipt(null)} />
          <div id="receipt-print-area" className="relative w-full max-w-xs bg-white rounded-t-2xl ticket-edge p-5 gb-pop" style={{ paddingBottom:
