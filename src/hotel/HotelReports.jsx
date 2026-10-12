// src/hotel/HotelReports.jsx
//
// Rapports du propriétaire (invisibles pour la réception et le ménage) :
// Historique (toutes les opérations par date), Inventaire (activité des
// chambres) et Bénéfices (recettes − dépenses par mois, trimestre,
// semestre, année ou plage de dates).

import { useMemo, useState } from "react";
import { H, Icon, Chip, TopBar, Empty } from "./HotelUI.jsx";
import { hotelFinance, hotelEvents, hotelOccupancy, periodBounds, dayBounds, localDayKey, dayKeyToMs, hmOf, DAY, toMs, roomTypeOf } from "./hotelLogic.js";
import { receiptInfo } from "./hotelReceipts.js";
import { exportReportPdf } from "./hotelPdf.js";

const navyGrad = "linear-gradient(135deg, #0A1730 0%, #17305A 60%, #1B3361 100%)";
const cardStyle = { background: "#fff", boxShadow: "0 4px 14px -8px rgba(10,23,48,0.25)" };
export const fmtK = (n) => { const a = Math.abs(n), s = n < 0 ? "−" : ""; if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2).replace(".", ",")} M`; if (a >= 1e4) return `${s}${Math.round(a / 1000)} k`; return `${s}${Math.round(a).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")}`; };
const dFr = (ms) => new Date(ms).toLocaleDateString("fr-FR");

function PdfBtn({ onClick, pushToast }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true);
    try { await onClick(); } catch (e) { if (!/cancel/i.test(String(e?.message || e))) pushToast?.(e?.message || "PDF impossible", "error"); }
    setBusy(false);
  };
  return <button type="button" onClick={go} disabled={busy} aria-label="Télécharger en PDF" className="gb-focus h-10 px-3 rounded-[13px] text-[12px] font-extrabold flex items-center gap-1.5 shrink-0 disabled:opacity-60" style={{ background: "#fff", border: `1.5px solid ${H.line}`, color: H.navy }}><Icon name={busy ? "sync" : "download"} size={15} stroke={2.4} />{busy ? "PDF…" : "PDF"}</button>;
}
function OwnerBadge() {
  return <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[7px] text-[10.5px] font-extrabold" style={{ background: H.goldSoft, color: H.goldDark }}><Icon name="lock" size={11} stroke={2.6} />Propriétaire</span>;
}
// ---------- Choix de la période ----------
function useRange(now, initial = "month") {
  const [r, setR] = useState(initial);
  const [d0] = dayBounds(now);
  const firstOfMonth = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const [cFrom, setCFrom] = useState(localDayKey(firstOfMonth));
  const [cTo, setCTo] = useState(localDayKey(now));
  let from = d0, to = d0 + DAY;
  if (r === "d7") from = d0 - 6 * DAY;
  else if (r === "month") from = firstOfMonth;
  else if (r === "custom") { const a = dayKeyToMs(cFrom), b = dayKeyToMs(cTo); if (Number.isFinite(a) && Number.isFinite(b)) { from = Math.min(a, b); to = Math.max(a, b) + DAY; } }
  return { r, setR, from, to, cFrom, setCFrom, cTo, setCTo };
}
const dateInput = { flex: 1, minWidth: 0, height: 42, borderRadius: 11, border: "none", background: "#F7F8FB", padding: "0 10px", fontSize: 13.5, fontWeight: 800, color: H.ink, fontFamily: "inherit" };
function RangePicker({ rg }) {
  return (
    <>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
        {[["today", "Aujourd'hui"], ["d7", "7 jours"], ["month", "Ce mois"], ["custom", "Plage…"]].map(([id, l]) => <Chip key={id} on={rg.r === id} onClick={() => rg.setR(id)} className="!min-h-[36px] !px-3 !text-[12px]">{l}</Chip>)}
      </div>
      <div className="mt-2 rounded-[16px] p-2 flex items-center gap-1.5" style={{ background: "#fff", border: `1.5px solid ${rg.r === "custom" ? H.gold : "#fff"}` }}>
        <Icon name="cal" size={16} color={H.goldDark} style={{ marginLeft: 4, flexShrink: 0 }} />
        {rg.r === "custom" ? (
          <>
            <input type="date" aria-label="Du" value={rg.cFrom} onChange={(e) => rg.setCFrom(e.target.value)} style={dateInput} />
            <span className="font-extrabold" style={{ color: "#94A3B8" }}>→</span>
            <input type="date" aria-label="Au" value={rg.cTo} onChange={(e) => rg.setCTo(e.target.value)} style={dateInput} />
          </>
        ) : <span className="flex-1 text-[13px] font-extrabold px-1">Du {dFr(rg.from)} au {dFr(rg.to - 1)}</span>}
      </div>
    </>
  );
}

// ---------- Historique ----------
const EV = {
  pass: ["clock", "#FFF1F3", "#E11D48"], night: ["moon", "#EEF0FF", "#4F46E5"], resa: ["cal", "#F5F3FF", "#7C3AED"],
  ext: ["plus", "#E0F7FB", "#0E7490"], exp: ["money", "#FEF2F2", "#B91C1C"], cancel: ["ban", "#F1F5F9", "#64748B"],
};
export function HistoryScreen({ ctx, onBack, openReceipt }) {
  const { stays, reservations, expenses, now, fmt, shop } = ctx;
  const rg = useRange(now, "month");
  const [t, setT] = useState("all");
  const fin = useMemo(() => hotelFinance({ stays, reservations, expenses, from: rg.from, to: rg.to }), [stays, reservations, expenses, rg.from, rg.to]);
  const events = useMemo(() => hotelEvents({ stays, reservations, expenses, from: rg.from, to: rg.to }), [stays, reservations, expenses, rg.from, rg.to]);
  const keep = (e) => t === "all" || e.k === t || (t === "pass" && e.k === "ext") || (t === "cancel" && e.cancelled);
  const shown = events.filter(keep).slice(0, 400);
  const days = [];
  shown.forEach((e) => { const k = localDayKey(e.at); let d = days[days.length - 1]; if (!d || d.k !== k) { d = { k, at: e.at, items: [] }; days.push(d); } d.items.push(e); });
  const [d0] = dayBounds(now);
  const dayTitle = (ms) => { const [s] = dayBounds(ms); const w = new Date(ms).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }); return s === d0 ? `Aujourd'hui · ${w}` : s === d0 - DAY ? `Hier · ${w}` : w; };
  const sign = (e) => (e.k === "exp" ? -1 : 1);
  const exportPdf = () => exportReportPdf(`Historique-${localDayKey(rg.from)}-au-${localDayKey(rg.to - 1)}.pdf`, {
    title: "Historique", subtitle: `Du ${dFr(rg.from)} au ${dFr(rg.to - 1)} · ${shown.length} opération${shown.length > 1 ? "s" : ""}`,
    kpis: [{ label: "Recettes", value: fmt(fin.income), color: "#15803D" }, { label: "Dépenses", value: fmt(fin.expensesTotal), color: "#B91C1C" }, { label: "Net", value: fmt(fin.net), color: "#0E7490" }, { label: "Séjours", value: String(fin.counts.pass + fin.counts.night), color: "#1B3361" }],
    sections: [{ title: "Opérations", head: ["Date", "Opération", "Détail", "Montant"], widths: [1.15, 2.3, 2.1, 1.1], align: ["left", "left", "left", "right"],
      rows: shown.map((e) => [`${new Date(e.at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${hmOf(e.at)}`, e.title + (e.cancelled && e.k !== "cancel" ? " (annulé)" : ""), e.sub, { t: `${e.k === "exp" ? "-" : e.k === "cancel" ? "" : "+"}${fmt(e.amount)}`, color: e.k === "exp" ? "#B91C1C" : e.cancelled ? "#94A3B8" : "#15803D", bold: true }]),
      total: ["Total net", "", "", fmt(fin.net)] }],
  }, receiptInfo(shop, ctx.settings));
  const openOf = (e) => { const src = e.stay || e.resa; const rc = src && (src.receipts || [])[0]; return rc ? () => openReceipt(rc) : null; };
  return (
    <div>
      <TopBar title="Historique" sub="Toutes les opérations de l'hôtel" onBack={onBack} right={<PdfBtn onClick={exportPdf} pushToast={ctx.pushToast} />} />
      <RangePicker rg={rg} />
      <div className="mt-3 rounded-[22px] p-4 text-white" style={{ background: navyGrad }}>
        <div className="flex items-center justify-between"><span className="text-[11.5px] font-extrabold tracking-[0.08em]" style={{ color: "#E9C77F" }}>RÉSUMÉ DE LA PÉRIODE</span><OwnerBadge /></div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <span><span className="block text-[10.5px] font-bold" style={{ color: "#AEBBD2" }}>Recettes</span><span className="block text-[16px] font-extrabold whitespace-nowrap" style={{ color: "#6EE7B7" }}>{fmtK(fin.income)} F</span></span>
          <span><span className="block text-[10.5px] font-bold" style={{ color: "#AEBBD2" }}>Dépenses</span><span className="block text-[16px] font-extrabold whitespace-nowrap" style={{ color: "#FDA4AF" }}>{fmtK(fin.expensesTotal)} F</span></span>
          <span><span className="block text-[10.5px] font-bold" style={{ color: "#AEBBD2" }}>Net</span><span className="block text-[16px] font-extrabold whitespace-nowrap" style={{ color: "#67E8F9" }}>{fmtK(fin.net)} F</span></span>
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-[10.5px] font-bold" style={{ color: "#C9D3E6" }}>
          {[["passages", fin.counts.pass], ["nuitées", fin.counts.night], ["réservations", fin.counts.resa], ["annulations", fin.counts.cancel]].map(([l, n]) => <span key={l}><b className="block text-[16px] text-white">{n}</b>{l}</span>)}
        </div>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
        {[["all", "Tout"], ["pass", "Passages"], ["night", "Nuitées"], ["resa", "Réservations"], ["exp", "Dépenses"], ["cancel", "Annulations"]].map(([id, l]) => <Chip key={id} on={t === id} onClick={() => setT(id)} color={H.goldDark} line={H.line} className="!min-h-[34px] !px-3 !text-[11.5px]">{l}</Chip>)}
      </div>
      {days.length === 0 ? <div className="mt-3"><Empty icon="history" title="Aucune opération" text="Rien sur cette période pour ce filtre." /></div> : days.map((d) => {
        const tot = d.items.filter((e) => !e.cancelled && e.k !== "cancel").reduce((a, e) => a + sign(e) * e.amount, 0);
        return (
          <div key={d.k}>
            <div className="mt-3.5 mb-1.5 flex items-center gap-2 px-0.5"><span className="text-[13px] font-extrabold">{dayTitle(d.at)}</span><span className="flex-1 h-px" style={{ background: "#DDE2EA" }} /><span className="text-[11.5px] font-extrabold" style={{ color: tot >= 0 ? H.green : H.red }}>{tot >= 0 ? "+" : "−"}{fmt(Math.abs(tot))}</span></div>
            <div className="rounded-[20px] px-3" style={cardStyle}>
              {d.items.map((e, i) => {
                const S = EV[e.k] || EV.pass;
                const open = openOf(e);
                const Tag = open ? "button" : "div";
                return (
                  <Tag key={e.id} type={open ? "button" : undefined} onClick={open || undefined} className={`${open ? "gb-focus " : ""}w-full text-left min-h-[56px] flex items-center gap-2.5`} style={{ borderBottom: i === d.items.length - 1 ? "none" : "1px solid #F0F2F6", opacity: e.cancelled && e.k !== "cancel" ? 0.7 : 1 }}>
                    <span className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: S[1], color: S[2] }}><Icon name={S[0]} size={17} stroke={2.3} /></span>
                    <span className="flex-1 min-w-0 py-1.5"><span className="block text-[13px] font-extrabold truncate">{e.title}</span><span className="block text-[11px] truncate" style={{ color: H.muted }}>{hmOf(e.at)}{e.sub ? ` · ${e.sub}` : ""}</span></span>
                    <span className="text-right shrink-0"><span className="block text-[13.5px] font-extrabold whitespace-nowrap" style={{ color: e.k === "exp" ? H.red : e.cancelled ? "#94A3B8" : H.green, textDecoration: e.cancelled ? "line-through" : "none" }}>{e.k === "exp" ? "−" : e.k === "cancel" ? "" : "+"}{fmt(e.amount)}</span>{e.amountNote ? <span className="block text-[10px] font-bold" style={{ color: H.muted }}>{e.amountNote}</span> : null}</span>
                  </Tag>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Inventaire ----------
export function InventoryScreen({ ctx, onBack }) {
  const { stays, reservations, expenses, rooms, now, fmt, shop } = ctx;
  const rg = useRange(now, "month");
  const [allRooms, setAllRooms] = useState(false);
  const fin = useMemo(() => hotelFinance({ stays, reservations, expenses, from: rg.from, to: rg.to }), [stays, reservations, expenses, rg.from, rg.to]);
  const occ = useMemo(() => hotelOccupancy({ stays, rooms, from: rg.from, to: rg.to, now }), [stays, rooms, rg.from, rg.to, Math.floor(now / 60000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const perRoom = occ.perRoom.map((x) => ({ ...x, amount: fin.byRoom[x.room.num] || 0 })).sort((a, b) => b.amount - a.amount || b.stays - a.stays);
  const maxAmt = Math.max(1, ...perRoom.map((x) => x.amount));
  const resIn = reservations.filter((r) => { const at = toMs(r.createdAt || r.start); return at >= rg.from && at < rg.to; });
  const resStats = [["Honorées", resIn.filter((r) => r.status === "arrived").length, H.green], ["À venir", resIn.filter((r) => (r.status === "confirmed" || r.status === "pending") && toMs(r.end) > now).length, H.indigo], ["Annulées", resIn.filter((r) => r.status === "cancelled" || r.status === "deleted").length, "#BE123C"]];
  const users = Object.entries(fin.byUser).sort((a, b) => b[1] - a[1]);
  const basket = occ.stays ? Math.round(fin.income / occ.stays) : 0;
  const days = occ.days.slice(-31);
  const typeShare = (fin.byType.vent + fin.byType.clim) || 1;
  const exportPdf = () => exportReportPdf(`Inventaire-${localDayKey(rg.from)}-au-${localDayKey(rg.to - 1)}.pdf`, {
    title: "Inventaire des chambres", subtitle: `Du ${dFr(rg.from)} au ${dFr(rg.to - 1)} · ${rooms.length} chambres`,
    kpis: [{ label: "Taux d'occupation", value: `${occ.pct} %`, color: "#0B7A6E" }, { label: "Séjours", value: String(occ.stays), color: "#E11D48" }, { label: "Heures vendues", value: `${occ.soldHours} h`, color: "#4F46E5" }, { label: "Panier moyen", value: fmt(basket), color: "#0E7490" }],
    sections: [
      { title: "Par chambre", head: ["Chambre", "Type", "Séjours", "Heures", "Recette"], widths: [1, 1.4, 1, 1, 1.4], align: ["left", "left", "right", "right", "right"],
        rows: perRoom.map((x) => [x.room.num, roomTypeOf(x.room.type).label, String(x.stays), String(Math.round(x.ms / 3600000)), { t: fmt(x.amount), bold: true }]),
        total: ["Total", "", String(occ.stays), String(occ.soldHours), fmt(perRoom.reduce((t, x) => t + x.amount, 0))] },
      { title: "Par type de chambre", head: ["Type", "Chambres", "Séjours", "Occupation", "Recette"], widths: [1.4, 1, 1, 1, 1.4], align: ["left", "right", "right", "right", "right"],
        rows: ["vent", "clim"].map((t) => [roomTypeOf(t).plural, String(occ.perType[t].rooms), String(occ.perType[t].stays), `${occ.perType[t].pct} %`, fmt(fin.byType[t])]) },
      { title: "Réservations", head: ["Statut", "Nombre"], widths: [3, 1], rows: resStats.map(([l, n]) => [l, String(n)]) },
      { title: "Par réceptionniste", head: ["Nom", "Encaissé"], widths: [3, 1.4], rows: users.map(([u, a2]) => [u, fmt(a2)]) },
    ],
  }, receiptInfo(shop, ctx.settings));
  return (
    <div>
      <TopBar title="Inventaire" sub="Activité des chambres sur la période" onBack={onBack} right={<PdfBtn onClick={exportPdf} pushToast={ctx.pushToast} />} />
      <RangePicker rg={rg} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[["Taux d'occupation", `${occ.pct} %`, `${rooms.length} chambres`, "#0B7A6E"], ["Séjours", String(occ.stays), `${fin.counts.pass} passages · ${fin.counts.night} nuitées`, "#E11D48"], ["Heures vendues", `${occ.soldHours.toLocaleString("fr-FR")} h`, `dont ${occ.nightHours} h de nuit`, "#4F46E5"], ["Panier moyen", fmt(basket), "par séjour", H.goldDark]].map(([l, v, s, c]) => (
          <div key={l} className="rounded-[18px] p-3" style={{ ...cardStyle, borderTop: `4px solid ${c}` }}><p className="text-[11px] font-bold" style={{ color: H.muted }}>{l}</p><p className="text-[20px] font-extrabold whitespace-nowrap" style={{ color: c }}>{v}</p><p className="text-[10.5px] font-bold truncate" style={{ color: "#94A3B8" }}>{s}</p></div>
        ))}
      </div>
      {days.length > 1 && (
        <div className="mt-3 rounded-[22px] p-3.5" style={cardStyle}>
          <div className="flex items-baseline"><span className="flex-1 text-[14.5px] font-extrabold">Taux d'occupation par jour</span><span className="text-[11px] font-bold" style={{ color: H.muted }}>moy. {occ.pct} %</span></div>
          <div className="mt-3 flex items-end gap-[3px]" style={{ height: 120, borderBottom: `1px solid ${H.line}` }}>
            {days.map((x) => <span key={x.d} title={`${dFr(x.d)} : ${x.pct ?? 0} %`} className="flex-1" style={{ height: `${Math.max(2, ((x.pct || 0) / 100) * 120)}px`, borderRadius: "5px 5px 2px 2px", background: x.pct == null ? "#EEF0F5" : x.pct >= 80 ? "linear-gradient(180deg,#F0C463,#0891B2)" : "linear-gradient(180deg,#2DD4BF,#0B7A6E)" }} />)}
          </div>
          <div className="mt-1 flex gap-[3px] text-[9px] font-bold" style={{ color: "#94A3B8" }}>{days.map((x, i) => <span key={x.d} className="flex-1 text-center">{days.length <= 12 || i % Math.ceil(days.length / 8) === 0 ? new Date(x.d).getDate() : ""}</span>)}</div>
        </div>
      )}
      <div className="mt-3 rounded-[22px] p-3.5" style={cardStyle}>
        <p className="text-[14.5px] font-extrabold">Par type de chambre</p>
        <div className="mt-2.5 h-3.5 rounded-full overflow-hidden flex" style={{ background: "#EEF0F5" }}><span style={{ width: `${(fin.byType.vent / typeShare) * 100}%`, background: "#0B7A6E" }} /><span style={{ width: `${(fin.byType.clim / typeShare) * 100}%`, background: "#2457B8" }} /></div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {["vent", "clim"].map((t) => { const T = roomTypeOf(t); const P = occ.perType[t]; return <div key={t} className="rounded-[14px] p-2.5" style={{ background: T.tint }}><p className="text-[11px] font-extrabold uppercase" style={{ color: T.ink }}>{T.plural} · {P.rooms}</p><p className="text-[16px] font-extrabold whitespace-nowrap">{fmt(fin.byType[t])}</p><p className="text-[10.5px] font-bold" style={{ color: "#475569" }}>{P.stays} séjours · {P.pct} %</p></div>; })}
        </div>
      </div>
      <div className="mt-3 rounded-[22px] p-3.5" style={cardStyle}>
        <div className="flex items-baseline"><span className="flex-1 text-[14.5px] font-extrabold">Par chambre</span><span className="text-[11px] font-bold" style={{ color: H.muted }}>séjours · heures · recette</span></div>
        {perRoom.length === 0 ? <p className="mt-2 text-[12.5px]" style={{ color: H.muted }}>Aucune chambre.</p> : (allRooms ? perRoom : perRoom.slice(0, 8)).map((x) => { const T = roomTypeOf(x.room.type); return (
          <div key={x.room.id} className="mt-2.5 flex items-center gap-2.5">
            <span className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center text-[13px] font-extrabold shrink-0" style={{ background: T.tint, color: T.ink }}>{x.room.num}</span>
            <span className="flex-1 min-w-0"><span className="flex text-[12px] font-extrabold"><span className="flex-1">{x.stays} séjour{x.stays > 1 ? "s" : ""} · {Math.round(x.ms / 3600000)} h</span><span>{fmt(x.amount)}</span></span><span className="block mt-1 h-[7px] rounded-full overflow-hidden" style={{ background: "#EEF0F5" }}><span className="block h-[7px] rounded-full" style={{ width: `${(x.amount / maxAmt) * 100}%`, background: T.ink }} /></span></span>
          </div>
        ); })}
        {perRoom.length > 8 && <button type="button" onClick={() => setAllRooms((v) => !v)} className="gb-focus mt-2.5 w-full text-center text-[12px] font-extrabold" style={{ color: H.goldDark }}>{allRooms ? "Réduire" : `Voir les ${perRoom.length} chambres ›`}</button>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[22px] p-3.5" style={cardStyle}>
          <p className="text-[13.5px] font-extrabold">Réservations</p>
          <div className="mt-1.5 text-[12px] font-bold leading-[1.9]">{resStats.map(([l, n, c]) => <div key={l} className="flex"><span className="flex-1" style={{ color: c }}>● {l}</span><b>{n}</b></div>)}</div>
        </div>
        <div className="rounded-[22px] p-3.5" style={cardStyle}>
          <p className="text-[13.5px] font-extrabold">Par réceptionniste</p>
          <div className="mt-1.5 text-[12px] font-bold leading-[1.9]">{users.length === 0 ? <span style={{ color: H.muted }}>—</span> : users.slice(0, 5).map(([u, a]) => <div key={u} className="flex gap-1"><span className="flex-1 truncate">{u}</span><b className="whitespace-nowrap">{fmtK(a)}</b></div>)}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Bénéfices ----------
const MODES = [["month", "Mensuel"], ["quarter", "Trimestriel"], ["semester", "Semestriel"], ["year", "Annuel"], ["custom", "Plage"]];
const CAT_COLORS = ["#6366F1", "#F59E0B", "#14B8A6", "#EC4899", "#0EA5E9", "#84CC16", "#F97316", "#94A3B8"];
export function ProfitScreen({ ctx, onBack }) {
  const { stays, reservations, expenses, now, fmt, shop } = ctx;
  const [mode, setMode] = useState("month");
  const [off, setOff] = useState(0);
  const rg = useRange(now, "custom");
  const fin = (from, to) => hotelFinance({ stays, reservations, expenses, from, to });
  let sel, series;
  if (mode === "custom") {
    sel = { from: rg.from, to: rg.to, label: `Du ${dFr(rg.from)} au ${dFr(rg.to - 1)}` };
    series = [];
    const a = new Date(rg.from);
    for (let i = 0; i < 12; i++) { const s = new Date(a.getFullYear(), a.getMonth() + i, 1).getTime(); if (s >= rg.to) break; const p = periodBounds("month", s, 0); series.push({ ...p, from: Math.max(p.from, rg.from), to: Math.min(p.to, rg.to) }); }
  } else {
    sel = periodBounds(mode, now, off);
    const n = mode === "month" ? 6 : mode === "year" ? 3 : 4;
    series = Array.from({ length: n }, (_, i) => periodBounds(mode, now, off - (n - 1 - i)));
  }
  const cur = fin(sel.from, sel.to);
  const prev = mode === "custom" ? null : (() => { const p = periodBounds(mode, now, off - 1); return fin(p.from, p.to); })();
  const trend = prev && prev.net ? Math.round(((cur.net - prev.net) / Math.abs(prev.net)) * 100) : null;
  const rows = series.map((p) => ({ ...p, f: fin(p.from, p.to) }));
  const max = Math.max(1, ...rows.map((x) => Math.max(x.f.income, x.f.expensesTotal)));
  const marge = cur.income > 0 ? Math.round((cur.net / cur.income) * 100) : 0;
  const cats = Object.entries(cur.expByCat).sort((a, b) => b[1] - a[1]);
  const inProgress = sel.to > now && sel.from <= now;
  const exportPdf = () => exportReportPdf(`Benefices-${String(sel.label).replace(/[^\wÀ-ÿ]+/g, "-")}.pdf`, {
    title: "Bénéfices", subtitle: `${sel.label.charAt(0).toUpperCase()}${sel.label.slice(1)}${inProgress ? " (en cours)" : ""}`,
    kpis: [{ label: "Recettes", value: fmt(cur.income), color: "#15803D" }, { label: "Dépenses", value: fmt(cur.expensesTotal), color: "#B91C1C" }, { label: "Bénéfice net", value: fmt(cur.net), color: cur.net < 0 ? "#B91C1C" : "#0E7490" }, { label: "Marge", value: `${marge} %`, color: "#1B3361" }],
    sections: [
      { title: "Par période", head: ["Période", "Recettes", "Dépenses", "Bénéfice"], widths: [1.6, 1, 1, 1],
        rows: rows.slice().reverse().map((x) => [x.label.charAt(0).toUpperCase() + x.label.slice(1), { t: fmt(x.f.income), color: "#15803D" }, { t: fmt(x.f.expensesTotal), color: "#B91C1C" }, { t: fmt(x.f.net), bold: true, color: x.f.net < 0 ? "#B91C1C" : "#0F172A" }]) },
      { title: "Dépenses par catégorie", head: ["Catégorie", "Part", "Montant"], widths: [2, 0.8, 1.2],
        rows: cats.map(([c, v]) => [c, `${Math.round((v / (cur.expensesTotal || 1)) * 100)} %`, fmt(v)]), total: cats.length ? ["Total", "100 %", fmt(cur.expensesTotal)] : null },
    ],
  }, receiptInfo(shop, ctx.settings));
  return (
    <div>
      <TopBar title="Bénéfices" sub="Recettes − dépenses enregistrées" onBack={onBack} right={<PdfBtn onClick={exportPdf} pushToast={ctx.pushToast} />} />
      <div className="mt-3 p-1 rounded-[16px] grid gap-[2px]" style={{ background: "#fff", boxShadow: H.shadow, gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,0.9fr) minmax(0,0.8fr)" }}>
        {MODES.map(([id, l]) => <button key={id} type="button" onClick={() => { setMode(id); setOff(0); }} aria-pressed={mode === id} className="gb-focus min-h-[38px] rounded-[12px] text-[11px] font-extrabold whitespace-nowrap overflow-hidden" style={{ background: mode === id ? "linear-gradient(135deg,#E9B84E,#D3962A)" : "transparent", color: mode === id ? H.navy : H.ink2 }}>{l}</button>)}
      </div>
      {mode === "custom" ? <RangePickerCustomOnly rg={rg} /> : (
        <div className="mt-2 h-11 rounded-[14px] flex items-center px-1.5" style={{ background: "#fff" }}>
          <button type="button" aria-label="Période précédente" onClick={() => setOff((o) => o - 1)} className="gb-focus w-[34px] h-[34px] rounded-[10px] flex items-center justify-center" style={{ background: "#F1F3F8" }}><Icon name="back" size={16} stroke={2.6} /></button>
          <span className="flex-1 text-center text-[13.5px] font-extrabold first-letter:uppercase">{sel.label}</span>
          <button type="button" aria-label="Période suivante" disabled={off >= 0} onClick={() => setOff((o) => Math.min(0, o + 1))} className="gb-focus w-[34px] h-[34px] rounded-[10px] flex items-center justify-center disabled:opacity-30" style={{ background: "#F1F3F8" }}><Icon name="chev" size={16} stroke={2.6} /></button>
        </div>
      )}
      <div className="mt-3 rounded-[26px] p-4 text-white relative overflow-hidden" style={{ background: navyGrad, boxShadow: "0 14px 30px -12px rgba(14,28,51,0.6)" }}>
        <div className="absolute rounded-full" style={{ right: -40, top: -50, width: 170, height: 170, background: "radial-gradient(circle, rgba(34,211,238,0.4) 0%, rgba(34,211,238,0) 70%)" }} />
        <div className="relative flex items-center justify-between"><span className="text-[11.5px] font-extrabold tracking-[0.08em] uppercase" style={{ color: "#E9C77F" }}>Bénéfice net{inProgress ? " · en cours" : ""}</span><OwnerBadge /></div>
        <div className="relative flex items-baseline gap-2 flex-wrap"><span className="text-[30px] font-extrabold tracking-tight" style={{ color: cur.net < 0 ? "#FDA4AF" : "#fff" }}>{fmt(cur.net)}</span>{trend != null && <span className="h-[22px] px-2 rounded-[7px] text-[11px] font-extrabold flex items-center" style={{ background: trend >= 0 ? "rgba(52,211,153,0.18)" : "rgba(244,63,94,0.2)", color: trend >= 0 ? "#6EE7B7" : "#FDA4AF" }}>{trend >= 0 ? "+" : ""}{trend} % vs période préc.</span>}</div>
        <div className="relative mt-3 grid grid-cols-3 gap-2">
          {[["Recettes", `${fmtK(cur.income)} F`, "#6EE7B7"], ["Dépenses", `${fmtK(cur.expensesTotal)} F`, "#FDA4AF"], ["Marge", `${marge} %`, "#67E8F9"]].map(([l, v, c]) => <span key={l} className="rounded-[13px] p-2" style={{ background: "rgba(255,255,255,0.08)" }}><span className="block text-[10px] font-bold" style={{ color: "#AEBBD2" }}>{l}</span><span className="block text-[14px] font-extrabold whitespace-nowrap" style={{ color: c }}>{v}</span></span>)}
        </div>
      </div>
      <div className="mt-3 rounded-[22px] p-3.5" style={cardStyle}>
        <div className="flex items-center gap-2.5"><span className="flex-1 text-[14.5px] font-extrabold">{mode === "custom" ? "Mois de la plage" : "Comparaison"}</span>
          <span className="flex items-center gap-1 text-[10.5px] font-bold" style={{ color: "#475569" }}><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: "#10B981" }} />Recettes</span>
          <span className="flex items-center gap-1 text-[10.5px] font-bold" style={{ color: "#475569" }}><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: "#FB7185" }} />Dépenses</span></div>
        <div className="mt-3 flex items-end gap-2" style={{ height: 150, borderBottom: `1px solid ${H.line}` }}>
          {rows.map((x) => (
            <span key={x.from} className="flex-1 h-full flex items-end justify-center gap-[2px]" title={`${x.label} : ${fmt(x.f.income)} / ${fmt(x.f.expensesTotal)}`}>
              <span style={{ width: "42%", height: `${Math.max(2, (x.f.income / max) * 146)}px`, borderRadius: "4px 4px 1px 1px", background: "linear-gradient(180deg,#34D399,#059669)", outline: x.from === sel.from ? "2px solid #22D3EE" : "none", outlineOffset: 1 }} />
              <span style={{ width: "42%", height: `${Math.max(2, (x.f.expensesTotal / max) * 146)}px`, borderRadius: "4px 4px 1px 1px", background: "linear-gradient(180deg,#FDA4AF,#E11D48)" }} />
            </span>
          ))}
        </div>
        <div className="mt-1 flex gap-2 text-[9.5px] font-bold" style={{ color: "#94A3B8" }}>{rows.map((x) => <span key={x.from} className="flex-1 text-center whitespace-nowrap overflow-hidden" style={{ color: x.from === sel.from ? H.goldDark : undefined }}>{x.short}</span>)}</div>
      </div>
      <div className="mt-3 rounded-[22px] px-3.5 py-1.5" style={cardStyle}>
        <div className="grid gap-1 py-2 text-[10px] font-extrabold" style={{ gridTemplateColumns: "minmax(0,1fr) 70px 66px 78px", color: H.muted, borderBottom: `1px solid ${H.line2}` }}><span>PÉRIODE</span><span className="text-right">RECETTES</span><span className="text-right">DÉPENSES</span><span className="text-right">BÉNÉFICE</span></div>
        {rows.slice().reverse().map((x) => (
          <div key={x.from} className="grid gap-1 py-2.5 text-[12px] font-bold items-center" style={{ gridTemplateColumns: "minmax(0,1fr) 70px 66px 78px", borderBottom: `1px solid #F3F4F7`, background: x.from === sel.from ? "#F0FBFE" : "transparent" }}>
            <span className="font-extrabold truncate first-letter:uppercase">{x.label}</span><span className="text-right" style={{ color: H.green }}>{fmtK(x.f.income)}</span><span className="text-right" style={{ color: "#BE123C" }}>{fmtK(x.f.expensesTotal)}</span><span className="text-right font-extrabold" style={{ color: x.f.net < 0 ? "#BE123C" : H.ink }}>{fmtK(x.f.net)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-[22px] p-3.5" style={cardStyle}>
        <div className="flex items-baseline"><span className="flex-1 text-[14.5px] font-extrabold">Où partent les dépenses</span><span className="text-[11px] font-bold" style={{ color: H.muted }}>{fmt(cur.expensesTotal)}</span></div>
        {cats.length === 0 ? <p className="mt-2 text-[12.5px]" style={{ color: H.muted }}>Aucune dépense sur cette période.</p> : (
          <>
            <div className="mt-2.5 h-3.5 rounded-full overflow-hidden flex">{cats.map(([c, v], i) => <span key={c} style={{ width: `${(v / cur.expensesTotal) * 100}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />)}</div>
            {cats.map(([c, v], i) => <div key={c} className="mt-2 flex items-center gap-2 text-[12.5px] font-bold"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} /><span className="flex-1 truncate">{c}</span><span style={{ color: H.muted }}>{Math.round((v / cur.expensesTotal) * 100)} %</span><b className="w-[88px] text-right">{fmt(v)}</b></div>)}
          </>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-snug px-1" style={{ color: H.muted }}>Recettes = séjours, prolongations, consommations et acomptes encaissés, moins les remboursements. Dépenses = toutes les dépenses saisies dans Réglages › Dépenses.</p>
    </div>
  );
}

function RangePickerCustomOnly({ rg }) {
  return (
    <div className="mt-2 rounded-[16px] p-2 flex items-center gap-1.5" style={{ background: "#fff", border: `1.5px solid ${H.gold}` }}>
      <Icon name="cal" size={16} color={H.goldDark} style={{ marginLeft: 4, flexShrink: 0 }} />
      <input type="date" aria-label="Du" value={rg.cFrom} onChange={(e) => rg.setCFrom(e.target.value)} style={dateInput} />
      <span className="font-extrabold" style={{ color: "#94A3B8" }}>→</span>
      <input type="date" aria-label="Au" value={rg.cTo} onChange={(e) => rg.setCTo(e.target.value)} style={dateInput} />
    </div>
  );
}
