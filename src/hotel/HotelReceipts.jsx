// src/hotel/HotelReceipts.jsx
//
// Reçus de l'hôtel : ticket à l'écran, impression / partage, liste des
// reçus (propriétaire), réglages du logo et de l'en-tête, encaissement avec
// somme reçue et monnaie rendue, annulations réservées au propriétaire.

import { MomoPicker, DEFAULT_MOMO } from "../MomoPicker.jsx";
import { useEffect, useMemo, useState } from "react";
import { H, Icon, Btn, Card, Label, GroupTitle, Chip, Toggle, TopBar, RoomBadge, Field, inputStyle, Sheet, Empty } from "./HotelUI.jsx";
import { allReceipts, dayBounds, hmOf, toMs, DAY, stayPaid } from "./hotelLogic.js";
import { receiptInfo, receiptModel, logoSrc, fileToLogo, printHotelReceipt, shareHotelReceipt, PAY_TXT } from "./hotelReceipts.js";
import { exportReceiptPdf } from "./hotelPdf.js";

const MONO = "ui-monospace, 'JetBrains Mono', 'Courier New', monospace";

// ---------- Ticket affiché ----------
export function ReceiptTicket({ r, info, fmt }) {
  const m = receiptModel(r, info, fmt);
  const row = ([a, b], i) => <div key={i} className="flex justify-between gap-2"><span>{a}</span><b className="text-right">{b}</b></div>;
  return (
    <div className="mx-auto" style={{ width: "100%", maxWidth: 330, filter: "drop-shadow(0 14px 22px rgba(10,23,48,0.18))" }}>
      <div className="relative px-5 pt-5 pb-4" style={{ background: "#fff", fontFamily: MONO, color: "#111827", fontSize: 11.5 }}>
        {m.cancelled && <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true"><span className="text-[38px] font-extrabold px-3 rounded-[8px]" style={{ color: "rgba(190,18,60,0.35)", border: "4px solid rgba(190,18,60,0.35)", transform: "rotate(-18deg)", fontFamily: "inherit" }}>ANNULÉ</span></div>}
        <div className="flex flex-col items-center text-center">
          <img src={logoSrc(info)} alt="" style={{ width: 74, height: 74, objectFit: "contain" }} />
          <div className="mt-2 text-[17px] font-extrabold tracking-[0.04em]" style={{ fontFamily: "inherit" }}>{info.name.toUpperCase()}</div>
          {(info.address || info.phone) && <div className="text-[10.5px] leading-[1.5]" style={{ color: "#4B5563" }}>{info.address}{info.address && info.phone ? <br /> : null}{info.phone ? `Tél. ${info.phone}` : ""}</div>}
          <div className="mt-2 px-2.5 py-[3px] text-[11px] font-extrabold tracking-[0.12em]" style={{ border: "1.5px solid #111827" }}>{m.title}</div>
        </div>
        <div className="my-3" style={{ borderTop: "1px solid #E3E8F0" }} />
        {m.rows.map(row)}
        <div className="my-2" style={{ borderTop: "1px solid #E3E8F0" }} />
        <div className="text-center text-[22px] font-extrabold">{m.room}</div>
        <div className="text-center text-[11px] font-bold">{m.roomType}</div>
        <div className="mt-2">{m.stay.map(row)}</div>
        <div className="my-2" style={{ borderTop: "1px solid #E3E8F0" }} />
        {m.lines.map(([a, b], i) => <div key={i} className="flex justify-between gap-2"><span>{a}</span><span>{b}</span></div>)}
        <div className="my-1.5" style={{ borderTop: "1.5px solid #111827" }} />
        <div className="flex justify-between text-[15px] font-extrabold"><span>{m.totalLbl}</span><span>{m.totalVal}</span></div>
        <div className="my-1.5" style={{ borderTop: "1.5px solid #111827" }} />
        {m.pay.map(row)}
        <div className="mt-2.5 mb-2" style={{ borderTop: "1px solid #E3E8F0" }} />
        <div className="text-center">
          <div className="text-[13px] font-extrabold">{m.thanks[0]}</div>
          {m.thanks.slice(1).map((t, i) => <div key={i} className="mt-0.5 text-[11px] leading-[1.5]" style={{ color: "#374151" }}>{t}</div>)}
          <div className="mt-1.5 text-[10px]" style={{ color: "#6B7280" }}>Merci de conserver ce reçu.</div>
          <div className="text-[9.5px]" style={{ color: "#6B7280" }}>{r.no} · GestiOne</div>
        </div>
      </div>
      <svg width="100%" height="12" viewBox="0 0 316 12" preserveAspectRatio="none" style={{ display: "block" }} aria-hidden="true"><path d={`M0 0h316v2${Array.from({ length: 20 }, () => "l-8 10-8-10").join("")}V0z`} fill="#fff" /></svg>
    </div>
  );
}

// ---------- Écran du reçu (après un encaissement ou depuis la liste) ----------
export function ReceiptScreen({ ctx, receipt, onDone, onBack, fresh }) {
  const { shop, settings, fmt, pushToast, stays, reservations } = ctx;
  const info = receiptInfo(shop, settings);
  // Statut à jour (une annulation faite depuis un autre téléphone, etc.).
  const live = useMemo(() => allReceipts(stays, reservations).find((x) => x.id === receipt.id) || receipt, [stays, reservations, receipt]);
  const [busy, setBusy] = useState(false);
  const print = async () => {
    setBusy(true);
    try { const how = await printHotelReceipt(live, info, fmt); if (how === "printer") pushToast("Reçu envoyé à l'imprimante", "ok"); else if (how === "pdf") pushToast("PDF du reçu prêt : choisissez où l'enregistrer ou l'imprimer", "ok"); }
    catch (e) { pushToast(e?.message || "Impression impossible", "error"); }
    setBusy(false);
  };
  const pdf = async () => {
    setBusy(true);
    try { await exportReceiptPdf(live, info, fmt); } catch (e) { pushToast(e?.message || "PDF impossible", "error"); }
    setBusy(false);
  };
  return (
    <div>
      <TopBar title={`Reçu ${live.no}`} sub={`Aperçu · ticket ${info.paper === "a4" ? "A4" : `${info.paper} mm`}`} onBack={onBack}
        right={<span className="h-[30px] px-2.5 rounded-[10px] text-[11.5px] font-extrabold flex items-center shrink-0" style={live.status === "cancelled" ? { background: "#FFF1F3", color: "#BE123C" } : { background: "#DCFCE7", color: H.green }}>{live.status === "cancelled" ? "Annulé" : "Enregistré"}</span>} />
      <div className="mt-3 -mx-4 px-4 py-4" style={{ background: "#E9ECF2" }}>
        <ReceiptTicket r={live} info={info} fmt={fmt} />
      </div>
      {live.status === "cancelled" && live.cancel && <p className="mt-2 text-[12px] font-bold text-center" style={{ color: "#BE123C" }}>Annulé par {live.cancel.by || "—"} · {new Date(toMs(live.cancel.at)).toLocaleDateString("fr-FR")} {hmOf(toMs(live.cancel.at))}{live.cancel.reason ? ` · ${live.cancel.reason}` : ""}</p>}
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,0.75fr) minmax(0,1.35fr)" }}>
        <Btn kind="ghost" onClick={() => shareHotelReceipt(live, info, fmt)} className="!px-2 !text-[13px]"><Icon name="share" size={16} stroke={2.3} />Partager</Btn>
        <Btn kind="ghost" disabled={busy} onClick={pdf} className="!px-2 !text-[13px]"><Icon name="download" size={16} stroke={2.3} />PDF</Btn>
        <Btn kind="ghost" onClick={onDone} className="!px-2 !text-[13px]">{fresh || Date.now() - toMs(receipt.at) < 60000 ? "Ne pas imprimer" : "Fermer"}</Btn>
      </div>
      <Btn kind="navy" full disabled={busy} onClick={print} className="mt-2 !min-h-[56px] !text-[16px]" style={{ background: "linear-gradient(135deg,#17305A,#0A1730)" }}><Icon name="printer" size={20} color={H.gold} stroke={2.3} />{busy ? "Impression…" : "Imprimer le reçu"}</Btn>
    </div>
  );
}

// ---------- Somme reçue et monnaie ----------
const BILLS = [500, 1000, 2000, 5000, 10000];
export function suggestBills(amount) {
  const out = [];
  BILLS.forEach((b) => { const v = Math.ceil(amount / b) * b; if (v > amount && !out.includes(v)) out.push(v); });
  [10000, 20000].forEach((v) => { if (v > amount && !out.includes(v)) out.push(v); });
  return out.sort((a, b) => a - b).slice(0, 3);
}
export function CashGiven({ amount, given, setGiven, fmt }) {
  const change = given - amount;
  const opts = [amount, ...suggestBills(amount)];
  return (
    <div className="rounded-[18px] p-3" style={{ background: "#fff", boxShadow: H.shadow }}>
      <p className="text-[11.5px] font-extrabold tracking-[0.05em]" style={{ color: H.muted }}>SOMME REÇUE DU CLIENT</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-[14px] px-3" style={{ height: 54, border: `2px solid ${H.gold}`, background: "#F0FBFE" }}>
        <input aria-label="Somme reçue" inputMode="numeric" value={given ? String(given) : ""} placeholder="0" onChange={(e) => setGiven(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))} className="flex-1 min-w-0 bg-transparent outline-none text-[24px] font-extrabold" style={{ fontFamily: MONO, color: H.navy }} />
        <span className="text-[14px] font-extrabold" style={{ color: H.goldDark }}>FCFA</span>
      </div>
      <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `minmax(0,1.35fr) repeat(${opts.length - 1}, minmax(0,1fr))` }}>
        {opts.map((v, i) => <button key={v} type="button" onClick={() => setGiven(v)} aria-pressed={given === v} className="gb-focus min-h-[40px] rounded-[12px] text-[11.5px] font-extrabold whitespace-nowrap px-1" style={{ border: `1.5px solid ${given === v ? H.gold : H.line}`, background: given === v ? H.goldSoft : "#fff", color: given === v ? H.goldDark : H.ink2 }}>{i === 0 ? "Compte juste" : fmt(v).replace(/\s?F(CFA)?$/, "")}</button>)}
      </div>
      <div className="mt-2.5 flex items-center gap-2.5 rounded-[14px] px-3 py-2.5" style={change >= 0 ? { background: "#ECFDF3", border: "1.5px solid #A7E8C3" } : { background: "#FFF7EB", border: "1.5px solid #FCD9A8" }}>
        <span className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: change >= 0 ? H.green : H.orange }}><Icon name="swap" size={18} color="#fff" stroke={2.4} /></span>
        <span className="flex-1"><span className="block text-[11.5px] font-extrabold" style={{ color: change >= 0 ? H.green : H.orange }}>{change >= 0 ? "MONNAIE À RENDRE" : "IL MANQUE"}</span><span className="block text-[21px] font-extrabold" style={{ fontFamily: MONO, color: change >= 0 ? H.green : H.orange }}>{fmt(Math.abs(change))}</span></span>
      </div>
    </div>
  );
}

// Encaissement d'un reste à payer (fiche du séjour, En cours, Caisse).
export function PaySheet({ title, amount, fmt, defaultPrint = true, onClose, onConfirm }) {
  const [mode, setMode] = useState("cash");
  const [op, setOp] = useState(DEFAULT_MOMO);
  const [given, setGiven] = useState(amount);
  const [print, setPrint] = useState(defaultPrint);
  const ok = mode !== "cash" || given >= amount;
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="rounded-[18px] px-4 py-3 text-white flex items-center justify-between" style={{ background: "linear-gradient(135deg,#0A1730,#1B3361)" }}>
        <span className="text-[12px] font-bold" style={{ color: "#B8C4D6" }}>À encaisser</span><span className="text-[22px] font-extrabold" style={{ color: "#67E8F9" }}>{fmt(amount)}</span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">{[["cash", "Espèces"], ["momo", "Mobile Money"]].map(([id, l]) => <Chip key={id} on={mode === id} onClick={() => setMode(id)}>{l}</Chip>)}</div>
      {mode === "cash" && <div className="mt-2.5"><CashGiven amount={amount} given={given} setGiven={setGiven} fmt={fmt} /></div>}
      {mode === "momo" && <div className="mt-2.5"><MomoPicker value={op} onChange={setOp} /></div>}
      <div className="mt-2.5 flex items-center gap-3 rounded-[16px] px-3 py-2.5" style={{ background: "#fff" }}><span className="flex-1"><span className="block text-[13.5px] font-extrabold">Afficher le reçu</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Pour l'imprimer ou le partager</span></span><Toggle on={print} onChange={setPrint} label="Afficher le reçu" /></div>
      <Btn kind="green" full disabled={!ok} className="mt-3 !min-h-[54px] !text-[15.5px]" onClick={() => onConfirm({ mode, op: mode === "momo" ? op : "", given: mode === "cash" ? given : amount, print })}><Icon name="check" size={19} stroke={2.6} />{ok ? `Encaisser ${fmt(amount)}` : `Il manque ${fmt(amount - given)}`}</Btn>
    </Sheet>
  );
}

// ---------- Annulation (propriétaire uniquement) ----------
const REASONS = ["Erreur de saisie", "Client parti", "Problème chambre", "Autre"];
export function CancelSheet({ ctx, kind, item, onClose, onDone }) {
  const { fmt, actions } = ctx;
  const [reason, setReason] = useState(REASONS[0]);
  const paid = kind === "stay" ? stayPaid(item) : Number(item.deposit) || 0;
  const [refund, setRefund] = useState(paid > 0);
  const [del, setDel] = useState(false);
  const go = () => {
    if (kind === "stay") actions.cancelStay(item, { reason, refund: refund && paid > 0 });
    else actions.cancelReservation(item, { reason, refund: refund && paid > 0, del });
    onDone?.();
    onClose();
  };
  return (
    <Sheet title={kind === "stay" ? `Annuler le séjour · Ch. ${item.roomNum}` : `Annuler la réservation · Ch. ${item.roomNum}`} onClose={onClose}>
      <div className="flex items-center gap-2 rounded-[14px] px-3 py-2.5 text-[12px] font-bold" style={{ background: H.goldSoft, color: "#8A5A12" }}><Icon name="lock" size={15} />Action réservée au propriétaire</div>
      <p className="mt-3 text-[11.5px] font-extrabold tracking-[0.05em]" style={{ color: H.muted }}>MOTIF</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{REASONS.map((r) => <Chip key={r} on={reason === r} onClick={() => setReason(r)} color="#BE123C" line={H.line}>{r}</Chip>)}</div>
      {paid > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-[16px] px-3 py-2.5" style={{ background: "#fff" }}>
          <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Rembourser le client</span><span className="block text-[11.5px]" style={{ color: H.muted }}>{fmt(paid)} retirés de la caisse du jour</span></span>
          <Toggle on={refund} onChange={setRefund} label="Rembourser le client" />
        </div>
      )}
      {kind === "resa" && (
        <div className="mt-2 flex items-center gap-3 rounded-[16px] px-3 py-2.5" style={{ background: "#fff" }}>
          <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Supprimer la réservation</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Elle disparaît des listes (reste dans l'historique)</span></span>
          <Toggle on={del} onChange={setDel} label="Supprimer la réservation" />
        </div>
      )}
      <p className="mt-3 text-[12px] leading-snug" style={{ color: H.ink2 }}>Le reçu reste dans l'historique, marqué <b style={{ color: "#BE123C" }}>ANNULÉ</b>, avec le motif, l'heure et votre nom.{kind === "stay" ? " La chambre est libérée." : " La chambre redevient libre sur ce créneau."}</p>
      <Btn kind="red" full className="mt-3 !min-h-[52px]" style={{ background: "linear-gradient(135deg,#F43F5E,#BE123C)" }} onClick={go}>{kind === "resa" && del ? "Confirmer la suppression" : "Confirmer l'annulation"}</Btn>
    </Sheet>
  );
}

// ---------- Liste des reçus (propriétaire) ----------
const KIND_INFO = { start: ["Séjour", "#FFF1F3", "#BE123C"], night: ["Nuitée", "#EEF0FF", "#4338CA"], resa: ["Réservation", "#F5F3FF", "#6D28D9"], collect: ["Règlement", "#E0F7FB", "#0E7490"] };
export function ReceiptsScreen({ ctx, onBack, openReceipt }) {
  const { stays, reservations, now, fmt } = ctx;
  const [f, setF] = useState("today");
  const [d0] = dayBounds(now);
  const all = useMemo(() => allReceipts(stays, reservations), [stays, reservations]);
  const kindOf = (r) => (r.kind === "start" ? (Number(r.hours) > 0 ? "start" : "night") : r.kind);
  const list = all.filter((r) => {
    const at = toMs(r.at);
    if (f === "today") return at >= d0;
    if (f === "d7") return at >= d0 - 6 * DAY;
    if (f === "resa") return r.kind === "resa";
    if (f === "cancel") return r.status === "cancelled";
    return true;
  });
  const today = all.filter((r) => toMs(r.at) >= d0);
  const cashed = today.filter((r) => r.status !== "cancelled").reduce((t, r) => t + (Number(r.amount) || 0), 0);
  return (
    <div>
      <TopBar title="Reçus" sub="Tous les reçus · tous les réceptionnistes" onBack={onBack} />
      <div className="mt-3 rounded-[22px] p-4 text-white grid grid-cols-3 gap-2" style={{ background: "linear-gradient(135deg,#0A1730,#1B3361)" }}>
        <span><span className="block text-[10.5px] font-bold" style={{ color: "#AEBBD2" }}>Reçus du jour</span><span className="block text-[20px] font-extrabold">{today.length}</span></span>
        <span><span className="block text-[10.5px] font-bold" style={{ color: "#AEBBD2" }}>Encaissé</span><span className="block text-[16px] font-extrabold whitespace-nowrap" style={{ color: "#67E8F9" }}>{fmt(cashed)}</span></span>
        <span><span className="block text-[10.5px] font-bold" style={{ color: "#AEBBD2" }}>Annulés</span><span className="block text-[20px] font-extrabold" style={{ color: "#FDA4AF" }}>{today.filter((r) => r.status === "cancelled").length}</span></span>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
        {[["today", "Aujourd'hui"], ["d7", "7 jours"], ["all", "Tous"], ["resa", "Réservations"], ["cancel", "Annulés"]].map(([id, l]) => <Chip key={id} on={f === id} onClick={() => setF(id)} className="!min-h-[36px] !px-3 !text-[12px]">{l}</Chip>)}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {list.length === 0 ? <Empty icon="tag" title="Aucun reçu" text="Les reçus sont créés à chaque location, réservation et encaissement." /> : list.slice(0, 200).map((r) => {
          const K = KIND_INFO[kindOf(r)] || KIND_INFO.start;
          const off = r.status === "cancelled";
          return (
            <button key={r.id} type="button" onClick={() => openReceipt(r)} className="gb-focus w-full text-left rounded-[18px] px-3 py-2.5 flex items-center gap-3" style={{ background: "#fff", boxShadow: H.shadow, opacity: off ? 0.72 : 1 }}>
              <RoomBadge num={r.roomNum} type={r.type} size={44} />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5"><span className="text-[12.5px] font-bold" style={{ fontFamily: MONO }}>{r.no}</span><span className="h-[19px] px-1.5 rounded-[6px] text-[9.5px] font-extrabold flex items-center" style={{ background: K[1], color: K[2] }}>{K[0]}</span></span>
                <span className="block text-[11.5px] truncate" style={{ color: H.muted }}>{new Date(toMs(r.at)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} {hmOf(toMs(r.at))} · {r.by || "—"}{r.client ? ` · ${r.client}` : ""}</span>
              </span>
              <span className="text-right shrink-0"><span className="block text-[14px] font-extrabold" style={{ textDecoration: off ? "line-through" : "none" }}>{fmt(r.amount || 0)}</span><span className="block text-[10.5px] font-extrabold" style={{ color: off ? "#BE123C" : r.rest > 0 ? H.orange : H.green }}>{off ? "Annulé" : r.kind === "resa" ? (r.amount > 0 ? "Acompte" : "Réservé") : r.rest > 0 ? `Reste ${fmt(r.rest)}` : "Payé"}</span></span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2 rounded-[14px] px-3 py-2.5 text-[11.5px] font-bold" style={{ background: H.goldSoft, color: "#8A5A12" }}><Icon name="lock" size={15} /><span>Les reçus ne s'effacent jamais. Un séjour ou une réservation annulés par le propriétaire gardent leur reçu, marqué « ANNULÉ ».</span></div>
    </div>
  );
}

// ---------- Réglages › Logo et reçus ----------
export function ReceiptSettingsScreen({ ctx, onBack }) {
  const { shop, settings, save, pushToast } = ctx;
  const rc = settings.receipt;
  const [logo, setLogo] = useState(rc.logo || null);
  const [name, setName] = useState(rc.name || shop?.name || "");
  const [address, setAddress] = useState(rc.address || "");
  const [phone, setPhone] = useState(rc.phone || "");
  const [message, setMessage] = useState(rc.message || "");
  const [paper, setPaper] = useState(rc.paper || "58");
  const [ask, setAsk] = useState(rc.ask !== false);
  const [busy, setBusy] = useState(false);
  const info = { name: name.trim() || shop?.name || "Mon hôtel", address, phone, message, logo, paper };
  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { setLogo(await fileToLogo(file)); } catch { pushToast("Image illisible", "error"); }
    setBusy(false);
  };
  const doSave = () => {
    save.shopMeta({ ...shop, hotelSettings: { ...settings, receipt: { logo, name: name.trim(), address: address.trim(), phone: phone.trim(), message: message.trim(), paper, ask } } });
    pushToast("Réglages des reçus enregistrés", "ok");
    onBack();
  };
  const fileBtn = (label, icon, capture, gold) => (
    <label className="gb-focus min-h-[46px] rounded-[14px] text-[13px] font-extrabold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap" style={gold ? { background: "linear-gradient(135deg,#F0C463,#D3962A)", color: H.navy } : { background: "#fff", color: H.navy, border: `1.5px solid ${H.line}` }}>
      <Icon name={icon} size={17} stroke={2.3} />{label}
      <input type="file" accept="image/*" {...(capture ? { capture: "environment" } : {})} onChange={pick} className="hidden" />
    </label>
  );
  return (
    <div>
      <TopBar title="Logo et reçus" sub="Réglages › Mon hôtel · propriétaire" onBack={onBack} />
      <GroupTitle>LOGO DE L'HÔTEL</GroupTitle>
      <Card className="p-4">
        <div className="flex items-center gap-3.5">
          <div className="w-[104px] h-[104px] rounded-[24px] flex items-center justify-center shrink-0" style={{ background: "repeating-conic-gradient(#F1F3F8 0% 25%, #FFFFFF 0% 50%) 50% / 16px 16px", border: "1.5px dashed #CBD5E1" }}>
            <img src={logoSrc(info)} alt="Logo" style={{ width: 86, height: 86, objectFit: "contain" }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-flex h-6 px-2 rounded-[8px] text-[11px] font-extrabold items-center" style={logo ? { background: "#DCFCE7", color: H.green } : { background: H.goldSoft, color: H.goldDark }}>{logo ? "Logo personnalisé" : "Logo par défaut"}</span>
            <p className="mt-1.5 text-[12px] font-semibold leading-snug" style={{ color: "#475569" }}>{busy ? "Préparation de l'image…" : logo ? "Il apparaît en haut de tous les reçus : passage, nuitée et réservation." : "Aucun logo ajouté : GestiOne utilise cet emblème avec le nom de votre hôtel."}</p>
          </div>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2">{fileBtn("Photo", "camera", true, true)}{fileBtn("Galerie", "image", false, false)}</div>
        {logo && <Btn kind="danger" full className="mt-2 !min-h-[42px] !text-[12.5px]" onClick={() => setLogo(null)}><Icon name="trash" size={15} />Retirer · revenir au logo par défaut</Btn>}
        <p className="mt-2.5 text-[11px] leading-snug" style={{ color: H.muted }}>Image carrée de préférence (PNG ou JPG). Elle est réduite pour la synchronisation et imprimée en noir et blanc sur les tickets.</p>
      </Card>
      <GroupTitle>EN-TÊTE DU REÇU</GroupTitle>
      <Card className="p-3.5 flex flex-col gap-2.5">
        <Field label="Nom de l'hôtel"><input value={name} onChange={(e) => setName(e.target.value)} placeholder={shop?.name || "Hôtel"} style={inputStyle} /></Field>
        <Field label="Adresse"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quartier, rue, ville" style={inputStyle} /></Field>
        <Field label="Téléphone"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="07 00 00 00 00" style={inputStyle} /></Field>
        <Field label="Message de politesse (bas du reçu)" hint="Laissez vide pour un message adapté automatiquement (passage, nuitée, réservation).">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Merci pour votre visite ! Nous vous souhaitons un bon repos. Au plaisir de vous revoir très bientôt." style={{ ...inputStyle, padding: "10px 14px", minHeight: 76, resize: "vertical", fontFamily: "inherit" }} />
        </Field>
      </Card>
      <GroupTitle>IMPRESSION</GroupTitle>
      <Card className="p-3.5">
        <p className="text-[13.5px] font-extrabold">Largeur du papier</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">{[["58", "58 mm"], ["80", "80 mm"], ["a4", "A4 / PDF"]].map(([id, l]) => <Chip key={id} on={paper === id} onClick={() => setPaper(id)}>{l}</Chip>)}</div>
        <div className="mt-3 pt-3 flex items-center gap-3" style={{ borderTop: `1px solid ${H.line2}` }}><span className="flex-1"><span className="block text-[13.5px] font-extrabold">Proposer le reçu à chaque encaissement</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Passage, nuitée, réservation, règlement</span></span><Toggle on={ask} onChange={setAsk} label="Proposer le reçu" /></div>
      </Card>
      <GroupTitle>APERÇU</GroupTitle>
      <div className="-mx-4 px-4 py-4" style={{ background: "#E9ECF2" }}>
        <ReceiptTicket fmt={ctx.fmt} info={info} r={{ id: "x", no: "261011-001AA", at: Date.now(), by: ctx.userName || "Réception", kind: "start", roomNum: "12", type: "clim", tariffName: "Forfait 2 h", hours: 2, start: Date.now(), end: Date.now() + 2 * 3600000, client: "", lines: [{ label: "Forfait 2 h (clim)", amount: 5000 }], total: 5000, paidBefore: 0, amount: 5000, given: 10000, change: 5000, mode: "cash", rest: 0, status: "ok" }} />
      </div>
      <Btn kind="navy" full className="mt-4 !min-h-[56px] !text-[16px]" disabled={busy} onClick={doSave}>Enregistrer</Btn>
    </div>
  );
}

export { PAY_TXT };
