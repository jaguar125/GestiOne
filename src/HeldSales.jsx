// src/HeldSales.jsx — GestiOne
//
// Ventes en attente : une vente préparée mais pas encore payée (table pas
// prête, client qui revient…) est mise de côté avec un nom. Le panier est
// libéré pour servir un autre client. Tant qu'elle est en attente, elle ne
// compte ni dans les ventes du jour, ni dans la caisse, et le stock ne bouge
// pas : tout est enregistré au moment de l'encaissement.
//
// Contenu :
//   HoldSaleSheet     fenêtre « Mettre en attente » (nom + client)
//   HeldSalesBanner   bandeau « N ventes en attente » sur l'écran Vendre
//   HistoryTabs       onglets « Ventes | En attente » de l'Historique
//   HeldSalesList     liste des ventes en attente (Reprendre / Encaisser / Supprimer)
//   heldAgo, heldSummary, heldStockProblems   petites aides

import { useEffect, useState } from "react";
import { PauseCircle, Clock, Trash2, ChevronRight, Info, Check, X } from "lucide-react";

const ORANGE = "#E8771E";
const ORANGE_DARK = "#8A4B05";
const ORANGE_SOFT = "#FFF6E5";
const ORANGE_LINE = "#F2C77C";
const GREEN = "#1E8E50";

export const HOLD_PRESETS = ["Table 1", "Table 2", "Table 3", "Table 4", "Comptoir", "À emporter", "Terrasse"];

const hhmm = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// « 17 min », « 2 h 05 », « hier 21:40 »
export function heldAgo(iso, now = Date.now()) {
  const d = new Date(iso);
  const min = Math.max(0, Math.round((now - d.getTime()) / 60000));
  if (new Date(now).toDateString() !== d.toDateString()) {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return `${y.toDateString() === d.toDateString() ? "hier" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${hhmm(iso)}`;
  }
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

// « 2 × Vin 50 · 1 × Vin 100 »
export function heldSummary(h, products) {
  return (h.lines || []).map((l) => {
    const p = (products || []).find((x) => x.id === l.id);
    return `${l.qty} × ${p?.name || l.name || "Article"}`;
  }).join(" · ");
}

// Lignes dont le stock ne suffit plus (vendu entre-temps à un autre client).
// stockOf(productId) renvoie le stock disponible du produit qui porte le stock.
export function heldStockProblems(lines, products, stockTargetId, stockOf) {
  const need = {};
  (lines || []).forEach((l) => {
    const p = (products || []).find((x) => x.id === l.id);
    if (!p) return;
    const tid = stockTargetId(p) || p.id;
    need[tid] = (need[tid] || 0) + (Number(l.qty) || 0);
  });
  return Object.entries(need)
    .map(([tid, qty]) => {
      const p = (products || []).find((x) => x.id === tid);
      const left = stockOf(tid);
      return p && qty > left ? { name: p.name, need: qty, left: Math.max(0, left) } : null;
    })
    .filter(Boolean);
}

/* ---------- Fenêtre « Mettre en attente » ---------- */

export function HoldSaleSheet({ count, total, fmt, initialLabel, initialClient, isUpdate, onConfirm, onClose }) {
  const [label, setLabel] = useState(initialLabel || "");
  const [client, setClient] = useState(initialClient || "");
  const finalLabel = label.trim() || `Vente de ${hhmm(new Date().toISOString())}`;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end no-print" role="dialog" aria-modal="true" aria-labelledby="hold-title">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full max-w-[600px] mx-auto rounded-t-3xl px-5 pt-3 gb-slide-up flex flex-col max-h-[90vh] overflow-y-auto gb-scroll" style={{ background: "var(--card)", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
        <div className="w-11 h-[5px] rounded-full self-center" style={{ background: "var(--line)" }} />
        <div className="flex items-center gap-3 mt-3.5">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#FFF1E0", color: "#9A4A07" }}><PauseCircle size={24} /></span>
          <div className="flex-1 min-w-0">
            <h2 id="hold-title" className="font-display font-bold text-[20px] leading-tight">{isUpdate ? "Remettre en attente" : "Mettre en attente"}</h2>
            <p className="text-[13px] opacity-65">{count} article{count > 1 ? "s" : ""} · {fmt(total)} · stock non déduit</p>
          </div>
          <button onClick={onClose} className="gb-focus w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Fermer"><X size={19} /></button>
        </div>

        <label htmlFor="hold-label" className="mt-5 text-[13px] font-bold opacity-70">Nom de la vente</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {HOLD_PRESETS.map((p) => {
            const on = label === p;
            return (
              <button key={p} type="button" onClick={() => setLabel(p)} aria-pressed={on} className={`gb-focus min-h-[44px] px-1 rounded-[14px] text-[13px] font-bold ${p === "À emporter" ? "col-span-2" : ""}`} style={on ? { background: "#1F2A33", color: "#fff" } : { background: "var(--paper-dim)", color: "var(--ink)" }}>{p}</button>
            );
          })}
        </div>
        <input id="hold-label" value={label} onChange={(e) => setLabel(e.target.value.slice(0, 40))} placeholder="Ex : Table 5, Koffi, Livraison…" className="gb-focus mt-2.5 min-h-[50px] rounded-[14px] px-3.5 text-[16px] font-bold outline-none" style={{ border: `1.5px solid ${label ? "#1F2A33" : "var(--line)"}`, background: "var(--card)", color: "var(--ink)" }} />

        <label htmlFor="hold-client" className="mt-4 text-[13px] font-bold opacity-70">Client (optionnel)</label>
        <input id="hold-client" value={client} onChange={(e) => setClient(e.target.value.slice(0, 60))} placeholder="Nom ou téléphone du client" className="gb-focus mt-2 min-h-[50px] rounded-[14px] px-3.5 text-[15px] outline-none" style={{ border: "1.5px solid var(--line)", background: "var(--card)", color: "var(--ink)" }} />

        <div className="mt-4 flex gap-2.5 items-start rounded-[14px] px-3.5 py-3 text-[12.5px] leading-snug" style={{ background: "var(--paper-dim)" }}>
          <Info size={17} className="shrink-0 mt-px opacity-70" />
          <span className="opacity-80">La vente apparaît dans Historique › En attente. Le stock et la caisse ne bougent qu'au moment de l'encaissement.</span>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button onClick={onClose} className="gb-focus w-[108px] min-h-[56px] rounded-[18px] text-[15px] font-bold shrink-0" style={{ border: "1.5px solid var(--line)", background: "var(--card)" }}>Annuler</button>
          <button onClick={() => onConfirm({ label: finalLabel, clientName: client.trim() })} className="gb-focus flex-1 min-w-0 min-h-[56px] rounded-[18px] px-3 text-[15.5px] font-bold text-white truncate" style={{ background: ORANGE }}>
            Mettre « {finalLabel} » en attente
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Bandeau sur l'écran Vendre ---------- */

export function HeldSalesBanner({ heldSales, fmt, onOpen, nuit }) {
  if (!heldSales?.length) return null;
  const n = heldSales.length;
  const line = heldSales.slice(0, 3).map((h) => `${h.label} · ${fmt(h.total)}`).join(" — ");
  return (
    <button onClick={onOpen} className={`gb-focus ${nuit ? "mx-4" : "mx-4"} mt-3 w-[calc(100%-2rem)] flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-left`} style={{ background: ORANGE_SOFT, border: `1.5px solid ${ORANGE_LINE}` }} aria-label={`${n} vente${n > 1 ? "s" : ""} en attente, voir la liste`}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-display font-bold text-[17px]" style={{ background: ORANGE }}>{n}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-bold" style={{ color: ORANGE_DARK }}>{n} vente{n > 1 ? "s" : ""} en attente</span>
        <span className="block text-[12.5px] truncate" style={{ color: "#6B4A1E" }}>{line}</span>
      </span>
      <span className="text-[13px] font-bold flex items-center shrink-0" style={{ color: ORANGE_DARK }}>Voir <ChevronRight size={16} /></span>
    </button>
  );
}

/* ---------- Onglets de l'Historique ---------- */

export function HistoryTabs({ tab, setTab, heldCount }) {
  return (
    <div className="px-4 pt-3 no-print">
      <div role="tablist" aria-label="Historique" className="grid grid-cols-2 gap-1 p-1 rounded-[14px]" style={{ background: "var(--paper-dim)" }}>
        <button role="tab" aria-selected={tab === "sales"} onClick={() => setTab("sales")} className="gb-focus min-h-[40px] rounded-[11px] text-[13.5px] font-bold" style={tab === "sales" ? { background: "var(--card)", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" } : { opacity: 0.7 }}>Ventes</button>
        <button role="tab" aria-selected={tab === "held"} onClick={() => setTab("held")} className="gb-focus min-h-[40px] rounded-[11px] text-[13.5px] font-bold flex items-center justify-center gap-1.5" style={tab === "held" ? { background: "var(--card)", color: ORANGE_DARK, boxShadow: "0 2px 6px rgba(0,0,0,0.08)" } : { opacity: 0.75 }}>
          En attente
          {heldCount > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] text-white flex items-center justify-center" style={{ background: ORANGE }}>{heldCount}</span>}
        </button>
      </div>
    </div>
  );
}

/* ---------- Liste des ventes en attente ---------- */

export function HeldSalesList({ heldSales, products, fmt, resumedId, onResume, onPay, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const list = [...(heldSales || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const sum = list.reduce((t, h) => t + (Number(h.total) || 0), 0);

  return (
    <div className="px-4 pt-3" style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2.5 items-center rounded-[14px] px-3 py-2.5 text-[12.5px] leading-snug" style={{ background: ORANGE_SOFT, color: "#6B4A1E" }}>
        <Info size={17} className="shrink-0" />
        <span>Pas encore encaissées : non comptées dans les ventes du jour, stock non déduit.</span>
      </div>

      {list.length === 0 && (
        <div className="mt-4 rounded-[18px] p-7 text-center flex flex-col gap-1.5" style={{ background: "var(--card)", border: "1px dashed var(--line)" }}>
          <span className="text-[15px] font-bold">Aucune vente en attente</span>
          <span className="text-[13px] opacity-60">Dans le panier, touchez « Mettre en attente » pour garder une vente de côté.</span>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2.5">
        {list.map((h) => {
          const active = h.id === resumedId;
          const asking = confirmId === h.id;
          return (
            <div key={h.id} className="rounded-[20px] p-3.5" style={{ background: "var(--card)", border: `1.5px solid ${active ? GREEN : ORANGE_LINE}` }}>
              <div className="flex items-center gap-2.5">
                <span className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center shrink-0" style={{ background: "#FFF1E0", color: "#9A4A07" }}><PauseCircle size={22} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-bold truncate">{h.label}{h.clientName ? ` · ${h.clientName}` : ""}</div>
                  <div className="text-[12.5px] opacity-65 flex items-center gap-1"><Clock size={12} /> Depuis {hhmm(h.date)} · {heldAgo(h.date, now)}{h.author ? ` · ${h.author}` : ""}</div>
                </div>
                <div className="font-display font-bold text-[16px] whitespace-nowrap">{fmt(h.total)}</div>
              </div>
              <div className="mt-2.5 text-[13px] opacity-75 leading-snug">{heldSummary(h, products)}</div>
              {active && <div className="mt-2 text-[12px] font-bold flex items-center gap-1" style={{ color: GREEN }}><Check size={14} /> En cours dans le panier</div>}
              {asking ? (
                <div className="mt-3 flex gap-2 gb-slide-up">
                  <button onClick={() => setConfirmId(null)} className="gb-focus flex-1 min-h-[46px] rounded-[14px] text-[14px] font-bold" style={{ border: "1.5px solid var(--line)", background: "var(--card)" }}>Garder</button>
                  <button onClick={() => { setConfirmId(null); onDelete(h.id); }} className="gb-focus flex-[1.4] min-h-[46px] rounded-[14px] text-[14px] font-bold text-white" style={{ background: "#B42318" }}>Supprimer cette vente</button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setConfirmId(h.id)} className="gb-focus w-[46px] min-h-[46px] rounded-[14px] flex items-center justify-center shrink-0" style={{ background: "#FDE7E7", color: "#A3201E" }} aria-label={`Supprimer la vente en attente ${h.label}`}><Trash2 size={18} /></button>
                  <button onClick={() => onResume(h.id)} className="gb-focus flex-1 min-h-[46px] rounded-[14px] text-[14px] font-bold" style={{ border: "1.5px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}>Reprendre</button>
                  <button onClick={() => onPay(h.id)} className="gb-focus flex-[1.3] min-h-[46px] rounded-[14px] text-[14px] font-bold text-white" style={{ background: GREEN }}>Encaisser</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {list.length > 1 && (
        <div className="mt-3 flex justify-between text-[13.5px] px-1"><span className="opacity-65">Total en attente</span><b style={{ color: ORANGE_DARK }}>{fmt(sum)}</b></div>
      )}
    </div>
  );
}
