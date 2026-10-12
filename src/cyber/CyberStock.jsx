// src/cyber/CyberStock.jsx
//
// Stock du cyber café : consommables (papier, pochettes…) et articles à
// vendre, réapprovisionnement (achat fournisseur), inventaire. Le stock est
// calculé à partir des mouvements tracés : rien n'est effacé.

import { useState } from "react";
import { C, FONT_D, Icon, Btn, Card, Label, TopBar, Seg, Chip, Field, inputStyle, Sheet, Empty, Hero, BottomBar, Tag } from "./CyberUI.jsx";
import { qtyLabel, isLow, rid, dayLabel, hmOf } from "./cyberLogic.js";

const num = (v) => Number(String(v).replace(",", ".").replace(/[^\d.]/g, "")) || 0;

export function StockScreen({ ctx, go }) {
  const { stock, levels, fmt, can } = ctx;
  const [tab, setTab] = useState("conso");
  const [edit, setEdit] = useState(null);
  const list = stock.filter((s) => s.active !== false && (tab === "conso" ? s.kind !== "article" : s.kind === "article"));
  const value = stock.reduce((t, s) => t + Math.max(0, levels[s.id] || 0) * (Number(s.cost) || 0), 0);
  const low = stock.filter((s) => s.active !== false && isLow(s, levels[s.id] || 0)).length;
  return (
    <div style={{ paddingBottom: 130 }}>
      <Hero>
        <p className="cy-a text-[10.5px] font-extrabold tracking-[0.14em]" style={{ color: "#67E8F9" }}>STOCK ET CONSOMMABLES</p>
        <p className="cy-a text-[24px] font-extrabold" style={{ fontFamily: FONT_D }}>{can.stock ? `Valeur ${fmt(value)}` : "Niveaux du stock"}</p>
        <p className="cy-a text-[12px]" style={{ color: "#B6C4DC" }}>{stock.filter((s) => s.active !== false).length} références · {low ? `${low} alerte${low > 1 ? "s" : ""}` : "aucune alerte"}</p>
        {can.stock && (
          <div className="cy-a cy-d1 mt-3.5 grid grid-cols-3 gap-1.5">
            <button type="button" onClick={() => go("achat")} className="gb-focus cy-tap h-[60px] rounded-[15px] flex flex-col items-center justify-center gap-1 text-[12px] font-extrabold" style={{ background: "#22D3EE", color: C.navy, boxShadow: "0 10px 20px -10px rgba(34,211,238,0.9)" }}><Icon name="restock" size={19} />Réapprovisionner</button>
            <button type="button" onClick={() => go("inventaire")} className="gb-focus cy-tap h-[60px] rounded-[15px] flex flex-col items-center justify-center gap-1 text-[12px] font-extrabold" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }}><Icon name="clipboard" size={19} />Inventaire</button>
            <button type="button" onClick={() => go("mouvements")} className="gb-focus cy-tap h-[60px] rounded-[15px] flex flex-col items-center justify-center gap-1 text-[12px] font-extrabold" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }}><Icon name="swap" size={19} />Mouvements</button>
          </div>
        )}
      </Hero>
      <div className="cy-a cy-d1 mt-3"><Seg options={[["conso", `Consommables · ${stock.filter((s) => s.active !== false && s.kind !== "article").length}`], ["art", `Articles à vendre · ${stock.filter((s) => s.active !== false && s.kind === "article").length}`]]} value={tab} onChange={setTab} small /></div>
      <div className="cy-a cy-d2 mt-3 flex flex-col gap-2">
        {list.map((s) => {
          const q = levels[s.id] || 0; const lw = isLow(s, q); const ref = Math.max(Number(s.alert) * 3, q, 1); const r = Math.max(0, Math.min(1, q / ref));
          return (
            <Card key={s.id} onClick={can.stock ? () => setEdit(s) : undefined} className="px-3 py-2.5" style={{ border: `1.5px solid ${lw ? "#FED7AA" : C.line}` }}>
              <div className="flex items-center gap-2.5">
                <span className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0" style={{ background: lw ? C.orangeSoft : C.cyanSoft, color: lw ? C.orange : C.cyanInk }}><Icon name={s.kind === "article" ? "bag" : "box"} size={18} /></span>
                <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{s.name}</span><span className="block text-[11.5px] truncate" style={{ color: C.muted }}>{s.kind === "article" ? `Vente ${fmt(s.price)}${can.stock ? ` · achat ${fmt(s.cost)}` : ""}` : `Seuil d'alerte : ${qtyLabel(s, s.alert)}`}</span></span>
                <span className="text-right"><span className="block text-[16px] font-extrabold" style={{ fontFamily: FONT_D, color: lw ? C.orange : C.navy }}>{qtyLabel(s, q)}</span>{s.pack > 1 && <span className="block text-[10.5px]" style={{ color: C.muted }}>{Math.round(q)} {s.unit}s</span>}</span>
              </div>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: C.ground }}><div className="cy-bar h-1.5 rounded-full" style={{ width: `${Math.round(r * 100)}%`, background: lw ? "linear-gradient(90deg,#FB923C,#DC2626)" : r < 0.5 ? "linear-gradient(90deg,#FBBF24,#F59E0B)" : "linear-gradient(90deg,#34D399,#059669)" }} /></div>
              {lw && <p className="mt-1.5 text-[11px] font-extrabold" style={{ color: C.orange }}>Sous le seuil d'alerte · pensez à réapprovisionner</p>}
            </Card>
          );
        })}
        {!list.length && <Empty icon="box" title={tab === "conso" ? "Aucun consommable" : "Aucun article"} text={tab === "conso" ? "Ajoutez le papier, les pochettes…" : "Ajoutez les articles que vous vendez (clés USB, enveloppes, stylos…)."} />}
        {can.stock && <Btn kind="dashed" full icon="plus" onClick={() => setEdit({ kind: tab === "conso" ? "conso" : "article" })}>{tab === "conso" ? "Nouveau consommable" : "Nouvel article"}</Btn>}
      </div>
      {edit && <ItemSheet ctx={ctx} item={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ItemSheet({ ctx, item, onClose }) {
  const { actions, fmt } = ctx;
  const isNew = !item.id;
  const [kind, setKind] = useState(item.kind || "conso");
  const [name, setName] = useState(item.name || "");
  const [unit, setUnit] = useState(item.unit || (kind === "article" ? "unité" : "feuille"));
  const [pack, setPack] = useState(String(item.pack || 1));
  const [packName, setPackName] = useState(item.packName || "paquet");
  const pk = Math.max(1, Math.round(num(pack)));
  const [alert, setAlert] = useState(String(item.alert ? Math.round((item.alert / (item.pack || 1)) * 10) / 10 : ""));
  const [cost, setCost] = useState(String(item.cost || ""));
  const [price, setPrice] = useState(String(item.price || ""));
  const save = () => {
    const rec = { ...item, id: item.id || rid(), kind, name: name.trim(), unit: unit.trim() || "unité", pack: kind === "article" ? 1 : pk, packName: packName.trim() || "paquet", alert: Math.round(num(alert) * (kind === "article" ? 1 : pk)), cost: num(cost), price: kind === "article" ? num(price) : 0, active: true };
    actions.saveStockItem(rec, isNew);
    onClose();
  };
  return (
    <Sheet title={isNew ? (kind === "article" ? "Nouvel article" : "Nouveau consommable") : name || "Produit"} onClose={onClose}>
      {isNew && <div className="mb-3"><Seg small options={[["conso", "Consommable"], ["article", "Article à vendre"]]} value={kind} onChange={setKind} /></div>}
      <Field label="NOM"><input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "article" ? "Ex. Clé USB 16 Go" : "Ex. Papier A4"} style={inputStyle} /></Field>
      {kind !== "article" ? (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Field label="UNITÉ"><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="feuille" style={inputStyle} /></Field>
          <Field label="PAR LOT"><input value={pack} onChange={(e) => setPack(e.target.value)} inputMode="numeric" style={inputStyle} /></Field>
          <Field label="LOT"><input value={packName} onChange={(e) => setPackName(e.target.value)} placeholder="rame" style={inputStyle} /></Field>
        </div>
      ) : null}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Field label={kind === "article" ? "SEUIL D'ALERTE (UNITÉS)" : `SEUIL D'ALERTE (${(packName || "lot").toUpperCase()}S)`}><input value={alert} onChange={(e) => setAlert(e.target.value)} inputMode="decimal" placeholder="0" style={inputStyle} /></Field>
        <Field label={kind === "article" ? "PRIX D'ACHAT" : `COÛT PAR ${unit.toUpperCase() || "UNITÉ"}`}><input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="0" style={inputStyle} /></Field>
      </div>
      {kind === "article" && <div className="mt-2.5"><Field label="PRIX DE VENTE"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="0" style={{ ...inputStyle, fontSize: 18, fontWeight: 800 }} /></Field></div>}
      <p className="mt-2 text-[11.5px]" style={{ color: C.muted }}>La quantité se met à jour avec « Réapprovisionner » et « Inventaire » : chaque mouvement est daté et signé.{kind === "article" && num(price) > 0 && num(cost) > 0 ? ` Marge : ${fmt(num(price) - num(cost))} par unité.` : ""}</p>
      <div className="mt-3 flex gap-2">
        {!isNew && <Btn kind="danger" onClick={() => { if (window.confirm(`Retirer ${item.name} de la liste ? L'historique est conservé.`)) { actions.saveStockItem({ ...item, active: false }, false); onClose(); } }}>Retirer</Btn>}
        <Btn kind="navy" full className="flex-1" disabled={!name.trim() || (kind === "article" && !(num(price) > 0))} onClick={save}>Enregistrer</Btn>
      </div>
    </Sheet>
  );
}

// ---------- Réapprovisionnement ----------
export function PurchaseScreen({ ctx, onBack }) {
  const { stock, fmt, actions, moves } = ctx;
  const items = stock.filter((s) => s.active !== false);
  const suppliers = [...new Set(moves.filter((m) => m.kind === "achat" && m.supplier).map((m) => m.supplier))].slice(0, 6);
  const [supplier, setSupplier] = useState(suppliers[0] || "");
  const [lines, setLines] = useState([]);
  const [pay, setPay] = useState("cash");
  const [pick, setPick] = useState(false);
  const total = lines.reduce((t, l) => t + num(l.qty) * num(l.cost), 0);
  const upd = (id, patch) => setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const add = (s) => { setLines([...lines, { id: rid(), stockId: s.id, qty: "1", cost: String(Math.round((Number(s.cost) || 0) * (s.pack || 1))) }]); setPick(false); };
  const ok = lines.length > 0 && lines.every((l) => num(l.qty) > 0);
  return (
    <div style={{ paddingBottom: 170 }}>
      <TopBar title="Réapprovisionnement" sub="Entrée en stock · annoncée sur tous les téléphones" onBack={onBack} />
      <Label>FOURNISSEUR</Label>
      <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex. Papeterie du Plateau" aria-label="Fournisseur" style={inputStyle} />
      {suppliers.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{suppliers.map((s) => <Chip key={s} on={supplier === s} onClick={() => setSupplier(s)}>{s}</Chip>)}</div>}
      <Label>PRODUITS REÇUS</Label>
      <div className="flex flex-col gap-2">
        {lines.map((l) => { const s = stock.find((x) => x.id === l.stockId); if (!s) return null; const lot = s.pack > 1 ? s.packName : s.unit; return (
          <Card key={l.id} className="cy-a p-3">
            <div className="flex items-center gap-2"><span className="flex-1 text-[14px] font-extrabold">{s.name}</span><span className="text-[14px] font-extrabold">{fmt(num(l.qty) * num(l.cost))}</span><button type="button" onClick={() => setLines(lines.filter((x) => x.id !== l.id))} aria-label={`Retirer ${s.name}`} className="gb-focus w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: C.ground }}><Icon name="x" size={14} /></button></div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label={`QUANTITÉ (${lot.toUpperCase()}S)`}><input value={l.qty} onChange={(e) => upd(l.id, { qty: e.target.value })} inputMode="decimal" style={inputStyle} /></Field>
              <Field label={`PRIX PAR ${lot.toUpperCase()}`}><input value={l.cost} onChange={(e) => upd(l.id, { cost: e.target.value })} inputMode="numeric" style={inputStyle} /></Field>
            </div>
          </Card>
        ); })}
        <Btn kind="dashed" full icon="plus" onClick={() => setPick(true)}>Ajouter un produit</Btn>
      </div>
      <Label>PAIEMENT</Label>
      <Seg small options={[["cash", "Payé en caisse"], ["momo", "Mobile Money"], ["debt", "À payer plus tard"]]} value={pay} onChange={setPay} />
      <BottomBar>
        <div className="flex items-end justify-between mb-1"><span className="text-[12.5px]" style={{ color: C.muted }}>Total de l'achat</span><span className="text-[26px] font-extrabold" style={{ fontFamily: FONT_D }}>{fmt(total)}</span></div>
        <p className="text-[11.5px] mb-2.5" style={{ color: C.muted }}>{pay === "cash" ? "Sortie de caisse enregistrée." : pay === "momo" ? "Payé par Mobile Money : la caisse ne bouge pas." : "Reste à payer au fournisseur."} Annonce écrite et vocale sur tous les téléphones.</p>
        <Btn kind="cyan" full big icon="check" disabled={!ok} onClick={() => { actions.restock({ supplier: supplier.trim(), pay, lines: lines.map((l) => { const s = stock.find((x) => x.id === l.stockId); return { stockId: l.stockId, qty: num(l.qty) * (s?.pack || 1), lots: num(l.qty), lotCost: num(l.cost) }; }) }); onBack(); }}>Valider l'entrée en stock</Btn>
      </BottomBar>
      {pick && (
        <Sheet title="Choisir un produit" onClose={() => setPick(false)}>
          {items.map((s) => <button key={s.id} type="button" onClick={() => add(s)} className="gb-focus cy-tap w-full flex items-center gap-2.5 min-h-[52px] text-left" style={{ borderBottom: `1px solid ${C.line2}` }}><Icon name={s.kind === "article" ? "bag" : "box"} size={18} color={C.cyanInk} /><span className="flex-1 text-[14px] font-extrabold">{s.name}</span><span className="text-[12px]" style={{ color: C.muted }}>{qtyLabel(s, ctx.levels[s.id] || 0)}</span></button>)}
          {!items.length && <p className="py-4 text-center text-[13px]" style={{ color: C.muted }}>Créez d'abord le produit dans Stock.</p>}
        </Sheet>
      )}
    </div>
  );
}

// ---------- Inventaire ----------
export function InventoryScreen({ ctx, onBack }) {
  const { stock, levels, fmt, actions } = ctx;
  const items = stock.filter((s) => s.active !== false);
  const [count, setCount] = useState({});
  const counted = items.filter((s) => count[s.id] !== undefined && count[s.id] !== "");
  const gap = counted.reduce((t, s) => t + (num(count[s.id]) * (s.pack || 1) - (levels[s.id] || 0)) * (Number(s.cost) || 0), 0);
  return (
    <div style={{ paddingBottom: 150 }}>
      <TopBar title="Inventaire" sub={`${counted.length} sur ${items.length} comptés`} onBack={onBack} />
      <Card className="cy-a mt-3 p-3">
        <div className="flex justify-between text-[12.5px] font-extrabold"><span>Progression</span><span style={{ color: gap < 0 ? C.red : C.green }}>Écart : {gap < 0 ? "− " : gap > 0 ? "+ " : ""}{fmt(Math.abs(gap))}</span></div>
        <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: C.ground }}><div className="h-2 rounded-full" style={{ width: `${items.length ? Math.round((counted.length / items.length) * 100) : 0}%`, background: "linear-gradient(90deg,#22D3EE,#0891B2)", transition: "width .4s" }} /></div>
      </Card>
      <div className="mt-3 flex flex-col gap-2">
        {items.map((s) => { const th = levels[s.id] || 0; const has = count[s.id] !== undefined && count[s.id] !== ""; const d = has ? num(count[s.id]) * (s.pack || 1) - th : 0; const lot = s.pack > 1 ? `${s.packName}s` : `${s.unit}s`; return (
          <Card key={s.id} className="px-3 py-2.5" style={{ border: `1.5px solid ${!has ? C.line : d === 0 ? "#BBF7D0" : "#FECACA"}` }}>
            <div className="flex items-center gap-2.5">
              <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{s.name}</span><span className="block text-[11.5px]" style={{ color: C.muted }}>Théorique {qtyLabel(s, th)} · <b style={{ color: !has ? C.muted : d === 0 ? C.green : C.red }}>{!has ? "à compter" : d === 0 ? "conforme" : `${d > 0 ? "+" : ""}${qtyLabel(s, d)}`}</b></span></span>
              <input value={count[s.id] ?? ""} onChange={(e) => setCount({ ...count, [s.id]: e.target.value })} inputMode="decimal" placeholder={lot} aria-label={`Compté : ${s.name} (${lot})`} style={{ ...inputStyle, width: 104, textAlign: "center", fontWeight: 800 }} />
            </div>
          </Card>
        ); })}
      </div>
      <BottomBar>
        <p className="text-[11.5px] mb-2.5" style={{ color: C.muted }}>Chaque écart devient un ajustement de stock daté, avec son auteur. Rien n'est effacé.</p>
        <Btn kind="navy" full big icon="check" disabled={!counted.length} onClick={() => { actions.inventory(counted.map((s) => ({ stockId: s.id, counted: num(count[s.id]) * (s.pack || 1), theo: levels[s.id] || 0 }))); onBack(); }}>Valider l'inventaire</Btn>
      </BottomBar>
    </div>
  );
}

export function MovesScreen({ ctx, onBack }) {
  const { moves, stock, fmt } = ctx;
  const name = (id) => stock.find((s) => s.id === id)?.name || "Produit";
  const K = { achat: ["Réapprovisionnement", C.green, C.greenSoft], inventaire: ["Inventaire", C.violet, C.violetSoft], ajust: ["Ajustement", C.amber, C.amberSoft] };
  const list = moves.slice().sort((a, b) => b.at - a.at).slice(0, 200);
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Mouvements de stock" sub="Entrées, inventaires · les ventes déduisent le stock automatiquement" onBack={onBack} />
      <Card className="cy-a mt-3 px-3">
        {list.map((m, i) => { const k = K[m.kind] || K.ajust; const s = stock.find((x) => x.id === m.stockId); return (
          <div key={m.id} className="flex items-center gap-2.5 min-h-[58px]" style={{ borderTop: i ? `1px solid ${C.line2}` : "none" }}>
            <span className="w-[34px] h-[34px] rounded-[11px] flex items-center justify-center shrink-0" style={{ background: k[2], color: k[1] }}><Icon name={m.kind === "achat" ? "restock" : "clipboard"} size={16} /></span>
            <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{name(m.stockId)}</span><span className="block text-[11.5px] truncate" style={{ color: C.muted }}>{k[0]} · {dayLabel(m.at)} {hmOf(m.at)} · {m.by}{m.supplier ? ` · ${m.supplier}` : ""}</span></span>
            <span className="text-right"><span className="block text-[13.5px] font-extrabold" style={{ color: m.qty >= 0 ? C.green : C.red }}>{m.qty >= 0 ? "+" : ""}{s ? qtyLabel(s, m.qty) : m.qty}</span>{m.total > 0 && <Tag>{fmt(m.total)}</Tag>}</span>
          </div>
        ); })}
        {!list.length && <p className="py-5 text-center text-[12.5px]" style={{ color: C.muted }}>Aucun mouvement pour l'instant.</p>}
      </Card>
    </div>
  );
}
