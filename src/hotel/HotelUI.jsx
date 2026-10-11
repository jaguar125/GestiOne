// src/hotel/HotelUI.jsx — éléments d'interface communs du module Hôtel
// (couleurs, icônes dessinées à la main, boutons, en-têtes, interrupteurs).

export const H = {
  navy: "#12233D", navy2: "#1D3B63", gold: "#E0A93B", goldDark: "#B7791F", goldSoft: "#FCF3E1",
  ground: "#F4F5F8", card: "#FFFFFF", ink: "#0F172A", ink2: "#334155", muted: "#64748B", line: "#E2E6EC", line2: "#EEF0F4",
  green: "#15803D", greenSoft: "#E8F7EE", red: "#B91C1C", redSoft: "#FDECEC", orange: "#C2410C", orangeSoft: "#FFF1E2",
  violet: "#5B3CC4", violetSoft: "#F0EBFE", indigo: "#4F46E5", indigoSoft: "#EEF0FF",
  shadow: "0 2px 12px rgba(18,35,61,0.06)",
};

const P = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  bed: "M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M2 17h20",
  plus: "M12 5v14M5 12h14",
  wallet: "M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20M16 15h2",
  sliders: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4",
  fan: "M12 10.5C11 7 12 3 15 3s3 3.5 0 6M13.5 12c3.5-1 7.5 0 7.5 3s-3.5 3-6 0M12 13.5c1 3.5 0 7.5-3 7.5s-3-3.5 0-6M10.5 12C7 13 3 12 3 9s3.5-3 6 0",
  snow: "M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2.5L15 4M9 20l3-2.5 3 2.5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  moon: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18M6 6l12 12",
  back: "m15 18-6-6 6-6",
  chev: "m9 18 6-6-6-6",
  down: "m6 9 6 6 6-6",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  speaker: "M11 5 6 9H2v6h4l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7",
  cal: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM16 2v4M8 2v4M3 10h18",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z",
  sync: "M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8M21 4v5h-5M3 20v-5h5",
  lock: "M6 11h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM8 11V7a4 4 0 0 1 8 0v4",
  key: "M15.5 7.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM11 12v10M11 17h4M11 20h3",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  hash: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18",
  money: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  broom: "m14 4 6 6M17 7l-8.5 8.5M3 21c3 0 6-1 7.5-2.5l-3-3C6 17 5 19 3 21ZM9.5 14.5 6 11l3-3 3.5 3.5",
  warn: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  glass: "M8 22h8M12 15v7M5 3h14l-2 9a5 5 0 0 1-10 0Z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  swap: "M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16",
  share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13",
  printer: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  camera: "M3 7h3l2-3h8l2 3h3v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  image: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4M21 15l-5-5L5 21",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  clipboard: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4",
  trend: "M3 17l6-6 4 4 8-8M14 7h7v7",
  receipt: "M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6M9 15h4",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  ban: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8",
};

export function Icon({ name, size = 18, color = "currentColor", stroke = 2.2, style }) {
  const d = P[name] || P.plus;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d={d} />
    </svg>
  );
}

export function Btn({ children, onClick, kind = "navy", disabled, full, className = "", style, icon, type = "button", ariaLabel }) {
  const K = {
    navy: { background: H.navy, color: "#fff", border: "none" },
    gold: { background: H.gold, color: H.navy, border: "none", boxShadow: "0 10px 22px rgba(201,138,30,0.30)" },
    green: { background: H.green, color: "#fff", border: "none" },
    red: { background: H.red, color: "#fff", border: "none" },
    indigo: { background: H.indigo, color: "#fff", border: "none" },
    ghost: { background: "#fff", color: H.navy, border: `1.5px solid ${H.line}` },
    danger: { background: "#fff", color: H.red, border: "1.5px solid #F5C2C2" },
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={`gb-focus min-h-[48px] px-4 rounded-[15px] text-[14.5px] font-bold flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98] transition-transform disabled:opacity-45 ${full ? "w-full" : ""} ${className}`} style={{ ...K, ...style }}>
      {icon && <Icon name={icon} size={17} stroke={2.4} />}{children}
    </button>
  );
}

export function Card({ children, className = "", style, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`${onClick ? "gb-focus w-full text-left " : ""}rounded-[20px] ${className}`} style={{ background: H.card, boxShadow: H.shadow, ...style }}>
      {children}
    </Tag>
  );
}

export function Label({ children, right }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mt-4 mb-2 px-0.5">
      <span className="text-[14px] font-extrabold" style={{ color: H.ink }}>{children}</span>
      {right}
    </div>
  );
}

export function GroupTitle({ children }) {
  return <p className="mt-4 mb-1.5 px-1 text-[11.5px] font-extrabold tracking-[0.06em]" style={{ color: H.muted }}>{children}</p>;
}

export function Segmented({ options, value, onChange, small, grid }) {
  return (
    <div className="p-1 rounded-[16px] gap-[3px]" style={{ background: H.card, boxShadow: H.shadow, display: "grid", gridTemplateColumns: grid || `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={on} className={`gb-focus ${small ? "min-h-[38px] text-[12px]" : "min-h-[42px] text-[13px]"} rounded-[12px] font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden px-1`} style={{ background: on ? (o.color || H.navy) : "transparent", color: on ? "#fff" : (o.color || H.ink2) }}>
            <span className="truncate">{o.label}</span>
            {o.badge ? <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] flex items-center justify-center" style={{ background: on ? H.gold : H.redSoft, color: on ? H.navy : H.red }}>{o.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ on, children, onClick, color = H.navy, line = H.line, disabled, className = "" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={!!on} className={`gb-focus min-h-[40px] px-3.5 rounded-[13px] text-[12.5px] font-extrabold whitespace-nowrap disabled:opacity-40 ${className}`} style={{ border: `1.5px solid ${on ? color : line}`, background: on ? color : "#fff", color: on ? "#fff" : color }}>
      {children}
    </button>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} onClick={() => onChange(!on)} className="gb-focus relative shrink-0 rounded-full transition-colors" style={{ width: 48, height: 28, background: on ? "#16A34A" : "#CBD2DC" }}>
      <span className="absolute rounded-full bg-white transition-all" style={{ top: 3, left: on ? 23 : 3, width: 22, height: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

export function Stepper({ value, onMinus, onPlus, sub, big }) {
  return (
    <div className="flex items-center gap-2 rounded-[18px] p-2" style={{ background: H.card, boxShadow: H.shadow }}>
      <button type="button" onClick={onMinus} aria-label="Diminuer" className="gb-focus w-12 h-12 rounded-[14px] text-[22px] font-extrabold shrink-0" style={{ background: "#F1F3F6", color: H.navy }}>−</button>
      <div className="flex-1 min-w-0 text-center">
        <div className={`${big ? "text-[26px]" : "text-[21px]"} font-extrabold tracking-tight truncate`} style={{ color: H.navy }}>{value}</div>
        {sub && <div className="text-[11.5px] truncate" style={{ color: H.muted }}>{sub}</div>}
      </div>
      <button type="button" onClick={onPlus} aria-label="Augmenter" className="gb-focus w-12 h-12 rounded-[14px] text-[22px] font-extrabold shrink-0" style={{ background: "#F1F3F6", color: H.navy }}>+</button>
    </div>
  );
}

export function TopBar({ title, sub, onBack, right }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Retour" className="gb-focus w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: "#fff", border: `1.5px solid ${H.line}`, color: H.navy }}>
          <Icon name="back" size={20} stroke={2.4} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-[22px] font-extrabold tracking-tight leading-tight truncate" style={{ color: H.ink }}>{title}</h1>
        {sub && <p className="text-[12.5px] truncate" style={{ color: H.muted }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function RoomBadge({ num, type, size = 46, tone }) {
  const t = type === "clim" ? { ink: "#2457B8", tint: "#E7EEFD", s: "CLIM" } : { ink: "#0B7A6E", tint: "#E2F5F2", s: "VENT" };
  const bg = tone?.bg || t.tint;
  const fg = tone?.fg || t.ink;
  return (
    <div className="rounded-[14px] flex flex-col items-center justify-center shrink-0" style={{ width: size, height: size, background: bg, color: fg }}>
      <span className="font-extrabold leading-none" style={{ fontSize: size > 50 ? 16 : 15 }}>{num}</span>
      <span className="font-extrabold mt-[3px] tracking-[0.04em]" style={{ fontSize: 9 }}>{t.s}</span>
    </div>
  );
}

export function Row({ icon, tint, ink, title, sub, value, valueInk, onClick, last, locked, right }) {
  const Tag = onClick && !locked ? "button" : "div";
  return (
    <Tag type={Tag === "button" ? "button" : undefined} onClick={locked ? undefined : onClick} className={`${Tag === "button" ? "gb-focus " : ""}w-full min-h-[54px] flex items-center gap-3 text-left`} style={{ borderBottom: last ? "none" : `1px solid ${H.line2}`, opacity: locked ? 0.55 : 1 }}>
      {icon && <span className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: tint, color: ink }}><Icon name={icon} size={17} /></span>}
      <span className="flex-1 min-w-0 py-2">
        <span className="block text-[14px] font-extrabold truncate" style={{ color: H.ink }}>{title}</span>
        {sub && <span className="block text-[11.5px] truncate" style={{ color: H.muted }}>{sub}</span>}
      </span>
      {value != null && <span className="text-[12.5px] font-extrabold shrink-0" style={{ color: valueInk || H.ink2 }}>{value}</span>}
      {right}
      {locked ? <Icon name="lock" size={15} color="#94A3B8" /> : onClick ? <Icon name="chev" size={16} color="#94A3B8" stroke={2.4} /> : null}
    </Tag>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[12px] font-extrabold mb-1.5" style={{ color: "#475569" }}>{label}</span>
      {children}
      {hint && <span className="block text-[11px] mt-1" style={{ color: H.muted }}>{hint}</span>}
    </label>
  );
}

export const inputStyle = { width: "100%", minHeight: 48, boxSizing: "border-box", borderRadius: 14, borderWidth: 1.5, borderStyle: "solid", borderColor: H.line, background: "#fff", padding: "0 14px", fontSize: 15, color: H.ink, outline: "none" };

export function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center no-print" role="dialog" aria-label={title} style={{ background: "rgba(9,18,34,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-[28px] p-4 gb-slide-up" style={{ background: H.ground, paddingBottom: "calc(20px + env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 rounded-full" style={{ width: 44, height: 5, background: "#D6DDD2" }} />
        <div className="flex items-center gap-3 mb-3">
          <p className="flex-1 text-[18px] font-extrabold" style={{ color: H.ink }}>{title}</p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="gb-focus w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: "#fff", border: `1.5px solid ${H.line}` }}><Icon name="x" size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon = "bed", title, text, action }) {
  return (
    <div className="rounded-[22px] px-5 py-7 text-center" style={{ background: "#fff", boxShadow: H.shadow }}>
      <span className="mx-auto w-12 h-12 rounded-[15px] flex items-center justify-center" style={{ background: H.goldSoft, color: H.goldDark }}><Icon name={icon} size={22} /></span>
      <p className="mt-3 text-[15px] font-extrabold" style={{ color: H.ink }}>{title}</p>
      {text && <p className="mt-1 text-[12.5px] leading-snug" style={{ color: H.muted }}>{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
