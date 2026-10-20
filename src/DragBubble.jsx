// src/DragBubble.jsx
//
// Bulle déplaçable, pour toutes les entreprises (boutique, hôtel, cyber
// café…) : on MAINTIENT le doigt sur la bulle (environ un tiers de seconde,
// petite vibration), puis on la glisse où l'on veut. La position est gardée
// sur le téléphone et réutilisée pour les bulles suivantes du même genre.
//
// - Un simple appui garde son effet habituel (ouvrir, fermer…).
// - La bulle reste dans l'écran, sous la barre d'état et au-dessus de la
//   barre de navigation du téléphone.
// - Ramenée près de sa place d'origine, elle s'y recolle (remise à zéro).

import { useEffect, useRef, useState } from "react";

const PREFIX = "gb:bubble:";
const HOLD_MS = 280;
const SNAP_HOME = 28;
const subs = new Map();

function load(id) {
  try {
    const v = JSON.parse(localStorage.getItem(PREFIX + id) || "null");
    if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) return v;
  } catch { /* stockage indisponible */ }
  return { x: 0, y: 0 };
}
function store(id, v) {
  try {
    if (!v.x && !v.y) localStorage.removeItem(PREFIX + id);
    else localStorage.setItem(PREFIX + id, JSON.stringify(v));
  } catch { /* stockage indisponible */ }
  (subs.get(id) || new Set()).forEach((f) => f(v));
}
// Remet toutes les bulles à leur place d'origine.
export function resetBubbles() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  subs.forEach((set) => set.forEach((f) => f({ x: 0, y: 0 })));
}

// Marges de sécurité : barre d'état en haut, navigation du téléphone en bas.
let insets = null;
function safeInsets() {
  if (insets) return insets;
  let top = 0, bottom = 0;
  try {
    const p = document.createElement("div");
    p.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(p);
    const cs = getComputedStyle(p);
    top = parseFloat(cs.paddingTop) || 0; bottom = parseFloat(cs.paddingBottom) || 0;
    p.remove();
  } catch { /* ignore */ }
  insets = { top: Math.max(top, 22) + 8, bottom: Math.max(bottom, 16) + 8 };
  return insets;
}
// Correction à appliquer pour que le rectangle déplacé de (dx, dy) reste visible.
function fix(r, dx, dy) {
  const { top, bottom } = safeInsets();
  const W = window.innerWidth, H = window.innerHeight, m = 8;
  let cx = 0, cy = 0;
  const L = r.left + dx, R = r.right + dx, T = r.top + dy, B = r.bottom + dy;
  if (r.width <= W - 2 * m) { if (L < m) cx = m - L; else if (R > W - m) cx = W - m - R; }
  if (r.height <= H - top - bottom) { if (T < top) cy = top - T; else if (B > H - bottom) cy = H - bottom - B; }
  return { cx, cy };
}
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch { /* ignore */ } };

export function DragBubble({ id, children, className = "", style, as: Tag = "div", label = "Maintenir puis glisser pour déplacer" }) {
  const [pos, setPos] = useState(() => load(id));
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);
  const g = useRef(null);
  const posRef = useRef(pos); posRef.current = pos;
  const swallow = useRef(0);

  useEffect(() => {
    const set = subs.get(id) || new Set(); set.add(setPos); subs.set(id, set);
    return () => { set.delete(setPos); };
  }, [id]);
  // Après l'animation d'entrée ou une rotation de l'écran : rester visible.
  useEffect(() => {
    const keepIn = () => {
      const el = ref.current; if (!el || g.current) return;
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const { cx, cy } = fix(r, 0, 0);
      if (cx || cy) setPos((p) => ({ x: p.x + cx, y: p.y + cy }));
    };
    const t = setTimeout(keepIn, 500);
    window.addEventListener("resize", keepIn);
    return () => { clearTimeout(t); window.removeEventListener("resize", keepIn); };
  }, []);

  const end = () => {
    const s = g.current; g.current = null;
    if (!s) return;
    clearTimeout(s.timer);
    if (!s.active) return;
    setDrag(false);
    swallow.current = Date.now();
    let v = posRef.current;
    if (Math.hypot(v.x, v.y) < SNAP_HOME) { v = { x: 0, y: 0 }; setPos(v); }
    store(id, v);
  };
  const onPointerDown = (e) => {
    if (e.button > 0) return;
    const el = ref.current; if (!el) return;
    const s = { x0: e.clientX, y0: e.clientY, px: posRef.current.x, py: posRef.current.y, rect: el.getBoundingClientRect(), pid: e.pointerId, active: false };
    s.timer = setTimeout(() => {
      s.active = true; setDrag(true); buzz(12);
      try { el.setPointerCapture(s.pid); } catch { /* ignore */ }
    }, HOLD_MS);
    g.current = s;
  };
  const onPointerMove = (e) => {
    const s = g.current; if (!s) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.active) { if (Math.hypot(dx, dy) > 10) { clearTimeout(s.timer); g.current = null; } return; }
    e.preventDefault();
    const { cx, cy } = fix(s.rect, dx, dy);
    setPos({ x: s.px + dx + cx, y: s.py + dy + cy });
  };
  const onClickCapture = (e) => {
    if (Date.now() - swallow.current < 400) { e.preventDefault(); e.stopPropagation(); }
  };

  return (
    <Tag
      ref={ref}
      className={className}
      title={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={onClickCapture}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        ...style,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)${drag ? " scale(1.04)" : ""}`,
        transition: drag ? "none" : "transform .22s cubic-bezier(.2,.9,.25,1.1), filter .2s",
        filter: drag ? "drop-shadow(0 18px 26px rgba(0,0,0,0.28))" : undefined,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        cursor: drag ? "grabbing" : undefined,
        pointerEvents: "auto",
      }}
    >
      {children}
    </Tag>
  );
}
