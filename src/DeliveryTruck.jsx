// src/DeliveryTruck.jsx
//
// Animation « livraison reçue » sur la barre du menu du bas (toutes les pages).
// Quand une commande fournisseur vient d'être validée comme reçue, un camion
// de livraison arrive par la droite, s'arrête au-dessus de l'onglet Stock,
// décharge ses colis dans l'icône Stock (+N), puis redémarre et sort par la
// gauche. Purement décoratif : aucun clic n'est bloqué (pointer-events: none).

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PackageCheck } from "lucide-react";

const W = 138; // largeur du camion (px)
const H = 76; // hauteur du camion (px)
const CARGO_CX = 92; // centre de la caisse, en px depuis la gauche du camion
const T_ENTER = 2500;
const T_STOP = 3400;
const T_EXIT = 1800;

const CSS = `
@keyframes gbtSpin{to{transform:rotate(-360deg)}}
@keyframes gbtBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}
@keyframes gbtIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-.6px)}}
@keyframes gbtPuff{0%{opacity:.55;transform:translate(0,0) scale(.4)}100%{opacity:0;transform:translate(26px,-14px) scale(1.8)}}
@keyframes gbtLine{0%{opacity:0;transform:translateX(-6px) scaleX(.4)}40%{opacity:.75}100%{opacity:0;transform:translateX(22px) scaleX(1)}}
@keyframes gbtBubble{0%{opacity:0;transform:translate(-50%,8px) scale(.9)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes gbtPlus{0%{opacity:0;transform:translate(-50%,6px) scale(.6)}25%{opacity:1;transform:translate(-50%,-6px) scale(1.08)}80%{opacity:1;transform:translate(-50%,-14px) scale(1)}100%{opacity:0;transform:translate(-50%,-22px) scale(.95)}}
@keyframes gbtLight{0%,100%{opacity:.35}50%{opacity:.85}}
`;

function prefersReducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

function measure() {
  const vw = window.innerWidth;
  const stockEl = document.querySelector('[data-nav="stock"]');
  const laneEl = document.querySelector("[data-delivery-lane]");
  const navEl = stockEl ? stockEl.closest(".rounded-2xl") || stockEl : null;
  const s = stockEl ? stockEl.getBoundingClientRect() : null;
  const iconEl = stockEl ? stockEl.querySelector("svg") : null;
  const ic = iconEl ? iconEl.getBoundingClientRect() : s;
  const stockCx = s ? s.left + s.width / 2 : vw * 0.3;
  const stockCy = ic ? ic.top + ic.height / 2 : window.innerHeight - 60;
  let bottom; // bas du camion (coordonnée Y écran)
  // Le camion roule SUR la barre du menu du bas : ses roues posent sur le
  // bord haut de la barre, quelle que soit la page affichée.
  if (navEl) { bottom = navEl.getBoundingClientRect().top + 9; }
  else if (laneEl) { const r = laneEl.getBoundingClientRect(); bottom = r.bottom - 6; }
  else bottom = window.innerHeight - 110;
  return { vw, stockCx, stockCy, top: bottom - H, iconEl, ok: !!stockEl };
}

export function DeliveryTruck({ delivery, onDone }) {
  const wrapRef = useRef(null);
  const [geo, setGeo] = useState(null);
  const [phase, setPhase] = useState("enter"); // enter | stop | exit
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    if (prefersReducedMotion()) { doneRef.current?.(); return; }
    const g = measure();
    if (!g.ok) { doneRef.current?.(); return; } // menu du bas absent : rien à animer
    setGeo(g);
  }, []);

  useEffect(() => {
    if (!geo || !wrapRef.current) return undefined;
    const el = wrapRef.current;
    const startX = geo.vw + 24;
    const stopX = Math.round(geo.stockCx - CARGO_CX);
    const endX = -W - 40;
    let cancelled = false;
    const timers = [];
    const a1 = el.animate(
      [{ transform: `translateX(${startX}px)` }, { transform: `translateX(${stopX}px)` }],
      { duration: T_ENTER, easing: "cubic-bezier(.2,.75,.25,1)", fill: "forwards" },
    );
    a1.onfinish = () => {
      if (cancelled) return;
      setPhase("stop");
      // L'icône Stock « reçoit » les colis : petit rebond lumineux.
      timers.push(setTimeout(() => {
        try {
          geo.iconEl?.animate(
            [{ transform: "scale(1)" }, { transform: "scale(1.35) translateY(-2px)", filter: "drop-shadow(0 0 6px rgba(255,200,80,.9))" }, { transform: "scale(.92)" }, { transform: "scale(1)" }],
            { duration: 650, easing: "ease-out", iterations: 2 },
          );
        } catch { /* ignore */ }
      }, 700));
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setPhase("exit");
        const a2 = el.animate(
          [{ transform: `translateX(${stopX}px)` }, { transform: `translateX(${endX}px)` }],
          { duration: T_EXIT, easing: "cubic-bezier(.55,0,.85,.45)", fill: "forwards" },
        );
        a2.onfinish = () => { if (!cancelled) doneRef.current?.(); };
      }, T_STOP));
    };
    return () => { cancelled = true; timers.forEach(clearTimeout); try { el.getAnimations().forEach((a) => a.cancel()); } catch { /* ignore */ } };
  }, [geo]);

  if (!geo) return null;
  const moving = phase !== "stop";
  const spin = { transformBox: "fill-box", transformOrigin: "center", animation: `gbtSpin ${phase === "exit" ? ".28s" : ".42s"} linear infinite`, animationPlayState: moving ? "running" : "paused" };
  const dropDy = Math.max(30, geo.stockCy - (geo.top + H - 10));
  const n = delivery?.crates || 0;
  const unitWord = delivery?.unitWord || "colis";

  return (
    <div aria-hidden="true" className="no-print" style={{ position: "fixed", inset: 0, zIndex: 35, pointerEvents: "none", overflow: "hidden" }}>
      <style>{CSS}</style>

      <div ref={wrapRef} style={{ position: "fixed", left: 0, top: geo.top, width: W, height: H, transform: `translateX(${geo.vw + 24}px)`, willChange: "transform" }}>
        {/* Bulle d'information pendant l'arrêt */}
        {phase === "stop" && (
          <div style={{ position: "absolute", left: CARGO_CX, bottom: H + 8, transform: "translateX(-50%)", animation: "gbtBubble .35s cubic-bezier(.2,.8,.2,1) both", background: "#fff", color: "#16202A", borderRadius: 14, padding: "8px 11px", boxShadow: "0 12px 28px -10px rgba(0,0,0,.45)", border: "1px solid rgba(0,0,0,.06)", width: "max-content", maxWidth: Math.min(260, geo.vw - 32) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 24, height: 24, borderRadius: 8, background: "#E6F4EC", color: "#1E7A46", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><PackageCheck size={14} strokeWidth={2.4} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, lineHeight: 1.2 }}>Livraison reçue</span>
                <span style={{ display: "block", fontSize: 11, color: "#66707A", lineHeight: 1.25, overflowWrap: "anywhere" }}>{delivery?.supplierName || "Fournisseur"} · {n} {n > 1 ? unitWord : unitWord.replace(/s$/, "")}</span>
              </span>
            </div>
            <span style={{ position: "absolute", left: "50%", bottom: -6, width: 12, height: 12, background: "#fff", transform: "translateX(-50%) rotate(45deg)", borderRight: "1px solid rgba(0,0,0,.06)", borderBottom: "1px solid rgba(0,0,0,.06)" }} />
          </div>
        )}

        {/* Colis qui tombent dans l'icône Stock */}
        {phase === "stop" && [0, 1, 2].map((k) => (
          <span key={k} style={{ position: "absolute", left: CARGO_CX - 9 + (k - 1) * 12, top: H - 30, width: 18, height: 16, borderRadius: 3, background: "linear-gradient(180deg,#D9A35B,#B57A33)", boxShadow: "inset 0 -2px 0 rgba(0,0,0,.12)", animation: `gbtDrop${k} .7s cubic-bezier(.5,0,.75,0) ${180 + k * 220}ms both` }}>
            <span style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 4, background: "rgba(255,255,255,.55)" }} />
            <style>{`@keyframes gbtDrop${k}{0%{opacity:0;transform:translate(0,-6px) scale(.9)}15%{opacity:1;transform:translate(0,-14px) scale(1)}100%{opacity:0;transform:translate(${(1 - k) * 12}px,${dropDy}px) scale(.45)}}`}</style>
          </span>
        ))}

        {/* Lignes de vitesse (à l'arrière, côté droit) */}
        {moving && [0, 1, 2].map((k) => (
          <span key={k} style={{ position: "absolute", left: W - 2, top: 18 + k * 13, width: 22 + k * 6, height: 2.5, borderRadius: 2, background: "rgba(120,130,140,.55)", transformOrigin: "left", animation: `gbtLine .5s linear ${k * 120}ms infinite` }} />
        ))}

        {/* Fumée d'échappement */}
        {[0, 1, 2].map((k) => (
          <span key={k} style={{ position: "absolute", left: W - 10, top: H - 22, width: 9, height: 9, borderRadius: 99, background: "rgba(150,155,160,.6)", animation: `gbtPuff ${moving ? ".9s" : "1.6s"} ease-out ${k * 300}ms infinite` }} />
        ))}

        {/* Ombre au sol */}
        <span style={{ position: "absolute", left: 10, right: 6, bottom: -3, height: 8, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,.28), transparent)" }} />

        <svg width={W} height={H} viewBox="0 0 138 76" style={{ position: "absolute", inset: 0, overflow: "visible", animation: moving ? "gbtBounce .3s ease-in-out infinite" : "gbtIdle 1.2s ease-in-out infinite" }}>
          {/* Faisceau des phares */}
          <path d="M6 46 L-30 38 L-30 58 Z" fill="rgba(255,214,102,.35)" style={{ animation: "gbtLight 1.4s ease-in-out infinite" }} />
          {/* Caisse */}
          <rect x="46" y="4" width="88" height="52" rx="7" style={{ fill: "var(--glass)" }} />
          <rect x="46" y="4" width="88" height="10" rx="7" fill="rgba(255,255,255,.10)" />
          <rect x="46" y="38" width="88" height="6" style={{ fill: "var(--cap)" }} />
          <text x="90" y="30" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily="inherit" letterSpacing=".3">GestiOne</text>
          <line x1="127" y1="10" x2="127" y2="50" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" />
          {/* Cabine (avant à gauche) */}
          <path d="M44 18 H24 Q18 18 15 23 L8 35 Q6 38 6 42 V54 Q6 58 10 58 H44 Z" style={{ fill: "var(--cap)" }} />
          <path d="M40 22 H26 Q22 22 20 25 L14.5 34.5 Q14 36 15.5 36 H40 Z" fill="#CFE7F5" />
          <path d="M33 23 L28 35" stroke="rgba(255,255,255,.75)" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="30" y="40" width="7" height="2.4" rx="1.2" fill="rgba(0,0,0,.25)" />
          {/* Phare + pare-chocs */}
          <rect x="5" y="44" width="6" height="5" rx="1.5" fill="#FFD666" />
          <rect x="3" y="53" width="14" height="5" rx="2" fill="#3A3F45" />
          {/* Châssis */}
          <rect x="40" y="56" width="96" height="4" rx="2" fill="#2B3036" />
          {/* Roues */}
          {[30, 112].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="61" r="11" fill="#1F2328" />
              <g style={spin}>
                <circle cx={cx} cy="61" r="6.2" fill="#C9CED4" />
                <rect x={cx - 0.9} y="55.4" width="1.8" height="11.2" fill="#8A929B" />
                <rect x={cx - 5.6} y="60.1" width="11.2" height="1.8" fill="#8A929B" />
                <circle cx={cx} cy="61" r="2" fill="#5B636C" />
              </g>
            </g>
          ))}
        </svg>
      </div>
      {/* « +N » qui jaillit de l'icône Stock */}
      {phase !== "enter" && (
        <div style={{ position: "fixed", zIndex: 2, left: geo.stockCx, top: geo.stockCy - 12, transform: "translateX(-50%)", animation: "gbtPlus 2.6s ease-out .9s both", background: "var(--cap)", color: "#fff", fontWeight: 800, fontSize: 12.5, padding: "3px 9px", borderRadius: 999, boxShadow: "0 6px 14px -4px rgba(0,0,0,.45)", whiteSpace: "nowrap" }}>
          +{n} {n > 1 ? unitWord : unitWord.replace(/s$/, "")}
        </div>
      )}
    </div>
  );
}

export default DeliveryTruck;
