// src/MomoPicker.jsx
//
// Choix de l'opérateur Mobile Money, commun à toutes les entreprises
// (boutique, bar, cave, hôtel, cyber café…) : Orange Money, MTN MoMo,
// Moov Money et Wave. Wave est choisi par défaut. Pas de saisie de
// référence : on choisit l'opérateur puis on valide le paiement.
// L'opérateur est enregistré avec le paiement et affiché dans l'historique
// et sur le reçu (« Mobile Money · Wave »).

export const MOMO_OPERATORS = [
  { id: "Orange Money", short: "Orange", mark: "OM", bg: "#FF7900", fg: "#FFFFFF" },
  { id: "MTN MoMo", short: "MTN", mark: "MTN", bg: "#FFCC00", fg: "#1A1A1A" },
  { id: "Moov Money", short: "Moov", mark: "M", bg: "#0066B3", fg: "#FFFFFF" },
  { id: "Wave", short: "Wave", mark: "W", bg: "#1DC4FF", fg: "#FFFFFF" },
];
export const DEFAULT_MOMO = "Wave";

// Anciennes valeurs (« Orange », « MTN »…) ramenées au nom complet.
export function momoName(op) {
  if (!op) return "";
  const s = String(op).trim();
  const o = MOMO_OPERATORS.find((x) => x.id.toLowerCase() === s.toLowerCase() || x.short.toLowerCase() === s.toLowerCase());
  return o ? o.id : s;
}
export const momoLabel = (op) => (op ? `Mobile Money · ${momoName(op)}` : "Mobile Money");
export const momoOf = (op) => MOMO_OPERATORS.find((x) => x.id === momoName(op)) || null;

export function MomoPicker({ value, onChange, title = "Opérateur Mobile Money", dark = false }) {
  const cur = momoName(value) || DEFAULT_MOMO;
  const muted = dark ? "rgba(255,255,255,0.65)" : "#64748B";
  return (
    <div role="radiogroup" aria-label={title}>
      {title && <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: muted }}>{title}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
        {MOMO_OPERATORS.map((o) => {
          const on = cur === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.id}
              onClick={() => onChange(o.id)}
              className="gb-focus"
              style={{
                position: "relative", minWidth: 0, minHeight: 70, padding: "8px 4px", borderRadius: 16, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                background: on ? o.bg : dark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                border: `1.5px solid ${on ? o.bg : dark ? "rgba(255,255,255,0.18)" : "#DDE4EE"}`,
                boxShadow: on ? `0 10px 20px -10px ${o.bg}` : "none",
                transition: "background .18s, border-color .18s, box-shadow .18s, transform .12s",
                transform: on ? "translateY(-1px)" : "none",
              }}
            >
              <span style={{ width: 30, height: 30, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: o.mark.length > 2 ? 9 : 11.5, fontWeight: 900, letterSpacing: "-0.02em", background: on ? "rgba(255,255,255,0.95)" : o.bg, color: on ? (o.bg === "#FFCC00" ? "#1A1A1A" : o.bg) : o.fg, boxShadow: on ? "none" : "inset 0 0 0 1px rgba(0,0,0,0.06)" }}>{o.mark}</span>
              <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.1, textAlign: "center", color: on ? o.fg : dark ? "#FFFFFF" : "#0F172A", overflowWrap: "anywhere" }}>{o.short}</span>
              {on && (
                <span aria-hidden="true" style={{ position: "absolute", top: 5, right: 5, width: 16, height: 16, borderRadius: 999, background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={o.bg === "#FFCC00" ? "#1A1A1A" : o.bg} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
