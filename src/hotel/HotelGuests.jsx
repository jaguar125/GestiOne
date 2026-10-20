// src/hotel/HotelGuests.jsx
//
// Fichier des clients de l'hôtel : liste de toutes les fiches enregistrées
// (nom, contact), recherche rapide, plage de dates, et sur chaque fiche le
// détail des passages : nuitées, passages, réservations, montants.

import { useMemo, useState } from "react";
import { H, Icon, Chip, TopBar, Empty } from "./HotelUI.jsx";
import { isNight, toMs, stayPaid, stayTotal, hmOf, dayBounds, localDayKey, dayKeyToMs, DAY } from "./hotelLogic.js";
import { guestFullName, normPhone } from "./hotelPhotos.js";

const dFr = (ms) => (Number.isFinite(ms) ? new Date(ms).toLocaleDateString("fr-FR") : "—");
const cardStyle = { background: "#fff", boxShadow: "0 4px 14px -8px rgba(10,23,48,0.25)" };

// Séjours et réservations d'un client (par sa fiche, ou par son téléphone pour
// les anciens séjours enregistrés avant la fiche).
export function guestActivity(guest, stays = [], reservations = []) {
  const ph = normPhone(guest.phone);
  const mine = (x) => x && (x.guestId === guest.id || (!x.guestId && ph && normPhone(x.phone) === ph));
  const st = stays.filter(mine).sort((a, b) => toMs(b.start) - toMs(a.start));
  const rs = reservations.filter(mine).sort((a, b) => toMs(b.start) - toMs(a.start));
  const live = st.filter((s) => s.status !== "cancelled");
  const nights = live.filter((s) => isNight(s)).length;
  const passes = live.length - nights;
  const spent = live.reduce((t, s) => t + stayPaid(s), 0);
  const due = live.reduce((t, s) => t + Math.max(0, stayTotal(s) - stayPaid(s)), 0);
  const times = [...st.map((s) => toMs(s.start)), ...rs.map((r) => toMs(r.createdAt || r.start))].filter(Number.isFinite);
  const first = times.length ? Math.min(...times) : toMs(guest.createdAt);
  const last = times.length ? Math.max(...times) : toMs(guest.updatedAt || guest.createdAt);
  return { stays: st, resas: rs, nights, passes, resaCount: rs.length, cancelled: st.length - live.length, spent, due, first, last };
}

// ---------- Liste des clients ----------
export function GuestsScreen({ ctx, onBack, onOpen }) {
  const { guests = [], stays = [], reservations = [], now, fmt } = ctx;
  const [q, setQ] = useState("");
  const [r, setR] = useState("all");
  const [d0] = dayBounds(now);
  const firstOfMonth = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const [cFrom, setCFrom] = useState(localDayKey(firstOfMonth));
  const [cTo, setCTo] = useState(localDayKey(now));
  let from = -Infinity, to = Infinity;
  if (r === "today") { from = d0; to = d0 + DAY; }
  else if (r === "d7") { from = d0 - 6 * DAY; to = d0 + DAY; }
  else if (r === "month") { from = firstOfMonth; to = d0 + DAY; }
  else if (r === "custom") { const a = dayKeyToMs(cFrom), b = dayKeyToMs(cTo); if (Number.isFinite(a) && Number.isFinite(b)) { from = Math.min(a, b); to = Math.max(a, b) + DAY; } }
  const rows = useMemo(() => guests.map((g) => ({ g, a: guestActivity(g, stays, reservations) })), [guests, stays, reservations]);
  const qn = q.trim().toLowerCase(); const qd = q.replace(/\D/g, "");
  const list = rows.filter(({ g, a }) => {
    if (r !== "all") {
      const inRange = [...a.stays.map((s) => toMs(s.start)), ...a.resas.map((x) => toMs(x.start)), toMs(g.createdAt)].some((t) => Number.isFinite(t) && t >= from && t < to);
      if (!inRange) return false;
    }
    if (!qn) return true;
    const hay = `${guestFullName(g)} ${g.firstName || ""} ${g.docNumber || ""} ${g.city || ""} ${g.district || ""}`.toLowerCase();
    return hay.includes(qn) || (qd.length >= 3 && normPhone(g.phone).includes(qd));
  }).sort((x, y) => (y.a.last || 0) - (x.a.last || 0));
  const tot = list.reduce((t, x) => ({ n: t.n + x.a.nights, p: t.p + x.a.passes }), { n: 0, p: 0 });
  const dateInput = { flex: 1, minWidth: 0, height: 42, borderRadius: 11, border: "none", background: "#F7F8FB", padding: "0 10px", fontSize: 13.5, fontWeight: 800, color: H.ink, fontFamily: "inherit" };
  return (
    <div style={{ paddingBottom: 24 }}>
      <TopBar title="Clients" sub={`${guests.length} fiche${guests.length > 1 ? "s" : ""} enregistrée${guests.length > 1 ? "s" : ""}`} onBack={onBack} />
      <label className="mt-3 h-[48px] rounded-[16px] flex items-center gap-2 px-3.5" style={{ background: "#fff", border: `1.5px solid ${H.line}` }}>
        <Icon name="search" size={17} color="#94A3B8" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone ou n° de pièce" aria-label="Rechercher un client" className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px]" />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="gb-focus w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: H.ground }}><Icon name="x" size={14} /></button>}
      </label>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {[["all", "Tous"], ["today", "Aujourd'hui"], ["d7", "7 jours"], ["month", "Ce mois"], ["custom", "Plage…"]].map(([id, l]) => <Chip key={id} on={r === id} onClick={() => setR(id)} className="!min-h-[36px] !px-3 !text-[12px]">{l}</Chip>)}
      </div>
      {r === "custom" && (
        <div className="mt-2 rounded-[16px] p-2 flex items-center gap-1.5" style={{ background: "#fff", border: `1.5px solid ${H.gold}` }}>
          <Icon name="cal" size={16} color={H.goldDark} style={{ marginLeft: 4, flexShrink: 0 }} />
          <input type="date" aria-label="Du" value={cFrom} onChange={(e) => setCFrom(e.target.value)} style={dateInput} />
          <span className="font-extrabold" style={{ color: "#94A3B8" }}>→</span>
          <input type="date" aria-label="Au" value={cTo} onChange={(e) => setCTo(e.target.value)} style={dateInput} />
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["Clients", list.length, H.navy], ["Nuitées", tot.n, "#4F46E5"], ["Passages", tot.p, "#E11D48"]].map(([l, v, c]) => (
          <div key={l} className="rounded-[16px] px-3 py-2.5" style={cardStyle}><span className="block text-[11px] font-bold" style={{ color: H.muted }}>{l}</span><span className="block text-[19px] font-extrabold" style={{ color: c }}>{v}</span></div>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="mt-3"><Empty icon="users" title={guests.length ? "Aucun client trouvé" : "Aucune fiche client"} text={guests.length ? "Essayez un autre nom, numéro ou période." : "Les fiches sont créées à l'arrivée des clients en nuitée (identité et photo de la pièce)."} /></div>
      ) : (
        <div className="mt-3 rounded-[20px] px-3" style={cardStyle}>
          {list.map(({ g, a }, i) => {
            const tel = normPhone(g.phone);
            return (
              <div key={g.id} className="flex items-center gap-2.5 py-2.5" style={{ borderTop: i ? `1px solid ${H.line2}` : "none" }}>
                <button type="button" onClick={() => onOpen(g.id)} className="gb-focus flex-1 min-w-0 flex items-center gap-2.5 text-left">
                  <span className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-[15px] font-extrabold" style={{ background: H.goldSoft, color: H.goldDark }}>{(g.lastName || "?").charAt(0)}{(g.firstName || "").charAt(0)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-extrabold leading-snug">{guestFullName(g) || "Client"}{g.photosPending ? <span className="ml-1.5 text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-[6px]" style={{ background: H.orangeSoft, color: H.orange }}>pièce à photographier</span> : null}</span>
                    <span className="block text-[12px]" style={{ color: H.ink2 }}>{tel ? `+225 ${g.phone}` : "Sans téléphone"}</span>
                    <span className="block text-[11.5px]" style={{ color: H.muted }}>{a.nights} nuitée{a.nights > 1 ? "s" : ""} · {a.passes} passage{a.passes > 1 ? "s" : ""}{a.resaCount ? ` · ${a.resaCount} réservation${a.resaCount > 1 ? "s" : ""}` : ""} · dernière visite {dFr(a.last)}</span>
                  </span>
                </button>
                {tel && <a href={`tel:${tel}`} aria-label={`Appeler ${guestFullName(g)}`} className="gb-focus w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: H.greenSoft, color: H.green }}><Icon name="phone" size={17} /></a>}
              </div>
            );
          })}
        </div>
      )}
      {list.length > 0 && <p className="mt-2 px-1 text-[11.5px]" style={{ color: H.muted }}>Total payé par ces clients : {fmt(list.reduce((t, x) => t + x.a.spent, 0))}</p>}
    </div>
  );
}

// ---------- Passages du client (affiché dans sa fiche) ----------
export function GuestHistory({ ctx, guest, onOpenReceipt }) {
  const { stays = [], reservations = [], fmt } = ctx;
  const a = guestActivity(guest, stays, reservations);
  const tel = normPhone(guest.phone);
  const wa = tel ? (tel.length <= 10 ? `225${tel}` : tel) : "";
  const items = [
    ...a.stays.map((s) => ({ id: s.id, at: toMs(s.start), kind: isNight(s) ? "night" : "pass", s })),
    ...a.resas.map((x) => ({ id: x.id, at: toMs(x.start), kind: "resa", r: x })),
  ].sort((x, y) => y.at - x.at);
  const K = { night: ["moon", "#EEF0FF", "#4F46E5"], pass: ["clock", "#FFF1F3", "#E11D48"], resa: ["cal", "#F5F3FF", "#7C3AED"] };
  return (
    <>
      {tel && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={`tel:${tel}`} className="gb-focus min-h-[46px] rounded-[14px] flex items-center justify-center gap-2 text-[13.5px] font-extrabold" style={{ background: H.greenSoft, color: H.green }}><Icon name="phone" size={17} />Appeler</a>
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="gb-focus min-h-[46px] rounded-[14px] flex items-center justify-center gap-2 text-[13.5px] font-extrabold" style={{ background: "#25D366", color: "#052E16" }}><Icon name="chat" size={17} />WhatsApp</a>
        </div>
      )}
      <div className="mt-4 mb-2 flex items-center justify-between"><span className="text-[14px] font-extrabold">Passages à l'hôtel</span><span className="text-[11.5px]" style={{ color: H.muted }}>depuis le {dFr(a.first)}</span></div>
      <div className="grid grid-cols-2 gap-2">
        {[["Nuitées", a.nights, "#4F46E5"], ["Passages", a.passes, "#E11D48"], ["Réservations", a.resaCount, "#7C3AED"], ["Total payé", fmt(a.spent), H.green]].map(([l, v, c]) => (
          <div key={l} className="rounded-[16px] px-3 py-2.5" style={cardStyle}><span className="block text-[11px] font-bold" style={{ color: H.muted }}>{l}</span><span className="block text-[18px] font-extrabold" style={{ color: c }}>{v}</span></div>
        ))}
      </div>
      {a.due > 0 && <p className="mt-2 rounded-[12px] px-3 py-2 text-[12.5px] font-bold" style={{ background: H.orangeSoft, color: H.orange }}>Reste à payer : {fmt(a.due)}</p>}
      {items.length > 0 && (
        <div className="mt-2.5 rounded-[20px] px-3" style={cardStyle}>
          {items.map((it, i) => {
            const [ic, bg, fg] = K[it.kind];
            const s = it.s; const x = it.r;
            const rc = (s || x)?.receipts?.[0];
            const title = s ? `${isNight(s) ? "Nuitée" : s.tariffName || "Passage"} · Ch. ${s.roomNum} (${s.type === "clim" ? "clim" : "vent"})` : `Réservation · Ch. ${x.roomNum}`;
            const status = s ? (s.status === "cancelled" ? "annulé" : s.status === "active" ? "en cours" : `libérée ${s.releasedAt ? `le ${dFr(toMs(s.releasedAt))} à ${hmOf(toMs(s.releasedAt))}` : ""}`) : (x.status === "arrived" ? "client arrivé" : x.status === "cancelled" || x.status === "deleted" ? "annulée" : "à venir");
            const amount = s ? stayTotal(s) : Number(x.price) || 0;
            const Tag = rc && onOpenReceipt ? "button" : "div";
            return (
              <Tag key={it.id} type={Tag === "button" ? "button" : undefined} onClick={Tag === "button" ? () => onOpenReceipt(rc) : undefined} className={`${Tag === "button" ? "gb-focus " : ""}w-full text-left flex items-start gap-2.5 py-2.5`} style={{ borderTop: i ? `1px solid ${H.line2}` : "none" }}>
                <span className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}><Icon name={ic} size={16} stroke={2.3} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-extrabold leading-snug">{title}</span>
                  <span className="block text-[11.5px]" style={{ color: H.muted }}>{dFr(it.at)} à {hmOf(it.at)} · {status}</span>
                </span>
                <span className="text-[13px] font-extrabold whitespace-nowrap" style={{ color: (s && s.status === "cancelled") || (x && (x.status === "cancelled" || x.status === "deleted")) ? "#94A3B8" : H.ink }}>{fmt(amount)}</span>
              </Tag>
            );
          })}
        </div>
      )}
    </>
  );
}
