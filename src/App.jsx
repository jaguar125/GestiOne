import { useState, useEffect, useRef, useContext, createContext } from "react";
import {
  ScanLine, ShoppingCart, Boxes, History, ShieldCheck, Plus, Minus,
  Trash2, X, Check, AlertTriangle, LogOut, Search, TrendingUp,
  PackagePlus, Pencil, Beer, CupSoda, Droplets, Citrus, Receipt,
  Wallet, CreditCard, Truck, Users, Download, Printer, Store, ChevronDown,
  Wine, Martini, Coffee, Milk, GlassWater, Bell,
  ClipboardList, ArrowUpCircle, ArrowDownCircle, Layers, ClipboardCheck, Camera, Sun, Moon, Mic, Star, Volume2, UserPlus, Gift, MessageCircle, Lock, Unlock,
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
      @keyframes gb-slide-in-left{ 0%{transform:translateX(-100%);} 100%{transform:translateX(0);} }
      .gb-slide-in-left{ animation: gb-slide-in-left .22s ease-out; }
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
    if (v && v.blocked) { pushToast("Accès bloqué. Contacte le propriétaire de la boutique.", "error"); return false; }
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
        <div className="fixed left-4 right-4 z-30 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-xl gb-slide-up no-print" style={{ background: "var(--cap)", bottom: "84px" }}>
          <button onClick={() => setShowCart(true)} className="gb-focus flex items-center gap-2 font-semibold text-sm flex-1 min-w-0" style={{ color: "var(--glass)" }}>
            <ShoppingCart size={17} className="shrink-0" /> {count} article{count > 1 ? "s" : ""}
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowCart(true)} className="gb-focus font-mono font-bold text-sm" style={{ color: "var(--glass)" }}>{fmt(total)}</button>
            <button
              onClick={(e) => { e.stopPropagation(); setCart([]); pushToast("Panier vidé", "ok"); }}
              className="gb-focus w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.14)" }}
              aria-label="Vider le panier"
            >
              <Trash2 size={15} color="var(--glass)" />
            </button>
          </div>
        </div>
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

function HistoryScreen({ shop, sales, products, vendorFilter, isAdmin, onDeleteSale, onUpdateSale, pushToast }) {
  const fmt = useFmt();
  const [open, setOpen] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [editingSale, setEditingSale] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
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
                <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                  <span>{new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · {new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-[10px] font-mono font-normal opacity-40">N° {s.id.slice(0, 6).toUpperCase()}</span>
                </div>
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
                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
                    <button onClick={() => setEditingSale(s)} className="gb-focus flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl" style={{ background: "var(--paper-dim)" }}><Pencil size={13} /> Modifier</button>
                    <button onClick={() => setConfirmDelete(s)} className="gb-focus flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl" style={{ background: "var(--paper-dim)", color: "var(--danger)" }}><Trash2 size={13} /> Supprimer</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          products={products}
          onSave={(id, items, method) => { onUpdateSale(id, items, method); setEditingSale(null); }}
          onClose={() => setEditingSale(null)}
          pushToast={pushToast}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center no-print" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 gb-slide-up" style={{ background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><AlertTriangle size={20} color="var(--danger)" /></div>
            <p className="font-display font-bold text-base text-center mb-1">Supprimer cette vente ?</p>
            <p className="text-xs opacity-60 text-center mb-5">Le stock vendu sera restitué automatiquement. Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="gb-focus flex-1 rounded-2xl py-3 font-semibold text-sm" style={{ background: "var(--paper-dim)" }}>Annuler</button>
              <button onClick={() => { onDeleteSale(confirmDelete.id); setConfirmDelete(null); }} className="gb-focus flex-1 rounded-2xl py-3 font-semibold text-sm text-white" style={{ background: "var(--danger)" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditSaleModal({ sale, products, onSave, onClose, pushToast }) {
  const fmt = useFmt();
  const [items, setItems] = useState(sale.items.map((i) => ({ ...i })));
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
  const total = items.reduce((s, i) => s + computeItemTotal(i.product, i.qty), 0);

  const maxQty = (item) => {
    const live = products.find((p) => p.id === item.id);
    const originalQty = sale.items.find((i) => i.id === item.id)?.qty || 0;
    return (live ? live.stock : 0) + originalQty;
  };

  const updateQty = (id, delta) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const next = i.qty + delta;
      if (delta > 0 && next > maxQty(i)) { pushToast("Stock insuffisant pour augmenter cette ligne", "error"); return i; }
      return { ...i, qty: next };
    }).filter((i) => i.qty > 0));
  };

  const removeLine = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const save = () => {
    if (items.length === 0) { pushToast("La vente doit contenir au moins un article", "error"); return; }
    onSave(sale.id, items, paymentMethod);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center no-print" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-[430px] rounded-t-3xl p-5 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base">Modifier la vente</h3>
          <button onClick={onClose} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><X size={16} /></button>
        </div>

        <div className="flex flex-col gap-1 mb-4">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 py-2.5 border-b" style={{ borderColor: "var(--line)" }}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{i.product.name}</p>
                <p className="text-xs opacity-50 font-mono">{fmt(computeItemTotal(i.product, i.qty))}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => updateQty(i.id, -1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Minus size={13} /></button>
                <span className="w-6 text-center text-sm font-mono">{i.qty}</span>
                <button onClick={() => updateQty(i.id, 1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Plus size={13} /></button>
                <button onClick={() => removeLine(i.id)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center ml-1" style={{ background: "var(--paper-dim)", color: "var(--danger)" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs opacity-50 text-center py-4">Tous les articles ont été retirés.</p>}
        </div>

        <p className="text-xs font-semibold opacity-60 mb-2">Mode de paiement</p>
        <div className="flex gap-2 mb-5">
          {PAYMENT_METHODS.map((m) => (
            <button key={m.id} onClick={() => setPaymentMethod(m.id)} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: paymentMethod === m.id ? "var(--glass)" : "var(--paper-dim)", color: paymentMethod === m.id ? "#fff" : "var(--ink)" }}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-sm opacity-60">Nouveau total</span>
          <span className="font-mono font-bold text-lg" style={{ color: "var(--glass)" }}>{fmt(total)}</span>
        </div>

        <button onClick={save} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm text-white flex items-center justify-center gap-2" style={{ background: "var(--glass)" }}>
          <Check size={16} /> Enregistrer les modifications
        </button>
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
          <div id="receipt-print-area" className="relative w-full max-w-xs bg-white rounded-t-2xl ticket-edge p-5 gb-pop" style={{ paddingBottom: 30 }}>
            <div className="text-center">
              <Check size={18} className="mx-auto mb-1.5" style={{ color: "var(--glass)" }} />
              <p className="font-display font-bold text-[12px] tracking-[0.18em] uppercase" style={{ color: "var(--glass)" }}>Crédit encaissé</p>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono opacity-45 mt-3">
              <span>N° {confirmReceipt.id.slice(0, 6).toUpperCase()}</span>
              <span>{new Date(confirmReceipt.paidDate).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>

            <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

            <div className="flex justify-between text-xs mb-1.5"><span className="opacity-50">Client</span><span className="font-semibold">{confirmReceipt.clientName || "Client"}</span></div>
            <div className="flex justify-between text-xs mb-1.5"><span className="opacity-50">Vente initiale</span><span>{new Date(confirmReceipt.date).toLocaleDateString("fr-FR")}</span></div>
            <div className="flex justify-between text-xs"><span className="opacity-50">Encaissé par</span><span className="font-semibold">{confirmReceipt.paidBy}</span></div>

            <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-50">Montant encaissé</span>
              <span className="font-display font-bold text-2xl" style={{ color: "var(--glass)" }}>{fmt(confirmReceipt.total)}</span>
            </div>

            <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

            <div className="text-center">
              <p className="font-display font-bold text-[15px]" style={{ color: "var(--glass)" }}>{shop.name}</p>
              <p className="text-[11px] italic opacity-55 mt-1.5 leading-snug">Merci pour votre confiance.<br />À très bientôt !</p>
            </div>

            <div className="flex gap-2 mt-5 no-print">
              <button onClick={() => setConfirmReceipt(null)} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
              <button onClick={() => window.print()} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: "var(--glass)" }}>
                <Printer size={14} /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Formulaires admin ---------- */

function ProductForm({ initial, categories, products, onSave, onCancel, pushToast }) {
  const symbol = useCurrencySymbol();
  const [f, setF] = useState(initial || { name: "", barcode: "", category: categories[0]?.id || "", costPrice: "", price: "", stock: "", minStock: "", unit: "bouteille", bulkQty: "", bulkPrice: "", favorite: false });
  const [bulkEnabled, setBulkEnabled] = useState(!!(initial && initial.bulkQty > 0));
  const [scannerOpen, setScannerOpen] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const margin = Number(f.price) - Number(f.costPrice);
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      {scannerOpen && (
        <CameraScanner
          onDetect={(code) => { set("barcode", code); setScannerOpen(false); pushToast?.("Code-barre scanné", "ok"); }}
          onClose={() => setScannerOpen(false)}
        />
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <input className="gb-focus col-span-2 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom du produit" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <div className="col-span-2 flex items-center gap-2">
          <input className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border font-mono min-w-0" style={{ borderColor: "var(--line)" }} placeholder="Code-barre" value={f.barcode} onChange={(e) => set("barcode", e.target.value)} />
          <button onClick={() => setScannerOpen(true)} className="gb-focus w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--glass)" }} aria-label="Scanner le code-barre">
            <Camera size={15} color="var(--cap)" />
          </button>
        </div>
        <select className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} value={f.category} onChange={(e) => set("category", e.target.value)}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Unité" value={f.unit} onChange={(e) => set("unit", e.target.value)} />
        <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder={`Prix d'achat (${symbol})`} value={f.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
        <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder={`Prix de vente (${symbol})`} value={f.price} onChange={(e) => set("price", e.target.value)} />
        <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Stock" value={f.stock} onChange={(e) => set("stock", e.target.value)} />
        <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Seuil d'alerte" value={f.minStock} onChange={(e) => set("minStock", e.target.value)} />
      </div>
      {f.costPrice !== "" && f.price !== "" && !isNaN(margin) && (
        <p className="text-xs mt-2 px-1" style={{ color: margin >= 0 ? "#1CA857" : "var(--danger)" }}>
          Bénéfice unitaire : {margin >= 0 ? "+" : ""}{margin} {symbol} / {f.unit || "unité"}
        </p>
      )}

      <button
        onClick={() => set("favorite", !f.favorite)}
        className="gb-focus w-full flex items-center justify-between mt-3 px-3 py-2.5 rounded-xl"
        style={{ background: f.favorite ? "var(--paper-dim)" : "transparent", border: `1px solid ${f.favorite ? "var(--cap)" : "var(--line)"}` }}
      >
        <span className="text-xs font-semibold flex items-center gap-1.5"><Star size={13} color={f.favorite ? "var(--cap)" : "var(--ink)"} fill={f.favorite ? "var(--cap)" : "none"} /> Produit favori (accès rapide à la vente)</span>
        <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.favorite ? "var(--glass)" : "var(--line)" }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.favorite ? 18 : 2 }} />
        </span>
      </button>

      <button
        onClick={() => setBulkEnabled((v) => !v)}
        className="gb-focus w-full flex items-center justify-between mt-3 px-3 py-2.5 rounded-xl"
        style={{ background: bulkEnabled ? "var(--paper-dim)" : "transparent", border: `1px solid ${bulkEnabled ? "var(--glass)" : "var(--line)"}` }}
      >
        <span className="text-xs font-semibold">Prix spécial par quantité (ex : lot, pack)</span>
        <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: bulkEnabled ? "var(--glass)" : "var(--line)" }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: bulkEnabled ? 18 : 2 }} />
        </span>
      </button>

      {bulkEnabled && (
        <div className="grid grid-cols-2 gap-2.5 mt-2.5 gb-slide-up">
          <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Quantité (ex : 6)" value={f.bulkQty} onChange={(e) => set("bulkQty", e.target.value)} />
          <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder={`Prix du lot (${symbol})`} value={f.bulkPrice} onChange={(e) => set("bulkPrice", e.target.value)} />
          {f.bulkQty > 0 && f.bulkPrice > 0 && (
            <p className="col-span-2 text-xs opacity-50">Ex : {f.bulkQty} {f.unit}s achetés = {f.bulkPrice} {symbol} au lieu de {Number(f.bulkQty) * (Number(f.price) || 0)} {symbol}</p>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => {
          if (!f.name || !f.barcode || !f.price) { pushToast("Nom, code-barre et prix de vente requis", "error"); return; }
          const duplicate = products.some((p) => p.barcode === f.barcode.trim() && p.id !== f.id);
          if (duplicate) { pushToast("Ce code-barre est déjà utilisé par un autre produit", "error"); return; }
          onSave({
            ...f,
            id: f.id || uid(),
            barcode: f.barcode.trim(),
            price: Number(f.price) || 0,
            costPrice: Number(f.costPrice) || 0,
            stock: Number(f.stock) || 0,
            minStock: Number(f.minStock) || 5,
            bulkQty: bulkEnabled ? Number(f.bulkQty) || 0 : 0,
            bulkPrice: bulkEnabled ? Number(f.bulkPrice) || 0 : 0,
            favorite: !!f.favorite,
          });
        }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function SupplierForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { name: "", phone: "", note: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom du fournisseur" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Téléphone" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Note (produits fournis…)" value={f.note} onChange={(e) => set("note", e.target.value)} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => { if (!f.name) return; onSave({ ...f, id: f.id || uid() }); }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function ExpenseForm({ onSave, onCancel, suppliers }) {
  const symbol = useCurrencySymbol();
  const [f, setF] = useState({ label: "", amount: "", date: new Date().toISOString().slice(0, 10), supplierId: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Libellé (transport, glace…)" value={f.label} onChange={(e) => set("label", e.target.value)} />
        <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder={`Montant (${symbol})`} value={f.amount} onChange={(e) => set("amount", e.target.value)} />
        <input type="date" className="gb-focus w-full rounded-xl px-3 py-3 text-sm border" style={{ borderColor: "var(--line)", minWidth: 0 }} value={f.date} onChange={(e) => set("date", e.target.value)} />
        {suppliers.length > 0 && (
          <select className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} value={f.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">Fournisseur (optionnel)</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => { if (!f.label || !f.amount) return; onSave({ id: uid(), label: f.label, amount: Number(f.amount), date: f.date, supplierId: f.supplierId || null }); }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function VendorForm({ initial, onSave, onCancel, pushToast, vendors, adminPin, adminPinHash, backendLinked }) {
  const [f, setF] = useState(initial ? { ...initial, pin: initial.pin || "" } : { name: "", pin: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isEdit = !!initial;
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom du vendeur" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border font-mono" style={{ borderColor: "var(--line)" }} placeholder={backendLinked && isEdit ? "Nouveau PIN (laisser vide = inchangé)" : "Code PIN (4 chiffres)"} maxLength={4} value={f.pin} onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => {
          if (!f.name) { pushToast("Nom requis", "error"); return; }
          const pinProvided = f.pin.length === 4;
          const keepExistingPin = backendLinked && isEdit && f.pin.length === 0;
          if (!pinProvided && !keepExistingPin) { pushToast("PIN à 4 chiffres requis", "error"); return; }
          if (pinProvided) {
            const duplicate = backendLinked
              ? api.verifyPin(f.pin, adminPinHash) || vendors.some((v) => v.id !== f.id && api.verifyPin(f.pin, v.pinHash))
              : f.pin === (adminPin || DEFAULT_ADMIN_PIN) || vendors.some((v) => v.pin === f.pin && v.id !== f.id);
            if (duplicate) { pushToast("Ce code PIN est déjà utilisé", "error"); return; }
          }
          const record = { id: f.id || uid(), name: f.name, phone: f.phone };
          if (backendLinked) {
            record.pinHash = pinProvided ? api.hashPin(f.pin) : initial?.pinHash;
            record.pin = pinProvided ? f.pin : initial?.pin;
            record.joinCode = initial?.joinCode || generateShopJoinCode();
          } else {
            record.pin = f.pin;
          }
          onSave(record);
        }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function CategoryForm({ initial, onSave, onCancel, pushToast, categories }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [icon, setIcon] = useState(initial?.icon || "beer");
  const [color, setColor] = useState(initial?.color || COLOR_OPTIONS[0]);
  const submit = () => {
    if (!label.trim()) { pushToast("Nom de catégorie requis", "error"); return; }
    const id = initial?.id || label.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || uid();
    if (!initial && categories.some((c) => c.id === id)) { pushToast("Cette catégorie existe déjà", "error"); return; }
    onSave({ id, label: label.trim(), icon, color });
  };
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-3" style={{ borderColor: "var(--line)" }} placeholder="Nom de la catégorie (ex : Cocktail)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <p className="text-xs font-semibold opacity-60 mb-2">Icône</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {ICON_OPTIONS.map((o) => (
          <button key={o.id} onClick={() => setIcon(o.id)} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: icon === o.id ? color : "var(--paper-dim)", border: icon === o.id ? `2px solid ${color}` : "1px solid var(--line)" }}>
            <o.Icon size={17} color={icon === o.id ? "#fff" : "var(--ink)"} />
          </button>
        ))}
      </div>
      <p className="text-xs font-semibold opacity-60 mb-2">Couleur</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {COLOR_OPTIONS.map((c) => (
          <button key={c} onClick={() => setColor(c)} className="gb-focus w-8 h-8 rounded-full" style={{ background: c, border: color === c ? "2px solid var(--ink)" : "2px solid transparent" }} />
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={submit} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function CategoriesSection({ categories, saveCategories, products, pushToast }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const upsert = (c) => {
    const exists = categories.some((x) => x.id === c.id);
    saveCategories(exists ? categories.map((x) => (x.id === c.id ? c : x)) : [...categories, c]);
    setEditing(null); setAdding(false);
  };
  const del = (id) => {
    if (products.some((p) => p.category === id)) { pushToast("Catégorie utilisée par des produits — réassignez-les d'abord", "error"); return; }
    if (categories.length <= 1) { pushToast("Vous devez garder au moins une catégorie", "error"); return; }
    saveCategories(categories.filter((x) => x.id !== id));
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Catégories ({categories.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Ajouter</button>
      </div>
      {adding && <CategoryForm categories={categories} onSave={upsert} onCancel={() => setAdding(false)} pushToast={pushToast} />}
      <div className="flex flex-col gap-2.5">
        {categories.map((c) => editing === c.id ? (
          <CategoryForm key={c.id} initial={c} categories={categories} onSave={upsert} onCancel={() => setEditing(null)} pushToast={pushToast} />
        ) : (
          <div key={c.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={c.id} categories={categories} size={16} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{c.label}</div>
              <div className="text-xs opacity-50">{products.filter((p) => p.category === c.id).length} produit{products.filter((p) => p.category === c.id).length > 1 ? "s" : ""}</div>
            </div>
            <button onClick={() => { setEditing(c.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /></button>
            <button onClick={() => del(c.id)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopForm({ onSave, onCancel, pushToast }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("maquis");
  const [currency, setCurrency] = useState("XAF");
  const [vendorName, setVendorName] = useState("");
  const [vendorPin, setVendorPin] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!name.trim()) { pushToast("Nom de la boutique requis", "error"); return; }
    if (!vendorName.trim() || vendorPin.length !== 4) { pushToast("Nom et PIN du vendeur (4 chiffres) requis", "error"); return; }
    setLoading(true);
    try {
      await onSave(
        { id: uid(), name: name.trim(), type, currency, salesNotificationsEnabled: true, theme: "emeraude", darkMode: false, soundsEnabled: true, joinCode: generateShopJoinCode(), adminPin: DEFAULT_ADMIN_PIN },
        { id: uid(), name: vendorName.trim(), pin: vendorPin }
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <p className="text-xs font-semibold opacity-60 mb-2">Nouvelle boutique</p>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom de la boutique" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {ESTABLISHMENT_TYPES.map((t) => (
            <button key={t.id} onClick={() => setType(t.id)} className="gb-focus px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: type === t.id ? "var(--glass)" : "var(--paper-dim)", color: type === t.id ? "#fff" : "var(--ink)" }}>{t.label}</button>
          ))}
        </div>
        <select className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <div className="border-t pt-2.5 mt-1" style={{ borderColor: "var(--line)" }}>
          <p className="text-xs font-semibold opacity-60 mb-2">Premier vendeur de cette boutique</p>
          <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-2.5" style={{ borderColor: "var(--line)" }} placeholder="Nom du vendeur" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono" style={{ borderColor: "var(--line)" }} placeholder="Code PIN (4 chiffres)" maxLength={4} value={vendorPin} onChange={(e) => setVendorPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} disabled={loading} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)", opacity: loading ? 0.5 : 1 }}>Annuler</button>
        <button onClick={submit} disabled={loading} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)", opacity: loading ? 0.6 : 1 }}>{loading ? "Création…" : "Créer la boutique"}</button>
      </div>
    </div>
  );
}

/* ---------- Sections admin ---------- */

function EstablishmentSection({ shop, saveShopMeta, pushToast }) {
  const [f, setF] = useState({ salesNotificationsEnabled: true, theme: "emeraude", darkMode: false, soundsEnabled: true, ...shop });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const copyJoinCode = async () => {
    try { await navigator.clipboard.writeText(shop.joinCode); pushToast?.("Code copié !", "ok"); } catch { /* presse-papier indisponible */ }
  };
  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Informations de la boutique</h3>
      {shop.backendLinked && shop.joinCode && (
        <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ background: "var(--glass)" }}>
          <div>
            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-1">
              <UserPlus size={12} /> Code d'invitation vendeurs
            </p>
            <p className="font-display font-bold text-2xl text-white tracking-[0.15em]">{shop.joinCode}</p>
          </div>
          <button onClick={copyJoinCode} className="gb-focus px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0" style={{ background: "var(--cap)", color: "var(--glass)" }}>
            <Download size={13} className="rotate-180" /> Copier
          </button>
        </div>
      )}
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <label className="text-xs font-semibold opacity-60 block mb-1.5">Nom</label>
        <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-3" style={{ borderColor: "var(--line)" }} value={f.name} onChange={(e) => set("name", e.target.value)} />
        <label className="text-xs font-semibold opacity-60 block mb-1.5">Type</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {ESTABLISHMENT_TYPES.map((t) => (
            <button key={t.id} onClick={() => set("type", t.id)} className="gb-focus px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: f.type === t.id ? "var(--glass)" : "var(--paper-dim)", color: f.type === t.id ? "#fff" : "var(--ink)" }}>{t.label}</button>
          ))}
        </div>
        <label className="text-xs font-semibold opacity-60 block mb-1.5">Devise</label>
        <div className="flex flex-col gap-2 mb-4">
          {CURRENCIES.map((c) => (
            <button key={c.code} onClick={() => set("currency", c.code)} className="gb-focus w-full rounded-xl px-3 py-2.5 flex items-center justify-between text-left border" style={{ borderColor: f.currency === c.code ? "var(--glass)" : "var(--line)", background: f.currency === c.code ? "var(--paper-dim)" : "var(--card)" }}>
              <span className="text-sm font-medium">{c.label}</span>
              {f.currency === c.code && <Check size={15} color="var(--glass)" />}
            </button>
          ))}
        </div>

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Couleur de l'application</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {THEME_PRESETS.map((t) => (
            <button key={t.id} onClick={() => set("theme", t.id)} className="gb-focus rounded-xl p-2.5 flex flex-col items-center gap-1.5 border" style={{ borderColor: (f.theme || "emeraude") === t.id ? t.glass : "var(--line)", background: (f.theme || "emeraude") === t.id ? "var(--paper-dim)" : "transparent" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: t.glass }}>
                {(f.theme || "emeraude") === t.id && <Check size={13} color={t.cap} />}
              </span>
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Apparence</label>
        <button
          onClick={() => set("darkMode", !f.darkMode)}
          className="gb-focus w-full flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl"
          style={{ background: f.darkMode ? "var(--paper-dim)" : "transparent", border: `1px solid ${f.darkMode ? "var(--glass)" : "var(--line)"}` }}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5">{f.darkMode ? <Moon size={13} /> : <Sun size={13} />} Mode {f.darkMode ? "nuit" : "jour"}</span>
          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.darkMode ? "var(--glass)" : "var(--line)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.darkMode ? 18 : 2 }} />
          </span>
        </button>

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Notifications</label>
        <button
          onClick={() => set("soundsEnabled", !f.soundsEnabled)}
          className="gb-focus w-full flex items-center justify-between mb-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: f.soundsEnabled ? "var(--paper-dim)" : "transparent", border: `1px solid ${f.soundsEnabled ? "var(--glass)" : "var(--line)"}` }}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5"><Volume2 size={13} /> Sons de confirmation (scan, vente)</span>
          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.soundsEnabled ? "var(--glass)" : "var(--line)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.soundsEnabled ? 18 : 2 }} />
          </span>
        </button>
        <button
          onClick={() => set("salesNotificationsEnabled", !f.salesNotificationsEnabled)}
          className="gb-focus w-full flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl"
          style={{ background: f.salesNotificationsEnabled ? "var(--paper-dim)" : "transparent", border: `1px solid ${f.salesNotificationsEnabled ? "var(--glass)" : "var(--line)"}` }}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5"><Bell size={13} /> Notifications de vente pour l'administrateur</span>
          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.salesNotificationsEnabled ? "var(--glass)" : "var(--line)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.salesNotificationsEnabled ? 18 : 2 }} />
          </span>
        </button>
        <label className="text-xs font-semibold opacity-60 block mb-1.5 flex items-center gap-1.5"><Gift size={13} /> Fidélité (achats avant récompense)</label>
        <input type="number" min="1" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-4" style={{ borderColor: "var(--line)" }} value={f.loyaltyThreshold ?? 10} onChange={(e) => set("loyaltyThreshold", Number(e.target.value) || 10)} />

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Langue de l'application</label>
        <div className="flex gap-2 mb-4">
          <button onClick={() => set("language", "fr")} className="gb-focus flex-1 rounded-xl py-2 text-sm font-semibold" style={{ background: (f.language || "fr") === "fr" ? "var(--glass)" : "var(--paper-dim)", color: (f.language || "fr") === "fr" ? "#fff" : "var(--ink)" }}>Français</button>
          <button onClick={() => set("language", "en")} className="gb-focus flex-1 rounded-xl py-2 text-sm font-semibold" style={{ background: f.language === "en" ? "var(--glass)" : "var(--paper-dim)", color: f.language === "en" ? "#fff" : "var(--ink)" }}>English</button>
        </div>
        <p className="text-[10px] opacity-40 mb-4">La traduction couvre pour l'instant la navigation principale — le reste de l'application arrivera en anglais complet avec l'app native.</p>

        <button onClick={() => saveShopMeta(f)} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function BoutiquesSection({ shops, activeShopId, onSwitchShop, onCreateShop, onDeleteShop, pushToast }) {
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const askDelete = (id) => {
    if (shops.length <= 1) { pushToast("Vous devez garder au moins une boutique", "error"); return; }
    setConfirmId(id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Boutiques ({shops.length})</h3>
        <button onClick={() => setAdding(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Nouvelle</button>
      </div>
      {adding && <ShopForm onSave={async (shop, vendor) => { const ok = await onCreateShop(shop, vendor); if (ok) setAdding(false); }} onCancel={() => setAdding(false)} pushToast={pushToast} />}
      <div className="flex flex-col gap-2.5">
        {shops.map((s) => {
          const isActive = s.id === activeShopId;
          const typeLabel = ESTABLISHMENT_TYPES.find((t) => t.id === s.type)?.label || "";
          const currencyLabel = (CURRENCIES.find((c) => c.code === s.currency) || CURRENCIES[0]).symbol;
          return (
            <div key={s.id} className="rounded-2xl p-3.5 border" style={{ borderColor: isActive ? "var(--glass)" : "var(--line)", background: "var(--card)" }}>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Store size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                    {s.name}
                    {isActive && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: "var(--glass)" }}>ACTIVE</span>}
                  </div>
                  <div className="text-xs opacity-50">{typeLabel} · {currencyLabel}</div>
                </div>
              </div>
              {s.joinCode && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2 mb-2.5" style={{ background: "var(--paper-dim)" }}>
                  <span className="text-[11px] opacity-60">Code d'invitation vendeurs</span>
                  <span className="font-mono font-bold text-sm tracking-wider">{s.joinCode}</span>
                </div>
              )}
              {confirmId === s.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs flex-1" style={{ color: "var(--danger)" }}>Supprimer définitivement cette boutique et ses données ?</span>
                  <button onClick={() => { onDeleteShop(s.id); setConfirmId(null); }} className="gb-focus px-3 py-1.5 rounded-full text-[11px] font-semibold text-white shrink-0" style={{ background: "var(--danger)" }}>Confirmer</button>
                  <button onClick={() => setConfirmId(null)} className="gb-focus px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0" style={{ background: "var(--paper-dim)" }}>Annuler</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {!isActive && <button onClick={() => onSwitchShop(s.id)} className="gb-focus flex-1 rounded-full py-1.5 text-[11px] font-semibold text-white" style={{ background: "var(--glass)" }}>Passer à cette boutique</button>}
                  <button onClick={() => askDelete(s.id)} className="gb-focus flex items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-semibold" style={{ background: "var(--paper-dim)", flex: isActive ? 1 : "0 0 auto", paddingLeft: isActive ? 0 : 12, paddingRight: isActive ? 0 : 12 }}>
                    <Trash2 size={12} color="var(--danger)" /> <span style={{ color: "var(--danger)" }}>Supprimer</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyReportPreview({ shop, sales, expenses, onClose }) {
  const fmt = useFmt();
  const today = new Date().toDateString();
  const todaySales = sales.filter((s) => new Date(s.date).toDateString() === today);
  const todayExpenses = expenses.filter((e) => new Date(e.date).toDateString() === today);
  const cash = todaySales.filter((s) => s.paymentMethod === "especes").reduce((s, x) => s + x.total, 0);
  const mobile = todaySales.filter((s) => s.paymentMethod === "mobile").reduce((s, x) => s + x.total, 0);
  const creditGiven = todaySales.filter((s) => s.paymentMethod === "credit").reduce((s, x) => s + x.total, 0);
  const creditCollected = sales.filter((s) => s.paidDate && new Date(s.paidDate).toDateString() === today).reduce((s, x) => s + x.total, 0);
  const totalExpenses = todayExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netCash = cash + mobile + creditCollected - totalExpenses;
  const topProducts = buildTopProducts(todaySales, 5);
  const byVendor = {};
  todaySales.forEach((s) => { byVendor[s.vendor] = (byVendor[s.vendor] || 0) + s.total; });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-6">
      <div className="absolute inset-0 bg-black/50 no-print" onClick={onClose} />
      <div id="daily-report-print-area" className="relative w-full max-w-[500px] bg-white rounded-2xl p-6 gb-pop">
        <div className="flex items-center justify-between mb-5 no-print">
          <h2 className="font-display font-bold text-lg">Rapport de fin de journée</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>

        <div className="text-center mb-6">
          <p className="font-display font-bold text-xl">{shop.name}</p>
          <p className="text-xs opacity-60 mt-0.5">Rapport du {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl p-3" style={{ background: "#F4F6F1" }}><p className="text-[10px] opacity-50">Espèces</p><p className="font-mono font-bold">{fmt(cash)}</p></div>
          <div className="rounded-xl p-3" style={{ background: "#F4F6F1" }}><p className="text-[10px] opacity-50">Mobile Money</p><p className="font-mono font-bold">{fmt(mobile)}</p></div>
          <div className="rounded-xl p-3" style={{ background: "#F4F6F1" }}><p className="text-[10px] opacity-50">Crédits accordés</p><p className="font-mono font-bold">{fmt(creditGiven)}</p></div>
          <div className="rounded-xl p-3" style={{ background: "#F4F6F1" }}><p className="text-[10px] opacity-50">Crédits encaissés</p><p className="font-mono font-bold">{fmt(creditCollected)}</p></div>
        </div>

        <div className="flex justify-between text-xs py-1.5 border-t" style={{ borderColor: "#D8DFD4" }}><span className="opacity-60">Dépenses du jour</span><span className="font-mono">- {fmt(totalExpenses)}</span></div>
        <div className="flex justify-between items-baseline font-bold text-sm mt-2 pt-2 border-t-2" style={{ borderColor: "#0F1B16" }}>
          <span>CAISSE NETTE ESTIMÉE</span><span className="font-mono text-base">{fmt(netCash)}</span>
        </div>

        {Object.keys(byVendor).length > 0 && (
          <>
            <p className="text-xs font-semibold mt-5 mb-1.5 opacity-70">Ventes par vendeur</p>
            {Object.entries(byVendor).map(([name, total]) => (
              <div key={name} className="flex justify-between text-xs py-1"><span>{name}</span><span className="font-mono">{fmt(total)}</span></div>
            ))}
          </>
        )}

        {topProducts.length > 0 && (
          <>
            <p className="text-xs font-semibold mt-4 mb-1.5 opacity-70">Produits les plus vendus aujourd'hui</p>
            {topProducts.map((p) => (
              <div key={p.name} className="flex justify-between text-xs py-1"><span>{p.name}</span><span className="font-mono">{p.qty}</span></div>
            ))}
          </>
        )}

        <p className="text-center text-[10px] opacity-40 mt-6">{todaySales.length} vente{todaySales.length > 1 ? "s" : ""} enregistrée{todaySales.length > 1 ? "s" : ""} · Généré le {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>

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

function StatsSection({ shop, products, sales, expenses }) {
  const fmt = useFmt();
  const [period, setPeriod] = useState("semaine");
  const [showDailyReport, setShowDailyReport] = useState(false);
  const today = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const todaySales = sales.filter((s) => new Date(s.date).toDateString() === today);
  const cashToday = todaySales.filter((s) => s.paymentMethod !== "credit").reduce((s, x) => s + x.total, 0);
  const creditGivenTodayUnpaid = todaySales.filter((s) => s.paymentMethod === "credit" && !s.paid).reduce((s, x) => s + x.total, 0);
  const creditCollectedToday = sales
    .filter((s) => s.paymentMethod === "credit" && s.paid && s.paidDate && new Date(s.paidDate).toDateString() === today)
    .reduce((s, x) => s + x.total, 0);
  const revenueToday = cashToday + creditCollectedToday;
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const expensesThisMonth = expenses.filter((e) => { const d = new Date(e.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).reduce((s, e) => s + Number(e.amount), 0);
  const creditSales = sales.filter((s) => s.paymentMethod === "credit" && !s.paid);
  const creditTotal = creditSales.reduce((s, x) => s + x.total, 0);
  const series = period === "semaine" ? buildDailySeries(sales, 7) : buildMonthlySeries(sales, 6);
  const topProducts = buildTopProducts(sales);
  const hourlySeries = buildHourlySeries(sales);

  const compareDays = period === "semaine" ? 7 : 30;
  const currentEnd = new Date();
  const currentStart = new Date(); currentStart.setDate(currentStart.getDate() - compareDays);
  const prevEnd = currentStart;
  const prevStart = new Date(currentStart); prevStart.setDate(prevStart.getDate() - compareDays);
  const currentRevenue = sumRevenueBetween(sales, currentStart, currentEnd);
  const prevRevenue = sumRevenueBetween(sales, prevStart, prevEnd);
  const deltaPct = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-base">Vue d'ensemble</h3>
        <button onClick={() => setShowDailyReport(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--paper-dim)" }}><Printer size={13} /> Rapport du jour</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-2">
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
      {showDailyReport && <DailyReportPreview shop={shop} sales={sales} expenses={expenses} onClose={() => setShowDailyReport(false)} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-5">
        <StatCard icon={AlertTriangle} label="Produits en alerte" value={lowStock.length} danger={lowStock.length > 0} />
        <StatCard icon={Wallet} label="Dépenses (mois)" value={fmt(expensesThisMonth)} />
        <StatCard icon={CreditCard} label="Crédits en cours (total)" value={fmt(creditTotal)} danger={creditTotal > 0} />
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-base">Évolution des ventes</h3>
        <div className="flex gap-1.5">
          <button onClick={() => setPeriod("semaine")} className="gb-focus px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: period === "semaine" ? "var(--glass)" : "var(--paper-dim)", color: period === "semaine" ? "#fff" : "var(--ink)" }}>7 jours</button>
          <button onClick={() => setPeriod("mois")} className="gb-focus px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: period === "mois" ? "var(--glass)" : "var(--paper-dim)", color: period === "mois" ? "#fff" : "var(--ink)" }}>6 mois</button>
        </div>
      </div>
      <div className="rounded-2xl border p-3 mb-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="total" fill="var(--glass)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border p-3.5 mb-5 flex items-center justify-between" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <div>
          <p className="text-[10px] opacity-50">{period === "semaine" ? "7 derniers jours" : "30 derniers jours"}</p>
          <p className="font-mono font-bold text-sm">{fmt(currentRevenue)}</p>
          <p className="text-[10px] opacity-40 mt-0.5">vs {fmt(prevRevenue)} période précédente</p>
        </div>
        <span className="px-2.5 py-1.5 rounded-full text-xs font-bold shrink-0" style={{ background: deltaPct >= 0 ? "#E7F7EE" : "#FCEBE8", color: deltaPct >= 0 ? "#1CA857" : "var(--danger)" }}>
          {deltaPct >= 0 ? "+" : ""}{deltaPct}%
        </span>
      </div>

      <h3 className="font-display font-bold text-base mb-2">Heures de forte affluence</h3>
      <div className="rounded-2xl border p-3 mb-5" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        {sales.length === 0 ? <p className="text-sm opacity-50 text-center py-4">Pas encore de ventes.</p> : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={hourlySeries}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis hide />
              <Tooltip formatter={(v, n) => [n === "count" ? `${v} vente${v > 1 ? "s" : ""}` : fmt(v), ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" fill="var(--soda)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <h3 className="font-display font-bold text-base mb-2">Produits les plus vendus</h3>
      <div className="rounded-2xl border p-3 mb-5" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        {topProducts.length === 0 && <p className="text-sm opacity-50 text-center py-4">Pas encore de ventes.</p>}
        {topProducts.length > 0 && (
          <ResponsiveContainer width="100%" height={Math.max(topProducts.length * 36, 60)}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="qty" fill="var(--cap)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {creditSales.length > 0 && (
        <p className="text-xs opacity-50 text-center">{creditSales.length} crédit{creditSales.length > 1 ? "s" : ""} en attente — à encaisser depuis l'onglet <strong>Crédits</strong>.</p>
      )}
    </div>
  );
}

function ProductsSection({ products, saveProducts, categories, movements, saveMovements, author, pushToast }) {
  const fmt = useFmt();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const upsert = (p) => {
    const existing = products.find((x) => x.id === p.id);
    let nextP = p;
    if (!existing) {
      nextP = { ...p, openingStock: p.stock };
      saveMovements([{ id: uid(), date: new Date().toISOString(), productId: p.id, productName: p.name, type: "creation", delta: p.stock, before: 0, after: p.stock, author, note: "" }, ...movements]);
    } else if (existing.stock !== p.stock) {
      const delta = p.stock - existing.stock;
      nextP = { ...p, openingStock: (existing.openingStock ?? existing.stock) + delta };
      saveMovements([{ id: uid(), date: new Date().toISOString(), productId: p.id, productName: p.name, type: "ajustement", delta, before: existing.stock, after: p.stock, author, note: "" }, ...movements]);
    } else {
      nextP = { ...p, openingStock: existing.openingStock ?? existing.stock };
    }
    saveProducts(existing ? products.map((x) => (x.id === p.id ? nextP : x)) : [...products, nextP]);
    setEditing(null); setAdding(false);
  };
  const del = (id, name) => { if (window.confirm(`Supprimer "${name}" ?`)) saveProducts(products.filter((x) => x.id !== id)); };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Produits ({products.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><PackagePlus size={14} /> Ajouter</button>
      </div>
      {adding && <ProductForm categories={categories} products={products} pushToast={pushToast} onSave={upsert} onCancel={() => setAdding(false)} />}
      <div className="flex flex-col gap-2.5">
        {products.map((p) => editing === p.id ? (
          <ProductForm key={p.id} initial={p} categories={categories} products={products} pushToast={pushToast} onSave={upsert} onCancel={() => setEditing(null)} />
        ) : (
          <div key={p.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={p.category} categories={categories} size={16} /></div>
            <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{p.name}</div><div className="text-xs opacity-50 font-mono">{fmt(p.price)} · {p.stock} {p.unit}s{p.bulkQty > 0 && p.bulkPrice > 0 ? ` · lot ${p.bulkQty}=${fmt(p.bulkPrice)}` : ""}</div></div>
            <button onClick={() => { setEditing(p.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /></button>
            <button onClick={() => del(p.id, p.name)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Inventaire professionnel ---------- */

function InventoryOverview({ products, categories, movements }) {
  const fmt = useFmt();
  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const outOfStock = products.filter((p) => p.stock <= 0);
  const today = new Date().toDateString();
  const movementsToday = movements.filter((m) => new Date(m.date).toDateString() === today).length;
  const byCategory = categories.map((c) => ({
    ...c,
    units: products.filter((p) => p.category === c.id).reduce((s, p) => s + p.stock, 0),
    value: products.filter((p) => p.category === c.id).reduce((s, p) => s + p.stock * p.price, 0),
  })).filter((c) => c.units > 0);
  const maxUnits = Math.max(...byCategory.map((c) => c.units), 1);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-5">
        <StatCard icon={Layers} label="Valeur du stock" value={fmt(totalValue)} dark />
        <StatCard icon={Boxes} label="Unités en stock" value={totalUnits} />
        <StatCard icon={AlertTriangle} label="Produits en alerte" value={lowStock.length} danger={lowStock.length > 0} />
        <StatCard icon={ClipboardList} label="Mouvements aujourd'hui" value={movementsToday} />
      </div>

      {outOfStock.length > 0 && (
        <div className="rounded-2xl p-3.5 mb-4 flex items-center gap-2.5" style={{ background: "#FCEBE8" }}>
          <AlertTriangle size={16} color="var(--danger)" className="shrink-0" />
          <p className="text-xs font-semibold" style={{ color: "var(--danger)" }}>{outOfStock.length} produit{outOfStock.length > 1 ? "s" : ""} en rupture totale de stock</p>
        </div>
      )}

      <h3 className="font-display font-bold text-base mb-2">Répartition par catégorie</h3>
      <div className="rounded-2xl border p-3.5 flex flex-col gap-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        {byCategory.length === 0 && <p className="text-sm opacity-50 text-center py-3">Aucun stock enregistré.</p>}
        {byCategory.map((c) => (
          <div key={c.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold flex items-center gap-1.5"><CategoryIcon cat={c.id} categories={categories} size={13} /> {c.label}</span>
              <span className="text-xs font-mono opacity-60">{c.units} u. · {fmt(c.value)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}>
              <div className="h-full rounded-full" style={{ width: `${(c.units / maxUnits) * 100}%`, background: c.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementsLedger({ movements, categories }) {
  const [filter, setFilter] = useState("all");
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const byType = filter === "all" ? movements : movements.filter((m) => m.type === filter);
  const byDate = byType.filter((m) => {
    const d = new Date(m.date);
    if (period === "today") return d.toDateString() === new Date().toDateString();
    if (period === "7j") { const from = new Date(); from.setDate(from.getDate() - 7); return d >= from; }
    if (period === "30j") { const from = new Date(); from.setDate(from.getDate() - 30); return d >= from; }
    if (period === "custom") {
      if (customFrom && d < new Date(customFrom + "T00:00:00")) return false;
      if (customTo && d > new Date(customTo + "T23:59:59")) return false;
      return true;
    }
    return true;
  });
  const filtered = byDate;

  const PERIODS = [
    { id: "all", label: "Tout" },
    { id: "today", label: "Aujourd'hui" },
    { id: "7j", label: "7 jours" },
    { id: "30j", label: "30 jours" },
    { id: "custom", label: "Plage" },
  ];

  return (
    <div>
      <h3 className="font-display font-bold text-base mb-2">Historique des mouvements</h3>

      <p className="text-[11px] font-semibold opacity-50 mb-1.5">Période</p>
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-2">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: period === p.id ? "var(--glass)" : "var(--paper-dim)", color: period === p.id ? "#fff" : "var(--ink)" }}>{p.label}</button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-2 mb-3 gb-slide-up">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
          <span className="text-xs opacity-50">à</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
        </div>
      )}

      <p className="text-[11px] font-semibold opacity-50 mb-1.5">Type</p>
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-4">
        <button onClick={() => setFilter("all")} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: filter === "all" ? "var(--glass)" : "var(--paper-dim)", color: filter === "all" ? "#fff" : "var(--ink)" }}>Tout</button>
        {Object.entries(MOVEMENT_TYPES).map(([id, meta]) => (
          <button key={id} onClick={() => setFilter(id)} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: filter === id ? "var(--glass)" : "var(--paper-dim)", color: filter === id ? "#fff" : "var(--ink)" }}>{meta.label}</button>
        ))}
      </div>
      <p className="text-[11px] opacity-40 mb-3">{filtered.length} mouvement{filtered.length > 1 ? "s" : ""}</p>
      {filtered.length === 0 && <p className="text-sm opacity-50 text-center py-8">Aucun mouvement pour cette période.</p>}
      <div className="flex flex-col gap-2">
        {filtered.slice(0, 100).map((m) => {
          const meta = MOVEMENT_TYPES[m.type] || { label: m.type, color: "var(--ink)" };
          const positive = m.delta > 0;
          return (
            <div key={m.id} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              {positive ? <ArrowUpCircle size={18} color="#1CA857" className="shrink-0" /> : m.delta < 0 ? <ArrowDownCircle size={18} color="var(--danger)" className="shrink-0" /> : <Pencil size={18} color="var(--ink)" className="shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.productName}</div>
                <div className="text-[11px] opacity-50 flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white" style={{ background: meta.color }}>{meta.label}</span>
                  <span>{m.author} · {new Date(m.date).toLocaleDateString("fr-FR")} {new Date(m.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-sm" style={{ color: positive ? "#1CA857" : m.delta < 0 ? "var(--danger)" : "var(--ink)" }}>{positive ? "+" : ""}{m.delta}</div>
                <div className="text-[10px] opacity-40 font-mono">{m.before}→{m.after}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StockCountSection({ products, saveProducts, movements, saveMovements, categories, author, pushToast }) {
  const [counts, setCounts] = useState({});
  const [query, setQuery] = useState("");
  const setCount = (id, v) => setCounts((c) => ({ ...c, [id]: v }));

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const rows = filtered.map((p) => {
    const raw = counts[p.id];
    const hasEntry = raw !== undefined && raw !== "";
    const countedNum = hasEntry ? Number(raw) : p.stock;
    return { p, hasEntry, countedNum, diff: countedNum - p.stock };
  });
  const changed = rows.filter((r) => r.hasEntry && r.diff !== 0);

  const validate = () => {
    if (changed.length === 0) { pushToast("Aucun écart à valider", "error"); return; }
    const nextProducts = products.map((p) => {
      const row = changed.find((r) => r.p.id === p.id);
      return row ? { ...p, stock: row.countedNum, openingStock: (p.openingStock ?? p.stock) + row.diff } : p;
    });
    saveProducts(nextProducts);
    const newMovements = changed.map((r) => ({ id: uid(), date: new Date().toISOString(), productId: r.p.id, productName: r.p.name, type: "comptage", delta: r.diff, before: r.p.stock, after: r.countedNum, author, note: "" }));
    saveMovements([...newMovements, ...movements]);
    pushToast(`Comptage validé — ${changed.length} écart${changed.length > 1 ? "s" : ""} ajusté${changed.length > 1 ? "s" : ""}`, "ok");
    setCounts({});
  };

  return (
    <div className="pb-16">
      <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "var(--paper-dim)" }}>
        <ClipboardCheck size={16} className="shrink-0 mt-0.5" />
        <p className="text-xs opacity-70">Saisis la quantité physiquement comptée pour chaque produit. Seuls les écarts seront appliqués au stock, avec traçabilité dans les mouvements.</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: "var(--paper-dim)" }}>
        <Search size={15} className="opacity-50" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit" className="gb-focus bg-transparent outline-none text-sm flex-1 min-w-0" />
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(({ p, diff, hasEntry }) => (
          <div key={p.id} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: hasEntry && diff !== 0 ? "var(--cap)" : "var(--line)", background: "var(--card)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={p.category} categories={categories} size={14} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-[11px] opacity-50 font-mono">Système : {p.stock} {p.unit}s</div>
            </div>
            <input
              type="number"
              value={counts[p.id] ?? ""}
              onChange={(e) => setCount(p.id, e.target.value)}
              placeholder={String(p.stock)}
              className="gb-focus w-16 text-center rounded-lg px-2 py-1.5 text-sm border font-mono shrink-0"
              style={{ borderColor: "var(--line)" }}
            />
            {hasEntry && diff !== 0 && (
              <span className="text-xs font-mono font-bold shrink-0 w-10 text-right" style={{ color: diff > 0 ? "#1CA857" : "var(--danger)" }}>{diff > 0 ? "+" : ""}{diff}</span>
            )}
          </div>
        ))}
      </div>

      {changed.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[380px] no-print gb-slide-up">
          <button onClick={validate} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm shadow-xl flex items-center justify-center gap-2 text-white" style={{ background: "var(--glass)" }}>
            <ClipboardCheck size={16} /> Valider {changed.length} écart{changed.length > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

function ProfitabilitySection({ products, saveProducts, inventories, saveInventories, categories, author, pushToast }) {
  const fmt = useFmt();
  const symbol = useCurrencySymbol();
  const [confirming, setConfirming] = useState(false);

  const rows = products.map((p) => {
    const openingStock = p.openingStock ?? p.stock;
    const sold = openingStock - p.stock;
    const unitProfit = p.price - (p.costPrice || 0);
    const totalProfit = sold * unitProfit;
    return { p, openingStock, sold, unitProfit, totalProfit, cost: sold * (p.costPrice || 0), revenue: sold * p.price };
  });
  const totals = rows.reduce((acc, r) => ({ sold: acc.sold + r.sold, revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.totalProfit }), { sold: 0, revenue: 0, cost: 0, profit: 0 });

  const validateInventory = () => {
    const items = rows.map((r) => ({
      productId: r.p.id, name: r.p.name, costPrice: r.p.costPrice || 0, price: r.p.price,
      openingStock: r.openingStock, currentStock: r.p.stock, sold: r.sold,
      revenue: r.revenue, cost: r.cost, profit: r.totalProfit,
    }));
    const record = { id: uid(), date: new Date().toISOString(), author, items, totals };
    saveInventories([record, ...inventories]);
    saveProducts(products.map((p) => ({ ...p, openingStock: p.stock })));
    pushToast("Inventaire validé — nouveau stock de départ enregistré", "ok");
    setConfirming(false);
  };

  return (
    <div className="pb-16">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-5">
        <StatCard icon={Boxes} label="Unités vendues" value={totals.sold} dark />
        <StatCard icon={TrendingUp} label="Chiffre d'affaires" value={fmt(totals.revenue)} />
        <StatCard icon={Wallet} label="Coût total" value={fmt(totals.cost)} />
        <StatCard icon={Layers} label="Bénéfice" value={fmt(totals.profit)} danger={totals.profit < 0} />
      </div>

      <h3 className="font-display font-bold text-base mb-2">Détail par produit</h3>
      <div className="flex flex-col gap-2.5 mb-5">
        {rows.map(({ p, openingStock, sold, unitProfit, totalProfit }) => (
          <div key={p.id} className="rounded-xl p-3.5 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold flex items-center gap-1.5"><CategoryIcon cat={p.category} categories={categories} size={13} /> {p.name}</span>
              <span className="text-[11px] font-mono opacity-50">{fmt(p.costPrice || 0)} → {fmt(p.price)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-2">
              <div><div className="text-[10px] opacity-45">Stock départ</div><div className="font-mono text-sm font-semibold">{openingStock}</div></div>
              <div><div className="text-[10px] opacity-45">Stock actuel</div><div className="font-mono text-sm font-semibold">{p.stock}</div></div>
              <div><div className="text-[10px] opacity-45">Vendu</div><div className="font-mono text-sm font-semibold" style={{ color: "var(--glass)" }}>{sold}</div></div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--line)" }}>
              <span className="text-[11px] opacity-50">Bénéfice ({unitProfit >= 0 ? "+" : ""}{unitProfit} {symbol}/u)</span>
              <span className="font-mono font-bold text-sm" style={{ color: totalProfit >= 0 ? "#1CA857" : "var(--danger)" }}>{totalProfit >= 0 ? "+" : ""}{fmt(totalProfit)}</span>
            </div>
          </div>
        ))}
      </div>

      {confirming ? (
        <div className="rounded-2xl p-4 border gb-slide-up" style={{ borderColor: "var(--cap)", background: "var(--paper-dim)" }}>
          <p className="text-xs font-semibold mb-3">Valider l'inventaire ? Cette action enregistre le bénéfice de la période dans l'historique et fait du stock actuel le nouveau stock de départ.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--card)" }}>Annuler</button>
            <button onClick={validateInventory} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Confirmer</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 text-white" style={{ background: "var(--glass)" }}>
          <ClipboardCheck size={16} /> Valider l'inventaire
        </button>
      )}
    </div>
  );
}

function InventoryHistorySection({ inventories }) {
  const fmt = useFmt();
  const [open, setOpen] = useState(null);
  const sorted = [...inventories].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div>
      <h3 className="font-display font-bold text-base mb-2">Inventaires validés</h3>
      {sorted.length === 0 && <p className="text-sm opacity-50 text-center py-8">Aucun inventaire validé pour l'instant.</p>}
      <div className="flex flex-col gap-2.5">
        {sorted.map((inv) => {
          const soldItems = inv.items.filter((i) => i.sold !== 0);
          return (
            <div key={inv.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              <button onClick={() => setOpen(open === inv.id ? null : inv.id)} className="gb-focus w-full flex items-center justify-between p-3.5">
                <div className="text-left">
                  <div className="text-sm font-semibold">{new Date(inv.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                  <div className="text-xs opacity-50">{inv.author} · {inv.totals.sold} unités vendues</div>
                </div>
                <span className="font-mono font-bold text-sm" style={{ color: inv.totals.profit >= 0 ? "#1CA857" : "var(--danger)" }}>{fmt(inv.totals.profit)}</span>
              </button>
              {open === inv.id && (
                <div className="px-3.5 pb-3.5 pt-1 border-t gb-slide-up" style={{ borderColor: "var(--line)" }}>
                  <div className="flex justify-between text-[11px] opacity-50 py-1">
                    <span>Chiffre d'affaires</span><span className="font-mono">{fmt(inv.totals.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] opacity-50 py-1 mb-1.5">
                    <span>Coût des ventes</span><span className="font-mono">{fmt(inv.totals.cost)}</span>
                  </div>
                  {soldItems.length === 0 && <p className="text-xs opacity-50 py-2">Aucune vente sur cette période.</p>}
                  {soldItems.map((i) => (
                    <div key={i.productId} className="flex justify-between text-xs font-mono py-0.5 opacity-80">
                      <span>{i.name} ({i.sold})</span><span>{fmt(i.profit)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventorySection({ products, saveProducts, categories, movements, saveMovements, inventories, saveInventories, author, pushToast }) {
  const [tab, setTab] = useState("apercu");
  const TABS = [
    { id: "apercu", label: "Aperçu" },
    { id: "mouvements", label: "Mouvements" },
    { id: "comptage", label: "Comptage" },
    { id: "rentabilite", label: "Rentabilité" },
    { id: "historique", label: "Historique" },
  ];
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="gb-focus shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: tab === t.id ? "var(--glass)" : "var(--paper-dim)", color: tab === t.id ? "#fff" : "var(--ink)" }}>{t.label}</button>
        ))}
      </div>
      {tab === "apercu" && <InventoryOverview products={products} categories={categories} movements={movements} />}
      {tab === "mouvements" && <MovementsLedger movements={movements} categories={categories} />}
      {tab === "comptage" && <StockCountSection products={products} saveProducts={saveProducts} movements={movements} saveMovements={saveMovements} categories={categories} author={author} pushToast={pushToast} />}
      {tab === "rentabilite" && <ProfitabilitySection products={products} saveProducts={saveProducts} inventories={inventories} saveInventories={saveInventories} categories={categories} author={author} pushToast={pushToast} />}
      {tab === "historique" && <InventoryHistorySection inventories={inventories} />}
    </div>
  );
}

function PurchaseOrderModal({ supplier, products, onClose }) {
  const fmt = useFmt();
  const [selected, setSelected] = useState(() => Object.fromEntries(products.filter((p) => p.stock <= p.minStock).map((p) => [p.id, Math.max(p.minStock * 2 - p.stock, p.minStock)])));
  const toggle = (p) => setSelected((s) => { const next = { ...s }; if (next[p.id] != null) delete next[p.id]; else next[p.id] = p.minStock || 1; return next; });
  const setQty = (id, qty) => setSelected((s) => ({ ...s, [id]: Math.max(1, Number(qty) || 1) }));

  const lines = Object.entries(selected).map(([id, qty]) => {
    const p = products.find((x) => x.id === id);
    return p ? `- ${p.name} : ${qty} ${p.unit}${qty > 1 ? "s" : ""}` : "";
  }).filter(Boolean);
  const text = `Bon de commande — ${supplier.name}\n${new Date().toLocaleDateString("fr-FR")}\n\n${lines.join("\n")}`;

  const copyText = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* presse-papier indisponible */ }
  };
  const waLink = `https://wa.me/${(supplier.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-5 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Bon de commande — {supplier.name}</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>
        <p className="text-xs opacity-50 mb-3">Les produits en dessous du seuil d'alerte sont présélectionnés. Ajuste les quantités si besoin.</p>
        <div className="flex flex-col gap-2 mb-4">
          {products.map((p) => {
            const checked = selected[p.id] != null;
            const low = p.stock <= p.minStock;
            return (
              <div key={p.id} className="rounded-xl p-2.5 border flex items-center gap-2.5" style={{ borderColor: checked ? "var(--glass)" : "var(--line)" }}>
                <button onClick={() => toggle(p)} className="gb-focus w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: checked ? "var(--glass)" : "var(--paper-dim)" }}>
                  {checked && <Check size={12} color="#fff" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className="text-[10px] opacity-50">Stock : {p.stock} {low && "· sous le seuil"}</div>
                </div>
                {checked && (
                  <input type="number" min="1" value={selected[p.id]} onChange={(e) => setQty(p.id, e.target.value)} className="gb-focus w-14 text-center rounded-lg px-2 py-1 text-xs border font-mono shrink-0" style={{ borderColor: "var(--line)" }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="rounded-xl p-3 mb-4 font-mono text-[11px] whitespace-pre-wrap" style={{ background: "var(--paper-dim)" }}>{text}</div>
        <div className="flex gap-2">
          <button onClick={copyText} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Copier le texte</button>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white text-center" style={{ background: "#25D366" }}>Envoyer par WhatsApp</a>
        </div>
      </div>
    </div>
  );
}

function SuppliersSection({ suppliers, saveSuppliers, expenses, products }) {
  const fmt = useFmt();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [orderFor, setOrderFor] = useState(null);
  const upsert = (s) => { const exists = suppliers.some((x) => x.id === s.id); saveSuppliers(exists ? suppliers.map((x) => (x.id === s.id ? s : x)) : [...suppliers, s]); setEditing(null); setAdding(false); };
  const del = (id, name) => { if (window.confirm(`Supprimer "${name}" ?`)) saveSuppliers(suppliers.filter((x) => x.id !== id)); };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Fournisseurs ({suppliers.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Ajouter</button>
      </div>
      {adding && <SupplierForm onSave={upsert} onCancel={() => setAdding(false)} />}
      <div className="flex flex-col gap-2.5">
        {suppliers.map((s) => {
          const spent = expenses.filter((e) => e.supplierId === s.id).reduce((sum, e) => sum + Number(e.amount), 0);
          return editing === s.id ? (
            <SupplierForm key={s.id} initial={s} onSave={upsert} onCancel={() => setEditing(null)} />
          ) : (
            <div key={s.id} className="rounded-2xl p-3 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Truck size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="text-xs opacity-50 font-mono truncate">{s.phone}{s.note ? " · " + s.note : ""}{spent > 0 ? ` · ${fmt(spent)} dépensés` : ""}</div>
                </div>
                <button onClick={() => { setEditing(s.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /></button>
                <button onClick={() => del(s.id, s.name)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
              </div>
              <button onClick={() => setOrderFor(s)} className="gb-focus w-full rounded-xl py-2 text-xs font-semibold" style={{ background: "var(--paper-dim)" }}>📋 Créer un bon de commande</button>
            </div>
          );
        })}
        {suppliers.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun fournisseur enregistré.</p>}
      </div>
      {orderFor && <PurchaseOrderModal supplier={orderFor} products={products} onClose={() => setOrderFor(null)} />}
    </div>
  );
}

function ExpensesSection({ expenses, saveExpenses, suppliers }) {
  const fmt = useFmt();
  const [adding, setAdding] = useState(false);
  const add = (e) => { saveExpenses([...expenses, e]); setAdding(false); };
  const del = (id, label) => { if (window.confirm(`Supprimer la dépense "${label}" ?`)) saveExpenses(expenses.filter((x) => x.id !== id)); };
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Dépenses ({expenses.length})</h3>
        <button onClick={() => setAdding(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Ajouter</button>
      </div>
      <div className="rounded-2xl p-3.5 mb-3" style={{ background: "var(--glass)" }}>
        <div className="text-white/60 text-[11px]">Total dépenses enregistrées</div>
        <div className="font-mono font-bold text-white text-lg mt-1">{fmt(total)}</div>
      </div>
      {adding && <ExpenseForm onSave={add} onCancel={() => setAdding(false)} suppliers={suppliers} />}
      <div className="flex flex-col gap-2.5">
        {sorted.map((e) => {
          const supplier = suppliers.find((s) => s.id === e.supplierId);
          return (
            <div key={e.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Wallet size={15} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{e.label}</div>
                <div className="text-xs opacity-50 font-mono">{new Date(e.date).toLocaleDateString("fr-FR")}{supplier ? ` · ${supplier.name}` : ""}</div>
              </div>
              <span className="font-mono text-sm font-semibold">{fmt(e.amount)}</span>
              <button onClick={() => del(e.id, e.label)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucune dépense enregistrée.</p>}
      </div>
    </div>
  );
}

function VendorsSection({ vendors, saveVendors, pushToast, adminPin, adminPinHash, backendLinked }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const upsert = (v) => { const exists = vendors.some((x) => x.id === v.id); saveVendors(exists ? vendors.map((x) => (x.id === v.id ? v : x)) : [...vendors, v]); setEditing(null); setAdding(false); };
  const del = (id, name) => { if (window.confirm(`Supprimer le vendeur "${name}" ?`)) saveVendors(vendors.filter((x) => x.id !== id)); };
  const toggleBlocked = (v) => {
    saveVendors(vendors.map((x) => (x.id === v.id ? { ...x, blocked: !x.blocked } : x)));
    pushToast(v.blocked ? `${v.name} débloqué` : `${v.name} bloqué`, "ok");
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Vendeurs ({vendors.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Ajouter</button>
      </div>
      {adding && <VendorForm onSave={upsert} onCancel={() => setAdding(false)} pushToast={pushToast} vendors={vendors} adminPin={adminPin} adminPinHash={adminPinHash} backendLinked={backendLinked} />}
      <div className="flex flex-col gap-2.5">
        {vendors.map((v) => editing === v.id ? (
          <VendorForm key={v.id} initial={v} onSave={upsert} onCancel={() => setEditing(null)} pushToast={pushToast} vendors={vendors} adminPin={adminPin} adminPinHash={adminPinHash} backendLinked={backendLinked} />
        ) : (
          <div key={v.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ borderColor: v.blocked ? "var(--danger)" : "var(--line)", background: "var(--card)", opacity: v.blocked ? 0.75 : 1 }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Users size={16} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                {v.name}
                {v.blocked && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: "var(--danger)" }}>BLOQUÉ</span>}
              </div>
              <div className="mt-0.5">
                {v.pin ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] opacity-50">Code PIN</span>
                    <span className="text-sm font-mono font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: "var(--paper-dim)" }}>{v.pin}</span>
                  </div>
                ) : (
                  <div className="text-xs" style={{ color: "var(--danger)" }}>⚠ Aucun code — à réinitialiser</div>
                )}
                {backendLinked && v.joinCode && <div className="text-[11px] font-mono font-bold mt-1">Code de liaison : {v.joinCode}</div>}
              </div>
            </div>
            <button onClick={() => toggleBlocked(v)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} title={v.blocked ? "Débloquer" : "Bloquer"}>
              {v.blocked ? <Unlock size={14} color="var(--glass)" /> : <Lock size={14} />}
            </button>
            <button onClick={() => { setEditing(v.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /></button>
            <button onClick={() => del(v.id, v.name)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
          </div>
        ))}
        {vendors.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun vendeur enregistré.</p>}
      </div>
    </div>
  );
}

/* ---------- Clients & fidélité ---------- */

function ClientForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { name: "", phone: "", notes: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom du client" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Téléphone (optionnel)" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Note (optionnel)" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => { if (!f.name.trim()) return; onSave({ ...f, id: f.id || uid(), name: f.name.trim() }); }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function ClientDetail({ client, sales, loyaltyThreshold, onRedeemReward, onClose }) {
  const fmt = useFmt();
  const purchases = sales.filter((s) => s.clientId === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalSpent = purchases.reduce((s, x) => s + x.total, 0);
  const totalCredit = purchases.filter((s) => s.paymentMethod === "credit").reduce((s, x) => s + x.total, 0);
  const outstandingCredit = purchases.filter((s) => s.paymentMethod === "credit" && !s.paid).reduce((s, x) => s + x.total, 0);
  const threshold = loyaltyThreshold || 10;
  const rewardsEarned = Math.floor(purchases.length / threshold);
  const rewardsAvailable = rewardsEarned - (client.loyaltyRedeemed || 0);
  const progress = purchases.length % threshold;

  return (
    <div className="fixed inset-0 z-50 flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-5 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-lg">{client.name}</h2>
            {client.phone && <p className="text-xs opacity-50">{client.phone}</p>}
          </div>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-4">
          <StatCard icon={TrendingUp} label="Total dépensé" value={fmt(totalSpent)} dark />
          <StatCard icon={Receipt} label="Achats enregistrés" value={purchases.length} />
          <StatCard icon={CreditCard} label="Crédit total accordé" value={fmt(totalCredit)} />
          <StatCard icon={AlertTriangle} label="Crédit en cours" value={fmt(outstandingCredit)} danger={outstandingCredit > 0} />
        </div>

        <div className="rounded-2xl p-3.5 mb-4" style={{ background: "var(--paper-dim)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold flex items-center gap-1.5"><Gift size={13} color="var(--cap)" /> Fidélité</span>
            <span className="text-[11px] opacity-50">{progress}/{threshold} achats</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--line)" }}>
            <div className="h-full rounded-full" style={{ width: `${(progress / threshold) * 100}%`, background: "var(--cap)" }} />
          </div>
          {rewardsAvailable > 0 ? (
            <button onClick={() => onRedeemReward(client.id)} className="gb-focus w-full rounded-xl py-2 text-xs font-semibold text-white" style={{ background: "var(--glass)" }}>
              🎁 {rewardsAvailable} récompense{rewardsAvailable > 1 ? "s" : ""} disponible{rewardsAvailable > 1 ? "s" : ""} — marquer utilisée
            </button>
          ) : (
            <p className="text-[11px] opacity-50">Encore {threshold - progress} achat{threshold - progress > 1 ? "s" : ""} avant la prochaine récompense.</p>
          )}
        </div>

        <h3 className="font-display font-bold text-base mb-2">Historique d'achats</h3>
        {purchases.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun achat enregistré pour ce client.</p>}
        <div className="flex flex-col gap-2">
          {purchases.map((s) => (
            <div key={s.id} className="rounded-xl p-3 border flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
              <div>
                <div className="text-xs font-medium">{new Date(s.date).toLocaleDateString("fr-FR")}</div>
                <div className="text-[10px] opacity-50">{s.items.length} article{s.items.length > 1 ? "s" : ""} · {PAYMENT_LABELS[s.paymentMethod]}{s.paymentMethod === "credit" && !s.paid ? " · impayé" : ""}</div>
              </div>
              <span className="font-mono text-sm font-semibold">{fmt(s.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DataSection({ shop, data, onRestore, pushToast }) {
  const [pending, setPending] = useState(null);
  const fileRef = useRef(null);

  const exportBackup = () => {
    const bundle = { exportedAt: new Date().toISOString(), shopName: shop.name, ...data };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sauvegarde-${shop.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast("Sauvegarde téléchargée", "ok");
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.products || !parsed.sales) throw new Error("format invalide");
        setPending(parsed);
      } catch {
        pushToast("Fichier de sauvegarde invalide", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmRestore = () => {
    onRestore(pending);
    setPending(null);
    pushToast("Sauvegarde restaurée", "ok");
  };

  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Sauvegarde &amp; restauration</h3>

      <div className="rounded-2xl border p-4 mb-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <p className="text-xs opacity-60 mb-3">Télécharge une copie complète des données de cette boutique (produits, ventes, clients, stock...) dans un fichier que tu peux conserver en lieu sûr.</p>
        <button onClick={exportBackup} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: "var(--glass)" }}>
          <Download size={15} /> Exporter une sauvegarde
        </button>
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <p className="text-xs opacity-60 mb-3">Restaure les données à partir d'un fichier de sauvegarde. ⚠️ Cela remplace entièrement les données actuelles de cette boutique.</p>
        <input ref={fileRef} type="file" accept="application/json" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>
          Choisir un fichier de sauvegarde
        </button>

        {pending && (
          <div className="mt-3 rounded-xl p-3.5 gb-slide-up" style={{ background: "#FCEBE8" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--danger)" }}>Confirmer la restauration ?</p>
            <p className="text-[11px] mb-3" style={{ color: "var(--danger)" }}>
              Sauvegarde du {pending.exportedAt ? new Date(pending.exportedAt).toLocaleDateString("fr-FR") : "?"} — {pending.products?.length ?? 0} produits, {pending.sales?.length ?? 0} ventes. Toutes les données actuelles seront remplacées.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPending(null)} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: "#fff" }}>Annuler</button>
              <button onClick={confirmRestore} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold text-white" style={{ background: "var(--danger)" }}>Restaurer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsSection({ clients, saveClients, sales, shop, pushToast }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [query, setQuery] = useState("");

  const upsert = (c) => {
    const exists = clients.some((x) => x.id === c.id);
    saveClients(exists ? clients.map((x) => (x.id === c.id ? c : x)) : [...clients, c]);
    setAdding(false); setEditing(null);
  };
  const del = (id, name) => { if (window.confirm(`Supprimer le client "${name}" ?`)) saveClients(clients.filter((x) => x.id !== id)); };
  const redeemReward = (id) => {
    saveClients(clients.map((x) => (x.id === id ? { ...x, loyaltyRedeemed: (x.loyaltyRedeemed || 0) + 1 } : x)));
    pushToast("Récompense marquée comme utilisée", "ok");
  };

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const detailClient = clients.find((c) => c.id === detailId);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Clients ({clients.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><UserPlus size={14} /> Ajouter</button>
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: "var(--paper-dim)" }}>
        <Search size={15} className="opacity-50" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un client" className="gb-focus bg-transparent outline-none text-sm flex-1 min-w-0" />
      </div>
      {adding && <ClientForm onSave={upsert} onCancel={() => setAdding(false)} />}
      <div className="flex flex-col gap-2.5">
        {filtered.map((c) => editing === c.id ? (
          <ClientForm key={c.id} initial={c} onSave={upsert} onCancel={() => setEditing(null)} />
        ) : (
          <div key={c.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <button onClick={() => setDetailId(c.id)} className="gb-focus flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Users size={16} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-xs opacity-50 font-mono truncate">{c.phone || "Pas de téléphone"}</div>
              </div>
            </button>
            <button onClick={() => { setEditing(c.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /></button>
            <button onClick={() => del(c.id, c.name)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun client trouvé.</p>}
      </div>

      {detailClient && (
        <ClientDetail client={detailClient} sales={sales} loyaltyThreshold={shop.loyaltyThreshold} onRedeemReward={redeemReward} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

function SecuritySection({ shop, saveShopMeta, pushToast }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = () => {
    const valid = shop.backendLinked ? api.verifyPin(current, shop.adminPinHash) : current === (shop.adminPin || DEFAULT_ADMIN_PIN);
    if (!valid) { pushToast("Code actuel incorrect", "error"); return; }
    if (next.length !== 4) { pushToast("Le nouveau code doit contenir 4 chiffres", "error"); return; }
    if (next !== confirm) { pushToast("Les deux codes ne correspondent pas", "error"); return; }
    if (next === current) { pushToast("Choisissez un code différent de l'ancien", "error"); return; }
    saveShopMeta(shop.backendLinked ? { ...shop, adminPinHash: api.hashPin(next) } : { ...shop, adminPin: next });
    pushToast("Code administrateur mis à jour", "ok");
    setCurrent(""); setNext(""); setConfirm("");
  };

  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Sécurité</h3>
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <p className="text-xs opacity-60 mb-4">Change régulièrement le code administrateur, surtout s'il est encore sur la valeur par défaut (1234).</p>
        <label className="text-xs font-semibold opacity-60 block mb-1.5">Code administrateur actuel</label>
        <input type="password" inputMode="numeric" maxLength={4} value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, "").slice(0, 4))} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono mb-3 tracking-widest" style={{ borderColor: "var(--line)" }} placeholder="••••" />
        <label className="text-xs font-semibold opacity-60 block mb-1.5">Nouveau code (4 chiffres)</label>
        <input type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, "").slice(0, 4))} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono mb-3 tracking-widest" style={{ borderColor: "var(--line)" }} placeholder="••••" />
        <label className="text-xs font-semibold opacity-60 block mb-1.5">Confirmer le nouveau code</label>
        <input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono mb-4 tracking-widest" style={{ borderColor: "var(--line)" }} placeholder="••••" />
        <button onClick={submit} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Changer le code</button>
      </div>
    </div>
  );
}

const ADMIN_SECTIONS = [
  { id: "stats", label: "Vue d'ensemble", Icon: TrendingUp, group: null },
  { id: "etablissement", label: "Établissement", Icon: Store, group: "Établissement" },
  { id: "boutiques", label: "Boutiques", Icon: Layers, group: "Établissement" },
  { id: "securite", label: "Sécurité", Icon: ShieldCheck, group: "Établissement" },
  { id: "produits", label: "Produits", Icon: Boxes, group: "Gestion commerciale" },
  { id: "categories", label: "Catégories", Icon: ClipboardList, group: "Gestion commerciale" },
  { id: "inventaire", label: "Inventaire", Icon: ArrowUpCircle, group: "Gestion commerciale" },
  { id: "fournisseurs", label: "Fournisseurs", Icon: Truck, group: "Gestion commerciale" },
  { id: "depenses", label: "Dépenses", Icon: Wallet, group: "Finances" },
  { id: "vendeurs", label: "Vendeurs", Icon: Users, group: "Équipe et clients" },
  { id: "clients", label: "Clients", Icon: UserPlus, group: "Équipe et clients" },
  { id: "abonnement", label: "Abonnement", Icon: CreditCard, group: "Abonnement" },
  { id: "licence", label: "Licence", Icon: Star, group: "Abonnement" },
  { id: "donnees", label: "Données", Icon: Download, group: "Données" },
  { id: "assistance", label: "Assistance", Icon: MessageCircle, group: "Assistance" },
];

function SupportInboxSection({ ownerAccess, onVerifyOwner, pushToast }) {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState(null);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [thread, setThread] = useState([]);
  const [reply, setReply] = useState("");

  const fetchList = async (em, sc) => {
    setLoading(true);
    try {
      const data = await api.ownerSupportList({ email: em, secret: sc });
      setConversations(data.conversations);
      return true;
    } catch (e) {
      pushToast(e.message || "Accès refusé", "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerAccess && conversations === null) fetchList(ownerAccess.email, ownerAccess.secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAccess]);

  useEffect(() => {
    if (!ownerAccess) return;
    const interval = setInterval(() => fetchList(ownerAccess.email, ownerAccess.secret), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAccess]);

  const submit = async () => {
    const em = email.trim().toLowerCase();
    const ok = await fetchList(em, secret);
    if (ok) { onVerifyOwner({ email: em, secret }); pushToast("Accès propriétaire vérifié", "ok"); }
  };

  const openThread = async (deviceId) => {
    setActiveDeviceId(deviceId);
    try {
      const data = await api.ownerSupportMessages({ email: ownerAccess.email, secret: ownerAccess.secret, deviceId });
      setThread(data.messages);
    } catch (e) { pushToast(e.message, "error"); }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      await api.ownerSupportReply({ email: ownerAccess.email, secret: ownerAccess.secret, deviceId: activeDeviceId, message: reply.trim() });
      setReply("");
      openThread(activeDeviceId);
    } catch (e) { pushToast(e.message, "error"); }
  };

  const delConversation = async (deviceId) => {
    if (!window.confirm("Supprimer définitivement cette conversation ?")) return;
    try {
      await api.ownerSupportDelete({ email: ownerAccess.email, secret: ownerAccess.secret, deviceId });
      pushToast("Conversation supprimée", "ok");
      setActiveDeviceId(null);
      fetchList(ownerAccess.email, ownerAccess.secret);
    } catch (e) { pushToast(e.message, "error"); }
  };

  if (!ownerAccess) {
    return (
      <div>
        <h3 className="font-display font-bold text-base mb-3">Assistance</h3>
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} color="var(--glass)" />
            <p className="text-xs font-semibold">Page réservée au propriétaire de l'application</p>
          </div>
          <label className="text-xs font-semibold opacity-60 block mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-3" style={{ borderColor: "var(--line)" }} placeholder="email@exemple.com" />
          <label className="text-xs font-semibold opacity-60 block mb-1.5">{OWNER_SECURITY_QUESTION}</label>
          <input type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2.5 text-sm border mb-4" style={{ borderColor: "var(--line)" }} placeholder="Réponse" />
          <button onClick={submit} disabled={loading} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--glass)" }}>
            {loading ? "Vérification…" : "Vérifier"}
          </button>
        </div>
      </div>
    );
  }

  if (activeDeviceId) {
    const conv = (conversations || []).find((c) => c.device_id === activeDeviceId);
    return (
      <div>
        <button onClick={() => setActiveDeviceId(null)} className="gb-focus text-xs font-semibold opacity-60 mb-3">← Retour à la liste</button>
        <div className="rounded-2xl border p-3 mb-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              {conv?.name || "Anonyme"}
              {conv?.online && <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#1CA857" }} title="En ligne" />}
            </p>
            <button onClick={() => delConversation(activeDeviceId)} className="gb-focus text-xs font-semibold" style={{ color: "var(--danger)" }}>Supprimer</button>
          </div>
          <p className="text-xs opacity-50">{conv?.phone}{conv?.email ? ` · ${conv.email}` : ""}{conv?.shop_name ? ` · ${conv.shop_name}` : ""}</p>
        </div>
        <div className="flex flex-col gap-2 mb-3 max-h-[50vh] overflow-y-auto gb-scroll">
          {thread.map((m) => (
            <div
              key={m.id}
              className="rounded-xl px-3 py-2 text-sm max-w-[80%]"
              style={{
                background: m.sender === "owner" ? "var(--glass)" : "var(--paper-dim)",
                color: m.sender === "owner" ? "#fff" : "var(--ink)",
                alignSelf: m.sender === "owner" ? "flex-end" : "flex-start",
              }}
            >
              {m.body}
            </div>
          ))}
          {thread.length === 0 && <p className="text-sm opacity-50 text-center py-4">Aucun message.</p>}
        </div>
        <div className="flex gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Répondre…" className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
          <button onClick={sendReply} className="gb-focus px-4 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Envoyer</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Assistance</h3>
        <button onClick={() => fetchList(ownerAccess.email, ownerAccess.secret)} disabled={loading} className="gb-focus text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--paper-dim)" }}>
          {loading ? "…" : "Actualiser"}
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {(conversations || []).map((c) => (
          <button key={c.device_id} onClick={() => openThread(c.device_id)} className="gb-focus w-full text-left rounded-2xl p-3.5 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.online ? "#1CA857" : "#C7CFC2" }} />
              <span className="text-sm font-semibold flex-1 truncate">{c.name || "Anonyme"}</span>
              <span className="text-[10px] opacity-40 shrink-0">{c.last_message_at ? new Date(c.last_message_at).toLocaleDateString("fr-FR") : ""}</span>
            </div>
            <p className="text-xs opacity-60 truncate">{c.last_message || "Aucun message"}</p>
            <p className="text-[10px] opacity-40 mt-1">{c.phone}{c.shop_name ? ` · ${c.shop_name}` : ""}</p>
          </button>
        ))}
        {conversations && conversations.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun message pour l'instant.</p>}
      </div>
    </div>
  );
}

function SubscriptionSection({ ownerAccess, onVerifyOwner, pushToast }) {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [allShops, setAllShops] = useState(null);

  const fetchShops = async (em, sc) => {
    setLoading(true);
    try {
      const data = await api.getOwnerShops({ email: em, secret: sc });
      setAllShops(data.shops);
      return true;
    } catch (e) {
      pushToast(e.message || "Accès refusé", "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerAccess && allShops === null) {
      fetchShops(ownerAccess.email, ownerAccess.secret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAccess]);

  const submit = async () => {
    const em = email.trim().toLowerCase();
    const ok = await fetchShops(em, secret);
    if (ok) {
      onVerifyOwner({ email: em, secret });
      pushToast("Accès propriétaire vérifié", "ok");
    }
  };

  if (!ownerAccess) {
    return (
      <div>
        <h3 className="font-display font-bold text-base mb-3">Abonnement</h3>
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} color="var(--glass)" />
            <p className="text-xs font-semibold">Page réservée au propriétaire de l'application</p>
          </div>
          <label className="text-xs font-semibold opacity-60 block mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-3" style={{ borderColor: "var(--line)" }} placeholder="email@exemple.com" />
          <label className="text-xs font-semibold opacity-60 block mb-1.5">{OWNER_SECURITY_QUESTION}</label>
          <input type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2.5 text-sm border mb-4" style={{ borderColor: "var(--line)" }} placeholder="Réponse" />
          <button onClick={submit} disabled={loading} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--glass)" }}>
            {loading ? "Vérification…" : "Vérifier"}
          </button>
        </div>
      </div>
    );
  }

  const totals = (allShops || []).reduce((acc, s) => {
    acc.total += 1;
    if (s.subscription?.isTrial) acc.trial += 1;
    else if (s.subscription?.status === "active") acc.paid += 1;
    else acc.none += 1;
    return acc;
  }, { total: 0, trial: 0, paid: 0, none: 0 });

  const deleteShop = async (shopId, shopName) => {
    if (!window.confirm(`Supprimer définitivement "${shopName}" et toutes ses données ? Cette action est irréversible.`)) return;
    try {
      await api.ownerDeleteShop({ email: ownerAccess.email, secret: ownerAccess.secret, shopId });
      pushToast("Boutique supprimée", "ok");
      fetchShops(ownerAccess.email, ownerAccess.secret);
    } catch (e) {
      pushToast(e.message || "Erreur lors de la suppression", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Abonnement</h3>
        <button onClick={() => fetchShops(ownerAccess.email, ownerAccess.secret)} disabled={loading} className="gb-focus text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--paper-dim)" }}>
          {loading ? "…" : "Actualiser"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard icon={Store} label="Boutiques" value={totals.total} dark />
        <StatCard icon={Gift} label="En essai" value={totals.trial} />
        <StatCard icon={ShieldCheck} label="Abonnées" value={totals.paid} />
      </div>

      <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "var(--paper-dim)" }}>
        <ShieldCheck size={14} className="shrink-0 mt-0.5" color="#1CA857" />
        <p className="text-[11px] opacity-70">Cette vue est connectée au serveur — elle liste <strong>toutes les boutiques créées sur tous les appareils</strong>, pas seulement celui-ci.</p>
      </div>

      <h3 className="font-display font-bold text-base mb-2">Toutes les boutiques ({(allShops || []).length})</h3>
      <div className="flex flex-col gap-2.5">
        {(allShops || []).map((s) => {
          const typeLabel = ESTABLISHMENT_TYPES.find((t) => t.id === s.type)?.label || "";
          const sub = s.subscription || {};
          const isTrial = sub.isTrial;
          const isPaid = sub.status === "active" && !isTrial;
          const label = isTrial ? "ESSAI" : isPaid ? "PAYANT" : "AUCUN";
          const color = isTrial ? "var(--cap)" : isPaid ? "#1CA857" : "var(--danger)";
          return (
            <div key={s.id} className="rounded-2xl p-3.5 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Store size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="text-xs opacity-50">{typeLabel} · {s.currency} · créée le {new Date(s.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold shrink-0 text-white" style={{ background: color }}>{label}</span>
              </div>
              {sub.plan && (
                <div className="text-[10px] font-mono opacity-40">
                  Plan : {isTrial ? "Essai gratuit" : (ACTIVATION_PLANS.find((p) => p.id === sub.plan)?.label || sub.plan)}
                  {sub.expiresAt ? ` · expire le ${new Date(sub.expiresAt).toLocaleDateString("fr-FR")}` : ""}
                </div>
              )}
              {isPaid && sub.code && (
                <div className="text-[10px] font-mono opacity-60 mt-0.5">Code d'activation : {sub.code.match(/.{1,4}/g)?.join("-")}</div>
              )}
              {s.join_code && <div className="text-[10px] font-mono opacity-40 mt-0.5">Code d'invitation : {s.join_code}</div>}
              <button onClick={() => deleteShop(s.id, s.name)} className="gb-focus w-full mt-2.5 rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: "#FCEBE8", color: "var(--danger)" }}>
                <Trash2 size={12} /> Supprimer cette boutique
              </button>
            </div>
          );
        })}
        {(!allShops || allShops.length === 0) && !loading && <p className="text-sm opacity-50 text-center py-6">Aucune boutique enregistrée sur le serveur.</p>}
      </div>
    </div>
  );
}

function LicenseSection({ license, licenseStatus, onActivate, pushToast }) {
  const [showRenew, setShowRenew] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const plan = ACTIVATION_PLANS.find((p) => p.id === license?.planId);
  const daysLeft = license && !license.lifetime && license.expiresAt ? Math.ceil((new Date(license.expiresAt) - Date.now()) / MS_DAY) : null;

  const STATUS_META = {
    lifetime: { label: "Licence à vie", color: "#1CA857" },
    active: { label: "Licence active", color: "#1CA857" },
    expiring: { label: "Expire bientôt", color: "var(--cap)" },
    expired: { label: "Licence expirée", color: "var(--danger)" },
    none: { label: "Non activée", color: "var(--danger)" },
  };
  const meta = STATUS_META[licenseStatus] || STATUS_META.none;

  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Licence de l'application</h3>
      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--glass)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
            <span className="text-xs font-semibold text-white">{meta.label}</span>
          </div>
          {licenseStatus !== "lifetime" && (
            <button onClick={() => setShowPricing(true)} className="gb-focus flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-transform" style={{ background: "var(--cap)", color: "var(--glass)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
              🛒 Acheter une licence
            </button>
          )}
        </div>
        <p className="font-display font-bold text-lg text-white">{license?.lifetime ? "Accès à vie" : plan ? plan.label : "Essai gratuit"}</p>
        {!license?.lifetime && daysLeft !== null && (
          <p className="text-white/60 text-xs mt-1">{daysLeft >= 0 ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}` : `Expirée depuis ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? "s" : ""}`}</p>
        )}
        {license?.activatedAt && <p className="text-white/40 text-[11px] mt-2">Activée le {new Date(license.activatedAt).toLocaleDateString("fr-FR")}</p>}
      </div>

      {licenseStatus === "expired" && (
        <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "#FCEBE8" }}>
          <AlertTriangle size={16} color="var(--danger)" className="shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: "var(--danger)" }}>Votre licence est expirée. Les nouvelles ventes sont bloquées jusqu'au renouvellement — le reste de l'application reste accessible.</p>
        </div>
      )}

      <button onClick={() => setShowRenew(true)} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm text-white" style={{ background: "var(--glass)" }}>
        {licenseStatus === "expired" || licenseStatus === "none" ? "Activer un nouveau code" : "Entrer un code pour prolonger"}
      </button>

      {showRenew && <RenewLicenseModal onActivate={onActivate} onClose={() => setShowRenew(false)} pushToast={pushToast} />}
      {showPricing && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-print">
          <PricingScreen registeredAdmin={null} onClose={() => setShowPricing(false)} pushToast={pushToast} />
        </div>
      )}

      <div className="mt-5 rounded-2xl border p-3.5" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <p className="text-xs font-semibold opacity-60 mb-2">Plans disponibles</p>
        {ACTIVATION_PLANS.map((p) => (
          <div key={p.id} className="flex justify-between text-xs py-1">
            <span className="opacity-70">{p.label}</span>
            <span className="font-mono opacity-40">Code {p.code}-XXXXXXXXX-X</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminScreen({
  shop, saveShopMeta, shops, activeShopId, onSwitchShop, onCreateShop, onDeleteShop,
  products, saveProducts, categories, saveCategories, movements, saveMovements, inventories, saveInventories, sales, saveSales, suppliers, saveSuppliers, expenses, saveExpenses, vendors, saveVendors, clients, saveClients,
  license, licenseStatus, onActivateLicense, onRestoreBackup, ownerAccess, onVerifyOwner, pushToast,
  menuOpen, setMenuOpen,
}) {
  const [section, setSection] = useState("stats");
  const activeSection = ADMIN_SECTIONS.find((s) => s.id === section);
  return (
    <div className="px-4 pt-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMenuOpen(true)} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Ouvrir le menu d'administration">
            <ClipboardList size={16} />
          </button>
          <div>
            <h2 className="font-display font-bold text-lg leading-none">Administration</h2>
            <p className="text-xs opacity-50 mt-1 flex items-center gap-1">
              {activeSection?.Icon && <activeSection.Icon size={12} />} {activeSection?.label}
            </p>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[80] flex no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative w-64 max-w-[80%] h-full flex flex-col gb-slide-in-left" style={{ background: "var(--glass)" }}>
            <div className="flex items-center gap-2.5 px-4 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--cap)" }}>
                <Store size={16} color="var(--glass)" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{shop.name}</p>
                <p className="text-white/50 text-[11px]">Administration</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto gb-scroll py-2 px-2.5">
              {ADMIN_SECTIONS.map((s, i) => (
                <div key={s.id}>
                  {s.group && ADMIN_SECTIONS[i - 1]?.group !== s.group && (
                    <p className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>{s.group.toUpperCase()}</p>
                  )}
                  <button
                    onClick={() => { setSection(s.id); setMenuOpen(false); }}
                    className="gb-focus w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left mb-0.5"
                    style={{ background: section === s.id ? "var(--cap)" : "transparent", color: section === s.id ? "var(--glass)" : "rgba(255,255,255,0.85)" }}
                  >
                    <s.Icon size={16} color={section === s.id ? "var(--glass)" : "rgba(255,255,255,0.75)"} />
                    <span className="text-sm" style={{ fontWeight: section === s.id ? 600 : 400 }}>{s.label}</span>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setMenuOpen(false)} className="gb-focus flex items-center gap-2.5 px-3 py-3 mx-2.5 mb-3 rounded-xl" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <X size={15} color="rgba(255,255,255,0.6)" />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Fermer</span>
            </button>
          </div>
        </div>
      )}

      {section === "etablissement" && <EstablishmentSection shop={shop} saveShopMeta={saveShopMeta} pushToast={pushToast} />}
      {section === "securite" && <SecuritySection shop={shop} saveShopMeta={saveShopMeta} pushToast={pushToast} />}
      {section === "abonnement" && <SubscriptionSection ownerAccess={ownerAccess} onVerifyOwner={onVerifyOwner} pushToast={pushToast} />}
      {section === "assistance" && <SupportInboxSection ownerAccess={ownerAccess} onVerifyOwner={onVerifyOwner} pushToast={pushToast} />}
      {section === "licence" && <LicenseSection license={license} licenseStatus={licenseStatus} onActivate={onActivateLicense} pushToast={pushToast} />}
      {section === "boutiques" && <BoutiquesSection shops={shops} activeShopId={activeShopId} onSwitchShop={onSwitchShop} onCreateShop={onCreateShop} onDeleteShop={onDeleteShop} pushToast={pushToast} />}
      {section === "stats" && <StatsSection shop={shop} products={products} sales={sales} expenses={expenses} />}
      {section === "inventaire" && <InventorySection products={products} saveProducts={saveProducts} categories={categories} movements={movements} saveMovements={saveMovements} inventories={inventories} saveInventories={saveInventories} author="Administrateur" pushToast={pushToast} />}
      {section === "produits" && <ProductsSection products={products} saveProducts={saveProducts} categories={categories} movements={movements} saveMovements={saveMovements} author="Administrateur" pushToast={pushToast} />}
      {section === "categories" && <CategoriesSection categories={categories} saveCategories={saveCategories} products={products} pushToast={pushToast} />}
      {section === "fournisseurs" && <SuppliersSection suppliers={suppliers} saveSuppliers={saveSuppliers} expenses={expenses} products={products} />}
      {section === "depenses" && <ExpensesSection expenses={expenses} saveExpenses={saveExpenses} suppliers={suppliers} />}
      {section === "vendeurs" && <VendorsSection vendors={vendors} saveVendors={saveVendors} pushToast={pushToast} adminPin={shop.adminPin} adminPinHash={shop.adminPinHash} backendLinked={shop.backendLinked} />}
      {section === "clients" && <ClientsSection clients={clients} saveClients={saveClients} sales={sales} shop={shop} pushToast={pushToast} />}
      {section === "donnees" && (
        <DataSection
          shop={shop}
          data={{ products, sales, categories, suppliers, expenses, movements, inventories, clients, vendors }}
          onRestore={onRestoreBackup}
          pushToast={pushToast}
        />
      )}
    </div>
  );
}

const SUPPORT_FAQ = [
  { q: "J'ai oublié mon code PIN, comment le récupérer ?", a: "Contacte l'administrateur via ce chat en indiquant le nom de ta boutique — il pourra vérifier ton identité et te renvoyer ton code." },
  { q: "Comment ajouter un produit ?", a: "Va dans Admin → Produits → Ajouter, renseigne le nom, le code-barre, la catégorie et les prix." },
  { q: "L'application ne se synchronise pas, que faire ?", a: "Vérifie ta connexion internet, puis appuie sur le badge ⏳ en haut de l'écran pour forcer une synchronisation manuelle." },
  { q: "Comment inviter un vendeur sur son propre téléphone ?", a: "Dans Admin → Boutiques, partage le code d'invitation à 7 caractères affiché sous le nom de ta boutique." },
  { q: "Comment changer la devise de ma boutique ?", a: "Va dans Admin → Établissement, la devise peut être modifiée à tout moment." },
];

function SupportChatWidget({ shop }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(() => (localStorage.getItem("support_started") === "true" ? "thread" : "faq"));
  const [openFaq, setOpenFaq] = useState(null);
  const [name, setName] = useState(() => localStorage.getItem("support_name") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("support_phone") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("support_email") || "");
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const beat = () => api.supportHeartbeat({ name, phone, email, shopName: shop?.name }).catch(() => {});
    beat();
    const hbInterval = setInterval(beat, 20000);
    let pollInterval;
    if (stage === "thread") {
      const poll = () => api.supportPoll().then((d) => setThread(d.messages)).catch(() => {});
      poll();
      pollInterval = setInterval(poll, 5000);
    }
    return () => { clearInterval(hbInterval); if (pollInterval) clearInterval(pollInterval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage]);

  const submitContact = async () => {
    if (!name.trim() || !phone.trim() || !message.trim()) return;
    setSending(true);
    try {
      await api.supportSend({ name: name.trim(), phone: phone.trim(), email: email.trim(), shopName: shop?.name, message: message.trim() });
      localStorage.setItem("support_name", name.trim());
      localStorage.setItem("support_phone", phone.trim());
      localStorage.setItem("support_email", email.trim());
      localStorage.setItem("support_started", "true");
      setMessage("");
      setStage("thread");
    } catch { /* réessai possible, on reste sur le formulaire */ }
    setSending(false);
  };

  const sendMore = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.supportSend({ name, phone, email, shopName: shop?.name, message: message.trim() });
      setMessage("");
      const d = await api.supportPoll();
      setThread(d.messages);
    } catch { /* hors-ligne — réessayer plus tard */ }
    setSending(false);
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="gb-focus fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--glass)", boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }} aria-label="Assistance">
          <MessageCircle size={24} color="#fff" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-3 pb-3 no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[420px] rounded-3xl overflow-hidden flex flex-col gb-pop" style={{ background: "var(--paper)", maxHeight: "80vh" }}>
            <div className="px-4 py-3.5 flex items-center justify-between shrink-0" style={{ background: "var(--glass)" }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} color="#fff" />
                <p className="text-white font-semibold text-sm">Assistance</p>
              </div>
              <button onClick={() => setOpen(false)} className="gb-focus text-white/70"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto gb-scroll p-4 flex flex-col">
              {stage === "faq" && (
                <>
                  <p className="text-xs opacity-50 mb-3">Questions fréquentes</p>
                  <div className="flex flex-col gap-2 mb-4">
                    {SUPPORT_FAQ.map((item, i) => (
                      <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
                        <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="gb-focus w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between gap-2" style={{ background: "var(--card)" }}>
                          <span>{item.q}</span>
                          <ChevronDown size={14} className="shrink-0" style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                        </button>
                        {openFaq === i && <div className="px-3 py-2.5 text-xs opacity-70" style={{ background: "var(--paper-dim)" }}>{item.a}</div>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setStage("form")} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>
                    Je n'ai pas trouvé ma réponse
                  </button>
                </>
              )}

              {stage === "form" && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs opacity-60 mb-1">Renseigne tes coordonnées, l'administrateur te répondra ici dès que possible.</p>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optionnel)" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ton message…" rows={3} className="gb-focus rounded-xl px-3 py-2 text-sm border resize-none" style={{ borderColor: "var(--line)" }} />
                  <button onClick={submitContact} disabled={sending} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--glass)" }}>
                    {sending ? "Envoi…" : "Envoyer"}
                  </button>
                  <button onClick={() => setStage("faq")} className="gb-focus text-xs opacity-50 underline self-center">Retour aux questions fréquentes</button>
                </div>
              )}

              {stage === "thread" && (
                <div className="flex flex-col gap-2">
                  <div className="rounded-xl p-3 mb-1 text-xs" style={{ background: "var(--paper-dim)" }}>
                    ✓ Message envoyé. L'administrateur te répondra ici dès que possible.
                  </div>
                  {thread.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl px-3 py-2 text-sm max-w-[85%]"
                      style={{
                        background: m.sender === "owner" ? "var(--glass)" : "var(--card)",
                        color: m.sender === "owner" ? "#fff" : "var(--ink)",
                        alignSelf: m.sender === "owner" ? "flex-start" : "flex-end",
                        border: m.sender === "owner" ? "none" : "1px solid var(--line)",
                      }}
                    >
                      {m.body}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {stage === "thread" && (
              <div className="p-3 flex gap-2 border-t shrink-0" style={{ borderColor: "var(--line)" }}>
                <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMore()} placeholder="Écrire un message…" className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
                <button onClick={sendMore} disabled={sending} className="gb-focus px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--glass)" }}>Envoyer</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function GlobalSearchModal({ products, clients, categories, role, onClose }) {
  const fmt = useFmt();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const matchedProducts = q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q)).slice(0, 8) : [];
  const matchedClients = q && role === "admin" ? (clients || []).filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 8) : [];
  const hasResults = matchedProducts.length > 0 || matchedClients.length > 0;

  return (
    <div className="fixed inset-0 z-[85] flex flex-col no-print" style={{ background: "var(--paper)" }}>
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5 sticky top-0" style={{ background: "var(--paper)" }}>
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--paper-dim)" }}>
          <Search size={16} className="opacity-50" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit, un client…" className="bg-transparent outline-none text-sm flex-1 min-w-0" />
        </div>
        <button onClick={onClose} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto gb-scroll px-4 pb-6">
        {!q && <p className="text-sm opacity-40 text-center py-10">Tape un nom de produit{role === "admin" ? " ou de client" : ""}…</p>}
        {q && !hasResults && <p className="text-sm opacity-40 text-center py-10">Aucun résultat pour "{query}".</p>}

        {matchedProducts.length > 0 && (
          <>
            <p className="text-[11px] font-semibold opacity-50 mb-2 mt-2">Produits</p>
            <div className="flex flex-col gap-2 mb-5">
              {matchedProducts.map((p) => (
                <div key={p.id} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: p.stock <= p.minStock ? "var(--danger)" : "var(--line)", background: "var(--card)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={p.category} categories={categories} size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[11px] opacity-50 font-mono">{fmt(p.price)} · stock {p.stock}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {matchedClients.length > 0 && (
          <>
            <p className="text-[11px] font-semibold opacity-50 mb-2">Clients</p>
            <div className="flex flex-col gap-2">
              {matchedClients.map((c) => (
                <div key={c.id} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Users size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[11px] opacity-50 font-mono">{c.phone || "Pas de téléphone"}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] opacity-40 mt-3">Ouvre Admin → Clients pour voir la fiche complète.</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- App racine ---------- */

const TABS = {
  vendeur: [{ id: "sell", label: "Vendre", Icon: ScanLine }, { id: "stock", label: "Stock", Icon: Boxes }, { id: "credits", label: "Crédits", Icon: CreditCard }, { id: "history", label: "Historique", Icon: History }],
  admin: [{ id: "sell", label: "Vendre", Icon: ScanLine }, { id: "stock", label: "Stock", Icon: Boxes }, { id: "credits", label: "Crédits", Icon: CreditCard }, { id: "history", label: "Historique", Icon: History }, { id: "admin", label: "Admin", Icon: ShieldCheck }],
};

export default function App() {
  const [role, setRole] = useState(null);
  const [currentVendorName, setCurrentVendorName] = useState("");
  const [view, setView] = useState("sell");

  useEffect(() => {
    if (role) window.storage.set("sessionView", JSON.stringify(view)).catch(() => {});
  }, [view, role]);
  const [shops, setShops] = useState(undefined); // undefined = chargement, [] = aucune boutique (configuration requise)
  const [activeShopId, setActiveShopId] = useState(null);
  const [products, setProducts] = useState(null);
  const [sales, setSales] = useState(null);
  const [vendors, setVendors] = useState(null);
  const [suppliers, setSuppliers] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [categories, setCategories] = useState(null);
  const [movements, setMovements] = useState(null);
  const [inventories, setInventories] = useState(null);
  const [clients, setClients] = useState(null);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [license, setLicense] = useState(undefined); // undefined = chargement, null = jamais activée
  const [trialUsed, setTrialUsed] = useState(false);
  const [ownerAccess, setOwnerAccess] = useState(null); // null = non vérifié, string (email) = vérifié
  const [homeScreenActive, setHomeScreenActive] = useState(false);

  useEffect(() => {
    window.storage.set("homeScreenActive", JSON.stringify(homeScreenActive)).catch(() => {});
  }, [homeScreenActive]);
  const [showRenewBanner, setShowRenewBanner] = useState(false);

  useEffect(() => {
    (async () => {
      const loadedShops = await loadKey("shops", []);
      let loadedLicense = null;
      try { const r = await window.storage.get("license"); loadedLicense = JSON.parse(r.value); } catch { loadedLicense = null; }
      let loadedTrialUsed = false;
      try { const r = await window.storage.get("trialUsed"); loadedTrialUsed = JSON.parse(r.value); } catch { loadedTrialUsed = false; }
      let loadedOwnerAccess = null;
      try { const r = await window.storage.get("ownerAccess"); loadedOwnerAccess = JSON.parse(r.value); } catch { loadedOwnerAccess = null; }
      setLicense(loadedLicense);
      setTrialUsed(!!loadedTrialUsed);
      setOwnerAccess(loadedOwnerAccess);
      if (loadedShops.length === 0) { setShops([]); return; }
      let storedActiveId = null;
      try { const r = await window.storage.get("activeShopId"); storedActiveId = JSON.parse(r.value); } catch { storedActiveId = null; }
      const activeId = loadedShops.some((s) => s.id === storedActiveId) ? storedActiveId : loadedShops[0].id;
      const data = await loadShopData(activeId);
      setShops(loadedShops);
      setActiveShopId(activeId);
      api.setActiveShop(activeId);
      setPendingSync(api.getPendingCount(activeId));
      setProducts(data.products); setSales(data.sales); setVendors(data.vendors); setSuppliers(data.suppliers); setExpenses(data.expenses); setCategories(data.categories); setMovements(data.movements); setInventories(data.inventories); setClients(data.clients);
      let storedRole = null;
      try { const r = await window.storage.get("sessionRole"); storedRole = JSON.parse(r.value); } catch { storedRole = null; }
      if (storedRole) {
        let storedVendorName = "";
        try { const r = await window.storage.get("sessionVendorName"); storedVendorName = JSON.parse(r.value); } catch { storedVendorName = ""; }
        let storedView = "sell";
        try { const r = await window.storage.get("sessionView"); storedView = JSON.parse(r.value) || "sell"; } catch { storedView = "sell"; }
        setRole(storedRole);
        setCurrentVendorName(storedVendorName);
        setView(storedRole === "admin" ? storedView : (storedView === "admin" ? "sell" : storedView));
      }
      let storedHomeActive = false;
      try { const r = await window.storage.get("homeScreenActive"); storedHomeActive = JSON.parse(r.value); } catch { storedHomeActive = false; }
      if (storedHomeActive) setHomeScreenActive(true);
    })();
  }, []);

  const licenseStatus = computeLicenseStatus(license);

  const handleVerifyOwner = (credentials) => {
    setOwnerAccess(credentials);
    window.storage.set("ownerAccess", JSON.stringify(credentials)).catch(() => {});
  };

  const handleActivateLicense = async (code) => {
    try {
      const data = await api.activateLicense({ code, shopName: shop?.name });
      const next = {
        code,
        planId: data.plan,
        lifetime: !!data.lifetime,
        activatedAt: new Date().toISOString(),
        expiresAt: data.expires_at || null,
      };
      setLicense(next);
      window.storage.set("license", JSON.stringify(next)).catch(() => {});
      if (shop?.backendLinked) api.syncLicenseToShop(next).catch(() => {});
      const planLabel = ACTIVATION_PLANS.find((p) => p.id === data.plan)?.label || data.plan;
      pushToast(data.lifetime ? "Licence à vie activée !" : `Licence activée — ${planLabel}`, "ok");
    } catch (e) {
      pushToast(e.message || "Code invalide", "error");
    }
  };

  const handleStartTrial = async () => {
    try {
      await api.startTrialBackend();
    } catch (e) {
      pushToast(e.message || "Impossible de démarrer l'essai pour le moment. Réessayez.", "error");
      return;
    }
    const next = { code: null, planId: "trial", lifetime: false, activatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + TRIAL_DAYS * MS_DAY).toISOString() };
    setLicense(next);
    setTrialUsed(true);
    window.storage.set("license", JSON.stringify(next)).catch(() => {});
    window.storage.set("trialUsed", JSON.stringify(true)).catch(() => {});
    pushToast(`Essai gratuit démarré — ${TRIAL_DAYS} jours`, "ok");
  };

  const dataReady = license !== undefined && shops !== undefined && (shops.length === 0 || (products !== null && categories !== null && movements !== null && inventories !== null && clients !== null));

  useEffect(() => {
    if (!license || license.lifetime) return;
    (async () => {
      try {
        const data = await api.checkLicense();
        if (data.status === "none") return; // pas encore connu du serveur (ex: essai local) — on ne touche à rien
        if (data.status === "expired" && licenseStatus !== "expired") {
          setLicense((l) => (l ? { ...l, expiresAt: data.expires_at } : l));
        }
      } catch { /* pas de connexion — on garde l'état local tel quel */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license?.code]);
  const shop = shops && activeShopId ? shops.find((s) => s.id === activeShopId) : null;

  // Auto-réparation silencieuse : si une boutique connectée n'a pas (ou plus) son
  // code d'invitation en local (ex: séquelle d'une ancienne reconnexion), on va le
  // rechercher sur le serveur une fois, sans rien demander à l'utilisateur.
  useEffect(() => {
    if (!shop?.backendLinked || shop.joinCode || !activeShopId) return;
    api.getShopInfo()
      .then((info) => {
        if (!info?.join_code) return;
        const nextShops = shops.map((s) => (s.id === activeShopId ? { ...s, joinCode: info.join_code } : s));
        setShops(nextShops);
        window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.backendLinked, shop?.joinCode, activeShopId]);

  // Auto-réparation silencieuse : le code administrateur et les codes vendeurs
  // sont vérifiés localement (pas d'appel serveur à chaque connexion), donc si
  // la copie locale d'un appareil dérive de celle du serveur (ex: séquelle
  // d'une ancienne session interrompue), l'appareil ne se corrigeait jamais
  // tout seul. On relit shopMeta et vendors une fois au chargement de la
  // boutique et on met à jour la copie locale si elle diffère.
  useEffect(() => {
    if (!shop?.backendLinked || !activeShopId) return;
    let cancelled = false;
    (async () => {
      try {
        const [freshMeta, freshVendors] = await Promise.all([
          api.pullKey("shopMeta", activeShopId),
          api.pullKey("vendors", activeShopId),
        ]);
        if (cancelled) return;
        if (freshMeta && freshMeta.adminPinHash) {
          setShops((prevShops) => {
            const current = (prevShops || []).find((s) => s.id === activeShopId);
            if (!current || current.adminPinHash === freshMeta.adminPinHash) return prevShops;
            const nextShops = prevShops.map((s) => (s.id === activeShopId ? { ...s, ...freshMeta } : s));
            window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
            return nextShops;
          });
        }
        if (Array.isArray(freshVendors)) {
          setVendors((prevVendors) => {
            if (JSON.stringify(prevVendors) === JSON.stringify(freshVendors)) return prevVendors;
            window.storage.set(`vendors:${activeShopId}`, JSON.stringify(freshVendors)).catch(() => {});
            return freshVendors;
          });
        }
      } catch { /* silencieux : best-effort, on retentera au prochain chargement */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.backendLinked, activeShopId]);

  // Synchronise rétroactivement vers le serveur un essai gratuit déjà en cours
  // localement (ex: démarré avant que cette vérification n'existe) — silencieux,
  // sans conséquence si le serveur le connaît déjà.
  useEffect(() => {
    if (license?.planId === "trial") {
      api.startTrialBackend().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license?.planId]);


  const pushToast = (message, type = "ok") => { setToast({ message, type }); setTimeout(() => setToast(null), 2200); };

  const getLocalValue = (key) => {
    switch (key) {
      case "shopMeta": return shop ? { name: shop.name, type: shop.type, currency: shop.currency, adminPinHash: shop.adminPinHash, theme: shop.theme, darkMode: shop.darkMode, soundsEnabled: shop.soundsEnabled, loyaltyThreshold: shop.loyaltyThreshold, language: shop.language } : {};
      case "vendors": return vendors;
      case "products": return products;
      case "sales": return sales;
      case "categories": return categories;
      case "suppliers": return suppliers;
      case "expenses": return expenses;
      case "movements": return movements;
      case "inventories": return inventories;
      case "clients": return clients;
      default: return null;
    }
  };
  const trySync = (verbose) => {
    if (shop?.backendLinked) {
      api.flushSyncQueue(getLocalValue).then((result) => {
        setPendingSync(api.getPendingCount());
        if (verbose) {
          if (result.lastError) pushToast(`Erreur de synchro : ${result.lastError}`, "error");
          else if (result.remaining === 0) pushToast("Synchronisation à jour ✓", "ok");
          else pushToast(`${result.synced} synchronisé(s), ${result.remaining} en attente`, "ok");
        }
      }).catch((e) => { if (verbose) pushToast(`Erreur : ${e.message}`, "error"); });
    }
  };

  useEffect(() => {
    if (!shop?.backendLinked) return;
    setPendingSync(api.getPendingCount());
    trySync();
    const onOnline = () => trySync();
    window.addEventListener("online", onOnline);
    const interval = setInterval(trySync, 25000);
    return () => { window.removeEventListener("online", onOnline); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.backendLinked, activeShopId]);

  const saveProducts = (next) => { setProducts(next); window.storage.set(`products:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("products"); setPendingSync(api.getPendingCount()); api.syncKeyNow("products", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveSales = (next) => { setSales(next); window.storage.set(`sales:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("sales"); setPendingSync(api.getPendingCount()); api.syncKeyNow("sales", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveVendors = (next) => { setVendors(next); window.storage.set(`vendors:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("vendors"); setPendingSync(api.getPendingCount()); api.syncKeyNow("vendors", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveSuppliers = (next) => { setSuppliers(next); window.storage.set(`suppliers:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("suppliers"); setPendingSync(api.getPendingCount()); api.syncKeyNow("suppliers", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveExpenses = (next) => { setExpenses(next); window.storage.set(`expenses:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("expenses"); setPendingSync(api.getPendingCount()); api.syncKeyNow("expenses", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveCategories = (next) => { setCategories(next); window.storage.set(`categories:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("categories"); setPendingSync(api.getPendingCount()); api.syncKeyNow("categories", next).then(() => setPendingSync(api.getPendingCount())); } pushToast("Catégories mises à jour", "ok"); };
  const saveMovements = (next) => { setMovements(next); window.storage.set(`movements:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("movements"); setPendingSync(api.getPendingCount()); api.syncKeyNow("movements", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveClients = (next) => { setClients(next); window.storage.set(`clients:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("clients"); setPendingSync(api.getPendingCount()); api.syncKeyNow("clients", next).then(() => setPendingSync(api.getPendingCount())); } };
  const onCreateClient = (name) => {
    const newClient = { id: uid(), name, phone: "", notes: "", loyaltyRedeemed: 0 };
    saveClients([...clients, newClient]);
    return newClient.id;
  };
  const saveInventories = (next) => { setInventories(next); window.storage.set(`inventories:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("inventories"); setPendingSync(api.getPendingCount()); api.syncKeyNow("inventories", next).then(() => setPendingSync(api.getPendingCount())); } };

  const saveShopMeta = (next) => {
    const nextShops = shops.map((s) => (s.id === activeShopId ? next : s));
    setShops(nextShops);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => pushToast("Erreur de sauvegarde", "error"));
    if (next.backendLinked) {
      api.markDirty("shopMeta");
      setPendingSync(api.getPendingCount());
      const metaPayload = { name: next.name, type: next.type, currency: next.currency, adminPinHash: next.adminPinHash, theme: next.theme, darkMode: next.darkMode, soundsEnabled: next.soundsEnabled, loyaltyThreshold: next.loyaltyThreshold, language: next.language };
      api.syncKeyNow("shopMeta", metaPayload).then(() => setPendingSync(api.getPendingCount()));
    }
    pushToast("Boutique mise à jour", "ok");
  };

  const handleOnboardingComplete = async (shopMeta, vendor) => {
    const newShop = { salesNotificationsEnabled: true, theme: "emeraude", darkMode: false, soundsEnabled: true, ...shopMeta };
    const nextShops = [newShop];
    setShops(nextShops);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
    window.storage.set("activeShopId", JSON.stringify(newShop.id)).catch(() => {});
    await seedShopData(newShop.id, vendor);
    setActiveShopId(newShop.id);
    api.setActiveShop(newShop.id);
    setProducts(SEED_PRODUCTS); setSales([]); setVendors([vendor]); setSuppliers(SEED_SUPPLIERS); setExpenses([]); setCategories(SEED_CATEGORIES); setMovements([]); setInventories([]); setClients([]);
    if (newShop.backendLinked) {
      const keys = ["shopMeta", "vendors", "products", "sales", "categories", "suppliers", "expenses", "movements", "inventories", "clients", "shopLicense"];
      keys.forEach(api.markDirty);
      const initialValues = {
        shopMeta: { name: newShop.name, type: newShop.type, currency: newShop.currency, adminPinHash: newShop.adminPinHash, theme: newShop.theme, darkMode: newShop.darkMode, soundsEnabled: newShop.soundsEnabled, loyaltyThreshold: newShop.loyaltyThreshold, language: newShop.language },
        vendors: [vendor],
        products: SEED_PRODUCTS, sales: [], categories: SEED_CATEGORIES, suppliers: SEED_SUPPLIERS,
        expenses: [], movements: [], inventories: [], clients: [],
        shopLicense: license,
      };
      try {
        const result = await api.flushSyncQueue((key) => initialValues[key]);
        setPendingSync(api.getPendingCount());
        if (result.remaining > 0) {
          pushToast("Boutique créée, mais la synchronisation initiale est incomplète — vérifie ta connexion et appuie sur le badge ⏳ en haut.", "error");
        }
      } catch { /* le badge ⏳ restera visible, la synchro en arrière-plan prendra le relais */ }
    }
    pushToast(`Bienvenue, ${newShop.name} !`, "ok");
    setHomeScreenActive(false);
  };

  const handleJoinShopComplete = async (shopObj, pulled, autoRole, autoVendorName, shopLicense) => {
    const newShop = { salesNotificationsEnabled: true, theme: "emeraude", darkMode: false, soundsEnabled: true, ...shopObj };
    const nextShops = [...shops, newShop];
    const products = pulled.products || SEED_PRODUCTS;
    const salesData = pulled.sales || [];
    const vendorsData = pulled.vendors || [];
    const categoriesData = pulled.categories || SEED_CATEGORIES;
    const suppliersData = pulled.suppliers || SEED_SUPPLIERS;
    const expensesData = pulled.expenses || [];
    const movementsData = pulled.movements || [];
    const inventoriesData = pulled.inventories || [];
    const clientsData = pulled.clients || [];
    setShops(nextShops);
    api.setActiveShop(newShop.id);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
    window.storage.set("activeShopId", JSON.stringify(newShop.id)).catch(() => {});
    await Promise.all([
      window.storage.set(`products:${newShop.id}`, JSON.stringify(products)),
      window.storage.set(`sales:${newShop.id}`, JSON.stringify(salesData)),
      window.storage.set(`vendors:${newShop.id}`, JSON.stringify(vendorsData)),
      window.storage.set(`categories:${newShop.id}`, JSON.stringify(categoriesData)),
      window.storage.set(`suppliers:${newShop.id}`, JSON.stringify(suppliersData)),
      window.storage.set(`expenses:${newShop.id}`, JSON.stringify(expensesData)),
      window.storage.set(`movements:${newShop.id}`, JSON.stringify(movementsData)),
      window.storage.set(`inventories:${newShop.id}`, JSON.stringify(inventoriesData)),
      window.storage.set(`clients:${newShop.id}`, JSON.stringify(clientsData)),
    ]).catch(() => {});
    setActiveShopId(newShop.id);
    setProducts(products); setSales(salesData); setVendors(vendorsData); setSuppliers(suppliersData);
    setExpenses(expensesData); setCategories(categoriesData); setMovements(movementsData); setInventories(inventoriesData); setClients(clientsData);
    if (shopLicense) {
      setLicense(shopLicense);
      window.storage.set("license", JSON.stringify(shopLicense)).catch(() => {});
      if (shopLicense.planId === "trial") { setTrialUsed(true); window.storage.set("trialUsed", JSON.stringify(true)).catch(() => {}); }
    }
    if (autoRole) {
      setRole(autoRole);
      setCurrentVendorName(autoVendorName || "Administrateur");
      setView("sell");
      pushToast(`Bon retour sur "${newShop.name}" !`, "ok");
    } else {
      pushToast(`Connecté à "${newShop.name}" !`, "ok");
    }
    setHomeScreenActive(false);
  };

  const handleCreateShop = async (newShop, vendor) => {
    // Création côté serveur d'abord : la boutique n'est ajoutée localement
    // qu'une fois la liaison de l'appareil confirmée. L'appareil peut être lié
    // à plusieurs boutiques, la boutique active n'est donc pas modifiée ici.
    let linkedShop = newShop;
    let linkedVendor = vendor;
    try {
      const backend = await api.createShopBackend({
        name: newShop.name, type: newShop.type, currency: newShop.currency,
      });
      linkedShop = {
        ...newShop,
        id: backend.shop_id,
        joinCode: backend.join_code,
        backendLinked: true,
        adminPinHash: api.hashPin(DEFAULT_ADMIN_PIN),
      };
      delete linkedShop.adminPin;
      linkedVendor = { id: vendor.id, name: vendor.name, pinHash: api.hashPin(vendor.pin), joinCode: generateShopJoinCode() };
    } catch (e) {
      pushToast(
        api.networkErrorText(e, "créer une boutique") || "Erreur lors de la création, réessayez.",
        "error",
      );
      return false;
    }

    const nextShops = [...shops, linkedShop];
    setShops(nextShops);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
    await seedShopData(linkedShop.id, linkedVendor);

    // Poussée initiale explicitement ciblée sur la nouvelle boutique, pour ne
    // pas détourner la synchronisation de la boutique actuellement ouverte.
    const initialValues = {
      shopMeta: {
        name: linkedShop.name, type: linkedShop.type, currency: linkedShop.currency,
        adminPinHash: linkedShop.adminPinHash, theme: linkedShop.theme,
        darkMode: linkedShop.darkMode, soundsEnabled: linkedShop.soundsEnabled,
        loyaltyThreshold: linkedShop.loyaltyThreshold, language: linkedShop.language,
      },
      vendors: [linkedVendor],
      products: SEED_PRODUCTS, sales: [], categories: SEED_CATEGORIES, suppliers: SEED_SUPPLIERS,
      expenses: [], movements: [], inventories: [], clients: [],
      shopLicense: license,
    };
    Object.keys(initialValues).forEach((k) => api.markDirty(k, linkedShop.id));
    try {
      const result = await api.flushSyncQueue((key) => initialValues[key], linkedShop.id);
      if (result.remaining > 0) {
        pushToast(`Boutique "${linkedShop.name}" créée, synchronisation initiale incomplète.`, "error");
        return true;
      }
    } catch { /* la synchro de fond reprendra la main */ }

    pushToast(`Boutique "${linkedShop.name}" créée`, "ok");
    return true;
  };

  const handleSwitchShop = async (shopId) => {
    if (shopId === activeShopId) return;
    const data = await loadShopData(shopId);
    setProducts(data.products); setSales(data.sales); setVendors(data.vendors); setSuppliers(data.suppliers); setExpenses(data.expenses); setCategories(data.categories); setMovements(data.movements); setInventories(data.inventories); setClients(data.clients);
    setActiveShopId(shopId);
    api.setActiveShop(shopId);
    setPendingSync(api.getPendingCount(shopId));
    window.storage.set("activeShopId", JSON.stringify(shopId)).catch(() => {});
    setRole(null); setCurrentVendorName(""); setCart([]); setView("sell"); setNotifications([]); setUnreadCount(0); setNotifPanelOpen(false);
    window.storage.delete("sessionRole").catch(() => {});
    window.storage.delete("sessionVendorName").catch(() => {});
    pushToast("Boutique changée", "ok");
  };

  const handleDeleteShop = async (shopId) => {
    if (shops.length <= 1) { pushToast("Vous devez garder au moins une boutique", "error"); return; }
    const nextShops = shops.filter((s) => s.id !== shopId);
    setShops(nextShops);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
    await Promise.all([
      safeDelete(`products:${shopId}`), safeDelete(`sales:${shopId}`), safeDelete(`vendors:${shopId}`),
      safeDelete(`suppliers:${shopId}`), safeDelete(`expenses:${shopId}`), safeDelete(`categories:${shopId}`), safeDelete(`movements:${shopId}`), safeDelete(`inventories:${shopId}`), safeDelete(`clients:${shopId}`),
    ]);
    // Retire aussi la liaison de l'appareil et la file d'attente de cette
    // boutique, sinon des clés orphelines resteraient en attente indéfiniment.
    api.unlinkShop(shopId);
    pushToast("Boutique supprimée", "ok");
    if (shopId === activeShopId) await handleSwitchShop(nextShops[0].id);
  };

  useEffect(() => {
    if (role === "admin" && products) {
      const n = products.filter((p) => p.stock <= p.minStock).length;
      if (n > 0) pushToast(`${n} produit${n > 1 ? "s" : ""} en stock bas`, "error");
    }
    if (role === "admin" && licenseStatus === "expiring" && license?.expiresAt) {
      const daysLeft = Math.ceil((new Date(license.expiresAt) - Date.now()) / MS_DAY);
      pushToast(`Licence expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`, "error");
    }
    if (role === "admin" && licenseStatus === "expired") {
      pushToast("Licence expirée — renouvelez pour continuer à encaisser", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Notifications de vente entre appareils : le vendeur et le propriétaire ont
  // chacun leur appareil, donc on détecte à distance les ventes, modifications
  // et suppressions faites sur l'autre appareil et on notifie ici. Les
  // modifications/suppressions ne peuvent venir que de l'administrateur — sur
  // l'appareil admin lui-même, l'action locale notifie déjà immédiatement
  // (voir handleUpdateSale/handleDeleteSale), donc on ne les redétecte pas ici
  // pour éviter un doublon.
  useEffect(() => {
    if (!role || !shop?.salesNotificationsEnabled || !activeShopId) return;
    let known = new Map((sales || []).map((s) => [s.id, { total: s.total, paymentMethod: s.paymentMethod }]));
    const interval = setInterval(async () => {
      try {
        const latest = await loadKey(`sales:${activeShopId}`, []);
        const latestMap = new Map(latest.map((s) => [s.id, s]));
        const newOnes = latest.filter((s) => !known.has(s.id) && s.vendor !== currentVendorName);
        const editedOnes = role !== "admin" ? latest.filter((s) => {
          const prev = known.get(s.id);
          return prev && (prev.total !== s.total || prev.paymentMethod !== s.paymentMethod);
        }) : [];
        const deletedIds = role !== "admin" ? [...known.keys()].filter((id) => !latestMap.has(id)) : [];

        if (newOnes.length > 0) {
          newOnes.forEach((s) => {
            pushToast(`Nouvelle vente : ${formatMoney(s.total, shop.currency)} par ${s.vendor}`, "ok");
          });
          setNotifications((prev) => [
            ...newOnes.map((s) => ({ id: s.id, vendor: s.vendor, total: s.total, date: s.date, paymentMethod: s.paymentMethod })),
            ...prev,
          ].slice(0, 30));
          setUnreadCount((c) => c + newOnes.length);
        }
        if (editedOnes.length > 0) {
          setNotifications((prev) => [
            ...editedOnes.map((s) => ({ id: `edit-${s.id}-${Date.now()}`, type: "sale_edited", receiptNumber: s.id.slice(0, 6).toUpperCase(), total: s.total, date: new Date().toISOString() })),
            ...prev,
          ].slice(0, 30));
          setUnreadCount((c) => c + editedOnes.length);
        }
        if (deletedIds.length > 0) {
          setNotifications((prev) => [
            ...deletedIds.map((id) => ({ id: `del-${id}-${Date.now()}`, type: "sale_deleted", receiptNumber: id.slice(0, 6).toUpperCase(), total: known.get(id)?.total, date: new Date().toISOString() })),
            ...prev,
          ].slice(0, 30));
          setUnreadCount((c) => c + deletedIds.length);
        }
        if (newOnes.length > 0 || editedOnes.length > 0 || deletedIds.length > 0) setSales(latest);
        known = new Map(latest.map((s) => [s.id, { total: s.total, paymentMethod: s.paymentMethod }]));
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [role, activeShopId, shop?.salesNotificationsEnabled, shop?.currency, currentVendorName]);

  // Rappel quotidien : essai gratuit en cours, et produits en stock bas
  useEffect(() => {
    if (role !== "admin" || !activeShopId) return;
    const todayKey = new Date().toDateString();

    if (license?.planId === "trial" && licenseStatus !== "expired") {
      const lastShown = localStorage.getItem(`notif_trial_${activeShopId}`);
      if (lastShown !== todayKey) {
        const daysLeft = license.expiresAt ? Math.max(0, Math.ceil((new Date(license.expiresAt) - Date.now()) / MS_DAY)) : 0;
        setNotifications((prev) => [{ id: `trial-${todayKey}`, type: "trial", daysLeft, date: new Date().toISOString() }, ...prev].slice(0, 30));
        setUnreadCount((c) => c + 1);
        localStorage.setItem(`notif_trial_${activeShopId}`, todayKey);
      }
    }

    if (products && products.length > 0) {
      const lastShownStock = localStorage.getItem(`notif_stock_${activeShopId}`);
      if (lastShownStock !== todayKey) {
        const lowStock = products.filter((p) => p.stock <= p.minStock);
        if (lowStock.length > 0) {
          setNotifications((prev) => [{ id: `stock-${todayKey}`, type: "lowstock", count: lowStock.length, names: lowStock.slice(0, 3).map((p) => p.name), date: new Date().toISOString() }, ...prev].slice(0, 30));
          setUnreadCount((c) => c + 1);
        }
        localStorage.setItem(`notif_stock_${activeShopId}`, todayKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, activeShopId, license?.planId, products]);

  const handleCheckout = (cartItems, total, paymentMethod, clientId, clientName, amountReceived) => {
    const nextProducts = products.map((p) => { const line = cartItems.find((i) => i.id === p.id); return line ? { ...p, stock: p.stock - line.qty } : p; });
    const sale = {
      id: uid(), date: new Date().toISOString(), items: cartItems, total, vendor: currentVendorName, paymentMethod, clientId: clientId || null, clientName: clientId ? clientName : undefined, paid: paymentMethod !== "credit",
      amountReceived: amountReceived ?? null,
      changeDue: amountReceived != null ? Math.max(0, amountReceived - total) : null,
    };
    saveProducts(nextProducts);
    saveSales([...sales, sale]);
    const saleMovements = cartItems.map((i) => {
      const before = i.product.stock;
      return { id: uid(), date: sale.date, productId: i.product.id, productName: i.product.name, type: "vente", delta: -i.qty, before, after: before - i.qty, author: currentVendorName, note: "" };
    });
    saveMovements([...saleMovements, ...movements]);
    setCart([]);
    setNotifications((prev) => [{ id: sale.id, vendor: sale.vendor, total: sale.total, date: sale.date, paymentMethod: sale.paymentMethod }, ...prev].slice(0, 30));
    setUnreadCount((c) => c + 1);
    pushToast("Vente enregistrée", "ok");
    return sale;
  };

  const handleRestoreBackup = (bundle) => {
    const next = {
      products: bundle.products || [],
      sales: bundle.sales || [],
      categories: bundle.categories || SEED_CATEGORIES,
      suppliers: bundle.suppliers || [],
      expenses: bundle.expenses || [],
      movements: bundle.movements || [],
      inventories: bundle.inventories || [],
      clients: bundle.clients || [],
      vendors: bundle.vendors || [],
    };
    setProducts(next.products); setSales(next.sales); setCategories(next.categories); setSuppliers(next.suppliers);
    setExpenses(next.expenses); setMovements(next.movements); setInventories(next.inventories); setClients(next.clients); setVendors(next.vendors);
    window.storage.set(`products:${activeShopId}`, JSON.stringify(next.products)).catch(() => {});
    window.storage.set(`sales:${activeShopId}`, JSON.stringify(next.sales)).catch(() => {});
    window.storage.set(`categories:${activeShopId}`, JSON.stringify(next.categories)).catch(() => {});
    window.storage.set(`suppliers:${activeShopId}`, JSON.stringify(next.suppliers)).catch(() => {});
    window.storage.set(`expenses:${activeShopId}`, JSON.stringify(next.expenses)).catch(() => {});
    window.storage.set(`movements:${activeShopId}`, JSON.stringify(next.movements)).catch(() => {});
    window.storage.set(`inventories:${activeShopId}`, JSON.stringify(next.inventories)).catch(() => {});
    window.storage.set(`clients:${activeShopId}`, JSON.stringify(next.clients)).catch(() => {});
    window.storage.set(`vendors:${activeShopId}`, JSON.stringify(next.vendors)).catch(() => {});
  };

  const handleSettleCredit = (saleId) => {
    const paidBy = role === "admin" ? "Administrateur" : currentVendorName;
    const paidDate = new Date().toISOString();
    const nextSales = sales.map((s) => (s.id === saleId ? { ...s, paid: true, paidBy, paidDate } : s));
    saveSales(nextSales);
    pushToast("Crédit encaissé", "ok");
    return nextSales.find((s) => s.id === saleId);
  };

  // Supprime une vente déjà enregistrée : restitue le stock vendu et journalise
  // l'annulation. Réservé à l'administrateur (contrôlé côté UI dans HistoryScreen).
  const handleDeleteSale = (saleId) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const nextProducts = products.map((p) => {
      const line = sale.items.find((i) => i.id === p.id);
      return line ? { ...p, stock: p.stock + line.qty } : p;
    });
    const cancelMovements = sale.items.map((i) => {
      const p = nextProducts.find((pp) => pp.id === i.id);
      const before = p ? p.stock - i.qty : 0;
      return { id: uid(), date: new Date().toISOString(), productId: i.id, productName: i.product?.name || "?", type: "ajustement", delta: i.qty, before, after: before + i.qty, author: currentVendorName || "Administrateur", note: "Suppression de vente" };
    });
    saveProducts(nextProducts);
    saveMovements([...cancelMovements, ...movements]);
    saveSales(sales.filter((s) => s.id !== saleId));
    setNotifications((prev) => [{ id: `del-${saleId}-${Date.now()}`, type: "sale_deleted", receiptNumber: saleId.slice(0, 6).toUpperCase(), total: sale.total, date: new Date().toISOString() }, ...prev].slice(0, 30));
    setUnreadCount((c) => c + 1);
    pushToast("Vente supprimée, stock restitué", "ok");
  };

  // Modifie une vente déjà enregistrée (quantités, articles retirés, mode de
  // paiement) et ajuste le stock en conséquence. Réservé à l'administrateur.
  const handleUpdateSale = (saleId, newItems, newPaymentMethod) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const oldQtyById = Object.fromEntries(sale.items.map((i) => [i.id, i.qty]));
    const newQtyById = Object.fromEntries(newItems.map((i) => [i.id, i.qty]));
    const affectedIds = new Set([...Object.keys(oldQtyById), ...Object.keys(newQtyById)]);
    const nextProducts = products.map((p) => {
      if (!affectedIds.has(p.id)) return p;
      const delta = (oldQtyById[p.id] || 0) - (newQtyById[p.id] || 0); // qty en moins vendue => stock qui remonte
      return delta !== 0 ? { ...p, stock: p.stock + delta } : p;
    });
    const editMovements = [...affectedIds].filter((id) => (oldQtyById[id] || 0) !== (newQtyById[id] || 0)).map((id) => {
      const p = nextProducts.find((pp) => pp.id === id);
      const delta = (oldQtyById[id] || 0) - (newQtyById[id] || 0);
      const before = p ? p.stock - delta : 0;
      return { id: uid(), date: new Date().toISOString(), productId: id, productName: p?.name || "?", type: "ajustement", delta, before, after: before + delta, author: currentVendorName || "Administrateur", note: "Modification de vente" };
    });
    const newTotal = newItems.reduce((s, i) => s + computeItemTotal(i.product, i.qty), 0);
    const paymentChangedToCredit = newPaymentMethod === "credit" && sale.paymentMethod !== "credit";
    const paymentChangedFromCredit = newPaymentMethod !== "credit" && sale.paymentMethod === "credit";
    const nextSale = {
      ...sale, items: newItems, total: newTotal, paymentMethod: newPaymentMethod,
      paid: paymentChangedToCredit ? false : paymentChangedFromCredit ? true : sale.paid,
    };
    saveProducts(nextProducts);
    if (editMovements.length > 0) saveMovements([...editMovements, ...movements]);
    saveSales(sales.map((s) => (s.id === saleId ? nextSale : s)));
    setNotifications((prev) => [{ id: `edit-${saleId}-${Date.now()}`, type: "sale_edited", receiptNumber: saleId.slice(0, 6).toUpperCase(), total: newTotal, date: new Date().toISOString() }, ...prev].slice(0, 30));
    setUnreadCount((c) => c + 1);
    pushToast("Vente modifiée", "ok");
  };

  const lowStockCount = products ? products.filter((p) => p.stock <= p.minStock).length : 0;
  const creditCount = sales ? sales.filter((s) => s.paymentMethod === "credit" && !s.paid).length : 0;

  if (!dataReady) {
    return (
      <div className="gb-root min-h-screen flex items-center justify-center">
        <GlobalStyle />
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--glass)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const activeTheme = getTheme(shop?.theme || "emeraude");
  const isDark = !!shop?.darkMode;
  const themeVars = { "--glass": activeTheme.glass, "--glass-light": activeTheme.glassLight, "--cap": activeTheme.cap };
  const tr = (key) => (TRANSLATIONS[shop?.language || "fr"] && TRANSLATIONS[shop?.language || "fr"][key]) || TRANSLATIONS.fr[key] || key;

  return (
    <div className={`gb-root min-h-screen flex justify-center${isDark ? " gb-dark" : ""}`} style={themeVars}>
      <GlobalStyle />
      <div className="w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] min-h-screen relative" style={{ background: "var(--paper)" }}>
        {role === "admin" && view === "admin" && !ownerAccess && <SupportChatWidget shop={shop} />}
        {homeScreenActive ? (
          <OnboardingScreen
            shops={shops}
            onComplete={handleOnboardingComplete}
            onJoinShop={handleJoinShopComplete}
            pushToast={pushToast}
            hasSavedShop={shops.length > 0}
            savedShopName={shop?.name || shops[0]?.name}
            onResume={() => setHomeScreenActive(false)}
            trialUsed={trialUsed}
            onStartTrial={handleStartTrial}
          />
        ) : shops.length === 0 ? (
          <OnboardingScreen shops={shops} onComplete={handleOnboardingComplete} onJoinShop={handleJoinShopComplete} pushToast={pushToast} trialUsed={trialUsed} onStartTrial={handleStartTrial} />
        ) : shop && (
          <CurrencyContext.Provider value={shop.currency}>
          <LanguageContext.Provider value={shop.language || "fr"}>
            {!role ? (
              <LoginScreen shop={shop} shops={shops} activeShopId={activeShopId} onSwitchShop={handleSwitchShop} vendors={vendors} onLogin={(r, name) => { setRole(r); setCurrentVendorName(name); setView("sell"); window.storage.set("sessionRole", JSON.stringify(r)).catch(() => {}); window.storage.set("sessionVendorName", JSON.stringify(name)).catch(() => {}); }} pushToast={pushToast} onGoHome={() => setHomeScreenActive(true)} />
            ) : (
              <>
                <div className="px-4 pt-4 pb-2 flex items-center justify-between sticky top-0 z-20 no-print" style={{ background: "var(--paper)" }}>
                  <div>
                    <p className="font-display font-bold text-base leading-none">{shop.name}</p>
                    <p className="text-[11px] opacity-50 mt-0.5 flex items-center gap-1.5">
                      {currentVendorName}
                      {shop.backendLinked && pendingSync > 0 && (
                        <button onClick={() => trySync(true)} className="gb-focus inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#E8720C", color: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} title="Appuyer pour forcer la synchronisation">
                          ⏳ {pendingSync}
                        </button>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setGlobalSearchOpen(true)} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }} aria-label="Recherche globale">
                      <Search size={15} />
                    </button>
                    {role && (
                      <div className="relative">
                        <button
                          onClick={() => { setNotifPanelOpen((v) => !v); if (!notifPanelOpen) setUnreadCount(0); }}
                          className="gb-focus w-9 h-9 rounded-full flex items-center justify-center relative"
                          style={{ background: "var(--paper-dim)" }}
                        >
                          <Bell size={15} />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-[3px] rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: "var(--danger)" }}>{unreadCount}</span>
                          )}
                        </button>
                        {notifPanelOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setNotifPanelOpen(false)} />
                            <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl overflow-hidden gb-slide-up" style={{ background: "var(--card)", boxShadow: "0 16px 40px -12px rgba(15,27,22,0.32)", border: "1px solid var(--line)" }}>
                              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
                                <span className="text-sm font-semibold">Notifications</span>
                                {notifications.length > 0 && (
                                  <button onClick={() => setNotifications([])} className="gb-focus text-[11px] opacity-50 underline">Effacer</button>
                                )}
                              </div>
                              <div className="max-h-72 overflow-y-auto gb-scroll">
                                {notifications.length === 0 && <p className="text-xs opacity-50 text-center py-8 px-4">Aucune notification récente.</p>}
                                {notifications.map((n) => (
                                  <div key={n.id} className="px-4 py-3 border-b last:border-0 flex items-start gap-2.5" style={{ borderColor: "var(--line)" }}>
                                    {(!n.type || n.type === "sale") && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#E7F7EE" }}><ShoppingCart size={12} color="#1CA857" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">{formatMoney(n.total, shop.currency)} vendu par {n.vendor}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "trial" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FFF3E0" }}><Gift size={12} color="var(--cap)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Essai gratuit — {n.daysLeft} jour{n.daysLeft > 1 ? "s" : ""} restant{n.daysLeft > 1 ? "s" : ""}. Pense à activer une licence pour continuer sans interruption.</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "lowstock" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FCEBE8" }}><AlertTriangle size={12} color="var(--danger)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">{n.count} produit{n.count > 1 ? "s" : ""} en stock bas : {n.names.join(", ")}{n.count > n.names.length ? "…" : ""}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "sale_edited" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FFF3E0" }}><Pencil size={12} color="var(--cap)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Vente N° {n.receiptNumber} modifiée — nouveau total {formatMoney(n.total, shop.currency)}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "sale_deleted" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FCEBE8" }}><Trash2 size={12} color="var(--danger)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Vente N° {n.receiptNumber} supprimée ({formatMoney(n.total, shop.currency)})</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <button onClick={() => { setRole(null); setCurrentVendorName(""); setCart([]); setNotifications([]); setUnreadCount(0); setNotifPanelOpen(false); window.storage.delete("sessionRole").catch(() => {}); window.storage.delete("sessionVendorName").catch(() => {}); setHomeScreenActive(true); }} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><LogOut size={15} /></button>
                  </div>
                </div>

                {globalSearchOpen && (
                  <GlobalSearchModal products={products} clients={clients} categories={categories} role={role} onClose={() => setGlobalSearchOpen(false)} />
                )}

                {licenseStatus === "expired" && (
                  <div className="mx-4 mb-3 rounded-xl p-3 flex items-center gap-2.5 no-print" style={{ background: "#FCEBE8" }}>
                    <AlertTriangle size={15} color="var(--danger)" className="shrink-0" />
                    <p className="text-[11px] flex-1" style={{ color: "var(--danger)" }}>Licence expirée — les nouvelles ventes sont bloquées.</p>
                    <button onClick={() => setShowRenewBanner(true)} className="gb-focus text-[11px] font-bold shrink-0 underline" style={{ color: "var(--danger)" }}>Renouveler</button>
                  </div>
                )}
                {showRenewBanner && <RenewLicenseModal onActivate={handleActivateLicense} onClose={() => setShowRenewBanner(false)} pushToast={pushToast} />}

                {view === "sell" && (
                  licenseStatus === "expired" ? (
                    <div className="px-4 pt-8 text-center">
                      <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><ShieldCheck size={26} color="var(--danger)" /></div>
                      <p className="font-display font-bold text-base mb-1.5">Vente bloquée</p>
                      <p className="text-xs opacity-60 max-w-[260px] mx-auto mb-5">La licence de l'application est expirée. Renouvelez-la pour reprendre l'encaissement des ventes.</p>
                      <button onClick={() => setShowRenewBanner(true)} className="gb-focus rounded-2xl px-6 py-3 font-semibold text-sm text-white" style={{ background: "var(--glass)" }}>Renouveler la licence</button>
                    </div>
                  ) : (
                    <SellScreen shop={shop} categories={categories} products={products} sales={sales} clients={clients} onCreateClient={onCreateClient} cart={cart} setCart={setCart} onCheckout={handleCheckout} pushToast={pushToast} />
                  )
                )}
                {view === "stock" && <StockScreen products={products} categories={categories} />}
                {view === "credits" && <CreditsScreen shop={shop} sales={sales} onSettle={handleSettleCredit} />}
                {view === "history" && <HistoryScreen shop={shop} sales={sales} products={products} vendorFilter={role === "admin" ? null : currentVendorName} isAdmin={role === "admin"} onDeleteSale={handleDeleteSale} onUpdateSale={handleUpdateSale} pushToast={pushToast} />}
                {view === "admin" && role === "admin" && (
                  <AdminScreen
                    shop={shop} saveShopMeta={saveShopMeta} shops={shops} activeShopId={activeShopId}
                    onSwitchShop={handleSwitchShop} onCreateShop={handleCreateShop} onDeleteShop={handleDeleteShop}
                    products={products} saveProducts={saveProducts} categories={categories} saveCategories={saveCategories} movements={movements} saveMovements={saveMovements} inventories={inventories} saveInventories={saveInventories} sales={sales} saveSales={saveSales}
                    suppliers={suppliers} saveSuppliers={saveSuppliers} expenses={expenses} saveExpenses={saveExpenses}
                    vendors={vendors} saveVendors={saveVendors} clients={clients} saveClients={saveClients} license={license} licenseStatus={licenseStatus} onActivateLicense={handleActivateLicense} onRestoreBackup={handleRestoreBackup} ownerAccess={ownerAccess} onVerifyOwner={handleVerifyOwner} pushToast={pushToast}
                    menuOpen={adminMenuOpen} setMenuOpen={setAdminMenuOpen}
                  />
                )}

                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] px-3 pb-3 pt-2 z-30 no-print" style={{ background: "linear-gradient(to top, var(--paper) 60%, transparent)" }}>
                  <div className="rounded-2xl flex items-stretch shadow-lg overflow-hidden" style={{ background: "var(--glass)" }}>
                    {TABS[role].map((t) => (
                      <button key={t.id} onClick={() => { setView(t.id); if (t.id === "admin") setAdminMenuOpen(true); }} className="gb-focus flex-1 flex flex-col items-center gap-1 py-2.5" style={{ background: view === t.id ? "var(--glass-light)" : "transparent" }}>
                        <div className="relative">
                          <t.Icon size={17} color={view === t.id ? "var(--cap)" : "#ffffff90"} />
                          {t.id === "stock" && lowStockCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-[3px] rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ background: "var(--danger)" }}>{lowStockCount}</span>
                          )}
                          {t.id === "credits" && creditCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-[3px] rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ background: "var(--danger)" }}>{creditCount}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: view === t.id ? "#fff" : "#ffffff70" }}>{tr(t.id)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </LanguageContext.Provider>
          </CurrencyContext.Provider>
        )}

        <Toast toast={toast} />
      </div>
    </div>
  );
}
