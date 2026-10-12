// src/cyber/CyberPaper.jsx
//
// Affichage des reçus du cyber café : le ticket « papier » (avec son
// code-barres) et l'écran plein cadre avec Partager / Imprimer, utilisé pour
// le reçu de vente, le reçu de paiement de crédit et le rapport de clôture.

import { useEffect, useRef, useState } from "react";
import { C, FONT_D, Icon } from "./CyberUI.jsx";
import { drawBarcode, printDoc, shareDoc } from "./cyberReceipt.js";

export function Barcode({ code }) {
  const ref = useRef(null);
  useEffect(() => { drawBarcode(ref.current, code); }, [code]);
  if (!code) return null;
  return <div className="flex justify-center pt-1 px-2"><svg ref={ref} role="img" aria-label={`Code-barres ${code}`} style={{ maxWidth: "100%", height: "auto" }} /></div>;
}

// Ticket « papier » : sans texte coupé, tout passe à la ligne si besoin.
const WRAP = { overflowWrap: "anywhere", wordBreak: "normal" };
function Row({ a, b, strong, muted }) {
  return (
    <div className="flex items-start justify-between gap-3 py-[3px]">
      <span className="min-w-0 text-[11.5px]" style={{ ...WRAP, color: muted ? C.muted : "#475569" }}>{a}</span>
      <span className={`text-right text-[12px] ${strong ? "font-extrabold" : "font-bold"}`} style={{ ...WRAP, maxWidth: "62%", color: C.ink }}>{b}</span>
    </div>
  );
}
const Rule = () => <div className="my-3" style={{ height: 1, background: "#E3E8F0" }} />;

export function PaperDoc({ m, info, icon = "monitor" }) {
  return (
    <div className="mx-1 mt-4">
      <div className="cy-print rounded-t-[16px] px-[18px] pt-5 pb-5" style={{ background: "#fff", color: C.ink, fontVariantNumeric: "tabular-nums", boxShadow: "0 24px 44px -20px rgba(0,0,0,0.65)" }}>
        <div className="flex flex-col items-center text-center">
          <span className="w-12 h-12 rounded-[15px] flex items-center justify-center" style={{ background: C.navy, boxShadow: "0 8px 18px -8px rgba(10,23,48,0.7)" }}><Icon name={icon} size={22} color="#22D3EE" /></span>
          <p className="mt-2 text-[16px] font-extrabold leading-tight tracking-[0.02em]" style={{ ...WRAP, fontFamily: FONT_D }}>{info.name.toUpperCase()}</p>
          {info.address && <p className="mt-0.5 text-[11px] leading-snug" style={{ ...WRAP, color: C.muted }}>{info.address}</p>}
          {info.phone && <p className="text-[11px]" style={{ color: C.muted }}>Tél. {info.phone}</p>}
          <span className="mt-2.5 inline-flex items-center px-3 py-1 rounded-full text-[10.5px] font-extrabold tracking-[0.12em]" style={m.cancelled ? { background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" } : { background: "#E0F7FB", color: "#0E7490", border: "1px solid #A5F3FC" }}>{m.cancelled ? "REÇU ANNULÉ" : m.title}</span>
        </div>
        <Rule />
        {m.rows.map(([a, b]) => <Row key={a} a={a} b={b} muted />)}
        {m.lines.length > 0 && <Rule />}
        <div className="flex flex-col gap-2">
          {m.lines.map((l, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-[12.5px] font-bold leading-snug" style={WRAP}>{l.label}</span>
                <span className="text-[12.5px] font-extrabold whitespace-nowrap">{l.amount}</span>
              </div>
              {l.detail && <p className="mt-0.5 text-[11px] leading-snug" style={{ ...WRAP, color: C.muted }}>{l.detail}</p>}
              {l.official && <div className="mt-0.5 flex items-start justify-between gap-3 text-[11px]" style={{ color: "#B45309" }}><span className="min-w-0" style={WRAP}>Frais officiels (reversés)</span><span className="font-bold whitespace-nowrap">{l.official}</span></div>}
            </div>
          ))}
        </div>
        <div className="mt-3.5 rounded-[14px] px-3.5 py-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1" style={{ background: m.cancelled ? "#FEF2F2" : "#F1F5FB", border: `1px solid ${m.cancelled ? "#FECACA" : "#DCE4F0"}` }}>
          <span className="text-[11px] font-extrabold tracking-[0.1em]" style={{ color: C.muted }}>{m.totalLabel}</span>
          <span className="ml-auto text-[21px] font-extrabold whitespace-nowrap" style={{ fontFamily: FONT_D, color: m.cancelled ? "#B91C1C" : C.navy, textDecoration: m.cancelled ? "line-through" : "none" }}>{m.total}</span>
        </div>
        {m.pay.length > 0 && <div className="mt-2.5">{m.pay.map(([a, b]) => <Row key={a} a={a} b={b} />)}</div>}
        {m.notes.length > 0 && <div className="mt-3 rounded-[12px] px-3 py-2.5 text-[11.5px] leading-snug" style={{ ...WRAP, background: m.cancelled ? "#FEF2F2" : "#FFFBEB", color: m.cancelled ? "#991B1B" : "#92400E", border: `1px solid ${m.cancelled ? "#FECACA" : "#FDE68A"}` }}>{m.notes.map((n) => <p key={n}>{n}</p>)}</div>}
        {(m.code || m.thanks.length > 0) && <Rule />}
        <Barcode code={m.code} />
        <div className="mt-2 text-center text-[11.5px] leading-relaxed" style={{ ...WRAP, color: "#475569" }}>{m.thanks.map((t, i) => <p key={i} style={{ minHeight: t ? undefined : 12 }}>{t}</p>)}</div>
      </div>
      <div style={{ height: 12, background: "radial-gradient(circle at 6px -2px, transparent 7px, #FFFFFF 7.5px) 0 0 / 12px 12px repeat-x" }} />
    </div>
  );
}

// Écran plein cadre : en-tête (succès ou titre), ticket, boutons.
export function DocScreen({ ctx, m, info, phone, head, title, onBack, mainLabel, mainIcon = "back", onMain, autoPrint, icon }) {
  const { pushToast } = ctx;
  const [busy, setBusy] = useState(false);
  const print = async () => {
    setBusy(true);
    try { const how = await printDoc(m, info); if (how === "pdf") pushToast("Reçu enregistré en PDF", "ok"); } catch { pushToast("Impression impossible", "error"); }
    setBusy(false);
  };
  useEffect(() => { if (autoPrint) { const t = setTimeout(print, 450); return () => clearTimeout(t); } return undefined; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="-mx-4 px-4 min-h-screen text-white" style={{ background: C.navy, paddingBottom: 200 }}>
      <div className="pt-4 text-center">
        {head || (
          <div className="flex items-center gap-2.5 text-left">
            <button type="button" onClick={onBack} aria-label="Retour" className="gb-focus cy-tap w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}><Icon name="back" size={20} stroke={2.4} /></button>
            <span className="text-[20px] font-extrabold" style={{ fontFamily: FONT_D }}>{title}</span>
          </div>
        )}
      </div>
      <PaperDoc m={m} info={info} icon={icon} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] px-4 pt-3 grid grid-cols-2 gap-2 z-30" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "linear-gradient(to top, #0A1730 75%, rgba(10,23,48,0))" }}>
        <button type="button" onClick={() => shareDoc(m, info, phone)} className="gb-focus cy-tap min-h-[50px] px-3 py-2 rounded-[16px] flex items-center justify-center gap-2 text-center leading-tight text-[13.5px] font-extrabold" style={{ border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.08)", color: "#fff" }}><Icon name="share" size={17} />Partager</button>
        <button type="button" onClick={print} disabled={busy} className="gb-focus cy-tap min-h-[50px] px-3 py-2 rounded-[16px] flex items-center justify-center gap-2 text-center leading-tight text-[13.5px] font-extrabold" style={{ background: "#22D3EE", color: C.navy, boxShadow: "0 10px 22px -10px rgba(34,211,238,0.9)" }}><Icon name="printer" size={17} />{busy ? "Impression…" : "Imprimer"}</button>
        <button type="button" onClick={onMain || onBack} className="gb-focus cy-tap col-span-2 min-h-[54px] px-4 py-2 rounded-[18px] flex items-center justify-center gap-2 text-center leading-tight text-[15px] font-extrabold" style={{ background: "#fff", color: C.navy }}><Icon name={mainIcon} size={19} stroke={2.6} />{mainLabel || "Retour"}</button>
      </div>
    </div>
  );
}

// Bandeau « succès » animé en haut d'un reçu qui vient d'être créé.
export function SuccessHead({ title, sub }) {
  return (
    <>
      <span className="cy-pop inline-flex w-14 h-14 rounded-full items-center justify-center" style={{ background: "#10B981", boxShadow: "0 10px 26px -6px rgba(16,185,129,0.8)" }}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="cy-ck" d="M20 6 9 17l-5-5" /></svg></span>
      <p className="cy-a text-[20px] font-extrabold mt-2" style={{ fontFamily: FONT_D }}>{title}</p>
      <p className="cy-a text-[12.5px]" style={{ color: "#B6C4DC" }}>{sub}</p>
    </>
  );
}
