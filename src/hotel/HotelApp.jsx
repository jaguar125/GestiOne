// src/hotel/HotelApp.jsx
//
// Application du type d'entreprise « Hôtel » : Accueil, Chambres (plan,
// en cours, réservations, ménage), Louer, Caisse, Réglages. Branchée dans
// App.jsx à la place des écrans de vente quand l'entreprise est un hôtel.
// Les données (chambres, forfaits, séjours, réservations) sont enregistrées
// sur le téléphone puis synchronisées avec le serveur comme le reste de
// GestiOne (fonctionne hors connexion).

import { useEffect, useMemo, useRef, useState } from "react";
import { uiSound } from "../tapSound.js";
import { MomoPicker, DEFAULT_MOMO, momoName, momoLabel } from "../MomoPicker.jsx";
import {
  H, Icon, Btn, Card, Label, Segmented, Chip, Toggle, Stepper, TopBar, RoomBadge, Field, inputStyle, Sheet, Empty,
} from "./HotelUI.jsx";
import {
  ROOM_TYPES, roomTypeOf, hotelSettingsOf, releaseMessage, cleaningMessage, defaultTariffs, computeEnd, nightCheckout, isNight, toMs, stayTotal, stayPaid, stayDue,
  isActiveStay, isLiveResa, roomConflicts, roomState, STATE_STYLE, sortRooms, freeRoomsFor, hotelCashForDay, remindersDue,
  stayAlertsDue, extensionPrice, overtimeHours, fmtClock, fmtShort, hmOf, pad2, dayBounds, dayLabel, HOUR, DAY, localDayKey,
  makeStayReceipt, makeResaReceipt,
} from "./hotelLogic.js";
import { ReceiptScreen, ReceiptsScreen, ReceiptSettingsScreen, PaySheet, CancelSheet, CashGiven } from "./HotelReceipts.jsx";
import { HistoryScreen, InventoryScreen, ProfitScreen } from "./HotelReports.jsx";
import { HotelMenuDrawer, RulesScreen, AnnounceScreen, FaqScreen, BackupScreen } from "./HotelMenu.jsx";
import { scheduleHotelReminders } from "./hotelNotifications.js";
import GuestFlow, { GuestView } from "./GuestFlow.jsx";
import { flushPhotos, purgeOldPhotos, guestFullName } from "./hotelPhotos.js";
import {
  CashScreen, TarifsScreen, FormuleScreen, RoomsConfigScreen, SyncScreen, ExpensesScreen, StaffScreen,
  LicenceScreen, OrderLicenceScreen, NewResaScreen,
} from "./HotelAdmin.jsx";

const rid = () => Math.random().toString(36).slice(2, 10);
const PAY_LABEL = { cash: "Espèces", momo: "Mobile Money", later: "À la sortie" };
// Hauteur de la barre d'état du téléphone (heure, réseau, batterie).
const STATUS_H = "max(40px, env(safe-area-inset-top))";

export default function HotelApp(props) {
  const {
    shop, role, userName, staff, rooms = [], tariffs = [], stays = [], reservations = [], guests = [], expenses = [], save, fmt,
    pushToast, speak, notify, onLogout, sync, license, licenseStatus, onActivateLicense, pricing, onOrderLicense,
    staffApi, renderInvites, routeSignal, editorOn = false, onEditorOpen,
    verifyOwnerPin, onOpenSupport, onOpenLegal, faq = [],
  } = props;
  const settings = hotelSettingsOf(shop);
  const isOwner = role === "admin";
  const isTech = !isOwner && staff?.hotelRole === "technicien";
  const [tab, setTab] = useState(isTech ? "rooms" : "home");
  const [roomsTab, setRoomsTab] = useState(isTech ? "menage" : "plan");
  const [route, setRoute] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [rentPreset, setRentPreset] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  // Photos des pièces : envoi de celles en attente, purge des plus de 12 mois.
  useEffect(() => {
    if (!shop?.id) return undefined;
    purgeOldPhotos(shop.id).catch(() => {});
    flushPhotos(shop.id).catch(() => {});
    const on = () => flushPhotos(shop.id).catch(() => {});
    window.addEventListener("online", on);
    const t = setInterval(on, 120000);
    return () => { window.removeEventListener("online", on); clearInterval(t); };
  }, [shop?.id]);
  useEffect(() => { try { window.scrollTo(0, 0); } catch { /* ignore */ } }, [tab, route?.name, roomsTab]);
  // Ouverture d'un écran depuis l'extérieur (ex. « Acheter une licence » dans la bulle d'assistance).
  useEffect(() => { if (routeSignal?.n && isOwner) { setMenuOpen(false); setRoute({ name: routeSignal.name, back: { name: "licence" } }); } }, [routeSignal?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Forfaits de départ, une seule fois, à la première ouverture par le propriétaire.
  useEffect(() => {
    if (isOwner && Array.isArray(tariffs) && tariffs.length === 0 && !shop?.hotelSeeded) {
      save.tariffs(defaultTariffs());
      save.shopMeta({ ...shop, hotelSeeded: true, hotelSettings: settings });
    }
  }, [isOwner, tariffs.length, shop?.hotelSeeded]); // eslint-disable-line react-hooks/exhaustive-deps

  const roomsSorted = useMemo(() => sortRooms(rooms), [rooms]);
  const ctxData = { stays, reservations, now };
  const roomById = (id) => rooms.find((r) => r.id === id);
  const by = userName || (isOwner ? "Propriétaire" : "Réception");
  const nowIso = () => new Date().toISOString();

  // ---------- Actions ----------
  const patchRoom = (id, patch) => save.rooms(rooms.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r)));
  const patchStay = (id, fn) => save.stays(stays.map((s) => (s.id === id ? { ...fn(s), updatedAt: nowIso() } : s)));
  const patchResa = (id, patch) => save.reservations(reservations.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r)));

  const startStay = ({ room, tariff, client = "", phone = "", payMode = "cash", op = "", resa = null, guestId = null, given = null }) => {
    const start = Date.now();
    const end = computeEnd(start, tariff, settings);
    const conflicts = roomConflicts(room.id, start, end, { stays, reservations, now: start, excludeResaId: resa?.id });
    if (conflicts.length) {
      const c = conflicts[0];
      pushToast(c.kind === "resa" ? `Chambre ${room.num} réservée à ${hmOf(c.start)} : choisissez une autre chambre ou un forfait plus court` : `Chambre ${room.num} déjà occupée`, "error");
      return null;
    }
    const price = Number(tariff.price) || 0;
    const payments = [];
    if (resa && Number(resa.deposit) > 0) payments.push({ id: rid(), at: toMs(resa.depositAt || resa.createdAt || start) || start, amount: Number(resa.deposit), mode: resa.depositMode || "cash", op: resa.depositMode === "momo" ? momoName(resa.depositOp) || DEFAULT_MOMO : "", by: resa.by || by, label: "Acompte réservation" });
    const already = payments.reduce((t, p) => t + p.amount, 0);
    const nowPaid = payMode !== "later" && price - already > 0 ? price - already : 0;
    if (nowPaid > 0) payments.push({ id: rid(), at: start, amount: nowPaid, mode: payMode, op: payMode === "momo" ? op || DEFAULT_MOMO : "", by, label: tariff.name, given: payMode === "cash" && Number(given) > nowPaid ? Number(given) : nowPaid });
    const stay = {
      id: rid(), roomId: room.id, roomNum: room.num, type: room.type, tariffId: tariff.id, tariffName: tariff.name, hours: Number(tariff.hours) || 0,
      price, start, end, client: client.trim(), phone: phone.trim(), payMode, payments, extensions: [], extras: [], status: "active", by,
      resaId: resa?.id || null, guestId: guestId || resa?.guestId || null, createdAt: nowIso(), updatedAt: nowIso(),
    };
    // Reçu de la location (passage ou nuitée), même si le paiement est pour plus tard.
    stay.receipts = [makeStayReceipt(stay, { kind: "start", amount: nowPaid, given, mode: nowPaid > 0 ? payMode : "later", op: payMode === "momo" ? op || DEFAULT_MOMO : "", by, at: start })];
    save.stays([stay, ...stays]);
    if (room.cleaning) patchRoom(room.id, { cleaning: null });
    if (resa) patchResa(resa.id, { status: "arrived", stayId: stay.id, arrivedAt: nowIso(), guestId: stay.guestId, client: stay.client || resa.client, phone: stay.phone || resa.phone });
    pushToast(`Chambre ${room.num} : ${tariff.name} démarré${isNight(tariff) ? "e" : ""} · fin ${isNight(tariff) ? `demain ${settings.checkoutTime}` : hmOf(end)}`, "ok");
    say(isNight(tariff) ? `La chambre ${room.num} vient d'être louée pour la nuit.` : `La chambre ${room.num} vient d'être louée, ${tariff.name}.`, `start:${stay.id}`);
    return stay;
  };

  const extendStay = (stay, hours = 1) => {
    const amount = extensionPrice(stay, settings) * hours;
    const newEnd = toMs(stay.end) + hours * HOUR;
    const conflicts = roomConflicts(stay.roomId, toMs(stay.end), newEnd, { stays, reservations, now: Date.now(), excludeStayId: stay.id });
    if (conflicts.length) { pushToast(`Impossible : chambre ${stay.roomNum} réservée à ${hmOf(conflicts[0].start)}`, "error"); return; }
    const ext = { id: rid(), at: Date.now(), kind: "hour", hours, amount, by };
    patchStay(stay.id, (s) => ({ ...s, end: newEnd, extensions: [...(s.extensions || []), ext] }));
    pushToast(`+${hours} h · fin à ${hmOf(newEnd)} · ${fmt(amount)} à encaisser`, "ok");
    say(`La chambre ${stay.roomNum} vient de prendre ${hours === 1 ? "une heure" : plural(hours, "heure")} de plus.`, `ext:${ext.id}`);
  };

  const toNight = (stay) => {
    const night = tariffs.find((t) => t.type === stay.type && isNight(t) && t.active !== false);
    const nightPrice = Number(night?.price) || 0;
    const newEnd = nightCheckout(toMs(stay.start), settings.checkoutTime);
    const conflicts = roomConflicts(stay.roomId, toMs(stay.end), newEnd, { stays, reservations, now: Date.now(), excludeStayId: stay.id });
    if (conflicts.length) { pushToast(`Impossible : chambre ${stay.roomNum} réservée à ${hmOf(conflicts[0].start)}`, "error"); return; }
    const current = (Number(stay.price) || 0) + (stay.extensions || []).reduce((t, e) => t + (Number(e.amount) || 0), 0);
    const diff = Math.max(0, nightPrice - current);
    const ext = { id: rid(), at: Date.now(), kind: "night", amount: diff, by };
    patchStay(stay.id, (s) => ({ ...s, end: newEnd, hours: 0, tariffName: night?.name || "Nuitée", extensions: [...(s.extensions || []), ext] }));
    say(`La chambre ${stay.roomNum} vient d'être conservée pour la nuit.`, `ext:${ext.id}`);
    pushToast(`Passé en nuitée · départ ${dayLabel(newEnd)} ${hmOf(newEnd)}${diff ? ` · ${fmt(diff)} à encaisser` : ""}`, "ok");
  };

  const addExtra = (stay, label, amount) => {
    if (!(amount > 0)) return;
    if (shop?.soundsEnabled !== false) uiSound("add");
    patchStay(stay.id, (s) => ({ ...s, extras: [...(s.extras || []), { id: rid(), at: Date.now(), label, amount, by }] }));
    pushToast(`${label} ajouté : ${fmt(amount)}`, "ok");
    say(`${label} ajouté à la chambre ${stay.roomNum}, pour ${amount} francs CFA.`);
  };

  const collect = (stay, mode = "cash", { given = null, op = "" } = {}) => {
    const opName = mode === "momo" ? op || DEFAULT_MOMO : "";
    if (shop?.soundsEnabled !== false) uiSound("sale");
    const due = stayDue(stay);
    if (!(due > 0)) return null;
    const at = Date.now();
    const paid = { ...stay, payments: [...(stay.payments || []), { id: rid(), at, amount: due, mode, op: opName, by, label: "Encaissement", given: mode === "cash" && Number(given) > due ? Number(given) : due }] };
    const rc = makeStayReceipt(paid, { kind: "collect", amount: due, given, mode, op: opName, by, at });
    patchStay(stay.id, (s) => ({ ...s, payments: [...(s.payments || []), paid.payments[paid.payments.length - 1]], receipts: [...(s.receipts || []), rc] }));
    pushToast(`${fmt(due)} encaissé (${mode === "momo" ? momoLabel(opName) : PAY_LABEL[mode]})${mode === "cash" && rc.change > 0 ? ` · monnaie ${fmt(rc.change)}` : ""}`, "ok");
    say(`Paiement de ${Math.round(due)} francs CFA reçu pour la chambre ${stay.roomNum}${mode === "momo" ? `, par ${momoName(opName)}` : ", en espèces"}.`);
    return rc;
  };

  // Annulation d'un séjour : propriétaire uniquement. Le reçu reste, marqué ANNULÉ.
  const cancelStay = (stay, { reason = "", refund = false } = {}) => {
    if (!isOwner) { pushToast("Réservé au propriétaire", "error"); return; }
    const at = Date.now();
    const paid = stayPaid(stay);
    const cancel = { at, by, reason, refund: refund ? paid : 0 };
    save.stays(stays.map((s) => (s.id === stay.id ? {
      ...s, status: "cancelled", cancelledAt: at, cancelledBy: by, cancelReason: reason, refunded: refund && paid > 0 ? paid : 0,
      releasedAt: s.releasedAt || at,
      payments: refund && paid > 0 ? [...(s.payments || []), { id: rid(), at, amount: -paid, mode: "cash", by, label: "Remboursement (annulation)" }] : s.payments,
      receipts: (s.receipts || []).map((r) => ({ ...r, status: "cancelled", cancel })), updatedAt: nowIso(),
    } : s)));
    if (stay.status === "active" && settings.cleaningRequired) patchRoom(stay.roomId, { cleaning: { state: "wait", since: at, stayId: stay.id } });
    pushToast(`Séjour de la chambre ${stay.roomNum} annulé${refund && paid > 0 ? ` · ${fmt(paid)} remboursé` : ""}`, "ok");
    say(`Le séjour de la chambre ${stay.roomNum} vient d'être annulé.`);
  };

  const seenRef = useRef(new Set());
  const once = (k) => {
    if (seenRef.current.has(k)) return false;
    seenRef.current.add(k);
    try { if (localStorage.getItem(`hotelAlert:${k}`)) return false; localStorage.setItem(`hotelAlert:${k}`, String(Date.now())); } catch { /* ignore */ }
    return true;
  };
  // Annonce vocale d'une action (réglage « Annonces vocales »). La clé évite
  // que ce téléphone répète l'annonce quand l'action revient par la synchro.
  const say = (msg, key) => { if (key) once(key); if (settings.voiceAlerts !== false) speak?.(msg); };
  const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;
  // Annonce écrite et vocale d'une chambre libérée (réglable par le propriétaire).
  const announceRelease = (roomNum) => {
    const msg = releaseMessage(roomNum, settings.cleaningRequired);
    pushToast(settings.cleaningRequired ? `Chambre ${roomNum} libérée · ménage à faire` : `Chambre ${roomNum} libérée`, "ok");
    if (settings.releaseNotify) notify?.(settings.cleaningRequired ? `Chambre ${roomNum} · ménage` : `Chambre ${roomNum} libérée`, msg);
    if (settings.releaseVoice) speak?.(msg);
  };

  const releaseStay = (stay, { force } = {}) => {
    const due = stayDue(stay);
    if (due > 0 && !force) {
      if (!window.confirm(`Il reste ${fmt(due)} à encaisser pour la chambre ${stay.roomNum}.\n\nLibérer quand même ? (le montant restera dans « À encaisser »)`)) return false;
    }
    save.stays(stays.map((s) => (s.id === stay.id ? { ...s, status: "done", releasedAt: Date.now(), releasedBy: by, updatedAt: nowIso() } : s)));
    if (settings.cleaningRequired) patchRoom(stay.roomId, { cleaning: { state: "wait", since: Date.now(), stayId: stay.id } });
    once(`rel:${stay.id}`); // ce téléphone annonce tout de suite, pas une 2e fois après synchro
    announceRelease(stay.roomNum);
    return true;
  };

  const changeRoom = (stay, room) => {
    const conflicts = roomConflicts(room.id, Date.now(), Math.max(toMs(stay.end), Date.now() + 60000), { stays, reservations, now: Date.now() });
    if (conflicts.length) { pushToast(`Chambre ${room.num} indisponible`, "error"); return; }
    save.stays(stays.map((s) => (s.id === stay.id ? { ...s, roomId: room.id, roomNum: room.num, movedFrom: stay.roomNum, updatedAt: nowIso() } : s)));
    if (settings.cleaningRequired) save.rooms(rooms.map((r) => (r.id === stay.roomId ? { ...r, cleaning: { state: "wait", since: Date.now() }, updatedAt: nowIso() } : r)));
    pushToast(`Client déplacé de la ${stay.roomNum} à la ${room.num}`, "ok");
    say(`Le client de la chambre ${stay.roomNum} vient d'être déplacé à la chambre ${room.num}.`);
  };

  // Annonce du ménage : sur ce téléphone tout de suite, sur les autres après la synchro.
  const announceCleaning = (roomNum, kind) => {
    const msg = cleaningMessage(roomNum, kind);
    pushToast(kind === "start" ? `Ménage commencé · chambre ${roomNum}` : `Chambre ${roomNum} prête`, "ok");
    if (settings.releaseNotify) notify?.(kind === "start" ? `Chambre ${roomNum} · ménage en cours` : `Chambre ${roomNum} disponible`, msg);
    if (settings.cleaningVoice !== false) speak?.(msg);
  };
  const cleaningStart = (room) => {
    const t = Date.now();
    patchRoom(room.id, { cleaning: { ...(room.cleaning || {}), state: "doing", by, startedAt: t } });
    once(`clean-start:${room.id}:${t}`);
    announceCleaning(room.num, "start");
  };
  // Historique du ménage : chaque chambre garde ses 200 derniers passages.
  const cleaningDone = (room) => {
    const t = Date.now();
    const c = room.cleaning || {};
    const entry = { id: rid(), since: c.since || null, startedAt: c.startedAt || null, doneAt: t, by, stayId: c.stayId || null };
    patchRoom(room.id, { cleaning: null, lastCleanedAt: t, lastCleanedBy: by, cleanLog: [entry, ...(room.cleanLog || [])].slice(0, 200) });
    once(`clean-done:${room.id}:${t}`);
    announceCleaning(room.num, "done");
  };
  const setOutOfService = (room, on, note = "") => {
    const t = Date.now();
    const log = room.issueLog || [];
    const issueLog = on ? [{ id: rid(), at: t, note: note || "Problème signalé", by, fixedAt: null }, ...log].slice(0, 100) : log.map((x, i) => (i === 0 && !x.fixedAt ? { ...x, fixedAt: t, fixedBy: by } : x));
    patchRoom(room.id, { outOfService: on, hsNote: on ? note : "", hsSince: on ? t : null, hsBy: on ? by : null, issueLog, ...(on ? { cleaning: null } : {}) });
    pushToast(on ? `Chambre ${room.num} hors service` : `Chambre ${room.num} remise en service`, "ok");
    say(on ? `La chambre ${room.num} est signalée hors service.` : `La chambre ${room.num} est de nouveau disponible à la location.`);
  };

  const saveReservation = (resa) => {
    const conflicts = roomConflicts(resa.roomId, toMs(resa.start), toMs(resa.end), { stays, reservations, now: Date.now(), excludeResaId: resa.id });
    if (conflicts.length) { pushToast("Cette chambre n'est pas libre sur ce créneau", "error"); return false; }
    const exists = reservations.some((r) => r.id === resa.id);
    let rc = null;
    let item = resa;
    if (!exists) { rc = makeResaReceipt(resa, { by, at: Date.now() }); item = { ...resa, receipts: [rc] }; }
    save.reservations(exists ? reservations.map((r) => (r.id === resa.id ? item : r)) : [item, ...reservations]);
    pushToast(`Réservation enregistrée · chambre ${resa.roomNum} ${dayLabel(toMs(resa.start))} à ${hmOf(toMs(resa.start))}`, "ok");
    say(exists ? `La réservation de la chambre ${resa.roomNum} vient d'être modifiée.` : `Nouvelle réservation pour la chambre ${resa.roomNum}, ${dayLabel(toMs(resa.start)).toLowerCase()} à ${hmOf(toMs(resa.start)).replace(":", " heures ")}.`);
    return rc || true;
  };
  // Annuler ou supprimer une réservation : propriétaire uniquement.
  const cancelReservation = (resa, { reason = "", refund = false, del = false } = {}) => {
    if (!isOwner) { pushToast("Réservé au propriétaire", "error"); return; }
    const at = Date.now();
    const dep = Number(resa.deposit) || 0;
    const cancel = { at, by, reason, refund: refund ? dep : 0 };
    patchResa(resa.id, {
      status: del ? "deleted" : "cancelled", cancelledBy: by, cancelledAt: new Date(at).toISOString(), cancelReason: reason,
      refund: refund && dep > 0 ? { amount: dep, at, by, mode: resa.depositMode || "cash" } : null,
      receipts: (resa.receipts || []).map((r) => ({ ...r, status: "cancelled", cancel })),
    });
    pushToast(del ? "Réservation supprimée · la chambre est de nouveau libre" : "Réservation annulée · la chambre est de nouveau libre", "ok");
    say(`La réservation de la chambre ${resa.roomNum} vient d'être ${del ? "supprimée" : "annulée"}. La chambre est de nouveau libre.`);
  };
  const arriveReservation = (resa, { skipGuest, payMode, op, given, print } = {}) => {
    const room = roomById(resa.roomId);
    const guest = resa.guestId ? guests.find((x) => x.id === resa.guestId) : null;
    // Fiche du client complète (photos de la pièce comprises) avant d'entrer.
    if (!skipGuest && (!guest || guest.photosPending || !(guest.photos || []).length)) {
      setRoute({ name: "guest", mode: guest ? "photos" : "resaArrival", resaId: resa.id, guest, startStep: guest ? 2 : 1 });
      return;
    }
    const tariff = tariffs.find((t) => t.id === resa.tariffId) || { id: resa.tariffId, name: resa.tariffName, hours: resa.hours, price: resa.price };
    if (!room) { pushToast("Chambre introuvable", "error"); return; }
    // Fiche complète : on passe au paiement avant d'ouvrir la chambre.
    if (!payMode) { setRoute({ name: "arrivalPay", resaId: resa.id, guestId: resa.guestId, client: resa.client || "", phone: resa.phone || "" }); return; }
    const stay = startStay({ room, tariff: { ...tariff, price: Number(resa.price) || Number(tariff.price) || 0 }, client: resa.client || "", phone: resa.phone || "", payMode, op, given, resa, guestId: resa.guestId });
    if (stay) {
      if (print) setRoute({ name: "receipt", receipt: stay.receipts[0], fresh: true, back: { name: "stay", id: stay.id } });
      else setRoute({ name: "stay", id: stay.id });
    }
  };

  const actions = { startStay, extendStay, toNight, addExtra, collect, releaseStay, changeRoom, cleaningStart, cleaningDone, setOutOfService, saveReservation, cancelReservation, cancelStay, arriveReservation, patchRoom };

  // ---------- Location, prolongation et nuitée faites sur un autre téléphone ----------
  useEffect(() => {
    const t = Date.now(); const fresh = (ms) => ms && t - Number(ms) < 15 * 60000;
    stays.forEach((st) => {
      if (st.status === "cancelled") return;
      if (fresh(toMs(st.start)) && once(`start:${st.id}`) && settings.voiceAlerts !== false) speak?.(isNight(st) ? `La chambre ${st.roomNum} vient d'être louée pour la nuit.` : `La chambre ${st.roomNum} vient d'être louée, ${st.tariffName}.`);
      (st.extensions || []).forEach((e) => {
        if (!fresh(e.at) || !once(`ext:${e.id}`) || settings.voiceAlerts === false) return;
        speak?.(e.kind === "night" ? `La chambre ${st.roomNum} vient d'être conservée pour la nuit.` : `La chambre ${st.roomNum} vient de prendre ${Number(e.hours) === 1 ? "une heure" : `${e.hours} heures`} de plus.`);
      });
    });
  }, [stays]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Ménage commencé / terminé sur un autre téléphone ----------
  useEffect(() => {
    const t = Date.now();
    rooms.forEach((rm) => {
      const c = rm.cleaning;
      if (c && c.state === "doing" && c.startedAt && t - Number(c.startedAt) < 15 * 60000 && once(`clean-start:${rm.id}:${c.startedAt}`)) announceCleaning(rm.num, "start");
      if (!c && rm.lastCleanedAt && t - Number(rm.lastCleanedAt) < 15 * 60000 && once(`clean-done:${rm.id}:${rm.lastCleanedAt}`)) announceCleaning(rm.num, "done");
    });
  }, [rooms]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Chambre libérée sur un autre téléphone (arrivée par la synchro) ----------
  useEffect(() => {
    const t = Date.now();
    stays.forEach((st) => {
      if (st.status !== "done" || !st.releasedAt || t - Number(st.releasedAt) > 15 * 60000) return;
      if (once(`rel:${st.id}`)) announceRelease(st.roomNum);
    });
  }, [stays]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Alertes : fin de séjour et rappels de réservation ----------
  useEffect(() => {
    if (isTech) return undefined;
    const check = () => {
      const t = Date.now();
      const { soon, ended } = stayAlertsDue(stays, t, settings.endAlertMinutes);
      soon.forEach((s) => { if (once(`soon:${s.id}:${toMs(s.end)}`)) { const msg = `Chambre ${s.roomNum} : fin ${isNight(s) ? "de la nuitée" : "du passage"} dans ${settings.endAlertMinutes} minutes.`; notify?.("Fin bientôt", msg); if (settings.voiceAlerts) speak?.(msg); } });
      ended.forEach((s) => { if (once(`end:${s.id}:${toMs(s.end)}`)) { const msg = `Chambre ${s.roomNum} : le temps est écoulé.`; notify?.("Temps écoulé", msg); if (settings.voiceAlerts) speak?.(`${msg} Libérez ou prolongez.`); } });
      const due = remindersDue(reservations, t, settings.reminderHours);
      if (due.length) {
        due.forEach(({ resa, hours, key }) => {
          if (!once(`resa:${resa.id}:${key}`)) return;
          const when = hmOf(toMs(resa.start));
          const msg = `Rappel. La chambre ${resa.roomNum} est réservée à ${when}${resa.client ? ` pour ${resa.client}` : ""}. Arrivée dans ${hours} heure${hours > 1 ? "s" : ""}.`;
          notify?.(`Réservation dans ${hours} h`, `Chambre ${resa.roomNum} à ${when}${resa.client ? ` · ${resa.client}` : ""}`);
          if (settings.voiceAlerts) speak?.(msg);
          pushToast(`Réservation dans ${hours} h · chambre ${resa.roomNum} à ${when}`, "info");
        });
        save.reservations(reservations.map((r) => {
          const hit = due.filter((d) => d.resa.id === r.id);
          if (!hit.length) return r;
          const notified = { ...(r.notified || {}) };
          hit.forEach((d) => { settings.reminderHours.forEach((h) => { if (h >= d.hours) notified[`r${h}`] = Date.now(); }); });
          return { ...r, notified, updatedAt: nowIso() };
        }));
      }
    };
    check();
    const timer = setInterval(check, 20000);
    return () => clearInterval(timer);
  }, [stays, reservations, isTech, settings.voiceAlerts, settings.endAlertMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isTech) return;
    scheduleHotelReminders(reservations, { hotelName: shop?.name || "Hôtel", hours: settings.reminderHours }).catch?.(() => {});
  }, [reservations, isTech]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Rappel de sauvegarde : le dimanche à partir de 20:00 ----------
  useEffect(() => {
    if (!isOwner || settings.backupRemind === false) return undefined;
    const check = () => {
      const d = new Date();
      if (d.getDay() !== 0 || d.getHours() < 20) return;
      const last = (settings.backupLog || []).find((x) => x.kind === "backup");
      if (last && Date.now() - last.at < 6 * DAY) return;
      if (!once(`backup:${localDayKey(Date.now())}`)) return;
      notify?.("Sauvegarde de l'hôtel", "Pensez à télécharger la sauvegarde de la semaine : Menu › Réglages de l'entreprise › Sauvegarde.");
      pushToast("Pensez à faire la sauvegarde de la semaine (Menu › Sauvegarde)", "info");
    };
    check();
    const t = setInterval(check, 10 * 60000);
    return () => clearInterval(t);
  }, [isOwner, settings.backupRemind, (settings.backupLog || []).length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Accès bloqué ----------
  if (!isOwner && staff?.blocked) {
    return (
      <div className="px-4 pt-10">
        <Empty icon="lock" title="Accès bloqué" text="Votre accès a été bloqué par le propriétaire de l'hôtel. Contactez-le pour le débloquer." action={<Btn kind="navy" icon="logout" onClick={onLogout}>Se déconnecter</Btn>} />
      </div>
    );
  }

  const saveGuest = (gst) => save.guests?.(guests.some((x) => x.id === gst.id) ? guests.map((x) => (x.id === gst.id ? gst : x)) : [gst, ...guests]);
  const ctx = { guests, shopId: shop?.id, saveGuest, staffCount: (staffApi?.vendors || []).length, shop, settings, now, rooms: roomsSorted, tariffs, stays, reservations, expenses, isOwner, isTech, by, fmt, actions, save, pushToast, setRoute, setTab, setRoomsTab, sync, staff, userName, onLogout, speak, notify, announceRelease, editorOn, onEditorOpen, openMenu: () => setMenuOpen(true), openReceipt: (rc, back = route) => setRoute({ name: "receipt", receipt: rc, back }) };
  const go = (name, extra = {}) => setRoute({ name, ...extra });
  const showReceipt = (rc, next) => setRoute({ name: "receipt", receipt: rc, fresh: true, back: next });

  // ---------- Écrans secondaires (sans barre du bas) ----------
  let routed = null;
  if (route) {
    const back = () => setRoute(route.back || null);
    const stay = route.name === "stay" ? stays.find((s) => s.id === route.id) : null;
    if (route.name === "stay" && stay) routed = <StayScreen ctx={ctx} stay={stay} onBack={back} onOpenGuest={(id) => setRoute({ name: "guestView", guestId: id, back: { name: "stay", id: stay.id } })} onReleased={() => { setRoute(null); setTab("rooms"); setRoomsTab("menage"); }} />;
    else if (route.name === "newResa") routed = <NewResaScreen ctx={ctx} onBack={back} preset={route.preset} onSaved={(res) => { setTab("rooms"); setRoomsTab("resa"); if (res !== true && settings.receipt.ask) showReceipt(res, null); else setRoute(null); }} />;
    else if (route.name === "arrivalPay") {
      const resa = reservations.find((x) => x.id === route.resaId);
      routed = resa ? <ArrivalPayScreen ctx={ctx} resa={{ ...resa, guestId: route.guestId || resa.guestId, client: route.client || resa.client, phone: route.phone || resa.phone }} onBack={() => setRoute(null)}
        onConfirm={(opts) => arriveReservation({ ...resa, guestId: route.guestId || resa.guestId, client: route.client || resa.client, phone: route.phone || resa.phone }, { skipGuest: true, ...opts })} /> : null;
    }
    else if (route.name === "guest") {
      const resa = route.pendingResa || (route.resaId ? reservations.find((x) => x.id === route.resaId) : null);
      const p = route.pending;
      const room = p ? p.room : resa ? roomById(resa.roomId) : null;
      const tariff = p ? p.tariff : resa ? { name: resa.tariffName, hours: resa.hours } : null;
      const info = room && tariff ? { room, tariff, start: p ? Date.now() : toMs(resa.start), end: p ? computeEnd(Date.now(), p.tariff, settings) : toMs(resa.end), price: p ? Number(p.tariff.price) || 0 : Number(resa.price) || 0, payLabel: p ? PAY_LABEL[p.payMode] : null } : null;
      const flowMode = route.mode === "resa" ? "resa" : route.mode === "photosOnly" ? "photos" : route.mode === "night" ? "night" : "arrival";
      routed = (
        <GuestFlow key={route.resaId || route.mode} ctx={ctx} info={info} mode={flowMode} startStep={route.startStep || 1}
          initialGuest={route.guest || (route.prefill ? { lastName: route.prefill.lastName || "", phone: route.prefill.phone || "" } : null)}
          onCancel={back}
          onDone={async (gst) => {
            saveGuest(gst);
            const name = guestFullName(gst);
            if (route.mode === "resa") {
              const res = actions.saveReservation({ ...route.pendingResa, guestId: gst.id, client: name, phone: gst.phone });
              if (res) {
                setTab("rooms"); setRoomsTab("resa");
                if (res !== true && settings.receipt.ask) showReceipt(res, null); else setRoute(null);
              }
            } else if (route.mode === "night") {
              const s = startStay({ room: p.room, tariff: p.tariff, client: name, phone: gst.phone, payMode: p.payMode, op: p.op, guestId: gst.id, given: p.given });
              if (s) { setRentPreset(null); if (p.print) showReceipt(s.receipts[0], { name: "stay", id: s.id }); else setRoute({ name: "stay", id: s.id }); }
            } else if (route.mode === "photosOnly") {
              setRoute(route.back || null);
            } else if (resa) {
              arriveReservation({ ...resa, guestId: gst.id, client: name, phone: gst.phone }, { skipGuest: true });
            }
          }} />
      );
    }
    else if (route.name === "guestView") {
      const gst = guests.find((x) => x.id === route.guestId);
      routed = gst ? <GuestView ctx={ctx} guest={gst} onBack={back} onAddPhotos={() => setRoute({ name: "guest", mode: "photosOnly", guest: gst, startStep: 2, back: route })} /> : null;
    }
    else if (route.name === "tarifs") routed = <TarifsScreen ctx={ctx} onBack={back} onEdit={(t, type) => setRoute({ name: "formule", tariff: t, type, back: { name: "tarifs" } })} />;
    else if (route.name === "formule") routed = <FormuleScreen ctx={ctx} onBack={back} tariff={route.tariff} type={route.type} />;
    else if (route.name === "roomsConfig") routed = <RoomsConfigScreen ctx={ctx} onBack={back} />;
    else if (route.name === "sync") routed = <SyncScreen ctx={ctx} onBack={back} />;
    else if (route.name === "expenses") routed = <ExpensesScreen ctx={ctx} onBack={back} />;
    else if (route.name === "staff" && isOwner) routed = <StaffScreen ctx={ctx} onBack={back} staffApi={staffApi} renderInvites={renderInvites} />;
    else if (route.name === "licence" && isOwner) routed = <LicenceScreen ctx={ctx} onBack={back} license={license} licenseStatus={licenseStatus} onActivate={onActivateLicense} pricing={pricing} onOrder={(planId) => setRoute({ name: "order", planId, back: { name: "licence" } })} />;
    else if (route.name === "receipt" && route.receipt) routed = <ReceiptScreen ctx={ctx} receipt={route.receipt} fresh={route.fresh} onBack={back} onDone={back} />;
    else if (route.name === "receipts" && isOwner) routed = <ReceiptsScreen ctx={ctx} onBack={back} openReceipt={(rc) => setRoute({ name: "receipt", receipt: rc, back: route })} />;
    else if (route.name === "receiptSettings" && isOwner) routed = <ReceiptSettingsScreen ctx={ctx} onBack={back} />;
    else if (route.name === "history" && isOwner) routed = <HistoryScreen ctx={ctx} onBack={back} openReceipt={(rc) => setRoute({ name: "receipt", receipt: rc, back: route })} />;
    else if (route.name === "inventory" && isOwner) routed = <InventoryScreen ctx={ctx} onBack={back} />;
    else if (route.name === "profits" && isOwner) routed = <ProfitScreen ctx={ctx} onBack={back} />;
    else if (route.name === "rules" && isOwner) routed = <RulesScreen ctx={ctx} onBack={back} />;
    else if (route.name === "announce" && isOwner) routed = <AnnounceScreen ctx={ctx} onBack={back} />;
    else if (route.name === "backup" && isOwner) routed = <BackupScreen ctx={ctx} onBack={back} verifyOwnerPin={verifyOwnerPin} />;
    else if (route.name === "faq") routed = <FaqScreen faq={faq} onBack={back} onSupport={onOpenSupport ? () => onOpenSupport() : null} />;
    else if (route.name === "order" && isOwner) routed = <OrderLicenceScreen ctx={ctx} onBack={back} pricing={pricing} planId={route.planId} onSend={(msg, who) => { onOrderLicense?.(msg, who); setRoute(null); }} />;
    else routed = null;
  }

  return (
    <div className="px-4" style={{ color: H.ink }}>
      {/* Bande de la barre d'état du téléphone : l'heure, le réseau et la
          batterie restent sur un fond uni, séparés de la page qui défile
          dessous. Hauteur réelle de la barre, 40 px au minimum (anciennes
          WebView Android qui ne la donnent pas). */}
      <div aria-hidden="true" className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] z-40 no-print"
        style={{ height: STATUS_H, background: "linear-gradient(90deg, #0B1628 0%, #14294A 100%)", boxShadow: "0 4px 12px -6px rgba(11,22,40,0.5)" }} />
      <div aria-hidden="true" style={{ height: `calc(${STATUS_H} - max(22px, env(safe-area-inset-top)) + 10px)` }} />
      {routed || (
        <>
          {tab === "home" && !isTech && <HomeScreen ctx={ctx} openStay={(s) => go("stay", { id: s.id })} goRooms={(t) => { setTab("rooms"); setRoomsTab(t); }} goCash={() => setTab("cash")} goRent={() => setTab("rent")} />}
          {tab === "rooms" && (
            <RoomsScreen ctx={ctx} tab={roomsTab} setTab={setRoomsTab}
              openStay={(s) => go("stay", { id: s.id })}
              rentRoom={(room) => { setRentPreset({ roomId: room.id, type: room.type, n: Date.now() }); setTab("rent"); }}
              newResa={(preset) => go("newResa", { preset })} />
          )}
          {tab === "rent" && !isTech && <RentScreen ctx={ctx} preset={rentPreset} onStarted={(s, print) => { setRentPreset(null); if (print) showReceipt(s.receipts[0], { name: "stay", id: s.id }); else go("stay", { id: s.id }); }} onReserve={() => go("newResa")} onNeedGuest={(pending) => setRoute({ name: "guest", mode: "night", pending, prefill: pending.prefill })} />}
          {tab === "cash" && !isTech && <CashScreen ctx={ctx} openStay={(s) => go("stay", { id: s.id })} openExpenses={() => go("expenses")} />}
        </>
      )}
      <div aria-hidden="true" style={{ height: isTech ? "calc(40px + env(safe-area-inset-bottom))" : "calc(118px + env(safe-area-inset-bottom))" }} />
      {!routed && !isTech && <BottomNav tab={tab} setTab={(t) => { setRoute(null); setTab(t); }} onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} badges={{ rooms: stays.filter((s) => isActiveStay(s) && toMs(s.end) < now).length }} />}
      {menuOpen && (
        <HotelMenuDrawer ctx={ctx} tab={routed ? route?.name : tab} license={license} licenseStatus={licenseStatus} faq={faq}
          onClose={() => setMenuOpen(false)}
          onTab={(t) => { setRoute(null); setTab(t); }}
          go={(name) => setRoute({ name })}
          onSupport={() => onOpenSupport?.()}
          onLegal={onOpenLegal || null} />
      )}
    </div>
  );
}

// ---------- Barre du bas ----------
function BottomNav({ tab, setTab, onMenu, menuOpen, badges }) {
  const items = [{ id: "home", label: "Accueil", icon: "home" }, { id: "rooms", label: "Chambres", icon: "bed" }, { id: "rent", label: "Louer", icon: "plus", center: true }, { id: "cash", label: "Caisse", icon: "wallet" }, { id: "menu", label: "Menu", icon: "grid", menu: true }];
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] px-3 z-30 no-print" style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))", background: "linear-gradient(to top, #EEF2F8 70%, rgba(244,245,248,0))", paddingTop: 14 }}>
      <nav aria-label="Menu de l'hôtel" className="rounded-[24px] grid items-center" style={{ height: 68, background: "#fff", boxShadow: "0 6px 24px rgba(10,23,48,0.14)", gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const on = tab === it.id;
          if (it.menu) {
            return (
              <button key={it.id} type="button" onClick={onMenu} aria-label="Menu" aria-expanded={!!menuOpen} className="gb-focus flex flex-col items-center gap-[3px] text-[10.5px] font-extrabold" style={{ color: H.navy }}>
                <span className="flex items-center justify-center" style={{ width: 34, height: 30, borderRadius: 10, background: "linear-gradient(135deg,#17305A,#0A1730)", boxShadow: "0 6px 14px -6px rgba(14,28,51,0.8)" }}><Icon name="grid" size={16} color="#fff" stroke={2.3} /></span>
                {it.label}
              </button>
            );
          }
          if (it.center) {
            return (
              <button key={it.id} type="button" onClick={() => setTab(it.id)} className="gb-focus flex flex-col items-center gap-[3px] text-[10.5px] font-extrabold" style={{ marginTop: -30, color: H.navy }} aria-current={on ? "page" : undefined}>
                <span className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 19, background: H.gold, border: "4px solid #EEF2F8", boxShadow: "0 8px 18px rgba(8,145,178,0.45)" }}><Icon name="plus" size={24} color={H.navy} stroke={2.8} /></span>
                {it.label}
              </button>
            );
          }
          return (
            <button key={it.id} type="button" onClick={() => setTab(it.id)} className="gb-focus relative flex flex-col items-center gap-[3px] text-[10.5px]" style={{ color: on ? H.navy : "#8A94A6", fontWeight: on ? 800 : 700 }} aria-current={on ? "page" : undefined} aria-label={badges[it.id] > 0 ? `${it.label} (${badges[it.id]} en alerte)` : it.label}>
              <span className="relative"><Icon name={it.icon} size={22} stroke={on ? 2.3 : 2} />{badges[it.id] > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-extrabold text-white flex items-center justify-center" style={{ background: "#EA7A0C" }}>{badges[it.id]}</span>}</span>
              {it.label}
              <span style={{ width: 16, height: 3, borderRadius: 2, background: on ? H.gold : "transparent" }} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ---------- Accueil ----------
function HomeScreen({ ctx, openStay, goRooms, goCash, goRent }) {
  const { shop, rooms, stays, reservations, now, fmt, expenses, isOwner, userName, sync } = ctx;
  const states = rooms.map((r) => roomState(r, ctx));
  const count = (k) => states.filter((s) => s.kind === k).length;
  const occupied = count("occupee") + count("depassee");
  const total = rooms.filter((r) => !r.outOfService).length || 0;
  const pct = total ? Math.round((occupied / total) * 100) : 0;
  const cash = hotelCashForDay({ stays, expenses, reservations, now });
  const active = stays.filter(isActiveStay).sort((a, b) => toMs(a.end) - toMs(b.end));
  const overdue = active.filter((s) => toMs(s.end) < now);
  const upcoming = active.filter((s) => toMs(s.end) >= now).slice(0, 3);
  const [d0, d1] = dayBounds(now);
  const todayResas = reservations.filter((r) => isLiveResa(r) && toMs(r.start) >= now - HOUR && toMs(r.start) < d1).sort((a, b) => toMs(a.start) - toMs(b.start));
  const dateTxt = new Date(now).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div>
      <div className="-mx-4 px-4 pt-3 pb-5 rounded-b-[32px] text-white" style={{ background: H.navy }}>
        <div className="flex items-center gap-3">
          <span className="w-[46px] h-[46px] rounded-[15px] flex items-center justify-center shrink-0" style={{ background: H.gold }}><Icon name="bed" size={24} color={H.navy} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-extrabold truncate">{shop?.name || "Mon hôtel"}</p>
            <p className="text-[12.5px] truncate" style={{ color: "#B8C4D6" }}>{dateTxt} · {hmOf(now)} · {userName || (isOwner ? "Propriétaire" : "Réception")}</p>
          </div>
          {sync && <span className="shrink-0 text-[11px] font-extrabold px-2.5 py-1.5 rounded-[10px] flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.10)", color: sync.pending > 0 ? "#FCD34D" : "#9BF0CF" }}><Icon name="sync" size={13} />{sync.pending > 0 ? `${sync.pending} en attente` : "À jour"}</span>}
        </div>
        <button type="button" onClick={() => goRooms("plan")} className="gb-focus mt-4 w-full flex items-center gap-4 text-left">
          <span className="rounded-full flex items-center justify-center shrink-0" style={{ width: 96, height: 96, background: `conic-gradient(${H.gold} 0 ${pct * 3.6}deg, rgba(255,255,255,0.12) 0)` }}>
            <span className="rounded-full flex flex-col items-center justify-center" style={{ width: 78, height: 78, background: H.navy }}>
              <span className="text-[23px] font-extrabold leading-none">{pct}%</span>
              <span className="text-[10.5px] mt-1" style={{ color: "#B8C4D6" }}>occupation</span>
            </span>
          </span>
          <span className="flex-1 grid grid-cols-2 gap-2">
            {[["Libres", count("libre") + count("reservee"), "#34D399"], ["Occupées", occupied, "#F87171"], ["Dépassées", count("depassee"), "#FB923C"], ["Ménage", count("menage"), "#A78BFA"]].map(([l, n, c]) => (
              <span key={l} className="rounded-[14px] px-2.5 py-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c }} /><span className="text-[19px] font-extrabold">{n}</span></span>
                <span className="block text-[11px]" style={{ color: "#C9D3E1" }}>{l}</span>
              </span>
            ))}
          </span>
        </button>
      </div>

      {rooms.length === 0 && (
        <div className="mt-4">
          <Empty icon="hash" title="Aucune chambre enregistrée" text={isOwner ? "Ajoutez les numéros de vos chambres (ventilées et climatisées) pour commencer." : "Le propriétaire doit d'abord enregistrer les chambres dans Réglages."} action={isOwner ? <Btn kind="gold" icon="plus" onClick={() => ctx.setRoute({ name: "roomsConfig" })}>Ajouter mes chambres</Btn> : null} />
        </div>
      )}

      <Card onClick={goCash} className="mt-3.5 px-4 py-3.5">
        <div className="flex items-center justify-between"><span className="text-[12.5px] font-bold" style={{ color: H.muted }}>Recette nette du jour</span><Icon name="chev" size={16} color="#94A3B8" /></div>
        <p className="text-[28px] font-extrabold tracking-tight mt-0.5">{fmt(cash.net)}</p>
        <div className="mt-2.5 pt-2.5 grid grid-cols-3 gap-2" style={{ borderTop: `1px solid ${H.line}` }}>
          <span><span className="block text-[11px]" style={{ color: H.muted }}>Encaissé · {cash.passages + cash.nuitees}</span><span className="block text-[14px] font-extrabold">{fmt(cash.total)}</span></span>
          <span><span className="block text-[11px]" style={{ color: H.muted }}>Dépenses</span><span className="block text-[14px] font-extrabold" style={{ color: H.red }}>−{fmt(cash.expensesTotal)}</span></span>
          <span><span className="block text-[11px]" style={{ color: H.muted }}>À encaisser</span><span className="block text-[14px] font-extrabold" style={{ color: H.orange }}>{fmt(cash.pendingTotal)}</span></span>
        </div>
      </Card>

      {overdue.map((s) => (
        <div key={s.id} className="mt-3 flex items-center gap-3 rounded-[18px] px-3 py-2.5" style={{ background: "#FFF4E6", border: "1.5px solid #F7C58A" }}>
          <span className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: "#EA7A0C" }}><Icon name="clock" size={20} color="#fff" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-extrabold truncate" style={{ color: "#7C2D12" }}>Chambre {s.roomNum} · temps dépassé</p>
            <p className="text-[12px] truncate" style={{ color: "#9A3412" }}>{s.tariffName}{s.client ? ` · ${s.client}` : ""} · <span className="font-mono font-bold">{fmtClock(now - toMs(s.end)).replace(/^/, "+")}</span></p>
          </div>
          <Btn kind="navy" onClick={() => openStay(s)} className="!min-h-[40px] !px-3.5 !text-[13px]">Gérer</Btn>
        </div>
      ))}

      {todayResas.length > 0 && (
        <>
          <Label right={<button type="button" onClick={() => goRooms("resa")} className="gb-focus text-[12.5px] font-extrabold" style={{ color: H.goldDark }}>Voir ›</button>}>Réservations du jour</Label>
          <Card className="px-3">
            {todayResas.slice(0, 3).map((r, i, a) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i === a.length - 1 ? "none" : `1px solid ${H.line2}` }}>
                <span className="w-[54px] text-center rounded-[12px] py-1.5 shrink-0" style={{ background: H.indigoSoft, color: "#3730A3" }}><span className="block text-[15px] font-extrabold">{hmOf(toMs(r.start))}</span></span>
                <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{r.client || "Client"}</span><span className="block text-[11.5px] truncate" style={{ color: H.muted }}>Ch. {r.roomNum} · {r.tariffName}</span></span>
                <span className="text-[11.5px] font-extrabold shrink-0" style={{ color: "#3730A3" }}>{fmtShort(toMs(r.start) - now).replace("+", "")}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <Label right={active.length ? <button type="button" onClick={() => goRooms("encours")} className="gb-focus text-[12.5px] font-extrabold" style={{ color: H.goldDark }}>Voir les {active.length} ›</button> : null}>Fins les plus proches</Label>
      {upcoming.length === 0 ? (
        rooms.length > 0 && <Empty icon="bed" title="Aucune chambre en cours" text="Louez une chambre avec le bouton doré « Louer »." action={<Btn kind="gold" icon="plus" onClick={goRent}>Louer une chambre</Btn>} />
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((s) => <StayRow key={s.id} s={s} now={now} fmt={fmt} onClick={() => openStay(s)} />)}
        </div>
      )}
    </div>
  );
}

function StayRow({ s, now, fmt, onClick, actions }) {
  const end = toMs(s.end);
  const left = end - now;
  const over = left < 0;
  const low = !over && left < 10 * 60000;
  const color = over ? H.orange : low ? "#DC2626" : H.green;
  const total = Math.max(1, end - toMs(s.start));
  const pct = over ? 100 : Math.max(3, Math.round((1 - left / total) * 100));
  return (
    <div className="rounded-[18px] px-3 py-2.5" style={{ background: over ? "#FFFBF5" : "#fff", border: `1.5px solid ${over ? "#F7C58A" : "#fff"}`, boxShadow: H.shadow }}>
      <button type="button" onClick={onClick} className="gb-focus w-full flex items-center gap-3 text-left">
        <RoomBadge num={s.roomNum} type={s.type} />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-extrabold truncate">{s.tariffName}</span>
          <span className="block text-[11.5px] truncate" style={{ color: H.muted }}>{[s.client, fmt(stayTotal(s)), stayDue(s) > 0 ? "à encaisser" : "payé", isNight(s) ? `départ ${dayLabel(end, now)} ${hmOf(end)}` : `fin ${hmOf(end)}`].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="text-right shrink-0">
          <span className="block font-mono text-[17px] font-bold" style={{ color }}>{over ? `+${fmtClock(-left).replace("+", "")}` : fmtClock(left)}</span>
          <span className="block text-[10px] font-extrabold tracking-[0.04em]" style={{ color }}>{over ? "DÉPASSÉE" : low ? "BIENTÔT FINI" : "RESTANT"}</span>
        </span>
      </button>
      <div className="h-[5px] rounded-full mt-2 overflow-hidden" style={{ background: "#E9ECF1" }}><div style={{ width: `${pct}%`, height: 5, borderRadius: 3, background: color }} /></div>
      {over && actions && (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Btn kind="ghost" onClick={() => actions.extendStay(s, 1)} className="!min-h-[44px] !text-[13px]">Prolonger · +1 h</Btn>
          <Btn kind="navy" onClick={() => actions.releaseStay(s)} className="!min-h-[44px] !text-[13px]">Libérer</Btn>
        </div>
      )}
    </div>
  );
}

// ---------- Chambres : plan, en cours, réservations, ménage ----------
const NAVY_GRAD = "linear-gradient(135deg, #0A1730 0%, #17305A 55%, #1B3361 100%)";
const GOLD_GRAD = "linear-gradient(135deg, #E9B84E, #D3962A)";
// Couleurs des séjours selon l'état : occupée, bientôt fini, dépassée, nuitée.
const SG = {
  occ: { grad: "linear-gradient(135deg,#FB7185,#E11D48)", ink: "#E11D48", glow: "rgba(225,29,72,0.45)", soft: "#FFE4E9", line: "#FBCFD8", pill: "OCCUPÉE" },
  low: { grad: "linear-gradient(135deg,#F87171,#B91C1C)", ink: "#B91C1C", glow: "rgba(185,28,28,0.5)", soft: "#FEE2E2", line: "#FCA5A5", pill: "BIENTÔT FINI" },
  over: { grad: "linear-gradient(135deg,#FBBF24,#EA580C)", ink: "#C2410C", glow: "rgba(234,88,12,0.55)", soft: "#FFEDD5", line: "#FCD9A8", pill: "DÉPASSÉE" },
  night: { grad: "linear-gradient(135deg,#818CF8,#4F46E5)", ink: "#4338CA", glow: "rgba(79,70,229,0.45)", soft: "#E0E7FF", line: "#C7D2FE", pill: "NUITÉE" },
};
const LOW_MS = 10 * 60000;
function stayKind(s, now) {
  const left = toMs(s.end) - now;
  if (left < 0) return "over";
  if (left < LOW_MS) return "low";
  return isNight(s) ? "night" : "occ";
}
const urgency = (s, now) => { const k = stayKind(s, now); return (k === "over" ? 0 : k === "low" ? 1 : 2) * 1e13 + (toMs(s.end) - now + 1e12); };
const initials = (name) => String(name || "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const clockOf = (ms) => { const a = Math.abs(Math.round(ms / 1000)); return `${ms < 0 ? "+" : ""}${pad2(Math.floor(a / 3600))}:${pad2(Math.floor((a % 3600) / 60))}:${pad2(a % 60)}`; };

function LiveDot() {
  return <span className="relative inline-flex w-2 h-2 shrink-0"><span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#34D399", opacity: 0.6 }} /><span className="relative w-2 h-2 rounded-full" style={{ background: "#34D399" }} /></span>;
}
function HeroStat({ label, value, color, sub }) {
  return <span className="rounded-[14px] px-2.5 py-2 min-w-0" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}><span className="block text-[10px] font-bold truncate" style={{ color: "#AEBBD2" }}>{label}</span><span className="block text-[14px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color }}>{value}</span>{sub && <span className="block font-mono text-[11px] font-bold" style={{ color: "#67E8F9" }}>{sub}</span>}</span>;
}

function PlanHero({ ctx, compact }) {
  const { shop, rooms, stays, now, fmt } = ctx;
  const active = stays.filter(isActiveStay);
  const usable = rooms.filter((r) => !r.outOfService).length;
  const pct = usable ? Math.round((active.length / usable) * 100) : 0;
  const next = active.filter((s) => toMs(s.end) >= now).sort((a, b) => toMs(a.end) - toMs(b.end))[0];
  const C = 2 * Math.PI * 31;
  const dateTxt = new Date(now).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  if (compact) return (
    <div className="rounded-[20px] px-3.5 py-2.5 text-white flex items-center gap-3" style={{ background: NAVY_GRAD, boxShadow: "0 10px 22px -12px rgba(14,28,51,0.6)" }}>
      <span className="flex-1 min-w-0"><span className="block text-[17px] font-extrabold leading-tight">Chambres</span><span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#C9D3E6" }}><LiveDot />{hmOf(now)}{next ? ` · prochaine fin Ch. ${next.roomNum} ${fmtClock(toMs(next.end) - now)}` : ""}</span></span>
      <span className="h-8 px-2.5 rounded-[10px] text-[13px] font-extrabold flex items-center shrink-0" style={{ background: "rgba(34,211,238,0.18)", color: "#67E8F9" }}>{pct} % occupé</span>
    </div>
  );
  return (
    <div className="mt-1 rounded-[26px] p-4 text-white relative overflow-hidden" style={{ background: NAVY_GRAD, boxShadow: "0 14px 30px -12px rgba(14,28,51,0.6)" }}>
      <div className="absolute rounded-full" style={{ right: -40, top: -50, width: 170, height: 170, background: "radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)" }} />
      <div className="relative flex items-center gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-[0.12em] truncate uppercase" style={{ color: "#E9C77F" }}>{shop?.name || "Mon hôtel"}</p>
          <h1 className="text-[25px] font-extrabold tracking-tight leading-tight">Chambres</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "#C9D3E6" }}><LiveDot />En direct · {hmOf(now)} · {dateTxt}</p>
        </div>
        <svg width="78" height="78" viewBox="0 0 78 78" role="img" aria-label={`Taux d'occupation ${pct} %`} className="shrink-0">
          <defs><linearGradient id="hgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#67E8F9" /><stop offset="1" stopColor="#D99A2B" /></linearGradient></defs>
          <circle cx="39" cy="39" r="31" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
          <circle cx="39" cy="39" r="31" fill="none" stroke="url(#hgold)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 39 39)" />
          <text x="39" y="41" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff">{pct}%</text>
          <text x="39" y="54" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#C9D3E6">occupé</text>
        </svg>
      </div>
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <HeroStat label="En cours" value={fmt(active.reduce((t, s) => t + stayTotal(s), 0))} color="#67E8F9" />
        <HeroStat label="À encaisser" value={fmt(active.reduce((t, s) => t + stayDue(s), 0))} color="#FDBA74" />
        <HeroStat label="Prochaine fin" value={next ? `Ch. ${next.roomNum}` : "—"} sub={next ? fmtClock(toMs(next.end) - now) : null} color="#fff" />
      </div>
    </div>
  );
}

function EnCoursHero({ ctx, compact }) {
  const { stays, now, fmt } = ctx;
  const active = stays.filter(isActiveStay);
  const n = active.length || 1;
  const by = { occ: 0, night: 0, low: 0, over: 0 };
  active.forEach((s) => { by[stayKind(s, now)] += 1; });
  const alerts = by.low + by.over;
  if (compact) return (
    <div className="rounded-[20px] px-3.5 py-2.5 text-white flex items-center gap-3" style={{ background: NAVY_GRAD, boxShadow: "0 10px 22px -12px rgba(14,28,51,0.6)" }}>
      <span className="flex-1 min-w-0"><span className="block text-[17px] font-extrabold leading-tight">{active.length} séjour{active.length > 1 ? "s" : ""} en cours</span><span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "#C9D3E6" }}><LiveDot />{hmOf(now)}:{pad2(new Date(now).getSeconds())} · reste {fmt(active.reduce((t, s) => t + stayDue(s), 0))}</span></span>
      {alerts > 0 && <span className="h-8 px-2.5 rounded-[10px] text-[12px] font-extrabold flex items-center gap-1 shrink-0" style={{ background: "rgba(251,191,36,0.16)", color: "#FCD34D" }}><Icon name="warn" size={13} stroke={2.4} />{alerts}</span>}
    </div>
  );
  return (
    <div className="mt-1 rounded-[26px] p-4 text-white relative overflow-hidden" style={{ background: NAVY_GRAD, boxShadow: "0 14px 30px -12px rgba(14,28,51,0.6)" }}>
      <div className="absolute rounded-full" style={{ left: -50, bottom: -70, width: 190, height: 190, background: "radial-gradient(circle, rgba(244,63,94,0.28) 0%, rgba(244,63,94,0) 70%)" }} />
      <div className="absolute rounded-full" style={{ right: -40, top: -50, width: 170, height: 170, background: "radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)" }} />
      <div className="relative flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-[0.12em]" style={{ color: "#E9C77F" }}>SÉJOURS EN COURS</p>
          <p className="flex items-baseline gap-2"><span className="text-[36px] font-extrabold leading-none">{active.length}</span><span className="text-[13.5px] font-bold" style={{ color: "#C9D3E6" }}>chambre{active.length > 1 ? "s" : ""} occupée{active.length > 1 ? "s" : ""}</span></p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "#C9D3E6" }}><LiveDot />Chronos en direct · {hmOf(now)}:{pad2(new Date(now).getSeconds())}</p>
        </div>
        {alerts > 0 && <span className="h-[30px] px-2.5 rounded-[10px] text-[11.5px] font-extrabold flex items-center gap-1.5 whitespace-nowrap" style={{ background: "rgba(251,191,36,0.16)", border: "1px solid rgba(251,191,36,0.45)", color: "#FCD34D" }}><Icon name="warn" size={14} stroke={2.4} />{alerts} alerte{alerts > 1 ? "s" : ""}</span>}
      </div>
      {active.length > 0 && (
        <>
          <div className="relative mt-3 h-2.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.1)" }}>
            {["occ", "night", "low", "over"].map((k) => by[k] ? <span key={k} style={{ width: `${(by[k] / n) * 100}%`, background: SG[k].grad }} /> : null)}
          </div>
          <div className="relative mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] font-bold" style={{ color: "#C9D3E6" }}>
            {[["occ", "À l'heure", "#FB7185"], ["night", "Nuitée", "#818CF8"], ["low", "Bientôt fini", "#F87171"], ["over", "Dépassée", "#FBBF24"]].map(([k, l, c]) => <span key={k} className="flex items-center gap-1.5"><span className="w-[7px] h-[7px] rounded-full" style={{ background: c }} />{l} {by[k]}</span>)}
          </div>
        </>
      )}
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <HeroStat label="Montant total" value={fmt(active.reduce((t, s) => t + stayTotal(s), 0))} color="#67E8F9" />
        <HeroStat label="Déjà encaissé" value={fmt(active.reduce((t, s) => t + stayPaid(s), 0))} color="#6EE7B7" />
        <HeroStat label="Reste à payer" value={fmt(active.reduce((t, s) => t + stayDue(s), 0))} color="#FDBA74" />
      </div>
    </div>
  );
}

function RoomsTabs({ tab, setTab, compact }) {
  const opts = [["plan", "Plan"], ["encours", "En cours"], ["resa", "Réservations"], ["menage", "Ménage"]];
  return (
    <div className={`${compact ? "mt-2" : "mt-3"} p-1 rounded-[17px] grid gap-[3px]`} style={{ background: "#fff", boxShadow: "0 4px 16px -4px rgba(10,23,48,0.12)", gridTemplateColumns: "minmax(0,0.8fr) minmax(0,1fr) minmax(0,1.45fr) minmax(0,1fr)" }}>
      {opts.map(([id, l]) => { const on = tab === id; return <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={on} className="gb-focus min-h-[40px] rounded-[13px] text-[12px] font-extrabold whitespace-nowrap overflow-hidden px-1" style={{ background: on ? GOLD_GRAD : "transparent", color: on ? H.navy : H.ink2, boxShadow: on ? "0 4px 10px -3px rgba(211,150,42,0.6)" : "none" }}>{l}</button>; })}
    </div>
  );
}

function RoomsScreen({ ctx, tab, setTab, openStay, rentRoom, newResa }) {
  const { isTech, rooms, reservations, now } = ctx;
  const resaCount = reservations.filter((r) => isLiveResa(r) && toMs(r.end) > now).length;
  const premium = !isTech && (tab === "plan" || tab === "encours");
  const [planFilter, setPlanFilter] = useState("all");
  const [encFilter, setEncFilter] = useState("all");
  // En-tête fixe : reste en haut pendant le défilement et se resserre pour
  // laisser la place aux chambres (seuils différents pour éviter le va-et-vient).
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const on = () => { const y = window.scrollY || 0; setCompact((c) => (c ? y > 40 : y > 140)); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div>
      {!isTech && (
        <div className="sticky z-30 -mx-4 px-4 pb-2.5" style={{ top: STATUS_H, background: "#EEF2F8", boxShadow: compact ? "0 10px 16px -14px rgba(10,23,48,0.45)" : "none" }}>
          <div className="pt-1.5" />
          {premium ? (tab === "plan" ? <PlanHero ctx={ctx} compact={compact} /> : <EnCoursHero ctx={ctx} compact={compact} />) : (
            <TopBar title="Chambres" sub={`${rooms.length} chambre${rooms.length > 1 ? "s" : ""} · mise à jour en direct`}
              right={tab === "resa" ? <Btn kind="indigo" icon="plus" onClick={() => newResa()} className="!min-h-[44px] !px-3.5 !text-[13px]">Réserver</Btn> : null} />
          )}
          <RoomsTabs tab={tab} setTab={setTab} compact={compact} />
          {tab === "plan" && rooms.length > 0 && <PlanStickyBar ctx={ctx} filter={planFilter} setFilter={setPlanFilter} compact={compact} />}
          {tab === "encours" && <EnCoursChips ctx={ctx} f={encFilter} setF={setEncFilter} />}
        </div>
      )}
      {tab === "plan" && !isTech && <PlanTab ctx={ctx} openStay={openStay} rentRoom={rentRoom} goTab={setTab} filter={planFilter} />}
      {tab === "encours" && !isTech && <EnCoursTab ctx={ctx} openStay={openStay} f={encFilter} />}
      {tab === "resa" && !isTech && <ResaTab ctx={ctx} newResa={newResa} openStay={openStay} count={resaCount} />}
      {(tab === "menage" || isTech) && <MenageTab ctx={ctx} />}
    </div>
  );
}

// Couleurs des tuiles du plan, par état de chambre.
const TILE = {
  libre: { label: "Libre", dot: "#10B981", ink: "#047857", bg: "#F0FDF7", line: "#BBF0D9", num: "#065F46" },
  occupee: { label: "Occupée", dot: "#F43F5E", ink: "#BE123C", bg: "#FFF1F3", line: "#FBCFD8", num: "#9F1239" },
  nuitee: { label: "Nuitée", dot: "#6366F1", ink: "#4338CA", bg: "#EEF0FF", line: "#C7D2FE", num: "#3730A3" },
  depassee: { label: "Dépassée", dot: "#F59E0B", ink: "#C2410C", bg: "#FFF7EB", line: "#FCD9A8", num: "#9A3412" },
  reservee: { label: "Réservée", dot: "#8B5CF6", ink: "#6D28D9", bg: "#F5F3FF", line: "#DDD6FE", num: "#5B21B6" },
  menage: { label: "Ménage", dot: "#A855F7", ink: "#7E22CE", bg: "#FAF5FF", line: "#E9D5FF", num: "#6B21A8" },
  hs: { label: "Hors serv.", dot: "#94A3B8", ink: "#475569", bg: "#F1F5F9", line: "#E2E8F0", num: "#475569" },
};

// Compteurs et filtres du plan (dans l'en-tête fixe).
function PlanStickyBar({ ctx, filter, setFilter, compact }) {
  const { rooms, reservations, now } = ctx;
  const states = rooms.map((r) => ({ r, st: roomState(r, ctx) }));
  const n = (f) => states.filter(f).length;
  const [, d1] = dayBounds(now);
  const resaRooms = new Set(reservations.filter((x) => isLiveResa(x) && toMs(x.start) < d1 && toMs(x.end) > now).map((x) => x.roomId));
  const kpis = [
    ["Libres", n((x) => x.st.kind === "libre"), "#047857", "linear-gradient(135deg,#34D399,#059669)", "rgba(5,150,105,0.6)", "#F0FDF7", "#BBF0D9", "check"],
    ["Occupées", n((x) => x.st.kind === "occupee" || x.st.kind === "depassee"), "#BE123C", "linear-gradient(135deg,#FB7185,#E11D48)", "rgba(225,29,72,0.6)", "#FFF1F3", "#FBCFD8", "clock"],
    ["Réservées", resaRooms.size, "#4338CA", "linear-gradient(135deg,#818CF8,#4F46E5)", "rgba(79,70,229,0.6)", "#EEF0FF", "#C7D2FE", "cal"],
    ["Ménage · HS", n((x) => x.st.kind === "menage" || x.st.kind === "hs"), "#7E22CE", "linear-gradient(135deg,#C084FC,#9333EA)", "rgba(147,51,234,0.6)", "#FAF5FF", "#E9D5FF", "broom"],
  ];
  const countOf = (t) => rooms.filter((r) => r.type === t).length;
  const chip = (id, label, ink, line) => { const on = filter === id; return <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={on} className={`gb-focus ${compact ? "min-h-[32px] px-2.5 text-[11.5px]" : "min-h-[36px] px-3 text-[12px]"} rounded-[12px] font-extrabold whitespace-nowrap`} style={{ border: `1.5px solid ${on ? ink : line}`, background: on ? ink : "#fff", color: on ? "#fff" : ink }}>{label}</button>; };
  return (
    <>
      <div className={`${compact ? "mt-2" : "mt-3"} grid grid-cols-4 gap-[7px]`}>
        {kpis.map(([l, v, ink, grad, shadow, bg, line, icon]) => compact ? (
          <div key={l} className="rounded-[12px] py-1 px-1 flex items-center justify-center gap-1.5" style={{ background: bg, border: `1px solid ${line}` }}>
            <span className="text-[15px] font-extrabold" style={{ color: ink }}>{v}</span><span className="text-[9.5px] font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#475569" }}>{l.split(" ")[0]}</span>
          </div>
        ) : (
          <div key={l} className="rounded-[16px] pt-2.5 pb-2 px-1 text-center" style={{ background: bg, border: `1px solid ${line}` }}>
            <span className="mx-auto w-7 h-7 rounded-[10px] flex items-center justify-center" style={{ background: grad, boxShadow: `0 4px 10px -3px ${shadow}` }}><Icon name={icon} size={15} color="#fff" stroke={2.5} /></span>
            <p className="mt-1 text-[20px] font-extrabold leading-tight" style={{ color: ink }}>{v}</p>
            <p className="text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#475569" }}>{l}</p>
          </div>
        ))}
      </div>
      <div className={`${compact ? "mt-2" : "mt-3"} flex gap-[7px] overflow-x-auto pb-0.5`}>
        {chip("all", `Toutes · ${rooms.length}`, H.navy, H.line)}
        {countOf("vent") > 0 && chip("vent", `Ventilées · ${countOf("vent")}`, ROOM_TYPES.vent.ink, "#BFE7E0")}
        {countOf("clim") > 0 && chip("clim", `Climatisées · ${countOf("clim")}`, ROOM_TYPES.clim.ink, "#C7D7F8")}
      </div>
    </>
  );
}

function PlanTab({ ctx, openStay, rentRoom, goTab, filter = "all" }) {
  const { rooms, stays, reservations, now, isOwner, setRoute, fmt, tariffs } = ctx;
  if (!rooms.length) return <div className="mt-4"><Empty icon="hash" title="Aucune chambre" text={isOwner ? "Enregistrez les numéros de vos chambres." : "Le propriétaire doit enregistrer les chambres."} action={isOwner ? <Btn kind="gold" icon="plus" onClick={() => setRoute({ name: "roomsConfig" })}>Ajouter des chambres</Btn> : null} /></div>;
  const states = rooms.map((r) => ({ r, st: roomState(r, ctx) }));
  const keep = (t) => filter === "all" || filter === t;
  const busy = stays.filter((s) => isActiveStay(s) && keep(s.type)).sort((a, b) => urgency(a, now) - urgency(b, now));
  const countOf = (t) => rooms.filter((r) => r.type === t).length;
  const minPrice = (t) => { const ps = tariffs.filter((x) => x.type === t && x.active !== false).map((x) => Number(x.price) || 0).filter((x) => x > 0); return ps.length ? Math.min(...ps) : 0; };
  const onTile = (r, st) => {
    if (st.kind === "occupee" || st.kind === "depassee") openStay(st.stay);
    else if (st.kind === "menage" || st.kind === "hs") goTab("menage");
    else if (st.kind === "reservee") goTab("resa");
    else rentRoom(r);
  };
  return (
    <div>

      {busy.length > 0 && (
        <>
          <div className="mt-4 mb-2.5 flex items-center gap-2.5">
            <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F43F5E,#BE123C)", boxShadow: "0 4px 10px -3px rgba(190,18,60,0.6)" }}><Icon name="clock" size={16} color="#fff" stroke={2.4} /></span>
            <span className="flex-1 text-[15.5px] font-extrabold">En cours d'utilisation</span>
            <button type="button" onClick={() => goTab("encours")} className="gb-focus text-[12.5px] font-extrabold" style={{ color: H.goldDark }}>Détails ›</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {busy.slice(0, 8).map((s) => <BusyCard key={s.id} s={s} now={now} fmt={fmt} onClick={() => openStay(s)} />)}
          </div>
          {busy.length > 8 && <button type="button" onClick={() => goTab("encours")} className="gb-focus mt-2 w-full text-center text-[12.5px] font-extrabold" style={{ color: H.goldDark }}>Voir les {busy.length} séjours en cours ›</button>}
        </>
      )}

      <div className="mt-5 mb-2.5 flex items-center gap-2.5">
        <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ background: "linear-gradient(135deg,#34D399,#059669)", boxShadow: "0 4px 10px -3px rgba(5,150,105,0.6)" }}><Icon name="bed" size={16} color="#fff" stroke={2.3} /></span>
        <span className="flex-1 text-[15.5px] font-extrabold">Toutes les chambres</span>
        <span className="text-[12px] font-bold" style={{ color: H.muted }}>{states.filter((x) => keep(x.r.type) && x.st.kind === "libre").length} libres</span>
      </div>
      {["vent", "clim"].filter(keep).map((t) => {
        const list = states.filter((x) => x.r.type === t);
        if (!list.length) return null;
        const T = roomTypeOf(t);
        const mp = minPrice(t);
        return (
          <div key={t} className="mb-3 rounded-[22px] p-3" style={{ background: "#fff", boxShadow: "0 6px 18px -10px rgba(10,23,48,0.25)" }}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="h-6 px-2 rounded-[8px] text-[11px] font-extrabold flex items-center gap-1.5" style={{ background: T.tint, color: T.ink }}><Icon name={t === "clim" ? "snow" : "fan"} size={13} stroke={2.3} />{T.plural}</span>
              <span className="flex-1 text-[11px] font-bold truncate" style={{ color: H.muted }}>{list.length} chambre{list.length > 1 ? "s" : ""}{mp ? ` · dès ${fmt(mp)}` : ""}</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-[7px]">
              {list.map(({ r, st }) => {
                const k = st.kind === "occupee" && st.stay && isNight(st.stay) ? "nuitee" : st.kind;
                const S = TILE[k] || TILE.libre;
                const sub = st.kind === "libre" ? (st.nextResa && toMs(st.nextResa.start) - now < 12 * HOUR ? `Résa ${hmOf(toMs(st.nextResa.start))}` : mp ? fmt(mp).replace(/\s?F(CFA)?$/, " F") : "Louer") : st.kind === "reservee" ? hmOf(toMs(st.nextResa.start)) : st.kind === "menage" ? (r.cleaning?.state === "doing" ? (r.cleaning.by || "En cours") : "À faire") : st.kind === "hs" ? "Panne" : st.kind === "depassee" ? `+${fmtShort(now - toMs(st.stay.end)).replace("+", "")}` : isNight(st.stay) ? `→ ${hmOf(toMs(st.stay.end))}` : fmtClock(toMs(st.stay.end) - now);
                return (
                  <button key={r.id} type="button" onClick={() => onTile(r, st)} aria-label={`Chambre ${r.num} : ${S.label}`} className="gb-focus relative rounded-[15px] pt-[7px] pb-1.5 px-1 flex flex-col items-center min-w-0" style={{ background: S.bg, border: `1.5px solid ${S.line}` }}>
                    <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full" style={{ background: S.dot }} />
                    <span className="text-[17px] font-extrabold leading-tight" style={{ color: S.num, textDecoration: st.kind === "hs" ? "line-through" : "none" }}>{r.num}</span>
                    <span className="text-[9.5px] font-extrabold whitespace-nowrap" style={{ color: S.ink }}>{S.label}</span>
                    <span className={`text-[9.5px] font-bold whitespace-nowrap max-w-full overflow-hidden text-ellipsis ${st.stay ? "font-mono" : ""}`} style={{ color: "#64748B" }}>{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[10.5px] font-bold" style={{ color: "#475569" }}>
        {["libre", "occupee", "nuitee", "depassee", "reservee", "menage", "hs"].map((k) => <span key={k} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: TILE[k].dot }} />{TILE[k].label}</span>)}
      </div>
    </div>
  );
}

function BusyCard({ s, now, fmt, onClick }) {
  const k = stayKind(s, now);
  const G = SG[k];
  const end = toMs(s.end), start = toMs(s.start);
  const left = end - now;
  const pct = k === "over" ? 100 : Math.max(4, Math.round((1 - left / Math.max(1, end - start)) * 100));
  const due = stayDue(s);
  const T = roomTypeOf(s.type);
  return (
    <button type="button" onClick={onClick} className="gb-focus text-left rounded-[22px] overflow-hidden flex flex-col min-w-0" style={{ background: "#fff", boxShadow: `0 10px 24px -12px ${G.glow}, 0 0 0 1.5px ${k === "over" ? G.line : "#EEF0F5"}` }}>
      <span className="relative flex items-center gap-2 px-[11px] pt-2.5 pb-[9px] text-white" style={{ background: G.grad }}>
        <span className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}><Icon name={s.type === "clim" ? "snow" : "fan"} size={18} /></span>
        <span className="min-w-0"><span className="block text-[9.5px] font-bold tracking-[0.06em] opacity-85">CHAMBRE</span><span className="block text-[21px] font-extrabold leading-none">{s.roomNum}</span></span>
      </span>
      <span className="px-[11px] pt-2 pb-2.5 flex flex-col min-w-0">
        <span className="self-start mb-1 h-[19px] px-1.5 rounded-[10px] text-[9px] font-extrabold tracking-[0.02em] flex items-center gap-1 whitespace-nowrap text-white" style={{ background: G.grad }}><span className="w-[5px] h-[5px] rounded-full" style={{ background: "rgba(255,255,255,0.9)" }} />{G.pill}</span>
        <span className="text-[11px] font-bold truncate" style={{ color: T.ink }}>{T.label} · {s.tariffName}</span>
        <span className="mt-0.5 font-mono text-[22px] font-bold tracking-tight leading-tight" style={{ color: G.ink }}>{clockOf(left)}</span>
        <span className="text-[10.5px] font-bold" style={{ color: H.muted }}>{k === "over" ? "de dépassement" : "temps restant"}</span>
        <span className="mt-1.5 h-[7px] rounded-full overflow-hidden" style={{ background: "#EEF0F5" }}><span className="block h-[7px] rounded-full" style={{ width: `${pct}%`, background: G.grad }} /></span>
        <span className="mt-1 flex justify-between gap-1 text-[10px] font-bold" style={{ color: H.muted }}><span>Arr. {hmOf(start)}</span><span>{isNight(s) ? `Départ ${hmOf(end)}` : `Fin ${hmOf(end)}`}</span></span>
        <span className="mt-2 pt-2 flex items-center gap-1.5 min-w-0" style={{ borderTop: "1px solid #E5EAF1" }}>
          <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0" style={{ background: G.soft, color: G.ink }}>{s.client ? initials(s.client) : <Icon name="users" size={13} />}</span>
          <span className="min-w-0 flex-1"><span className="block text-[11.5px] font-extrabold truncate">{s.client || "Client"}</span><span className="block text-[10.5px] font-bold truncate" style={{ color: "#475569" }}>{fmt(stayTotal(s))}</span></span>
          <span className="text-[9px] font-extrabold rounded-[7px] px-1.5 py-0.5 whitespace-nowrap shrink-0" style={due > 0 ? { background: "#FFEDD5", color: "#C2410C" } : { background: "#DCFCE7", color: H.green }}>{due > 0 ? "À encaisser" : "Payé"}</span>
        </span>
      </span>
    </button>
  );
}

function EnCoursChips({ ctx, f, setF }) {
  const { stays, now } = ctx;
  const all = stays.filter(isActiveStay);
  const isAlert = (s) => { const k = stayKind(s, now); return k === "over" || k === "low"; };
  const chips = [["all", "Tout", H.navy, H.line, all.length], ["h", "À l'heure", "#E11D48", "#FBCFD8", all.filter((s) => !isNight(s)).length], ["n", "Nuitées", "#4F46E5", "#C7D2FE", all.filter(isNight).length], ["a", "Alertes", "#EA580C", "#FCD9A8", all.filter(isAlert).length]];
  return (
    <div className="mt-2.5 grid gap-1.5" style={{ gridTemplateColumns: "minmax(0,0.8fr) minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr)" }}>
      {chips.map(([id, l, ink, line, c]) => { const on = f === id; return (
        <button key={id} type="button" onClick={() => setF(id)} aria-pressed={on} className="gb-focus min-h-[38px] rounded-[12px] text-[11.5px] font-extrabold whitespace-nowrap flex items-center justify-center gap-1 px-1" style={{ border: `1.5px solid ${on ? ink : line}`, background: on ? ink : "#fff", color: on ? "#fff" : ink, boxShadow: on ? `0 6px 14px -6px ${ink}` : "none" }}>
          {l}<span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center" style={{ background: on ? "rgba(255,255,255,0.25)" : line, color: on ? "#fff" : ink }}>{c}</span>
        </button>
      ); })}
    </div>
  );
}

function EnCoursTab({ ctx, openStay, f = "all" }) {
  const { stays, now, fmt, actions, settings, tariffs, openReceipt } = ctx;
  const [payFor, setPayFor] = useState(null);
  const all = stays.filter(isActiveStay).sort((a, b) => urgency(a, now) - urgency(b, now));
  const isAlert = (s) => { const k = stayKind(s, now); return k === "over" || k === "low"; };
  const list = all.filter((s) => (f === "all" ? true : f === "n" ? isNight(s) : f === "h" ? !isNight(s) : isAlert(s)));
  return (
    <div>
      {list.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-bold" style={{ color: H.muted }}><Icon name="sliders" size={14} />Triés par urgence · les alertes d'abord</p>}
      <div className="mt-2.5 flex flex-col gap-3">
        {list.length === 0 ? <Empty icon="clock" title={f === "a" ? "Aucune alerte" : "Aucune chambre en cours"} text="Les chambres louées apparaissent ici avec leur compte à rebours." /> : list.map((s) => (
          <StayCard key={s.id} s={s} now={now} fmt={fmt} settings={settings} tariffs={tariffs} actions={actions} onOpen={() => openStay(s)} onPay={() => setPayFor(s)} />
        ))}
      </div>
      {payFor && <PaySheet title={`Encaisser · chambre ${payFor.roomNum}`} amount={stayDue(payFor)} fmt={fmt} defaultPrint={settings.receipt.ask !== false} onClose={() => setPayFor(null)} onConfirm={({ mode, op, given, print }) => { const rc = actions.collect(payFor, mode, { given, op }); setPayFor(null); if (rc && print) openReceipt(rc); }} />}
    </div>
  );
}

function StayCard({ s, now, fmt, settings, tariffs, actions, onOpen, onPay }) {
  const k = stayKind(s, now);
  const G = SG[k];
  const T = roomTypeOf(s.type);
  const start = toMs(s.start), end = toMs(s.end);
  const left = end - now;
  const frac = k === "over" ? 1 : Math.max(0.03, Math.min(1, 1 - left / Math.max(1, end - start)));
  const pctN = Math.round(frac * 100);
  const C = 2 * Math.PI * 38;
  const due = stayDue(s);
  const paid = stayPaid(s);
  const night = isNight(s);
  const hasNight = tariffs.some((t) => t.type === s.type && isNight(t) && t.active !== false);
  const otH = k === "over" ? overtimeHours(s, now, settings.graceMinutes) : 0;
  const extras = (s.extras || []).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const elapsed = now - start;
  const tags = [
    [`Par ${s.by || "—"}`, "users", "#F1F5F9", "#334155"],
    extras > 0 ? [`${(s.extras || []).length} conso. · ${fmt(extras)}`, "glass", "#E0F7FB", "#0E7490"] : null,
    s.guestId ? ["Fiche + pièce d'identité", "shield", "#E0E7FF", "#4338CA"] : null,
    k === "low" ? [`Alerte ${settings.endAlertMinutes} min avant la fin`, "bell", "#FEE2E2", "#B91C1C"] : null,
    (s.receipts || []).length ? [`Reçu ${s.receipts[s.receipts.length - 1].no}`, "receipt", "#F1F5F9", "#475569"] : null,
  ].filter(Boolean);
  const acts = [["Prolonger", "plus", "gold", () => actions.extendStay(s, 1)]];
  if (due > 0) acts.push(["Encaisser", "money", "green", onPay]);
  else if (!night && hasNight) acts.push(["Nuitée", "moon", "indigo", () => actions.toNight(s)]);
  acts.push(["Libérer", "logout", "navy", () => actions.releaseStay(s)]);
  const AK = {
    gold: { background: GOLD_GRAD, color: H.navy, border: "1.5px solid #22D3EE", boxShadow: "0 6px 14px -6px rgba(211,150,42,0.7)" },
    green: { background: "linear-gradient(135deg,#22C55E,#15803D)", color: "#fff", border: "1.5px solid #15803D", boxShadow: "0 6px 14px -6px rgba(21,128,61,0.7)" },
    indigo: { background: "#EEF0FF", color: "#4338CA", border: "1.5px solid #C7D2FE" },
    navy: { background: "#fff", color: H.navy, border: "1.5px solid #D5DBE5" },
  };
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: "#fff", boxShadow: `0 12px 28px -14px ${G.glow}, 0 0 0 1.5px ${G.line}` }}>
      <button type="button" onClick={onOpen} className="gb-focus w-full text-left flex items-center gap-2.5 px-3.5 py-3 text-white" style={{ background: G.grad }}>
        <span className="w-12 h-12 rounded-[15px] flex flex-col items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)" }}><span className="text-[18px] font-extrabold leading-none">{s.roomNum}</span><span className="text-[8.5px] font-extrabold tracking-[0.05em] mt-0.5">{T.short?.toUpperCase?.() || (s.type === "clim" ? "CLIM" : "VENT")}</span></span>
        <span className="flex-1 min-w-0"><span className="block text-[16px] font-extrabold truncate">Chambre {s.roomNum}</span><span className="flex items-center gap-1 text-[11.5px] font-bold opacity-95 min-w-0"><Icon name={s.type === "clim" ? "snow" : "fan"} size={13} /><span className="truncate">{T.label} · {s.tariffName}</span></span></span>
        <span className="h-6 px-2 rounded-[12px] text-[10px] font-extrabold flex items-center gap-1 whitespace-nowrap shrink-0" style={{ background: "rgba(255,255,255,0.96)", color: G.ink }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: G.ink }} />{G.pill}</span>
      </button>
      {k === "over" && (
        <div className="mx-3 mt-2.5 rounded-[13px] px-2.5 py-2 flex items-center gap-2 text-[11.5px] font-bold" style={{ background: "#FFF7EB", border: "1px solid #FCD9A8", color: "#9A3412" }}>
          <Icon name="warn" size={16} color="#EA580C" stroke={2.4} /><span className="flex-1 min-w-0">{otH > 0 ? `Temps dépassé · ${otH} h à facturer` : `Temps dépassé · tolérance ${settings.graceMinutes} min`}</span>{otH > 0 && <b className="whitespace-nowrap">+{fmt(otH * extensionPrice(s, settings))}</b>}
        </div>
      )}
      <div className="px-3.5 pt-3 flex items-center gap-3.5">
        <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0" aria-hidden="true">
          <circle cx="46" cy="46" r="38" fill="none" stroke="#EEF0F5" strokeWidth="9" />
          <circle cx="46" cy="46" r="38" fill="none" stroke={G.ink} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 46 46)" />
          <text x="46" y="45" textAnchor="middle" fontSize="18" fontWeight="800" fill={G.ink}>{k === "over" ? "!" : `${pctN}%`}</text>
          <text x="46" y="59" textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748B">{k === "over" ? "dépassé" : "écoulé"}</text>
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-extrabold tracking-[0.06em]" style={{ color: H.muted }}>{k === "over" ? "DÉPASSEMENT" : "TEMPS RESTANT"}</p>
          <p className="font-mono text-[28px] font-bold tracking-tight leading-tight" style={{ color: G.ink }}>{clockOf(left)}</p>
          <p className="mt-0.5 text-[12px] font-bold truncate" style={{ color: H.ink2 }}>{k === "over" ? `Devait finir à ${hmOf(end)}` : night ? `Départ ${dayLabel(end, now)} à ${hmOf(end)}` : `Fin prévue à ${hmOf(end)}`}</p>
          <p className="text-[11px] font-semibold" style={{ color: H.muted }}>Présent depuis {fmtShort(elapsed).replace("+", "")}</p>
        </div>
      </div>
      <div className="mx-3.5 mt-3">
        <div className="relative h-2 rounded-full" style={{ background: "#EEF0F5" }}>
          <span className="absolute left-0 top-0 h-2 rounded-full" style={{ width: `${pctN}%`, background: G.grad }} />
          <span className="absolute w-4 h-4 rounded-full" style={{ top: -4, left: `calc(${pctN}% - 8px)`, background: "#fff", border: `3px solid ${G.ink}`, boxSizing: "border-box", boxShadow: "0 2px 6px rgba(10,23,48,0.25)" }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] font-bold" style={{ color: H.muted }}><span>Arrivée <b style={{ color: H.ink }}>{hmOf(start)}</b></span><span>{night ? "Départ" : "Fin"} <b style={{ color: H.ink }}>{night ? `${dayLabel(end, now)} ${hmOf(end)}` : hmOf(end)}</b></span></div>
      </div>
      <div className="mx-3.5 mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] px-2.5 py-2 flex items-center gap-2 min-w-0" style={{ background: "#F7F8FB" }}>
          <span className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0" style={{ background: G.soft, color: G.ink }}>{s.client ? initials(s.client) : <Icon name="users" size={14} />}</span>
          <span className="min-w-0"><span className="block text-[12px] font-extrabold truncate">{s.client || "Client"}</span><span className="block text-[10.5px] font-semibold truncate" style={{ color: H.muted }}>{s.phone || "Sans téléphone"}</span></span>
        </div>
        <div className="rounded-[14px] px-2.5 py-2 flex items-center gap-2 min-w-0" style={{ background: "#F7F8FB" }}>
          <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: H.goldSoft, color: H.goldDark }}><Icon name="wallet" size={15} /></span>
          <span className="min-w-0"><span className="block text-[12px] font-extrabold whitespace-nowrap">{fmt(stayTotal(s))}</span><span className="block text-[10.5px] font-extrabold whitespace-nowrap" style={{ color: due > 0 ? H.orange : H.green }}>{due > 0 ? `Reste ${fmt(due)}` : paid > 0 ? "Entièrement payé" : "Payé"}</span></span>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="mx-3.5 mt-2 flex flex-wrap gap-1.5">
          {tags.map(([l, ic, bg, ink]) => <span key={l} className="h-6 px-2 rounded-[8px] text-[10.5px] font-extrabold flex items-center gap-1 whitespace-nowrap" style={{ background: bg, color: ink }}><Icon name={ic} size={12} stroke={2.4} />{l}</span>)}
        </div>
      )}
      <div className="m-3.5 mt-3 grid gap-[7px]" style={{ gridTemplateColumns: `repeat(${acts.length}, minmax(0, 1fr))` }}>
        {acts.map(([l, ic, kind, fn]) => <button key={l} type="button" onClick={fn} className="gb-focus min-h-[42px] rounded-[13px] text-[12px] font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98]" style={AK[kind]}><Icon name={ic} size={15} stroke={2.4} />{l}</button>)}
      </div>
    </div>
  );
}

function ResaTab({ ctx, newResa, openStay }) {
  const { reservations, now, fmt, actions, settings, isOwner, openReceipt } = ctx;
  const [day, setDay] = useState(0);
  const [cancelR, setCancelR] = useState(null);
  const [d0] = dayBounds(now);
  const days = Array.from({ length: 7 }, (_, i) => d0 + i * DAY);
  const live = reservations.filter((r) => isLiveResa(r));
  const from = days[day];
  const list = live.filter((r) => toMs(r.start) >= from && toMs(r.start) < from + DAY).sort((a, b) => toMs(a.start) - toMs(b.start));
  const wd = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return (
    <div>
      <div className="mt-3 grid grid-cols-7 gap-[5px]">
        {days.map((d, i) => {
          const on = i === day;
          const has = live.some((r) => toMs(r.start) >= d && toMs(r.start) < d + DAY);
          return (
            <button key={d} type="button" onClick={() => setDay(i)} aria-pressed={on} className="gb-focus rounded-[14px] flex flex-col items-center justify-center" style={{ height: 62, background: on ? H.indigo : "#fff", color: on ? "#fff" : H.ink, border: `1.5px solid ${on ? H.indigo : H.line}` }}>
              <span className="text-[10.5px] font-bold opacity-80">{i === 0 ? "Auj." : wd[new Date(d).getDay()]}</span>
              <span className="text-[17px] font-extrabold">{new Date(d).getDate()}</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: has ? (on ? "#fff" : H.indigo) : "transparent" }} />
            </button>
          );
        })}
      </div>
      <Label right={<span className="text-[12px]" style={{ color: H.muted }}>{list.length} réservation{list.length > 1 ? "s" : ""}</span>}>{day === 0 ? "Aujourd'hui" : new Date(from).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</Label>
      {list.length === 0 ? (
        <Empty icon="cal" title="Aucune réservation ce jour-là" text="La chambre réservée est bloquée automatiquement sur son créneau." action={<Btn kind="indigo" icon="plus" onClick={() => newResa({ dayStart: from })}>Nouvelle réservation</Btn>} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((r) => {
            const start = toMs(r.start);
            const left = start - now;
            const soon = left < 3 * HOUR;
            const deposit = Number(r.deposit) || 0;
            return (
              <div key={r.id} className="rounded-[20px] p-3" style={{ background: "#fff", boxShadow: H.shadow, border: `1.5px solid ${soon ? "#C7CBFA" : "#fff"}` }}>
                <div className="flex gap-3">
                  <span className="w-16 shrink-0 rounded-[14px] flex flex-col items-center justify-center py-2" style={{ background: H.indigoSoft, color: "#3730A3" }}>
                    <span className="text-[17px] font-extrabold">{hmOf(start)}</span>
                    <span className="text-[10px] font-extrabold opacity-80">{left > 0 ? `dans ${fmtShort(left)}` : "arrivée"}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2"><span className="text-[14.5px] font-extrabold truncate">{r.client || "Client"}</span><span className="text-[10.5px] font-extrabold rounded-[6px] px-1.5 py-0.5 shrink-0" style={{ background: H.greenSoft, color: H.green }}>Confirmée</span></span>
                    <span className="block text-[12px]" style={{ color: H.muted }}>{r.phone || "Sans téléphone"}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[12px] font-bold min-w-0"><span className="rounded-[7px] px-1.5 py-0.5 font-extrabold shrink-0" style={{ background: roomTypeOf(r.type).tint, color: roomTypeOf(r.type).ink }}>Ch. {r.roomNum}</span><span className="truncate" style={{ color: H.ink2 }}>{r.tariffName}{isNight(r) ? ` · départ ${dayLabel(toMs(r.end), now)} ${hmOf(toMs(r.end))}` : ` · jusqu'à ${hmOf(toMs(r.end))}`}</span></span>
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  {settings.reminderHours.map((h) => {
                    const sent = r.notified && r.notified[`r${h}`];
                    const off = r.reminders && r.reminders[`r${h}`] === false;
                    if (off) return null;
                    return <span key={h} className="h-[26px] px-2 rounded-[8px] text-[11px] font-extrabold flex items-center gap-1 whitespace-nowrap" style={{ background: sent ? H.greenSoft : H.indigoSoft, color: sent ? H.green : "#3730A3" }}><Icon name="bell" size={12} stroke={2.6} />{h} h · {sent ? "envoyé" : hmOf(start - h * HOUR)}</span>;
                  })}
                  <span className="ml-auto text-[12px] font-extrabold whitespace-nowrap">{deposit ? `Acompte ${fmt(deposit)}` : `${fmt(Number(r.price) || 0)} à payer`}</span>
                </div>
                <div className="mt-2.5 flex gap-2">
                  {r.phone && <a href={`tel:${String(r.phone).replace(/\s/g, "")}`} aria-label="Appeler le client" className="gb-focus w-12 shrink-0 min-h-[44px] rounded-[13px] flex items-center justify-center" style={{ border: `1.5px solid ${H.line}`, color: H.navy, background: "#fff" }}><Icon name="phone" size={18} /></a>}
                  {(r.receipts || []).length > 0 && <button type="button" onClick={() => openReceipt(r.receipts[r.receipts.length - 1])} aria-label="Voir le reçu" className="gb-focus w-12 shrink-0 min-h-[44px] rounded-[13px] flex items-center justify-center" style={{ border: `1.5px solid ${H.line}`, color: H.goldDark, background: "#fff" }}><Icon name="receipt" size={18} /></button>}
                  {isOwner && <Btn kind="danger" onClick={() => setCancelR(r)} className="!min-h-[44px] !text-[13px] !px-3">Annuler</Btn>}
                  <Btn kind="navy" icon="check" onClick={() => actions.arriveReservation(r)} className="flex-1 !min-h-[44px] !text-[13.5px]">Client arrivé</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {cancelR && <CancelSheet ctx={ctx} kind="resa" item={cancelR} onClose={() => setCancelR(null)} />}
    </div>
  );
}

// Page Ménage : chambres à nettoyer, en cours, hors service, et historique
// des chambres faites sur une plage de dates (par agent, durées).
const VIOLET_GRAD = "linear-gradient(140deg, #1E1240 0%, #3B1F7A 55%, #5B3CC4 100%)";
const durTxt = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad2(m % 60)}`; };
const dateKeyMs = (k) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : NaN; };

function MenageTab({ ctx }) {
  const { rooms, now, actions, isTech, userName, shop, reservations, sync, onLogout } = ctx;
  const [problem, setProblem] = useState(null);
  const [note, setNote] = useState("");
  const [range, setRange] = useState("today");
  const [d0] = dayBounds(now);
  const [cFrom, setCFrom] = useState(localDayKey(d0 - 6 * DAY));
  const [cTo, setCTo] = useState(localDayKey(now));
  let from = d0, to = d0 + DAY;
  if (range === "yesterday") { from = d0 - DAY; to = d0; }
  else if (range === "d7") from = d0 - 6 * DAY;
  else if (range === "month") from = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  else if (range === "custom") { const a = dateKeyMs(cFrom), b = dateKeyMs(cTo); if (Number.isFinite(a) && Number.isFinite(b)) { from = Math.min(a, b); to = Math.max(a, b) + DAY; } }

  const nextResaOf = (r) => reservations.filter((x) => isLiveResa(x) && x.roomId === r.id && toMs(x.end) > now).sort((a, b) => toMs(a.start) - toMs(b.start))[0] || null;
  const todo = rooms.filter((r) => r.cleaning && r.cleaning.state !== "done" && !r.outOfService).map((r) => {
    const nr = nextResaOf(r);
    const urgent = nr && toMs(nr.start) - now < 2 * HOUR;
    return { r, nr, urgent, doing: r.cleaning.state === "doing", since: r.cleaning.since || now };
  }).sort((a, b) => (b.urgent - a.urgent) || (b.doing - a.doing) || (a.since - b.since));
  const hs = rooms.filter((r) => r.outOfService);
  const done = [];
  rooms.forEach((r) => (r.cleanLog || []).forEach((e) => { if (e.doneAt >= from && e.doneAt < to) done.push({ ...e, room: r }); }));
  done.sort((a, b) => b.doneAt - a.doneAt);
  const issues = [];
  rooms.forEach((r) => (r.issueLog || []).forEach((e) => { if (e.at >= from && e.at < to) issues.push({ ...e, room: r }); }));
  issues.sort((a, b) => b.at - a.at);
  const work = done.filter((e) => e.startedAt).map((e) => e.doneAt - e.startedAt);
  const avg = work.length ? work.reduce((a, b) => a + b, 0) / work.length : 0;
  const agents = {};
  done.forEach((e) => { const k = e.by || "—"; const a = agents[k] || (agents[k] = { n: 0, ms: 0, c: 0 }); a.n += 1; if (e.startedAt) { a.ms += e.doneAt - e.startedAt; a.c += 1; } });
  const days = [];
  done.forEach((e) => { const k = localDayKey(e.doneAt); let d = days[days.length - 1]; if (!d || d.k !== k) { d = { k, at: e.doneAt, items: [] }; days.push(d); } d.items.push(e); });
  const dayTitle = (ms) => { const [s0] = dayBounds(ms); const w = new Date(ms).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); return s0 === d0 ? `Aujourd'hui · ${w}` : s0 === d0 - DAY ? `Hier · ${w}` : w.charAt(0).toUpperCase() + w.slice(1); };
  const dateTxt = new Date(now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const dateInput = { flex: 1, minWidth: 0, height: 42, borderRadius: 11, border: "none", background: "#F7F8FB", padding: "0 10px", fontSize: 13.5, fontWeight: 800, color: H.ink, fontFamily: "inherit" };

  return (
    <div>
      <div className="mt-1 rounded-[26px] p-4 text-white relative overflow-hidden" style={{ background: VIOLET_GRAD, boxShadow: "0 14px 30px -14px rgba(59,31,122,0.8)" }}>
        <span className="absolute rounded-full" style={{ right: -50, top: -60, width: 190, height: 190, background: "radial-gradient(circle, rgba(196,181,253,0.35) 0%, rgba(196,181,253,0) 70%)" }} />
        <div className="relative flex items-start gap-3">
          <span className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)" }}><Icon name="broom" size={24} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold tracking-[0.14em] truncate uppercase" style={{ color: "#DDD6FE" }}>{shop?.name || "Hôtel"}</p>
            <h1 className="text-[24px] font-extrabold leading-tight">Ménage</h1>
            <p className="text-[12px] truncate" style={{ color: "#DDD6FE" }}>{userName ? `${userName} · ` : ""}{dateTxt}</p>
          </div>
          {isTech && <button type="button" onClick={() => ctx.openMenu?.()} aria-label="Menu" className="gb-focus w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.14)" }}><Icon name="grid" size={18} /></button>}
        </div>
        <div className="relative mt-3 grid grid-cols-4 gap-1.5">
          {[["À faire", todo.filter((x) => !x.doing).length, "#FDE68A"], ["En cours", todo.filter((x) => x.doing).length, "#C4B5FD"], ["Faites", done.length, "#6EE7B7"], ["Durée moy.", work.length ? durTxt(avg) : "—", "#FFFFFF"]].map(([l, v, c]) => (
            <span key={l} className="rounded-[13px] px-2 py-2" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)" }}><span className="block text-[9.5px] font-bold whitespace-nowrap" style={{ color: "#DDD6FE" }}>{l}</span><span className="block text-[17px] font-extrabold whitespace-nowrap" style={{ color: c }}>{v}</span></span>
          ))}
        </div>
        {isTech && <p className="relative mt-2.5 flex items-center gap-1.5 text-[11px] font-bold" style={{ color: "#DDD6FE" }}><Icon name="sync" size={13} />{sync?.pending > 0 ? `${sync.pending} en attente de synchronisation` : "Synchronisé avec la réception"}</p>}
      </div>

      <div className="mt-4 mb-2 flex items-center gap-2.5">
        <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ background: "linear-gradient(135deg,#FBBF24,#EA580C)" }}><Icon name="broom" size={16} color="#fff" /></span>
        <span className="flex-1 text-[15.5px] font-extrabold">À nettoyer maintenant</span>
        <span className="text-[12px] font-bold" style={{ color: H.muted }}>{todo.length} chambre{todo.length > 1 ? "s" : ""}</span>
      </div>
      {todo.length === 0 ? <Empty icon="check" title="Tout est propre" text="Les chambres libérées apparaissent ici, les plus urgentes en premier." /> : (
        <div className="flex flex-col gap-2.5">
          {todo.map(({ r, nr, urgent, doing, since }) => {
            const T = roomTypeOf(r.type);
            const ref = doing ? r.cleaning.startedAt || since : since;
            const ink = doing ? "#6D28D9" : urgent ? "#C2410C" : "#B45309";
            return (
              <div key={r.id} className="rounded-[22px] overflow-hidden" style={{ background: "#fff", boxShadow: `0 10px 24px -14px ${doing ? "rgba(109,40,217,0.5)" : "rgba(234,88,12,0.45)"}`, border: `1.5px solid ${doing ? "#DDD6FE" : urgent ? "#FCD9A8" : "#FDE7C2"}` }}>
                {urgent && <div className="px-3.5 py-1.5 text-[11.5px] font-extrabold flex items-center gap-1.5 text-white" style={{ background: "linear-gradient(90deg,#F97316,#EA580C)" }}><Icon name="warn" size={13} stroke={2.6} />Prioritaire · réservée à {hmOf(toMs(nr.start))}{nr.client ? ` (${nr.client})` : ""}</div>}
                <div className="p-3.5 flex items-center gap-3">
                  <RoomBadge num={r.num} type={r.type} size={52} tone={doing ? { bg: H.violetSoft, fg: H.violet } : null} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5"><span className="text-[15px] font-extrabold">Chambre {r.num}</span><span className="h-[19px] px-1.5 rounded-[6px] text-[9.5px] font-extrabold flex items-center" style={{ background: doing ? H.violetSoft : "#FFF4E6", color: ink }}>{doing ? "EN COURS" : "À FAIRE"}</span></span>
                    <span className="block text-[11.5px] truncate" style={{ color: H.muted }}>{T.label} · {doing ? `commencé à ${hmOf(r.cleaning.startedAt)} par ${r.cleaning.by || "—"}` : `libérée à ${hmOf(since)}`}</span>
                    {!urgent && nr && <span className="block text-[11px] font-bold" style={{ color: H.indigo }}>Prochaine réservation {dayLabel(toMs(nr.start), now)} à {hmOf(toMs(nr.start))}</span>}
                  </span>
                  <span className="text-right shrink-0"><span className="block font-mono text-[18px] font-bold" style={{ color: ink }}>{fmtClock(now - ref).replace("+", "")}</span><span className="block text-[9.5px] font-extrabold tracking-[0.05em]" style={{ color: H.muted }}>{doing ? "DURÉE" : "ATTENTE"}</span></span>
                </div>
                <div className="px-3.5 pb-3.5 grid grid-cols-2 gap-2">
                  <Btn kind="ghost" icon="warn" onClick={() => { setProblem(r); setNote(""); }} className="!min-h-[46px] !text-[12.5px] !px-2">Problème</Btn>
                  {doing ? <Btn kind="green" icon="check" onClick={() => actions.cleaningDone(r)} className="!min-h-[46px] !text-[13px]">Chambre prête</Btn> : <Btn kind="navy" onClick={() => actions.cleaningStart(r)} className="!min-h-[46px] !text-[13px]" style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}>Commencer</Btn>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hs.length > 0 && (
        <>
          <Label right={<span className="text-[12px]" style={{ color: H.muted }}>{hs.length}</span>}>Hors service</Label>
          <Card className="px-3">
            {hs.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i === hs.length - 1 ? "none" : `1px solid ${H.line2}` }}>
                <RoomBadge num={r.num} type={r.type} tone={{ bg: "#EEF1F5", fg: "#475569" }} />
                <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold truncate">{r.hsNote || "Hors service"}</span><span className="block text-[12px] truncate" style={{ color: H.muted }}>{r.hsSince ? `Depuis ${dayLabel(r.hsSince, now)} ${hmOf(r.hsSince)}` : ""}{r.hsBy ? ` · ${r.hsBy}` : ""}</span></span>
                <Btn kind="ghost" onClick={() => actions.setOutOfService(r, false)} className="!min-h-[40px] !px-3 !text-[12.5px]" style={{ color: H.green, borderColor: "#C9EBD5" }}>Remettre</Btn>
              </div>
            ))}
          </Card>
        </>
      )}

      <div className="mt-5 mb-2 flex items-center gap-2.5">
        <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ background: "linear-gradient(135deg,#34D399,#059669)" }}><Icon name="check" size={16} color="#fff" stroke={2.6} /></span>
        <span className="flex-1 text-[15.5px] font-extrabold">Chambres faites</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {[["today", "Aujourd'hui"], ["yesterday", "Hier"], ["d7", "7 jours"], ["month", "Ce mois"], ["custom", "Plage…"]].map(([id, l]) => <Chip key={id} on={range === id} onClick={() => setRange(id)} color={H.violet} line={H.line} className="!min-h-[36px] !px-3 !text-[12px]">{l}</Chip>)}
      </div>
      <div className="mt-2 rounded-[16px] p-2 flex items-center gap-1.5" style={{ background: "#fff", border: `1.5px solid ${range === "custom" ? "#C4B5FD" : "#fff"}` }}>
        <Icon name="cal" size={16} color={H.violet} style={{ marginLeft: 4, flexShrink: 0 }} />
        {range === "custom" ? (
          <>
            <input type="date" aria-label="Du" value={cFrom} onChange={(e) => setCFrom(e.target.value)} style={dateInput} />
            <span className="font-extrabold" style={{ color: "#94A3B8" }}>→</span>
            <input type="date" aria-label="Au" value={cTo} onChange={(e) => setCTo(e.target.value)} style={dateInput} />
          </>
        ) : <span className="flex-1 text-[13px] font-extrabold px-1">Du {new Date(from).toLocaleDateString("fr-FR")} au {new Date(to - 1).toLocaleDateString("fr-FR")}</span>}
      </div>

      {Object.keys(agents).length > 0 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
          {Object.entries(agents).sort((a, b) => b[1].n - a[1].n).map(([name, a]) => (
            <span key={name} className="shrink-0 rounded-[16px] px-3 py-2 flex items-center gap-2.5" style={{ background: "#fff", boxShadow: H.shadow }}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-extrabold" style={{ background: H.violetSoft, color: H.violet }}>{name[0]}</span>
              <span><span className="block text-[12.5px] font-extrabold">{name}</span><span className="block text-[11px]" style={{ color: H.muted }}>{a.n} chambre{a.n > 1 ? "s" : ""}{a.c ? ` · moy. ${durTxt(a.ms / a.c)}` : ""}</span></span>
            </span>
          ))}
        </div>
      )}

      {days.length === 0 ? <div className="mt-2.5"><Empty icon="broom" title="Aucune chambre faite sur cette période" text="Chaque « Chambre prête » est enregistrée ici avec l'heure, la durée et l'agent." /></div> : days.map((d) => (
        <div key={d.k}>
          <div className="mt-3.5 mb-1.5 flex items-center gap-2 px-0.5"><span className="text-[13px] font-extrabold">{dayTitle(d.at)}</span><span className="flex-1 h-px" style={{ background: "#DDE2EA" }} /><span className="text-[11.5px] font-extrabold" style={{ color: H.violet }}>{d.items.length} chambre{d.items.length > 1 ? "s" : ""}</span></div>
          <Card className="px-3">
            {d.items.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i === d.items.length - 1 ? "none" : `1px solid ${H.line2}` }}>
                <RoomBadge num={e.room.num} type={e.room.type} size={42} />
                <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold">Prête à {hmOf(e.doneAt)}</span><span className="block text-[11.5px] truncate" style={{ color: H.muted }}>par {e.by || "—"}{e.since ? ` · attente ${durTxt((e.startedAt || e.doneAt) - e.since)}` : ""}</span></span>
                {e.startedAt ? <span className="h-[24px] px-2 rounded-[8px] text-[11px] font-extrabold flex items-center whitespace-nowrap" style={{ background: H.violetSoft, color: H.violet }}>{durTxt(e.doneAt - e.startedAt)}</span> : null}
              </div>
            ))}
          </Card>
        </div>
      ))}

      {issues.length > 0 && (
        <>
          <Label>Problèmes signalés sur la période</Label>
          <Card className="px-3">
            {issues.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i === issues.length - 1 ? "none" : `1px solid ${H.line2}` }}>
                <span className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: e.fixedAt ? H.greenSoft : "#FFF4E6", color: e.fixedAt ? H.green : "#C2410C" }}><Icon name={e.fixedAt ? "check" : "warn"} size={17} /></span>
                <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">Ch. {e.room.num} · {e.note}</span><span className="block text-[11.5px] truncate" style={{ color: H.muted }}>{new Date(e.at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} {hmOf(e.at)} · {e.by || "—"}{e.fixedAt ? ` · réglé ${hmOf(e.fixedAt)}` : " · en attente"}</span></span>
              </div>
            ))}
          </Card>
        </>
      )}

      {problem && (
        <Sheet title={`Problème · chambre ${problem.num}`} onClose={() => setProblem(null)}>
          <Field label="Que se passe-t-il ?"><input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : ventilateur en panne, fuite d'eau…" style={inputStyle} /></Field>
          <div className="mt-2 flex flex-wrap gap-2">{["Ventilateur en panne", "Climatiseur en panne", "Fuite d'eau", "Électricité", "Serrure", "Linge manquant"].map((t) => <Chip key={t} onClick={() => setNote(t)}>{t}</Chip>)}</div>
          <p className="mt-3 text-[12px]" style={{ color: H.muted }}>La chambre passe « Hors service » : elle ne pourra plus être louée jusqu'à sa remise en service. La réception est prévenue par la synchronisation.</p>
          <Btn kind="red" full className="mt-3" onClick={() => { actions.setOutOfService(problem, true, note.trim() || "Problème signalé"); setProblem(null); }}>Mettre hors service</Btn>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Louer (bouton central) ----------
function RentScreen({ ctx, preset, onStarted, onReserve, onNeedGuest }) {
  const { rooms, tariffs, stays, reservations, now, fmt, actions, settings, isOwner, setRoute } = ctx;
  const [type, setType] = useState(preset?.type || (rooms.some((r) => r.type === "vent") ? "vent" : "clim"));
  const [tariffId, setTariffId] = useState(null);
  const [roomId, setRoomId] = useState(preset?.roomId || null);
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState("cash");
  const [op, setOp] = useState(DEFAULT_MOMO);
  const [given, setGiven] = useState(0);
  const [print, setPrint] = useState(settings.receipt.ask !== false);
  useEffect(() => { if (preset) { setType(preset.type); setRoomId(preset.roomId); } }, [preset?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = tariffs.filter((t) => t.type === type && t.active !== false).sort((a, b) => (Number(a.hours) || 99) - (Number(b.hours) || 99));
  const tariff = list.find((t) => t.id === tariffId) || list[0] || null;
  const start = now;
  const end = tariff ? computeEnd(start, tariff, settings) : start;
  const free = tariff ? freeRoomsFor(rooms, type, start, end, { stays, reservations, now }) : [];
  const room = free.find((r) => r.id === roomId) || free[0] || null;
  const unit = Number(settings.unitPrice[type]) || 0;
  const price = Number(tariff?.price) || 0;
  // La somme reçue repart du « compte juste » à chaque changement de forfait.
  useEffect(() => { setGiven(price); }, [price]); // eslint-disable-line react-hooks/exhaustive-deps
  const short = pay === "cash" && given < price;
  if (!rooms.length) return <div className="pt-2"><TopBar title="Louer une chambre" /><div className="mt-3"><Empty icon="hash" title="Aucune chambre" text="Enregistrez d'abord les chambres de l'hôtel." action={isOwner ? <Btn kind="gold" icon="plus" onClick={() => setRoute({ name: "roomsConfig" })}>Ajouter des chambres</Btn> : null} /></div></div>;
  const startNow = () => {
    if (!tariff || !room) return;
    // Nuitée : fiche du client et photo de la pièce d'identité obligatoires.
    if (short) return;
    if (isNight(tariff) && onNeedGuest) { onNeedGuest({ room, tariff, payMode: pay, op: pay === "momo" ? op : "", given: pay === "cash" ? given : null, print, prefill: { lastName: client, phone } }); return; }
    const s = actions.startStay({ room, tariff, client, phone, payMode: pay, op: pay === "momo" ? op : "", given: pay === "cash" ? given : null });
    if (s) { setClient(""); setPhone(""); onStarted(s, print); }
  };
  return (
    <div>
      <TopBar title="Louer une chambre" sub="Type · forfait · chambre · paiement" right={<Btn kind="ghost" icon="cal" onClick={onReserve} className="!min-h-[44px] !px-3 !text-[12.5px]">Réserver</Btn>} />
      <div className="mt-3"><Segmented value={type} onChange={(t) => { setType(t); setTariffId(null); setRoomId(null); }} options={[{ id: "vent", label: "Ventilée", color: ROOM_TYPES.vent.ink }, { id: "clim", label: "Climatisée", color: ROOM_TYPES.clim.ink }]} /></div>
      <Label right={isOwner ? <button type="button" onClick={() => setRoute({ name: "tarifs" })} className="gb-focus text-[12px] font-extrabold" style={{ color: H.goldDark }}>Tarifs ›</button> : null}>Forfait</Label>
      {list.length === 0 ? <Empty icon="tag" title="Aucun forfait actif" text="Le propriétaire doit créer les forfaits dans Réglages › Tarifs." /> : (
        <div className="grid grid-cols-2 gap-2">
          {list.map((t) => {
            const on = tariff && t.id === tariff.id;
            const promo = Number(t.hours) > 1 && Number(t.price) < unit * Number(t.hours);
            return (
              <button key={t.id} type="button" onClick={() => { setTariffId(t.id); setRoomId(null); }} aria-pressed={on} className="gb-focus relative rounded-[18px] text-left px-3 py-2.5 flex flex-col" style={{ minHeight: 88, background: on ? roomTypeOf(type).soft : "#fff", border: on ? `2px solid ${H.navy}` : `1.5px solid ${H.line}` }}>
                <span className="text-[14px] font-extrabold pr-6">{t.name}</span>
                <span className="text-[11.5px]" style={{ color: H.muted }}>{isNight(t) ? `jusqu'à demain ${settings.checkoutTime}` : `${t.hours} heure${t.hours > 1 ? "s" : ""}`}</span>
                <span className="mt-auto flex items-center gap-1.5"><span className="text-[17px] font-extrabold" style={{ color: roomTypeOf(type).ink }}>{fmt(Number(t.price) || 0)}</span>{promo && <span className="text-[10px] font-extrabold rounded-[6px] px-1.5 py-0.5" style={{ background: H.greenSoft, color: H.green }}>PROMO</span>}</span>
                {on && <span className="absolute top-2.5 right-2.5 w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: H.navy }}><Icon name="check" size={13} color="#fff" stroke={3} /></span>}
              </button>
            );
          })}
        </div>
      )}
      <Label right={<span className="text-[12px]" style={{ color: H.muted }}>{free.length} disponible{free.length > 1 ? "s" : ""}</span>}>Chambre libre</Label>
      {free.length === 0 ? <p className="text-[12.5px] px-1" style={{ color: H.orange }}>Aucune chambre {roomTypeOf(type).label.toLowerCase()} libre pour ce forfait (occupée, au ménage ou réservée).</p> : (
        <div className="flex gap-2 flex-wrap">
          {free.map((r) => { const on = room && r.id === room.id; return <button key={r.id} type="button" onClick={() => setRoomId(r.id)} aria-pressed={on} className="gb-focus rounded-[13px] text-[14.5px] font-extrabold" style={{ width: 58, height: 46, background: on ? roomTypeOf(type).ink : "#fff", color: on ? "#fff" : H.ink, border: `1.5px solid ${on ? roomTypeOf(type).ink : H.line}` }}>{r.num}</button>; })}
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 rounded-[18px] px-3.5 py-3 text-white" style={{ background: H.navy }}>
        <Icon name="clock" size={22} color={H.gold} />
        <span className="flex-1 min-w-0"><span className="block text-[11.5px]" style={{ color: "#B8C4D6" }}>Début → fin calculée automatiquement</span><span className="block text-[17px] font-extrabold">{hmOf(start)} → {tariff ? (isNight(tariff) ? `${dayLabel(end, now)} ${hmOf(end)}` : hmOf(end)) : "—"}</span></span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <input aria-label="Nom du client (optionnel)" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client (optionnel)" style={inputStyle} />
        <input aria-label="Téléphone du client (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Téléphone" style={inputStyle} />
      </div>
      <Label>Paiement</Label>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(PAY_LABEL).map(([id, l]) => <Chip key={id} on={pay === id} onClick={() => setPay(id)} className="!px-1">{l}</Chip>)}
      </div>
      {pay === "momo" && <div className="mt-2.5"><MomoPicker value={op} onChange={setOp} /></div>}
      {pay === "cash" && tariff && <div className="mt-2.5"><CashGiven amount={price} given={given} setGiven={setGiven} fmt={fmt} /></div>}
      <div className="mt-2.5 flex items-center gap-3 rounded-[16px] px-3 py-2.5" style={{ background: "#fff", boxShadow: H.shadow }}>
        <Icon name="receipt" size={20} color={H.goldDark} />
        <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold">Afficher le reçu</span><span className="block text-[11.5px] truncate" style={{ color: H.muted }}>Imprimer ou partager · toujours visible ensuite</span></span>
        <Toggle on={print} onChange={setPrint} label="Afficher le reçu" />
      </div>
      <Btn kind="gold" full className="mt-4 !min-h-[56px] !text-[16px]" disabled={!tariff || !room || short} onClick={startNow}>{room && tariff ? (short ? `Il manque ${fmt(price - given)}` : isNight(tariff) ? `Fiche du client · chambre ${room.num}` : `Démarrer · chambre ${room.num} · ${fmt(price)}`) : "Choisissez un forfait et une chambre"}</Btn>
    </div>
  );
}

// ---------- Chambre en cours ----------
function StayScreen({ ctx, stay, onBack, onReleased, onOpenGuest }) {
  const { now, fmt, actions, rooms, stays, reservations, settings, tariffs, isOwner, openReceipt } = ctx;
  const [extraOpen, setExtraOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const receipts = stay.receipts || [];
  const [moveOpen, setMoveOpen] = useState(false);
  const [extraLabel, setExtraLabel] = useState("Boissons");
  const [extraAmount, setExtraAmount] = useState(1000);
  const start = toMs(stay.start);
  const end = toMs(stay.end);
  const total = Math.max(1, end - start);
  const elapsed = now - start;
  const rem = end - now;
  const over = rem < 0;
  const low = !over && rem < settings.endAlertMinutes * 60000;
  const deg = Math.min(360, Math.round((elapsed / total) * 360));
  const due = stayDue(stay);
  const T = roomTypeOf(stay.type);
  const night = tariffs.find((t) => t.type === stay.type && isNight(t) && t.active !== false);
  const curTotal = (Number(stay.price) || 0) + (stay.extensions || []).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const nightDiff = Math.max(0, (Number(night?.price) || 0) - curTotal);
  const moveTargets = sortRooms(rooms).filter((r) => r.id !== stay.roomId && !r.outOfService && roomState(r, { stays, reservations, now }).kind === "libre" && roomConflicts(r.id, now, Math.max(end, now + 60000), { stays, reservations, now }).length === 0);
  if (stay.status !== "active") {
    return <div className="pt-2"><TopBar title={`Chambre ${stay.roomNum}`} onBack={onBack} /><div className="mt-3"><Empty icon="check" title={stay.status === "cancelled" ? "Séjour annulé" : "Séjour terminé"} text={`${stay.status === "cancelled" ? "Annulé" : "Libérée"} ${stay.releasedAt ? `à ${hmOf(stay.releasedAt)}` : ""} · ${fmt(stayTotal(stay))}`} action={receipts.length ? <Btn kind="ghost" icon="receipt" onClick={() => openReceipt(receipts[receipts.length - 1])}>Voir le reçu</Btn> : null} /></div></div>;
  }
  return (
    <div>
      <div className="-mx-4 px-4 pt-2 pb-5 rounded-b-[32px] text-white" style={{ background: H.navy }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Retour" className="gb-focus w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.10)" }}><Icon name="back" size={20} stroke={2.4} /></button>
          <div className="flex-1 min-w-0"><p className="text-[20px] font-extrabold">Chambre {stay.roomNum}</p><p className="text-[12.5px] truncate" style={{ color: "#B8C4D6" }}><b style={{ color: stay.type === "clim" ? "#93C5FD" : "#5EEAD4" }}>{T.label}</b> · {stay.tariffName}</p></div>
          <span className="h-[30px] px-3 rounded-[10px] text-[12.5px] font-extrabold flex items-center" style={{ background: over ? H.orange : H.red }}>{over ? "Dépassée" : "Occupée"}</span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <span className="rounded-full flex items-center justify-center shrink-0" style={{ width: 136, height: 136, background: `conic-gradient(${over ? "#FB923C" : low ? "#F87171" : H.gold} 0 ${deg}deg, rgba(255,255,255,0.12) 0)` }}>
            <span className="rounded-full flex flex-col items-center justify-center" style={{ width: 116, height: 116, background: H.navy }}>
              <span className="text-[10.5px] font-extrabold tracking-[0.06em]" style={{ color: "#B8C4D6" }}>{over ? "DÉPASSÉ" : "RESTANT"}</span>
              <span className="font-mono text-[24px] font-bold mt-0.5">{over ? `+${fmtClock(-rem).replace("+", "")}` : fmtClock(rem)}</span>
            </span>
          </span>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div><p className="text-[11.5px]" style={{ color: "#B8C4D6" }}>Arrivée</p><p className="text-[16px] font-extrabold">{hmOf(start)}</p></div>
            <div><p className="text-[11.5px]" style={{ color: "#B8C4D6" }}>Fin prévue</p><p className="text-[16px] font-extrabold" style={{ color: H.gold }}>{isNight(stay) ? `${dayLabel(end, now)} ${hmOf(end)}` : hmOf(end)}</p></div>
            <div><p className="text-[11.5px]" style={{ color: "#B8C4D6" }}>Temps écoulé</p><p className="font-mono text-[16px] font-bold">{fmtClock(elapsed).replace("+", "")}</p></div>
          </div>
        </div>
      </div>

      <Card className="mt-3.5 px-3.5">
        {stay.guestId && (
          <button type="button" onClick={() => onOpenGuest(stay.guestId)} className="gb-focus w-full flex items-center justify-between gap-3 py-2.5 text-[13.5px] text-left" style={{ borderBottom: `1px solid ${H.line2}` }}>
            <span style={{ color: H.muted }}>Fiche client</span>
            <span className="flex items-center gap-1.5 font-extrabold" style={{ color: H.goldDark }}>Pièce d'identité<Icon name="chev" size={15} stroke={2.4} /></span>
          </button>
        )}
        {receipts.length > 0 && (
          <button type="button" onClick={() => openReceipt(receipts[receipts.length - 1])} className="gb-focus w-full flex items-center justify-between gap-3 py-2.5 text-[13.5px] text-left" style={{ borderBottom: `1px solid ${H.line2}` }}>
            <span style={{ color: H.muted }}>Reçu{receipts.length > 1 ? `s (${receipts.length})` : ""}</span>
            <span className="flex items-center gap-1.5 font-extrabold" style={{ color: H.goldDark }}><Icon name="receipt" size={15} />N° {receipts[receipts.length - 1].no}<Icon name="chev" size={15} stroke={2.4} /></span>
          </button>
        )}
        {[["Client", [stay.client, stay.phone].filter(Boolean).join(" · ") || "—"], ["Enregistré par", stay.by || "—"], ["Forfait", `${stay.tariffName} · ${fmt(Number(stay.price) || 0)}`]].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2.5 text-[13.5px]" style={{ borderBottom: `1px solid ${H.line2}` }}><span style={{ color: H.muted }}>{k}</span><b className="text-right truncate">{v}</b></div>
        ))}
        {(stay.extensions || []).length > 0 && <div className="flex justify-between gap-3 py-2.5 text-[13.5px]" style={{ borderBottom: `1px solid ${H.line2}` }}><span style={{ color: H.muted }}>Prolongations</span><b>{fmt((stay.extensions || []).reduce((t, e) => t + (Number(e.amount) || 0), 0))}</b></div>}
        <div className="flex justify-between items-center gap-3 py-2 text-[13.5px]" style={{ borderBottom: `1px solid ${H.line2}` }}>
          <span style={{ color: H.muted }}>Consommations</span>
          <span className="flex items-center gap-2.5"><b>{fmt((stay.extras || []).reduce((t, e) => t + (Number(e.amount) || 0), 0))}</b><button type="button" onClick={() => setExtraOpen(true)} aria-label="Ajouter une consommation" className="gb-focus w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ border: `1.5px solid ${H.line}` }}><Icon name="plus" size={14} stroke={3} /></button></span>
        </div>
        <div className="flex justify-between items-baseline gap-3 py-2.5 text-[13.5px]"><span style={{ color: H.muted }}>Total séjour</span><span><b className="text-[17px]">{fmt(stayTotal(stay))}</b> <span className="text-[11.5px] font-extrabold" style={{ color: due > 0 ? H.orange : H.green }}>{due > 0 ? `reste ${fmt(due)}` : "payé"}</span></span></div>
      </Card>

      {due > 0 && <Btn kind="green" full icon="money" onClick={() => setPayOpen(true)} className="mt-2.5 !text-[14.5px]">Encaisser {fmt(due)}</Btn>}

      <Label>Prolonger</Label>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => actions.extendStay(stay, 1)} className="gb-focus rounded-[16px] min-h-[60px] font-extrabold text-[14px]" style={{ background: "#fff", border: `1.5px solid ${ROOM_TYPES.vent.line}` }}>+ 1 heure<span className="block text-[12px] font-bold" style={{ color: ROOM_TYPES.vent.ink }}>+ {fmt(extensionPrice(stay, settings))}</span></button>
        <button type="button" disabled={isNight(stay) || !night} onClick={() => actions.toNight(stay)} className="gb-focus rounded-[16px] min-h-[60px] font-extrabold text-[14px] disabled:opacity-45" style={{ background: "#fff", border: `1.5px solid ${ROOM_TYPES.clim.line}` }}>Passer en nuitée<span className="block text-[12px] font-bold" style={{ color: ROOM_TYPES.clim.ink }}>{isNight(stay) ? "déjà en nuitée" : `+ ${fmt(nightDiff)}`}</span></button>
      </div>
      <div className="mt-2.5 flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[12px] font-bold" style={{ background: "#ECF8F6", color: "#0B6B61" }}><Icon name="speaker" size={18} />Alerte vocale {settings.endAlertMinutes} min avant la fin, puis à l'heure exacte.</div>
      <div className="mt-4 flex gap-2">
        <Btn kind="ghost" icon="swap" onClick={() => setMoveOpen(true)} className="!px-3 !text-[13px]">Changer</Btn>
        <Btn kind="navy" full onClick={() => { if (actions.releaseStay(stay)) onReleased(); }} className="flex-1 !min-h-[56px] !text-[16px]">Libérer la chambre</Btn>
      </div>
      {isOwner && <Btn kind="danger" full icon="ban" onClick={() => setCancelOpen(true)} className="mt-2.5 !min-h-[44px] !text-[13px]">Annuler ce séjour (propriétaire)</Btn>}
      <p className="mt-2 text-center text-[11.5px]" style={{ color: H.muted }}>{settings.cleaningRequired ? "Ensuite : ménage" : "Ensuite : chambre libre"}{settings.releaseVoice || settings.releaseNotify ? ` · annonce ${settings.releaseVoice && settings.releaseNotify ? "écrite et vocale" : settings.releaseVoice ? "vocale" : "écrite"} du numéro.` : "."}</p>

      {payOpen && <PaySheet title={`Encaisser · chambre ${stay.roomNum}`} amount={due} fmt={fmt} defaultPrint={settings.receipt.ask !== false} onClose={() => setPayOpen(false)} onConfirm={({ mode, op, given, print }) => { const rc = actions.collect(stay, mode, { given, op }); setPayOpen(false); if (rc && print) openReceipt(rc); }} />}
      {cancelOpen && <CancelSheet ctx={ctx} kind="stay" item={stay} onClose={() => setCancelOpen(false)} onDone={onBack} />}
      {extraOpen && (
        <Sheet title="Ajouter une consommation" onClose={() => setExtraOpen(false)}>
          <div className="flex flex-wrap gap-2">{["Boissons", "Repas", "Serviette", "Autre"].map((l) => <Chip key={l} on={extraLabel === l} onClick={() => setExtraLabel(l)}>{l}</Chip>)}</div>
          <div className="mt-3"><Stepper value={fmt(extraAmount)} onMinus={() => setExtraAmount((a) => Math.max(100, a - 500))} onPlus={() => setExtraAmount((a) => a + 500)} /></div>
          <Btn kind="navy" full className="mt-3" onClick={() => { actions.addExtra(stay, extraLabel, extraAmount); setExtraOpen(false); }}>Ajouter {fmt(extraAmount)}</Btn>
        </Sheet>
      )}
      {moveOpen && (
        <Sheet title="Changer de chambre" onClose={() => setMoveOpen(false)}>
          {moveTargets.length === 0 ? <p className="text-[13px]" style={{ color: H.muted }}>Aucune chambre libre jusqu'à la fin de ce séjour.</p> : (
            <div className="flex flex-wrap gap-2">
              {moveTargets.map((r) => <button key={r.id} type="button" onClick={() => { actions.changeRoom(stay, r); setMoveOpen(false); }} className="gb-focus rounded-[13px] px-3 min-h-[48px] font-extrabold text-[14px]" style={{ background: "#fff", border: `1.5px solid ${roomTypeOf(r.type).line}`, color: roomTypeOf(r.type).ink }}>{r.num} · {roomTypeOf(r.type).short}</button>)}
            </div>
          )}
          <p className="mt-3 text-[11.5px]" style={{ color: H.muted }}>Le prix et l'heure de fin ne changent pas.</p>
        </Sheet>
      )}
    </div>
  );
}


// ---------- Arrivée d'un client réservé : paiement avant d'ouvrir la chambre ----------
function ArrivalPayScreen({ ctx, resa, onBack, onConfirm }) {
  const { fmt, settings, guests, now } = ctx;
  const price = Number(resa.price) || 0;
  const deposit = Math.min(price, Number(resa.deposit) || 0);
  const rest = Math.max(0, price - deposit);
  const [mode, setMode] = useState(rest > 0 ? "cash" : "later");
  const [op, setOp] = useState(DEFAULT_MOMO);
  const [given, setGiven] = useState(rest);
  const [print, setPrint] = useState(settings.receipt.ask !== false);
  const guest = guests.find((g) => g.id === resa.guestId);
  const T = roomTypeOf(resa.type);
  const short = mode === "cash" && rest > 0 && given < rest;
  const start = Math.max(now, toMs(resa.start));
  return (
    <div>
      <TopBar title="Arrivée du client" sub="Étape finale · paiement" onBack={onBack} />
      <div className="mt-3 rounded-[22px] p-4 text-white" style={{ background: "linear-gradient(135deg,#0A1730,#1B3361)" }}>
        <div className="flex items-center gap-3">
          <RoomBadge num={resa.roomNum} type={resa.type} size={52} tone={{ bg: "rgba(255,255,255,0.14)", fg: "#fff" }} />
          <span className="flex-1 min-w-0"><span className="block text-[16px] font-extrabold">Chambre {resa.roomNum} · {T.label}</span><span className="block text-[12px] truncate" style={{ color: "#C9D3E6" }}>{resa.tariffName} · {isNight(resa) ? `départ ${dayLabel(toMs(resa.end), now)} ${hmOf(toMs(resa.end))}` : `jusqu'à ${hmOf(start + (Number(resa.hours) || 0) * HOUR)}`}</span></span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[["Prix", fmt(price), "#fff"], ["Acompte", fmt(deposit), "#6EE7B7"], ["Reste à payer", fmt(rest), "#67E8F9"]].map(([l, v, c]) => <span key={l} className="rounded-[13px] p-2" style={{ background: "rgba(255,255,255,0.08)" }}><span className="block text-[10px] font-bold" style={{ color: "#AEBBD2" }}>{l}</span><span className="block text-[14px] font-extrabold whitespace-nowrap" style={{ color: c }}>{v}</span></span>)}
        </div>
      </div>
      <Card className="mt-3 px-3.5 py-3 flex items-center gap-3">
        <span className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: H.greenSoft, color: H.green }}><Icon name="shield" size={19} /></span>
        <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{guest ? `${guest.lastName} ${guest.firstName || ""}`.trim() : resa.client}</span><span className="block text-[11.5px]" style={{ color: H.green }}>Fiche client et pièce d'identité enregistrées</span></span>
      </Card>
      {rest > 0 ? (
        <>
          <Label>Paiement du reste</Label>
          <div className="grid grid-cols-3 gap-2">{Object.entries(PAY_LABEL).map(([id, l]) => <Chip key={id} on={mode === id} onClick={() => setMode(id)} className="!px-1">{l}</Chip>)}</div>
          {mode === "cash" && <div className="mt-2.5"><CashGiven amount={rest} given={given} setGiven={setGiven} fmt={fmt} /></div>}
          {mode === "momo" && <div className="mt-2.5"><MomoPicker value={op} onChange={setOp} /></div>}
        </>
      ) : <p className="mt-3 text-[13px] font-bold px-1" style={{ color: H.green }}>Séjour entièrement payé par l'acompte.</p>}
      <div className="mt-2.5 flex items-center gap-3 rounded-[16px] px-3 py-2.5" style={{ background: "#fff", boxShadow: H.shadow }}>
        <Icon name="receipt" size={20} color={H.goldDark} />
        <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold">Afficher le reçu</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Imprimer, PDF ou partager</span></span>
        <Toggle on={print} onChange={setPrint} label="Afficher le reçu" />
      </div>
      <Btn kind="gold" full disabled={short} className="mt-4 !min-h-[56px] !text-[16px]" onClick={() => onConfirm({ payMode: rest > 0 ? mode : "later", op: mode === "momo" ? op : "", given: mode === "cash" ? given : null, print })}>{short ? `Il manque ${fmt(rest - given)}` : `Ouvrir la chambre ${resa.roomNum}${rest > 0 && mode !== "later" ? ` · ${fmt(rest)}` : ""}`}</Btn>
    </div>
  );
}
