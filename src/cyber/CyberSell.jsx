// src/cyber/CyberSell.jsx
//
// Vente au cyber café : catalogue des prestations et des articles,
// configurateurs (photocopie avec tarif dégressif, impression, photos
// d'identité, inscription en ligne, prestation libre), paiement (espèces,
// Mobile Money, crédit, partiel) et reçu.

import { useEffect, useMemo, useState } from "react";
import { C, GRAD, FONT_D, Icon, Btn, Card, Label, TopBar, Seg, Chip, Toggle, Stepper, Field, inputStyle, Sheet, Empty, Avatar, BottomBar, Tag } from "./CyberUI.jsx";
import { CATS, unitPrice, tierRows, lineTotal, lineOfficial, rid, qtyLabel, saleDue, salePaid, saleToPay, hmOf } from "./cyberLogic.js";
import { receiptInfo, receiptModel, printReceipt, shareReceipt } from "./cyberReceipt.js";

const sp = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ---------- Catalogue ----------
export function SellScreen({ ctx, cart, setCart, client, setClient, onCheckout, onBack }) {
  const { services, stock, levels, fmt, pushToast } = ctx;
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null); // prestation à configurer
  const [free, setFree] = useState(false);
  const [pick, setPick] = useState(false);
  const articles = stock.filter((s) => s.kind === "article" && s.active !== false && Number(s.price) > 0);
  const svcs = services.filter((s) => s.active !== false).sort((a, b) => (a.order || 99) - (b.order || 99));
  const qn = q.trim().toLowerCase();
  const items = [
    ...svcs.map((s) => ({ key: s.id, type: "svc", s, name: s.name, cat: s.cat, price: s.tiers?.length ? `dès ${fmt(Math.min(...[s.price, ...s.tiers.map((t) => t.price)]))}` : `${fmt(s.price)} / ${s.unit}` })),
    ...articles.map((a) => ({ key: a.id, type: "art", a, name: a.name, cat: "article", price: `${fmt(a.price)} · stock ${Math.max(0, Math.round(levels[a.id] || 0))}` })),
  ].filter((x) => (tab === "all" || (tab === "article" ? x.cat === "article" : tab === "svc" ? x.cat !== "article" : x.cat === tab)) && (!qn || x.name.toLowerCase().includes(qn)));
  const qtyIn = (key) => cart.filter((l) => (l.svcId || l.stockId) === key).reduce((t, l) => t + (l.kind === "article" ? l.qty : 1), 0);
  const addArticle = (a) => {
    const inCart = cart.filter((l) => l.stockId === a.id).reduce((t, l) => t + l.qty, 0);
    if ((levels[a.id] || 0) - inCart <= 0) { pushToast(`${a.name} : plus de stock`, "error"); return; }
    const ex = cart.find((l) => l.stockId === a.id && l.kind === "article");
    if (ex) setCart(cart.map((l) => (l === ex ? { ...l, qty: l.qty + 1, amount: (l.qty + 1) * l.unitPrice, consume: [{ stockId: a.id, qty: l.qty + 1 }] } : l)));
    else setCart([...cart, { id: rid(), kind: "article", stockId: a.id, cat: "article", label: a.name, svcName: a.name, qty: 1, unit: "unité", unitPrice: Number(a.price), amount: Number(a.price), consume: [{ stockId: a.id, qty: 1 }] }]);
  };
  const total = lineTotal(cart) + lineOfficial(cart);
  const tabs = [["all", "Tout"], ["copie", "Copies"], ["impression", "Impressions"], ["photo", "Photos"], ["web", "En ligne"], ["bureau", "Bureautique"], ["article", "Articles"]];
  return (
    <div style={{ paddingBottom: 170 + Math.min(3, cart.length) * 34 }}>
      <TopBar title="Nouvelle vente" sub={`Servi par ${ctx.userName}`} onBack={onBack}
        right={<button type="button" onClick={() => setPick(true)} className="gb-focus cy-tap h-10 px-3 rounded-[13px] flex items-center gap-1.5 text-[12px] font-extrabold max-w-[150px]" style={{ background: client ? C.amberSoft : "#fff", border: `1.5px solid ${client ? "#FCD98A" : C.line}`, color: client ? C.amber : C.ink }}><Icon name="user" size={15} color={client ? C.amber : C.cyanInk} /><span className="truncate">{client ? client.name : "Client de passage"}</span></button>} />
      <label className="cy-a cy-d1 mt-3 h-[46px] rounded-[15px] flex items-center gap-2 px-3" style={{ background: "#fff", border: `1.5px solid ${C.line}` }}>
        <Icon name="search" size={17} color={C.muted} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une prestation ou un article" aria-label="Rechercher une prestation ou un article" className="flex-1 min-w-0 bg-transparent outline-none text-[14px]" />
      </label>
      <div className="cy-a cy-d1 cy-noscroll mt-2.5 -mx-4 px-4 flex gap-1.5 overflow-x-auto">
        {tabs.map(([id, l]) => <Chip key={id} on={tab === id} onClick={() => setTab(id)}>{l}</Chip>)}
      </div>
      <div className="cy-a cy-d2 mt-3 grid grid-cols-3 gap-2">
        {items.map((x) => {
          const K = CATS[x.cat] || CATS.bureau; const n = qtyIn(x.key);
          return (
            <button key={x.key} type="button" onClick={() => (x.type === "art" ? addArticle(x.a) : setOpen(x.s))} aria-label={`Ajouter ${x.name}`} className="gb-focus cy-tap relative text-left rounded-[18px] p-2.5 flex flex-col gap-1.5 min-h-[112px]"
              style={{ background: "#fff", border: `1.5px solid ${n ? K.ink : C.line}`, boxShadow: n ? `0 10px 20px -12px ${K.ink}` : "0 4px 10px -8px rgba(10,23,48,0.3)" }}>
              <span className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: K.tint, color: K.ink }}><Icon name={K.icon} size={18} /></span>
              <span className="text-[12.5px] font-extrabold leading-tight">{x.name}</span>
              <span className="mt-auto text-[11px] font-extrabold leading-tight" style={{ color: K.ink }}>{x.price}</span>
              {n > 0 && <span className="cy-pop absolute top-2 right-2 min-w-[24px] h-6 px-1.5 rounded-full text-[12px] font-extrabold text-white flex items-center justify-center" style={{ background: C.navy }}>{n}</span>}
            </button>
          );
        })}
      </div>
      {!items.length && <p className="mt-6 text-center text-[13px]" style={{ color: C.muted }}>{tab === "article" ? "Aucun article à vendre. Ajoutez vos articles dans Stock." : "Aucun résultat."}</p>}
      <div className="mt-2.5"><Btn kind="dashed" full icon="plus" onClick={() => setFree(true)}>Prestation libre (libellé et montant)</Btn></div>

      <BottomBar>
        {cart.length === 0 ? <p className="text-center text-[12.5px] pb-2.5" style={{ color: C.muted }}>Touchez une prestation pour l'ajouter au ticket</p> : (
          <div className="flex flex-col gap-1.5 mb-2.5">
            {cart.slice(-3).map((l) => (
              <div key={l.id} className="cy-a flex items-center gap-2 text-[13px]">
                <span className="font-extrabold min-w-[30px]" style={{ color: C.cyanInk }}>{l.qty}×</span>
                <span className="flex-1 min-w-0 truncate font-bold">{l.label}{l.detail ? <span className="font-semibold" style={{ color: C.muted }}> · {l.detail}</span> : null}</span>
                <span className="font-extrabold">{fmt(l.amount + (l.official || 0))}</span>
                <button type="button" onClick={() => setCart(cart.filter((x) => x.id !== l.id))} aria-label={`Retirer ${l.label}`} className="gb-focus w-7 h-7 rounded-[9px] flex items-center justify-center" style={{ background: C.ground }}><Icon name="x" size={13} stroke={2.6} /></button>
              </div>
            ))}
            {cart.length > 3 && <p className="text-[11.5px]" style={{ color: C.muted }}>+ {cart.length - 3} autre{cart.length - 3 > 1 ? "s" : ""} ligne{cart.length - 3 > 1 ? "s" : ""}</p>}
          </div>
        )}
        <Btn kind="cyan" full big disabled={!cart.length} onClick={onCheckout} className="!justify-between">
          <span className="flex items-center gap-2"><Icon name="wallet" size={20} stroke={2.4} />Encaisser · {cart.length} ligne{cart.length > 1 ? "s" : ""}</span>
          <span style={{ fontFamily: FONT_D, fontSize: 17 }}>{fmt(total)}</span>
        </Btn>
      </BottomBar>

      {open && <ConfigSheet ctx={ctx} svc={open} onClose={() => setOpen(null)} onAdd={(line) => { setCart([...cart, line]); setOpen(null); }} />}
      {free && <FreeSheet ctx={ctx} onClose={() => setFree(false)} onAdd={(line) => { setCart([...cart, line]); setFree(false); }} />}
      {pick && <ClientPicker ctx={ctx} current={client} onClose={() => setPick(false)} onPick={(c) => { setClient(c); setPick(false); }} />}
    </div>
  );
}

// ---------- Configurateurs ----------
const QUICK = [[10, "+10"], [50, "+50"], [100, "+100"]];
function TierTable({ svc, qty, mult = 1, fmt }) {
  const rows = tierRows(svc);
  if (rows.length < 2) return null;
  return (
    <div className="mt-3 rounded-[18px] p-3" style={{ background: "#F7F9FC", border: `1px solid ${C.line2}` }}>
      <p className="text-[11px] font-extrabold" style={{ color: C.muted }}>TARIF DÉGRESSIF</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {rows.map((r) => { const on = qty >= r.from && (r.to == null || qty <= r.to); return (
          <div key={r.from} className="flex items-center gap-2.5 rounded-[12px] px-3 py-2" style={{ background: on ? C.navy : "#fff", border: `1.5px solid ${on ? C.navy : C.line2}`, color: on ? "#fff" : C.ink2, transition: "background .25s" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: on ? "#06B6D4" : "transparent", border: `2px solid ${on ? "#06B6D4" : "#C7D2E5"}` }}>{on && <Icon name="check" size={11} color="#fff" stroke={3.4} />}</span>
            <span className="flex-1 text-[13px] font-bold">{r.to == null ? `${r.from} pages et plus` : `${r.from} à ${r.to} pages`}</span>
            <span className="text-[13.5px] font-extrabold">{fmt(r.price * mult)} / page</span>
          </div>
        ); })}
      </div>
    </div>
  );
}
function SheetTotal({ label, total, fmt, onAdd, disabled, saving }) {
  return (
    <div className="mt-4">
      <div className="flex items-end justify-between mb-2.5"><span><span className="block text-[12.5px]" style={{ color: C.muted }}>{label}</span>{saving > 0 && <span className="block text-[12px] font-extrabold" style={{ color: C.green }}>Économie client : {fmt(saving)}</span>}</span><span className="text-[28px] font-extrabold" style={{ fontFamily: FONT_D, color: C.navy }}>{fmt(total)}</span></div>
      <Btn kind="cyan" full big icon="plus" onClick={onAdd} disabled={disabled}>Ajouter au ticket</Btn>
    </div>
  );
}
function ConfigSheet({ ctx, svc, onClose, onAdd }) {
  const { fmt, stock } = ctx;
  const form = svc.form || "qty";
  const K = CATS[svc.cat] || CATS.bureau;
  const [qty, setQty] = useState(form === "copy" ? 10 : 1);
  const [fmtA, setFmtA] = useState("A4");
  const [side, setSide] = useState("r");
  const [colour, setColour] = useState(0);
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState("std");
  const [demarche, setDemarche] = useState("Concours");
  const [who, setWho] = useState("");
  const [service, setService] = useState(Number(svc.price) || 0);
  const [official, setOfficial] = useState("");
  const setQ = (n) => setQty(Math.max(1, Math.min(9999, n)));
  const hasStock = (id) => stock.some((s) => s.id === id);
  let body = null; let total = 0; let line = null; let saving = 0;
  if (form === "copy") {
    const mult = fmtA === "A3" ? 2 : 1;
    const u = unitPrice(svc, qty) * mult;
    total = u * qty; saving = (Number(svc.price) * mult - u) * qty;
    const sheets = side === "rv" ? Math.ceil(qty / 2) : qty;
    const paperId = fmtA === "A3" ? "stk-a3" : (svc.paper || "stk-a4");
    line = { label: `${svc.name} ${fmtA}`, detail: `${side === "rv" ? "recto-verso" : "recto"} · ${fmt(u)}/page`, qty, unit: "page", unitPrice: u, amount: total, consume: hasStock(paperId) ? [{ stockId: paperId, qty: sheets }] : [] };
    body = (
      <>
        <div className="grid grid-cols-2 gap-2">
          <div><p className="text-[11px] font-extrabold mb-1.5" style={{ color: C.muted }}>FORMAT</p><Seg small options={[["A4", "A4"], ["A3", "A3 · ×2"]]} value={fmtA} onChange={setFmtA} /></div>
          <div><p className="text-[11px] font-extrabold mb-1.5" style={{ color: C.muted }}>FACES</p><Seg small options={[["r", "Recto"], ["rv", "Recto-verso"]]} value={side} onChange={setSide} /></div>
        </div>
        <div className="mt-3 rounded-[20px] p-3.5" style={{ border: `1px solid ${C.line}` }}>
          <p className="text-[11px] font-extrabold" style={{ color: C.muted }}>NOMBRE DE PAGES</p>
          <div className="mt-2 flex justify-center"><Stepper value={qty} onMinus={() => setQ(qty - 1)} onPlus={() => setQ(qty + 1)} label="pages" /></div>
          <p className="text-center text-[11.5px] mt-1" style={{ color: C.muted }}>{sheets} feuille{sheets > 1 ? "s" : ""} {fmtA}{side === "rv" ? " recto-verso" : ""}</p>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">{QUICK.map(([n, l]) => <Btn key={l} kind="soft" onClick={() => setQ(qty + n)} style={{ minHeight: 36, fontSize: 12.5 }}>{l}</Btn>)}<Btn kind="soft" onClick={() => setQ(1)} style={{ minHeight: 36, fontSize: 12 }}>Effacer</Btn></div>
        </div>
        <TierTable svc={svc} qty={qty} mult={mult} fmt={fmt} />
      </>
    );
  } else if (form === "print") {
    const nb = Math.max(0, qty - colour); const c = Math.min(colour, qty);
    const u = unitPrice(svc, nb * copies); const cp = Number(svc.colorPrice) || u;
    total = (nb * u + c * cp) * copies;
    line = { label: svc.name.replace(/ N&B$/, ""), detail: `${qty} p.${c ? ` dont ${c} couleur` : ""} × ${copies} ex.`, qty: qty * copies, unit: "page", unitPrice: Math.round(total / Math.max(1, qty * copies)), amount: total, consume: hasStock(svc.paper || "stk-a4") ? [{ stockId: svc.paper || "stk-a4", qty: qty * copies }] : [] };
    const row = (label, sub, v, set, min, max) => (
      <div className="flex items-center gap-2 min-h-[62px]" style={{ borderTop: `1px solid ${C.line2}` }}>
        <span className="flex-1"><span className="block text-[14px] font-extrabold">{label}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>{sub}</span></span>
        <Stepper small value={v} label={label} onMinus={() => set(Math.max(min, v - 1))} onPlus={() => set(Math.min(max, v + 1))} />
      </div>
    );
    body = (
      <div className="rounded-[20px] px-3.5" style={{ border: `1px solid ${C.line}` }}>
        {row("Pages du document", `N&B : ${fmt(u)} la page`, qty, (v) => { setQty(v); if (colour > v) setColour(v); }, 1, 999)}
        {row("Dont pages en couleur", `Couleur : ${fmt(cp)} la page`, c, setColour, 0, qty)}
        {row("Exemplaires", "Le document complet", copies, setCopies, 1, 99)}
      </div>
    );
  } else if (form === "photo") {
    const SZ = { std: ["Standard 3,5 × 4,5 cm", "CNI, passeport, dossiers", 4], visa: ["Visa 5 × 5 cm", "Ambassades", 2], badge: ["Badge 2,5 × 3 cm", "Cartes scolaires", 6] };
    total = (Number(svc.price) || 0) * qty;
    line = { label: svc.name, detail: `${SZ[size][0]} · ${qty * SZ[size][2]} photos`, qty, unit: "planche", unitPrice: Number(svc.price), amount: total, consume: hasStock(svc.paper || "stk-photo") ? [{ stockId: svc.paper || "stk-photo", qty }] : [] };
    body = (
      <>
        <div className="flex flex-col gap-2">{Object.entries(SZ).map(([id, [l, sub, n]]) => { const on = size === id; return (
          <button key={id} type="button" onClick={() => setSize(id)} aria-pressed={on} className="gb-focus cy-tap flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-left" style={{ border: `1.5px solid ${on ? "#EC4899" : C.line}`, background: on ? "#FDF2F8" : "#fff" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ border: `2px solid ${on ? "#EC4899" : "#C7D2E5"}` }}>{on && <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#EC4899" }} />}</span>
            <span className="flex-1"><span className="block text-[14px] font-extrabold">{l}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>{sub} · {n} photos par planche</span></span>
          </button>
        ); })}</div>
        <div className="mt-3 flex items-center justify-between rounded-[18px] px-3.5 py-2.5" style={{ border: `1px solid ${C.line}` }}><span className="text-[14px] font-extrabold">Planches</span><Stepper small value={qty} label="planches" onMinus={() => setQ(qty - 1)} onPlus={() => setQ(qty + 1)} /></div>
      </>
    );
  } else if (form === "web") {
    const off = Math.max(0, Number(String(official).replace(/\D/g, "")) || 0);
    total = service;
    line = { label: `${svc.name} · ${demarche}`, detail: who.trim() ? `pour ${who.trim()}` : "", qty: 1, unit: "dossier", unitPrice: service, amount: service, official: off, consume: [] };
    body = (
      <>
        <p className="text-[11px] font-extrabold mb-1.5" style={{ color: C.muted }}>DÉMARCHE</p>
        <div className="grid grid-cols-2 gap-1.5">{["Concours", "Examens (BAC, BEPC)", "Université", "Rendez-vous visa", "Pré-enrôlement CNI", "Autre démarche"].map((d) => <Chip key={d} on={demarche === d} ink={C.amber} onClick={() => setDemarche(d)} className="!whitespace-normal !min-h-[44px] text-left">{d}</Chip>)}</div>
        <div className="mt-3"><Field label="NOM DU CLIENT (FACULTATIF)"><input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Ex. KONAN Aya" style={inputStyle} /></Field></div>
        <div className="mt-3 rounded-[18px] px-3.5" style={{ border: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-2 min-h-[62px]"><span className="flex-1"><span className="block text-[14px] font-extrabold">Frais de service</span><span className="block text-[11.5px] font-bold" style={{ color: C.green }}>Recette du cyber café</span></span><Stepper small value={sp(service)} label="frais de service" onMinus={() => setService(Math.max(0, service - 500))} onPlus={() => setService(service + 500)} /></div>
          <div className="flex items-center gap-2 min-h-[62px]" style={{ borderTop: `1px solid ${C.line2}` }}><span className="flex-1"><span className="block text-[14px] font-extrabold">Frais officiels</span><span className="block text-[11.5px] font-bold" style={{ color: C.amber }}>Reversés · hors chiffre d'affaires</span></span><input value={official} onChange={(e) => setOfficial(e.target.value.replace(/\D/g, "").slice(0, 7))} inputMode="numeric" placeholder="0" aria-label="Frais officiels" style={{ ...inputStyle, width: 110, textAlign: "right", fontSize: 16, fontWeight: 800 }} /></div>
        </div>
        <p className="mt-2 text-[11.5px] flex gap-1.5" style={{ color: C.muted }}><Icon name="lock" size={14} />Les identifiants et mots de passe du client ne sont jamais enregistrés.</p>
      </>
    );
    total = service + off;
  } else {
    total = (Number(svc.price) || 0) * qty;
    line = { label: svc.name, detail: "", qty, unit: svc.unit, unitPrice: Number(svc.price), amount: total, consume: (svc.consume || []).filter((c) => hasStock(c.stockId)).map((c) => ({ stockId: c.stockId, qty: c.qty * qty })) };
    body = (
      <div className="flex flex-col items-center gap-2 rounded-[20px] py-4" style={{ border: `1px solid ${C.line}` }}>
        <p className="text-[11px] font-extrabold" style={{ color: C.muted }}>QUANTITÉ ({svc.unit.toUpperCase()})</p>
        <Stepper value={qty} label={svc.unit} onMinus={() => setQ(qty - 1)} onPlus={() => setQ(qty + 1)} />
        <p className="text-[12px]" style={{ color: C.muted }}>{fmt(svc.price)} par {svc.unit}</p>
      </div>
    );
  }
  const add = () => onAdd({ id: rid(), kind: "service", svcId: svc.id, svcName: svc.name, cat: svc.cat, official: 0, ...line });
  return (
    <Sheet title={svc.name} onClose={onClose}>
      <div className="flex items-center gap-2 mb-3"><span className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white" style={{ background: K.grad }}><Icon name={K.icon} size={18} /></span><span className="text-[12.5px] font-bold" style={{ color: C.muted }}>{K.label}</span></div>
      {body}
      <SheetTotal label={form === "web" ? "Total à payer (frais compris)" : `${line.qty} ${line.unit}${line.qty > 1 ? "s" : ""}`} total={total} fmt={fmt} onAdd={add} saving={saving} disabled={!(total > 0)} />
    </Sheet>
  );
}
function FreeSheet({ ctx, onClose, onAdd }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const n = Number(amount) || 0;
  return (
    <Sheet title="Prestation libre" onClose={onClose}>
      <Field label="LIBELLÉ"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Réparation clé USB, conseil…" style={inputStyle} /></Field>
      <div className="mt-3"><Field label="MONTANT"><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="0" style={{ ...inputStyle, fontSize: 22, fontWeight: 800 }} /></Field></div>
      <SheetTotal label="Montant" total={n} fmt={ctx.fmt} disabled={!label.trim() || !(n > 0)} onAdd={() => onAdd({ id: rid(), kind: "libre", cat: "bureau", label: label.trim(), svcName: "Prestation libre", qty: 1, unit: "prestation", unitPrice: n, amount: n, official: 0, consume: [] })} />
    </Sheet>
  );
}

// ---------- Client ----------
export function ClientPicker({ ctx, current, onClose, onPick, required }) {
  const { clients, actions, fmt, sales } = ctx;
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const owed = useMemo(() => { const m = {}; sales.forEach((s) => { if (s.client?.id) m[s.client.id] = (m[s.client.id] || 0) + saleDue(s); }); return m; }, [sales]);
  const qn = q.trim().toLowerCase();
  const list = clients.filter((c) => !qn || `${c.name} ${c.phone || ""}`.toLowerCase().includes(qn)).slice(0, 30);
  const create = () => { const c = actions.saveClient({ name: name.trim(), phone: phone.trim() }); if (c) onPick({ id: c.id, name: c.name, phone: c.phone }); };
  return (
    <Sheet title={required ? "Client (obligatoire pour un crédit)" : "Choisir le client"} onClose={onClose}>
      {!required && <Btn kind="soft" full onClick={() => onPick(null)} className="mb-2">Client de passage</Btn>}
      <label className="h-[46px] rounded-[14px] flex items-center gap-2 px-3" style={{ border: `1.5px solid ${C.line}` }}><Icon name="search" size={16} color={C.muted} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou téléphone" aria-label="Rechercher un client" className="flex-1 bg-transparent outline-none text-[14px]" /></label>
      <div className="mt-2 flex flex-col">
        {list.map((c) => (
          <button key={c.id} type="button" onClick={() => onPick({ id: c.id, name: c.name, phone: c.phone })} className="gb-focus cy-tap flex items-center gap-2.5 min-h-[56px] text-left" style={{ borderBottom: `1px solid ${C.line2}` }}>
            <Avatar name={c.name} tint={owed[c.id] > 0 ? C.amberSoft : C.cyanSoft} ink={owed[c.id] > 0 ? C.amber : C.cyanInk} size={36} />
            <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold truncate">{c.name}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>{c.phone || "—"}{owed[c.id] > 0 ? ` · doit ${fmt(owed[c.id])}` : ""}</span></span>
            {current?.id === c.id && <Icon name="check" size={18} color={C.cyanInk} stroke={3} />}
          </button>
        ))}
        {!list.length && <p className="py-3 text-center text-[12.5px]" style={{ color: C.muted }}>Aucun client trouvé.</p>}
      </div>
      <div className="mt-3 rounded-[18px] p-3" style={{ background: "#F7F9FC", border: `1px solid ${C.line2}` }}>
        <p className="text-[13px] font-extrabold">Nouveau client</p>
        <div className="mt-2 grid grid-cols-2 gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" aria-label="Nom du client" style={inputStyle} /><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" inputMode="tel" aria-label="Téléphone du client" style={inputStyle} /></div>
        <Btn kind="navy" full className="mt-2" disabled={!name.trim()} onClick={create}>Créer et choisir</Btn>
      </div>
    </Sheet>
  );
}

// ---------- Paiement ----------
const BILLS = [500, 1000, 2000, 5000, 10000];
export function PayScreen({ ctx, cart, client, setClient, onBack, onDone }) {
  const { fmt, actions } = ctx;
  const total = lineTotal(cart) + lineOfficial(cart);
  const [mode, setMode] = useState("cash");
  const [given, setGiven] = useState("");
  const [op, setOp] = useState("Orange");
  const [ref, setRef] = useState("");
  const [part, setPart] = useState("");
  const [print, setPrint] = useState(true);
  const [pick, setPick] = useState(false);
  const isCredit = mode === "credit" || mode === "partial";
  const g = Number(given) || 0;
  const paidNow = mode === "credit" ? 0 : mode === "partial" ? Math.min(total, Number(part) || 0) : total;
  const quick = [total, ...BILLS.filter((b) => b > total).slice(0, 3)];
  const ok = !isCredit || (client && (mode === "credit" || (paidNow > 0 && paidNow < total)));
  const go = () => {
    if (isCredit && !client) { setPick(true); return; }
    if (mode === "cash" && given && g < total) { ctx.pushToast("La somme reçue est inférieure au total", "error"); return; }
    const pay = [];
    if (paidNow > 0) pay.push({ mode: mode === "momo" ? "momo" : "cash", amount: paidNow, given: mode === "cash" && g > paidNow ? g : paidNow, op: mode === "momo" ? op : "", ref: mode === "momo" ? ref.trim() : "" });
    const sale = actions.sell({ lines: cart, client, payments: pay });
    if (sale) onDone(sale, print);
  };
  return (
    <div style={{ paddingBottom: 120 }}>
      <div className="-mx-4 px-4 pt-3 pb-16 text-white relative overflow-hidden" style={{ background: C.navy }}>
        <span className="absolute rounded-full" style={{ right: -60, top: -70, width: 220, height: 220, background: "radial-gradient(circle, rgba(52,211,153,0.3) 0%, rgba(0,0,0,0) 70%)" }} />
        <div className="relative flex items-center gap-2.5"><button type="button" onClick={onBack} aria-label="Retour" className="gb-focus cy-tap w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}><Icon name="back" size={20} stroke={2.4} /></button><span><span className="block text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#6EE7B7" }}>ENCAISSEMENT</span><span className="block text-[21px] font-extrabold" style={{ fontFamily: FONT_D }}>Paiement</span></span></div>
        <div className="cy-a relative mt-3 text-center"><p className="text-[12px]" style={{ color: "#B6C4DC" }}>Total à payer</p><p className="text-[40px] font-extrabold tracking-tight" style={{ fontFamily: FONT_D }}>{fmt(total)}</p><p className="text-[12px]" style={{ color: "#B6C4DC" }}>{cart.length} ligne{cart.length > 1 ? "s" : ""} · {client ? client.name : "client de passage"}{lineOfficial(cart) > 0 ? ` · dont ${fmt(lineOfficial(cart))} de frais officiels` : ""}</p></div>
      </div>
      <div className="relative -mt-12">
        <div className="cy-a cy-d1 grid grid-cols-4 gap-1.5 p-1.5 rounded-[22px]" style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 16px 30px -18px rgba(10,23,48,0.5)" }}>
          {[["cash", "Espèces", "cash"], ["momo", "Mobile Money", "phone"], ["credit", "À crédit", "clock"], ["partial", "Partiel", "money"]].map(([id, l, ic]) => { const on = mode === id; return (
            <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={on} className="gb-focus cy-tap h-16 rounded-[16px] flex flex-col items-center justify-center gap-1 text-[11.5px] font-extrabold" style={{ background: on ? C.navy : "transparent", color: on ? "#fff" : C.ink2, boxShadow: on ? "0 8px 18px -8px rgba(10,23,48,0.8)" : "none" }}><Icon name={ic} size={20} />{l}</button>
          ); })}
        </div>
      </div>
      {mode === "cash" && (
        <Card className="cy-a cy-d2 mt-3 p-3.5">
          <Field label="SOMME REÇUE"><input value={given} onChange={(e) => setGiven(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder={sp(total)} aria-label="Somme reçue" style={{ ...inputStyle, fontSize: 26, fontWeight: 800, fontFamily: FONT_D, borderColor: "#10B981", borderWidth: 2 }} /></Field>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">{quick.map((b, i) => <Chip key={b} on={g === b} onClick={() => setGiven(String(b))} className="!px-1">{i === 0 ? "Juste" : sp(b)}</Chip>)}</div>
          {g > 0 && <div className="cy-pop mt-3 flex items-center justify-between rounded-[16px] px-3.5 py-3" style={{ background: g >= total ? C.greenSoft : C.redSoft, color: g >= total ? "#166534" : C.red }}><span className="text-[13.5px] font-extrabold">{g >= total ? "Monnaie à rendre" : "Il manque"}</span><span className="text-[22px] font-extrabold" style={{ fontFamily: FONT_D }}>{fmt(Math.abs(g - total))}</span></div>}
        </Card>
      )}
      {mode === "momo" && (
        <Card className="cy-a cy-d2 mt-3 p-3.5">
          <p className="text-[11px] font-extrabold mb-1.5" style={{ color: C.muted }}>OPÉRATEUR</p>
          <div className="grid grid-cols-4 gap-1.5">{["Orange", "MTN", "Moov", "Wave"].map((o) => <Chip key={o} on={op === o} onClick={() => setOp(o)} className="!px-1">{o}</Chip>)}</div>
          <div className="mt-3"><Field label="RÉFÉRENCE DE LA TRANSACTION (CONSEILLÉ)"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ex. MP241012.1530.A12345" style={inputStyle} /></Field></div>
          <p className="mt-2.5 rounded-[12px] px-3 py-2 text-[11.5px] leading-snug flex gap-2" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}><Icon name="info" size={16} />Vérifiez le SMS de confirmation avant de valider : l'application ne confirme pas le paiement à votre place.</p>
        </Card>
      )}
      {isCredit && (
        <Card className="cy-a cy-d2 mt-3 p-3.5">
          <p className="text-[11px] font-extrabold mb-1.5" style={{ color: C.muted }}>CLIENT (OBLIGATOIRE POUR UN CRÉDIT)</p>
          <button type="button" onClick={() => setPick(true)} className="gb-focus cy-tap w-full flex items-center gap-2.5 rounded-[15px] p-2.5 text-left" style={{ border: `1.5px solid ${client ? "#F59E0B" : C.line}`, background: client ? "#FFFBEB" : "#fff" }}>
            <Avatar name={client?.name || "?"} tint={C.amberSoft} ink={C.amber} />
            <span className="flex-1"><span className="block text-[14px] font-extrabold">{client ? client.name : "Choisir ou créer un client"}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>{client?.phone || "Nom et téléphone"}</span></span>
            <Icon name="chev" size={16} color={C.muted} />
          </button>
          {mode === "partial" && <div className="mt-3"><Field label="PAYÉ MAINTENANT (ESPÈCES)"><input value={part} onChange={(e) => setPart(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="0" style={{ ...inputStyle, fontSize: 20, fontWeight: 800 }} /></Field></div>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[14px] p-2.5" style={{ background: C.greenSoft }}><p className="text-[11px] font-bold" style={{ color: "#166534" }}>Encaissé</p><p className="text-[17px] font-extrabold" style={{ color: C.green }}>{fmt(paidNow)}</p></div>
            <div className="rounded-[14px] p-2.5" style={{ background: C.amberSoft }}><p className="text-[11px] font-bold" style={{ color: "#92400E" }}>Reste en crédit</p><p className="text-[17px] font-extrabold" style={{ color: C.amber }}>{fmt(total - paidNow)}</p></div>
          </div>
          <p className="mt-2 text-[11.5px]" style={{ color: C.muted }}>La vente compte dans le chiffre d'affaires ; seul l'argent reçu compte dans l'encaissé.</p>
        </Card>
      )}
      <div className="mt-3 flex items-center gap-2.5 px-1"><Toggle on={print} onChange={setPrint} label="Imprimer le reçu" /><span className="text-[13.5px] font-bold">Imprimer le reçu après validation</span></div>
      <BottomBar>
        <Btn kind="green" full big icon="check" onClick={go} disabled={!ok && !(isCredit && !client)}>{mode === "credit" ? "Valider la vente à crédit" : mode === "partial" ? `Valider · ${fmt(paidNow)} encaissés` : `Valider le paiement · ${fmt(total)}`}</Btn>
      </BottomBar>
      {pick && <ClientPicker ctx={ctx} current={client} required onClose={() => setPick(false)} onPick={(c) => { setClient(c); setPick(false); }} />}
    </div>
  );
}

// ---------- Reçu ----------
export function ReceiptScreen({ ctx, sale, fresh, onNew, onBack, autoPrint }) {
  const { fmt, shop, settings, pushToast } = ctx;
  const info = receiptInfo(shop, settings);
  const m = receiptModel(sale, info, fmt);
  const [busy, setBusy] = useState(false);
  const print = async () => { setBusy(true); try { const how = await printReceipt(sale, info, fmt); if (how === "pdf") pushToast("Reçu enregistré en PDF", "ok"); } catch { pushToast("Impression impossible", "error"); } setBusy(false); };
  useEffect(() => { if (autoPrint) { const t = setTimeout(print, 450); return () => clearTimeout(t); } return undefined; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (sale.payments || []).filter((p) => p.mode === "cash" && p.given > p.amount).reduce((t, p) => t + (p.given - p.amount), 0);
  return (
    <div className="-mx-4 px-4 min-h-screen text-white" style={{ background: C.navy, paddingBottom: 200 }}>
      <div className="pt-4 text-center">
        {fresh ? (
          <>
            <span className="cy-pop inline-flex w-14 h-14 rounded-full items-center justify-center" style={{ background: "#10B981", boxShadow: "0 10px 26px -6px rgba(16,185,129,0.8)" }}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="cy-ck" d="M20 6 9 17l-5-5" /></svg></span>
            <p className="cy-a text-[20px] font-extrabold mt-2" style={{ fontFamily: FONT_D }}>{saleDue(sale) > 0 ? "Vente enregistrée" : "Paiement enregistré"}</p>
            <p className="cy-a text-[12.5px]" style={{ color: "#B6C4DC" }}>{change > 0 ? <>Monnaie à rendre : <b style={{ color: "#6EE7B7" }}>{fmt(change)}</b></> : saleDue(sale) > 0 ? `Reste ${fmt(saleDue(sale))} au crédit de ${sale.client?.name}` : `Ticket ${sale.no}`}</p>
          </>
        ) : (
          <div className="flex items-center gap-2.5 text-left"><button type="button" onClick={onBack} aria-label="Retour" className="gb-focus cy-tap w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}><Icon name="back" size={20} stroke={2.4} /></button><span className="text-[20px] font-extrabold" style={{ fontFamily: FONT_D }}>Reçu {sale.no}</span></div>
        )}
      </div>
      <div className="mx-2 mt-4">
        <div className="cy-print rounded-t-[6px] px-4 pt-4 pb-5 text-[12px]" style={{ background: "#fff", color: C.ink, fontFamily: "ui-monospace, 'Courier New', monospace", boxShadow: "0 20px 40px -18px rgba(0,0,0,0.6)" }}>
          <div className="text-center"><span className="inline-flex w-11 h-11 rounded-[13px] items-center justify-center" style={{ background: C.navy }}><Icon name="monitor" size={22} color="#22D3EE" /></span><p className="text-[15px] font-extrabold mt-1.5" style={{ fontFamily: FONT_D }}>{info.name.toUpperCase()}</p>{info.address && <p className="text-[11px]" style={{ color: C.muted }}>{info.address}</p>}{info.phone && <p className="text-[11px]" style={{ color: C.muted }}>Tél. {info.phone}</p>}{m.cancelled && <p className="mt-1 inline-block px-2 py-0.5 font-extrabold" style={{ border: "2px solid #B91C1C", color: "#B91C1C" }}>ANNULÉ</p>}</div>
          <div className="my-2.5" style={{ borderTop: "1.5px dashed #94A3B8" }} />
          {m.rows.map(([a, b]) => <div key={a} className="flex justify-between gap-2"><span>{a}</span><span className="text-right">{b}</span></div>)}
          <div className="my-2.5" style={{ borderTop: "1.5px dashed #94A3B8" }} />
          {m.lines.map((l, i) => <div key={i} className="mb-1"><div className="flex justify-between gap-2 font-bold"><span>{l.label}</span><span>{l.amount}</span></div>{l.detail && <div className="text-[10.5px]" style={{ color: C.muted }}>{l.detail}</div>}{l.official && <div className="flex justify-between text-[11px]"><span>  Frais officiels</span><span>{l.official}</span></div>}</div>)}
          <div className="my-2" style={{ borderTop: "1.5px dashed #94A3B8" }} />
          <div className="flex justify-between text-[15px] font-bold"><span>TOTAL</span><span>{m.total}</span></div>
          {m.pay.map(([a, b]) => <div key={a} className="flex justify-between"><span>{a}</span><span>{b}</span></div>)}
          <div className="my-2" style={{ borderTop: "1.5px dashed #94A3B8" }} />
          <div className="text-center" style={{ color: C.ink2 }}>{m.thanks.map((t) => <p key={t}>{t}</p>)}</div>
        </div>
        <div style={{ height: 12, background: "radial-gradient(circle at 6px -2px, transparent 7px, #FFFFFF 7.5px) 0 0 / 12px 12px repeat-x" }} />
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] px-4 pt-3 grid grid-cols-2 gap-2 z-30" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "linear-gradient(to top, #0A1730 75%, rgba(10,23,48,0))" }}>
        <button type="button" onClick={() => shareReceipt(sale, info, fmt)} className="gb-focus cy-tap h-[50px] rounded-[16px] flex items-center justify-center gap-2 text-[13.5px] font-extrabold" style={{ border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.08)", color: "#fff" }}><Icon name="share" size={17} />Partager</button>
        <button type="button" onClick={print} disabled={busy} className="gb-focus cy-tap h-[50px] rounded-[16px] flex items-center justify-center gap-2 text-[13.5px] font-extrabold" style={{ background: "#22D3EE", color: C.navy, boxShadow: "0 10px 22px -10px rgba(34,211,238,0.9)" }}><Icon name="printer" size={17} />{busy ? "Impression…" : "Imprimer"}</button>
        <button type="button" onClick={fresh ? onNew : onBack} className="gb-focus cy-tap col-span-2 h-[54px] rounded-[18px] flex items-center justify-center gap-2 text-[15px] font-extrabold" style={{ background: "#fff", color: C.navy }}><Icon name={fresh ? "plus" : "back"} size={19} stroke={2.6} />{fresh ? "Nouvelle vente" : "Retour"}</button>
      </div>
    </div>
  );
}
export { sp };
