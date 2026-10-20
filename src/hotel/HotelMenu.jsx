// src/hotel/HotelMenu.jsx
//
// Menu de l'hôtel (tiroir de gauche ouvert par « Menu » dans la barre du bas)
// et écrans qui en dépendent : règles automatiques, annonce de chambre
// libérée, questions fréquentes, sauvegarde et restauration des données.
// Chaque accès garde ses droits : le propriétaire voit tout, la réception
// seulement ses rubriques, le technicien de surface son compte.

import { useEffect, useRef, useState } from "react";
import { H, Icon, Btn, Card, TopBar, Toggle, GroupTitle } from "./HotelUI.jsx";
import { releaseMessage, cleaningMessage, hotelCashForDay, isActiveStay, localDayKey, hmOf, dayLabel, DAY } from "./hotelLogic.js";
import { exportBinaryFile } from "../nativeExport.js";

// Numéro d'assistance GestiOne (téléphone et WhatsApp), format international
// sans « + ». Laisser vide pour masquer la ligne « Appeler · WhatsApp ».
export const GESTIONE_SUPPORT_PHONE = "";

const APP_VERSION = "GestiOne Hôtel";

export function licenceText(license, licenseStatus) {
  const daysLeft = license?.expiresAt ? Math.ceil((new Date(license.expiresAt) - Date.now()) / DAY) : null;
  return license?.lifetime ? "À vie" : license?.planId === "trial" ? `Essai · ${Math.max(0, daysLeft ?? 0)} j` : licenseStatus === "expired" ? "Expirée" : daysLeft != null ? `${daysLeft} j` : "—";
}

const ago = (ms, now) => {
  if (!ms) return "jamais";
  const d = Math.floor((now - ms) / DAY);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return "hier";
  return `il y a ${d} j`;
};

// ---------- Tiroir du menu ----------
export function HotelMenuDrawer({ ctx, tab, license, licenseStatus, onClose, onTab, go, onSupport, onLegal, faq }) {
  const { shop, settings, isOwner, isTech, stays, rooms, expenses, reservations, now, fmt, sync, userName, onLogout, staffCount } = ctx;
  const recep = !isOwner && !isTech;
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(false);
  const [openS, setOpenS] = useState(true);
  const [openA, setOpenA] = useState(true);
  useEffect(() => { const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, []);
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setShown(false); setTimeout(onClose, 180); };
  const pick = (fn) => () => { onClose(); fn(); };

  // Accès discret de l'éditeur GestiOne : 7 appuis rapides sur l'icône dorée.
  const taps = useRef({ n: 0, at: 0 });
  const [pulse, setPulse] = useState(false);
  const tapIcon = () => {
    const t = Date.now();
    taps.current.n = t - taps.current.at < 1500 ? taps.current.n + 1 : 1;
    taps.current.at = t;
    setPulse((p) => !p);
    if (taps.current.n >= 7) { taps.current.n = 0; onClose(); ctx.onEditorOpen?.(); }
  };

  const cash = hotelCashForDay({ stays, expenses, reservations, now });
  const usable = rooms.filter((r) => !r.outOfService).length;
  const busy = stays.filter((s) => isActiveStay(s)).length;
  const occ = usable ? Math.round((busy / usable) * 100) : 0;
  const todayExp = (expenses || []).filter((e) => e.date === localDayKey(now)).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const syncTxt = sync?.pending > 0 ? `${sync.pending} en attente` : "À jour";
  const syncInk = sync?.pending > 0 ? H.orange : H.green;
  const lic = licenceText(license, licenseStatus);
  const lastBackup = (settings.backupLog || []).find((x) => x.kind === "backup");
  const backupOld = !lastBackup || now - lastBackup.at > 7 * DAY;

  const r = (id, t, s, bg, fg, icon, onClick, v = "", vc = H.ink2) => ({ id, t, s, bg, fg, icon, onClick, v, vc });
  const helpRows = [
    r("support", "Écrire à l'équipe GestiOne", "Messagerie · réponse rapide", "#E0F2FE", "#0369A1", "chat", pick(onSupport)),
    faq?.length ? r("faq", "Questions fréquentes", "Réservations, reçus, synchronisation…", "#EDF2F7", "#3B5B7A", "book", pick(() => go("faq"))) : null,
    isOwner ? r("order", "Commander une licence", "Message pré-rempli · paiement Mobile Money", "#E0F7FB", "#0E7490", "cart", pick(() => go("order"))) : null,
    GESTIONE_SUPPORT_PHONE ? r("call", "Appeler · WhatsApp", "Assistance du lundi au samedi", "#ECFDF3", "#15803D", "phone", () => { try { window.open(`https://wa.me/${GESTIONE_SUPPORT_PHONE}`, "_blank"); } catch { /* ignore */ } }) : null,
    onLegal ? r("legal", "Conditions et confidentialité", "Documents GestiOne", "#F1F5F9", "#475569", "shield", pick(() => onLegal("terms"))) : null,
  ].filter(Boolean);
  const syncRow = r("sync", "Synchronisation", `Automatique toutes les ${settings.syncMinutes} min`, H.greenSoft, H.green, "sync", pick(() => go("sync")), syncTxt, syncInk);

  let blocks;
  if (isTech) {
    blocks = [
      { title: "MON COMPTE" },
      { list: [r("me", userName || "Mon compte", "Technicien de surface · accès ménage", H.violetSoft, H.violet, "user", null)] },
      { sub: "S", t: "Réglages de l'entreprise", s: "Mon accès sur ce téléphone", icon: "gear", rows: [syncRow] },
      { sub: "A", t: "Assistance", s: "Aide et contact GestiOne", icon: "help", rows: helpRows },
    ];
  } else if (recep) {
    blocks = [
      { title: "AU QUOTIDIEN" },
      { list: [
        r("home", "Tableau de bord", "Accueil de la réception", H.navy, "#67E8F9", "dash", pick(() => onTab("home")), "", "", tab === "home"),
        r("expenses", "Dépenses", "Enregistrer une dépense", H.redSoft, H.red, "money", pick(() => go("expenses")), `−${fmt(todayExp)}`, H.red),
        r("guests", "Clients", "Fiches, pièces d'identité, passages", "#EEF0FF", "#4F46E5", "users", pick(() => go("guests")), String((ctx.guests || []).length)),
      ] },
      { sub: "S", t: "Réglages de l'entreprise", s: "Mon accès sur ce téléphone", icon: "gear", rows: [syncRow] },
      { sub: "A", t: "Assistance", s: "Aide et contact GestiOne", icon: "help", rows: helpRows },
    ];
  } else {
    blocks = [
      { list: [r("home", "Tableau de bord", "Recette, occupation, alertes", H.navy, "#67E8F9", "dash", pick(() => onTab("home")))] },
      { title: "FINANCES", own: true },
      { list: [
        r("cash", "Caisse & reçus", "Encaissements, reçus du jour", H.greenSoft, H.green, "wallet", pick(() => onTab("cash")), fmt(cash.total), H.green),
        r("receipts", "Reçus", "Tous les reçus · annulations", "#F5F3FF", "#6D28D9", "receipt", pick(() => go("receipts"))),
        r("expenses", "Dépenses", "Déduites de la recette du jour", H.redSoft, H.red, "money", pick(() => go("expenses")), `−${fmt(todayExp)}`, H.red),
        r("history", "Historique", "Toutes les opérations, par date", "#E7EEFD", "#1B3361", "history", pick(() => go("history"))),
        r("guests", "Clients", "Fiches, pièces d'identité, passages", "#EEF0FF", "#4F46E5", "users", pick(() => go("guests")), String((ctx.guests || []).length)),
        r("inventory", "Inventaire", "Occupation des chambres", "#E2F5F2", "#0B7A6E", "clipboard", pick(() => go("inventory"))),
        r("profits", "Bénéfices", "Mois · trimestre · semestre · année", H.goldSoft, H.goldDark, "trend", pick(() => go("profits"))),
      ] },
      { title: "ÉQUIPE", own: true },
      { list: [r("staff", "Personnel & accès", "Réception, ménage, blocage", "#EFEAFB", "#6B4FB8", "users", pick(() => go("staff")), String(staffCount || 0))] },
      { sub: "S", t: "Réglages de l'entreprise", s: "Hôtel, reçus, règles, données, licence", icon: "gear", rows: [
        r("roomsConfig", "Chambres & numéros", "Ventilées et climatisées", "#E2F5F2", "#0B7A6E", "hash", pick(() => go("roomsConfig")), String(rooms.length)),
        r("tarifs", "Tarifs & forfaits", `Heures, prix · nuitée ${settings.checkoutTime}`, H.orangeSoft, H.orange, "tag", pick(() => go("tarifs")), String(ctx.tariffs.filter((t) => t.active !== false).length)),
        r("receiptSettings", "Logo et reçus", settings.receipt.logo ? "Logo, en-tête, message, papier" : "Logo par défaut · ajoutez le vôtre", "#F5F3FF", "#6D28D9", "receipt", pick(() => go("receiptSettings"))),
        r("rules", "Règles automatiques", "Ménage obligatoire, rappels", H.indigoSoft, H.indigo, "sliders", pick(() => go("rules")), settings.cleaningRequired || settings.voiceAlerts ? "Activées" : "Arrêtées", settings.cleaningRequired || settings.voiceAlerts ? H.green : H.muted),
        r("announce", "Annonces des chambres", "Libération et ménage · écrite et vocale", "#ECF8F6", "#0B6B61", "speaker", pick(() => go("announce")), settings.releaseNotify || settings.releaseVoice ? "Oui" : "Non", settings.releaseNotify || settings.releaseVoice ? H.green : H.muted),
        syncRow,
        r("backup", "Sauvegarde & restauration", "Fichier de sauvegarde de l'hôtel", "#E0F2FE", "#0369A1", "save", pick(() => go("backup")), lastBackup ? ago(lastBackup.at, now) : "À faire", backupOld ? H.orange : H.green),
        r("licence", "Licence", license?.planId === "trial" ? "Essai gratuit de 14 jours" : "Durée, activation, commande", H.goldSoft, H.goldDark, "key", pick(() => go("licence")), lic, H.goldDark),
      ] },
      { sub: "A", t: "Assistance", s: "Aide, messagerie et licence", icon: "help", rows: helpRows },
    ];
  }
  // Recherche : liste à plat des rubriques correspondantes.
  const qn = q.trim().toLowerCase();
  const all = blocks.flatMap((b) => b.list || b.rows || []).filter((x) => x.onClick);
  const found = qn ? all.filter((x) => `${x.t} ${x.s}`.toLowerCase().includes(qn)) : null;

  const RowItem = ({ x, first, small }) => {
    const Tag = x.onClick ? "button" : "div";
    return (
      <Tag type={x.onClick ? "button" : undefined} onClick={x.onClick || undefined} className={`${x.onClick ? "gb-focus " : ""}w-full text-left flex items-center ${small ? "gap-2.5 min-h-[48px]" : "gap-3 min-h-[54px] px-3"}`} style={{ borderTop: small || first ? "none" : `1px solid ${H.line2}`, background: !small && x.id === tab ? "#F5F7FB" : "transparent" }}>
        <span className={`${small ? "w-[30px] h-[30px] rounded-[9px]" : "w-[34px] h-[34px] rounded-[11px]"} flex items-center justify-center shrink-0`} style={{ background: x.bg, color: x.fg }}><Icon name={x.icon} size={small ? 15 : 17} stroke={2.2} /></span>
        <span className="flex-1 min-w-0"><span className={`block ${small ? "text-[13px]" : "text-[14px]"} font-extrabold truncate`}>{x.t}</span><span className="block text-[11px] truncate" style={{ color: H.muted }}>{x.s}</span></span>
        {x.v ? <span className="text-[11.5px] font-extrabold whitespace-nowrap" style={{ color: x.vc }}>{x.v}</span> : null}
        {x.onClick && <Icon name="chev" size={14} color="#B5BAC0" stroke={2.4} />}
      </Tag>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] no-print" role="dialog" aria-modal="true" aria-label="Menu de l'hôtel">
      <button type="button" aria-label="Fermer le menu" onClick={close} className="absolute inset-0 w-full h-full" style={{ background: "rgba(9,18,34,0.55)", opacity: shown ? 1 : 0, transition: "opacity 180ms" }} />
      <div className="absolute left-0 top-0 bottom-0 flex flex-col" style={{ width: "min(350px, 88vw)", background: "#F4F6FA", boxShadow: "14px 0 44px rgba(0,0,0,0.32)", transform: shown ? "translateX(0)" : "translateX(-102%)", transition: "transform 200ms ease-out" }}>
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: "calc(18px + env(safe-area-inset-bottom))" }}>
          {/* En-tête sombre : la barre d'état du téléphone reste lisible. */}
          <div className="relative overflow-hidden text-white px-4 pb-4" style={{ paddingTop: "calc(max(40px, env(safe-area-inset-top)) + 12px)", background: "linear-gradient(145deg, #0B1628 0%, #14294A 55%, #1B3361 100%)" }}>
            <span className="absolute rounded-full" style={{ right: -50, top: -60, width: 190, height: 190, background: "radial-gradient(circle, rgba(34,211,238,0.38) 0%, rgba(34,211,238,0) 70%)" }} />
            <span className="absolute rounded-full" style={{ left: -40, bottom: -80, width: 170, height: 170, background: "radial-gradient(circle, rgba(96,165,250,0.18) 0%, rgba(96,165,250,0) 70%)" }} />
            <div className="relative flex items-center gap-3">
              <span onClick={tapIcon} className="select-none w-[50px] h-[50px] rounded-[16px] flex items-center justify-center shrink-0" style={{ border: "2px solid rgba(255,255,255,0.25)", background: "linear-gradient(135deg, #67E8F9, #0891B2)", boxShadow: "0 8px 18px -6px rgba(8,145,178,0.7)", transform: pulse ? "scale(0.95)" : "scale(1)", transition: "transform 90ms" }}><Icon name="bed" size={24} color={H.navy} stroke={2.4} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] font-extrabold tracking-[0.16em]" style={{ color: "#E9C77F" }}>GESTIONE HÔTEL</p>
                <p className="text-[18px] font-extrabold truncate">{shop?.name || "Mon hôtel"}</p>
                <p className="text-[12px] flex items-center gap-1.5 min-w-0" style={{ color: "#C9D3E6" }}><span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: "#34D399" }} /><span className="truncate">{userName || (isOwner ? "Propriétaire" : "")} · {isOwner ? "propriétaire" : isTech ? "technicien de surface" : "réception"}</span></p>
              </div>
              <button type="button" onClick={close} aria-label="Fermer" className="gb-focus w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}><Icon name="x" size={16} stroke={2.4} /></button>
            </div>
            {isOwner ? (
              <div className="relative mt-3.5 grid grid-cols-3 gap-[7px]">
                {[["Recette du jour", fmt(cash.total), "#6EE7B7"], ["Occupation", `${occ} %`, "#FFFFFF"], ["Licence", lic, "#67E8F9"]].map(([l, v, c]) => (
                  <button key={l} type="button" onClick={pick(() => (l === "Licence" ? go("licence") : l === "Occupation" ? onTab("rooms") : onTab("cash")))} className="gb-focus text-left rounded-[13px] px-2.5 py-2 min-w-0" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <span className="block text-[9.5px] font-bold" style={{ color: "#AEBBD2" }}>{l}</span>
                    <span className="block text-[13.5px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: c }}>{v}</span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="relative mt-3 inline-flex h-[26px] px-2.5 rounded-[13px] items-center text-[11.5px] font-extrabold" style={{ background: "rgba(255,255,255,0.1)", color: "#C9D3E6" }}>{isTech ? "Accès ménage uniquement" : "Accès réception"}</span>
            )}
          </div>

          <div className="px-3 pt-2.5">
            <label className="h-[42px] rounded-[13px] flex items-center gap-2 px-3" style={{ background: "#fff", border: `1px solid ${H.line}` }}>
              <Icon name="search" size={15} color="#94A3B8" stroke={2.3} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une rubrique" aria-label="Rechercher une rubrique" className="flex-1 min-w-0 bg-transparent outline-none text-[14px]" style={{ color: H.ink }} />
              {q && <button type="button" onClick={() => setQ("")} aria-label="Effacer" className="gb-focus w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ color: H.muted }}><Icon name="x" size={14} stroke={2.4} /></button>}
            </label>
          </div>

          <div className="px-3 pt-1">
            {ctx.editorOn && (
              <button type="button" onClick={pick(() => ctx.onEditorOpen?.())} className="gb-focus mt-2 w-full text-left rounded-[18px] p-3 text-white flex items-center gap-3" style={{ background: "linear-gradient(150deg, #10251F, #1C4A3A)" }}>
                <span className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #22D3EE, #0891B2)" }}><Icon name="shieldok" size={20} color="#10251F" /></span>
                <span className="flex-1 min-w-0"><span className="block text-[9.5px] font-extrabold tracking-[0.15em]" style={{ color: "#22D3EE" }}>ÉDITEUR GESTIONE</span><span className="block text-[14.5px] font-extrabold">Espace propriétaire</span></span>
                <Icon name="chev" size={16} color="#22D3EE" stroke={2.4} />
              </button>
            )}

            {found ? (
              <div className="mt-2.5 rounded-[16px] overflow-hidden" style={{ background: "#fff", border: `1px solid ${H.line}` }}>
                {found.length ? found.map((x, i) => <RowItem key={x.id} x={x} first={i === 0} />) : <p className="px-3 py-4 text-[13px] text-center" style={{ color: H.muted }}>Aucune rubrique pour « {q} »</p>}
              </div>
            ) : blocks.map((b, i) => {
              if (b.title) return (
                <div key={i} className="pt-3 pb-1.5 px-1.5 flex items-center gap-1.5">
                  <span className="flex-1 text-[10.5px] font-extrabold tracking-[0.1em]" style={{ color: H.muted }}>{b.title}</span>
                  {b.own && <span className="text-[9.5px] font-extrabold rounded-[6px] px-1.5 py-[2px]" style={{ background: H.goldSoft, color: H.goldDark }}>Propriétaire</span>}
                </div>
              );
              if (b.list) return (
                <div key={i} className={`${i === 0 ? "mt-2.5 " : ""}rounded-[16px] overflow-hidden`} style={{ background: "#fff", border: `1px solid ${H.line}` }}>
                  {b.list.map((x, j) => <RowItem key={x.id} x={x} first={j === 0} />)}
                </div>
              );
              const navy = b.sub === "S";
              const open = navy ? openS : openA;
              return (
                <div key={i} className="mt-2.5 rounded-[18px] overflow-hidden" style={{ background: "#fff", border: `1.5px solid ${navy ? "#C7D2E5" : "#BFE7E0"}`, boxShadow: navy ? "0 10px 22px -14px rgba(14,28,51,0.7)" : "0 10px 22px -16px rgba(11,122,110,0.6)" }}>
                  <button type="button" onClick={() => (navy ? setOpenS(!openS) : setOpenA(!openA))} aria-expanded={open} className="gb-focus w-full min-h-[60px] flex items-center gap-3 px-3 text-left" style={{ background: navy ? "linear-gradient(135deg,#14294A,#1B3361)" : "linear-gradient(135deg,#ECFDF5,#E0F2FE)", color: navy ? "#fff" : H.ink }}>
                    <span className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0" style={{ background: navy ? "linear-gradient(135deg,#67E8F9,#0891B2)" : "#fff" }}><Icon name={b.icon} size={19} color={navy ? H.navy : "#0B7A6E"} /></span>
                    <span className="flex-1 min-w-0"><span className="block text-[14.5px] font-extrabold">{b.t}</span><span className="block text-[11px] truncate" style={{ opacity: 0.78 }}>{b.s}</span></span>
                    <span className="text-[10.5px] font-extrabold px-[7px] py-[3px] rounded-[7px]" style={{ background: navy ? "rgba(255,255,255,0.16)" : "#fff" }}>{b.rows.length}</span>
                    <Icon name="down" size={16} stroke={2.6} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                  </button>
                  {open && (
                    <div className="relative pl-[22px] pr-2.5 pt-0.5 pb-2">
                      <span className="absolute" style={{ left: 30, top: 0, bottom: 14, width: 2, background: H.line2 }} />
                      {b.rows.map((x) => (
                        <div key={x.id} className="relative pl-5">
                          <span className="absolute" style={{ left: 8, top: 23, width: 12, height: 2, background: H.line2 }} />
                          <RowItem x={x} small />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <button type="button" onClick={pick(onLogout)} className="gb-focus mt-3 w-full h-[48px] rounded-[14px] flex items-center justify-center gap-2 text-[13.5px] font-extrabold" style={{ background: "#fff", border: "1.5px solid #FBCFD8", color: "#BE123C" }}>
              <Icon name="logout" size={16} stroke={2.4} />{recep ? "Se déconnecter · changer de réceptionniste" : "Se déconnecter"}
            </button>
            <p className="mt-2 text-center text-[10.5px]" style={{ color: "#94A3B8" }}>{APP_VERSION}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Règles automatiques ----------
export function RulesScreen({ ctx, onBack }) {
  const { settings, save, shop } = ctx;
  const setS = (patch) => save.shopMeta({ ...shop, hotelSettings: { ...settings, ...patch } });
  const line = (t, s, on, k, last) => (
    <div className="min-h-[60px] flex items-center gap-3" style={{ borderBottom: last ? "none" : `1px solid ${H.line2}` }}>
      <span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">{t}</span><span className="block text-[11.5px]" style={{ color: H.muted }}>{s}</span></span>
      <Toggle on={on} onChange={(v) => setS({ [k]: v })} label={t} />
    </div>
  );
  return (
    <div>
      <TopBar title="Règles automatiques" sub="Réglages de l'entreprise · propriétaire" onBack={onBack} />
      <Card className="mt-3 px-3">
        {line("Ménage obligatoire", "Après chaque départ, la chambre passe en ménage avant d'être relouée", settings.cleaningRequired, "cleaningRequired")}
        {line("Annonces vocales des actions", `Locations, prolongations, nuitées, paiements, réservations · rappels ${settings.reminderHours.join(" h et ")} h avant`, settings.voiceAlerts, "voiceAlerts", true)}
      </Card>
      <p className="mt-3 px-1 text-[12px] leading-relaxed" style={{ color: H.muted }}>Ces règles s'appliquent sur tous les téléphones de l'hôtel après la prochaine synchronisation.</p>
    </div>
  );
}

// ---------- Annonce d'une chambre libérée ----------
export function AnnounceScreen({ ctx, onBack }) {
  const { settings, save, shop } = ctx;
  const setS = (patch) => save.shopMeta({ ...shop, hotelSettings: { ...settings, ...patch } });
  return (
    <div>
      <TopBar title="Annonces des chambres" sub="Libération et ménage · propriétaire" onBack={onBack} />
      <Card className="mt-3 px-3">
        <div className="flex items-start gap-2.5 py-3" style={{ borderBottom: `1px solid ${H.line2}` }}>
          <span className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: H.violetSoft, color: H.violet }}><Icon name="broom" size={18} /></span>
          <span className="flex-1 min-w-0 text-[12.5px] font-bold leading-snug" style={{ color: H.ink2 }}>« {releaseMessage("4", settings.cleaningRequired)} »<span className="block mt-0.5 text-[11px] font-semibold" style={{ color: H.muted }}>Annoncé sur tous les téléphones de l'hôtel (réception et ménage) dès que la chambre est libérée.</span></span>
        </div>
        <div className="min-h-[56px] flex items-center gap-3" style={{ borderBottom: `1px solid ${H.line2}` }}><span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">Notification écrite</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Message affiché sur le téléphone</span></span><Toggle on={settings.releaseNotify} onChange={(v) => setS({ releaseNotify: v })} label="Notification écrite à la libération" /></div>
        <div className="min-h-[56px] flex items-center gap-3" style={{ borderBottom: `1px solid ${H.line2}` }}><span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">Annonce vocale</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Le téléphone prononce le numéro de la chambre</span></span><Toggle on={settings.releaseVoice} onChange={(v) => setS({ releaseVoice: v })} label="Annonce vocale à la libération" /></div>
        <div className="py-3"><Btn kind="ghost" full onClick={() => ctx.announceRelease?.("4")} className="!min-h-[46px] !text-[13.5px] whitespace-nowrap"><Icon name="speaker" size={18} />Tester l'annonce</Btn></div>
      </Card>
      <Card className="mt-3 px-3">
        <div className="flex items-start gap-2.5 py-3" style={{ borderBottom: `1px solid ${H.line2}` }}>
          <span className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: H.greenSoft, color: H.green }}><Icon name="speaker" size={18} /></span>
          <span className="flex-1 min-w-0 text-[12.5px] font-bold leading-snug" style={{ color: H.ink2 }}>« {cleaningMessage("8", "start")} »<span className="block mt-1">« {cleaningMessage("8", "done")} »</span><span className="block mt-0.5 text-[11px] font-semibold" style={{ color: H.muted }}>Annoncé sur tous les téléphones de l'hôtel quand le ménage commence (bouton « Commencer ») et quand la chambre est prête.</span></span>
        </div>
        <div className="min-h-[56px] flex items-center gap-3"><span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">Annonce vocale du ménage</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Début et fin du ménage de chaque chambre</span></span><Toggle on={settings.cleaningVoice !== false} onChange={(v) => setS({ cleaningVoice: v })} label="Annonce vocale du ménage" /></div>
      </Card>
    </div>
  );
}

// ---------- Questions fréquentes ----------
export function FaqScreen({ faq = [], onBack, onSupport }) {
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const qn = q.trim().toLowerCase();
  const items = faq.filter((f) => f.a).filter((f) => !qn || `${f.q} ${f.a}`.toLowerCase().includes(qn));
  const groups = [...new Set(items.map((f) => f.group || "Général"))];
  return (
    <div>
      <TopBar title="Questions fréquentes" sub="Assistance GestiOne" onBack={onBack} />
      <label className="mt-3 h-[46px] rounded-[14px] flex items-center gap-2 px-3" style={{ background: "#fff", border: `1.5px solid ${H.line}` }}>
        <Icon name="search" size={16} color="#94A3B8" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une question" aria-label="Rechercher une question" className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px]" />
      </label>
      {groups.map((g) => (
        <div key={g}>
          <GroupTitle>{g.toUpperCase()}</GroupTitle>
          <Card className="px-3">
            {items.filter((f) => (f.group || "Général") === g).map((f, i, a) => {
              const on = open === f.q;
              return (
                <div key={f.q} style={{ borderBottom: i === a.length - 1 ? "none" : `1px solid ${H.line2}` }}>
                  <button type="button" onClick={() => setOpen(on ? null : f.q)} aria-expanded={on} className="gb-focus w-full min-h-[52px] py-2 flex items-center gap-2 text-left">
                    <span className="flex-1 text-[13.5px] font-extrabold">{f.q}</span>
                    <Icon name="down" size={16} color={H.muted} style={{ transform: on ? "rotate(180deg)" : "none" }} />
                  </button>
                  {on && <p className="pb-3 text-[13px] leading-relaxed" style={{ color: H.ink2 }}>{f.a}</p>}
                </div>
              );
            })}
          </Card>
        </div>
      ))}
      {!items.length && <p className="mt-6 text-center text-[13px]" style={{ color: H.muted }}>Aucune question trouvée.</p>}
      {onSupport && <Btn kind="navy" full icon="chat" className="mt-4" onClick={onSupport}>Poser ma question à l'équipe</Btn>}
    </div>
  );
}

// ---------- Sauvegarde et restauration ----------
const BACKUP_FORMAT = "gestione-hotel-backup";
const KEYS = [
  ["rooms", "chambres", "#E2F5F2", "#0B7A6E"], ["tariffs", "forfaits", "#FFF1E2", "#C2410C"], ["stays", "séjours", "#FFF1F3", "#BE123C"],
  ["reservations", "réservations", "#F5F3FF", "#6D28D9"], ["guests", "fiches clients", "#E7EEFD", "#2457B8"], ["expenses", "dépenses", "#FDECEC", "#B91C1C"],
];

function deviceId() {
  try {
    let id = localStorage.getItem("gestione:hotelDevice");
    if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem("gestione:hotelDevice", id); }
    return id;
  } catch { return "x"; }
}
function deviceModel() {
  try { const m = /Android [\d.]+; ([^;)]+)/.exec(navigator.userAgent); return m ? m[1].replace(/ Build.*$/, "").trim() : /iPhone/.test(navigator.userAgent) ? "iPhone" : "Ordinateur"; } catch { return "Téléphone"; }
}
const slug = (s) => String(s || "Hotel").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Hotel";
const dmy = (ms) => { const d = new Date(ms); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };
const ymd = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const sizeTxt = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export function buildHotelBackup(ctx) {
  const { shop, settings, rooms, tariffs, stays, reservations, guests, expenses, by } = ctx;
  const { backupLog, ...hotelSettings } = settings; // eslint-disable-line no-unused-vars
  return {
    format: BACKUP_FORMAT, version: 1, createdAt: Date.now(), by, device: deviceModel(),
    shopId: shop?.id || null, hotelName: shop?.name || "",
    data: { rooms: rooms || [], tariffs: tariffs || [], stays: stays || [], reservations: reservations || [], guests: guests || [], expenses: expenses || [] },
    hotelSettings,
  };
}

export function parseHotelBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error("Ce fichier n'est pas une sauvegarde GestiOne (fichier illisible)."); }
  if (!obj || obj.format !== BACKUP_FORMAT || !obj.data || typeof obj.data !== "object") throw new Error("Ce fichier n'est pas une sauvegarde d'hôtel GestiOne.");
  KEYS.forEach(([k]) => { if (!Array.isArray(obj.data[k])) obj.data[k] = []; });
  return obj;
}

// Restauration sans perte : les éléments absents sont remis, l'existant est gardé.
export function mergeHotelBackup(current, backup) {
  const out = {}; const added = {};
  KEYS.forEach(([k]) => {
    const cur = Array.isArray(current[k]) ? current[k] : [];
    const ids = new Set(cur.map((x) => x && x.id).filter(Boolean));
    const missing = backup.data[k].filter((x) => x && x.id && !ids.has(x.id));
    added[k] = missing.length;
    out[k] = missing.length ? [...cur, ...missing] : null;
  });
  return { out, added, total: Object.values(added).reduce((t, n) => t + n, 0) };
}

export function BackupScreen({ ctx, onBack, verifyOwnerPin }) {
  const { shop, settings, save, now, sync, by } = ctx;
  const setS = (patch) => save.shopMeta({ ...shop, hotelSettings: { ...settings, ...patch } });
  const log = settings.backupLog || [];
  const lastBackup = log.find((x) => x.kind === "backup");
  const me = deviceId();
  const [made, setMade] = useState(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState(null);
  const [err, setErr] = useState("");
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(null);
  const fileRef = useRef(null);
  const addLog = (entry) => setS({ backupLog: [{ ...entry, at: Date.now(), by, deviceId: me, device: deviceModel() }, ...log].slice(0, 12) });

  const counts = KEYS.map(([k, l, bg, ink]) => ({ k, l, bg, ink, n: (ctx[k] || []).length }));

  const makeBackup = async () => {
    setBusy(true);
    try {
      const data = buildHotelBackup(ctx);
      const json = JSON.stringify(data);
      const name = `Sauvegarde-${slug(shop?.name)}-${ymd(Date.now())}.json`;
      const bytes = new TextEncoder().encode(json);
      await exportBinaryFile(name, bytes, "application/json");
      addLog({ kind: "backup", file: name, size: bytes.length });
      setMade({ name, size: bytes.length });
      ctx.pushToast("Sauvegarde créée", "ok");
    } catch (e) {
      ctx.pushToast(e?.message ? `Sauvegarde impossible : ${e.message}` : "Sauvegarde impossible", "error");
    }
    setBusy(false);
  };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setErr(""); setDone(null); setPin("");
    try { const text = await f.text(); setPicked(parseHotelBackup(text)); } catch (x) { setPicked(null); setErr(x.message || "Fichier illisible"); }
  };

  const restore = () => {
    if (!picked) return;
    if (verifyOwnerPin && !verifyOwnerPin(pin)) { setErr("Code propriétaire incorrect"); return; }
    setErr("");
    const { out, added, total } = mergeHotelBackup(ctx, picked);
    if (out.rooms) save.rooms(out.rooms);
    if (out.tariffs) save.tariffs(out.tariffs);
    if (out.stays) save.stays(out.stays);
    if (out.reservations) save.reservations(out.reservations);
    if (out.guests) save.guests?.(out.guests);
    if (out.expenses) save.expenses?.(out.expenses);
    // Réglages : le logo et l'en-tête des reçus sont repris s'ils manquent ici.
    const bs = picked.hotelSettings || {};
    const receipt = !settings.receipt.logo && bs.receipt?.logo ? { ...settings.receipt, ...bs.receipt } : settings.receipt;
    const entry = { kind: "restore", file: picked.hotelName || "", added: total, at: Date.now(), by, deviceId: me, device: deviceModel() };
    save.shopMeta({ ...shop, hotelSettings: { ...settings, receipt, backupLog: [entry, ...log].slice(0, 12) } });
    setDone({ total, added });
    setPin("");
    ctx.pushToast(total ? `Restauré · ${total} élément${total > 1 ? "s" : ""} remis en place` : "Rien à restaurer : tout est déjà présent", "ok");
  };

  const otherHotel = picked && picked.shopId && shop?.id && picked.shopId !== shop.id;
  const pickedCounts = picked ? KEYS.map(([k, l]) => `${picked.data[k].length} ${l}`).join(" · ") : "";

  return (
    <div>
      <TopBar title="Sauvegarde et restauration" sub="Réglages de l'entreprise · propriétaire" onBack={onBack} />

      <div className="mt-3 rounded-[22px] p-4 text-white relative overflow-hidden" style={{ background: "linear-gradient(145deg, #0B1628 0%, #14294A 60%, #1B3361 100%)", boxShadow: "0 14px 28px -16px rgba(11,22,40,0.8)" }}>
        <span className="absolute rounded-full" style={{ right: -40, top: -50, width: 160, height: 160, background: "radial-gradient(circle, rgba(96,165,250,0.3) 0%, rgba(96,165,250,0) 70%)" }} />
        <div className="relative flex items-center gap-3">
          <span className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#34D399,#059669)" }}><Icon name="shieldok" size={22} color="#fff" /></span>
          <span><span className="block text-[10.5px] font-extrabold tracking-[0.16em]" style={{ color: "#93C5FD" }}>PROTECTION DES DONNÉES</span><span className="block text-[17px] font-extrabold">{lastBackup && now - lastBackup.at < 7 * DAY ? "Vos données sont protégées" : "Pensez à faire une sauvegarde"}</span></span>
        </div>
        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-[13px] px-3 py-2" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="block text-[10px] font-bold" style={{ color: "#AEBBD2" }}>Copie sur le serveur</span>
            <span className="block text-[13px] font-extrabold">{shop?.backendLinked ? `Auto${sync?.lastAt ? ` · ${hmOf(sync.lastAt)}` : ""}` : "Non reliée"}</span>
            <span className="block text-[10px]" style={{ color: "#AEBBD2" }}>{shop?.backendLinked ? "à chaque synchronisation" : "fichier conseillé"}</span>
          </div>
          <div className="rounded-[13px] px-3 py-2" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="block text-[10px] font-bold" style={{ color: "#AEBBD2" }}>Dernier fichier</span>
            <span className="block text-[13px] font-extrabold" style={{ color: lastBackup && now - lastBackup.at < 7 * DAY ? "#6EE7B7" : "#FCD34D" }}>{lastBackup ? `${dmy(lastBackup.at).slice(0, 5)} · ${ago(lastBackup.at, now)}` : "Aucun"}</span>
            <span className="block text-[10px]" style={{ color: "#AEBBD2" }}>conseillé chaque semaine</span>
          </div>
        </div>
      </div>

      <GroupTitle>1 · CRÉER UNE SAUVEGARDE</GroupTitle>
      <Card className="p-3.5">
        <p className="text-[12.5px] font-bold" style={{ color: H.ink2 }}>Le fichier contient toutes les données de l'hôtel :</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {counts.map((c) => (
            <div key={c.k} className="rounded-[13px] py-2 text-center" style={{ background: c.bg }}>
              <span className="block text-[18px] font-extrabold leading-tight" style={{ color: c.ink }}>{c.n}</span>
              <span className="block text-[10.5px] font-bold" style={{ color: H.ink2 }}>{c.l}</span>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[11.5px] leading-snug" style={{ color: H.muted }}>+ réglages de l'hôtel, logo, en-tête des reçus. Les photos des pièces d'identité restent sur le serveur sécurisé (non incluses).</p>
        <Btn kind="navy" full icon="download" className="mt-3" disabled={busy} onClick={makeBackup}>{busy ? "Préparation…" : "Télécharger la sauvegarde"}</Btn>
        {made && (
          <div className="mt-2.5 rounded-[13px] px-3 py-2.5 text-[12px] leading-snug" style={{ background: H.greenSoft, color: "#14532D" }}>
            <span className="font-extrabold break-all">✓ {made.name} · {sizeTxt(made.size)}</span>
            <span className="block mt-0.5">Choisissez où l'enregistrer : Fichiers, Google Drive, WhatsApp, e-mail…</span>
          </div>
        )}
      </Card>

      <GroupTitle>2 · RESTAURER UNE SAUVEGARDE</GroupTitle>
      <Card className="p-3.5">
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} aria-label="Fichier de sauvegarde" />
        <Btn kind="ghost" full icon="upload" onClick={() => fileRef.current?.click()}>Choisir un fichier de sauvegarde</Btn>
        {err && !picked && <p className="mt-2.5 text-[12.5px] font-bold" style={{ color: H.red }}>{err}</p>}
        {picked && (
          <div className="mt-3 rounded-[16px] p-3" style={{ background: "#F5F7FB", border: `1.5px solid ${otherHotel ? "#FCD9A8" : "#C7D2E5"}` }}>
            <div className="flex items-start gap-2.5">
              <span className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "#E0F2FE", color: "#0369A1" }}><Icon name="save" size={19} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-extrabold truncate">{picked.hotelName || "Hôtel"}</span>
                <span className="block text-[11.5px]" style={{ color: H.muted }}>Sauvegarde du {dmy(picked.createdAt)} à {hmOf(picked.createdAt)}{picked.by ? ` · par ${picked.by}` : ""}</span>
              </span>
              <span className="text-[10.5px] font-extrabold rounded-[7px] px-2 py-[3px]" style={otherHotel ? { background: "#FFF1E2", color: H.orange } : { background: H.greenSoft, color: H.green }}>{otherHotel ? "Autre hôtel" : "Valide"}</span>
            </div>
            <p className="mt-2 text-[11.5px] font-bold leading-snug" style={{ color: H.ink2 }}>{pickedCounts}</p>
            {otherHotel && <p className="mt-2 text-[11.5px] font-bold leading-snug" style={{ color: H.orange }}>Ce fichier vient d'un autre hôtel. Ses éléments seront ajoutés à celui-ci.</p>}
            <p className="mt-2 text-[11.5px] leading-snug" style={{ color: H.muted }}>Restauration sans perte : les éléments absents de l'hôtel sont remis en place, ce qui existe déjà (séjours en cours, reçus récents) est conservé.</p>
            {!done && verifyOwnerPin && (
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" type="password" placeholder="Code propriétaire" aria-label="Code propriétaire"
                className="mt-3 w-full h-[48px] rounded-[14px] px-3.5 text-[16px] font-bold tracking-[0.3em] outline-none" style={{ background: "#fff", border: `1.5px solid ${err ? "#FCA5A5" : H.line}` }} />
            )}
            {err && <p className="mt-2 text-[12.5px] font-bold" style={{ color: H.red }}>{err}</p>}
            {done ? (
              <div className="mt-3 rounded-[13px] px-3 py-2.5 text-[12.5px] font-extrabold" style={{ background: H.greenSoft, color: "#14532D" }}>✓ Restauré · {done.total} élément{done.total > 1 ? "s" : ""} remis en place</div>
            ) : (
              <Btn kind="gold" full icon="sync" className="mt-3" disabled={verifyOwnerPin && pin.length < 4} onClick={restore}>Restaurer la sauvegarde</Btn>
            )}
          </div>
        )}
      </Card>

      <GroupTitle>HISTORIQUE DES SAUVEGARDES</GroupTitle>
      <Card className="px-3">
        {log.length ? log.slice(0, 6).map((h, i, a) => (
          <div key={`${h.at}-${i}`} className="min-h-[50px] flex items-center gap-2.5" style={{ borderBottom: i === a.length - 1 ? "none" : `1px solid ${H.line2}` }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: h.kind === "backup" ? "#34D399" : "#60A5FA" }} />
            <span className="flex-1 min-w-0"><span className="block text-[13px] font-extrabold truncate">{h.kind === "backup" ? "Sauvegarde créée" : `Restauration${h.added != null ? ` · ${h.added} élément${h.added > 1 ? "s" : ""}` : ""}`}</span><span className="block text-[11px] truncate" style={{ color: H.muted }}>{h.deviceId === me ? "Ce téléphone" : h.device || "Autre téléphone"}{h.by ? ` · ${h.by}` : ""}</span></span>
            <span className="text-[11.5px] font-bold whitespace-nowrap" style={{ color: H.muted }}>{localDayKey(h.at) === localDayKey(now) ? `Aujourd'hui ${hmOf(h.at)}` : `${dayLabel(h.at)} · ${hmOf(h.at)}`}</span>
          </div>
        )) : <p className="py-4 text-center text-[12.5px]" style={{ color: H.muted }}>Aucune sauvegarde pour le moment.</p>}
      </Card>
      <Card className="mt-3 px-3">
        <div className="min-h-[60px] flex items-center gap-3">
          <span className="flex-1 min-w-0 py-2"><span className="block text-[14px] font-extrabold">Me rappeler chaque semaine</span><span className="block text-[11.5px]" style={{ color: H.muted }}>Notification le dimanche à 20:00 si aucune sauvegarde</span></span>
          <Toggle on={settings.backupRemind !== false} onChange={(v) => setS({ backupRemind: v })} label="Rappel de sauvegarde chaque semaine" />
        </div>
      </Card>
    </div>
  );
}
