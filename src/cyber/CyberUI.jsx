// src/cyber/CyberUI.jsx — éléments d'interface du Cyber café
// (couleurs, icônes, boutons animés, en-têtes, feuilles, interrupteurs).

export const C = {
  navy: "#0A1730", navy2: "#1B3361", ground: "#EEF2F8", card: "#FFFFFF", ink: "#0F172A", ink2: "#334155", muted: "#5B6B82",
  line: "#DDE4EE", line2: "#EEF2F8", cyan: "#22D3EE", cyanInk: "#0E7490", cyanSoft: "#E0F7FB",
  green: "#15803D", greenSoft: "#DCFCE7", red: "#B91C1C", redSoft: "#FEE2E2", amber: "#B45309", amberSoft: "#FEF3C7",
  violet: "#6D28D9", violetSoft: "#EDE9FE", indigo: "#4338CA", indigoSoft: "#E8EAFE", orange: "#C2410C", orangeSoft: "#FFEDD5",
};
export const GRAD = {
  cyan: "linear-gradient(135deg,#67E8F9 0%,#06B6D4 55%,#0E7490 100%)",
  green: "linear-gradient(135deg,#6EE7B7 0%,#10B981 55%,#047857 100%)",
  amber: "linear-gradient(135deg,#FDE68A 0%,#F59E0B 55%,#B45309 100%)",
  red: "linear-gradient(135deg,#FCA5A5 0%,#EF4444 55%,#B91C1C 100%)",
  navy: "linear-gradient(135deg,#1B3361 0%,#0A1730 100%)",
  indigo: "linear-gradient(135deg,#A5B4FC 0%,#6366F1 55%,#4338CA 100%)",
  pink: "linear-gradient(135deg,#F9A8D4 0%,#EC4899 55%,#BE185D 100%)",
};
export const FONT_D = "Sora, 'Plus Jakarta Sans', system-ui, sans-serif";
export const STATUS_H = "max(40px, env(safe-area-inset-top))";

// Animations et polices du module (chargées une fois).
export function CyberStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Sora:wght@600;700;800&display=swap');
.cy-root{font-family:'Plus Jakarta Sans',system-ui,sans-serif}
@keyframes cyUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes cyPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes cySheen{from{background-position:180% 0,0 0}to{background-position:-80% 0,0 0}}
@keyframes cyPulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.7)}70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
@keyframes cyRing{0%{box-shadow:0 0 0 0 rgba(34,211,238,.55),0 10px 22px -6px rgba(8,145,178,.7)}70%{box-shadow:0 0 0 12px rgba(34,211,238,0),0 10px 22px -6px rgba(8,145,178,.7)}100%{box-shadow:0 0 0 0 rgba(34,211,238,0),0 10px 22px -6px rgba(8,145,178,.7)}}
@keyframes cyGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes cyRise{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes cySpin{to{transform:rotate(360deg)}}
@keyframes cyWave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
@keyframes cySheet{from{transform:translateY(100%)}to{transform:none}}
@keyframes cyFade{from{opacity:0}to{opacity:1}}
@keyframes cySlide{from{transform:translateX(-102%)}to{transform:none}}
@keyframes cyDrop{0%{transform:translateY(-130%);opacity:0}60%{transform:translateY(6px);opacity:1}100%{transform:none;opacity:1}}
@keyframes cyPrint{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes cyCheck{from{stroke-dashoffset:30}to{stroke-dashoffset:0}}
.cy-a{animation:cyUp .5s cubic-bezier(.2,.8,.2,1) both}
.cy-d1{animation-delay:.05s}.cy-d2{animation-delay:.1s}.cy-d3{animation-delay:.15s}.cy-d4{animation-delay:.2s}
.cy-pop{animation:cyPop .35s cubic-bezier(.2,.8,.2,1) both}
.cy-live{animation:cyPulse 1.8s infinite}
.cy-ring{animation:cyRing 2.4s infinite}
.cy-bar{transform-origin:left;animation:cyGrow .9s cubic-bezier(.2,.8,.2,1) both .2s}
.cy-col{transform-origin:bottom;animation:cyRise .8s cubic-bezier(.2,.8,.2,1) both .2s}
.cy-spin{animation:cySpin 1s linear infinite}
.cy-wave{transform-origin:center;animation:cyWave .9s ease-in-out infinite}
.cy-sheet{animation:cySheet .35s cubic-bezier(.2,.8,.2,1) both}
.cy-fade{animation:cyFade .3s ease both}
.cy-slide{animation:cySlide .35s cubic-bezier(.2,.8,.2,1) both}
.cy-drop{animation:cyDrop .55s cubic-bezier(.2,.8,.2,1) both}
.cy-print{animation:cyPrint 1s cubic-bezier(.3,.7,.3,1) both .2s}
.cy-ck{stroke-dasharray:30;animation:cyCheck .45s ease-out both .3s}
.cy-tap{transition:transform .12s ease, background .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease}
.cy-tap:active{transform:scale(.96)}
.cy-sheen{background-size:250% 100%,100% 100%;animation:cySheen 3.2s ease-in-out infinite}
.cy-noscroll::-webkit-scrollbar{display:none}.cy-noscroll{scrollbar-width:none}
`}</style>
  );
}

const P = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  plus: "M12 5v14M5 12h14", minus: "M5 12h14", x: "M18 6 6 18M6 6l12 12", check: "M20 6 9 17l-5-5",
  back: "m15 18-6-6 6-6", chev: "m9 18 6-6-6-6", down: "m6 9 6 6 6-6",
  monitor: "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 21h8M12 17v4",
  copy: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  printer: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  scan: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10",
  camera: "M3 7h3l2-3h8l2 3h3v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20",
  type: "M4 7V4h16v3M9 20h6M12 4v16",
  bag: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  restock: "M21 8 12 3 3 8v8l9 5 9-5zM12 13v8M9 10.5l3 2 3-2",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  wallet: "M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20M6 15h3",
  cash: "M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM12 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  phone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM11 18h2",
  call: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 7v5l3 2",
  money: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  lock: "M6 11h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM8 11V7a4 4 0 0 1 8 0v4",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  trend: "M3 17l6-6 4 4 8-8M14 7h7v7", dash: "M3 3v18h18M7 15l4-4 3 3 5-6",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  receipt: "M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6M9 15h4",
  sync: "M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8M21 4v5h-5M3 20v-5h5",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  key: "M15.5 7.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM11 12v10M11 17h4M11 20h3",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z", book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15ZM20 22H6.5A2.5 2.5 0 0 1 4 19.5",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", shieldok: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4",
  speaker: "M11 5 6 9H2v6h4l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7", bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0",
  warn: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5",
  share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14", upload: "M12 21V9M7 14l5-5 5 5M5 3h14",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z", trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  swap: "M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16",
  clipboard: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2ZM9 14l2 2 4-4",
  cal: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM16 2v4M8 2v4M3 10h18",
  store: "M3 9 12 3l9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-7h6v7",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 11v5M12 8h.01",
  play: "M7 4v16l13-8z",
};
export function Icon({ name, size = 18, color = "currentColor", stroke = 2.2, style, fill }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke={fill ? "none" : color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d={P[name] || P.plus} />
    </svg>
  );
}

const SHEEN_LAYER = "linear-gradient(110deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.42) 50%, rgba(255,255,255,0) 65%)";
const KINDS = {
  cyan: { bg: GRAD.cyan, ink: C.navy, sh: "0 12px 24px -10px rgba(8,145,178,0.75)", sheen: true },
  green: { bg: GRAD.green, ink: "#022C22", sh: "0 12px 24px -10px rgba(4,120,87,0.7)", sheen: true },
  amber: { bg: GRAD.amber, ink: C.navy, sh: "0 12px 24px -10px rgba(180,83,9,0.7)", sheen: true },
  red: { bg: GRAD.red, ink: "#fff", sh: "0 12px 22px -10px rgba(185,28,28,0.7)", sheen: true },
  indigo: { bg: GRAD.indigo, ink: "#fff", sh: "0 12px 24px -10px rgba(67,56,202,0.75)", sheen: true },
  pink: { bg: GRAD.pink, ink: "#fff", sh: "0 12px 24px -10px rgba(190,24,93,0.7)", sheen: true },
  navy: { bg: GRAD.navy, ink: "#fff", sh: "0 12px 24px -12px rgba(10,23,48,0.75)", sheen: true },
  ghost: { bg: "#fff", ink: C.navy, border: `1.5px solid ${C.line}` },
  soft: { bg: "#F7F9FC", ink: C.ink2, border: `1.5px solid ${C.line}` },
  danger: { bg: "#FEF2F2", ink: C.red, border: "1.5px solid #FECACA" },
  dashed: { bg: "transparent", ink: C.ink2, border: "1.5px dashed #94A3B8" },
};
export function Btn({ children, onClick, kind = "cyan", disabled, full, className = "", style, icon, big, type = "button", ariaLabel }) {
  const K = KINDS[kind] || KINDS.cyan;
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={`gb-focus cy-tap ${K.sheen && !disabled ? "cy-sheen" : ""} ${full ? "w-full" : ""} inline-flex items-center justify-center gap-2 font-extrabold disabled:opacity-45 ${className}`}
      style={{ minHeight: big ? 56 : 48, padding: "0 16px", borderRadius: big ? 18 : 15, fontSize: big ? 15.5 : 14, color: K.ink, border: K.border || "none", ...(K.sheen ? { backgroundImage: `${SHEEN_LAYER}, ${K.bg}`, backgroundColor: "transparent" } : { background: K.bg }), boxShadow: disabled ? "none" : K.sh || "none", ...style }}>
      {icon && <Icon name={icon} size={big ? 20 : 18} stroke={2.5} />}{children}
    </button>
  );
}
export function Card({ children, className = "", style, onClick }) {
  const Tag = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`${onClick ? "gb-focus cy-tap text-left w-full " : ""}rounded-[20px] ${className}`} style={{ background: C.card, border: `1px solid ${C.line}`, ...style }}>{children}</Tag>;
}
export function Label({ children, right, className = "" }) {
  return <div className={`flex items-center justify-between mt-4 mb-2 px-1 ${className}`}><span className="text-[11px] font-extrabold tracking-[0.06em]" style={{ color: C.muted }}>{children}</span>{right}</div>;
}
export function BackBtn({ onBack, dark }) {
  return (
    <button type="button" onClick={onBack} aria-label="Retour" className="gb-focus cy-tap w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
      style={dark ? { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" } : { background: "#fff", border: `1.5px solid ${C.line}`, color: C.navy }}>
      <Icon name="back" size={20} stroke={2.4} />
    </button>
  );
}
// En-tête clair (écrans secondaires).
export function TopBar({ title, sub, onBack, right }) {
  return (
    <div className="cy-a flex items-center gap-2.5 pt-2.5">
      {onBack && <BackBtn onBack={onBack} />}
      <div className="flex-1 min-w-0"><p className="text-[21px] font-extrabold leading-tight truncate" style={{ fontFamily: FONT_D, color: C.ink }}>{title}</p>{sub && <p className="text-[12px] truncate" style={{ color: C.muted }}>{sub}</p>}</div>
      {right}
    </div>
  );
}
// En-tête sombre avec halo coloré (écrans principaux).
export function Hero({ children, glow = "rgba(34,211,238,0.32)", className = "", pb = 20 }) {
  return (
    <div className={`-mx-4 px-4 relative overflow-hidden text-white ${className}`} style={{ background: C.navy, paddingTop: 12, paddingBottom: pb }}>
      <span className="absolute rounded-full pointer-events-none" style={{ right: -70, top: -70, width: 240, height: 240, background: `radial-gradient(circle, ${glow} 0%, rgba(0,0,0,0) 70%)` }} />
      <div className="relative">{children}</div>
    </div>
  );
}
export function Seg({ options, value, onChange, dark, small }) {
  return (
    <div className="grid gap-[5px] p-[5px] rounded-[16px]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`, background: dark ? "rgba(255,255,255,0.08)" : "#fff", border: dark ? "1px solid rgba(255,255,255,0.14)" : `1px solid ${C.line}` }}>
      {options.map(([id, label]) => { const on = value === id; return (
        <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={on} className="gb-focus cy-tap rounded-[12px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis px-1"
          style={{ minHeight: small ? 34 : 42, fontSize: small ? 12 : 13.5, background: on ? (dark ? "#fff" : C.navy) : "transparent", color: on ? (dark ? C.navy : "#fff") : (dark ? "#C7D2E5" : C.ink2) }}>{label}</button>
      ); })}
    </div>
  );
}
export function Chip({ on, children, onClick, ink = C.navy, className = "" }) {
  return <button type="button" onClick={onClick} aria-pressed={!!on} className={`gb-focus cy-tap min-h-[36px] px-3 rounded-[12px] text-[12.5px] font-extrabold whitespace-nowrap ${className}`} style={{ border: `1.5px solid ${on ? ink : C.line}`, background: on ? ink : "#fff", color: on ? "#fff" : C.ink2 }}>{children}</button>;
}
export function Toggle({ on, onChange, label, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!on)} aria-pressed={!!on} aria-label={label} className="gb-focus relative shrink-0" style={{ width: 50, height: 29, borderRadius: 15, background: on ? "#06B6D4" : "#CBD5E1", opacity: disabled ? 0.55 : 1, transition: "background .2s" }}>
      <span className="absolute" style={{ top: 3, left: on ? 24 : 3, width: 23, height: 23, borderRadius: 12, background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.25)", transition: "left .2s" }} />
    </button>
  );
}
export function Stepper({ value, onMinus, onPlus, small, label }) {
  const s = small ? 36 : 48;
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onMinus} aria-label={`Moins${label ? ` : ${label}` : ""}`} className="gb-focus cy-tap rounded-[13px] font-extrabold" style={{ width: s, height: s, background: C.ground, color: C.navy, fontSize: small ? 18 : 24 }}>−</button>
      <span className="text-center font-extrabold" style={{ minWidth: small ? 34 : 56, fontFamily: FONT_D, fontSize: small ? 18 : 30 }}>{value}</span>
      <button type="button" onClick={onPlus} aria-label={`Plus${label ? ` : ${label}` : ""}`} className="gb-focus cy-tap rounded-[13px] font-extrabold text-white" style={{ width: s, height: s, background: C.navy, fontSize: small ? 18 : 24 }}>+</button>
    </div>
  );
}
export const inputStyle = { width: "100%", minHeight: 48, boxSizing: "border-box", borderRadius: 14, border: `1.5px solid ${C.line}`, background: "#fff", padding: "0 13px", fontSize: 15, fontWeight: 600, color: C.ink, outline: "none" };
export function Field({ label, children, hint }) {
  return <label className="block"><span className="block text-[11px] font-extrabold tracking-[0.04em] mb-1.5" style={{ color: C.muted }}>{label}</span>{children}{hint && <span className="block text-[11px] mt-1" style={{ color: C.muted }}>{hint}</span>}</label>;
}
export function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="cy-fade absolute inset-0 w-full h-full" style={{ background: "rgba(6,14,30,0.55)" }} />
      <div className="cy-sheet relative w-full max-w-[600px] rounded-t-[26px] px-4 pt-2.5 overflow-y-auto" style={{ background: "#fff", maxHeight: "88vh", paddingBottom: "calc(20px + env(safe-area-inset-bottom))", boxShadow: "0 -16px 40px -14px rgba(10,23,48,0.5)" }}>
        <div className="mx-auto mb-2.5 rounded-full" style={{ width: 40, height: 5, background: "#CBD5E1" }} />
        <div className="flex items-center justify-between mb-2"><p className="text-[17px] font-extrabold" style={{ fontFamily: FONT_D }}>{title}</p><button type="button" onClick={onClose} aria-label="Fermer" className="gb-focus w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: C.ground }}><Icon name="x" size={16} stroke={2.4} /></button></div>
        {children}
      </div>
    </div>
  );
}
export function Empty({ icon = "box", title, text, action }) {
  return (
    <div className="cy-a text-center py-10 px-6">
      <span className="inline-flex w-16 h-16 rounded-[22px] items-center justify-center" style={{ background: "#fff", border: `1px solid ${C.line}`, color: C.navy }}><Icon name={icon} size={28} /></span>
      <p className="mt-3 text-[17px] font-extrabold" style={{ fontFamily: FONT_D }}>{title}</p>
      {text && <p className="mt-1 text-[13px] leading-relaxed" style={{ color: C.muted }}>{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function Avatar({ name, tint = C.cyanSoft, ink = C.cyanInk, size = 40, dot }) {
  return (
    <span className="relative rounded-[13px] flex items-center justify-center font-extrabold shrink-0" style={{ width: size, height: size, background: tint, color: ink, fontSize: size * 0.38 }}>
      {String(name || "?").trim()[0]?.toUpperCase() || "?"}
      {dot && <span className="absolute rounded-full" style={{ right: -2, bottom: -2, width: 11, height: 11, background: dot, border: "2px solid #fff" }} />}
    </span>
  );
}
export function Tag({ children, tint = C.cyanSoft, ink = C.cyanInk }) {
  return <span className="text-[10.5px] font-extrabold rounded-[7px] px-2 py-[2px] whitespace-nowrap" style={{ background: tint, color: ink }}>{children}</span>;
}
// Barre en bas d'écran (total + bouton).
export function BottomBar({ children }) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] z-30 px-4 pt-3.5 no-print"
      style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "#fff", borderTop: `1px solid ${C.line}`, borderRadius: "24px 24px 0 0", boxShadow: "0 -12px 30px -18px rgba(10,23,48,0.45)" }}>
      {children}
    </div>
  );
}
export function Waves({ color = "#22D3EE", h = 22 }) {
  return (
    <span className="flex items-center gap-[3px]" style={{ height: h }} aria-hidden="true">
      {[0, 0.15, 0.3, 0.45, 0.6].map((d) => <span key={d} className="cy-wave" style={{ width: 3, height: h, borderRadius: 2, background: color, animationDelay: `${d}s` }} />)}
    </span>
  );
}
