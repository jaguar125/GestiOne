// src/VendorDevices.jsx
//
// Section « Appareils autorisés » de la fiche vendeur (onglet Vendeurs).
// Un téléphone = une carte : nom du téléphone, système, première connexion,
// dernière activité, nombre d'ouvertures de session, et « Déconnecté le … »
// sous le nom quand le téléphone a été déconnecté.
//
// Utilisation (dans la fiche du vendeur) :
//
//   <VendorDevices
//     shopId={activeShopId}
//     vendorId={v.id}
//     vendorName={v.name}
//     pushToast={pushToast}
//     onInvite={() => sendInvite(v)}      // ton bouton « Inviter » existant
//   />
//
// Le composant charge lui-même la liste (vendor-access → status) et la
// rafraîchit toutes les 30 s pendant qu'elle est affichée.

import { useCallback, useEffect, useState } from "react";
import { Smartphone, LogOut, Trash2, AlertTriangle, Check, Send, ChevronDown, Loader2 } from "lucide-react";
import { vendorDevicesStatus, logoutVendorDevice, revokeVendorDevice } from "./apiDevices";

const C = {
  green: "#0F3D2E",
  greenText: "#11643A",
  greenSoft: "#E6F4EC",
  greenBorder: "#BFE3CC",
  online: "#16A34A",
  grey: "#8A958E",
  greySoft: "#EEF0EC",
  line: "#E1E6DE",
  dash: "#D6DDD2",
  panel: "#F5F7F3",
  ink: "#14201A",
  muted: "#5B665F",
  indigo: "#4338CA",
  indigoSoft: "#EEECFB",
  orange: "#9A4A07",
  orangeSoft: "#FFF1E0",
  danger: "#A3201E",
  dangerSoft: "#FDE7E7",
};

const REFRESH_MS = 30_000;
const NEW_PHONE_HOURS = 24;

/* ---------- Dates ---------- */

const two = (n) => String(n).padStart(2, "0");
const hm = (d) => `${two(d.getHours())}:${two(d.getMinutes())}`;
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// « Aujourd'hui à 12:18 », « Hier à 21:04 », « 16/09 à 14:56 », « 16/09/2025 à 14:56 »
function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  if (diffDays === 0) return `Aujourd'hui à ${hm(d)}`;
  if (diffDays === 1) return `Hier à ${hm(d)}`;
  const date = d.getFullYear() === now.getFullYear()
    ? `${two(d.getDate())}/${two(d.getMonth() + 1)}`
    : `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${date} à ${hm(d)}`;
}
// Même chose, en minuscule au début (« le 06/10 à 21:04 », « aujourd'hui à 12:18 »)
function onDate(iso) {
  const w = when(iso);
  return /^\d/.test(w) ? `le ${w}` : w.charAt(0).toLowerCase() + w.slice(1);
}

function osLine(d) {
  const kind = d.app_kind === "app" ? "Application installée" : d.app_kind === "navigateur" ? "Navigateur" : null;
  return [d.os_version, kind].filter(Boolean).join(" · ") || "Détails disponibles à la prochaine connexion";
}

/* ---------- Petits éléments ---------- */

function PhoneIcon({ state, size = 48 }) {
  const active = state !== "logged_out";
  const dot = state === "online" ? C.online : state === "idle" ? "#F59E0B" : C.grey;
  return (
    <div className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: active ? C.greenSoft : C.greySoft, color: active ? "#0F5A3C" : "#6B766F" }}>
      <Smartphone size={size * 0.5} strokeWidth={2} />
      <span className="absolute" style={{ right: -2, bottom: -2, width: 14, height: 14, borderRadius: 999, background: dot, border: "3px solid #fff" }} />
    </div>
  );
}

function Row({ label, value, strong, color, last }) {
  return (
    <div className="flex justify-between gap-3 py-2.5 text-[13px]" style={{ borderBottom: last ? "none" : `1px dashed ${C.dash}` }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span className="text-right" style={{ fontWeight: strong ? 700 : 600, color: color || C.ink }}>{value}</span>
    </div>
  );
}

function StatusLine({ d }) {
  if (d.state === "logged_out") {
    return (
      <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-[10px] text-[12.5px] font-bold" style={{ background: C.orangeSoft, color: C.orange }}>
        <LogOut size={13} strokeWidth={2.4} />
        Déconnecté {onDate(d.logged_out_at)}
      </div>
    );
  }
  if (d.state === "idle") {
    return <div className="mt-1 text-[12.5px] font-semibold" style={{ color: C.muted }}>Connecté · inactif depuis {onDate(d.last_seen_at)}</div>;
  }
  return null;
}

/* ---------- Carte d'un téléphone ---------- */

function DeviceCard({ d, vendorName, expanded, onToggle, onLogout, onRevoke, onInvite, busy, collapsible }) {
  const isNew = d.state !== "logged_out" && Date.now() - new Date(d.first_linked_at).getTime() < NEW_PHONE_HOURS * 3_600_000 && (d.session_count || 1) === 1;
  const border = d.state === "logged_out" ? C.line : C.greenBorder;

  return (
    <div className="rounded-[20px] bg-white" style={{ border: `1.5px solid ${border}` }}>
      <button type="button" onClick={collapsible ? onToggle : undefined} disabled={!collapsible}
        aria-expanded={collapsible ? expanded : undefined}
        className="gb-focus w-full text-left flex gap-3 items-start p-4" style={{ cursor: collapsible ? "pointer" : "default" }}>
        <PhoneIcon state={d.state} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[16px] font-extrabold truncate" style={{ color: d.state === "logged_out" ? "#4A554E" : C.ink }}>{d.title}</span>
            {isNew && <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: C.indigoSoft, color: C.indigo }}>NOUVEAU</span>}
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: C.muted }}>{osLine(d)}</div>
          <StatusLine d={d} />
        </div>
        {collapsible && <ChevronDown size={20} className="shrink-0 mt-3 transition-transform" style={{ color: C.muted, transform: expanded ? "rotate(180deg)" : "none" }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="rounded-2xl px-3.5" style={{ background: C.panel }}>
            <Row label="Première connexion" value={when(d.first_linked_at)} strong />
            <Row label="Dernière activité" value={when(d.last_seen_at)} strong color={d.state === "online" ? C.greenText : undefined} />
            {d.state === "logged_out"
              ? <Row label="Motif" value={d.logout_reason === "admin" ? "Déconnecté par l'administrateur" : "Déconnexion depuis le téléphone"} strong last />
              : <Row label="Ouvertures de session" value={`${d.session_count || 1} fois`} strong last />}
          </div>

          {d.state === "logged_out" && (
            <div className="flex gap-2.5 items-center rounded-[14px] px-3.5 py-3 text-[12.5px] font-semibold leading-snug" style={{ background: C.greenSoft, color: C.greenText }}>
              <Check size={18} className="shrink-0" />
              <span>{vendorName || "Le vendeur"} peut se reconnecter avec Entreprise + Code PIN. Ce téléphone reprendra la même ligne.</span>
            </div>
          )}

          <div className="flex gap-2.5">
            {d.state === "logged_out" ? (
              onInvite && (
                <button type="button" onClick={onInvite} disabled={busy}
                  className="gb-focus flex-1 h-[46px] rounded-[14px] text-[14px] font-bold text-white flex items-center justify-center gap-2" style={{ background: C.green }}>
                  <Send size={16} /> Renvoyer l'invitation
                </button>
              )
            ) : (
              <button type="button" onClick={onLogout} disabled={busy}
                className="gb-focus flex-1 h-[46px] rounded-[14px] text-[14px] font-bold flex items-center justify-center gap-2 bg-white" style={{ border: `1.5px solid ${C.dash}`, color: C.ink }}>
                {busy === "logout" ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} Déconnecter
              </button>
            )}
            <button type="button" onClick={onRevoke} disabled={busy}
              className="gb-focus h-[46px] rounded-[14px] text-[14px] font-bold flex items-center justify-center gap-2 px-4"
              style={{ background: C.dangerSoft, color: C.danger, flex: d.state === "logged_out" && onInvite ? "0 0 auto" : 1 }}>
              {busy === "revoke" ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Retirer l'accès
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Section complète ---------- */

export default function VendorDevices({ shopId, vendorId, vendorName, pushToast, onInvite }) {
  const [devices, setDevices] = useState(null); // null = chargement
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);       // device_id déplié
  const [busy, setBusy] = useState(null);       // { id, kind }

  const load = useCallback(async () => {
    try {
      const data = await vendorDevicesStatus(shopId);
      setDevices(data?.vendors?.[vendorId]?.devices || []);
      setError(null);
    } catch (e) {
      setError(e?.message?.startsWith("OFFLINE") ? "Connexion internet requise pour voir les téléphones." : e?.message || "Chargement impossible");
      setDevices((cur) => cur || []);
    }
  }, [shopId, vendorId]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState !== "hidden") load(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const act = async (d, kind) => {
    const who = vendorName || "ce vendeur";
    const question = kind === "logout"
      ? `Déconnecter ${who} du téléphone « ${d.title} » ?\n\nLe téléphone reste dans la liste : ${who} pourra se reconnecter avec ses identifiants.`
      : `Retirer l'accès du téléphone « ${d.title} » ?\n\nIl disparaîtra de la liste et devra recevoir une nouvelle invitation.`;
    if (!window.confirm(question)) return;
    setBusy({ id: d.device_id, kind });
    try {
      if (kind === "logout") await logoutVendorDevice(shopId, d.device_id);
      else await revokeVendorDevice(shopId, d.device_id);
      pushToast?.(kind === "logout" ? "Téléphone déconnecté" : "Accès retiré", "ok");
      await load();
    } catch (e) {
      pushToast?.(e?.message?.startsWith("OFFLINE") ? "Connexion internet requise" : e?.message || "Action impossible", "error");
    } finally {
      setBusy(null);
    }
  };

  const list = devices || [];
  const online = list.filter((d) => d.state === "online").length;
  const single = list.length === 1;

  return (
    <section className="flex flex-col gap-3" aria-label="Appareils autorisés">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-extrabold tracking-[0.08em]" style={{ color: "#0F5A3C" }}>
          <Smartphone size={18} /> APPAREILS AUTORISÉS
        </div>
        {list.length > 0 && (
          <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#E4E8E1", color: C.green }}>
            {list.length} téléphone{list.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {online > 1 && (
        <div className="flex gap-2 items-center rounded-xl px-3 py-2.5 text-[12px] font-semibold leading-snug" style={{ background: "#FFF6E5", color: "#8A4B05" }}>
          <AlertTriangle size={16} className="shrink-0" />
          <span>{vendorName || "Ce vendeur"} utilise {online} téléphones en même temps.</span>
        </div>
      )}

      {devices === null && (
        <div className="flex items-center gap-2 text-[13px] py-3" style={{ color: C.muted }}>
          <Loader2 size={16} className="animate-spin" /> Chargement des téléphones…
        </div>
      )}

      {error && <div className="text-[12.5px] font-semibold" style={{ color: C.danger }}>{error}</div>}

      {devices !== null && list.length === 0 && !error && (
        <div className="rounded-2xl px-4 py-4 text-[13px]" style={{ background: C.panel, color: C.muted }}>
          Aucun téléphone connecté pour l'instant.
        </div>
      )}

      {list.map((d) => (
        <DeviceCard
          key={d.device_id}
          d={d}
          vendorName={vendorName}
          collapsible={!single}
          expanded={single || open === d.device_id}
          onToggle={() => setOpen((cur) => (cur === d.device_id ? null : d.device_id))}
          onLogout={() => act(d, "logout")}
          onRevoke={() => act(d, "revoke")}
          onInvite={onInvite}
          busy={busy?.id === d.device_id ? busy.kind : null}
        />
      ))}
    </section>
  );
}
