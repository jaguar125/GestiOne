// src/hotel/HotelAdmin.jsx — écrans de gestion du module Hôtel : caisse,
// réglages, tarifs et forfaits, numéros de chambre, synchronisation,
// dépenses, personnel, licence, commande de licence, nouvelle réservation.

import { MomoPicker, DEFAULT_MOMO, momoOf } from "../MomoPicker.jsx";
import { useMemo, useRef, useState } from "react";
import { PaySheet } from "./HotelReceipts.jsx";
import { H, Icon, Btn, Card, Label, GroupTitle, Segmented, Chip, Toggle, Stepper, TopBar, RoomBadge, Row, Field, inputStyle, Sheet, Empty } from "./HotelUI.jsx";
import {
  ROOM_TYPES, roomTypeOf, computeEnd, isNight, toMs, stayDue, stayTotal, isActiveStay, isLiveResa, roomConflicts, sortRooms,
  hotelCashForDay, releaseMessage, addRoomRange, hmOf, pad2, parseHM, dayBounds, dayLabel, localDayKey, tariffName, HOUR, DAY, fmtClock,
} from "./hotelLogic.js";

const rid = () => Math.random().toString(36).slice(2, 10);
const PAY = { cash: "Espèces", momo: "Mobile Money", later: "À la sortie" };

// ---------- Caisse ----------
export function CashScreen({ ctx, openStay, openExpenses }) {
  const { stays, expenses, reservations, now, fmt, actions, isOwner, setRoute, settings, openReceipt } = ctx;
  const [payFor, setPayFor] = useState(null);
  const cash = hotelCashForDay({ stays, expenses, reservations, now });
  const dues = stays.filter((s) => stayDue(s) > 0 && (isActiveStay(s) || (s.releasedAt && now - s.releasedAt < 3 * DAY))).sort((a, b) => toMs(b.start) - toMs(a.start));
  const cashPct = cash.total ? Math.round((cash.cash / cash.total) * 100) : 100;
  const dateTxt = new Date(now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div>
      <TopBar title="Caisse" sub={dateTxt.charAt(0).toUpperCase() + dateTxt.slice(1)} />
      <div className="mt-3 rounded-[24px] p-4 text-white" style={{ background: H.navy }}>
        <div className="flex items-center justify-between"><span className="text-[12.5px] font-bold" style={{ color: "#B8C4D6" }}>Encaissé aujourd'hui</span><span className="text-[11.5px] font-extrabold rounded-[8px] px-2 py-0.5" style={{ background: H.gold, color: H.navy }}>{cash.passages + cash.nuitees} location{cash.passages + cash.nuitees > 1 ? "s" : ""}</span></div>
        <p className="text-[30px] font-extrabold tracking-tight mt-0.5">{fmt(cash.total)}</p>
        <div className="mt-3 h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.12)" }}><div style={{ width: `${cashPct}%`, background: H.gold }} /><div style={{ width: `${100 - cashPct}%`, background: "#5EEAD4" }} /></div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: H.gold }} /><span><span className="block text-[11px]" style={{ color: "#B8C4D6" }}>Espèces</span><span className="block text-[14.5px] font-extrabold">{fmt(cash.cash)}</span></span></span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: "#5EEAD4" }} /><span><span className="block text-[11px]" style={{ color: "#B8C4D6" }}>Mobile Money</span><span className="block text-[14.5px] font-extrabold">{fmt(cash.momo)}</span></span></span>
        </div>
        <button type="button" onClick={openExpenses} className="gb-focus mt-3 pt-2.5 w-full flex items-center gap-2.5 text-left" style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
          <span className="flex-1"><span className="block text-[11px]" style={{ color: "#B8C4D6" }}>Dépenses du jour</span><span className="block text-[14.5px] font-extrabold" style={{ color: "#FCA5A5" }}>−{fmt(cash.expensesTotal)}</span></span>
          <span className="text-right"><span className="block text-[11px]" style={{ color: "#B8C4D6" }}>Net en caisse</span><span className="block text-[19px] font-extrabold" style={{ color: H.gold }}>{fmt(cash.net)}</span></span>
          <Icon name="chev" size={16} color="#B8C4D6" />
        </button>
      </div>

      <Label right={<span className="text-[13px] font-extrabold" style={{ color: H.orange }}>{fmt(dues.reduce((t, s) => t + stayDue(s), 0))}</span>}>À encaisser</Label>
      {dues.length === 0 ? <p className="text-[12.5px] px-1" style={{ color: H.green }}>Tout est encaissé.</p> : (
        <Card className="px-3">
          {dues.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: i === dues.length - 1 ? "none" : `1px solid ${H.line2}` }}>
              <button type="button" onClick={() => (isActiveStay(s) ? openStay(s) : null)} className="gb-focus flex items-center gap-2.5 flex-1 min-w-0 text-left">
                <RoomBadge num={s.roomNum} type={s.type} size={40} />
                <span className="min-w-0"><span className="block text-[13.5px] font-extrabold truncate">Ch. {s.roomNum}{s.client ? ` · ${s.client}` : ""}</span><span className="block text-[11.5px] truncate" style={{ color: H.muted }}>{s.tariffName}{isActiveStay(s) ? " · en cours" : " · libérée"}</span></span>
              </button>
              <b className="text-[14px] shrink-0">{fmt(stayDue(s))}</b>
              <Btn kind="navy" onClick={() => setPayFor(s)} className="!min-h-[38px] !px-3 !text-[12px]">Encaisser</Btn>
            </div>
          ))}
        </Card>
      )}

      {isOwner && (
        <Card className="mt-3 px-3">
          <Row icon="receipt" tint={H.goldSoft} ink={H.goldDark} title="Reçus" sub="Tous les reçus · voir, réimprimer" last onClick={() => setRoute({ name: "receipts" })} />
        </Card>
      )}
      {payFor && <PaySheet title={`Encaisser · chambre ${payFor.roomNum}`} amount={stayDue(payFor)} fmt={fmt} defaultPrint={settings.receipt.ask !== false} onClose={() => setPayFor(null)} onConfirm={({ mode, op, given, print }) => { const rc = actions.collect(payFor, mode, { given, op }); setPayFor(null); if (rc && print) openReceipt(rc); }} />}

      <Label>Dernières opérations</Label>
      {cash.operations.length === 0 ? <p className="text-[12.5px] px-1" style={{ color: H.muted }}>Aucun encaissement aujourd'hui.</p> : (
        <Card className="px-3">
          {cash.operations.slice(0, 15).map((o, i, a) => (
            <div key={o.id} className="flex items-center gap-2.5 py-2.5 text-[13px]" style={{ borderBottom: i === a.length - 1 ? "none" : `1px solid ${H.line2}` }}>
              <span className="w-11 font-bold shrink-0" style={{ color: H.muted }}>{hmOf(o.at)}</span>
              <span className="flex-1 min-w-0 truncate"><b>Ch. {o.roomNum}</b> · {o.label}</span>
              <span className="text-[11px] font-extrabold rounded-[6px] px-1.5 py-0.5 shrink-0" style={o.mode === "momo" ? { background: "#E2F5F2", color: "#0B6B61" } : { background: "#F1F3F6", color: "#475569" }}>{o.mode === "momo" ? (momoOf(o.op)?.short || "MoMo") : "Espèces"}</span>
              <b className="w-[78px] text-right shrink-0" style={{ color: o.amount < 0 ? H.red : undefined }}>{fmt(o.amount)}</b>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ---------- Réglages ----------
export function SettingsScreen({ ctx, go, license, licenseStatus }) {
  const { shop, settings, isOwner, isTech, save, expenses, now, fmt, rooms, tariffs, sync, userName, onLogout, staff } = ctx;
  const todayExp = (expenses || []).filter((e) => e.date === localDayKey(now)).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const daysLeft = license?.expiresAt ? Math.ceil((new Date(license.expiresAt) - Date.now()) / DAY) : null;
  const licTxt = license?.lifetime ? "À vie" : license?.planId === "trial" ? `Essai · ${Math.max(0, daysLeft ?? 0)} j` : licenseStatus === "expired" ? "Expirée" : daysLeft != null ? `${daysLeft} j` : "—";
  const setS = (patch) => save.shopMeta({ ...shop, hotelSettings: { ...settings, ...patch } });
  const syncTxt = sync?.pending > 0 ? `${sync.pending} en attente` : "À jour";
  // Accès discret de l'éditeur GestiOne : 7 appuis rapides sur l'icône.
  const taps = useRef({ n: 0, at: 0 });
  const tapIcon = () => {
    const t = Date.now();
    taps.current.n = t - taps.current.at < 1500 ? taps.current.n + 1 : 1;
    taps.current.at = t;
    if (taps.current.n >= 7) { taps.current.n = 0; ctx.onEditorOpen?.(); }
  };
  const editorBlock = ctx.editorOn ? (
    <button type="button" onClick={() => ctx.onEditorOpen?.()} className="gb-focus mt-3 w-full text-left rounded-[20px] p-3.5 text-white relative overflow-hidden flex items-center gap-3" style={{ background: "linear-gradient(150deg, #10251F 0%, #1C4A3A 100%)", boxShadow: "0 12px 24px -14px rgba(16,37,31,0.8)" }}>
      <span className="absolute rounded-full" style={{ right: -40, top: -50, width: 150, height: 150, background: "radial-gradient(circle, rgba(34,211,238,0.38) 0%, rgba(34,211,238,0) 70%)" }} />
      <span className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #22D3EE, #0891B2)" }}><Icon name="shield" size={22} color="#10251F" /></span>
      <span className="relative flex-1 min-w-0"><span className="block text-[10px] font-extrabold tracking-[0.16em]" style={{ color: "#22D3EE" }}>ÉDITEUR GESTIONE</span><span className="block text-[16px] font-extrabold">Espace propriétaire</span><span className="block text-[11.5px]" style={{ color: "#B9D3C6" }}>Abonnements et messages des boutiques</span></span>
      <Icon name="chev" size={18} color="#22D3EE" stroke={2.4} />
    </button>
  ) : null;
  if (isTech) {
    return (
      <div>
        <TopBar title="Mon compte" sub="Technicien de surface" />
        <Card className="mt-3 px-3.5 py-3 flex items-center gap-3"><span className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[17px] font-extrabold" style={{ background: H.violetSoft, color: H.violet }}>{(userName || "?")[0]}</span><span><span className="block text-[15px] font-extrabold">{userName}</span><span className="block text-[12px]" style={{ color: H.muted }}>{shop?.name} · accès ménage uniquement</span></span></Card>
        <Card className="mt-3 px-3"><Row icon="sync" tint={H.greenSoft} ink={H.green} title="Synchronisation" sub="Automatique toutes les 10 min" value={syncTxt} onClick={() => go("sync")} /><Row icon="logout" tint="#F1F3F6" ink="#334155" title="Se déconnecter" last onClick={onLogout} /></Card>
      </div>
    );
  }
  if (!isOwner) {
    return (
      <div>
        <TopBar title="Réglages" sub="Connecté en réceptionniste" right={<span className="h-[30px] px-2.5 rounded-[10px] text-[11.5px] font-extrabold flex items-center select-none" style={{ background: "#E7EEFD", color: "#2457B8" }}>{userName}</span>} />
        <div className="mt-3 rounded-[20px] px-3.5 py-3 flex items-center gap-3 text-white" style={{ background: H.navy }}>
          <span onClick={tapIcon} className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center shrink-0 select-none" style={{ background: H.gold }}><Icon name="bed" size={21} color={H.navy} /></span>
          <span className="flex-1 min-w-0"><span className="block text-[15px] font-extrabold truncate">{shop?.name}</span><span className="block text-[12px]" style={{ color: "#B8C4D6" }}>Réception · {userName}</span></span>
        </div>
        {editorBlock}
        <GroupTitle>MON ESPACE</GroupTitle>
        <Card className="px-3">
          <Row icon="money" tint={H.redSoft} ink={H.red} title="Dépenses" sub="Enregistrer une dépense de l'hôtel" value={`−${fmt(todayExp)}`} valueInk={H.red} onClick={() => go("expenses")} />
          <Row icon="sync" tint={H.greenSoft} ink={H.green} title="Synchronisation" sub="Auto toutes les 10 min · bouton manuel" value={syncTxt} valueInk={H.green} onClick={() => go("sync")} />
          <Row icon="logout" tint="#F1F3F6" ink="#334155" title="Se déconnecter" sub="Changer de réceptionniste" last onClick={onLogout} />
        </Card>
        <GroupTitle><span className="inline-flex items-center gap-1.5"><Icon name="lock" size={12} stroke={2.6} />RÉSERVÉ AU PROPRIÉTAIRE</span></GroupTitle>
        <div className="rounded-[18px] px-3" style={{ background: "#EEF0F4" }}>
          {["Tarifs & forfaits", "Chambres & numéros", "Personnel & accès", "Licence"].map((t, i, a) => <Row key={t} title={t} locked last={i === a.length - 1} onClick={() => {}} />)}
        </div>
      </div>
    );
  }
  return (
    <div>
      <TopBar title="Réglages" sub="Configuration de l'hôtel" right={<span className="h-[30px] px-2.5 rounded-[10px] text-[11.5px] font-extrabold flex items-center gap-1.5" style={{ background: H.goldSoft, color: "#8A5A0B" }}><Icon name="lock" size={13} stroke={2.4} />Propriétaire</span>} />
      <div className="mt-3 rounded-[20px] px-3.5 py-3 flex items-center gap-3 text-white" style={{ background: H.navy }}>
        <span onClick={tapIcon} className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center shrink-0 select-none" style={{ background: H.gold }}><Icon name="bed" size={21} color={H.navy} /></span>
        <span className="flex-1 min-w-0"><span className="block text-[15px] font-extrabold truncate">{shop?.name}</span><span className="block text-[12px]" style={{ color: "#B8C4D6" }}>{rooms.length} chambre{rooms.length > 1 ? "s" : ""} · {ctx.staffCount ? `${ctx.staffCount} membre${ctx.staffCount > 1 ? "s" : ""} d'équipe` : "aucun membre d'équipe"}</span></span>
        <button type="button" onClick={() => go("licence")} className="gb-focus h-8 px-2.5 rounded-[10px] text-[11.5px] font-extrabold" style={{ background: "rgba(34,211,238,0.18)", color: "#F0C060" }}>{licTxt}</button>
      </div>
      {editorBlock}
      <GroupTitle>GESTION</GroupTitle>
      <Card className="px-3">
        <Row icon="money" tint={H.redSoft} ink={H.red} title="Dépenses" sub="Déduites de la recette du jour" value={`−${fmt(todayExp)}`} valueInk={H.red} onClick={() => go("expenses")} />
        <Row icon="users" tint="#E7EEFD" ink="#2457B8" title="Personnel & accès" sub="Réception, technicien de surface, blocage" onClick={() => go("staff")} />
        <Row icon="key" tint={H.goldSoft} ink={H.goldDark} title="Licence" sub={license?.planId === "trial" ? "Essai gratuit de 14 jours" : "Durée, activation, commande"} value={licTxt} valueInk={H.goldDark} last onClick={() => go("licence")} />
      </Card>
      <GroupTitle>HÔTEL</GroupTitle>
      <Card className="px-3">
        <Row icon="tag" tint={H.orangeSoft} ink={H.orange} title="Tarifs & forfaits" sub={`Heures, prix · nuitée jusqu'à ${settings.checkoutTime}`} value={String(tariffs.filter((t) => t.active !== false).length)} onClick={() => go("tarifs")} />
        <Row icon="hash" tint="#E2F5F2" ink="#0B7A6E" title="Chambres & numéros" sub="Ventilées et climatisées" value={String(rooms.length)} onClick={() => go("roomsConfig")} />
        <Row icon="receipt" tint="#F5F3FF" ink="#6D28D9" title="Logo et reçus" sub={settings.receipt.logo ? "Logo personnalisé · en-tête, message" : "Logo par défaut · ajoutez le vôtre"} onClick={() => go("receiptSettings")} />
        <Row icon="sync" tint={H.greenSoft} ink={H.green} title="Synchronisation" sub={`Automatique toutes les ${settings.syncMinutes} min`} value={syncTxt} valueInk={sync?.pending > 0 ? H.orange : H.green} last onClick={() => go("sync")} />
      </Card>
      <div className="mt-4 mb-1.5 px-1 flex items-center gap-2"><span className="flex-1 text-[11.5px] font-extrabold tracking-[0.06em]" style={{ color: H.muted }}>RAPPORTS ET FINANCES</span><span className="h-[22px] px-2 rounded-[7px] text-[10.5px] font-extrabold flex items-center gap-1" style={{ background: H.goldSoft, color: H.goldDark }}><Icon name="lock" size={11} stroke={2.6} />Propriétaire uniquement</span></div>
      <div className="flex flex-col gap-2.5">
        {[
          ["history", "Historique", "Ventes, séjours, réservations, dépenses et annulations, par date", "history", "linear-gradient(135deg,#1B3361,#0A1730)", "rgba(14,28,51,0.8)"],
          ["inventory", "Inventaire", "Chambres occupées, heures vendues, taux d'occupation, par chambre", "clipboard", "linear-gradient(135deg,#14B8A6,#0B7A6E)", "rgba(11,122,110,0.8)"],
          ["profits", "Bénéfices", "Recettes − dépenses : mensuel, trimestriel, semestriel, annuel", "trend", "linear-gradient(135deg,#F0C463,#0891B2)", "rgba(8,145,178,0.8)"],
        ].map(([id, t, sub, ic, grad, sh]) => (
          <button key={id} type="button" onClick={() => go(id)} className="gb-focus relative overflow-hidden w-full text-left rounded-[22px] p-3.5 flex items-center gap-3 text-white" style={{ background: grad, boxShadow: `0 12px 24px -14px ${sh}` }}>
            <span className="absolute rounded-full" style={{ right: -30, top: -30, width: 110, height: 110, background: "rgba(255,255,255,0.10)" }} />
            <span className="w-12 h-12 rounded-[15px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}><Icon name={ic} size={24} stroke={2.2} /></span>
            <span className="relative flex-1 min-w-0"><span className="block text-[16px] font-extrabold">{t}</span><span className="block text-[11.5px] font-semibold leading-snug" style={{ opacity: 0.88 }}>{sub}</span></span>
            <Icon name="chev" size={18} stroke={2.4} />
          </button>
        ))}
      </div>
      <GroupTitle>RÈGLES AUTOMATIQUES</GroupTitle>
      <Card className="px-3">
        <div className="min-h-[54px] flex items-center gap-3" style={{ borderBottom: `1px solid ${H.line2}` }}><span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">Ménage obligatoire</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Après chaque départ, avant de relouer</span></span><Toggle on={settings.cleaningRequired} onChange={(v) => setS({ cleaningRequired: v })} label="Ménage obligatoire" /></div>
        <div className="min-h-[54px] flex items-center gap-3" style={{ borderBottom: `1px solid ${H.line2}` }}><span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">Rappels vocaux et écrits</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Fin de séjour · réservations {settings.reminderHours.join(" h et ")} h avant</span></span><Toggle on={settings.voiceAlerts} onChange={(v) => setS({ voiceAlerts: v })} label="Rappels vocaux" /></div>
      </Card>
      <GroupTitle>ANNONCE QUAND UNE CHAMBRE EST LIBÉRÉE</GroupTitle>
      <Card className="px-3">
        <div className="flex items-start gap-2.5 py-3" style={{ borderBottom: `1px solid ${H.line2}` }}>
          <span className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: H.violetSoft, color: H.violet }}><Icon name="broom" size={18} /></span>
          <span className="flex-1 min-w-0 text-[12.5px] font-bold leading-snug" style={{ color: "#334155" }}>« {releaseMessage("4", settings.cleaningRequired)} »<span className="block mt-0.5 text-[11px] font-semibold" style={{ color: H.muted }}>Annoncé sur tous les téléphones de l'hôtel (réception et ménage) dès que la chambre est libérée.</span></span>
        </div>
        <div className="min-h-[54px] flex items-center gap-3" style={{ borderBottom: `1px solid ${H.line2}` }}><span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">Notification écrite</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Message affiché sur le téléphone</span></span><Toggle on={settings.releaseNotify} onChange={(v) => setS({ releaseNotify: v })} label="Notification écrite à la libération" /></div>
        <div className="min-h-[54px] flex items-center gap-3" style={{ borderBottom: `1px solid ${H.line2}` }}><span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">Annonce vocale</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Le téléphone prononce le numéro de la chambre</span></span><Toggle on={settings.releaseVoice} onChange={(v) => setS({ releaseVoice: v })} label="Annonce vocale à la libération" /></div>
        <div className="py-3"><Btn kind="ghost" full onClick={() => ctx.announceRelease?.("4")} className="!min-h-[46px] !text-[13.5px] whitespace-nowrap"><Icon name="speaker" size={18} />Tester l'annonce</Btn></div>
      </Card>
      <Card className="mt-3 px-3">
        <Row icon="logout" tint="#F1F3F6" ink="#334155" title="Se déconnecter" last onClick={onLogout} />
      </Card>
    </div>
  );
}

// ---------- Tarifs & forfaits ----------
export function TarifsScreen({ ctx, onBack, onEdit }) {
  const { tariffs, settings, save, shop, fmt } = ctx;
  const [type, setType] = useState("vent");
  const T = roomTypeOf(type);
  const unit = Number(settings.unitPrice[type]) || 0;
  const setS = (patch) => save.shopMeta({ ...shop, hotelSettings: { ...settings, ...patch } });
  const list = tariffs.filter((t) => t.type === type).sort((a, b) => (Number(a.hours) || 99) - (Number(b.hours) || 99));
  const nightRef = list.find((t) => isNight(t));
  const flip = (t) => save.tariffs(tariffs.map((x) => (x.id === t.id ? { ...x, active: x.active === false, updatedAt: new Date().toISOString() } : x)));
  const { h, m } = parseHM(settings.checkoutTime);
  const shiftCheckout = (d) => { const total = Math.min(18 * 60, Math.max(8 * 60, h * 60 + m + d)); setS({ checkoutTime: `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}` }); };
  return (
    <div>
      <TopBar title="Tarifs & forfaits" sub="Vous fixez librement heures et prix" onBack={onBack} />
      <div className="mt-3"><Segmented value={type} onChange={setType} options={[{ id: "vent", label: "Ventilée", color: ROOM_TYPES.vent.ink }, { id: "clim", label: "Climatisée", color: ROOM_TYPES.clim.ink }]} /></div>
      <div className="mt-3 rounded-[18px] p-3" style={{ background: T.tint }}>
        <p className="text-[12px] font-extrabold" style={{ color: T.ink }}>Prix de l'heure ({T.label.toLowerCase()})</p>
        <p className="text-[11.5px] mb-2" style={{ color: "#475569" }}>Sert aux prolongations (+1 h) et au calcul des remises</p>
        <Stepper value={fmt(unit)} onMinus={() => setS({ unitPrice: { ...settings.unitPrice, [type]: Math.max(0, unit - 500) } })} onPlus={() => setS({ unitPrice: { ...settings.unitPrice, [type]: unit + 500 } })} />
      </div>
      <Label right={<span className="text-[12px]" style={{ color: H.muted }}>{list.filter((t) => t.active !== false).length} actifs</span>}>Forfaits proposés à la réception</Label>
      <div className="flex flex-col gap-2">
        {list.length === 0 && <Empty icon="tag" title="Aucun forfait" text="Créez votre premier forfait." />}
        {list.map((t) => {
          const off = t.active === false;
          const hrs = Number(t.hours) || 0;
          let tag, tagBg, tagInk, detail;
          if (!hrs) { tag = "Arrivée libre"; tagBg = "#EEF0FF"; tagInk = "#3B3FB6"; detail = `Jusqu'au lendemain ${settings.checkoutTime}`; }
          else {
            const normal = unit * hrs; const pct = normal ? Math.round((1 - (Number(t.price) || 0) / normal) * 100) : 0;
            detail = hrs === 1 ? "1 heure" : `${hrs} heures · soit ${fmt(Math.round((Number(t.price) || 0) / hrs))} / h`;
            if (pct > 0) { tag = `−${pct} %`; tagBg = H.greenSoft; tagInk = H.green; } else if (pct < 0) { tag = `+${-pct} %`; tagBg = H.orangeSoft; tagInk = H.orange; } else { tag = "Prix normal"; tagBg = "#F1F3F6"; tagInk = "#475569"; }
          }
          return (
            <div key={t.id} className="rounded-[18px] px-3 py-2.5 flex items-center gap-3" style={{ background: "#fff", boxShadow: H.shadow, opacity: off ? 0.55 : 1 }}>
              <button type="button" onClick={() => onEdit(t, type)} className="gb-focus flex-1 min-w-0 flex items-center gap-3 text-left">
                <span className="w-11 h-11 rounded-[14px] flex flex-col items-center justify-center shrink-0 font-extrabold leading-none" style={{ background: hrs ? T.tint : H.navy, color: hrs ? T.ink : H.gold }}><span className="text-[14px]">{hrs || "N"}</span><span className="text-[9px] mt-0.5">{hrs ? "H" : "NUIT"}</span></span>
                <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold truncate">{t.name}</span><span className="block text-[11.5px] truncate" style={{ color: H.muted }}>{detail}</span></span>
                <span className="text-right shrink-0"><span className="block text-[16px] font-extrabold">{fmt(Number(t.price) || 0)}</span><span className="inline-block text-[10.5px] font-extrabold rounded-[6px] px-1.5 py-0.5 mt-0.5" style={{ background: tagBg, color: tagInk }}>{tag}</span></span>
              </button>
              <Toggle on={!off} onChange={() => flip(t)} label={`Forfait ${t.name} proposé`} />
            </div>
          );
        })}
      </div>
      <Label>Nuitée</Label>
      <div className="rounded-[18px] p-3" style={{ background: "#fff", boxShadow: H.shadow }}>
        <p className="text-[12px] font-extrabold mb-2" style={{ color: "#475569" }}>Heure de départ le lendemain (toutes les chambres)</p>
        <Stepper value={settings.checkoutTime} sub="quelle que soit l'heure d'arrivée" onMinus={() => shiftCheckout(-30)} onPlus={() => shiftCheckout(30)} />
        {!nightRef && <p className="mt-2 text-[11.5px]" style={{ color: H.orange }}>Aucune nuitée {T.label.toLowerCase()} : créez un forfait « Nuitée ».</p>}
      </div>
      <Btn kind="gold" icon="plus" full className="mt-4 !min-h-[56px] !text-[16px]" onClick={() => onEdit(null, type)}>Nouveau forfait</Btn>
    </div>
  );
}

// ---------- Créer / modifier un forfait ----------
export function FormuleScreen({ ctx, onBack, tariff, type: type0 }) {
  const { tariffs, settings, save, fmt, pushToast } = ctx;
  const editing = !!tariff;
  const [type, setType] = useState(tariff?.type || type0 || "vent");
  const [mode, setMode] = useState(tariff ? (isNight(tariff) ? "n" : "h") : "h");
  const [hours, setHours] = useState(Number(tariff?.hours) || 2);
  const [price, setPrice] = useState(Number(tariff?.price) || (Number(settings.unitPrice[type0 || "vent"]) || 2000) * 2);
  const [active, setActive] = useState(tariff ? tariff.active !== false : true);
  const unitOf = (t) => Number(settings.unitPrice[t]) || 0;
  const refType = type === "both" ? "vent" : type;
  const unit = unitOf(refType);
  const nightRef = Number(tariffs.find((t) => t.type === refType && isNight(t) && t.id !== tariff?.id)?.price) || 0;
  const ref = mode === "n" ? nightRef : unit * hours;
  const pct = ref ? Math.round((1 - price / ref) * 100) : 0;
  const max = Math.max(ref, price, 1);
  const name = mode === "n" ? "Nuitée" : tariffName(hours);
  let tone;
  if (!ref) tone = { title: "Nouveau prix de référence", tag: "—", ink: "#2457B8", bg: "#EEF3FE", line: "#C7D7F8", text: mode === "n" ? "Première nuitée de ce type de chambre." : "Définissez d'abord le prix de l'heure." };
  else if (pct > 0) tone = { title: "Forfait avantageux pour le client", tag: `−${pct} %`, ink: H.green, bg: "#EEF9F2", line: "#C9EBD5", text: mode === "n" ? `Le client économise ${fmt(ref - price)} sur la nuitée.` : `Soit ${fmt(Math.round(price / hours))} / heure · le client économise ${fmt(ref - price)}.` };
  else if (pct < 0) tone = { title: "Plus cher que le prix normal", tag: `+${-pct} %`, ink: H.orange, bg: "#FFF7EE", line: "#F7C58A", text: mode === "n" ? `Supplément de ${fmt(price - ref)} sur la nuitée.` : `Soit ${fmt(Math.round(price / hours))} / heure · ${fmt(price - ref)} de plus.` };
  else tone = { title: "Prix normal", tag: "0 %", ink: "#2457B8", bg: "#EEF3FE", line: "#C7D7F8", text: mode === "n" ? "Même prix que la nuitée actuelle." : `Soit ${fmt(unit)} / heure, sans remise.` };
  const submit = () => {
    if (!(price > 0)) { pushToast("Indiquez un prix", "error"); return; }
    const at = new Date().toISOString();
    const base = { name, hours: mode === "n" ? 0 : hours, price, active, updatedAt: at };
    if (editing) save.tariffs(tariffs.map((t) => (t.id === tariff.id ? { ...t, ...base } : t)));
    else {
      const types = type === "both" ? ["vent", "clim"] : [type];
      save.tariffs([...tariffs, ...types.map((tp) => ({ id: rid(), type: tp, createdAt: at, ...base }))]);
    }
    pushToast(editing ? "Forfait modifié" : "Forfait créé", "ok");
    onBack();
  };
  const del = () => { if (!window.confirm(`Supprimer le forfait « ${tariff.name} » ?`)) return; save.tariffs(tariffs.filter((t) => t.id !== tariff.id)); pushToast("Forfait supprimé", "ok"); onBack(); };
  return (
    <div>
      <TopBar title={editing ? "Modifier le forfait" : "Nouveau forfait"} sub={<>Nom affiché : <b style={{ color: H.ink }}>{name}</b></>} onBack={onBack} />
      <Label>Pour quelles chambres ?</Label>
      <div className="grid grid-cols-3 gap-2">
        {[["vent", "Ventilée", ROOM_TYPES.vent.ink], ["clim", "Climatisée", ROOM_TYPES.clim.ink], ["both", "Les deux", H.navy]].map(([id, l, c]) => (editing && id === "both") ? null : <Chip key={id} on={type === id} color={c} onClick={() => !editing && setType(id)} disabled={editing && type !== id}>{l}</Chip>)}
      </div>
      <Label>Type de forfait</Label>
      <Segmented value={mode} onChange={setMode} options={[{ id: "h", label: "Durée en heures" }, { id: "n", label: "Nuitée (heure fixe)" }]} />
      <Label>{mode === "n" ? "Départ le lendemain à" : "Durée"}</Label>
      {mode === "n"
        ? <Stepper value={settings.checkoutTime} sub="réglable dans Tarifs › Nuitée" onMinus={() => {}} onPlus={() => {}} />
        : <Stepper value={`${hours} heure${hours > 1 ? "s" : ""}`} sub="fin calculée automatiquement" onMinus={() => setHours((x) => Math.max(1, x - 1))} onPlus={() => setHours((x) => Math.min(24, x + 1))} />}
      <Label>Prix du forfait</Label>
      <div className="flex items-center gap-1.5 rounded-[18px] p-2" style={{ background: "#fff", boxShadow: H.shadow }}>
        <button type="button" onClick={() => setPrice((p) => Math.max(0, p - 500))} className="gb-focus w-[60px] h-12 rounded-[14px] text-[13.5px] font-extrabold shrink-0" style={{ background: "#F1F3F6", color: H.navy }}>−500</button>
        <input aria-label="Prix du forfait" inputMode="numeric" value={String(price)} onChange={(e) => setPrice(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))} className="flex-1 min-w-0 text-center text-[26px] font-extrabold bg-transparent outline-none" style={{ color: H.navy }} />
        <button type="button" onClick={() => setPrice((p) => p + 500)} className="gb-focus w-[60px] h-12 rounded-[14px] text-[13.5px] font-extrabold shrink-0" style={{ background: "#F1F3F6", color: H.navy }}>+500</button>
      </div>
      <div className="mt-3 rounded-[18px] p-3.5" style={{ background: tone.bg, border: `1.5px solid ${tone.line}` }}>
        <div className="flex items-center justify-between gap-2"><span className="text-[12.5px] font-extrabold" style={{ color: tone.ink }}>{tone.title}</span><span className="text-[12px] font-extrabold text-white rounded-[8px] px-2 py-0.5" style={{ background: tone.ink }}>{tone.tag}</span></div>
        {ref > 0 && (
          <div className="mt-2.5 flex flex-col gap-1.5 text-[12px]" style={{ color: H.ink2 }}>
            <div className="flex items-center gap-2"><span className="w-[96px] shrink-0">{mode === "n" ? "Nuitée actuelle" : `${hours} × ${fmt(unit)}`}</span><span className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: H.line }}><span className="block h-2.5 rounded-full" style={{ width: `${Math.round((ref / max) * 100)}%`, background: "#94A3B8" }} /></span><b className="w-[72px] text-right">{fmt(ref)}</b></div>
            <div className="flex items-center gap-2"><span className="w-[96px] shrink-0">Votre prix</span><span className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: H.line }}><span className="block h-2.5 rounded-full" style={{ width: `${Math.round((price / max) * 100)}%`, background: tone.ink }} /></span><b className="w-[72px] text-right">{fmt(price)}</b></div>
          </div>
        )}
        <p className="mt-2 text-[12.5px] font-bold" style={{ color: tone.ink }}>{tone.text}</p>
      </div>
      <div className="mt-3 rounded-[18px] px-3.5 min-h-[56px] flex items-center gap-3" style={{ background: "#fff", boxShadow: H.shadow }}>
        <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Proposé à la réception</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Visible dans « Louer » et les réservations</span></span>
        <Toggle on={active} onChange={setActive} label="Proposé à la réception" />
      </div>
      <div className="mt-4 flex gap-2">
        {editing && <Btn kind="danger" onClick={del}>Supprimer</Btn>}
        <Btn kind="gold" full className="flex-1 !min-h-[56px] !text-[16px]" onClick={submit}>Enregistrer</Btn>
      </div>
    </div>
  );
}

// ---------- Numéros de chambre ----------
export function RoomsConfigScreen({ ctx, onBack }) {
  const { rooms, stays, reservations, save, pushToast } = ctx;
  const [type, setType] = useState("vent");
  const nums = rooms.map((r) => Number(r.num)).filter((n) => Number.isFinite(n));
  const sameType = rooms.filter((r) => r.type === type).map((r) => Number(r.num)).filter(Number.isFinite);
  // Numéro proposé : à la suite du même type, sinon la centaine suivante
  // (ex. ventilées 101-112 → climatisées à partir de 201).
  const next = sameType.length ? Math.max(...sameType) + 1 : nums.length ? Math.floor(Math.max(...nums) / 100) * 100 + 101 : (type === "clim" ? 201 : 101);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const f = from ?? next;
  const t = Math.max(f, to ?? f);
  const [edit, setEdit] = useState(null);
  const [editNum, setEditNum] = useState("");
  const preview = useMemo(() => addRoomRange(rooms, type, f, t), [rooms, type, f, t]);
  const add = () => {
    if (!preview.added.length) return;
    save.rooms(preview.rooms);
    pushToast(`${preview.added.length} chambre${preview.added.length > 1 ? "s" : ""} ajoutée${preview.added.length > 1 ? "s" : ""}`, "ok");
    setFrom(null); setTo(null);
  };
  const busy = (r) => stays.some((s) => isActiveStay(s) && s.roomId === r.id) || reservations.some((x) => isLiveResa(x) && x.roomId === r.id && toMs(x.end) > Date.now());
  const saveEdit = (patch) => { save.rooms(rooms.map((r) => (r.id === edit.id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r))); setEdit(null); pushToast("Chambre mise à jour", "ok"); };
  return (
    <div>
      <TopBar title="Chambres de l'hôtel" sub={`${rooms.length} chambre${rooms.length > 1 ? "s" : ""} enregistrée${rooms.length > 1 ? "s" : ""}`} onBack={onBack} />
      <Card className="mt-3 p-3.5">
        <p className="text-[14px] font-extrabold">Ajouter des chambres</p>
        <p className="text-[11.5px]" style={{ color: H.muted }}>Une seule (même numéro deux fois) ou une série d'un coup</p>
        <div className="mt-2.5"><Segmented small value={type} onChange={(x) => { setType(x); setFrom(null); setTo(null); }} options={[{ id: "vent", label: "Ventilée", color: ROOM_TYPES.vent.ink }, { id: "clim", label: "Climatisée", color: ROOM_TYPES.clim.ink }]} /></div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Field label="Du numéro"><Stepper value={f} onMinus={() => { setFrom(Math.max(1, f - 1)); setTo(t); }} onPlus={() => { setFrom(f + 1); setTo(Math.max(t, f + 1)); }} /></Field>
          <Field label="Au numéro"><Stepper value={t} onMinus={() => { setFrom(f); setTo(Math.max(f, t - 1)); }} onPlus={() => { setFrom(f); setTo(t + 1); }} /></Field>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <p className="flex-1 text-[12px] font-semibold" style={{ color: H.ink2 }}>{preview.skipped.length ? `Déjà existantes : ${preview.skipped.join(", ")}. ` : ""}{preview.added.length ? `${preview.added.length} à ajouter : ${preview.added.map((r) => r.num).join(", ")}` : "Rien à ajouter"}</p>
          <Btn kind="navy" onClick={add} disabled={!preview.added.length} style={{ background: roomTypeOf(type).ink }}>Ajouter</Btn>
        </div>
      </Card>
      {["vent", "clim"].map((tp) => {
        const list = sortRooms(rooms).filter((r) => r.type === tp);
        const T = roomTypeOf(tp);
        return (
          <div key={tp}>
            <div className="mt-4 mb-2 flex items-center gap-2"><span className="text-[14px] font-extrabold" style={{ color: T.ink }}>{T.plural}</span><span className="text-[12px] font-extrabold rounded-[8px] px-2" style={{ color: T.ink, background: T.tint }}>{list.length}</span><span className="flex-1 h-px" style={{ background: H.line }} /></div>
            {list.length === 0 ? <p className="text-[12px] px-1" style={{ color: H.muted }}>Aucune chambre {T.label.toLowerCase()}.</p> : (
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                {list.map((r) => <button key={r.id} type="button" onClick={() => { setEdit(r); setEditNum(r.num); }} aria-label={`Modifier la chambre ${r.num}`} className="gb-focus h-10 rounded-[11px] text-[13px] font-extrabold" style={{ background: r.outOfService ? "#F1F3F6" : "#fff", border: `1.5px solid ${r.outOfService ? "#E8EBF0" : H.line}`, color: r.outOfService ? "#A0AABA" : H.ink, textDecoration: r.outOfService ? "line-through" : "none" }}>{r.num}</button>)}
              </div>
            )}
          </div>
        );
      })}
      <p className="mt-3 text-[11.5px] px-1" style={{ color: H.muted }}>Touchez un numéro pour le renommer, changer son type ou le mettre hors service.</p>
      {edit && (
        <Sheet title={`Chambre ${edit.num}`} onClose={() => setEdit(null)}>
          <Field label="Numéro"><input value={editNum} onChange={(e) => setEditNum(e.target.value.slice(0, 8))} style={inputStyle} /></Field>
          <div className="mt-3"><Segmented value={edit.type} onChange={(x) => setEdit({ ...edit, type: x })} options={[{ id: "vent", label: "Ventilée", color: ROOM_TYPES.vent.ink }, { id: "clim", label: "Climatisée", color: ROOM_TYPES.clim.ink }]} /></div>
          <div className="mt-3 rounded-[16px] px-3.5 min-h-[54px] flex items-center gap-3" style={{ background: "#fff" }}><span className="flex-1 text-[13.5px] font-extrabold">Hors service</span><Toggle on={!!edit.outOfService} onChange={(v) => setEdit({ ...edit, outOfService: v })} label="Hors service" /></div>
          <div className="mt-3 flex gap-2">
            <Btn kind="danger" onClick={() => { if (busy(edit)) { pushToast("Chambre occupée ou réservée : impossible de la supprimer", "error"); return; } if (!window.confirm(`Supprimer la chambre ${edit.num} ?`)) return; save.rooms(rooms.filter((r) => r.id !== edit.id)); setEdit(null); }}>Supprimer</Btn>
            <Btn kind="navy" full className="flex-1" onClick={() => { const n = editNum.trim(); if (!n) return; if (rooms.some((r) => r.id !== edit.id && String(r.num).toLowerCase() === n.toLowerCase())) { pushToast("Ce numéro existe déjà", "error"); return; } saveEdit({ num: n, type: edit.type, outOfService: !!edit.outOfService }); }}>Enregistrer</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Synchronisation ----------
export function SyncScreen({ ctx, onBack }) {
  const { sync, now, settings } = ctx;
  const online = sync?.online !== false;
  const pending = sync?.pending || 0;
  const nextIn = sync?.nextAt ? Math.max(0, sync.nextAt - now) : null;
  const hero = !online
    ? { bg: "#B45309", title: "Hors connexion : l'appli marche normalement", sub: "Aucun réseau", text: `${pending} modification${pending > 1 ? "s" : ""} gardée${pending > 1 ? "s" : ""} sur ce téléphone. Envoi automatique dès que le réseau revient.` }
    : pending > 0
      ? { bg: "#2457B8", title: "Envoi des modifications…", sub: "En ligne", text: `${pending} élément${pending > 1 ? "s" : ""} en cours d'envoi au serveur.` }
      : { bg: "#15803D", title: "Tout est synchronisé", sub: sync?.lastAt ? `En ligne · dernière synchro à ${hmOf(sync.lastAt)}` : "En ligne", text: "Tous les téléphones de l'hôtel ont les mêmes données." };
  return (
    <div>
      <TopBar title="Synchronisation" sub="Avec ou sans internet, tout reste à jour" onBack={onBack} />
      <div className="mt-3 rounded-[24px] p-4 text-white" style={{ background: hero.bg }}>
        <div className="flex items-center gap-3"><span className="w-[46px] h-[46px] rounded-[15px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}><Icon name="sync" size={24} color="#fff" /></span><span><span className="block text-[17px] font-extrabold leading-tight">{hero.title}</span><span className="block text-[12px] opacity-90">{hero.sub}</span></span></div>
        <p className="mt-2.5 text-[12.5px] leading-relaxed opacity-95">{hero.text}</p>
      </div>
      <Card className="mt-3 px-3">
        <div className="min-h-[58px] flex items-center gap-3" style={{ borderBottom: `1px solid ${H.line2}` }}>
          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: H.greenSoft, color: H.green }}><Icon name="clock" size={16} /></span>
          <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold">Synchro automatique</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Toutes les {settings.syncMinutes} minutes{sync?.lastAt ? ` · dernière à ${hmOf(sync.lastAt)}` : ""}</span></span>
          <span className="text-right"><span className="block text-[10.5px] font-extrabold tracking-[0.04em]" style={{ color: H.muted }}>PROCHAINE</span><span className="block font-mono text-[15px] font-bold" style={{ color: H.green }}>{sync?.busy ? "…" : nextIn != null ? fmtClock(nextIn) : "—"}</span></span>
        </div>
        <div className="min-h-[54px] flex items-center gap-3" style={{ borderBottom: `1px solid ${H.line2}` }}>
          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "#E7EEFD", color: "#2457B8" }}><Icon name="sync" size={16} /></span>
          <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Chaque action envoyée aussitôt</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Les autres téléphones la reçoivent en quelques secondes</span></span>
          <b className="text-[12.5px]" style={{ color: pending ? H.orange : H.green }}>{pending ? `${pending} en attente` : "À jour"}</b>
        </div>
        <div className="min-h-[54px] flex items-center gap-3">
          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: H.navy, color: H.gold }}><Icon name="lock" size={16} /></span>
          <span className="flex-1"><span className="block text-[13.5px] font-extrabold">Données privées de l'hôtel</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Espace séparé, invisible des autres entreprises</span></span>
        </div>
      </Card>
      <Btn kind="navy" icon="sync" full className="mt-4 !min-h-[56px] !text-[15.5px]" disabled={sync?.busy} onClick={() => sync?.onSyncNow?.()} style={sync?.busy ? { background: H.green } : undefined}>{sync?.busy ? "Synchronisation en cours…" : "Synchroniser maintenant"}</Btn>
    </div>
  );
}

// ---------- Dépenses ----------
const EXP_CATS = ["Produits ménage", "Électricité", "Eau", "Bar / boissons", "Réparation", "Linge", "Salaire", "Autre"];
export function ExpensesScreen({ ctx, onBack }) {
  const { expenses = [], stays, reservations, now, fmt, save, by, isOwner, pushToast } = ctx;
  const [cat, setCat] = useState(EXP_CATS[0]);
  const [amount, setAmount] = useState(2000);
  const [note, setNote] = useState("");
  const cash = hotelCashForDay({ stays, expenses, reservations, now });
  const today = cash.dayExpenses.slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const add = () => {
    if (!(amount > 0)) return;
    const e = { id: rid(), label: note.trim() ? `${cat} · ${note.trim()}` : cat, category: cat, amount, date: localDayKey(), createdAt: new Date().toISOString(), author: by, supplierId: null };
    save.expenses([e, ...(expenses || [])]);
    setNote("");
    pushToast(`Dépense enregistrée : ${fmt(amount)}`, "ok");
  };
  const del = (e) => { if (!window.confirm(`Supprimer la dépense « ${e.label} » (${fmt(Number(e.amount) || 0)}) ?`)) return; save.expenses(expenses.filter((x) => x.id !== e.id)); };
  return (
    <div>
      <TopBar title="Dépenses" sub="Aujourd'hui · déduites de la recette" onBack={onBack} />
      <div className="mt-3 rounded-[22px] px-4 py-3.5 text-white" style={{ background: H.navy }}>
        <div className="grid grid-cols-2 gap-2.5"><span><span className="block text-[11.5px]" style={{ color: "#B8C4D6" }}>Encaissé du jour</span><span className="block text-[16px] font-extrabold">{fmt(cash.total)}</span></span><span><span className="block text-[11.5px]" style={{ color: "#B8C4D6" }}>Dépenses</span><span className="block text-[16px] font-extrabold" style={{ color: "#FCA5A5" }}>−{fmt(cash.expensesTotal)}</span></span></div>
        <div className="mt-2.5 pt-2.5 flex justify-between items-baseline" style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}><span className="text-[13px] font-bold" style={{ color: "#B8C4D6" }}>Net en caisse</span><span className="text-[26px] font-extrabold" style={{ color: H.gold }}>{fmt(cash.net)}</span></div>
      </div>
      <Card className="mt-3 p-3.5">
        <p className="text-[14px] font-extrabold">Nouvelle dépense</p>
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">{EXP_CATS.map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)} className="!px-1.5 !text-[12px]">{c}</Chip>)}</div>
        <div className="mt-2.5 flex items-center gap-1.5 rounded-[16px] p-1.5" style={{ border: `1.5px solid ${H.line}` }}>
          <button type="button" onClick={() => setAmount((a) => Math.max(0, a - 500))} aria-label="Moins 500" className="gb-focus w-11 h-11 rounded-[12px] text-[19px] font-extrabold" style={{ background: "#F1F3F6", color: H.navy }}>−</button>
          <input aria-label="Montant" inputMode="numeric" value={String(amount)} onChange={(e) => setAmount(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))} className="flex-1 min-w-0 text-center text-[20px] font-extrabold bg-transparent outline-none" />
          <button type="button" onClick={() => setAmount((a) => a + 500)} aria-label="Plus 500" className="gb-focus w-11 h-11 rounded-[12px] text-[19px] font-extrabold" style={{ background: "#F1F3F6", color: H.navy }}>+</button>
        </div>
        <input aria-label="Motif" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motif (optionnel) : ex. ampoules chambre 106" style={{ ...inputStyle, marginTop: 8, minHeight: 44, fontSize: 13.5 }} />
        <Btn kind="red" full className="mt-2.5" onClick={add} disabled={!(amount > 0)}>Enregistrer {fmt(amount)}</Btn>
      </Card>
      <Label right={<span className="text-[12px]" style={{ color: H.muted }}>{today.length} dépense{today.length > 1 ? "s" : ""}</span>}>Aujourd'hui</Label>
      {today.length === 0 ? <p className="text-[12.5px] px-1" style={{ color: H.muted }}>Aucune dépense aujourd'hui.</p> : (
        <Card className="px-3">
          {today.map((e, i) => (
            <div key={e.id} className="min-h-[56px] flex items-center gap-3" style={{ borderBottom: i === today.length - 1 ? "none" : `1px solid ${H.line2}` }}>
              <span className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[12px] font-extrabold shrink-0" style={{ background: H.redSoft, color: H.red }}>{String(e.category || e.label || "?")[0]}</span>
              <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{e.label}</span><span className="block text-[11.5px]" style={{ color: H.muted }}>{e.createdAt ? hmOf(toMs(e.createdAt)) : ""} · {e.author || "—"}</span></span>
              <b className="text-[14px] shrink-0" style={{ color: H.red }}>−{fmt(Number(e.amount) || 0)}</b>
              {(isOwner || e.author === by) && <button type="button" onClick={() => del(e)} aria-label="Supprimer la dépense" className="gb-focus w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ color: "#94A3B8" }}><Icon name="trash" size={16} /></button>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ---------- Personnel & accès ----------
const ROLE_INFO = {
  reception: { label: "Réception", short: "Réception", sub: "Locations, caisse, dépenses", ink: "#2457B8", tint: "#E7EEFD" },
  technicien: { label: "Technicien de surface", short: "Ménage", sub: "Technicien de surface · entretien", ink: "#5B3CC4", tint: "#F0EBFE" },
};
const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));
export function StaffScreen({ ctx, onBack, staffApi, renderInvites }) {
  const { pushToast } = ctx;
  const { vendors = [], saveVendors, buildVendor, isPinTaken } = staffApi || {};
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("reception");
  const freshPin = () => { for (let i = 0; i < 40; i += 1) { const p = randomPin(); if (!isPinTaken?.(p)) return p; } return randomPin(); };
  const [pin, setPin] = useState(freshPin);
  const [pinFor, setPinFor] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [invites, setInvites] = useState(false);
  const [shownPin, setShownPin] = useState(null);
  if (invites && renderInvites) return <div><TopBar title="Invitations & téléphones" sub="Connexion des réceptionnistes sur leur téléphone" onBack={() => setInvites(false)} /><div className="mt-3">{renderInvites()}</div></div>;
  const create = () => {
    const n = name.trim();
    if (!n) { pushToast("Indiquez le nom", "error"); return; }
    if (vendors.some((v) => String(v.name).trim().toLowerCase() === n.toLowerCase())) { pushToast("Ce nom existe déjà", "error"); return; }
    if (isPinTaken?.(pin)) { pushToast("Ce code est déjà utilisé, prenez-en un autre", "error"); return; }
    const v = buildVendor({ name: n, pin, phone: phone.trim(), hotelRole: role });
    saveVendors([...vendors, v]);
    setShownPin({ name: n, pin });
    setName(""); setPhone(""); setPin(freshPin());
    pushToast(`${n} ajouté(e)`, "ok");
  };
  const toggleBlock = (v) => { saveVendors(vendors.map((x) => (x.id === v.id ? { ...x, blocked: !x.blocked } : x))); pushToast(v.blocked ? `${v.name} débloqué(e)` : `${v.name} bloqué(e)`, "ok"); };
  const changePin = () => {
    if (!/^\d{4}$/.test(newPin)) { pushToast("Code à 4 chiffres", "error"); return; }
    if (isPinTaken?.(newPin, pinFor.id)) { pushToast("Ce code est déjà utilisé", "error"); return; }
    saveVendors(vendors.map((x) => (x.id === pinFor.id ? buildVendor({ name: x.name, pin: newPin, phone: x.phone || "", hotelRole: x.hotelRole || "reception", initial: x }) : x)));
    setShownPin({ name: pinFor.name, pin: newPin });
    setPinFor(null); pushToast("Nouveau code enregistré", "ok");
  };
  const del = (v) => { if (!window.confirm(`Supprimer l'accès de ${v.name} ?`)) return; saveVendors(vendors.filter((x) => x.id !== v.id)); setPinFor(null); };
  const blocked = vendors.filter((v) => v.blocked).length;
  return (
    <div>
      <TopBar title="Personnel & accès" sub="Accès par nom + code PIN à 4 chiffres" onBack={onBack} />
      {renderInvites && (
        <button type="button" onClick={() => setInvites(true)} className="gb-focus mt-3 w-full rounded-[18px] px-3.5 py-3 flex items-center gap-3 text-left text-white" style={{ background: H.navy }}>
          <span className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}><Icon name="phone" size={18} color={H.gold} /></span>
          <span className="flex-1"><span className="block text-[14px] font-extrabold">Invitations & téléphones</span><span className="block text-[11.5px]" style={{ color: "#B8C4D6" }}>Connecter un réceptionniste sur son propre téléphone</span></span>
          <Icon name="chev" size={16} color="#B8C4D6" />
        </button>
      )}
      <Label right={<span className="text-[12px]" style={{ color: H.muted }}>{vendors.length - blocked} actif{vendors.length - blocked > 1 ? "s" : ""} · {blocked} bloqué{blocked > 1 ? "s" : ""}</span>}>Équipe</Label>
      {vendors.length === 0 ? <p className="text-[12.5px] px-1" style={{ color: H.muted }}>Aucun membre pour l'instant.</p> : (
        <Card className="px-3">
          {vendors.map((v, i) => {
            const R = ROLE_INFO[v.hotelRole] || ROLE_INFO.reception;
            return (
              <div key={v.id} className="min-h-[64px] flex items-center gap-2.5" style={{ borderBottom: i === vendors.length - 1 ? "none" : `1px solid ${H.line2}` }}>
                <span className="w-10 h-10 rounded-[13px] flex items-center justify-center text-[15px] font-extrabold shrink-0" style={{ background: R.tint, color: R.ink, opacity: v.blocked ? 0.55 : 1 }}>{String(v.name || "?")[0].toUpperCase()}</span>
                <span className="flex-1 min-w-0" style={{ opacity: v.blocked ? 0.55 : 1 }}>
                  <span className="flex items-center gap-1.5 min-w-0"><span className="text-[14px] font-extrabold truncate">{v.name}</span><span className="text-[10px] font-extrabold rounded-[6px] px-1.5 py-[1px] whitespace-nowrap" style={v.blocked ? { background: H.redSoft, color: H.red } : { background: R.tint, color: R.ink }}>{v.blocked ? "Bloqué" : R.short}</span></span>
                  <span className="block text-[11.5px] truncate" style={{ color: H.muted }}>{v.blocked ? "Accès bloqué · ne peut plus se connecter" : R.sub}</span>
                </span>
                <button type="button" onClick={() => { setPinFor(v); setNewPin(freshPin()); }} aria-label={`Code et options de ${v.name}`} className="gb-focus w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ border: `1.5px solid ${H.line}`, color: H.navy }}><Icon name="key" size={16} /></button>
                <button type="button" onClick={() => toggleBlock(v)} className="gb-focus h-9 w-[84px] rounded-[11px] text-[12px] font-extrabold shrink-0" style={v.blocked ? { background: H.green, color: "#fff" } : { background: "#fff", color: H.red, border: "1.5px solid #F5C2C2" }}>{v.blocked ? "Débloquer" : "Bloquer"}</button>
              </div>
            );
          })}
        </Card>
      )}
      <Card className="mt-3.5 p-3.5">
        <p className="text-[14px] font-extrabold">Créer un accès</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <input aria-label="Nom" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex : Awa)" style={inputStyle} />
          <input aria-label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Téléphone (option)" style={inputStyle} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {Object.entries(ROLE_INFO).map(([id, R]) => { const on = role === id; return <button key={id} type="button" onClick={() => setRole(id)} aria-pressed={on} className="gb-focus rounded-[13px] text-left px-2.5 py-2 min-h-[54px]" style={{ border: `1.5px solid ${on ? R.ink : H.line}`, background: on ? R.tint : "#fff" }}><span className="block text-[12.5px] font-extrabold" style={{ color: R.ink }}>{R.label}</span><span className="block text-[10.5px]" style={{ color: H.muted }}>{R.sub}</span></button>; })}
        </div>
        <div className="mt-2 flex items-center gap-2.5 rounded-[14px] pl-3 pr-2 py-2" style={{ background: "#F7F8FA" }}>
          <span className="flex-1"><span className="block text-[11.5px] font-bold" style={{ color: H.muted }}>Code PIN généré</span><span className="block font-mono text-[21px] font-bold tracking-[6px]">{pin}</span></span>
          <Btn kind="ghost" onClick={() => setPin(freshPin())} className="!min-h-[40px] !px-3 !text-[12.5px]">Autre code</Btn>
        </div>
        <Btn kind="gold" full className="mt-2.5" onClick={create}>Créer l'accès</Btn>
        <p className="mt-2 text-center text-[11px]" style={{ color: H.muted }}>Donnez le code PIN en main propre. Un accès bloqué ne peut plus se connecter.</p>
      </Card>
      {shownPin && (
        <Sheet title="Code à remettre" onClose={() => setShownPin(null)}>
          <p className="text-[13.5px]">Code PIN de <b>{shownPin.name}</b> :</p>
          <p className="my-3 text-center font-mono text-[38px] font-bold tracking-[12px]" style={{ color: H.navy }}>{shownPin.pin}</p>
          <p className="text-[12px]" style={{ color: H.muted }}>Notez-le et donnez-le en personne. Il ne sera plus affiché ensuite.</p>
          <Btn kind="navy" full className="mt-3" onClick={() => setShownPin(null)}>C'est noté</Btn>
        </Sheet>
      )}
      {pinFor && (
        <Sheet title={pinFor.name} onClose={() => setPinFor(null)}>
          <Field label="Nouveau code PIN (4 chiffres)"><input inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 22, letterSpacing: 8, textAlign: "center" }} /></Field>
          <div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(ROLE_INFO).map(([id, R]) => <Chip key={id} on={(pinFor.hotelRole || "reception") === id} color={R.ink} onClick={() => { saveVendors(vendors.map((x) => (x.id === pinFor.id ? { ...x, hotelRole: id } : x))); setPinFor({ ...pinFor, hotelRole: id }); }}>{R.label}</Chip>)}</div>
          <div className="mt-3 flex gap-2"><Btn kind="danger" onClick={() => del(pinFor)}>Supprimer</Btn><Btn kind="navy" full className="flex-1" onClick={changePin}>Changer le code</Btn></div>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Licence ----------
export function LicenceScreen({ ctx, onBack, license, licenseStatus, onActivate, pricing = [], onOrder }) {
  const { fmt } = ctx;
  const plans = pricing.filter((p) => p.price);
  const [sel, setSel] = useState(plans.find((p) => p.popular)?.id || plans[0]?.id);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const daysLeft = license?.expiresAt ? Math.ceil((new Date(license.expiresAt) - Date.now()) / DAY) : 0;
  const trial = license?.planId === "trial";
  const total = trial ? 14 : ({ "1m": 30, "3m": 90, "6m": 180, "12m": 365 }[license?.planId] || 30);
  let hero;
  if (license?.lifetime) hero = { bg: "#15803D", ring: "#fff", deg: 360, big: "∞", unit: "à vie", badge: "LICENCE PERMANENTE", title: "Licence à vie", sub: "Aucune échéance." };
  else if (licenseStatus === "expired" || !license) hero = { bg: "#B91C1C", ring: "#fff", deg: 0, big: "0", unit: "jour", badge: trial ? "ESSAI TERMINÉ" : "LICENCE EXPIRÉE", title: "Activez une licence", sub: "Vos données sont conservées. Activez une licence pour continuer." };
  else if (trial) hero = { bg: H.navy, ring: H.gold, deg: Math.round((Math.max(0, daysLeft) / 14) * 360), big: String(Math.max(0, daysLeft)), unit: daysLeft > 1 ? "jours" : "jour", badge: "ESSAI GRATUIT", title: `${Math.max(0, daysLeft)} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""} sur 14`, sub: `Fin de l'essai le ${new Date(license.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. Toutes les fonctions sont ouvertes.` };
  else hero = { bg: "#15803D", ring: "#fff", deg: Math.round((Math.min(total, Math.max(0, daysLeft)) / total) * 360), big: String(Math.max(0, daysLeft)), unit: "jours", badge: `LICENCE ACTIVE · ${(pricing.find((p) => p.id === license.planId)?.name || "").toUpperCase()}`, title: `Valable jusqu'au ${new Date(license.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`, sub: license.activatedAt ? `Activée le ${new Date(license.activatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : "" };
  const activate = async () => { if (!code.trim()) return; setBusy(true); const ok = await onActivate(code.trim()); setBusy(false); if (ok) setCode(""); };
  const cur = plans.find((p) => p.id === sel) || plans[0];
  return (
    <div>
      <TopBar title="Licence" sub={ctx.shop?.name} onBack={onBack} />
      <div className="mt-3 rounded-[24px] p-4 flex items-center gap-4 text-white" style={{ background: hero.bg }}>
        <span className="rounded-full flex items-center justify-center shrink-0" style={{ width: 92, height: 92, background: `conic-gradient(${hero.ring} 0 ${hero.deg}deg, rgba(255,255,255,0.16) 0)` }}><span className="rounded-full flex flex-col items-center justify-center" style={{ width: 76, height: 76, background: hero.bg }}><span className="text-[24px] font-extrabold leading-none">{hero.big}</span><span className="text-[10.5px] mt-0.5 opacity-85">{hero.unit}</span></span></span>
        <span className="flex-1 min-w-0"><span className="inline-block text-[11px] font-extrabold tracking-[0.06em] rounded-[7px] px-2 py-0.5" style={{ background: "rgba(255,255,255,0.16)" }}>{hero.badge}</span><span className="block text-[18px] font-extrabold leading-tight mt-1.5">{hero.title}</span><span className="block text-[12px] opacity-90 mt-0.5">{hero.sub}</span></span>
      </div>
      <Card className="mt-3 p-3.5">
        <p className="text-[14px] font-extrabold">Activer une licence</p>
        <p className="text-[11.5px]" style={{ color: H.muted }}>Saisissez le code reçu après l'achat</p>
        <div className="mt-2.5 flex gap-2">
          <input aria-label="Code de licence" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code de licence" style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 1.5 }} />
          <Btn kind="navy" onClick={activate} disabled={busy || !code.trim()}>{busy ? "…" : "Activer"}</Btn>
        </div>
      </Card>
      <Label right={<span className="text-[11.5px]" style={{ color: H.muted }}>Mobile Money ou carte</span>}>Choisir une licence</Label>
      <div className="flex flex-col gap-2">
        {plans.map((p) => { const on = p.id === sel; return (
          <button key={p.id} type="button" onClick={() => setSel(p.id)} aria-pressed={on} className="gb-focus rounded-[16px] min-h-[58px] px-3.5 flex items-center gap-3 text-left" style={{ background: on ? "#F0FBFE" : "#fff", border: on ? `2px solid ${H.gold}` : `1.5px solid ${H.line}` }}>
            <span className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center text-[11.5px] font-extrabold shrink-0" style={{ background: p.iconBg || H.goldSoft, color: p.iconColor || H.goldDark }}>{(p.duration || "").replace(" mois", "M")}</span>
            <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold">{p.name} {p.popular && <span className="text-[10px] font-extrabold rounded-[6px] px-1.5 py-[1px]" style={{ background: H.goldSoft, color: "#8A5A0B" }}>Populaire</span>}</span><span className="block text-[11.5px]" style={{ color: H.muted }}>{p.duration}</span></span>
            <span className="text-[16px] font-extrabold">{fmt(p.price)}</span>
          </button>
        ); })}
      </div>
      <Btn kind="gold" full className="mt-4 !min-h-[56px] !text-[16px]" onClick={() => onOrder(sel)} disabled={!cur}>Acheter une licence{cur ? ` · ${fmt(cur.price)}` : ""}</Btn>
      <p className="mt-2 text-center text-[11px]" style={{ color: H.muted }}>La commande part dans l'assistance ; le code arrive après paiement.</p>
    </div>
  );
}

// ---------- Commander une licence (message pré-rempli) ----------
const BIZ_TYPES = ["Hôtel", "Cyber café", "Cave", "Bar / Maquis", "Boutique", "Autre"];
export function OrderLicenceScreen({ ctx, onBack, pricing = [], planId, onSend }) {
  const { shop, fmt, pushToast } = ctx;
  const plans = pricing.filter((p) => p.price);
  const [name, setName] = useState(shop?.adminDisplayName || "");
  const [contact, setContact] = useState(shop?.invoicePhone || "");
  const [company, setCompany] = useState(shop?.name || "");
  const [kind, setKind] = useState(shop?.type === "cyber" ? "Cyber café" : "Hôtel");
  const [sel, setSel] = useState(planId || plans[0]?.id);
  const cur = plans.find((p) => p.id === sel) || plans[0];
  const send = () => {
    if (!name.trim() || !contact.trim() || !company.trim()) { pushToast("Nom, contact et entreprise sont nécessaires", "error"); return; }
    const msg = `Bonjour, je souhaite acheter la licence ${cur.name} (${cur.duration} · ${fmt(cur.price)}).\nEntreprise : ${company.trim()}\nType d'entreprise : ${kind}\nNom : ${name.trim()}\nContact : ${contact.trim()}`;
    onSend(msg, { name: name.trim(), phone: contact.trim() });
  };
  return (
    <div>
      <TopBar title="Commander une licence" sub="Votre demande part dans l'assistance" onBack={onBack} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label="Votre nom"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" style={inputStyle} /></Field>
        <Field label="Contact (WhatsApp)"><input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" placeholder="Téléphone" style={inputStyle} /></Field>
      </div>
      <div className="mt-2.5"><Field label="Nom de l'entreprise"><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nom de l'entreprise" style={inputStyle} /></Field></div>
      <Label>Type d'entreprise</Label>
      <div className="grid grid-cols-3 gap-1.5">{BIZ_TYPES.map((k) => <Chip key={k} on={kind === k} onClick={() => setKind(k)} className="!px-1">{k}</Chip>)}</div>
      <Label>Licence souhaitée</Label>
      <div className="grid grid-cols-2 gap-2">
        {plans.map((p) => { const on = p.id === sel; return (
          <button key={p.id} type="button" onClick={() => setSel(p.id)} aria-pressed={on} className="gb-focus relative rounded-[16px] min-h-[70px] px-3 py-2.5 text-left flex flex-col justify-between" style={{ background: on ? "#F0FBFE" : "#fff", border: on ? `2px solid ${H.gold}` : `1.5px solid ${H.line}` }}>
            <span className="text-[13.5px] font-extrabold pr-6">{p.name} <span className="text-[11.5px] font-semibold" style={{ color: H.muted }}>· {p.duration}</span></span>
            <span className="text-[16px] font-extrabold" style={{ color: p.iconColor || H.navy }}>{fmt(p.price)}</span>
            {on && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: H.gold }}><Icon name="check" size={12} color={H.navy} stroke={3.2} /></span>}
          </button>
        ); })}
      </div>
      <Btn kind="navy" full className="mt-4 !min-h-[56px] !text-[15.5px]" onClick={send} disabled={!cur}>Préparer le message · {cur?.name}</Btn>
      <p className="mt-2 text-center text-[11px]" style={{ color: H.muted }}>La discussion s'ouvre avec votre message déjà rempli : vérifiez-le puis envoyez.</p>
    </div>
  );
}

// ---------- Nouvelle réservation ----------
export function NewResaScreen({ ctx, onBack, preset, onSaved }) {
  const { rooms, tariffs, stays, reservations, now, fmt, actions, settings, by, pushToast } = ctx;
  const [d0] = dayBounds(now);
  const firstDay = preset?.dayStart ? Math.round((preset.dayStart - d0) / DAY) : 0;
  const [day, setDay] = useState(Math.max(0, firstDay));
  const nextHalf = (() => { const d = new Date(now + 60 * 60000); return d.getHours() * 60 + (d.getMinutes() < 30 ? 30 : 60); })();
  const [mins, setMins] = useState(Math.min(23 * 60 + 30, firstDay > 0 ? 19 * 60 : nextHalf));
  const [type, setType] = useState(rooms.some((r) => r.type === "vent") ? "vent" : "clim");
  const [tariffId, setTariffId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [rem, setRem] = useState({ r5: true, r2: true });
  const [deposit, setDeposit] = useState(0);
  const [depMode, setDepMode] = useState("cash");
  const [depOp, setDepOp] = useState(DEFAULT_MOMO);
  const days = Array.from({ length: 14 }, (_, i) => d0 + i * DAY);
  const start = days[day] + mins * 60000;
  const list = tariffs.filter((t) => t.type === type && t.active !== false).sort((a, b) => (Number(a.hours) || 99) - (Number(b.hours) || 99));
  const tariff = list.find((t) => t.id === tariffId) || list.find(isNight) || list[0] || null;
  const end = tariff ? computeEnd(start, tariff, settings) : start;
  const all = sortRooms(rooms).filter((r) => r.type === type);
  const busyOf = (r) => { if (r.outOfService) return "hors service"; const c = roomConflicts(r.id, start, end, { stays, reservations, now }); if (!c.length) return null; return c[0].kind === "resa" ? `réservée ${hmOf(c[0].start)}` : "occupée"; };
  const freeList = all.filter((r) => !busyOf(r));
  const room = freeList.find((r) => r.id === roomId) || freeList[0] || null;
  const wd = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const price = Number(tariff?.price) || 0;
  const submit = () => {
    if (start < now - 5 * 60000) { pushToast("Choisissez une heure à venir", "error"); return; }
    if (!client.trim() || String(phone).replace(/\D/g, "").length < 8) { pushToast("Indiquez le nom et le numéro de la personne qui réserve", "error"); return; }
    if (!tariff || !room) return;
    const at = new Date().toISOString();
    const resa = {
      id: rid(), roomId: room.id, roomNum: room.num, type, tariffId: tariff.id, tariffName: tariff.name, hours: Number(tariff.hours) || 0, price,
      start, end, client: client.trim(), phone: phone.trim(), deposit: Math.min(deposit, price), depositMode: depMode, depositOp: depMode === "momo" ? depOp : "", depositAt: deposit > 0 ? Date.now() : null,
      reminders: { r5: rem.r5, r2: rem.r2 }, notified: {}, status: "confirmed", by, createdAt: at, updatedAt: at,
    };
    if (roomConflicts(resa.roomId, start, end, { stays, reservations, now }).length) { pushToast("Cette chambre n'est pas libre sur ce créneau", "error"); return; }
    // Fiche du client obligatoire avant d'enregistrer la réservation.
    // Réservation : seulement le nom et le contact de la personne qui réserve.
    // La fiche complète du client et sa pièce d'identité sont demandées à
    // l'arrivée, avant d'occuper la chambre et de payer.
    const res = actions.saveReservation(resa);
    if (res) { if (onSaved) onSaved(res); else onBack(); }
  };
  return (
    <div>
      <TopBar title="Nouvelle réservation" sub="La chambre est bloquée automatiquement" onBack={onBack} />
      <Label>Personne qui réserve</Label>
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Nom de la personne qui réserve" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nom et prénom *" style={inputStyle} />
        <input aria-label="Contact de la personne qui réserve" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Téléphone *" style={inputStyle} />
      </div>
      <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug" style={{ color: H.muted }}><Icon name="shield" size={14} style={{ flexShrink: 0, marginTop: 1 }} />La fiche du client et la photo de sa pièce d'identité seront demandées à son arrivée, avant d'occuper la chambre et de payer.</p>
      <Label>Date d'arrivée</Label>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {days.map((d, i) => { const on = i === day; return <button key={d} type="button" onClick={() => setDay(i)} aria-pressed={on} className="gb-focus shrink-0 rounded-[13px] flex flex-col items-center justify-center" style={{ width: 48, height: 54, background: on ? H.indigo : "#fff", color: on ? "#fff" : H.ink, border: `1.5px solid ${on ? H.indigo : H.line}` }}><span className="text-[10px] font-bold opacity-80">{i === 0 ? "Auj." : wd[new Date(d).getDay()]}</span><span className="text-[16px] font-extrabold">{new Date(d).getDate()}</span></button>; })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label="Heure d'arrivée"><div className="flex items-center rounded-[14px] px-1" style={{ height: 48, border: `1.5px solid ${H.line}`, background: "#fff" }}><button type="button" aria-label="Plus tôt" onClick={() => setMins((m) => Math.max(0, m - 30))} className="gb-focus w-[38px] h-[38px] rounded-[11px] text-[18px] font-extrabold" style={{ background: "#F1F3F6", color: H.navy }}>−</button><span className="flex-1 text-center text-[18px] font-extrabold">{pad2(Math.floor(mins / 60))}:{pad2(mins % 60)}</span><button type="button" aria-label="Plus tard" onClick={() => setMins((m) => Math.min(23 * 60 + 30, m + 30))} className="gb-focus w-[38px] h-[38px] rounded-[11px] text-[18px] font-extrabold" style={{ background: "#F1F3F6", color: H.navy }}>+</button></div></Field>
        <Field label="Type de chambre"><Segmented small value={type} onChange={(t) => { setType(t); setTariffId(null); setRoomId(null); }} options={[{ id: "vent", label: "Ventilée", color: ROOM_TYPES.vent.ink }, { id: "clim", label: "Climatisée", color: ROOM_TYPES.clim.ink }]} /></Field>
      </div>
      <Label>Forfait</Label>
      {list.length === 0 ? <p className="text-[12.5px]" style={{ color: H.orange }}>Aucun forfait actif pour ce type.</p> : (
        <div className="grid grid-cols-4 gap-1.5">
          {list.map((t) => { const on = tariff && t.id === tariff.id; return <button key={t.id} type="button" onClick={() => { setTariffId(t.id); setRoomId(null); }} aria-pressed={on} className="gb-focus rounded-[13px] min-h-[50px] flex flex-col items-center justify-center px-1" style={{ background: on ? roomTypeOf(type).soft : "#fff", border: on ? `2px solid ${H.navy}` : `1.5px solid ${H.line}` }}><span className="text-[12px] font-extrabold truncate max-w-full">{isNight(t) ? "Nuitée" : `${t.hours} h`}</span><span className="text-[11px] font-bold" style={{ color: roomTypeOf(type).ink }}>{fmt(Number(t.price) || 0)}</span></button>; })}
        </div>
      )}
      <Label right={<span className="text-[11.5px]" style={{ color: H.muted }}>grisées = prises sur ce créneau</span>}>Chambre</Label>
      {all.length === 0 ? <p className="text-[12.5px]" style={{ color: H.muted }}>Aucune chambre de ce type.</p> : (
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
          {all.map((r) => { const b = busyOf(r); const on = room && r.id === room.id; return <button key={r.id} type="button" disabled={!!b} onClick={() => setRoomId(r.id)} aria-label={b ? `Chambre ${r.num} : ${b}` : `Chambre ${r.num}`} className="gb-focus h-11 rounded-[12px] text-[13.5px] font-extrabold" style={{ background: b ? "#F1F3F6" : on ? roomTypeOf(type).ink : "#fff", color: b ? "#A0AABA" : on ? "#fff" : H.ink, border: `1.5px solid ${b ? "#E8EBF0" : on ? roomTypeOf(type).ink : H.line}`, textDecoration: b ? "line-through" : "none" }}>{r.num}</button>; })}
        </div>
      )}
      {room && tariff && (
        <div className="mt-3 rounded-[16px] px-3 py-2.5 flex items-center gap-2.5" style={{ background: H.indigoSoft }}>
          <Icon name="cal" size={20} color={H.indigo} />
          <p className="text-[12.5px] font-bold leading-snug" style={{ color: "#3730A3" }}>Chambre <b>{room.num}</b> bloquée {dayLabel(start, now)} de {hmOf(start)} {isNight(tariff) ? `au ${dayLabel(end, now) === "demain" ? "lendemain" : dayLabel(end, now)} à ${hmOf(end)}` : `jusqu'à ${hmOf(end)}`}.</p>
        </div>
      )}
      <Label>Rappels au gérant (vocal + écrit)</Label>
      <div className="grid grid-cols-2 gap-2">
        {settings.reminderHours.map((h) => { const k = `r${h}`; const on = rem[k] !== false; return <button key={k} type="button" onClick={() => setRem((x) => ({ ...x, [k]: !on }))} aria-pressed={on} className="gb-focus min-h-[44px] rounded-[13px] text-[12.5px] font-extrabold flex items-center justify-center gap-1.5" style={{ background: on ? H.indigoSoft : "#fff", color: on ? "#3730A3" : H.muted, border: `1.5px solid ${on ? "#C7CBFA" : H.line}` }}>{on && <Icon name="check" size={14} stroke={3} />}{h} h avant · {hmOf(start - h * HOUR)}</button>; })}
      </div>
      <Label right={<span className="text-[12px] font-extrabold">{fmt(price)}</span>}>Acompte (optionnel)</Label>
      <div className="flex items-center gap-1.5 rounded-[18px] p-1.5" style={{ background: "#fff", boxShadow: H.shadow, border: `1.5px solid ${deposit > 0 ? H.gold : H.line}` }}>
        <button type="button" onClick={() => setDeposit((d) => Math.max(0, Math.min(price, d) - 500))} aria-label="Moins 500" className="gb-focus w-12 h-12 rounded-[14px] text-[22px] font-extrabold shrink-0" style={{ background: "#F1F3F6", color: H.navy }}>−</button>
        <input aria-label="Montant de l'acompte" inputMode="numeric" value={deposit ? Math.min(deposit, price).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") : ""} placeholder="0" onChange={(e) => setDeposit(Math.min(price, Number(e.target.value.replace(/\D/g, "")) || 0))} className="flex-1 min-w-[9ch] text-center text-[24px] font-extrabold bg-transparent outline-none tracking-tight" style={{ color: H.navy, fontVariantNumeric: "tabular-nums" }} />
        <span className="text-[13px] font-extrabold shrink-0" style={{ color: H.goldDark }}>FCFA</span>
        <button type="button" onClick={() => setDeposit((d) => Math.min(price, d + 500))} aria-label="Plus 500" className="gb-focus w-12 h-12 rounded-[14px] text-[22px] font-extrabold shrink-0" style={{ background: "#F1F3F6", color: H.navy }}>+</button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {[0.25, 0.5, 1].map((k) => { const v = Math.round((price * k) / 500) * 500; return <Chip key={k} on={deposit === v && v > 0} onClick={() => setDeposit(v)} className="!px-1 !text-[12px]">{k === 1 ? "Tout" : `${k * 100} %`}</Chip>; })}
        <Chip on={deposit === 0} onClick={() => setDeposit(0)} className="!px-1 !text-[12px]">Aucun</Chip>
      </div>
      {deposit > 0 && <div className="mt-2 grid grid-cols-2 gap-1.5">{[["cash", "Espèces"], ["momo", "Mobile Money"]].map(([id, l]) => <Chip key={id} on={depMode === id} onClick={() => setDepMode(id)}>{l}</Chip>)}</div>}
      {deposit > 0 && depMode === "momo" && <div className="mt-2.5"><MomoPicker value={depOp} onChange={setDepOp} /></div>}
      <Btn kind="indigo" icon="check" full className="mt-4 !min-h-[56px] !text-[16px]" disabled={!room || !tariff || !client.trim() || String(phone).replace(/\D/g, "").length < 8} onClick={submit}>Enregistrer la réservation</Btn>
    </div>
  );
}
