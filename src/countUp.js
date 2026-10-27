// src/countUp.js — GestiOne
//
// Montants « qui comptent » : à l'affichage d'une page, chaque montant ou
// grand nombre mis en avant (cartes de synthèse, totaux, tuiles…) part de 0
// et monte jusqu'à sa vraie valeur. Fonctionne pour TOUS les types
// d'entreprise (boutique, cave, bar, hôtel, cyber, aluminium…) sans toucher à
// chaque écran : on observe les éléments qui apparaissent et on anime le
// texte des nombres affichés en gras et en grand.
//
// Règles :
//   - seulement les textes qui sont UN nombre (avec ou sans « FCFA », « F »,
//     « % », signe −/+) : « 278 678 FCFA », « 31 », « 89 % » ;
//   - affichés en gras (≥ 600) et assez lisibles (≥ 11 px) ;
//   - pas dans une liste répétée (prix des produits, lignes d'historique…),
//     ni dans un champ de saisie, un ticket à imprimer, ou un bloc marqué
//     data-no-count ;
//   - à la fin, le texte EXACT d'origine est remis ; si l'écran change la
//     valeur pendant l'animation, on s'arrête et on laisse la nouvelle valeur.
//   - « Réduire les animations » du téléphone : rien n'est animé.

const DURATION = 900;
const NUM_RE = /^([−\-+]?\s?)(\d{1,3}(?:[   .]\d{3})+|\d+)((?:,\d+)?)(\s?(?:FCFA|F CFA|CFA|F|XOF|XAF|€|\$|%|pts?|art\.?|articles?|unités?|ventes?|clients?)?)$/i;
const SKIP_SEL = "input, textarea, select, option, [contenteditable], [data-no-count], #receipt-print-area, #daily-report-print-area, .no-count, script, style, svg";

const animating = new Map(); // textNode -> état de l'animation
const seen = new WeakSet(); // nœuds déjà traités à leur apparition
let ourWrite = false;

function parse(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 24) return null;
  const m = NUM_RE.exec(t);
  if (!m) return null;
  const digits = m[2];
  // Numéros (téléphone, reçu) : longue suite de chiffres commençant par 0
  // ou sans séparateur au-delà de 7 chiffres → pas un montant.
  if (/^0\d{3,}$/.test(digits)) return null;
  if (/^\d{8,}$/.test(digits)) return null;
  const sep = (digits.match(/[   .]/) || [""])[0];
  const value = Number(digits.replace(/[   .]/g, ""));
  if (!Number.isFinite(value) || value < 10) return null;
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  return { value, sep, sign: m[1], dec: m[3], suffix: m[4], lead, trail };
}

function format(n, p) {
  const s = String(Math.round(n));
  const grouped = p.sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, p.sep) : s;
  return `${p.lead}${p.sign}${grouped}${n >= p.value ? p.dec : ""}${p.suffix}${p.trail}`;
}

function inRepeatedList(el) {
  let node = el;
  for (let depth = 0; depth < 6 && node && node.parentElement; depth++) {
    const parent = node.parentElement;
    if (parent.children.length >= 5) {
      const cls = node.className && typeof node.className === "string" ? node.className : "";
      let same = 0;
      for (const sib of parent.children) {
        if (sib.tagName === node.tagName && (typeof sib.className === "string" ? sib.className : "") === cls) same++;
        if (same >= 5) return true;
      }
    }
    node = parent;
  }
  return false;
}

function eligible(textNode) {
  const el = textNode.parentElement;
  if (!el || !el.isConnected) return null;
  // Le nombre doit être le texte complet de son élément.
  if (el.childNodes.length !== 1) return null;
  const p = parse(textNode.nodeValue);
  if (!p) return null;
  if (el.closest(SKIP_SEL)) return null;
  let cs;
  try { cs = getComputedStyle(el); } catch { return null; }
  const size = parseFloat(cs.fontSize) || 0;
  const weight = parseInt(cs.fontWeight, 10) || 400;
  if (size < 11 || weight < 600) return null;
  if (cs.visibility === "hidden" || cs.display === "none") return null;
  if (inRepeatedList(el)) return null;
  return p;
}

function write(node, text) {
  ourWrite = true;
  node.nodeValue = text;
  ourWrite = false;
}

function animate(node, p, from = 0) {
  const prev = animating.get(node);
  if (prev) cancelAnimationFrame(prev.raf);
  const final = format(p.value, p);
  const st = { raf: 0, last: null, final };
  animating.set(node, st);
  const t0 = performance.now();
  const step = (now) => {
    if (!node.isConnected) { animating.delete(node); return; }
    // L'écran a changé la valeur pendant l'animation : on lui laisse la main.
    if (st.last !== null && node.nodeValue !== st.last) { animating.delete(node); return; }
    const k = Math.min(1, (now - t0) / DURATION);
    const e = 1 - Math.pow(1 - k, 3);
    const txt = k >= 1 ? final : format(from + (p.value - from) * e, p);
    write(node, txt);
    st.last = txt;
    if (k < 1) st.raf = requestAnimationFrame(step);
    else animating.delete(node);
  };
  st.raf = requestAnimationFrame(step);
  // Première image tout de suite à la valeur de départ (pas de saut visible).
  const first = format(from, p);
  write(node, first);
  st.last = first;
}

function scan(root) {
  if (!root) return;
  if (root.nodeType === 3) { consider(root); return; }
  if (root.nodeType !== 1) return;
  if (root.closest && root.closest(SKIP_SEL)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  let count = 0;
  while (n && count < 400) { consider(n); n = walker.nextNode(); count++; }
}

function consider(node) {
  if (seen.has(node) || animating.has(node)) return;
  // Ne pas marquer « vu » un texte qui n'est pas (encore) un nombre : il
  // pourra le devenir (chargement des données).
  if (!parse(node.nodeValue)) return;
  seen.add(node);
  const p = eligible(node);
  if (p) animate(node, p, 0);
}

let pending = new Set();
let scheduled = false;
function flush() {
  scheduled = false;
  const items = pending;
  pending = new Set();
  items.forEach((n) => { if (n.isConnected) scan(n); });
}

export function installCountUp() {
  if (typeof window === "undefined" || window.__gbCountUp) return;
  window.__gbCountUp = true;
  try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch { /* ignore */ }
  const obs = new MutationObserver((muts) => {
    if (ourWrite) return;
    for (const m of muts) {
      if (m.type === "childList") {
        m.addedNodes.forEach((n) => pending.add(n));
      } else if (m.type === "characterData") {
        const node = m.target;
        if (animating.has(node)) continue; // la vérification se fait dans step()
        // Une valeur qui passe de 0 (ou vide) à un vrai montant — données qui
        // finissent de charger — est animée elle aussi.
        const old = parse(m.oldValue || "");
        if (seen.has(node) && old && old.value > 0) continue;
        if (!old && m.oldValue && /\d/.test(m.oldValue) && !/^\D*0\D*$/.test(m.oldValue)) continue;
        seen.delete(node);
        pending.add(node);
      }
    }
    if (!scheduled && pending.size) { scheduled = true; requestAnimationFrame(flush); }
  });
  const start = () => {
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, characterDataOldValue: true });
    pending.add(document.body);
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
