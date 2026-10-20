// src/cyber/CyberBook.jsx
//
// Historique des ventes (chaque employé voit ses ventes ; la gérante et le
// propriétaire voient toute l'équipe), annulation et remboursement, crédits
// clients et paiement d'un crédit.

import { useMemo, useState } from "react";
import { C, FONT_D, Icon, Btn, Card, Label, TopBar, Chip, Field, inputStyle, Sheet, Empty, Avatar, Tag, Hero, BackBtn } from "./CyberUI.jsx";
import { creditGroupKey } from "./cyberReceipt.js";
import { MomoPicker, DEFAULT_MOMO, momoOf, momoLabel } from "../MomoPicker.jsx";
import { DAY, dayBounds, dayLabel, hmOf, localDayKey, saleDue, salePaid, saleToPay, saleSummary, periodFigures, isLive } from "./cyberLogic.js";

export function useRange(initial = "today") {
  const [mode, setMode] = useState(initial);
  const [from, setFrom] = useState(localDayKey(Date.now() - 6 * DAY));
  const [to, setTo] = useState(localDayKey(Date.now()));
  const [d0] = dayBounds(Date.now());
  let range;
  if (mode === "today") range = [d0, d0 + DAY];
  else if (mode === "yest") range = [d0 - DAY, d0];
  else if (mode === "week") range = [d0 - 6 * DAY, d0 + DAY];
  else if (mode === "month") { const d = new Date(); range = [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), d0 + DAY]; }
  else range = [new Date(`${from}T00:00:00`).getTime(), new Date(`${to}T00:00:00`).getTime() + DAY];
  return { mode, setMode, from, setFrom, to, setTo, range };
}
export function RangeChips({ r, extra = [] }) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {[["today", "Aujourd'hui"], ["yest", "Hier"], ["week", "7 jours"], ["month", "Ce mois"], ["range", "Plage…"], ...extra].map(([id, l]) => <Chip key={id} on={r.mode === id} onClick={() => r.setMode(id)}>{l}</Chip>)}
      </div>
      {r.mode === "range" && (
        <div className="cy-a mt-2 grid grid-cols-2 gap-2">
          <Field label="DU"><input type="date" value={r.from} onChange={(e) => r.setFrom(e.target.value)} style={inputStyle} /></Field>
          <Field label="AU"><input type="date" value={r.to} onChange={(e) => r.setTo(e.target.value)} style={inputStyle} /></Field>
        </div>
      )}
    </>
  );
}

const STATUS = (s) => {
  if (s.status === "cancelled") return s.refund ? ["Remboursé", C.redSoft, C.red] : ["Annulé", "#F1F5F9", "#475569"];
  const due = saleDue(s);
  if (due > 0) return [salePaid(s) > 0 ? "Partiel" : "Crédit", C.amberSoft, "#92400E"];
  const mo = (s.payments || []).find((p) => p.mode === "momo");
  if (mo) return [momoOf(mo.op)?.short || "Mobile Money", C.indigoSoft, C.indigo, "momo"];
  return ["Payé", C.greenSoft, C.green];
};

// ---------- Historique ----------
export function HistoryScreen({ ctx, onBack, openReceipt }) {
  const { sales, fmt, can, userName, staffNames } = ctx;
  const r = useRange("today");
  const [who, setWho] = useState("all");
  const [f, setF] = useState("all");
  const [open, setOpen] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const mineOnly = !can.team;
  const people = useMemo(() => [...new Set([...(staffNames || []), ...sales.map((s) => s.by).filter(Boolean)])], [sales, staffNames]);
  const [a, b] = r.range;
  const base = sales.filter((s) => { const t = s.at; return t >= a && t < b && (mineOnly ? s.by === userName : who === "all" || s.by === who); });
  const list = base.filter((s) => f === "all" || (f === "cash" ? STATUS(s)[0] === "Payé" : f === "momo" ? (s.payments || []).some((p) => p.mode === "momo") : f === "credit" ? saleDue(s) > 0 : s.status === "cancelled")).sort((x, y) => y.at - x.at);
  const fig = periodFigures({ sales, from: a, to: b, by: mineOnly ? userName : who === "all" ? null : who });
  const sumOf = (p) => base.filter((s) => isLive(s) && (p === "all" || s.by === p)).reduce((t, s) => t + (Number(s.total) || 0), 0);
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title={mineOnly ? "Mes ventes" : "Historique de l'équipe"} sub={mineOnly ? `${userName} · vos ventes uniquement` : "Toutes les ventes, par employé"} onBack={onBack} />
      <div className="cy-a cy-d1 mt-3"><RangeChips r={r} /></div>
      {!mineOnly && (
        <div className="cy-a cy-d1 mt-2.5 flex flex-wrap gap-1.5">
          {["all", ...people].map((p) => { const on = who === p; return (
            <button key={p} type="button" onClick={() => setWho(p)} aria-pressed={on} className="gb-focus cy-tap rounded-[14px] px-3 py-1.5 text-left" style={{ background: on ? C.navy : "#fff", color: on ? "#fff" : C.ink, border: `1.5px solid ${on ? C.navy : C.line}` }}>
              <span className="block text-[12.5px] font-extrabold">{p === "all" ? "Toute l'équipe" : p}</span><span className="block text-[10.5px] font-bold" style={{ opacity: 0.8 }}>{fmt(sumOf(p))}</span>
            </button>
          ); })}
        </div>
      )}
      {mineOnly && <p className="cy-a mt-2.5 rounded-[14px] px-3 py-2.5 text-[12px] flex gap-2" style={{ background: C.cyanSoft, border: "1px solid #A5E9F5", color: "#155E75" }}><Icon name="lock" size={16} color={C.cyanInk} />Vous voyez seulement vos ventes. La caisse et les ventes des autres ne sont pas visibles.</p>}
      <div className="cy-a cy-d2 mt-3 grid grid-cols-2 gap-2">
        <Card className="px-3 py-2.5"><p className="text-[11px] font-bold" style={{ color: C.muted }}>{mineOnly ? "Mon total" : "Chiffre d'affaires"}</p><p className="text-[18px] font-extrabold" style={{ fontFamily: FONT_D }}>{fmt(fig.ca)}</p></Card>
        <Card className="px-3 py-2.5"><p className="text-[11px] font-bold" style={{ color: C.muted }}>Tickets</p><p className="text-[18px] font-extrabold" style={{ fontFamily: FONT_D, color: C.cyanInk }}>{fig.tickets}</p></Card>
      </div>
      <div className="cy-a cy-d2 mt-2.5 flex flex-wrap gap-1.5">{[["all", "Tous"], ["cash", "Espèces"], ["momo", "Mobile Money"], ["credit", "Crédits"], ["cancel", "Annulés"]].map(([id, l]) => <Chip key={id} on={f === id} onClick={() => setF(id)}>{l}</Chip>)}</div>
      <div className="cy-a cy-d3 mt-3 flex flex-col gap-2">
        {list.map((s) => {
          const [tag, tint, ink] = STATUS(s); const isOpen = open === s.id; const dead = s.status === "cancelled";
          return (
            <div key={s.id} className="rounded-[18px] overflow-hidden" style={{ background: "#fff", border: `1.5px solid ${isOpen ? "#06B6D4" : C.line}`, opacity: dead ? 0.8 : 1 }}>
              <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} className="gb-focus w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                <span className="w-10 h-10 rounded-[13px] flex flex-col items-center justify-center text-[10.5px] font-extrabold leading-tight shrink-0" style={{ background: tint, color: ink }}>{hmOf(s.at)}<span className="text-[9px] font-bold">{dayLabel(s.at) === "Aujourd'hui" ? "" : dayLabel(s.at).slice(0, 5)}</span></span>
                <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate" style={{ textDecoration: dead ? "line-through" : "none" }}>{saleSummary(s)}</span><span className="block text-[11.5px] truncate" style={{ color: C.muted }}>n° {s.no} · {s.by}{s.client?.name ? ` · ${s.client.name}` : ""}</span></span>
                <span className="text-right shrink-0"><span className="block text-[14px] font-extrabold" style={{ textDecoration: dead ? "line-through" : "none" }}>{fmt(saleToPay(s))}</span><Tag tint={tint} ink={ink}>{tag}</Tag></span>
              </button>
              {isOpen && (
                <div className="cy-a px-3 pb-3">
                  <div className="rounded-[12px] px-3 py-2 text-[12px] leading-relaxed" style={{ background: "#F7F9FC", color: C.ink2 }}>
                    {(s.lines || []).map((l) => <div key={l.id} className="flex justify-between gap-2"><span>{l.qty} × {l.label}{l.detail ? ` (${l.detail})` : ""}</span><b>{fmt(l.amount)}</b></div>)}
                    {Number(s.official) > 0 && <div className="flex justify-between"><span>Frais officiels (hors CA)</span><b>{fmt(s.official)}</b></div>}
                    {(s.payments || []).length > 0 && <div className="mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${C.line}` }}>{(s.payments || []).map((p) => <div key={p.id} className="flex justify-between gap-2"><span>{p.kind === "credit" ? `Paiement de crédit (${dayLabel(p.at).toLowerCase()} ${hmOf(p.at)})` : "Payé"} · {p.mode === "momo" ? momoLabel(p.op) : "Espèces"}</span><b className="whitespace-nowrap">{fmt(p.amount)}</b></div>)}</div>}
                    {saleDue(s) > 0 && <div className="flex justify-between" style={{ color: C.amber }}><span>Reste à payer</span><b>{fmt(saleDue(s))}</b></div>}
                    {(s.edits || []).length > 0 && <div className="mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${C.line}`, color: C.indigo }}>{s.edits.slice(-3).map((e, i) => <div key={i}>Modifié par {e.by} · {dayLabel(e.at).toLowerCase()} à {hmOf(e.at)} · {fmt(e.before?.total)} → {fmt(e.after?.total)} · motif : {e.reason}</div>)}</div>}
                    {dead && <div style={{ color: C.red }}>Annulé par {s.cancel?.by} · {dayLabel(s.cancel?.at).toLowerCase()} à {hmOf(s.cancel?.at)} · motif : {s.cancel?.reason || "—"}{s.refund ? ` · remboursé ${fmt(s.refund.amount)}` : ""}</div>}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Btn kind="ghost" icon="receipt" onClick={() => openReceipt(s)} style={{ minHeight: 42, fontSize: 13, gridColumn: (1 + (can.cancel && !dead ? 1 : 0) + (can.editSale && !dead ? 1 : 0) + (can.deleteSale ? 1 : 0)) % 2 ? "1 / -1" : "auto" }}>Reçu</Btn>
                    {can.cancel && !dead && <Btn kind="danger" icon="x" onClick={() => setCancel(s)} style={{ minHeight: 42, fontSize: 13 }}>Annuler</Btn>}
                    {can.editSale && !dead && <Btn kind="soft" icon="edit" onClick={() => setEdit(s)} style={{ minHeight: 42, fontSize: 13 }}>Modifier</Btn>}
                    {can.deleteSale && <Btn kind="danger" icon="trash" onClick={() => setDel(s)} style={{ minHeight: 42, fontSize: 13 }}>Supprimer</Btn>}
                  </div>
                  {can.cancel && !dead && <p className="mt-1.5 text-[11px] flex items-center gap-1.5" style={{ color: C.muted }}><Icon name="lock" size={12} color={C.amber} />Gérante ou propriétaire · motif obligatoire · le ticket reste dans l'historique</p>}
                </div>
              )}
            </div>
          );
        })}
        {!list.length && <Empty icon="list" title="Aucune vente" text="Aucune vente sur cette période." />}
      </div>
      {cancel && <CancelSheet ctx={ctx} sale={cancel} onClose={() => setCancel(null)} />}
      {edit && <EditSaleSheet ctx={ctx} sale={edit} onClose={() => setEdit(null)} />}
      {del && <DeleteSaleSheet ctx={ctx} sale={del} onClose={() => setDel(null)} />}
    </div>
  );
}

// ---------- Propriétaire : modifier un ticket ----------
const toNum = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
function EditSaleSheet({ ctx, sale, onClose }) {
  const { fmt, actions } = ctx;
  const [lines, setLines] = useState(() => (sale.lines || []).map((l) => ({ ...l, _qty: String(l.qty || 1), _unit: String(Math.round(l.unitPrice != null ? l.unitPrice : (Number(l.amount) || 0) / Math.max(1, Number(l.qty) || 1))), _label: l.label || "" })));
  const vente = (sale.payments || []).find((p) => p.kind === "vente");
  const [mode, setMode] = useState(vente?.mode === "momo" ? "momo" : "cash");
  const [op, setOp] = useState(vente?.op || DEFAULT_MOMO);
  const [reason, setReason] = useState("");
  const amountOf = (l) => toNum(l._qty) * toNum(l._unit);
  const total = lines.reduce((t, l) => t + amountOf(l), 0) + lines.reduce((t, l) => t + (Number(l.official) || 0), 0);
  const before = saleToPay(sale);
  const ok = lines.length > 0 && lines.every((l) => l._label.trim() && toNum(l._qty) > 0) && reason.trim().length > 2;
  const set = (i, k, v) => setLines(lines.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const submit = () => {
    const out = lines.map((l) => { const q = toNum(l._qty); const ratio = q / Math.max(1, Number(l.qty) || 1); const { _qty, _unit, _label, ...rest } = l; const changed = q !== Number(l.qty) || toNum(_unit) !== Math.round(Number(l.unitPrice != null ? l.unitPrice : (Number(l.amount) || 0) / Math.max(1, Number(l.qty) || 1))); return { ...rest, label: _label.trim(), detail: changed ? `${q} × ${fmt(toNum(_unit))} · modifié` : l.detail, qty: q, unitPrice: toNum(_unit), amount: q * toNum(_unit), consume: (l.consume || []).map((c) => ({ ...c, qty: Math.max(0, Math.round((Number(c.qty) || 0) * ratio)) })) }; });
    if (actions.editSale(sale, { lines: out, payMode: vente ? mode : null, payOp: op, reason: reason.trim() })) onClose();
  };
  return (
    <Sheet title={`Modifier le ticket ${sale.no}`} onClose={onClose}>
      <p className="text-[12.5px]" style={{ color: C.muted }}>{sale.by} · {dayLabel(sale.at).toLowerCase()} à {hmOf(sale.at)}{sale.client?.name ? ` · ${sale.client.name}` : ""}</p>
      <div className="mt-3 flex flex-col gap-2">
        {lines.map((l, i) => (
          <div key={l.id || i} className="rounded-[16px] p-2.5" style={{ border: `1.5px solid ${C.line}`, background: "#fff" }}>
            <div className="flex items-center gap-1.5">
              <input value={l._label} onChange={(e) => set(i, "_label", e.target.value)} aria-label="Libellé" style={{ ...inputStyle, minHeight: 42, fontWeight: 800, flex: 1 }} />
              {lines.length > 1 && <button type="button" aria-label="Retirer la ligne" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="gb-focus w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "#FEF2F2", color: C.red, border: "1.5px solid #FECACA" }}><Icon name="trash" size={16} /></button>}
            </div>
            {l.detail && <p className="mt-1 text-[11px] truncate" style={{ color: C.muted }}>{l.detail}</p>}
            <div className="mt-1.5 grid gap-1.5 items-end" style={{ gridTemplateColumns: "1fr 1.3fr 1.3fr" }}>
              <Field label="QTÉ"><input value={l._qty} onChange={(e) => set(i, "_qty", e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" style={{ ...inputStyle, minHeight: 42, textAlign: "center", fontWeight: 800 }} /></Field>
              <Field label="PRIX UNIT."><input value={l._unit} onChange={(e) => set(i, "_unit", e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" style={{ ...inputStyle, minHeight: 42, textAlign: "right", fontWeight: 800 }} /></Field>
              <div className="rounded-[13px] px-2.5 flex items-center justify-end text-[13.5px] font-extrabold whitespace-nowrap" style={{ minHeight: 42, background: "#F7F9FC" }}>{fmt(amountOf(l))}</div>
            </div>
            {Number(l.official) > 0 && <p className="mt-1 text-[11px]" style={{ color: C.muted }}>+ frais officiels {fmt(l.official)} (inchangés)</p>}
          </div>
        ))}
      </div>
      {vente && (
        <>
          <p className="mt-3 text-[11px] font-extrabold" style={{ color: C.muted }}>MODE DE PAIEMENT</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5"><Chip on={mode === "cash"} onClick={() => setMode("cash")}>Espèces</Chip><Chip on={mode === "momo"} onClick={() => setMode("momo")}>Mobile Money</Chip></div>
          {mode === "momo" && <div className="mt-2.5"><MomoPicker value={op} onChange={setOp} /></div>}
        </>
      )}
      <div className="mt-3 rounded-[16px] px-3 py-2.5 text-white" style={{ background: C.navy }}>
        <div className="flex justify-between text-[12px]" style={{ color: "#C7D2E5" }}><span>Avant</span><span className="whitespace-nowrap">{fmt(before)}</span></div>
        <div className="flex justify-between items-baseline"><span className="text-[13px] font-bold">Nouveau total</span><span className="text-[20px] font-extrabold whitespace-nowrap" style={{ fontFamily: FONT_D }}>{fmt(total)}</span></div>
        {salePaid(sale) >= before && <p className="text-[11px] mt-0.5" style={{ color: "#A5F3FC" }}>Ticket payé : il reste payé au nouveau montant.</p>}
      </div>
      <div className="mt-3"><Field label="MOTIF DE LA MODIFICATION"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. erreur de quantité" style={inputStyle} /></Field></div>
      <Btn kind="cyan" full big icon="check" className="mt-4" disabled={!ok} onClick={submit}>Enregistrer la modification</Btn>
      <p className="mt-1.5 text-[11px] flex items-center gap-1.5" style={{ color: C.muted }}><Icon name="lock" size={12} color={C.amber} />Propriétaire uniquement · l'ancien montant reste visible dans le ticket</p>
    </Sheet>
  );
}
// ---------- Propriétaire : supprimer un ticket ----------
function DeleteSaleSheet({ ctx, sale, onClose }) {
  const { fmt, actions } = ctx;
  const [reason, setReason] = useState("");
  const reasons = ["Vente de test", "Doublon", "Erreur de saisie", "Autre"];
  const ok = reason.trim().length > 2;
  return (
    <Sheet title={`Supprimer le ticket ${sale.no}`} onClose={onClose}>
      <div className="rounded-[16px] px-3 py-3 flex items-center gap-2.5" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}>
        <span className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "#fff", color: C.red }}><Icon name="trash" size={18} /></span>
        <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold truncate">{saleSummary(sale)}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>{sale.by} · {fmt(saleToPay(sale))}</span></span>
      </div>
      <p className="mt-3 text-[12.5px]" style={{ color: C.ink2 }}>Le ticket disparaît de l'historique, de la caisse, des crédits et des rapports, sur tous les téléphones. Le stock consommé est remis.</p>
      <p className="mt-3 text-[11px] font-extrabold" style={{ color: C.muted }}>MOTIF</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">{reasons.map((x) => <Chip key={x} on={reason === x} ink={C.red} onClick={() => setReason(x)}>{x}</Chip>)}</div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ou écrivez le motif" aria-label="Motif" className="mt-2" style={inputStyle} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn kind="ghost" onClick={onClose} style={{ minHeight: 48 }}>Garder</Btn>
        <Btn kind="red" icon="trash" disabled={!ok} onClick={() => { actions.deleteSale(sale, { reason: reason.trim() }); onClose(); }} style={{ minHeight: 48 }}>Supprimer</Btn>
      </div>
    </Sheet>
  );
}

function CancelSheet({ ctx, sale, onClose }) {
  const { fmt, actions } = ctx;
  const paid = salePaid(sale);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(paid > 0);
  const reasons = ["Erreur de saisie", "Client a renoncé", "Travail mal fait", "Doublon"];
  const ok = reason.trim().length > 2;
  return (
    <Sheet title={`Annuler le ticket ${sale.no}`} onClose={onClose}>
      <p className="text-[13px]" style={{ color: C.muted }}>{saleSummary(sale)} · {fmt(saleToPay(sale))}</p>
      <p className="mt-3 text-[11px] font-extrabold" style={{ color: C.muted }}>MOTIF</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">{reasons.map((x) => <Chip key={x} on={reason === x} ink={C.red} onClick={() => setReason(x)}>{x}</Chip>)}</div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ou écrivez le motif" aria-label="Motif" className="mt-2" style={inputStyle} />
      {paid > 0 && (
        <button type="button" onClick={() => setRefund(!refund)} aria-pressed={refund} className="gb-focus mt-3 w-full flex items-center gap-2.5 rounded-[15px] p-3 text-left" style={{ border: `1.5px solid ${refund ? C.red : C.line}`, background: refund ? "#FEF2F2" : "#fff" }}>
          <span className="w-5 h-5 rounded-[6px] flex items-center justify-center" style={{ background: refund ? C.red : "#fff", border: `2px solid ${refund ? C.red : "#C7D2E5"}` }}>{refund && <Icon name="check" size={12} color="#fff" stroke={3.4} />}</span>
          <span className="flex-1"><span className="block text-[14px] font-extrabold">Rembourser {fmt(paid)} au client</span><span className="block text-[11.5px]" style={{ color: C.muted }}>Sortie de caisse enregistrée et annoncée au propriétaire</span></span>
        </button>
      )}
      <Btn kind="red" full big className="mt-4" disabled={!ok} onClick={() => { actions.cancelSale(sale, { reason: reason.trim(), refund }); onClose(); }}>{refund && paid > 0 ? `Annuler et rembourser ${fmt(paid)}` : "Annuler le ticket"}</Btn>
    </Sheet>
  );
}

// ---------- Crédits clients ----------
export function clientDebts(clients, sales) {
  return clients.map((c) => {
    const own = sales.filter((s) => s.client?.id === c.id && isLive(s));
    const due = own.reduce((t, s) => t + saleDue(s), 0);
    const oldest = own.filter((s) => saleDue(s) > 0).reduce((m, s) => Math.min(m, s.at), Infinity);
    return { ...c, due, days: Number.isFinite(oldest) ? Math.floor((Date.now() - oldest) / DAY) : 0, tickets: own.length };
  });
}
export function CreditsScreen({ ctx, openClient }) {
  const { clients, sales, fmt, actions, now } = ctx;
  const [f, setF] = useState("due");
  const [q, setQ] = useState("");
  const [add, setAdd] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const rows = clientDebts(clients, sales);
  const total = rows.reduce((t, c) => t + c.due, 0);
  const late = rows.filter((c) => c.due > 0 && c.days > 7);
  const [m0] = dayBounds(now); const mStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const month = periodFigures({ sales, from: mStart, to: m0 + DAY });
  const qn = q.trim().toLowerCase();
  const list = rows.filter((c) => (f === "all" || (f === "due" ? c.due > 0 : c.due > 0 && c.days > 7)) && (!qn || `${c.name} ${c.phone || ""}`.toLowerCase().includes(qn))).sort((a, b) => b.due - a.due);
  return (
    <div style={{ paddingBottom: 130 }}>
      <Hero glow="rgba(251,191,36,0.3)">
        <div className="cy-a flex items-end justify-between gap-2">
          <div><p className="text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#FCD34D" }}>CRÉANCES CLIENTS</p><p className="text-[30px] font-extrabold tracking-tight" style={{ fontFamily: FONT_D }}>{fmt(total)}</p><p className="text-[12px]" style={{ color: "#B6C4DC" }}>{rows.filter((c) => c.due > 0).length} client{rows.filter((c) => c.due > 0).length > 1 ? "s" : ""} · {late.length} en retard de plus de 7 jours</p></div>
          <button type="button" onClick={() => setAdd(true)} className="gb-focus cy-tap h-[42px] px-3.5 rounded-[14px] flex items-center gap-1.5 text-[13px] font-extrabold" style={{ background: "#FBBF24", color: C.navy, boxShadow: "0 10px 22px -10px rgba(251,191,36,0.9)" }}><Icon name="plus" size={16} stroke={2.6} />Client</button>
        </div>
        <div className="cy-a cy-d1 mt-3.5 grid grid-cols-3 gap-1.5">
          {[["Crédits du mois", fmt(month.credit), "#fff"], ["Remboursés", fmt(month.creditPaid), "#6EE7B7"], ["Clients", String(clients.length), "#fff"]].map(([l, v, c]) => <div key={l} className="rounded-[13px] px-2.5 py-2" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}><p className="text-[10px] font-bold" style={{ color: "#AEBBD2" }}>{l}</p><p className="text-[14px] font-extrabold whitespace-nowrap" style={{ color: c }}>{v}</p></div>)}
        </div>
      </Hero>
      <label className="cy-a cy-d1 mt-3 h-[46px] rounded-[15px] flex items-center gap-2 px-3" style={{ background: "#fff", border: `1.5px solid ${C.line}` }}><Icon name="search" size={17} color={C.muted} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou téléphone" aria-label="Rechercher un client" className="flex-1 min-w-0 bg-transparent outline-none text-[14px]" /></label>
      <div className="cy-a cy-d2 mt-2.5 flex gap-1.5">{[["due", "Doivent de l'argent"], ["late", `En retard · ${late.length}`], ["all", "Tous"]].map(([id, l]) => <Chip key={id} on={f === id} onClick={() => setF(id)}>{l}</Chip>)}</div>
      <div className="cy-a cy-d3 mt-3 flex flex-col gap-2">
        {list.map((c) => { const lateC = c.due > 0 && c.days > 7; return (
          <Card key={c.id} onClick={() => openClient(c.id)} className="px-3 py-2.5" style={{ border: `1.5px solid ${lateC ? "#FECACA" : C.line}` }}>
            <div className="flex items-center gap-2.5">
              <Avatar name={c.name} tint={lateC ? C.redSoft : C.cyanSoft} ink={lateC ? C.red : C.cyanInk} />
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold truncate">{c.name}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>{c.phone || "—"}{c.due > 0 ? ` · depuis ${c.days ? `${c.days} j` : "aujourd'hui"}` : ""}</span></span>
              <span className="text-right"><span className="block text-[16px] font-extrabold" style={{ fontFamily: FONT_D, color: lateC ? C.red : c.due ? C.navy : C.green }}>{c.due ? fmt(c.due) : "À jour"}</span>{c.due > 0 && <Tag tint={lateC ? C.redSoft : C.amberSoft} ink={lateC ? C.red : "#92400E"}>{lateC ? "À relancer" : "En cours"}</Tag>}</span>
            </div>
          </Card>
        ); })}
        {!list.length && <Empty icon="users" title={f === "all" ? "Aucun client" : "Aucune créance"} text={f === "all" ? "Ajoutez un client pour lui faire crédit." : "Tous vos clients sont à jour."} />}
      </div>
      {add && (
        <Sheet title="Nouveau client" onClose={() => setAdd(false)}>
          <div className="grid gap-2.5"><Field label="NOM"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. YAO Kouadio" style={inputStyle} /></Field><Field label="TÉLÉPHONE"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="07 00 00 00 00" style={inputStyle} /></Field></div>
          <Btn kind="amber" full big className="mt-4" disabled={!name.trim()} onClick={() => { if (actions.saveClient({ name: name.trim(), phone: phone.trim() })) { setName(""); setPhone(""); setAdd(false); } }}>Enregistrer le client</Btn>
        </Sheet>
      )}
    </div>
  );
}

export function ClientScreen({ ctx, clientId, onBack, openReceipt, openPayment }) {
  const { clients, sales, fmt, actions } = ctx;
  const c = clients.find((x) => x.id === clientId);
  const [pay, setPay] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [op, setOp] = useState(DEFAULT_MOMO);
  if (!c) return <div><TopBar title="Client" onBack={onBack} /><Empty title="Client introuvable" /></div>;
  const own = sales.filter((s) => s.client?.id === c.id).sort((a, b) => b.at - a.at);
  const due = own.reduce((t, s) => t + saleDue(s), 0);
  const moves = []; const payMoves = new Map();
  own.forEach((s) => {
    (s.payments || []).filter((p) => p.kind === "credit").forEach((p) => {
      const k = creditGroupKey(p); const m = payMoves.get(k);
      if (m) { m.amount += Number(p.amount) || 0; m.n += 1; return; }
      payMoves.set(k, { id: `pay-${k}`, key: k, at: p.at, mode: p.mode, op: p.op, by: p.by, amount: Number(p.amount) || 0, n: 1 });
    });
    if (!isLive(s)) return;
    const first = (s.payments || []).filter((p) => p.kind !== "credit").reduce((t, p) => t + p.amount, 0);
    moves.push({ id: s.id, at: s.at, sale: s, t: `${first > 0 ? "Vente partielle" : "Vente à crédit"} · ticket ${s.no}`, sub: `${saleSummary(s)}${first > 0 ? ` · payé ${fmt(first)}` : ""}`, v: `+ ${fmt(saleToPay(s) - first)}`, plus: true });
  });
  payMoves.forEach((p) => moves.push({ id: p.id, at: p.at, payKey: p.key, t: `Paiement de crédit · ${p.mode === "momo" ? momoLabel(p.op) : "espèces"}`, sub: `reçu par ${p.by}${p.n > 1 ? ` · ${p.n} tickets` : ""} · voir le reçu`, v: `− ${fmt(p.amount)}`, plus: false }));
  moves.sort((a, b) => b.at - a.at);
  const n = Math.min(due, Number(amount) || 0);
  const tel = String(c.phone || "").replace(/\D/g, "");
  const relance = `Bonjour ${c.name}, ${ctx.shop?.name || "votre cyber café"} vous rappelle un reste à payer de ${fmt(due)}. Merci de passer le régler. Bonne journée.`;
  return (
    <div style={{ paddingBottom: 120 }}>
      <Hero>
        <div className="cy-a flex items-center gap-2.5"><BackBtn onBack={onBack} dark /><Avatar name={c.name} tint={due ? C.redSoft : C.greenSoft} ink={due ? C.red : C.green} size={46} /><span className="flex-1 min-w-0"><span className="block text-[19px] font-extrabold truncate" style={{ fontFamily: FONT_D }}>{c.name}</span><span className="block text-[12px]" style={{ color: "#B6C4DC" }}>{c.phone || "Sans téléphone"}</span></span></div>
        {tel && <div className="cy-a cy-d1 mt-3 grid grid-cols-2 gap-2">
          <a href={`tel:${tel}`} className="gb-focus cy-tap h-[42px] rounded-[13px] flex items-center justify-center gap-2 text-[13px] font-extrabold" style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff" }}><Icon name="call" size={16} />Appeler</a>
          <a href={`https://wa.me/${tel.length <= 10 ? `225${tel}` : tel}?text=${encodeURIComponent(relance)}`} target="_blank" rel="noopener noreferrer" className="gb-focus cy-tap h-[42px] rounded-[13px] flex items-center justify-center gap-2 text-[13px] font-extrabold" style={{ background: "#25D366", color: "#052E16" }}><Icon name="chat" size={16} />Relancer</a>
        </div>}
      </Hero>
      <Card className="cy-a cy-d1 mt-3 p-3.5" style={{ border: `1.5px solid ${due ? "#FECACA" : "#BBF7D0"}` }}>
        <p className="text-[11px] font-extrabold" style={{ color: C.muted }}>RESTE À PAYER</p>
        <p className="text-[30px] font-extrabold" style={{ fontFamily: FONT_D, color: due ? C.red : C.green }}>{fmt(due)}</p>
      </Card>
      <Label>MOUVEMENTS</Label>
      <Card className="cy-a cy-d2 px-3">
        {moves.map((m, i) => (
          <button key={m.id} type="button" onClick={() => (m.payKey ? openPayment?.(m.payKey) : openReceipt(m.sale))} className="gb-focus w-full flex items-center gap-2.5 min-h-[58px] text-left" style={{ borderTop: i ? `1px solid ${C.line2}` : "none" }}>
            <span className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: m.plus ? C.redSoft : C.greenSoft, color: m.plus ? C.red : C.green }}><Icon name={m.plus ? "plus" : "minus"} size={16} stroke={2.6} /></span>
            <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{m.t}</span><span className="block text-[11.5px] truncate" style={{ color: C.muted }}>{dayLabel(m.at)} {hmOf(m.at)} · {m.sub}</span></span>
            <span className="text-[13.5px] font-extrabold" style={{ color: m.plus ? C.red : C.green }}>{m.v}</span>
          </button>
        ))}
        {!moves.length && <p className="py-4 text-center text-[12.5px]" style={{ color: C.muted }}>Aucun mouvement.</p>}
      </Card>
      {due > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] px-4 pt-3 z-30" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "linear-gradient(to top, #EEF2F8 75%, rgba(238,242,248,0))" }}>
          <Btn kind="green" full big icon="cash" onClick={() => { setAmount(String(due)); setPay(true); }}>Encaisser un paiement</Btn>
        </div>
      )}
      {pay && (
        <Sheet title="Paiement de crédit" onClose={() => setPay(false)}>
          <Field label="MONTANT REÇU"><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" style={{ ...inputStyle, fontSize: 24, fontWeight: 800 }} /></Field>
          <div className="mt-2 grid grid-cols-4 gap-1.5">{[due, 5000, 2000, 1000].filter((v, i, a) => v <= due && a.indexOf(v) === i).map((v) => <Chip key={v} on={Number(amount) === v} onClick={() => setAmount(String(v))} className="!px-1">{v === due ? "Tout" : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</Chip>)}</div>
          <div className="mt-2 grid grid-cols-2 gap-1.5"><Chip on={mode === "cash"} onClick={() => setMode("cash")}>Espèces</Chip><Chip on={mode === "momo"} onClick={() => setMode("momo")}>Mobile Money</Chip></div>
          {mode === "momo" && <div className="mt-2.5"><MomoPicker value={op} onChange={setOp} /></div>}
          <p className="mt-3 rounded-[12px] px-3 py-2 text-[11.5px]" style={{ background: C.cyanSoft, color: "#155E75" }}>Ce paiement entre dans l'encaissé du jour. Ce n'est pas une nouvelle vente : le chiffre d'affaires ne change pas.</p>
          <Btn kind="green" full big className="mt-3" disabled={!(n > 0)} onClick={() => { const key = actions.payCredit(c, n, mode, mode === "momo" ? op : ""); setPay(false); if (key && openPayment) openPayment(key, true); }}>Encaisser {fmt(n)} · reste {fmt(due - n)}</Btn>
        </Sheet>
      )}
    </div>
  );
}
