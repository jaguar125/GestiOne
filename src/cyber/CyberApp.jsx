// src/cyber/CyberApp.jsx
//
// Application du type d'entreprise « Cyber café ». Branchée dans App.jsx à
// la place des écrans de vente quand l'entreprise est un cyber café :
// même création d'entreprise et même connexion (nom + code PIN) que toutes
// les entreprises GestiOne.
//
// Rôles : propriétaire (compte administrateur), gérante et employé
// (accès du personnel). Les données sont enregistrées sur le téléphone,
// envoyées tout de suite au serveur et relues toutes les 12 secondes par
// les autres téléphones de l'entreprise : chaque vente, réapprovisionnement
// ou alerte de stock y est annoncé à l'écrit et à voix haute.

import { useEffect, useMemo, useRef, useState } from "react";
import { C, GRAD, FONT_D, STATUS_H, CyberStyles, Icon, Btn, Card, Label, Hero, Avatar, Tag, Waves, Empty } from "./CyberUI.jsx";
import {
  DAY, rid, hmOf, dayBounds, dayLabel, localDayKey, roleOf, can as canOf, ROLES, CATS, defaultServices, defaultStock, nextTicketNo, deviceId,
  stockLevels, isLow, qtyLabel, lineTotal, lineOfficial, saleDue, salePaid, saleToPay, periodFigures, cashExpected, cyberSettingsOf, announceLevel,
  saleEvent, sayAmount, isLive,
} from "./cyberLogic.js";
import { announceVoice, setSpeaker } from "./cyberVoice.js";
import { DragBubble } from "../DragBubble.jsx";
import { momoLabel } from "../MomoPicker.jsx";
import { SellScreen, PayScreen, ReceiptScreen } from "./CyberSell.jsx";
import { PaymentReceiptScreen, CloseReceiptScreen } from "./CyberDocs.jsx";
import { HistoryScreen, CreditsScreen, ClientScreen, clientDebts } from "./CyberBook.jsx";
import { StockScreen, PurchaseScreen, InventoryScreen, MovesScreen } from "./CyberStock.jsx";
import { ExpensesScreen, CloseScreen, ReportsScreen, ServicesScreen, StaffScreen, AnnounceScreen, SyncScreen, ReceiptSettingsScreen, BackupScreen, SupportLocked } from "./CyberAdmin.jsx";
import { LicenceScreen, OrderLicenceScreen } from "../hotel/HotelAdmin.jsx";
import { FaqScreen } from "../hotel/HotelMenu.jsx";

const nowIso = () => new Date().toISOString();

export default function CyberApp(props) {
  const {
    shop, role, userName, staff, services = [], sales = [], clients = [], stock = [], moves = [], events = [], closes = [], expenses = [], save, fmt,
    pushToast, speak, notify, onLogout, sync, license, licenseStatus, onActivateLicense, pricing, onOrderLicense, routeSignal,
    staffApi, renderInvites, editorOn = false, onEditorOpen, verifyOwnerPin, onOpenSupport, onOpenLegal, faq = [],
  } = props;
  const settings = cyberSettingsOf(shop);
  const r = roleOf(role, staff);
  const can = canOf(r);
  const by = userName || (r === "owner" ? "Propriétaire" : "Employé");
  const myDevice = useMemo(() => deviceId(), []);
  // Même voix que les boutiques (moteur vocal du téléphone).
  useEffect(() => { setSpeaker(speak || null); return () => setSpeaker(null); }, [speak]);
  const [tab, setTab] = useState("home");
  const [route, setRoute] = useState(null);
  const [menu, setMenu] = useState(false);
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [banner, setBanner] = useState(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { try { window.scrollTo(0, 0); } catch { /* ignore */ } }, [tab, route?.name]);
  useEffect(() => { if (routeSignal?.n && can.licence) setRoute({ name: routeSignal.name }); }, [routeSignal?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prestations et consommables de départ, une seule fois (propriétaire).
  useEffect(() => {
    if (r === "owner" && services.length === 0 && !shop?.cyberSeeded) {
      save.services(defaultServices());
      if (!stock.length) save.stock(defaultStock());
      save.shopMeta({ ...shop, cyberSeeded: true, cyberSettings: settings });
    }
  }, [r, services.length, shop?.cyberSeeded]); // eslint-disable-line react-hooks/exhaustive-deps

  const levels = useMemo(() => stockLevels(stock, moves, sales), [stock, moves, sales]);
  const staffNames = (staffApi?.vendors || []).map((v) => v.name);
  const setSettings = (patch) => save.shopMeta({ ...shop, cyberSettings: { ...settings, ...patch } });

  // ---------- Annonces : événements partagés entre tous les téléphones ----------
  const addEvents = (list, { speak = true } = {}) => {
    const t = Date.now();
    const keep = events.filter((e) => t - e.at < 3 * DAY).slice(0, 300);
    save.events([...list.map((e) => ({ id: rid(), at: t, by, deviceId: myDevice, ...e })), ...keep]);
    // Annonce vocale aussi sur le téléphone qui fait l'action.
    if (speak) list.forEach((e) => speakLocal(e));
  };
  const seenKey = `cyber:seen:${shop?.id}`;
  const seenRef = useRef(null);
  if (!seenRef.current) { try { seenRef.current = new Set(JSON.parse(localStorage.getItem(seenKey) || "[]")); } catch { seenRef.current = new Set(); } }
  const markSeen = (id) => { seenRef.current.add(id); try { localStorage.setItem(seenKey, JSON.stringify([...seenRef.current].slice(-400))); } catch { /* ignore */ } };
  const quietNow = () => { if (settings.quiet === false) return false; const h = new Date().getHours(); return h >= (settings.quietFrom ?? 22) || h < (settings.quietTo ?? 7); };
  const levelFor = (ev) => (ev.type === "demande" ? (r === "owner" ? 2 : 0) : announceLevel(settings, ev.type, r));
  // Compteur de la cloche : notifications arrivées depuis la dernière ouverture de l'activité.
  const bellKey = `cyber:bell:${shop?.id}`;
  const [bellSeenAt, setBellSeenAt] = useState(() => { try { return Number(localStorage.getItem(bellKey)) || 0; } catch { return 0; } });
  const markBellSeen = () => { const t = Date.now(); setBellSeenAt(t); try { localStorage.setItem(bellKey, String(t)); } catch { /* ignore */ } };
  const unread = events.filter((e) => e.at > bellSeenAt && (levelFor(e) > 0 || e.by === by)).length;
  const present = (ev, local) => {
    const lvl = levelFor(ev);
    if (lvl <= 0) return;
    setBanner({ ...ev, k: Date.now(), voiceOn: lvl === 2 && !quietNow() });
    if (!local) notify?.(shop?.name || "Cyber café", `${ev.title} — ${ev.body || ""}`.trim());
    if (lvl === 2 && !quietNow() && ev.voice) announceVoice(ev.voice, { rate: settings.voiceRate || 1, withChime: settings.chime !== false });
  };
  const speakLocal = (ev) => { if (levelFor(ev) === 2 && !quietNow() && ev.voice) announceVoice(ev.voice, { rate: settings.voiceRate || 1, withChime: settings.chime !== false }); };
  useEffect(() => {
    const t = Date.now();
    events.slice(0, 30).reverse().forEach((ev) => {
      if (seenRef.current.has(ev.id)) return;
      markSeen(ev.id);
      if (ev.deviceId === myDevice || t - ev.at > 10 * 60000) return;
      present(ev, false);
    });
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!banner) return undefined; const t = setTimeout(() => setBanner(null), 7000); return () => clearTimeout(t); }, [banner?.k]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Actions ----------
  const lowCrossings = (before, after) => stock.filter((s) => s.active !== false && !isLow(s, before[s.id] || 0) && isLow(s, after[s.id] || 0))
    .map((s) => ({ type: "stock", title: `Stock bas · ${s.name}`, body: `Il ne reste que ${qtyLabel(s, after[s.id])} (seuil d'alerte : ${qtyLabel(s, s.alert)}). Pensez à réapprovisionner.`, voice: `${shop?.name || "Cyber café"}. Stock bas. Il ne reste que ${qtyLabel(s, Math.max(0, after[s.id]))} de ${s.name}.` }));
  const sell = ({ lines, client: cl, payments }) => {
    if (!lines?.length) return null;
    const at = Date.now();
    const sale = {
      id: rid(), no: nextTicketNo(shop?.id), at, by, byRole: r, deviceId: myDevice, client: cl || null, lines,
      total: lineTotal(lines), official: lineOfficial(lines),
      payments: (payments || []).filter((p) => p.amount > 0).map((p) => ({ id: rid(), at, kind: "vente", by, ...p })),
      status: "ok", createdAt: nowIso(), updatedAt: nowIso(),
    };
    if (saleDue(sale) > 0 && !cl) { pushToast("Choisissez le client pour une vente à crédit", "error"); return null; }
    const nextSales = [sale, ...sales];
    const after = stockLevels(stock, moves, nextSales);
    save.sales(nextSales);
    const ev = saleEvent(sale, shop, fmt);
    const list = [ev, ...lowCrossings(levels, after)];
    addEvents(list, { speak: false });
    // Annonce vocale aussi sur le téléphone qui fait la vente.
    speakLocal(ev);
    list.forEach((e, i) => { if (i > 0) present({ ...e, id: rid() }, true); });
    pushToast(`${ev.title}`, "ok");
    setCart([]); setClient(null);
    return sale;
  };
  const payCredit = (cl, amount, mode, op = "") => {
    let left = amount; const at = Date.now(); const grp = rid(); const rno = `P${nextTicketNo(shop?.id)}`;
    const own = sales.filter((s) => s.client?.id === cl.id && saleDue(s) > 0).sort((a, b) => a.at - b.at);
    const patch = new Map();
    own.forEach((s) => { if (left <= 0) return; const take = Math.min(left, saleDue(s)); left -= take; patch.set(s.id, { ...s, payments: [...(s.payments || []), { id: rid(), at, kind: "credit", by, mode, op: mode === "momo" ? op : "", amount: take, grp, rno }], updatedAt: nowIso() }); });
    if (!patch.size) return null;
    save.sales(sales.map((s) => patch.get(s.id) || s));
    const paid = amount - left;
    addEvents([{ type: "paiement", title: `Paiement de crédit reçu par ${by} · ${fmt(paid)}`, body: `${cl.name} a payé ${fmt(paid)} (${mode === "momo" ? momoLabel(op) : "espèces"}).`, voice: `${shop?.name || "Cyber café"}. ${by} vient d'encaisser un paiement de crédit de ${sayAmount(paid, shop?.currency)}, de ${cl.name}.`, amount: paid }]);
    pushToast(`${fmt(paid)} encaissé · ${cl.name}`, "ok");
    return grp;
  };
  const cancelSale = (sale, { reason, refund }) => {
    if (!can.cancel) { pushToast("Réservé à la gérante et au propriétaire", "error"); return; }
    const at = Date.now(); const paid = salePaid(sale);
    const next = { ...sale, status: "cancelled", cancel: { at, by, reason }, refund: refund && paid > 0 ? { at, by, amount: paid, mode: "cash" } : null, updatedAt: nowIso() };
    save.sales(sales.map((s) => (s.id === sale.id ? next : s)));
    addEvents([{ type: "annulation", title: `Annulation par ${by} · ${fmt(saleToPay(sale))}`, body: `Ticket ${sale.no} (${sale.by}) annulé. Motif : ${reason}.${next.refund ? ` Remboursé ${fmt(paid)}.` : ""}`, voice: `${shop?.name || "Cyber café"}. Attention. ${by} vient d'annuler une ${(sale.lines || []).some((l) => l.kind === "article") ? "vente" : "prestation"} de ${sayAmount(saleToPay(sale), shop?.currency)}.`, amount: saleToPay(sale) }]);
    pushToast(`Ticket ${sale.no} annulé${next.refund ? ` · ${fmt(paid)} remboursé` : ""}`, "ok");
  };
  const saveClient = ({ name, phone }) => {
    if (!name) return null;
    const ex = clients.find((c) => c.name.trim().toLowerCase() === name.toLowerCase() && (c.phone || "") === (phone || ""));
    if (ex) return ex;
    const c = { id: rid(), name, phone: phone || "", by, createdAt: nowIso(), updatedAt: nowIso() };
    save.clients([c, ...clients]);
    pushToast(`Client ${name} enregistré`, "ok");
    return c;
  };
  const saveStockItem = (rec, isNew) => {
    const t = nowIso();
    save.stock(isNew ? [...stock, { ...rec, createdAt: t, updatedAt: t }] : stock.map((s) => (s.id === rec.id ? { ...rec, updatedAt: t } : s)));
    pushToast(isNew ? `${rec.name} ajouté au stock` : `${rec.name} enregistré`, "ok");
  };
  const restock = ({ supplier, pay, lines }) => {
    const at = Date.now();
    const newMoves = lines.map((l) => ({ id: rid(), at, by, kind: "achat", stockId: l.stockId, qty: l.qty, supplier, pay, total: l.lots * l.lotCost, status: "ok", createdAt: nowIso(), updatedAt: nowIso() }));
    save.moves([...newMoves, ...moves]);
    const costs = new Map(lines.map((l) => { const s = stock.find((x) => x.id === l.stockId); return [l.stockId, l.lotCost > 0 ? l.lotCost / (s?.pack || 1) : null]; }));
    if ([...costs.values()].some((v) => v != null)) save.stock(stock.map((s) => (costs.get(s.id) != null ? { ...s, cost: Math.round(costs.get(s.id) * 100) / 100, updatedAt: nowIso() } : s)));
    const txt = lines.map((l) => { const s = stock.find((x) => x.id === l.stockId); return s ? `${qtyLabel(s, l.qty)} de ${s.name}` : ""; }).filter(Boolean);
    const said = txt.length > 1 ? `${txt.slice(0, -1).join(", ")} et ${txt[txt.length - 1]}` : txt[0];
    const total = lines.reduce((t, l) => t + l.lots * l.lotCost, 0);
    addEvents([{ type: "reappro", title: `Réapprovisionnement par ${by}`, body: `+ ${txt.join(", + ")}${supplier ? ` · ${supplier}` : ""}${total ? ` · achat de ${fmt(total)}` : ""}.`, voice: `${shop?.name || "Cyber café"}. Réapprovisionnement. ${by} vient d'ajouter ${said}.`, amount: total }]);
    pushToast("Entrée en stock enregistrée", "ok");
  };
  const inventory = (list) => {
    const at = Date.now();
    const newMoves = list.filter((x) => Math.round(x.counted - x.theo) !== 0).map((x) => ({ id: rid(), at, by, kind: "inventaire", stockId: x.stockId, qty: Math.round(x.counted - x.theo), status: "ok", createdAt: nowIso(), updatedAt: nowIso() }));
    if (newMoves.length) save.moves([...newMoves, ...moves]);
    pushToast(newMoves.length ? `Inventaire validé · ${newMoves.length} ajustement${newMoves.length > 1 ? "s" : ""}` : "Inventaire conforme", "ok");
  };
  const addExpense = ({ amount, category, label, source }) => {
    const at = Date.now();
    save.expenses([{ id: rid(), date: localDayKey(at), at, amount, label, category, source, by, cyber: true, createdAt: nowIso() }, ...expenses]);
    addEvents([{ type: "depense", title: `Dépense de ${by} · ${fmt(amount)}`, body: `${label} (${source === "momo" ? "Mobile Money" : "payé en caisse"}).`, voice: `${shop?.name || "Cyber café"}. ${by} vient d'enregistrer une dépense de ${sayAmount(amount, shop?.currency)}, pour ${label.toLowerCase()}.`, amount }]);
    pushToast(`Dépense de ${fmt(amount)} enregistrée`, "ok");
  };
  const closeDay = (d) => {
    const at = Date.now();
    const id = rid();
    save.closes([{ id, day: localDayKey(at), at, by, ...d }, ...closes]);
    addEvents([{ type: "cloture", title: `Caisse clôturée par ${by}`, body: `Compté ${fmt(d.counted)} · attendu ${fmt(d.expected)} · ${d.gap === 0 ? "caisse juste" : `${d.gap < 0 ? "manquant" : "excédent"} de ${fmt(Math.abs(d.gap))}`}.`, voice: `${shop?.name || "Cyber café"}. ${by} vient de clôturer la caisse. ${d.gap === 0 ? "La caisse est juste." : `${d.gap < 0 ? "Manquant" : "Excédent"} de ${sayAmount(Math.abs(d.gap), shop?.currency)}.`}`, amount: d.counted }]);
    pushToast("Journée clôturée", "ok");
    return id;
  };
  const saveService = (svc) => {
    const ex = services.some((s) => s.id === svc.id);
    save.services(ex ? services.map((s) => (s.id === svc.id ? { ...svc, updatedAt: nowIso() } : s)) : [...services, { ...svc, createdAt: nowIso(), updatedAt: nowIso() }]);
    pushToast(`${svc.name} enregistrée`, "ok");
  };
  const restoreBackup = (data) => {
    let added = 0;
    const merge = (cur, inc, saver) => { const ids = new Set(cur.map((x) => x.id)); const miss = (inc || []).filter((x) => x && x.id && !ids.has(x.id)); added += miss.length; if (miss.length) saver([...cur, ...miss]); };
    merge(services, data.services, save.services); merge(sales, data.sales, save.sales); merge(clients, data.clients, save.clients);
    merge(stock, data.stock, save.stock); merge(moves, data.moves, save.moves); merge(closes, data.closes, save.closes); merge(expenses, data.expenses, save.expenses);
    setSettings({ backupLog: [{ kind: "restore", at: Date.now(), by, added }, ...(settings.backupLog || [])].slice(0, 12) });
    pushToast(added ? `Restauré · ${added} élément${added > 1 ? "s" : ""} remis en place` : "Rien à restaurer : tout est déjà présent", "ok");
    return added;
  };
  const announceTest = () => announceVoice(`${shop?.name || "Cyber café"}. ${by} vient de faire une prestation de ${sayAmount(3500, shop?.currency)}.`, { rate: settings.voiceRate || 1, withChime: settings.chime !== false });
  const notifyOwner = () => { addEvents([{ type: "demande", title: `${by} demande l'assistance`, body: `${by} a besoin d'aide : contactez l'assistance GestiOne depuis le menu.`, voice: `${shop?.name || "Cyber café"}. ${by} vous demande de contacter l'assistance GestiOne.` }]); pushToast("Le propriétaire est prévenu", "ok"); };

  const actions = { sell, payCredit, cancelSale, saveClient, saveStockItem, restock, inventory, addExpense, closeDay, saveService, setSettings, restoreBackup, announceTest, notifyOwner };
  const ctx = { unread, onLogout, shop, settings, role: r, can, userName: by, staffNames, services, sales, clients, stock, moves, events, closes, expenses, levels, fmt, pushToast, actions, sync, now, H: C };
  const go = (name, extra = {}) => setRoute({ name, back: route, ...extra });
  const back = () => setRoute(route?.back || null);
  const openReceipt = (s) => go("receipt", { saleId: s.id });

  // ---------- Écrans ----------
  let screen = null;
  if (route) {
    const n = route.name;
    if (n === "sell") screen = <SellScreen ctx={ctx} cart={cart} setCart={setCart} client={client} setClient={setClient} onBack={back} onCheckout={() => go("pay")} />;
    else if (n === "pay") screen = <PayScreen ctx={ctx} cart={cart} client={client} setClient={setClient} onBack={back} onDone={(s, print) => setRoute({ name: "receipt", saleId: s.id, fresh: true, print, back: null })} />;
    else if (n === "receipt") { const s = sales.find((x) => x.id === route.saleId); screen = s ? <ReceiptScreen key={s.id} ctx={ctx} sale={s} fresh={route.fresh} autoPrint={route.print} onBack={back} onNew={() => setRoute({ name: "sell", back: null })} /> : null; }
    else if (n === "history") screen = <HistoryScreen ctx={ctx} onBack={back} openReceipt={openReceipt} />;
    else if (n === "client") screen = <ClientScreen ctx={ctx} clientId={route.clientId} onBack={back} openReceipt={openReceipt} openPayment={(key, fresh) => go("payreceipt", { clientId: route.clientId, key, fresh })} />;
    else if (n === "payreceipt") screen = <PaymentReceiptScreen key={route.key} ctx={ctx} clientId={route.clientId} payKey={route.key} fresh={route.fresh} onBack={back} />;
    else if (n === "closereceipt") screen = <CloseReceiptScreen key={route.closeId} ctx={ctx} closeId={route.closeId} fresh={route.fresh} onBack={back} />;
    else if (n === "achat" && can.stock) screen = <PurchaseScreen ctx={ctx} onBack={back} />;
    else if (n === "inventaire" && can.stock) screen = <InventoryScreen ctx={ctx} onBack={back} />;
    else if (n === "mouvements" && can.stock) screen = <MovesScreen ctx={ctx} onBack={back} />;
    else if (n === "depenses" && can.expense) screen = <ExpensesScreen ctx={ctx} onBack={back} />;
    else if (n === "cloture" && can.close) screen = <CloseScreen ctx={ctx} onBack={back} openReport={(closeId, fresh) => (fresh ? setRoute({ name: "closereceipt", closeId, fresh, back: route.back }) : go("closereceipt", { closeId }))} />;
    else if (n === "rapports" && can.reports) screen = <ReportsScreen ctx={ctx} onBack={back} />;
    else if (n === "tarifs" && can.price) screen = <ServicesScreen ctx={ctx} onBack={back} />;
    else if (n === "personnel" && can.staff) screen = <StaffScreen ctx={ctx} onBack={back} staffApi={{ ...staffApi }} renderInvites={renderInvites} />;
    else if (n === "annonces" && can.settings) screen = <AnnounceScreen ctx={ctx} onBack={back} />;
    else if (n === "synchro") screen = <SyncScreen ctx={ctx} onBack={back} />;
    else if (n === "recus" && can.settings) screen = <ReceiptSettingsScreen ctx={ctx} onBack={back} />;
    else if (n === "sauvegarde" && can.backup) screen = <BackupScreen ctx={ctx} onBack={back} verifyOwnerPin={verifyOwnerPin} />;
    else if (n === "licence" && can.licence) screen = <LicenceScreen ctx={ctx} onBack={back} license={license} licenseStatus={licenseStatus} onActivate={onActivateLicense} pricing={pricing} onOrder={(planId) => go("order", { planId })} />;
    else if (n === "order" && can.licence) screen = <OrderLicenceScreen ctx={ctx} onBack={back} pricing={pricing} planId={route.planId} onSend={(msg, who) => { onOrderLicense?.(msg, who); setRoute(null); }} />;
    else if (n === "faq") screen = <FaqScreen faq={faq} onBack={back} onSupport={can.support && onOpenSupport ? () => onOpenSupport() : null} />;
    else if (n === "support") screen = <SupportLocked onBack={back} onNotify={() => { notifyOwner(); back(); }} />;
    else if (n === "activite") screen = <ActivityScreen key="act" onSeen={markBellSeen} ctx={ctx} levelFor={levelFor} onBack={back} />;
  }
  const isFullBleed = ["receipt", "payreceipt", "closereceipt"].includes(route?.name);
  const showNav = !route;
  return (
    <div className="cy-root px-4" style={{ color: C.ink, background: isFullBleed ? C.navy : C.ground, minHeight: "100vh" }}>
      <CyberStyles />
      <div aria-hidden="true" className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] z-40 no-print" style={{ height: STATUS_H, background: C.navy }} />
      <div aria-hidden="true" style={{ height: `calc(${STATUS_H} - max(22px, env(safe-area-inset-top)))` }} />
      {screen || (
        <>
          {tab === "home" && <HomeScreen ctx={ctx} go={go} openMenu={() => setMenu(true)} onTab={setTab} />}
          {tab === "credits" && <CreditsScreen ctx={ctx} openClient={(id) => go("client", { clientId: id })} />}
          {tab === "stock" && <StockScreen ctx={ctx} go={go} />}
          {tab === "mine" && <HistoryScreen ctx={ctx} onBack={() => setTab("home")} openReceipt={openReceipt} />}
        </>
      )}
      {showNav && <div aria-hidden="true" style={{ height: "calc(110px + env(safe-area-inset-bottom))" }} />}
      {showNav && <BottomNav tab={tab} setTab={setTab} can={can} onSell={() => go("sell")} onMenu={() => setMenu(true)} credits={clientDebts(clients, sales).filter((c) => c.due > 0 && c.days > 7).length} lowStock={stock.filter((s) => s.active !== false && isLow(s, levels[s.id] || 0)).length} />}
      {menu && <MenuDrawer ctx={ctx} tab={tab} onClose={() => setMenu(false)} onTab={(t) => { setRoute(null); setTab(t); }} go={(n) => setRoute({ name: n })} onLogout={onLogout} editorOn={editorOn} onEditorOpen={onEditorOpen} onOpenSupport={onOpenSupport} onOpenLegal={onOpenLegal} faq={faq} license={license} licenseStatus={licenseStatus} />}
      {banner && <EventBanner ev={banner} shop={shop} fmt={fmt} onClose={() => setBanner(null)} />}
    </div>
  );
}

// ---------- Bannière d'annonce (notification écrite dans l'application) ----------
const EV_ICON = { prestation: ["copy", "#0891B2"], vente: ["bag", "#4F46E5"], credit: ["clock", "#B45309"], paiement: ["check", "#15803D"], annulation: ["x", "#B91C1C"], depense: ["money", "#B91C1C"], stock: ["warn", "#EA580C"], reappro: ["restock", "#059669"], cloture: ["lock", "#0A1730"], demande: ["help", "#6D28D9"] };
function EventBanner({ ev, shop, onClose }) {
  const [ic, bg] = EV_ICON[ev.type] || EV_ICON.prestation;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] px-2.5 z-[80]" style={{ top: `calc(${STATUS_H} + 6px)` }}>
      <DragBubble id="cyber-annonce">
      <button type="button" onClick={onClose} className="cy-drop w-full text-left rounded-[22px] p-3" style={{ background: "#FFFFFF", border: `1px solid ${C.line}`, boxShadow: "0 22px 44px -16px rgba(10,23,48,0.55)" }}>
        <span className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-[13px] flex items-center justify-center text-white shrink-0" style={{ background: bg }}><Icon name={ic} size={19} stroke={2.4} /></span>
          <span className="flex-1 min-w-0"><span className="block text-[11px] font-extrabold tracking-[0.04em] truncate" style={{ color: C.muted }}>{(shop?.name || "Cyber café").toUpperCase()} · maintenant</span><span className="block text-[14.5px] font-extrabold truncate">{ev.title}</span></span>
        </span>
        {ev.body && <span className="block mt-1.5 text-[13px] leading-snug" style={{ color: C.ink2 }}>{ev.body}</span>}
        {ev.voiceOn && ev.voice && <span className="mt-2 flex items-center gap-2.5 rounded-[14px] px-2.5 py-2" style={{ background: C.navy }}><Waves /><span className="flex-1 text-[11.5px] italic leading-snug" style={{ color: "#E2E8F0" }}>« {ev.voice} »</span></span>}
      </button>
      </DragBubble>
    </div>
  );
}

// ---------- Barre du bas ----------
function BottomNav({ tab, setTab, can, onSell, onMenu, credits, lowStock }) {
  const items = [["home", "Accueil", "home"], ["credits", "Crédits", "users"], ["sell"], can.stock ? ["stock", "Stock", "box"] : ["mine", "Mes ventes", "list"], ["menu", "Menu", "grid"]];
  const badge = { credits, stock: lowStock };
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] px-3 z-30 no-print" style={{ paddingTop: 14, paddingBottom: "calc(10px + env(safe-area-inset-bottom))", background: "linear-gradient(to top, #EEF2F8 72%, rgba(238,242,248,0))" }}>
      <nav aria-label="Navigation du cyber café" className="grid items-center rounded-[24px]" style={{ height: 68, background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 10px 28px -12px rgba(10,23,48,0.35)", gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}>
        {items.map(([id, label, icon]) => {
          if (id === "sell") return (
            <button key={id} type="button" onClick={onSell} className="gb-focus cy-tap flex flex-col items-center gap-[3px] text-[10.5px] font-extrabold" style={{ marginTop: -30, color: C.navy }}>
              <span className="cy-ring flex items-center justify-center" style={{ width: 58, height: 58, borderRadius: 20, background: GRAD.cyan, border: "4px solid #EEF2F8" }}><Icon name="plus" size={26} color={C.navy} stroke={2.8} /></span>Vendre
            </button>
          );
          if (id === "menu") return (
            <button key={id} type="button" onClick={onMenu} aria-label="Menu" className="gb-focus cy-tap flex flex-col items-center gap-[3px] text-[10.5px] font-extrabold" style={{ color: C.navy }}>
              <span className="flex items-center justify-center" style={{ width: 34, height: 30, borderRadius: 10, background: "linear-gradient(135deg,#1B3361,#0A1730)" }}><Icon name="grid" size={16} color="#fff" stroke={2.3} /></span>Menu
            </button>
          );
          const on = tab === id;
          return (
            <button key={id} type="button" onClick={() => setTab(id)} aria-current={on ? "page" : undefined} aria-label={badge[id] ? `${label} (${badge[id]} alerte${badge[id] > 1 ? "s" : ""})` : label} className="gb-focus cy-tap relative flex flex-col items-center gap-[3px] text-[10.5px]" style={{ color: on ? C.navy : "#64748B", fontWeight: on ? 800 : 700 }}>
              <span className="relative"><Icon name={icon} size={21} stroke={on ? 2.4 : 2.1} />{badge[id] > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full text-[9.5px] font-extrabold text-white flex items-center justify-center" style={{ background: "#EA580C" }}>{badge[id]}</span>}</span>
              {label}<span style={{ width: 16, height: 3, borderRadius: 2, background: on ? "#06B6D4" : "transparent" }} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ---------- Accueil ----------
function useCountUp(target) {
  const [v, setV] = useState(0);
  useEffect(() => { const t0 = Date.now(); const from = 0; const id = setInterval(() => { const p = Math.min(1, (Date.now() - t0) / 900); setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)))); if (p >= 1) clearInterval(id); }, 30); return () => clearInterval(id); }, [target]);
  return v;
}
const QUICK = [["copie", "Photocopie"], ["impression", "Impression"], ["photo", "Photo d'identité"], ["web", "Inscription en ligne"]];
function HomeScreen({ ctx, go, openMenu, onTab }) {
  const { shop, can, role, userName, sales, expenses, stock, moves, levels, fmt, settings, sync, now, events, clients } = ctx;
  const [d0] = dayBounds(now);
  const day = periodFigures({ sales, expenses, stock, moves, from: d0, to: d0 + DAY });
  const mine = periodFigures({ sales, from: d0, to: d0 + DAY, by: userName });
  const shown = useCountUp(can.cash ? day.ca : mine.ca);
  const cash = cashExpected(day, settings.float);
  const lows = stock.filter((s) => s.active !== false && isLow(s, levels[s.id] || 0));
  const late = clientDebts(clients, sales).filter((c) => c.due > 0 && c.days > 7);
  const R = ROLES[role];
  const online = sync?.online !== false;
  const team = day.perPerson;
  const maxT = Math.max(1, ...team.map((x) => x.amount));
  const myLast = sales.filter((s) => s.by === userName).sort((a, b) => b.at - a.at).slice(0, 5);
  const lastEv = events.find((e) => e.type === "stock" || e.type === "reappro");
  return (
    <div>
      <Hero pb={can.cash ? 86 : 78}>
        <div className="cy-a flex items-center gap-2.5">
          <button type="button" onClick={openMenu} aria-label="Ouvrir le menu" className="gb-focus cy-tap w-[46px] h-[46px] rounded-[15px] flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#67E8F9,#0891B2)", boxShadow: "0 8px 20px -6px rgba(34,211,238,0.7)" }}><Icon name="monitor" size={23} color={C.navy} stroke={2.3} /></button>
          <span className="flex-1 min-w-0"><span className="block text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#67E8F9" }}>{role === "owner" ? "CYBER CAFÉ" : `${R.label.toUpperCase()} · CYBER CAFÉ`}</span><span className="block text-[19px] font-extrabold truncate" style={{ fontFamily: FONT_D }}>{role === "owner" ? shop?.name : `Bonjour ${userName}`}</span></span>
          <button type="button" onClick={() => go("synchro")} aria-label={online ? (sync?.pending ? `${sync.pending} en attente de synchronisation` : "En ligne · synchronisation") : "Hors ligne"} className="gb-focus cy-tap w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0 relative" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}><Icon name="sync" size={17} color={online ? "#D1FAE5" : "#FDE68A"} /><span className={online ? "cy-live absolute" : "absolute"} style={{ top: 7, right: 7, width: 8, height: 8, borderRadius: 4, background: online ? "#34D399" : "#F59E0B", border: "1.5px solid #0A1730" }} /></button>
          <button type="button" onClick={() => go("activite")} aria-label={ctx.unread ? `Notifications : ${ctx.unread} nouvelle${ctx.unread > 1 ? "s" : ""}` : "Notifications"} className="gb-focus cy-tap w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0 relative" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}><Icon name="bell" size={18} />{ctx.unread > 0 && <span key={ctx.unread} className="cy-pop absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white" style={{ background: "#EF4444", border: "2px solid #0A1730" }}>{ctx.unread > 99 ? "99+" : ctx.unread}</span>}</button>
          {ctx.onLogout && <button type="button" onClick={ctx.onLogout} aria-label="Se déconnecter" className="gb-focus cy-tap w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}><Icon name="logout" size={18} /></button>}
        </div>
        <p className="cy-a cy-d1 mt-3.5 text-[12.5px]" style={{ color: "#B6C4DC" }}>{new Date(now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {role === "owner" ? `${userName}, propriétaire` : shop?.name} · <span style={{ color: online ? "#6EE7B7" : "#FDE68A" }}>{online ? (sync?.pending ? `${sync.pending} en attente` : "en ligne") : "hors ligne"}</span>{!can.cash && " · caisse masquée"}</p>
      </Hero>
      <div className="relative" style={{ marginTop: can.cash ? -70 : -62 }}>
        {can.cash ? (
          <Card className="cy-a cy-d2 p-4" style={{ boxShadow: "0 18px 40px -20px rgba(10,23,48,0.45)" }}>
            <div className="flex items-center justify-between"><span className="text-[11.5px] font-extrabold tracking-[0.04em]" style={{ color: C.muted }}>CHIFFRE D'AFFAIRES DU JOUR</span><Tag tint={C.violetSoft} ink={C.violet}>{day.tickets} ticket{day.tickets > 1 ? "s" : ""}</Tag></div>
            <p className="text-[34px] font-extrabold tracking-tight mt-0.5" style={{ fontFamily: FONT_D, color: C.navy }}>{fmt(shown)}</p>
            <div className="mt-2.5 rounded-[16px] px-3 py-2.5 flex items-center gap-2.5" style={{ background: C.navy, color: "#fff" }}>
              <Icon name="cash" size={20} color="#22D3EE" />
              <span className="flex-1"><span className="block text-[10.5px] font-bold" style={{ color: "#AEBBD2" }}>Argent disponible en caisse</span><span className="block text-[17px] font-extrabold" style={{ fontFamily: FONT_D }}>{fmt(cash)}</span></span>
              <span className="text-right"><span className="block text-[10.5px] font-bold" style={{ color: "#AEBBD2" }}>Mobile Money</span><span className="block text-[14px] font-extrabold" style={{ color: "#A5B4FC" }}>{fmt(day.momo)}</span></span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[["Encaissé", day.encaisse, C.cyanSoft, C.cyanInk, "#A5E9F5"], ["À crédit", day.credit, C.amberSoft, C.amber, "#FCD98A"], ["Bénéfice est.", day.profit, C.violetSoft, C.violet, "#D4C8FB"]].map(([l, v, bg, ink, line]) => <div key={l} className="rounded-[14px] px-2.5 py-2" style={{ background: bg, border: `1px solid ${line}` }}><p className="text-[10.5px] font-bold" style={{ color: ink }}>{l}</p><p className="text-[14px] font-extrabold whitespace-nowrap" style={{ color: ink }}>{fmt(v)}</p></div>)}
            </div>
            <p className="mt-2 text-[11px] leading-snug flex gap-1.5" style={{ color: C.muted }}><Icon name="info" size={14} color={C.cyanInk} />Une vente à crédit compte dans le chiffre d'affaires, pas dans l'encaissé. Un paiement de crédit est un encaissement, pas une nouvelle vente.</p>
          </Card>
        ) : (
          <Card className="cy-a cy-d2 p-4" style={{ boxShadow: "0 18px 40px -20px rgba(10,23,48,0.45)" }}>
            <p className="text-[11.5px] font-extrabold tracking-[0.04em]" style={{ color: C.muted }}>MON TRAVAIL AUJOURD'HUI</p>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {[["tickets", String(mine.tickets), C.cyanSoft, C.cyanInk], ["mon total", fmt(shown), C.indigoSoft, C.indigo], ["à crédit", fmt(mine.credit), C.amberSoft, C.amber]].map(([l, v, bg, ink]) => <div key={l} className="rounded-[14px] px-2.5 py-2" style={{ background: bg }}><p className="text-[17px] font-extrabold whitespace-nowrap" style={{ fontFamily: FONT_D, color: ink }}>{v}</p><p className="text-[10.5px] font-bold" style={{ color: ink }}>{l}</p></div>)}
            </div>
            <p className="mt-2 text-[11.5px] leading-snug" style={{ color: C.muted }}>Vous voyez uniquement vos propres ventes. La caisse et la recette sont visibles par la gérante et le propriétaire.</p>
          </Card>
        )}
      </div>
      <div className="cy-a cy-d3 flex items-center justify-between mt-5 mb-2 px-1"><span className="text-[16px] font-extrabold" style={{ fontFamily: FONT_D }}>Prestations rapides</span><button type="button" onClick={() => go("sell")} className="text-[12.5px] font-extrabold" style={{ color: C.cyanInk }}>Tout voir</button></div>
      <div className="cy-a cy-d3 grid grid-cols-4 gap-2">
        {QUICK.map(([cat, l]) => { const K = CATS[cat]; return (
          <button key={cat} type="button" onClick={() => go("sell")} className="gb-focus cy-tap rounded-[18px] px-1 pt-3 pb-2.5 flex flex-col items-center gap-1.5" style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 6px 14px -10px rgba(10,23,48,0.35)" }}>
            <span className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-white" style={{ background: K.grad, boxShadow: `0 8px 16px -8px ${K.ink}` }}><Icon name={K.icon} size={20} /></span>
            <span className="text-[11px] font-extrabold text-center leading-tight">{l}</span>
          </button>
        ); })}
      </div>
      {can.team ? (
        <>
          <div className="cy-a cy-d4 flex items-center justify-between mt-5 mb-2 px-1"><span className="text-[16px] font-extrabold" style={{ fontFamily: FONT_D }}>L'équipe aujourd'hui</span><button type="button" onClick={() => go("history")} className="text-[12.5px] font-extrabold" style={{ color: C.cyanInk }}>Historique</button></div>
          <Card className="cy-a cy-d4 px-3.5 py-1">
            {team.map((p, i) => (
              <div key={p.name} className="py-2.5" style={{ borderTop: i ? `1px solid ${C.line2}` : "none" }}>
                <div className="flex items-center gap-2.5"><Avatar name={p.name} size={36} /><span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold truncate">{p.name}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>{p.tickets} ticket{p.tickets > 1 ? "s" : ""}</span></span><span className="text-[15px] font-extrabold" style={{ fontFamily: FONT_D }}>{fmt(p.amount)}</span></div>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: C.ground }}><div className="cy-bar h-1.5 rounded-full" style={{ width: `${Math.round((p.amount / maxT) * 100)}%`, background: GRAD.cyan }} /></div>
              </div>
            ))}
            {!team.length && <p className="py-4 text-center text-[12.5px]" style={{ color: C.muted }}>Aucune vente aujourd'hui pour l'instant.</p>}
            {team.length > 0 && <div className="flex justify-between py-2.5 text-[13.5px] font-extrabold" style={{ borderTop: `1px solid ${C.line}` }}><span>Total de l'équipe</span><span style={{ fontFamily: FONT_D }}>{fmt(day.ca)}</span></div>}
          </Card>
        </>
      ) : (
        <>
          {lastEv && now - lastEv.at < 6 * 3600000 && <div className="cy-a cy-d4 mt-4 flex items-center gap-2.5 rounded-[18px] px-3 py-2.5" style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA" }}><span className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white" style={{ background: "#EA580C" }}><Icon name="speaker" size={17} /></span><span className="flex-1 min-w-0"><span className="block text-[13px] font-extrabold">Annonce reçue · {hmOf(lastEv.at)}</span><span className="block text-[12px] truncate" style={{ color: "#9A3412" }}>{lastEv.title}</span></span></div>}
          <div className="cy-a cy-d4 flex items-center justify-between mt-5 mb-2 px-1"><span className="text-[16px] font-extrabold" style={{ fontFamily: FONT_D }}>Mes dernières ventes</span><button type="button" onClick={() => go("history")} className="text-[12.5px] font-extrabold" style={{ color: C.cyanInk }}>Tout voir</button></div>
          <Card className="cy-a cy-d4 px-3">
            {myLast.map((s, i) => <button key={s.id} type="button" onClick={() => go("receipt", { saleId: s.id })} className="gb-focus w-full flex items-center gap-2.5 min-h-[56px] text-left" style={{ borderTop: i ? `1px solid ${C.line2}` : "none" }}><span className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center text-[11px] font-extrabold shrink-0" style={{ background: C.ground, color: C.ink2 }}>{hmOf(s.at)}</span><span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate" style={{ textDecoration: isLive(s) ? "none" : "line-through" }}>{(s.lines || []).map((l) => l.label).join(", ")}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>Ticket {s.no}{saleDue(s) > 0 ? " · crédit" : ""}</span></span><span className="text-[13.5px] font-extrabold">{fmt(saleToPay(s))}</span></button>)}
            {!myLast.length && <p className="py-4 text-center text-[12.5px]" style={{ color: C.muted }}>Vos ventes apparaîtront ici.</p>}
          </Card>
        </>
      )}
      {(lows.length > 0 || (can.team && late.length > 0)) && (
        <>
          <div className="cy-a flex items-center mt-5 mb-2 px-1"><span className="text-[16px] font-extrabold" style={{ fontFamily: FONT_D }}>À surveiller</span></div>
          <div className="flex flex-col gap-2">
            {lows.slice(0, 3).map((s) => <Card key={s.id} onClick={can.stock ? () => go("achat") : undefined} className="cy-a px-3 py-2.5" style={{ border: "1.5px solid #FED7AA" }}><div className="flex items-center gap-2.5"><span className="w-10 h-10 rounded-[13px] flex items-center justify-center" style={{ background: C.orangeSoft, color: C.orange }}><Icon name="warn" size={19} /></span><span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold">{s.name} : {qtyLabel(s, levels[s.id] || 0)}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>Seuil d'alerte : {qtyLabel(s, s.alert)}{can.stock ? " · réapprovisionner" : ""}</span></span>{can.stock && <Icon name="chev" size={16} color={C.muted} />}</div></Card>)}
            {can.team && late.length > 0 && <Card onClick={() => onTab("credits")} className="cy-a px-3 py-2.5"><div className="flex items-center gap-2.5"><span className="w-10 h-10 rounded-[13px] flex items-center justify-center" style={{ background: C.amberSoft, color: C.amber }}><Icon name="users" size={19} /></span><span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold">{late.length} crédit{late.length > 1 ? "s" : ""} à relancer · {fmt(late.reduce((t, c) => t + c.due, 0))}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>Plus de 7 jours</span></span></div></Card>}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Activité en direct ----------
function ActivityScreen({ ctx, levelFor, onBack, onSeen }) {
  const { events } = ctx;
  useEffect(() => { onSeen?.(); return () => onSeen?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const list = events.filter((e) => levelFor(e) > 0 || e.by === ctx.userName).slice(0, 80);
  return (
    <div style={{ paddingBottom: 40 }}>
      <Hero>
        <div className="cy-a flex items-center gap-2.5">
          <button type="button" onClick={onBack} aria-label="Retour" className="gb-focus cy-tap w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}><Icon name="back" size={20} stroke={2.4} /></button>
          <span className="flex-1"><span className="block text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#67E8F9" }}>TOUS LES TÉLÉPHONES</span><span className="block text-[21px] font-extrabold" style={{ fontFamily: FONT_D }}>Activité en direct</span></span>
          <span className="h-[30px] px-2.5 rounded-full flex items-center gap-1.5 text-[11.5px] font-extrabold" style={{ background: "rgba(52,211,153,0.14)", color: "#A7F3D0" }}><span className="cy-live w-2 h-2 rounded-full" style={{ background: "#34D399" }} />En direct</span>
        </div>
      </Hero>
      <Card className="cy-a cy-d1 mt-3 px-3">
        {list.map((e, i) => { const [ic, bg] = EV_ICON[e.type] || EV_ICON.prestation; return (
          <div key={e.id} className="flex items-center gap-2.5 min-h-[60px] py-1.5" style={{ borderTop: i ? `1px solid ${C.line2}` : "none" }}>
            <span className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white shrink-0" style={{ background: bg }}><Icon name={ic} size={16} stroke={2.4} /></span>
            <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{e.title}</span><span className="block text-[11.5px] leading-snug" style={{ color: C.muted }}>{dayLabel(e.at)} {hmOf(e.at)} · {e.body}</span></span>
          </div>
        ); })}
        {!list.length && <p className="py-5 text-center text-[12.5px]" style={{ color: C.muted }}>Aucune activité pour l'instant.</p>}
      </Card>
    </div>
  );
}

// ---------- Menu ----------
function MenuDrawer({ ctx, tab, onClose, onTab, go, onLogout, editorOn, onEditorOpen, onOpenSupport, onOpenLegal, faq, license, licenseStatus }) {
  const { shop, can, role, userName, fmt, now, sales, expenses, stock, moves, settings, clients } = ctx;
  const [shown, setShown] = useState(false);
  const [openS, setOpenS] = useState(true);
  const [openA, setOpenA] = useState(false);
  const taps = useRef({ n: 0, at: 0 });
  useEffect(() => { const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, []);
  const close = () => { setShown(false); setTimeout(onClose, 180); };
  const pick = (fn) => () => { onClose(); fn(); };
  const tap = () => { const t = Date.now(); taps.current.n = t - taps.current.at < 1500 ? taps.current.n + 1 : 1; taps.current.at = t; if (taps.current.n >= 7) { taps.current.n = 0; onClose(); onEditorOpen?.(); } };
  const [d0] = dayBounds(now);
  const day = periodFigures({ sales, expenses, stock, moves, from: d0, to: d0 + DAY });
  const debts = clientDebts(clients, sales).reduce((t, c) => t + c.due, 0);
  const daysLeft = license?.expiresAt ? Math.ceil((new Date(license.expiresAt) - Date.now()) / DAY) : null;
  const lic = license?.lifetime ? "À vie" : license?.planId === "trial" ? `Essai · ${Math.max(0, daysLeft ?? 0)} j` : licenseStatus === "expired" ? "Expirée" : daysLeft != null ? `${daysLeft} j` : "—";
  const row = (t, icon, tint, ink, onClick, v = "", vc = C.ink2) => ({ t, icon, tint, ink, onClick, v, vc });
  const groups = [
    { t: "CAISSE", rows: [
      row("Tableau de bord", "dash", C.navy, "#67E8F9", pick(() => onTab("home"))),
      row(can.team ? "Ventes et historique" : "Mes ventes", "list", C.cyanSoft, C.cyanInk, pick(() => go("history"))),
      can.close && row("Clôture de caisse", "lock", C.indigoSoft, C.indigo, pick(() => go("cloture"))),
      can.expense && row("Dépenses", "money", C.redSoft, C.red, pick(() => go("depenses"))),
      can.team && row("Activité en direct", "bell", C.violetSoft, C.violet, pick(() => go("activite"))),
    ].filter(Boolean) },
    { t: "CLIENTS ET STOCK", rows: [
      row("Crédits clients", "users", C.amberSoft, C.amber, pick(() => onTab("credits")), can.cash ? fmt(debts) : "", C.amber),
      can.stock && row("Stock et consommables", "box", C.greenSoft, C.green, pick(() => onTab("stock"))),
      can.stock && row("Réapprovisionner", "restock", C.cyanSoft, C.cyanInk, pick(() => go("achat"))),
      can.stock && row("Inventaire", "clipboard", "#F1F5F9", C.ink2, pick(() => go("inventaire"))),
    ].filter(Boolean) },
    can.reports && { t: "RAPPORTS", rows: [row("Rapports et bénéfices", "trend", C.violetSoft, C.violet, pick(() => go("rapports")))] },
  ].filter(Boolean);
  const settingsRows = [
    can.price && row("Prestations et tarifs", "tag", C.cyanSoft, C.cyanInk, pick(() => go("tarifs"))),
    can.staff && row("Personnel et rôles", "users", C.violetSoft, C.violet, pick(() => go("personnel"))),
    can.settings && row("Annonces vocales", "speaker", C.cyanSoft, C.cyanInk, pick(() => go("annonces")), "Activées", C.green),
    can.settings && row("En-tête des reçus", "receipt", "#FCE7F3", "#BE185D", pick(() => go("recus"))),
    row("Synchronisation", "sync", C.greenSoft, C.green, pick(() => go("synchro")), "En direct", C.green),
    can.backup && row("Sauvegarde et restauration", "save", "#E0F2FE", "#0369A1", pick(() => go("sauvegarde"))),
    can.licence && row("Licence", "key", C.amberSoft, C.amber, pick(() => go("licence")), lic, C.amber),
  ].filter(Boolean);
  const helpRows = [
    row("Écrire à l'équipe GestiOne", "chat", "#E0F2FE", "#0369A1", pick(() => (can.support ? onOpenSupport?.() : go("support"))), can.support ? "" : "Propriétaire", C.muted),
    faq?.length ? row("Questions fréquentes", "book", C.ground, C.ink2, pick(() => go("faq"))) : null,
    can.licence ? row("Commander une licence", "bag", C.amberSoft, C.amber, pick(() => go("order"))) : null,
    onOpenLegal ? row("Conditions et confidentialité", "shield", "#F1F5F9", "#475569", pick(() => onOpenLegal("terms"))) : null,
  ].filter(Boolean);
  const Row = ({ x, small, first }) => (
    <button type="button" onClick={x.onClick} className={`gb-focus cy-tap w-full flex items-center text-left ${small ? "gap-2.5 min-h-[46px]" : "gap-3 min-h-[50px] px-3"}`} style={{ borderTop: !small && !first ? `1px solid ${C.line2}` : "none" }}>
      <span className={`${small ? "w-[30px] h-[30px] rounded-[9px]" : "w-[34px] h-[34px] rounded-[11px]"} flex items-center justify-center shrink-0`} style={{ background: x.tint, color: x.ink }}><Icon name={x.icon} size={small ? 15 : 17} /></span>
      <span className={`flex-1 ${small ? "text-[13px]" : "text-[14px]"} font-extrabold truncate`}>{x.t}</span>
      {x.v ? <span className="text-[11px] font-extrabold" style={{ color: x.vc }}>{x.v}</span> : null}
      <Icon name="chev" size={14} color="#B5BAC0" />
    </button>
  );
  const Sub = ({ open, setOpen, t, sub, icon, rows, navy }) => (
    <div className="mt-2.5 rounded-[18px] overflow-hidden" style={{ background: "#fff", border: `1.5px solid ${navy ? "#C7D2E5" : "#A5E9F5"}`, boxShadow: navy ? "0 10px 22px -14px rgba(10,23,48,0.7)" : "0 10px 22px -16px rgba(14,116,144,0.6)" }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="gb-focus w-full min-h-[58px] flex items-center gap-3 px-3 text-left" style={{ background: navy ? "linear-gradient(135deg,#0A1730,#1B3361)" : "linear-gradient(135deg,#ECFEFF,#E0F2FE)", color: navy ? "#fff" : C.ink }}>
        <span className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0" style={{ background: navy ? "linear-gradient(135deg,#67E8F9,#0891B2)" : "#fff" }}><Icon name={icon} size={19} color={navy ? C.navy : C.cyanInk} /></span>
        <span className="flex-1 min-w-0"><span className="block text-[14.5px] font-extrabold">{t}</span><span className="block text-[11px] truncate" style={{ opacity: 0.78 }}>{sub}</span></span>
        <span className="text-[10.5px] font-extrabold px-[7px] py-[3px] rounded-[7px]" style={{ background: navy ? "rgba(255,255,255,0.16)" : "#fff" }}>{rows.length}</span>
        <Icon name="down" size={16} stroke={2.6} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && <div className="pl-[22px] pr-2.5 pb-2">{rows.map((x) => <div key={x.t} className="pl-3" style={{ borderLeft: `2px solid ${C.line2}` }}><Row x={x} small /></div>)}</div>}
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] no-print" role="dialog" aria-modal="true" aria-label="Menu du cyber café">
      <button type="button" aria-label="Fermer le menu" onClick={close} className="absolute inset-0 w-full h-full" style={{ background: "rgba(6,14,30,0.6)", opacity: shown ? 1 : 0, transition: "opacity .2s" }} />
      <div className="absolute left-0 top-0 bottom-0 flex flex-col" style={{ width: "min(350px, 88vw)", background: "#F4F6FA", boxShadow: "14px 0 44px rgba(0,0,0,0.35)", transform: shown ? "none" : "translateX(-102%)", transition: "transform .22s ease-out" }}>
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: "calc(18px + env(safe-area-inset-bottom))" }}>
          <div className="relative overflow-hidden text-white px-4 pb-4" style={{ paddingTop: `calc(${STATUS_H} + 12px)`, background: C.navy }}>
            <span className="absolute rounded-full" style={{ right: -50, top: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(34,211,238,0.38) 0%, rgba(0,0,0,0) 70%)" }} />
            <div className="relative flex items-center gap-3">
              <span onClick={tap} className="select-none w-[50px] h-[50px] rounded-[16px] flex items-center justify-center shrink-0" style={{ border: "2px solid rgba(255,255,255,0.25)", background: "linear-gradient(135deg,#67E8F9,#0891B2)", boxShadow: "0 8px 18px -6px rgba(34,211,238,0.7)" }}><Icon name="monitor" size={24} color={C.navy} stroke={2.3} /></span>
              <span className="flex-1 min-w-0"><span className="block text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#67E8F9" }}>GESTIONE CYBER CAFÉ</span><span className="block text-[17px] font-extrabold truncate" style={{ fontFamily: FONT_D }}>{shop?.name}</span><span className="flex items-center gap-1.5 text-[12px]" style={{ color: "#C9D3E6" }}><span className="w-[7px] h-[7px] rounded-full" style={{ background: "#34D399" }} />{userName} · {ROLES[role].label.toLowerCase()}</span></span>
              <button type="button" onClick={close} aria-label="Fermer" className="gb-focus w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}><Icon name="x" size={16} stroke={2.4} /></button>
            </div>
            {can.cash ? (
              <div className="relative mt-3.5 grid grid-cols-3 gap-[7px]">
                {[["Encaissé", fmt(day.encaisse), "#67E8F9"], ["Créances", fmt(debts), "#FCD34D"], ["Licence", lic, "#fff"]].map(([l, v, c]) => <div key={l} className="rounded-[13px] px-2.5 py-2 min-w-0" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}><p className="text-[9.5px] font-bold" style={{ color: "#AEBBD2" }}>{l}</p><p className="text-[13px] font-extrabold truncate" style={{ color: c }}>{v}</p></div>)}
              </div>
            ) : <span className="relative mt-3 inline-flex h-[26px] px-2.5 rounded-[13px] items-center text-[11.5px] font-extrabold" style={{ background: "rgba(255,255,255,0.1)", color: "#C9D3E6" }}>{role === "gerante" ? "Accès gérante" : "Accès employé · caisse masquée"}</span>}
          </div>
          <div className="px-3 pt-1">
            {editorOn && <button type="button" onClick={pick(() => onEditorOpen?.())} className="gb-focus mt-2.5 w-full text-left rounded-[18px] p-3 text-white flex items-center gap-3" style={{ background: "linear-gradient(150deg,#10251F,#1C4A3A)" }}><span className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F6C453,#C98A1E)" }}><Icon name="shieldok" size={20} color="#10251F" /></span><span className="flex-1"><span className="block text-[9.5px] font-extrabold tracking-[0.15em]" style={{ color: "#F6C453" }}>ÉDITEUR GESTIONE</span><span className="block text-[14.5px] font-extrabold">Espace propriétaire</span></span></button>}
            {groups.map((g) => (
              <div key={g.t}>
                <p className="pt-3 pb-1.5 px-1.5 text-[10.5px] font-extrabold tracking-[0.1em]" style={{ color: C.muted }}>{g.t}</p>
                <div className="rounded-[16px] overflow-hidden" style={{ background: "#fff", border: `1px solid ${C.line}` }}>{g.rows.map((x, i) => <Row key={x.t} x={x} first={i === 0} />)}</div>
              </div>
            ))}
            <Sub open={openS} setOpen={setOpenS} t="Réglages de l'entreprise" sub={can.settings ? "Tarifs, équipe, annonces, données, licence" : "Mon accès sur ce téléphone"} icon="gear" rows={settingsRows} navy />
            <Sub open={openA} setOpen={setOpenA} t="Assistance" sub={can.support ? "Aide, messagerie et licence" : "Aide · messagerie réservée au propriétaire"} icon="help" rows={helpRows} />
            <button type="button" onClick={pick(onLogout)} className="gb-focus cy-tap mt-3 w-full h-12 rounded-[14px] flex items-center justify-center gap-2 text-[13.5px] font-extrabold" style={{ background: "#fff", border: "1.5px solid #FBCFD8", color: "#BE123C" }}><Icon name="logout" size={16} stroke={2.4} />Se déconnecter</button>
            <p className="mt-2 text-center text-[10.5px]" style={{ color: "#94A3B8" }}>GestiOne Cyber café</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export { Label, Btn, Empty };
