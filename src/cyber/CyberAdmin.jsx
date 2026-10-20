// src/cyber/CyberAdmin.jsx
//
// Gestion du cyber café : dépenses, clôture de caisse, rapports,
// prestations et tarifs dégressifs, personnel et rôles, annonces vocales,
// synchronisation, reçus, sauvegarde et restauration.

import { useRef, useState } from "react";
import { C, FONT_D, Icon, Btn, Card, Label, TopBar, Seg, Chip, Toggle, Field, inputStyle, Sheet, Empty, Avatar, Tag, Hero, BackBtn, BottomBar, Waves } from "./CyberUI.jsx";
import { CATS, DAY, EVENT_TYPES, ROLE_INDEX, ROLES, announceLevel, cashExpected, dayBounds, dayLabel, hmOf, localDayKey, periodFigures, rid, tierRows, saleDue, dmy } from "./cyberLogic.js";
import { RangeChips, useRange } from "./CyberBook.jsx";
import { exportBinaryFile } from "../nativeExport.js";

const num = (v) => Number(String(v).replace(",", ".").replace(/[^\d.]/g, "")) || 0;
const sp = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ---------- Dépenses ----------
const EXP_CATS = [["elec", "Électricité"], ["net", "Internet"], ["loyer", "Loyer"], ["salaire", "Salaires"], ["maint", "Maintenance"], ["transport", "Transport"], ["autre", "Autre"]];
export function ExpensesScreen({ ctx, onBack }) {
  const { expenses, fmt, actions, now } = ctx;
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("autre");
  const [src, setSrc] = useState("cash");
  const [label, setLabel] = useState("");
  const [d0] = dayBounds(now); const m0 = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const at = (e) => e.at || new Date(`${e.date}T12:00:00`).getTime();
  const today = expenses.filter((e) => at(e) >= d0).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const month = expenses.filter((e) => at(e) >= m0).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const list = expenses.slice().sort((a, b) => at(b) - at(a)).slice(0, 40);
  const n = num(amount);
  const save = () => { actions.addExpense({ amount: n, category: cat, label: label.trim() || EXP_CATS.find((c) => c[0] === cat)[1], source: src }); setAmount(""); setLabel(""); };
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Dépenses" sub={`Aujourd'hui −${fmt(today)} · ce mois −${fmt(month)}`} onBack={onBack} />
      <Card className="cy-a cy-d1 mt-3 p-3.5">
        <p className="text-[11px] font-extrabold" style={{ color: C.muted }}>NOUVELLE DÉPENSE</p>
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="0" aria-label="Montant" className="mt-1 w-full bg-transparent outline-none" style={{ fontFamily: FONT_D, fontSize: 30, fontWeight: 800, borderBottom: "2px solid #EF4444", paddingBottom: 4 }} />
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">{[[500, "+500"], [1000, "+1 000"], [5000, "+5 000"], [0, "Effacer"]].map(([v, l]) => <Btn key={l} kind="soft" onClick={() => setAmount(v ? String(n + v) : "")} style={{ minHeight: 38, fontSize: 12 }}>{l}</Btn>)}</div>
        <p className="mt-3 text-[11px] font-extrabold" style={{ color: C.muted }}>CATÉGORIE</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{EXP_CATS.map(([id, l]) => <Chip key={id} on={cat === id} onClick={() => setCat(id)}>{l}</Chip>)}</div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Détail (facultatif)" aria-label="Détail" className="mt-2.5" style={inputStyle} />
        <div className="mt-2.5"><Seg small options={[["cash", "Payé depuis la caisse"], ["momo", "Mobile Money"]]} value={src} onChange={setSrc} /></div>
        <Btn kind="red" full className="mt-3" disabled={!(n > 0)} onClick={save}>Enregistrer la dépense</Btn>
      </Card>
      <Label>DERNIÈRES DÉPENSES</Label>
      <Card className="px-3">
        {list.map((e, i) => (
          <div key={e.id} className="flex items-center gap-2.5 min-h-[56px]" style={{ borderTop: i ? `1px solid ${C.line2}` : "none" }}>
            <span className="w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: C.redSoft, color: C.red }}><Icon name="money" size={16} /></span>
            <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{e.label}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>{dayLabel(at(e))} {hmOf(at(e))} · {e.by || "—"} · {e.source === "momo" ? "Mobile Money" : "caisse"}</span></span>
            <span className="text-[14px] font-extrabold" style={{ color: C.red }}>−{fmt(e.amount)}</span>
          </div>
        ))}
        {!list.length && <p className="py-4 text-center text-[12.5px]" style={{ color: C.muted }}>Aucune dépense.</p>}
      </Card>
    </div>
  );
}

// ---------- Clôture de caisse ----------
const COINS = [10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25];
export function CloseScreen({ ctx, onBack, openReport }) {
  const { sales, expenses, stock, moves, settings, fmt, actions, now, closes } = ctx;
  const [d0] = dayBounds(now);
  const f = periodFigures({ sales, expenses, stock, moves, from: d0, to: d0 + DAY });
  const [float, setFloat] = useState(String(settings.float || 0));
  const expected = cashExpected(f, num(float));
  const [n, setN] = useState({});
  const [comment, setComment] = useState("");
  const [momoOk, setMomoOk] = useState(false);
  const counted = COINS.reduce((t, c) => t + c * (n[c] || 0), 0);
  const gap = counted - expected;
  const done = closes.find((c) => c.day === localDayKey(now));
  const calc = [["Fond de caisse", `${sp(num(float))} F`, "#fff"], ["Encaissé en espèces (ventes et crédits)", `+ ${fmt(f.cash)}`, "#6EE7B7"], ["Dépenses payées en caisse", `− ${fmt(f.expCash)}`, "#FCA5A5"], ["Achats payés en caisse", `− ${fmt(f.purchasesCash)}`, "#FCA5A5"], ["Remboursements", `− ${fmt(f.refundsCash)}`, "#FCA5A5"]];
  return (
    <div style={{ paddingBottom: 150 }}>
      <Hero>
        <div className="cy-a flex items-center gap-2.5"><BackBtn onBack={onBack} dark /><span><span className="block text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#67E8F9" }}>{new Date(now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</span><span className="block text-[21px] font-extrabold" style={{ fontFamily: FONT_D }}>Clôture de caisse</span></span></div>
        <div className="cy-a cy-d1 mt-3.5 rounded-[18px] px-3 py-2.5 text-[12.5px]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}>
          {calc.map(([l, v, c]) => <div key={l} className="flex justify-between py-[3px]" style={{ color: "#C7D2E5" }}><span>{l}</span><b style={{ color: c }}>{v}</b></div>)}
          <div className="flex justify-between mt-1.5 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.18)", fontSize: 15 }}><b>Espèces attendues</b><b style={{ fontFamily: FONT_D, color: "#67E8F9" }}>{fmt(expected)}</b></div>
        </div>
      </Hero>
      {done && <p className="cy-a mt-3 rounded-[14px] px-3 py-2.5 text-[12.5px] font-bold" style={{ background: C.greenSoft, color: "#166534" }}>Journée déjà clôturée à {hmOf(done.at)} par {done.by} (écart {done.gap >= 0 ? "+" : "−"}{fmt(Math.abs(done.gap))}). Vous pouvez refaire un comptage.{openReport && <button type="button" onClick={() => openReport(done.id, false)} className="gb-focus cy-tap mt-2 w-full h-[42px] rounded-[12px] flex items-center justify-center gap-2 text-[13px] font-extrabold text-white" style={{ background: C.navy }}><Icon name="printer" size={16} />Voir et imprimer le rapport</button>}</p>}
      <div className="mt-3"><Field label="FOND DE CAISSE À L'OUVERTURE"><input value={float} onChange={(e) => setFloat(e.target.value.replace(/\D/g, ""))} onBlur={() => actions.setSettings({ float: num(float) })} inputMode="numeric" style={inputStyle} /></Field></div>
      <Label>COMPTAGE DES ESPÈCES</Label>
      <div className="grid grid-cols-2 gap-1.5">
        {COINS.map((c) => (
          <div key={c} className="rounded-[15px] p-1.5 flex items-center gap-1.5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
            <span className="min-w-[54px] h-[30px] rounded-[9px] text-[11px] font-extrabold flex items-center justify-center" style={{ background: c >= 1000 ? C.indigoSoft : "#F1F5F9", color: c >= 1000 ? C.indigo : C.ink2 }}>{sp(c)}</span>
            <button type="button" onClick={() => setN({ ...n, [c]: Math.max(0, (n[c] || 0) - 1) })} aria-label={`Moins de ${c}`} className="gb-focus cy-tap w-[30px] h-[30px] rounded-[9px] font-extrabold" style={{ background: C.ground }}>−</button>
            <input value={n[c] || ""} onChange={(e) => setN({ ...n, [c]: Number(e.target.value.replace(/\D/g, "")) || 0 })} inputMode="numeric" placeholder="0" aria-label={`Nombre de ${c}`} className="flex-1 min-w-0 text-center bg-transparent outline-none font-extrabold" style={{ fontFamily: FONT_D, fontSize: 16 }} />
            <button type="button" onClick={() => setN({ ...n, [c]: (n[c] || 0) + 1 })} aria-label={`Plus de ${c}`} className="gb-focus cy-tap w-[30px] h-[30px] rounded-[9px] font-extrabold text-white" style={{ background: C.navy }}>+</button>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-[18px] px-3.5 py-3" style={{ background: gap === 0 ? C.greenSoft : gap < 0 ? "#FEF2F2" : "#FFFBEB", border: `1.5px solid ${gap === 0 ? "#86EFAC" : gap < 0 ? "#FECACA" : "#FDE68A"}`, transition: "background .25s" }}>
        <div className="flex justify-between text-[13px] font-extrabold"><span>Compté</span><span style={{ fontFamily: FONT_D, fontSize: 17 }}>{fmt(counted)}</span></div>
        <div className="flex justify-between text-[13px] font-extrabold mt-1" style={{ color: gap === 0 ? C.green : gap < 0 ? C.red : C.amber }}><span>{gap === 0 ? "Caisse juste" : gap < 0 ? "Manquant" : "Excédent"}</span><span style={{ fontFamily: FONT_D, fontSize: 17 }}>{gap === 0 ? fmt(0) : `${gap < 0 ? "−" : "+"} ${fmt(Math.abs(gap))}`}</span></div>
      </div>
      <button type="button" onClick={() => setMomoOk(!momoOk)} aria-pressed={momoOk} className="gb-focus mt-2 w-full flex items-center gap-2.5 rounded-[15px] px-3 py-2.5 text-left" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
        <span className="w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: C.indigoSoft, color: C.indigo }}><Icon name="phone" size={17} /></span>
        <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Mobile Money : {fmt(f.momo)}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>À rapprocher avec le solde du téléphone</span></span>
        <span className="w-6 h-6 rounded-[7px] flex items-center justify-center" style={{ background: momoOk ? C.indigo : "#fff", border: `2px solid ${momoOk ? C.indigo : "#C7D2E5"}` }}>{momoOk && <Icon name="check" size={13} color="#fff" stroke={3.4} />}</span>
      </button>
      {gap !== 0 && <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire sur l'écart (obligatoire)" aria-label="Commentaire sur l'écart" className="mt-2" style={inputStyle} />}
      <BottomBar>
        <p className="text-[11.5px] mb-2.5" style={{ color: C.muted }}>La clôture est datée, signée et annoncée au propriétaire.</p>
        <Btn kind="navy" full big icon="lock" disabled={!counted || (gap !== 0 && comment.trim().length < 3)} onClick={() => { const id = actions.closeDay({ expected, counted, gap, momo: f.momo, momoChecked: momoOk, comment: comment.trim(), float: num(float), ca: f.ca, encaisse: f.encaisse, cash: f.cash, expCash: f.expCash, purchasesCash: f.purchasesCash, refundsCash: f.refundsCash, tickets: f.tickets }); if (id && openReport) openReport(id, true); else onBack(); }}>Clôturer la journée</Btn>
      </BottomBar>
    </div>
  );
}

// ---------- Rapports ----------
export function ReportsScreen({ ctx, onBack }) {
  const { sales, expenses, stock, moves, fmt } = ctx;
  const r = useRange("week");
  const [a, b] = r.range;
  const f = periodFigures({ sales, expenses, stock, moves, from: a, to: b });
  const days = Math.max(1, Math.round((b - a) / DAY));
  const step = days <= 7 ? DAY : days <= 31 ? 7 * DAY : 30 * DAY;
  const buckets = [];
  for (let t = a; t < b && buckets.length < 12; t += step) {
    const g = periodFigures({ sales, from: t, to: Math.min(b, t + step) });
    buckets.push({ l: step === DAY ? new Date(t).toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3) : new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), ca: g.ca, enc: g.encaisse });
  }
  const max = Math.max(1, ...buckets.map((x) => Math.max(x.ca, x.enc)));
  const maxSvc = Math.max(1, ...f.perSvc.map((x) => x.amount));
  const maxP = Math.max(1, ...f.perPerson.map((x) => x.amount));
  const kpis = [["Chiffre d'affaires", f.ca, "Toutes les ventes, crédits compris", C.navy, C.navy], ["Encaissements", f.encaisse, "Espèces et Mobile Money reçus", "#06B6D4", C.cyanInk], ["Créances", f.debts, "Reste dû par les clients (total)", "#F59E0B", C.amber], ["Bénéfice estimé", f.profit, "CA − consommables − dépenses", "#8B5CF6", C.violet]];
  return (
    <div style={{ paddingBottom: 40 }}>
      <Hero glow="rgba(139,92,246,0.3)">
        <div className="cy-a flex items-center gap-2.5"><BackBtn onBack={onBack} dark /><span><span className="block text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#C4B5FD" }}>GÉRANTE ET PROPRIÉTAIRE</span><span className="block text-[21px] font-extrabold" style={{ fontFamily: FONT_D }}>Rapports</span></span></div>
      </Hero>
      <div className="cy-a cy-d1 mt-3"><RangeChips r={r} /></div>
      <div className="cy-a cy-d2 mt-3 grid grid-cols-2 gap-2">
        {kpis.map(([l, v, s, bar, ink]) => (
          <Card key={l} className="relative overflow-hidden p-3"><span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: bar }} /><p className="text-[11px] font-extrabold" style={{ color: C.muted }}>{l}</p><p className="text-[18px] font-extrabold whitespace-nowrap" style={{ fontFamily: FONT_D, color: ink }}>{fmt(v)}</p><p className="text-[10.5px] leading-snug" style={{ color: C.muted }}>{s}</p></Card>
        ))}
      </div>
      {f.official > 0 && <p className="mt-2 text-[11.5px] px-1" style={{ color: C.muted }}>Frais officiels encaissés et reversés (hors chiffre d'affaires) : {fmt(f.official)}</p>}
      <Card className="cy-a cy-d3 mt-3 p-3.5">
        <p className="text-[14.5px] font-extrabold" style={{ fontFamily: FONT_D }}>Chiffre d'affaires et encaissé</p>
        <div className="flex gap-3.5 mt-1.5 text-[11px] font-bold" style={{ color: C.ink2 }}><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: C.navy }} />Chiffre d'affaires</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: C.cyan }} />Encaissé</span></div>
        <div className="mt-3 h-[140px] grid items-end gap-2" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0,1fr))`, borderBottom: `1px solid ${C.line}` }}>
          {buckets.map((x, i) => <div key={i} className="h-full flex items-end justify-center gap-[3px]" title={`${x.l} · ${fmt(x.ca)} / ${fmt(x.enc)}`}><span className="cy-col rounded-t-[4px]" style={{ width: 10, height: `${(x.ca / max) * 100}%`, background: C.navy }} /><span className="cy-col rounded-t-[4px]" style={{ width: 10, height: `${(Math.max(0, x.enc) / max) * 100}%`, background: C.cyan }} /></div>)}
        </div>
        <div className="mt-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0,1fr))` }}>{buckets.map((x, i) => <span key={i} className="text-center text-[10px] font-bold" style={{ color: C.muted }}>{x.l}</span>)}</div>
      </Card>
      <Label>PAR PRESTATION</Label>
      <Card className="px-3.5 py-2">
        {f.perSvc.map((x) => { const K = CATS[x.cat] || CATS.bureau; return (
          <div key={x.label} className="py-2"><div className="flex items-baseline gap-2"><span className="flex-1 text-[13px] font-extrabold">{x.label}</span><span className="text-[11px]" style={{ color: C.muted }}>{Math.round(x.qty)}</span><span className="text-[13px] font-extrabold min-w-[84px] text-right">{fmt(x.amount)}</span></div><div className="h-[7px] rounded-full mt-1.5 overflow-hidden" style={{ background: C.ground }}><div className="cy-bar h-[7px] rounded-full" style={{ width: `${Math.round((x.amount / maxSvc) * 100)}%`, background: K.grad }} /></div></div>
        ); })}
        {!f.perSvc.length && <p className="py-3 text-center text-[12.5px]" style={{ color: C.muted }}>Aucune vente sur la période.</p>}
      </Card>
      <Label>PAR PERSONNE</Label>
      <Card className="px-3.5 py-2">
        {f.perPerson.map((x) => <div key={x.name} className="py-2"><div className="flex items-baseline gap-2"><span className="flex-1 text-[13px] font-extrabold">{x.name}</span><span className="text-[11px]" style={{ color: C.muted }}>{x.tickets} tickets</span><span className="text-[13px] font-extrabold min-w-[84px] text-right">{fmt(x.amount)}</span></div><div className="h-[7px] rounded-full mt-1.5 overflow-hidden" style={{ background: C.ground }}><div className="cy-bar h-[7px] rounded-full" style={{ width: `${Math.round((x.amount / maxP) * 100)}%`, background: "linear-gradient(90deg,#A78BFA,#6D28D9)" }} /></div></div>)}
        {!f.perPerson.length && <p className="py-3 text-center text-[12.5px]" style={{ color: C.muted }}>—</p>}
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["Tickets", String(f.tickets)], ["Consommables", fmt(f.consumption)], ["Dépenses", fmt(f.expenses)]].map(([l, v]) => <Card key={l} className="px-2.5 py-2"><p className="text-[10.5px] font-bold" style={{ color: C.muted }}>{l}</p><p className="text-[14px] font-extrabold whitespace-nowrap">{v}</p></Card>)}
      </div>
    </div>
  );
}

// ---------- Prestations et tarifs ----------
export function ServicesScreen({ ctx, onBack }) {
  const { services, fmt, can } = ctx;
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const list = services.slice().sort((a, b) => (a.order || 99) - (b.order || 99));
  const iconBtn = (label, icon, ink, bg, border, onClick) => (
    <button type="button" aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); onClick(); }} className="gb-focus cy-tap w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: bg, color: ink, border }}><Icon name={icon} size={17} /></button>
  );
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Prestations et tarifs" sub={`${services.filter((s) => s.active !== false).length} prestation${services.filter((s) => s.active !== false).length > 1 ? "s" : ""} active${services.filter((s) => s.active !== false).length > 1 ? "s" : ""}`} onBack={onBack} right={<Btn kind="navy" icon="plus" onClick={() => setEdit({})} style={{ minHeight: 40, fontSize: 12.5 }}>Nouvelle</Btn>} />
      <div className="mt-3 flex flex-col gap-2">
        {list.map((s) => { const K = CATS[s.cat] || CATS.bureau; return (
          <Card key={s.id} className="cy-a px-3 py-2.5" style={{ opacity: s.active === false ? 0.6 : 1 }}>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEdit(s)} className="gb-focus flex-1 min-w-0 flex items-center gap-2.5 text-left">
              <span className="w-10 h-10 rounded-[13px] flex items-center justify-center text-white shrink-0" style={{ background: K.grad }}><Icon name={K.icon} size={18} /></span>
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold truncate">{s.name}</span><span className="block text-[11.5px] truncate" style={{ color: C.muted }}>{s.active === false ? "Masquée · " : ""}{s.tiers?.length ? `Dégressif : ${tierRows(s).map((t) => `${t.from}+ ${sp(t.price)}`).join(" · ")}` : `${fmt(s.price)} / ${s.unit}`}</span></span>
              </button>
              {can.price && iconBtn(`Modifier ${s.name}`, "edit", C.navy, "#F7F9FC", `1.5px solid ${C.line}`, () => setEdit(s))}
              {can.price && iconBtn(`Supprimer ${s.name}`, "trash", C.red, "#FEF2F2", "1.5px solid #FECACA", () => setDel(s))}
            </div>
          </Card>
        ); })}
        {!list.length && <Empty icon="tag" title="Aucune prestation" text="Ajoutez votre première prestation avec le bouton Nouvelle." />}
      </div>
      <p className="mt-3 rounded-[14px] px-3 py-2.5 text-[12px] flex gap-2" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}><Icon name="clock" size={16} />Les nouveaux prix s'appliquent aux ventes à venir. Les tickets déjà enregistrés gardent leur prix d'origine.</p>
      {edit && <ServiceSheet ctx={ctx} svc={edit} onClose={() => setEdit(null)} onDelete={(x) => { setEdit(null); setDel(x); }} />}
      {del && <DeleteServiceSheet ctx={ctx} svc={del} onClose={() => setDel(null)} />}
    </div>
  );
}
function DeleteServiceSheet({ ctx, svc, onClose }) {
  return (
    <Sheet title="Supprimer la prestation" onClose={onClose}>
      <div className="rounded-[16px] px-3 py-3 flex items-center gap-2.5" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}>
        <span className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "#fff", color: C.red }}><Icon name="trash" size={18} /></span>
        <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold truncate">{svc.name}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>Elle ne sera plus proposée à la vente, sur tous les téléphones.</span></span>
      </div>
      <p className="mt-3 text-[12.5px]" style={{ color: C.ink2 }}>Les tickets déjà enregistrés avec cette prestation restent intacts dans l'historique et les rapports.</p>
      <p className="mt-1.5 text-[12px]" style={{ color: C.muted }}>Pour la retirer seulement pour un temps, modifiez-la et désactivez « Proposée à la vente ».</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn kind="ghost" onClick={onClose} style={{ minHeight: 48 }}>Garder</Btn>
        <Btn kind="red" icon="trash" onClick={() => { ctx.actions.deleteService(svc); onClose(); }} style={{ minHeight: 48 }}>Supprimer</Btn>
      </div>
    </Sheet>
  );
}
function ServiceSheet({ ctx, svc, onClose, onDelete }) {
  const { actions, fmt } = ctx;
  const isNew = !svc.id;
  const [name, setName] = useState(svc.name || "");
  const [cat, setCat] = useState(svc.cat || "bureau");
  const [form, setForm] = useState(svc.form || "qty");
  const [unit, setUnit] = useState(svc.unit || "page");
  const [price, setPrice] = useState(String(svc.price || ""));
  const [colorPrice, setColorPrice] = useState(String(svc.colorPrice || ""));
  const [tiers, setTiers] = useState((svc.tiers || []).map((t) => ({ from: String(t.from), price: String(t.price) })));
  const [active, setActive] = useState(svc.active !== false);
  const sim = (q) => { let p = num(price); tiers.filter((t) => num(t.from) > 1).sort((a, b) => num(a.from) - num(b.from)).forEach((t) => { if (q >= num(t.from)) p = num(t.price); }); return p * q; };
  const save = () => {
    actions.saveService({ ...svc, id: svc.id || rid(), name: name.trim(), cat, form, unit: unit.trim() || "unité", price: num(price), colorPrice: form === "print" ? num(colorPrice) : svc.colorPrice, tiers: tiers.filter((t) => num(t.from) > 1 && num(t.price) > 0).map((t) => ({ from: Math.round(num(t.from)), price: num(t.price) })).sort((a, b) => a.from - b.from), active, order: svc.order || 50 });
    onClose();
  };
  return (
    <Sheet title={isNew ? "Nouvelle prestation" : svc.name} onClose={onClose}>
      <Field label="NOM"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Reliure spirale" style={inputStyle} /></Field>
      <p className="mt-3 text-[11px] font-extrabold" style={{ color: C.muted }}>CATÉGORIE</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{Object.entries(CATS).filter(([id]) => id !== "article").map(([id, K]) => <Chip key={id} on={cat === id} ink={K.ink} onClick={() => setCat(id)}>{K.label}</Chip>)}</div>
      <p className="mt-3 text-[11px] font-extrabold" style={{ color: C.muted }}>ÉCRAN DE SAISIE</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">{[["qty", "Quantité simple"], ["copy", "Photocopie (format, faces)"], ["print", "Impression (pages, couleur)"], ["photo", "Photos d'identité"], ["web", "Inscription en ligne"]].map(([id, l]) => <Chip key={id} on={form === id} onClick={() => setForm(id)} className="!whitespace-normal !min-h-[40px]">{l}</Chip>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label={form === "print" ? "PRIX PAGE N&B" : "PRIX"}><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" style={{ ...inputStyle, fontWeight: 800 }} /></Field>
        {form === "print" ? <Field label="PRIX PAGE COULEUR"><input value={colorPrice} onChange={(e) => setColorPrice(e.target.value)} inputMode="numeric" style={{ ...inputStyle, fontWeight: 800 }} /></Field> : <Field label="UNITÉ"><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="page" style={inputStyle} /></Field>}
      </div>
      {(form === "copy" || form === "print" || form === "qty") && (
        <div className="mt-3 rounded-[18px] p-3" style={{ background: "#F7F9FC", border: `1px solid ${C.line2}` }}>
          <p className="text-[12.5px] font-extrabold">Tarif dégressif (facultatif)</p>
          <p className="text-[11px]" style={{ color: C.muted }}>À partir d'une quantité, le prix unitaire baisse.</p>
          {tiers.map((t, i) => (
            <div key={i} className="mt-2 flex items-center gap-1.5">
              <span className="text-[12px] font-bold whitespace-nowrap">À partir de</span>
              <input value={t.from} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} inputMode="numeric" aria-label="À partir de" style={{ ...inputStyle, minHeight: 40, width: 70, textAlign: "center" }} />
              <span className="text-[12px] font-bold">:</span>
              <input value={t.price} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} inputMode="numeric" aria-label="Prix" style={{ ...inputStyle, minHeight: 40, flex: 1, textAlign: "center", fontWeight: 800 }} />
              <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} aria-label="Retirer la tranche" className="gb-focus w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "#fff", border: `1px solid ${C.line}` }}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <Btn kind="dashed" full icon="plus" className="mt-2" onClick={() => setTiers([...tiers, { from: "", price: "" }])} style={{ minHeight: 40, fontSize: 12.5 }}>Ajouter une tranche</Btn>
          {num(price) > 0 && <div className="mt-2.5 rounded-[13px] px-3 py-2 text-white text-[12.5px]" style={{ background: C.navy }}><p className="text-[10.5px] font-extrabold" style={{ color: "#67E8F9" }}>SIMULATION</p>{[5, 24, 120].map((q) => <div key={q} className="flex justify-between"><span style={{ color: "#C7D2E5" }}>{q} {unit || "unités"}</span><b>{fmt(sim(q))}</b></div>)}</div>}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2.5"><Toggle on={active} onChange={setActive} label="Prestation proposée à la vente" /><span className="text-[13.5px] font-bold">Proposée à la vente</span></div>
      <Btn kind="cyan" full big className="mt-4" disabled={!name.trim() || !(num(price) > 0)} onClick={save}>{isNew ? "Créer la prestation" : "Enregistrer les modifications"}</Btn>
      {!isNew && ctx.can.price && <Btn kind="danger" full icon="trash" className="mt-2" onClick={() => onDelete(svc)} style={{ minHeight: 46 }}>Supprimer cette prestation</Btn>}
    </Sheet>
  );
}

// ---------- Personnel et rôles ----------
const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));
export function StaffScreen({ ctx, onBack, staffApi, renderInvites }) {
  const { pushToast } = ctx;
  const { vendors = [], saveVendors, buildVendor, isPinTaken } = staffApi || {};
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("employe");
  const freshPin = () => { for (let i = 0; i < 40; i += 1) { const p = randomPin(); if (!isPinTaken?.(p)) return p; } return randomPin(); };
  const [pin, setPin] = useState(freshPin);
  const [pinFor, setPinFor] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [shownPin, setShownPin] = useState(null);
  const [invites, setInvites] = useState(false);
  if (invites && renderInvites) return <div><TopBar title="Invitations et téléphones" sub="Connecter un employé sur son téléphone" onBack={() => setInvites(false)} /><div className="mt-3">{renderInvites()}</div></div>;
  const roleOfV = (v) => (v.cyberRole === "gerante" ? "gerante" : "employe");
  const create = () => {
    const n = name.trim();
    if (!n) { pushToast("Indiquez le nom", "error"); return; }
    if (vendors.some((v) => String(v.name).trim().toLowerCase() === n.toLowerCase())) { pushToast("Ce nom existe déjà", "error"); return; }
    if (isPinTaken?.(pin)) { pushToast("Ce code est déjà utilisé", "error"); return; }
    saveVendors([...vendors, buildVendor({ name: n, pin, phone: phone.trim(), cyberRole: role })]);
    setShownPin({ name: n, pin }); setName(""); setPhone(""); setPin(freshPin());
    pushToast(`${n} ajouté(e)`, "ok");
  };
  const changePin = () => {
    if (!/^\d{4}$/.test(newPin)) { pushToast("Code à 4 chiffres", "error"); return; }
    if (isPinTaken?.(newPin, pinFor.id)) { pushToast("Ce code est déjà utilisé", "error"); return; }
    saveVendors(vendors.map((x) => (x.id === pinFor.id ? buildVendor({ name: x.name, pin: newPin, phone: x.phone || "", cyberRole: roleOfV(x), initial: x }) : x)));
    setShownPin({ name: pinFor.name, pin: newPin }); setPinFor(null);
  };
  const PERMS = [["Vendre et encaisser", 1, 1, 1], ["Voir ses propres ventes", 1, 1, 1], ["Voir les ventes de toute l'équipe", 0, 1, 1], ["Voir l'argent disponible en caisse", 0, 1, 1], ["Clôture, dépenses, stock, annulations", 0, 1, 1], ["Rapports et bénéfices", 0, 1, 1], ["Tarifs, personnel, licence", 0, 0, 1], ["Écrire à l'assistance GestiOne", 0, 0, 1]];
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Personnel et rôles" sub="Accès par nom et code PIN, comme dans GestiOne" onBack={onBack} />
      {renderInvites && <Card onClick={() => setInvites(true)} className="mt-3 px-3.5 py-3" style={{ background: C.navy, border: "none" }}><div className="flex items-center gap-3 text-white"><span className="w-10 h-10 rounded-[13px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}><Icon name="phone" size={18} color="#22D3EE" /></span><span className="flex-1"><span className="block text-[14px] font-extrabold">Invitations et téléphones</span><span className="block text-[11.5px]" style={{ color: "#B6C4DC" }}>Connecter un employé sur son propre téléphone</span></span><Icon name="chev" size={16} color="#B6C4DC" /></div></Card>}
      <Label>ÉQUIPE</Label>
      <Card className="px-3">
        {vendors.map((v, i) => { const R = ROLES[roleOfV(v)]; return (
          <div key={v.id} className="flex items-center gap-2.5 min-h-[64px]" style={{ borderTop: i ? `1px solid ${C.line2}` : "none", opacity: v.blocked ? 0.6 : 1 }}>
            <Avatar name={v.name} tint={R.tint} ink={R.ink} />
            <span className="flex-1 min-w-0"><span className="flex items-center gap-1.5"><span className="text-[14px] font-extrabold truncate">{v.name}</span>{v.blocked ? <Tag tint={C.redSoft} ink={C.red}>Bloqué</Tag> : <Tag tint={R.tint} ink={R.ink}>{R.label}</Tag>}</span><span className="block text-[11.5px] truncate" style={{ color: C.muted }}>{R.sub}</span></span>
            <button type="button" onClick={() => { setPinFor(v); setNewPin(freshPin()); }} aria-label={`Options de ${v.name}`} className="gb-focus w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ border: `1.5px solid ${C.line}` }}><Icon name="key" size={16} /></button>
            <button type="button" onClick={() => saveVendors(vendors.map((x) => (x.id === v.id ? { ...x, blocked: !x.blocked } : x)))} className="gb-focus h-9 px-2.5 rounded-[11px] text-[12px] font-extrabold" style={v.blocked ? { background: C.green, color: "#fff" } : { border: "1.5px solid #FECACA", color: C.red }}>{v.blocked ? "Débloquer" : "Bloquer"}</button>
          </div>
        ); })}
        {!vendors.length && <p className="py-4 text-center text-[12.5px]" style={{ color: C.muted }}>Aucun membre pour l'instant.</p>}
      </Card>
      <Card className="mt-3 p-3.5">
        <p className="text-[14px] font-extrabold">Créer un accès</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex : Awa)" aria-label="Nom" style={inputStyle} /><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Téléphone" aria-label="Téléphone" style={inputStyle} /></div>
        <div className="mt-2 grid grid-cols-2 gap-2">{["employe", "gerante"].map((id) => { const R = ROLES[id]; const on = role === id; return <button key={id} type="button" onClick={() => setRole(id)} aria-pressed={on} className="gb-focus cy-tap rounded-[13px] px-2.5 py-2 text-left min-h-[54px]" style={{ border: `1.5px solid ${on ? R.ink : C.line}`, background: on ? R.tint : "#fff" }}><span className="block text-[13px] font-extrabold" style={{ color: R.ink }}>{R.label}</span><span className="block text-[10.5px]" style={{ color: C.muted }}>{R.sub}</span></button>; })}</div>
        <div className="mt-2 flex items-center gap-2.5 rounded-[14px] pl-3 pr-2 py-2" style={{ background: "#F7F9FC" }}><span className="flex-1"><span className="block text-[11.5px] font-bold" style={{ color: C.muted }}>Code PIN généré</span><span className="block font-mono text-[21px] font-bold tracking-[6px]">{pin}</span></span><Btn kind="ghost" onClick={() => setPin(freshPin())} style={{ minHeight: 40, fontSize: 12.5 }}>Autre code</Btn></div>
        <Btn kind="cyan" full className="mt-2.5" onClick={create}>Créer l'accès</Btn>
      </Card>
      <Label>DROITS PAR RÔLE</Label>
      <Card className="px-3 py-1.5">
        <div className="grid items-center gap-1 py-1.5 text-[10.5px] font-extrabold text-center" style={{ gridTemplateColumns: "minmax(0,1fr) 54px 54px 62px", color: C.muted }}><span className="text-left">Droit</span><span>Employé</span><span>Gérante</span><span>Propriétaire</span></div>
        {PERMS.map(([l, ...v]) => <div key={l} className="grid items-center gap-1 min-h-[40px] text-center" style={{ gridTemplateColumns: "minmax(0,1fr) 54px 54px 62px", borderTop: `1px solid ${C.line2}` }}><span className="text-left text-[12.5px] font-bold">{l}</span>{v.map((x, i) => <span key={i} className="flex justify-center">{x ? <Icon name="check" size={17} color={C.green} stroke={3} /> : <Icon name="minus" size={15} color="#CBD5E1" stroke={3} />}</span>)}</div>)}
      </Card>
      {shownPin && <Sheet title="Code à remettre" onClose={() => setShownPin(null)}><p className="text-[13.5px]">Code PIN de <b>{shownPin.name}</b> :</p><p className="my-3 text-center font-mono text-[38px] font-bold tracking-[12px]" style={{ color: C.navy }}>{shownPin.pin}</p><p className="text-[12px]" style={{ color: C.muted }}>Donnez-le en personne. Il ne sera plus affiché ensuite.</p><Btn kind="navy" full className="mt-3" onClick={() => setShownPin(null)}>C'est noté</Btn></Sheet>}
      {pinFor && (
        <Sheet title={pinFor.name} onClose={() => setPinFor(null)}>
          <p className="text-[11px] font-extrabold mb-1.5" style={{ color: C.muted }}>RÔLE</p>
          <div className="grid grid-cols-2 gap-1.5">{["employe", "gerante"].map((id) => <Chip key={id} on={roleOfV(pinFor) === id} ink={ROLES[id].ink} onClick={() => { saveVendors(vendors.map((x) => (x.id === pinFor.id ? { ...x, cyberRole: id } : x))); setPinFor({ ...pinFor, cyberRole: id }); }}>{ROLES[id].label}</Chip>)}</div>
          <div className="mt-3"><Field label="NOUVEAU CODE PIN (4 CHIFFRES)"><input inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 22, letterSpacing: 8, textAlign: "center" }} /></Field></div>
          <div className="mt-3 flex gap-2"><Btn kind="danger" onClick={() => { if (window.confirm(`Supprimer l'accès de ${pinFor.name} ?`)) { saveVendors(vendors.filter((x) => x.id !== pinFor.id)); setPinFor(null); } }}>Supprimer</Btn><Btn kind="navy" full className="flex-1" onClick={changePin}>Changer le code</Btn></div>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Annonces vocales et écrites ----------
export function AnnounceScreen({ ctx, onBack }) {
  const { settings, actions, shop } = ctx;
  const [playing, setPlaying] = useState(false);
  const icon = (v) => (v === 2 ? ["speaker", C.navy, "#22D3EE", C.navy, "voix et message"] : v === 1 ? ["chat", C.cyanSoft, C.cyanInk, "#A5E9F5", "message seul"] : ["x", "#F7F9FC", "#94A3B8", "#E2E8F0", "rien"]);
  const set = (type, role, v) => actions.setSettings({ announce: { ...settings.announce, [`${type}:${ROLE_INDEX[role]}`]: v } });
  const test = () => { setPlaying(true); actions.announceTest(); setTimeout(() => setPlaying(false), 4500); };
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Annonces vocales et écrites" sub="Réglages de l'entreprise · propriétaire" onBack={onBack} />
      <div className="cy-a cy-d1 mt-3 -mx-1 rounded-[22px] p-4 text-white relative overflow-hidden" style={{ background: C.navy }}>
        <span className="absolute rounded-full" style={{ right: -40, top: -50, width: 170, height: 170, background: "radial-gradient(circle, rgba(34,211,238,0.32) 0%, rgba(0,0,0,0) 70%)" }} />
        <p className="relative text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#67E8F9" }}>VOIX DE L'APPLICATION</p>
        <p className="relative mt-1.5 text-[13px] leading-relaxed italic" style={{ color: "#E2E8F0" }}>« Awa vient de faire une prestation de 3500 francs CFA. »</p>
        <p className="relative mt-1 text-[13px] leading-relaxed italic" style={{ color: "#E2E8F0" }}>« César vient de faire une vente de 300 francs CFA. »</p>
        <div className="relative mt-3 flex items-center gap-3"><Btn kind="cyan" icon="play" onClick={test} style={{ minHeight: 42, fontSize: 13 }}>Écouter un exemple</Btn>{playing && <Waves color="#67E8F9" h={24} />}</div>
        <div className="relative mt-3"><Seg dark small options={[["0.85", "Lente"], ["1", "Normale"], ["1.15", "Rapide"]]} value={String(settings.voiceRate || 1)} onChange={(v) => actions.setSettings({ voiceRate: Number(v) })} /></div>
      </div>
      <Label>QUI EST AVERTI · TOUCHEZ POUR CHANGER</Label>
      <Card className="px-2.5 py-1">
        <div className="grid items-center gap-1 py-2 text-[10.5px] font-extrabold text-center" style={{ gridTemplateColumns: "minmax(0,1fr) 52px 52px 52px", color: C.muted }}><span className="text-left">Activité</span><span>Proprio</span><span>Gérante</span><span>Employé</span></div>
        {Object.entries(EVENT_TYPES).map(([type, T]) => (
          <div key={type} className="grid items-center gap-1 min-h-[48px]" style={{ gridTemplateColumns: "minmax(0,1fr) 52px 52px 52px", borderTop: `1px solid ${C.line2}` }}>
            <span className="text-[12.5px] font-extrabold leading-tight">{T.label}{T.always && <span className="block text-[10.5px] font-bold" style={{ color: C.green }}>Toujours actif</span>}</span>
            {["owner", "gerante", "employe"].map((r) => { const v = announceLevel(settings, type, r); const [ic, bg, ink, line, nm] = icon(v); return (
              <span key={r} className="flex justify-center"><button type="button" disabled={T.always} onClick={() => set(type, r, (v + 2) % 3)} aria-label={`${T.label} · ${ROLES[r].label} : ${nm}`} className="gb-focus cy-tap w-[34px] h-[34px] rounded-[11px] flex items-center justify-center" style={{ background: bg, color: ink, border: `1.5px solid ${line}` }}><Icon name={ic} size={15} stroke={2.4} /></button></span>
            ); })}
          </div>
        ))}
      </Card>
      <p className="mt-2 text-[11.5px] leading-relaxed px-1" style={{ color: C.muted }}>Chaque annonce commence par le nom de l'entreprise, puis le prénom de la personne (sans son rôle) et le montant. Le stock bas et les réapprovisionnements sont toujours annoncés sur tous les téléphones. Sur le téléphone d'un employé, la voix n'annonce jamais l'argent en caisse.</p>
      <Card className="mt-3 px-3">
        <div className="flex items-center gap-3 min-h-[60px]"><span className="flex-1"><span className="block text-[13.5px] font-extrabold">Petit signal sonore avant la voix</span><span className="block text-[11.5px]" style={{ color: C.muted }}>Pour ne pas surprendre les clients</span></span><Toggle on={settings.chime !== false} onChange={(v) => actions.setSettings({ chime: v })} label="Signal sonore" /></div>
        <div className="flex items-center gap-3 min-h-[60px]" style={{ borderTop: `1px solid ${C.line2}` }}><span className="flex-1"><span className="block text-[13.5px] font-extrabold">Son de sélection</span><span className="block text-[11.5px]" style={{ color: C.muted }}>Un petit son quand on choisit une prestation ou un article</span></span><Toggle on={settings.tapSound !== false} onChange={(v) => actions.setSettings({ tapSound: v })} label="Son de sélection" /></div>
        <div className="flex items-center gap-3 min-h-[60px]" style={{ borderTop: `1px solid ${C.line2}` }}><span className="flex-1"><span className="block text-[13.5px] font-extrabold">Heures calmes</span><span className="block text-[11.5px]" style={{ color: C.muted }}>De 22:00 à 07:00 : message écrit seulement</span></span><Toggle on={settings.quiet !== false} onChange={(v) => actions.setSettings({ quiet: v })} label="Heures calmes" /></div>
      </Card>
    </div>
  );
}

// ---------- Synchronisation ----------
export function SyncScreen({ ctx, onBack }) {
  const { sync, shop } = ctx;
  const online = sync?.online !== false;
  const pending = sync?.pending || 0;
  const busy = !!sync?.busy;
  const linked = !!shop?.backendLinked;
  return (
    <div style={{ paddingBottom: 130 }}>
      <Hero glow="rgba(52,211,153,0.3)">
        <div className="cy-a flex items-center gap-2.5"><BackBtn onBack={onBack} dark /><span><span className="block text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#6EE7B7" }}>BASE DE DONNÉES</span><span className="block text-[21px] font-extrabold" style={{ fontFamily: FONT_D }}>Synchronisation</span></span></div>
        <div className="cy-a cy-d1 mt-4 flex items-center gap-4">
          <span className="relative w-[78px] h-[78px] flex items-center justify-center shrink-0"><span className="w-[62px] h-[62px] rounded-full flex items-center justify-center" style={{ background: online && linked ? "linear-gradient(135deg,#34D399,#059669)" : "linear-gradient(135deg,#FBBF24,#D97706)", boxShadow: "0 10px 26px -8px rgba(16,185,129,0.8)" }}><Icon name="sync" size={28} color="#fff" stroke={2.4} style={{ animation: `cySpin ${busy ? 1 : 6}s linear infinite` }} /></span></span>
          <span><span className="inline-flex h-6 px-2.5 rounded-full items-center text-[11px] font-extrabold mb-1" style={{ background: "rgba(52,211,153,0.16)", color: "#A7F3D0" }}>Automatique · toujours active</span><span className="block text-[17px] font-extrabold">{!linked ? "Entreprise non reliée au serveur" : !online ? "Hors connexion" : busy ? "Synchronisation en cours…" : pending ? `${pending} envoi${pending > 1 ? "s" : ""} en attente` : "Tout est à jour"}</span><span className="block text-[12px] leading-snug" style={{ color: "#B6C4DC" }}>Chaque vente part tout de suite au serveur et arrive sur les autres téléphones en quelques secondes.</span></span>
        </div>
      </Hero>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["Dernière relecture", sync?.lastAt ? hmOf(sync.lastAt) : "—"], ["En attente", String(pending)], ["Vérification", "toutes les 12 s"]].map(([l, v]) => <Card key={l} className="px-2.5 py-2"><p className="text-[10.5px] font-bold" style={{ color: C.muted }}>{l}</p><p className="text-[14px] font-extrabold">{v}</p></Card>)}
      </div>
      <Card className="mt-3 p-3 flex gap-2.5"><span className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: C.navy, color: "#22D3EE" }}><Icon name="lock" size={17} /></span><span className="text-[12px] leading-relaxed" style={{ color: C.ink2 }}><b className="block text-[13px]" style={{ color: C.ink }}>Données propres à {shop?.name || "cette entreprise"}</b>Ventes, clients, stock et personnel appartiennent à cette entreprise seule. Aucune autre entreprise GestiOne ne peut les voir.</span></Card>
      <p className="mt-2.5 text-[11.5px] leading-relaxed px-1" style={{ color: C.muted }}>Sans réseau, l'application continue de marcher : les ventes restent sur le téléphone et partent dès que la connexion revient, sans doublon.</p>
      <BottomBar><Btn kind="navy" full big icon="sync" disabled={busy} onClick={() => sync?.onSyncNow?.()}>{busy ? "Synchronisation…" : "Synchroniser maintenant"}</Btn></BottomBar>
    </div>
  );
}

// ---------- Reçus ----------
export function ReceiptSettingsScreen({ ctx, onBack }) {
  const { settings, actions, shop } = ctx;
  const rc = settings.receipt || {};
  const [f, setF] = useState({ name: rc.name || "", address: rc.address || "", phone: rc.phone || "", message: rc.message || "", paper: rc.paper || "58" });
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="En-tête des reçus" sub="Nom, adresse, téléphone, message" onBack={onBack} />
      <Card className="mt-3 p-3.5 grid gap-2.5">
        <Field label="NOM SUR LE REÇU"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={shop?.name} style={inputStyle} /></Field>
        <Field label="ADRESSE"><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Ex. Av. Chardy, Plateau" style={inputStyle} /></Field>
        <Field label="TÉLÉPHONE"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" style={inputStyle} /></Field>
        <Field label="MESSAGE DE FIN (FACULTATIF)"><input value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Merci de votre visite. À bientôt !" style={inputStyle} /></Field>
        <div><p className="text-[11px] font-extrabold mb-1.5" style={{ color: C.muted }}>PAPIER DE L'IMPRIMANTE</p><Seg small options={[["58", "58 mm"], ["80", "80 mm"]]} value={f.paper} onChange={(v) => setF({ ...f, paper: v })} /></div>
      </Card>
      <Btn kind="cyan" full big className="mt-3" onClick={() => { actions.setSettings({ receipt: { ...rc, ...f } }); ctx.pushToast("En-tête des reçus enregistré", "ok"); onBack(); }}>Enregistrer</Btn>
    </div>
  );
}

// ---------- Sauvegarde et restauration ----------
const BK = [["services", "prestations"], ["sales", "tickets"], ["clients", "clients"], ["stock", "produits"], ["moves", "mouvements"], ["closes", "clôtures"], ["expenses", "dépenses"]];
export function BackupScreen({ ctx, onBack, verifyOwnerPin }) {
  const { shop, settings, actions, now } = ctx;
  const [made, setMade] = useState(null);
  const [picked, setPicked] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);
  const last = (settings.backupLog || []).find((x) => x.kind === "backup");
  const make = async () => {
    const data = {}; BK.forEach(([k]) => { data[k] = ctx[k] || []; });
    const { backupLog, ...cyberSettings } = settings; // eslint-disable-line no-unused-vars
    const json = JSON.stringify({ format: "gestione-cyber-backup", version: 1, createdAt: Date.now(), by: ctx.userName, shopId: shop?.id, name: shop?.name, data, cyberSettings });
    const slug = String(shop?.name || "Cyber").normalize("NFD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const file = `Sauvegarde-${slug}-${localDayKey(Date.now())}.json`;
    const bytes = new TextEncoder().encode(json);
    try { await exportBinaryFile(file, bytes, "application/json"); setMade({ file, size: bytes.length }); actions.setSettings({ backupLog: [{ kind: "backup", at: Date.now(), by: ctx.userName }, ...(settings.backupLog || [])].slice(0, 12) }); } catch (e) { ctx.pushToast(`Sauvegarde impossible : ${e?.message || ""}`, "error"); }
  };
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setErr(""); setDone(null);
    try { const o = JSON.parse(await f.text()); if (o?.format !== "gestione-cyber-backup" || !o.data) throw new Error(); setPicked(o); } catch { setPicked(null); setErr("Ce fichier n'est pas une sauvegarde de cyber café GestiOne."); }
  };
  const restore = () => {
    if (verifyOwnerPin && !verifyOwnerPin(pin)) { setErr("Code propriétaire incorrect"); return; }
    const added = actions.restoreBackup(picked.data);
    setDone(added); setPin(""); setErr("");
  };
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Sauvegarde et restauration" sub="Réglages de l'entreprise · propriétaire" onBack={onBack} />
      <div className="cy-a mt-3 rounded-[22px] p-4 text-white" style={{ background: C.navy }}>
        <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: "linear-gradient(135deg,#34D399,#059669)" }}><Icon name="shieldok" size={22} color="#fff" /></span><span><span className="block text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#6EE7B7" }}>PROTECTION DES DONNÉES</span><span className="block text-[16px] font-extrabold">{last && now - last.at < 7 * DAY ? "Vos données sont protégées" : "Pensez à faire une sauvegarde"}</span></span></div>
        <p className="mt-2 text-[12px]" style={{ color: "#B6C4DC" }}>Copie automatique sur le serveur à chaque synchronisation. Dernier fichier : {last ? `${dmy(last.at)} à ${hmOf(last.at)}` : "aucun"}.</p>
      </div>
      <Label>1 · CRÉER UNE SAUVEGARDE</Label>
      <Card className="p-3.5">
        <div className="grid grid-cols-3 gap-1.5">{BK.slice(0, 6).map(([k, l]) => <div key={k} className="rounded-[13px] py-2 text-center" style={{ background: C.cyanSoft }}><p className="text-[17px] font-extrabold" style={{ color: C.cyanInk }}>{(ctx[k] || []).length}</p><p className="text-[10.5px] font-bold" style={{ color: C.ink2 }}>{l}</p></div>)}</div>
        <Btn kind="navy" full icon="download" className="mt-3" onClick={make}>Télécharger la sauvegarde</Btn>
        {made && <p className="cy-pop mt-2 rounded-[12px] px-3 py-2 text-[12px] font-extrabold break-all" style={{ background: C.greenSoft, color: "#14532D" }}>✓ {made.file} · {Math.max(1, Math.round(made.size / 1024))} Ko · à garder sur Drive, WhatsApp ou e-mail</p>}
      </Card>
      <Label>2 · RESTAURER</Label>
      <Card className="p-3.5">
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} aria-label="Fichier de sauvegarde" />
        <Btn kind="ghost" full icon="upload" onClick={() => fileRef.current?.click()}>Choisir un fichier de sauvegarde</Btn>
        {err && !picked && <p className="mt-2 text-[12.5px] font-bold" style={{ color: C.red }}>{err}</p>}
        {picked && (
          <div className="cy-pop mt-3 rounded-[15px] p-3" style={{ background: "#F5F7FB", border: `1.5px solid ${C.line}` }}>
            <div className="flex justify-between items-center gap-2"><b className="text-[13.5px] truncate">{picked.name} · {dmy(picked.createdAt)} à {hmOf(picked.createdAt)}</b><Tag tint={picked.shopId === shop?.id ? C.greenSoft : C.orangeSoft} ink={picked.shopId === shop?.id ? C.green : C.orange}>{picked.shopId === shop?.id ? "Valide" : "Autre entreprise"}</Tag></div>
            <p className="mt-1 text-[11.5px]" style={{ color: C.muted }}>{BK.map(([k, l]) => `${(picked.data[k] || []).length} ${l}`).join(" · ")}</p>
            <p className="mt-1 text-[11.5px]" style={{ color: C.muted }}>Restauration sans perte : seuls les éléments absents sont remis, rien n'est effacé.</p>
            {!done && verifyOwnerPin && <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} type="password" inputMode="numeric" placeholder="Code propriétaire" aria-label="Code propriétaire" className="mt-2" style={{ ...inputStyle, letterSpacing: 6, fontWeight: 800 }} />}
            {err && <p className="mt-2 text-[12.5px] font-bold" style={{ color: C.red }}>{err}</p>}
            {done != null ? <p className="mt-2 rounded-[12px] px-3 py-2 text-[12.5px] font-extrabold" style={{ background: C.greenSoft, color: "#14532D" }}>✓ Restauré · {done} élément{done > 1 ? "s" : ""} remis en place</p> : <Btn kind="amber" full className="mt-2" disabled={verifyOwnerPin && pin.length < 4} onClick={restore}>Restaurer la sauvegarde</Btn>}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------- Assistance réservée au propriétaire ----------
export function SupportLocked({ onBack, onNotify }) {
  return (
    <div>
      <TopBar title="Assistance GestiOne" onBack={onBack} />
      <div className="cy-a text-center px-6 pt-14">
        <span className="inline-flex w-[74px] h-[74px] rounded-[24px] items-center justify-center" style={{ background: "#fff", border: `1px solid ${C.line}`, color: C.navy, boxShadow: "0 14px 30px -18px rgba(10,23,48,0.5)" }}><Icon name="lock" size={32} stroke={2} /></span>
        <p className="mt-3.5 text-[19px] font-extrabold" style={{ fontFamily: FONT_D }}>Réservé au propriétaire</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: C.muted }}>Seul le propriétaire connecté peut écrire à l'assistance GestiOne. Pour un besoin, prévenez le propriétaire : il recevra votre demande en notification.</p>
        <Btn kind="navy" className="mt-4" icon="bell" onClick={onNotify}>Prévenir le propriétaire</Btn>
      </div>
    </div>
  );
}
export { saleDue, Empty };
